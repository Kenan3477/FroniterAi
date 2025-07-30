# Frontier API Ecosystem - Testing Guide

This guide provides comprehensive testing strategies and tools for the Frontier API ecosystem.

## 🧪 Testing Overview

The Frontier API ecosystem includes multiple testing layers:
- **Unit Tests**: Component-level testing
- **Integration Tests**: Service interaction testing
- **End-to-End Tests**: Complete workflow testing
- **Performance Tests**: Load and stress testing
- **Security Tests**: Vulnerability and penetration testing

## 📁 Test Structure

```
tests/
├── unit/                 # Unit tests for individual components
│   ├── auth/            # Authentication service tests
│   ├── gateway/         # API gateway tests
│   ├── rest-api/        # REST API tests
│   ├── graphql-api/     # GraphQL API tests
│   └── sdk-generator/   # SDK generator tests
├── integration/         # Service integration tests
│   ├── auth-flow/       # Authentication workflows
│   ├── api-endpoints/   # Cross-service API tests
│   └── data-flow/       # Data consistency tests
├── e2e/                 # End-to-end tests
│   ├── user-journeys/   # Complete user workflows
│   ├── sdk-tests/       # Generated SDK tests
│   └── scenarios/       # Business scenario tests
├── performance/         # Performance and load tests
│   ├── load-tests/      # Load testing scenarios
│   ├── stress-tests/    # Stress testing scenarios
│   └── benchmarks/      # Performance benchmarks
├── security/            # Security tests
│   ├── auth-tests/      # Authentication security
│   ├── api-security/    # API security tests
│   └── penetration/     # Penetration testing
└── fixtures/            # Test data and fixtures
    ├── users.json       # Test user data
    ├── api-keys.json    # Test API keys
    └── responses.json   # Expected API responses
```

## 🚀 Running Tests

### Prerequisites
```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-cov
npm install -g jest supertest

# Start test environment
docker-compose -f docker-compose.test.yml up -d
```

### Unit Tests
```bash
# Run all unit tests
pytest tests/unit/ -v

# Run specific service tests
pytest tests/unit/auth/ -v
pytest tests/unit/gateway/ -v

# Run with coverage
pytest tests/unit/ --cov=src --cov-report=html
```

### Integration Tests
```bash
# Run integration tests
pytest tests/integration/ -v

# Run specific integration suite
pytest tests/integration/auth-flow/ -v
```

### End-to-End Tests
```bash
# Run e2e tests
pytest tests/e2e/ -v

# Run specific user journey
pytest tests/e2e/user-journeys/test_complete_workflow.py -v
```

### Performance Tests
```bash
# Run load tests
python tests/performance/load-tests/api_load_test.py

# Run stress tests
python tests/performance/stress-tests/concurrent_users.py
```

## 🧪 Unit Tests

### Authentication Service Tests

```python
# tests/unit/auth/test_authentication.py
import pytest
from unittest.mock import Mock, patch
from src.auth.authentication import AuthenticationManager
from src.auth.models import User, ApiKey

class TestAuthenticationManager:
    
    @pytest.fixture
    def auth_manager(self):
        return AuthenticationManager()
    
    @pytest.fixture
    def mock_user(self):
        return User(
            id="test-user-id",
            email="test@example.com",
            password_hash="hashed_password",
            is_active=True
        )
    
    def test_validate_api_key_success(self, auth_manager, mock_user):
        """Test successful API key validation"""
        api_key = "test-api-key"
        
        with patch.object(auth_manager, 'get_api_key') as mock_get:
            mock_get.return_value = ApiKey(
                key=api_key,
                user_id="test-user-id",
                is_active=True,
                scopes=["read", "write"]
            )
            
            result = auth_manager.validate_api_key(api_key)
            
            assert result is not None
            assert result.user_id == "test-user-id"
            assert "read" in result.scopes
    
    def test_validate_api_key_invalid(self, auth_manager):
        """Test invalid API key validation"""
        api_key = "invalid-key"
        
        with patch.object(auth_manager, 'get_api_key') as mock_get:
            mock_get.return_value = None
            
            result = auth_manager.validate_api_key(api_key)
            
            assert result is None
    
    @pytest.mark.asyncio
    async def test_create_user_success(self, auth_manager):
        """Test successful user creation"""
        user_data = {
            "email": "newuser@example.com",
            "password": "secure_password",
            "full_name": "New User"
        }
        
        with patch.object(auth_manager, 'hash_password') as mock_hash, \
             patch.object(auth_manager, 'save_user') as mock_save:
            
            mock_hash.return_value = "hashed_password"
            mock_save.return_value = User(id="new-user-id", **user_data)
            
            result = await auth_manager.create_user(user_data)
            
            assert result.email == user_data["email"]
            assert result.id == "new-user-id"
            mock_hash.assert_called_once_with("secure_password")
    
    def test_jwt_token_generation(self, auth_manager, mock_user):
        """Test JWT token generation"""
        token = auth_manager.generate_jwt_token(mock_user)
        
        assert token is not None
        assert isinstance(token, str)
        
        # Verify token can be decoded
        decoded = auth_manager.decode_jwt_token(token)
        assert decoded["user_id"] == mock_user.id
        assert decoded["email"] == mock_user.email
```

### API Gateway Tests

```python
# tests/unit/gateway/test_rate_limiter.py
import pytest
import time
from unittest.mock import Mock, patch
from src.gateway.rate_limiter import RateLimiter

class TestRateLimiter:
    
    @pytest.fixture
    def rate_limiter(self):
        return RateLimiter(redis_client=Mock())
    
    @pytest.mark.asyncio
    async def test_check_rate_limit_allowed(self, rate_limiter):
        """Test rate limit check when request is allowed"""
        key = "user:test-user"
        limit = 100
        window = 3600
        
        # Mock Redis response
        rate_limiter.redis.get.return_value = "50"  # Current count
        rate_limiter.redis.ttl.return_value = 1800  # Time remaining
        
        result = await rate_limiter.check_rate_limit(key, limit, window)
        
        assert result["allowed"] is True
        assert result["current_count"] == 50
        assert result["limit"] == 100
        assert result["reset_time"] > 0
    
    @pytest.mark.asyncio
    async def test_check_rate_limit_exceeded(self, rate_limiter):
        """Test rate limit check when limit is exceeded"""
        key = "user:test-user"
        limit = 100
        window = 3600
        
        # Mock Redis response - limit exceeded
        rate_limiter.redis.get.return_value = "100"
        rate_limiter.redis.ttl.return_value = 1800
        
        result = await rate_limiter.check_rate_limit(key, limit, window)
        
        assert result["allowed"] is False
        assert result["current_count"] == 100
        assert result["limit"] == 100
    
    @pytest.mark.asyncio
    async def test_sliding_window_algorithm(self, rate_limiter):
        """Test sliding window rate limiting algorithm"""
        key = "test-sliding-window"
        limit = 10
        window = 60  # 1 minute
        
        # Mock Redis responses for sliding window
        rate_limiter.redis.zcount.return_value = 5  # Current count in window
        
        result = await rate_limiter.check_sliding_window(key, limit, window)
        
        assert result["allowed"] is True
        assert result["current_count"] == 5
        
        # Test when limit is exceeded
        rate_limiter.redis.zcount.return_value = 10
        result = await rate_limiter.check_sliding_window(key, limit, window)
        
        assert result["allowed"] is False
```

### REST API Tests

```python
# tests/unit/rest-api/test_endpoints.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from src.rest_api.main import app

class TestRestApiEndpoints:
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.fixture
    def mock_auth_user(self):
        return {
            "id": "test-user-id",
            "email": "test@example.com",
            "scopes": ["read", "write"]
        }
    
    def test_health_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "version" in data
    
    @patch('src.rest_api.dependencies.get_current_user')
    def test_create_brand_identity(self, mock_auth, client, mock_auth_user):
        """Test brand identity creation endpoint"""
        mock_auth.return_value = mock_auth_user
        
        request_data = {
            "company_name": "Test Company",
            "industry": "Technology",
            "target_audience": "Young professionals",
            "brand_values": ["Innovation", "Reliability"],
            "color_preferences": ["Blue", "Green"]
        }
        
        with patch('src.visual_design.brand_identity.BrandIdentityGenerator.generate') as mock_generate:
            mock_generate.return_value = {
                "logo_url": "https://example.com/logo.png",
                "color_palette": ["#0066CC", "#00AA44"],
                "typography": {"primary": "Arial", "secondary": "Helvetica"}
            }
            
            response = client.post(
                "/api/v1/visual-design/brand-identity",
                json=request_data
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["logo_url"] is not None
            assert len(data["color_palette"]) > 0
    
    @patch('src.rest_api.dependencies.get_current_user')
    def test_unauthorized_request(self, mock_auth, client):
        """Test unauthorized request handling"""
        mock_auth.side_effect = Exception("Invalid token")
        
        response = client.post(
            "/api/v1/visual-design/brand-identity",
            json={"company_name": "Test"}
        )
        
        assert response.status_code == 401
    
    @patch('src.rest_api.dependencies.get_current_user')
    def test_rate_limit_headers(self, mock_auth, client, mock_auth_user):
        """Test rate limit headers in response"""
        mock_auth.return_value = mock_auth_user
        
        response = client.get("/api/v1/user/profile")
        
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers
        assert "X-RateLimit-Reset" in response.headers
```

## 🔗 Integration Tests

### Authentication Flow Tests

```python
# tests/integration/auth-flow/test_complete_auth_flow.py
import pytest
import httpx
from tests.fixtures.test_data import TEST_USERS

class TestCompleteAuthFlow:
    
    @pytest.fixture
    def api_base_url(self):
        return "http://localhost:3000"
    
    @pytest.mark.asyncio
    async def test_user_registration_and_login(self, api_base_url):
        """Test complete user registration and login flow"""
        async with httpx.AsyncClient() as client:
            # 1. Register new user
            registration_data = {
                "email": "newuser@example.com",
                "password": "SecurePassword123!",
                "full_name": "New User"
            }
            
            response = await client.post(
                f"{api_base_url}/auth/register",
                json=registration_data
            )
            
            assert response.status_code == 201
            user_data = response.json()
            assert user_data["email"] == registration_data["email"]
            user_id = user_data["id"]
            
            # 2. Login with credentials
            login_data = {
                "email": registration_data["email"],
                "password": registration_data["password"]
            }
            
            response = await client.post(
                f"{api_base_url}/auth/login",
                json=login_data
            )
            
            assert response.status_code == 200
            tokens = response.json()
            assert "access_token" in tokens
            assert "refresh_token" in tokens
            access_token = tokens["access_token"]
            
            # 3. Access protected endpoint
            headers = {"Authorization": f"Bearer {access_token}"}
            response = await client.get(
                f"{api_base_url}/api/v1/user/profile",
                headers=headers
            )
            
            assert response.status_code == 200
            profile = response.json()
            assert profile["id"] == user_id
    
    @pytest.mark.asyncio
    async def test_api_key_workflow(self, api_base_url):
        """Test API key creation and usage workflow"""
        async with httpx.AsyncClient() as client:
            # 1. Login to get access token
            user = TEST_USERS["basic_user"]
            login_response = await client.post(
                f"{api_base_url}/auth/login",
                json={"email": user["email"], "password": user["password"]}
            )
            
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # 2. Create API key
            api_key_data = {
                "name": "Test API Key",
                "scopes": ["read", "write"],
                "expires_at": "2025-12-31T23:59:59Z"
            }
            
            response = await client.post(
                f"{api_base_url}/auth/api-keys",
                json=api_key_data,
                headers=headers
            )
            
            assert response.status_code == 201
            api_key_info = response.json()
            api_key = api_key_info["key"]
            
            # 3. Use API key for authentication
            api_headers = {"X-API-Key": api_key}
            response = await client.get(
                f"{api_base_url}/api/v1/visual-design/templates",
                headers=api_headers
            )
            
            assert response.status_code == 200
            
            # 4. Test API key scopes
            # Should work for read operations
            response = await client.get(
                f"{api_base_url}/api/v1/user/profile",
                headers=api_headers
            )
            assert response.status_code == 200
```

### Cross-Service API Tests

```python
# tests/integration/api-endpoints/test_cross_service.py
import pytest
import httpx
import asyncio

class TestCrossServiceIntegration:
    
    @pytest.fixture
    def authenticated_client(self):
        """Create authenticated HTTP client"""
        async def _client():
            client = httpx.AsyncClient(base_url="http://localhost:3000")
            
            # Authenticate
            login_response = await client.post("/auth/login", json={
                "email": "test@example.com",
                "password": "testpassword"
            })
            
            token = login_response.json()["access_token"]
            client.headers.update({"Authorization": f"Bearer {token}"})
            
            return client
        
        return _client
    
    @pytest.mark.asyncio
    async def test_design_to_code_workflow(self, authenticated_client):
        """Test complete design-to-code workflow across services"""
        client = await authenticated_client()
        
        try:
            # 1. Create brand identity
            brand_response = await client.post("/api/v1/visual-design/brand-identity", json={
                "company_name": "Test Company",
                "industry": "Technology",
                "target_audience": "Developers"
            })
            
            assert brand_response.status_code == 200
            brand_data = brand_response.json()
            
            # 2. Generate UI layout using brand identity
            layout_response = await client.post("/api/v1/visual-design/ui-layout", json={
                "page_type": "landing",
                "brand_identity": brand_data,
                "components": ["header", "hero", "features", "footer"]
            })
            
            assert layout_response.status_code == 200
            layout_data = layout_response.json()
            
            # 3. Create website mockup
            mockup_response = await client.post("/api/v1/visual-design/website-mockup", json={
                "layout": layout_data,
                "brand_identity": brand_data,
                "content": {
                    "hero_title": "Welcome to Test Company",
                    "hero_subtitle": "Innovation in Technology"
                }
            })
            
            assert mockup_response.status_code == 200
            mockup_data = mockup_response.json()
            
            # 4. Convert mockup to code
            code_response = await client.post("/api/v1/image-generation/mockup-to-code", json={
                "mockup_url": mockup_data["mockup_url"],
                "framework": "react",
                "responsive": True
            })
            
            assert code_response.status_code == 200
            code_data = code_response.json()
            
            # 5. Analyze generated code quality
            analysis_response = await client.post("/api/v1/code-quality/analyze", json={
                "code": code_data["code"],
                "language": "javascript",
                "framework": "react"
            })
            
            assert analysis_response.status_code == 200
            analysis_data = analysis_response.json()
            
            # Verify the complete workflow
            assert "quality_score" in analysis_data
            assert analysis_data["quality_score"] > 0.7  # Good quality threshold
            
        finally:
            await client.aclose()
```

## 🎭 End-to-End Tests

### Complete User Journey Tests

```python
# tests/e2e/user-journeys/test_complete_workflow.py
import pytest
from playwright.async_api import async_playwright
import asyncio

class TestCompleteUserWorkflow:
    
    @pytest.mark.asyncio
    async def test_developer_onboarding_journey(self):
        """Test complete developer onboarding and API usage journey"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            page = await browser.new_page()
            
            try:
                # 1. Visit documentation portal
                await page.goto("http://localhost:3009")
                await page.wait_for_selector("h1")
                
                # 2. Navigate to API documentation
                await page.click("text=API Reference")
                await page.wait_for_selector(".api-endpoint")
                
                # 3. Try interactive API testing
                await page.click("text=Try it out")
                await page.fill("[data-testid=api-key-input]", "test-api-key")
                await page.click("[data-testid=execute-button]")
                
                # 4. Check response
                response_element = await page.wait_for_selector(".api-response")
                response_text = await response_element.inner_text()
                assert "200" in response_text or "success" in response_text.lower()
                
                # 5. Download SDK
                await page.click("text=Download Python SDK")
                download = await page.wait_for_event("download")
                assert download.suggested_filename.endswith(".zip")
                
                # 6. View code examples
                await page.click("text=Code Examples")
                await page.wait_for_selector(".code-example")
                
                code_blocks = await page.query_selector_all(".code-example")
                assert len(code_blocks) > 0
                
            finally:
                await browser.close()
    
    @pytest.mark.asyncio
    async def test_api_integration_workflow(self):
        """Test API integration workflow using SDK"""
        # This test uses the generated Python SDK
        import sys
        sys.path.append('./sdks/python')
        
        from frontier_api import FrontierClient
        
        client = FrontierClient(
            api_key="test-api-key",
            base_url="http://localhost:3000"
        )
        
        # 1. Test authentication
        user_profile = await client.auth.get_profile()
        assert user_profile.email is not None
        
        # 2. Create brand identity
        brand_identity = await client.visual_design.create_brand_identity(
            company_name="SDK Test Company",
            industry="Technology",
            target_audience="Developers"
        )
        assert brand_identity.logo_url is not None
        
        # 3. Generate code analysis
        code_analysis = await client.code_quality.analyze_code(
            code="function hello() { return 'world'; }",
            language="javascript"
        )
        assert code_analysis.quality_score is not None
        
        # 4. Process image
        image_result = await client.image_generation.create_asset(
            description="Modern tech company logo",
            style="minimalist",
            format="png"
        )
        assert image_result.image_url is not None
```

## ⚡ Performance Tests

### Load Testing

```python
# tests/performance/load-tests/api_load_test.py
import asyncio
import aiohttp
import time
from dataclasses import dataclass
from typing import List
import statistics

@dataclass
class LoadTestResult:
    endpoint: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_response_time: float
    min_response_time: float
    max_response_time: float
    requests_per_second: float

class ApiLoadTester:
    
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.session = None
    
    async def setup(self):
        """Setup HTTP session"""
        connector = aiohttp.TCPConnector(limit=100)
        timeout = aiohttp.ClientTimeout(total=30)
        headers = {"X-API-Key": self.api_key}
        
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers=headers
        )
    
    async def cleanup(self):
        """Cleanup HTTP session"""
        if self.session:
            await self.session.close()
    
    async def make_request(self, endpoint: str, method: str = "GET", data: dict = None):
        """Make single HTTP request and measure response time"""
        start_time = time.time()
        
        try:
            if method == "GET":
                async with self.session.get(f"{self.base_url}{endpoint}") as response:
                    await response.text()
                    success = response.status < 400
            else:
                async with self.session.post(f"{self.base_url}{endpoint}", json=data) as response:
                    await response.text()
                    success = response.status < 400
                    
            end_time = time.time()
            return success, end_time - start_time
            
        except Exception as e:
            end_time = time.time()
            return False, end_time - start_time
    
    async def run_load_test(self, endpoint: str, concurrent_users: int, 
                          requests_per_user: int, method: str = "GET", 
                          data: dict = None) -> LoadTestResult:
        """Run load test with specified parameters"""
        
        async def user_session(user_id: int):
            """Simulate single user making multiple requests"""
            results = []
            for _ in range(requests_per_user):
                success, response_time = await self.make_request(endpoint, method, data)
                results.append((success, response_time))
                await asyncio.sleep(0.1)  # Small delay between requests
            return results
        
        # Start load test
        start_time = time.time()
        
        # Run concurrent user sessions
        tasks = [user_session(i) for i in range(concurrent_users)]
        user_results = await asyncio.gather(*tasks)
        
        end_time = time.time()
        total_duration = end_time - start_time
        
        # Aggregate results
        all_results = []
        for user_result in user_results:
            all_results.extend(user_result)
        
        successful_requests = sum(1 for success, _ in all_results if success)
        failed_requests = len(all_results) - successful_requests
        response_times = [rt for _, rt in all_results]
        
        return LoadTestResult(
            endpoint=endpoint,
            total_requests=len(all_results),
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            average_response_time=statistics.mean(response_times),
            min_response_time=min(response_times),
            max_response_time=max(response_times),
            requests_per_second=len(all_results) / total_duration
        )

# Load test scenarios
async def run_load_tests():
    """Run comprehensive load tests"""
    tester = ApiLoadTester("http://localhost:3000", "test-api-key")
    await tester.setup()
    
    try:
        # Test scenarios
        scenarios = [
            {
                "name": "Health Check Load Test",
                "endpoint": "/health",
                "concurrent_users": 50,
                "requests_per_user": 20,
                "method": "GET"
            },
            {
                "name": "Brand Identity Creation Load Test",
                "endpoint": "/api/v1/visual-design/brand-identity",
                "concurrent_users": 10,
                "requests_per_user": 5,
                "method": "POST",
                "data": {
                    "company_name": "Load Test Company",
                    "industry": "Technology"
                }
            },
            {
                "name": "Code Analysis Load Test",
                "endpoint": "/api/v1/code-quality/analyze",
                "concurrent_users": 20,
                "requests_per_user": 10,
                "method": "POST",
                "data": {
                    "code": "function test() { return true; }",
                    "language": "javascript"
                }
            }
        ]
        
        results = []
        for scenario in scenarios:
            print(f"Running {scenario['name']}...")
            
            result = await tester.run_load_test(
                endpoint=scenario["endpoint"],
                concurrent_users=scenario["concurrent_users"],
                requests_per_user=scenario["requests_per_user"],
                method=scenario["method"],
                data=scenario.get("data")
            )
            
            results.append((scenario["name"], result))
            
            # Print results
            print(f"  Total Requests: {result.total_requests}")
            print(f"  Successful: {result.successful_requests}")
            print(f"  Failed: {result.failed_requests}")
            print(f"  Success Rate: {result.successful_requests/result.total_requests*100:.1f}%")
            print(f"  Average Response Time: {result.average_response_time:.3f}s")
            print(f"  Requests/Second: {result.requests_per_second:.1f}")
            print(f"  Min/Max Response Time: {result.min_response_time:.3f}s / {result.max_response_time:.3f}s")
            print()
        
        # Performance assertions
        for name, result in results:
            assert result.successful_requests / result.total_requests > 0.95, f"{name}: Success rate too low"
            assert result.average_response_time < 2.0, f"{name}: Average response time too high"
            assert result.requests_per_second > 10, f"{name}: Throughput too low"
        
        print("All load tests passed!")
        
    finally:
        await tester.cleanup()

if __name__ == "__main__":
    asyncio.run(run_load_tests())
```

### Stress Testing

```python
# tests/performance/stress-tests/concurrent_users.py
import asyncio
import aiohttp
import json
import time
from typing import Dict, List

class StressTester:
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.results = []
    
    async def stress_test_concurrent_users(self, max_users: int, ramp_up_time: int):
        """Test system behavior with increasing concurrent users"""
        
        async def user_workload(user_id: int, session: aiohttp.ClientSession):
            """Simulate realistic user workload"""
            try:
                # Authentication
                auth_response = await session.post("/auth/login", json={
                    "email": f"user{user_id}@example.com",
                    "password": "testpassword"
                })
                
                if auth_response.status != 200:
                    return {"user_id": user_id, "error": "Authentication failed"}
                
                token = (await auth_response.json())["access_token"]
                session.headers.update({"Authorization": f"Bearer {token}"})
                
                # Perform various operations
                operations = [
                    ("GET", "/api/v1/user/profile"),
                    ("POST", "/api/v1/visual-design/brand-identity", {
                        "company_name": f"Company {user_id}",
                        "industry": "Technology"
                    }),
                    ("GET", "/api/v1/visual-design/templates"),
                    ("POST", "/api/v1/code-quality/analyze", {
                        "code": "function test() { return true; }",
                        "language": "javascript"
                    })
                ]
                
                operation_results = []
                for method, endpoint, data in operations:
                    start_time = time.time()
                    
                    if method == "GET":
                        response = await session.get(endpoint)
                    else:
                        response = await session.post(endpoint, json=data)
                    
                    end_time = time.time()
                    
                    operation_results.append({
                        "endpoint": endpoint,
                        "status": response.status,
                        "response_time": end_time - start_time
                    })
                
                return {
                    "user_id": user_id,
                    "operations": operation_results,
                    "success": True
                }
                
            except Exception as e:
                return {
                    "user_id": user_id,
                    "error": str(e),
                    "success": False
                }
        
        # Gradually increase concurrent users
        for user_count in range(10, max_users + 1, 10):
            print(f"Testing with {user_count} concurrent users...")
            
            connector = aiohttp.TCPConnector(limit=user_count * 2)
            timeout = aiohttp.ClientTimeout(total=60)
            
            async with aiohttp.ClientSession(
                base_url=self.base_url,
                connector=connector,
                timeout=timeout
            ) as session:
                
                start_time = time.time()
                
                # Create user tasks
                tasks = [
                    user_workload(i, session)
                    for i in range(user_count)
                ]
                
                # Execute with timeout
                try:
                    user_results = await asyncio.wait_for(
                        asyncio.gather(*tasks, return_exceptions=True),
                        timeout=120
                    )
                except asyncio.TimeoutError:
                    print(f"  TIMEOUT: {user_count} users exceeded timeout")
                    break
                
                end_time = time.time()
                total_time = end_time - start_time
                
                # Analyze results
                successful_users = sum(1 for r in user_results if isinstance(r, dict) and r.get("success"))
                failed_users = user_count - successful_users
                
                avg_response_times = {}
                for result in user_results:
                    if isinstance(result, dict) and "operations" in result:
                        for op in result["operations"]:
                            endpoint = op["endpoint"]
                            if endpoint not in avg_response_times:
                                avg_response_times[endpoint] = []
                            avg_response_times[endpoint].append(op["response_time"])
                
                # Calculate averages
                for endpoint in avg_response_times:
                    avg_response_times[endpoint] = sum(avg_response_times[endpoint]) / len(avg_response_times[endpoint])
                
                result_summary = {
                    "concurrent_users": user_count,
                    "successful_users": successful_users,
                    "failed_users": failed_users,
                    "success_rate": successful_users / user_count,
                    "total_time": total_time,
                    "avg_response_times": avg_response_times
                }
                
                self.results.append(result_summary)
                
                print(f"  Success Rate: {result_summary['success_rate']:.1%}")
                print(f"  Total Time: {total_time:.2f}s")
                print(f"  Average Response Times: {avg_response_times}")
                
                # Stop if success rate drops below threshold
                if result_summary['success_rate'] < 0.8:
                    print(f"  BREAKING: Success rate below 80% at {user_count} users")
                    break
                
                # Wait before next test
                await asyncio.sleep(5)
        
        return self.results

async def run_stress_tests():
    """Run comprehensive stress tests"""
    tester = StressTester("http://localhost:3000")
    
    print("Starting stress tests...")
    results = await tester.stress_test_concurrent_users(max_users=200, ramp_up_time=30)
    
    print("\n=== Stress Test Summary ===")
    for result in results:
        print(f"Users: {result['concurrent_users']}, "
              f"Success Rate: {result['success_rate']:.1%}, "
              f"Time: {result['total_time']:.2f}s")
    
    # Find breaking point
    breaking_point = None
    for result in results:
        if result['success_rate'] < 0.95:
            breaking_point = result['concurrent_users']
            break
    
    if breaking_point:
        print(f"\nSystem starts degrading at {breaking_point} concurrent users")
    else:
        print(f"\nSystem handled up to {results[-1]['concurrent_users']} users successfully")

if __name__ == "__main__":
    asyncio.run(run_stress_tests())
```

## 🔒 Security Tests

### Authentication Security Tests

```python
# tests/security/auth-tests/test_auth_security.py
import pytest
import httpx
import jwt
import time

class TestAuthenticationSecurity:
    
    @pytest.fixture
    def api_base_url(self):
        return "http://localhost:3000"
    
    @pytest.mark.asyncio
    async def test_sql_injection_protection(self, api_base_url):
        """Test protection against SQL injection attacks"""
        async with httpx.AsyncClient() as client:
            # Try SQL injection in login
            malicious_payloads = [
                "'; DROP TABLE users; --",
                "' OR '1'='1",
                "admin'; --",
                "' UNION SELECT * FROM users --"
            ]
            
            for payload in malicious_payloads:
                response = await client.post(f"{api_base_url}/auth/login", json={
                    "email": payload,
                    "password": "anypassword"
                })
                
                # Should return 401 or 400, not 500 (which might indicate SQL error)
                assert response.status_code in [400, 401]
                
                # Response should not contain SQL error messages
                response_text = response.text.lower()
                sql_keywords = ["sql", "syntax", "mysql", "postgres", "database"]
                for keyword in sql_keywords:
                    assert keyword not in response_text
    
    @pytest.mark.asyncio
    async def test_jwt_token_security(self, api_base_url):
        """Test JWT token security measures"""
        async with httpx.AsyncClient() as client:
            # 1. Get valid token
            login_response = await client.post(f"{api_base_url}/auth/login", json={
                "email": "test@example.com",
                "password": "testpassword"
            })
            
            assert login_response.status_code == 200
            token = login_response.json()["access_token"]
            
            # 2. Test token tampering
            # Decode token and modify claims
            decoded = jwt.decode(token, options={"verify_signature": False})
            decoded["user_id"] = "malicious-user-id"
            
            # Create tampered token (without proper signature)
            tampered_token = jwt.encode(decoded, "wrong-secret", algorithm="HS256")
            
            # Try to use tampered token
            response = await client.get(
                f"{api_base_url}/api/v1/user/profile",
                headers={"Authorization": f"Bearer {tampered_token}"}
            )
            
            assert response.status_code == 401
            
            # 3. Test expired token
            decoded = jwt.decode(token, options={"verify_signature": False})
            decoded["exp"] = int(time.time()) - 3600  # Expired 1 hour ago
            
            expired_token = jwt.encode(decoded, "wrong-secret", algorithm="HS256")
            
            response = await client.get(
                f"{api_base_url}/api/v1/user/profile",
                headers={"Authorization": f"Bearer {expired_token}"}
            )
            
            assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_rate_limiting_bypass_attempts(self, api_base_url):
        """Test attempts to bypass rate limiting"""
        async with httpx.AsyncClient() as client:
            # Test various headers that might be used to bypass rate limiting
            bypass_headers = [
                {"X-Forwarded-For": "1.2.3.4"},
                {"X-Real-IP": "1.2.3.4"},
                {"X-Originating-IP": "1.2.3.4"},
                {"X-Remote-IP": "1.2.3.4"},
                {"X-Client-IP": "1.2.3.4"}
            ]
            
            # Make many requests with different bypass headers
            for headers in bypass_headers:
                for _ in range(20):  # Exceed normal rate limit
                    response = await client.get(
                        f"{api_base_url}/api/v1/user/profile",
                        headers={**headers, "X-API-Key": "test-api-key"}
                    )
                    
                    if response.status_code == 429:  # Rate limited
                        break
                
                # Should eventually get rate limited regardless of headers
                assert response.status_code == 429
    
    @pytest.mark.asyncio
    async def test_xss_protection(self, api_base_url):
        """Test XSS protection in API responses"""
        async with httpx.AsyncClient() as client:
            # Try XSS payloads in various inputs
            xss_payloads = [
                "<script>alert('xss')</script>",
                "javascript:alert('xss')",
                "<img src=x onerror=alert('xss')>",
                "';alert('xss');//"
            ]
            
            for payload in xss_payloads:
                # Test in brand identity creation
                response = await client.post(
                    f"{api_base_url}/api/v1/visual-design/brand-identity",
                    json={
                        "company_name": payload,
                        "industry": "Technology"
                    },
                    headers={"X-API-Key": "test-api-key"}
                )
                
                if response.status_code == 200:
                    # Response should not contain unescaped script tags
                    response_text = response.text
                    assert "<script>" not in response_text
                    assert "javascript:" not in response_text
                    assert "onerror=" not in response_text
```

## 📊 Test Reporting

### Test Results Dashboard

```python
# tests/reporting/test_dashboard.py
import json
import time
from datetime import datetime
from typing import Dict, List
import matplotlib.pyplot as plt
import pandas as pd

class TestReportGenerator:
    
    def __init__(self):
        self.test_results = []
        self.performance_results = []
        self.security_results = []
    
    def add_test_result(self, test_type: str, test_name: str, 
                       status: str, duration: float, details: dict = None):
        """Add test result to report"""
        self.test_results.append({
            "timestamp": datetime.now().isoformat(),
            "test_type": test_type,
            "test_name": test_name,
            "status": status,
            "duration": duration,
            "details": details or {}
        })
    
    def add_performance_result(self, endpoint: str, metrics: dict):
        """Add performance test result"""
        self.performance_results.append({
            "timestamp": datetime.now().isoformat(),
            "endpoint": endpoint,
            **metrics
        })
    
    def generate_html_report(self, output_file: str = "test_report.html"):
        """Generate comprehensive HTML test report"""
        
        # Calculate summary statistics
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["status"] == "passed")
        failed_tests = sum(1 for r in self.test_results if r["status"] == "failed")
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Generate HTML
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Frontier API Test Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .summary {{ background: #f5f5f5; padding: 20px; border-radius: 8px; }}
                .success {{ color: #28a745; }}
                .failure {{ color: #dc3545; }}
                .warning {{ color: #ffc107; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
                .chart {{ margin: 20px 0; }}
            </style>
        </head>
        <body>
            <h1>Frontier API Test Report</h1>
            <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            
            <div class="summary">
                <h2>Test Summary</h2>
                <p>Total Tests: {total_tests}</p>
                <p class="success">Passed: {passed_tests}</p>
                <p class="failure">Failed: {failed_tests}</p>
                <p>Success Rate: {success_rate:.1f}%</p>
            </div>
            
            <h2>Test Results by Type</h2>
            <table>
                <tr>
                    <th>Test Type</th>
                    <th>Test Name</th>
                    <th>Status</th>
                    <th>Duration (s)</th>
                    <th>Details</th>
                </tr>
        """
        
        for result in self.test_results:
            status_class = "success" if result["status"] == "passed" else "failure"
            html_content += f"""
                <tr>
                    <td>{result['test_type']}</td>
                    <td>{result['test_name']}</td>
                    <td class="{status_class}">{result['status']}</td>
                    <td>{result['duration']:.3f}</td>
                    <td>{json.dumps(result['details'], indent=2) if result['details'] else ''}</td>
                </tr>
            """
        
        html_content += """
            </table>
            
            <h2>Performance Results</h2>
            <table>
                <tr>
                    <th>Endpoint</th>
                    <th>Avg Response Time (s)</th>
                    <th>Requests/Second</th>
                    <th>Success Rate (%)</th>
                </tr>
        """
        
        for result in self.performance_results:
            html_content += f"""
                <tr>
                    <td>{result['endpoint']}</td>
                    <td>{result.get('average_response_time', 'N/A')}</td>
                    <td>{result.get('requests_per_second', 'N/A')}</td>
                    <td>{result.get('success_rate', 'N/A')}</td>
                </tr>
            """
        
        html_content += """
            </table>
        </body>
        </html>
        """
        
        with open(output_file, 'w') as f:
            f.write(html_content)
        
        print(f"Test report generated: {output_file}")
    
    def generate_performance_charts(self):
        """Generate performance visualization charts"""
        if not self.performance_results:
            return
        
        # Create DataFrame
        df = pd.DataFrame(self.performance_results)
        
        # Response time chart
        plt.figure(figsize=(12, 6))
        plt.subplot(1, 2, 1)
        df.plot(x='endpoint', y='average_response_time', kind='bar', ax=plt.gca())
        plt.title('Average Response Time by Endpoint')
        plt.ylabel('Response Time (seconds)')
        plt.xticks(rotation=45)
        
        # Throughput chart
        plt.subplot(1, 2, 2)
        df.plot(x='endpoint', y='requests_per_second', kind='bar', ax=plt.gca())
        plt.title('Throughput by Endpoint')
        plt.ylabel('Requests per Second')
        plt.xticks(rotation=45)
        
        plt.tight_layout()
        plt.savefig('performance_charts.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        print("Performance charts generated: performance_charts.png")

# Usage example
def run_comprehensive_tests():
    """Run all tests and generate report"""
    reporter = TestReportGenerator()
    
    # This would be called by actual test runners
    # reporter.add_test_result("unit", "test_auth_validation", "passed", 0.123)
    # reporter.add_test_result("integration", "test_api_flow", "failed", 2.456, {"error": "Timeout"})
    # reporter.add_performance_result("/api/v1/health", {
    #     "average_response_time": 0.045,
    #     "requests_per_second": 1234.5,
    #     "success_rate": 99.8
    # })
    
    # Generate reports
    reporter.generate_html_report()
    reporter.generate_performance_charts()
```

## 🚀 Test Automation

### Continuous Integration Pipeline

```yaml
# .github/workflows/test.yml
name: Comprehensive API Testing

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      
      - name: Install dependencies
        run: |
          pip install -r requirements-test.txt
      
      - name: Run unit tests
        run: |
          pytest tests/unit/ -v --cov=src --cov-report=xml
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: frontier_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:6
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up test environment
        run: |
          docker-compose -f docker-compose.test.yml up -d
          sleep 30  # Wait for services to start
      
      - name: Run integration tests
        run: |
          pytest tests/integration/ -v
      
      - name: Run e2e tests
        run: |
          pytest tests/e2e/ -v

  performance-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up performance test environment
        run: |
          docker-compose -f docker-compose.perf.yml up -d
          sleep 60  # Wait for services to be ready
      
      - name: Run load tests
        run: |
          python tests/performance/load-tests/api_load_test.py
      
      - name: Run stress tests
        run: |
          python tests/performance/stress-tests/concurrent_users.py
      
      - name: Upload performance results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: performance_results.json

  security-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run security tests
        run: |
          pytest tests/security/ -v
      
      - name: Run OWASP ZAP scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:3000'
```

This comprehensive testing guide provides a complete framework for testing the Frontier API ecosystem at every level, ensuring reliability, performance, and security before production deployment.
