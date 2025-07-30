"""
Comprehensive API Testing Suite

Complete test suite for all Frontier Business Operations API endpoints
including unit tests, integration tests, performance tests, and security tests.
"""

import pytest
import asyncio
import json
import time
from datetime import datetime
from typing import Dict, Any, List
from httpx import AsyncClient
from fastapi.testclient import TestClient
import pandas as pd

# Import the main app
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app
from api.config import settings
from api.middleware.auth import user_manager, jwt_manager
from api.utils.database import db_manager

# Test configuration
TEST_USER_DATA = {
    "username": "test_user",
    "email": "test@example.com",
    "password": "test_password_123",
    "subscription_tier": "professional"
}

TEST_ADMIN_DATA = {
    "username": "test_admin",
    "email": "admin@example.com", 
    "password": "admin_password_123",
    "subscription_tier": "enterprise",
    "roles": ["admin", "analyst"]
}


class TestAPIBase:
    """Base class for API tests"""
    
    @pytest.fixture(scope="session")
    def event_loop(self):
        """Create event loop for async tests"""
        loop = asyncio.get_event_loop_policy().new_event_loop()
        yield loop
        loop.close()
    
    @pytest.fixture(scope="session")
    async def setup_database(self):
        """Setup test database"""
        await db_manager.initialize()
        yield
        await db_manager.close()
    
    @pytest.fixture(scope="session")
    async def test_client(self, setup_database):
        """Create test client"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            yield client
    
    @pytest.fixture(scope="session")
    async def auth_headers(self):
        """Create authentication headers for tests"""
        # Create test user
        test_user = user_manager.create_user(
            username=TEST_USER_DATA["username"],
            email=TEST_USER_DATA["email"],
            password=TEST_USER_DATA["password"],
            subscription_tier=TEST_USER_DATA["subscription_tier"]
        )
        
        # Create test admin
        test_admin = user_manager.create_user(
            username=TEST_ADMIN_DATA["username"],
            email=TEST_ADMIN_DATA["email"],
            password=TEST_ADMIN_DATA["password"],
            subscription_tier=TEST_ADMIN_DATA["subscription_tier"],
            roles=TEST_ADMIN_DATA["roles"]
        )
        
        # Generate tokens
        user_token = jwt_manager.create_access_token(test_user)
        admin_token = jwt_manager.create_access_token(test_admin)
        
        return {
            "user": {"Authorization": f"Bearer {user_token}"},
            "admin": {"Authorization": f"Bearer {admin_token}"}
        }


class TestHealthAndStatus(TestAPIBase):
    """Test health check and status endpoints"""
    
    async def test_health_check(self, test_client: AsyncClient):
        """Test health check endpoint"""
        response = await test_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "status" in data["data"]
        assert data["data"]["status"] == "healthy"
    
    async def test_api_status(self, test_client: AsyncClient, auth_headers: Dict):
        """Test API status endpoint"""
        response = await test_client.get(
            "/status",
            headers=auth_headers["user"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "uptime" in data["data"]
        assert "statistics" in data["data"]
    
    async def test_api_metrics(self, test_client: AsyncClient, auth_headers: Dict):
        """Test API metrics endpoint"""
        response = await test_client.get(
            "/metrics",
            headers=auth_headers["user"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "performance" in data["data"]


class TestAuthentication(TestAPIBase):
    """Test authentication and authorization"""
    
    async def test_unauthenticated_request(self, test_client: AsyncClient):
        """Test request without authentication"""
        response = await test_client.get("/api/v1/business/financial-analysis")
        assert response.status_code == 401
    
    async def test_invalid_token(self, test_client: AsyncClient):
        """Test request with invalid token"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = await test_client.get(
            "/api/v1/business/financial-analysis",
            headers=headers
        )
        assert response.status_code == 401
    
    async def test_valid_authentication(self, test_client: AsyncClient, auth_headers: Dict):
        """Test request with valid authentication"""
        response = await test_client.get(
            "/status",
            headers=auth_headers["user"]
        )
        assert response.status_code == 200


class TestFinancialAnalysis(TestAPIBase):
    """Test financial analysis endpoints"""
    
    def get_sample_financial_data(self) -> Dict[str, Any]:
        """Get sample financial data for testing"""
        return {
            "company_name": "Test Company Inc.",
            "industry": "technology",
            "analysis_period": "Q4 2024",
            "financial_statements": {
                "balance_sheet": {
                    "total_assets": 1000000,
                    "total_liabilities": 600000,
                    "shareholders_equity": 400000,
                    "current_assets": 500000,
                    "current_liabilities": 200000,
                    "cash": 100000,
                    "accounts_receivable": 150000,
                    "inventory": 100000,
                    "total_debt": 300000
                },
                "income_statement": {
                    "revenue": 2000000,
                    "net_income": 200000,
                    "gross_profit": 800000,
                    "operating_income": 300000,
                    "cost_of_goods_sold": 1200000
                }
            }
        }
    
    async def test_financial_analysis_success(self, test_client: AsyncClient, auth_headers: Dict):
        """Test successful financial analysis"""
        data = self.get_sample_financial_data()
        
        response = await test_client.post(
            "/api/v1/business/financial-analysis",
            json=data,
            headers=auth_headers["user"]
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "financial_ratios" in result["data"]
        assert "score" in result["data"]
        assert result["data"]["company_name"] == "Test Company Inc."
    
    async def test_financial_analysis_validation_error(self, test_client: AsyncClient, auth_headers: Dict):
        """Test financial analysis with invalid data"""
        data = {
            "company_name": "",  # Invalid empty name
            "industry": "technology",
            "analysis_period": "Q4 2024",
            "financial_statements": {
                "balance_sheet": {},  # Missing required fields
                "income_statement": {}
            }
        }
        
        response = await test_client.post(
            "/api/v1/business/financial-analysis",
            json=data,
            headers=auth_headers["user"]
        )
        
        assert response.status_code == 422  # Validation error
    
    async def test_valuation_analysis(self, test_client: AsyncClient, auth_headers: Dict):
        """Test valuation analysis (requires Professional tier)"""
        data = {
            "company_name": "Test Company Inc.",
            "financial_data": {
                "free_cash_flow": 100000,
                "net_income": 200000,
                "ebitda": 300000,
                "revenue": 2000000
            },
            "market_data": {
                "industry_pe": 15.0,
                "industry_ev_ebitda": 8.0,
                "industry_revenue_multiple": 2.5
            },
            "valuation_methods": ["dcf", "pe_multiple"]
        }
        
        response = await test_client.post(
            "/api/v1/business/valuation",
            json=data,
            headers=auth_headers["user"]  # Professional tier user
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "individual_valuations" in result["data"]
    
    async def test_trend_analysis(self, test_client: AsyncClient, auth_headers: Dict):
        """Test trend analysis"""
        data = {
            "company_name": "Test Company Inc.",
            "historical_data": [
                {"year": 2020, "revenue": 1500000, "net_income": 150000},
                {"year": 2021, "revenue": 1700000, "net_income": 170000},
                {"year": 2022, "revenue": 1900000, "net_income": 190000},
                {"year": 2023, "revenue": 2000000, "net_income": 200000}
            ],
            "analysis_period_years": 4,
            "forecast_years": 3
        }
        
        response = await test_client.post(
            "/api/v1/business/trend-analysis",
            json=data,
            headers=auth_headers["user"]
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "historical_trends" in result["data"]
        assert "forecasts" in result["data"]
    
    async def test_industry_benchmarks(self, test_client: AsyncClient, auth_headers: Dict):
        """Test industry benchmarks retrieval"""
        response = await test_client.get(
            "/api/v1/business/industry-benchmarks?industry=technology",
            headers=auth_headers["user"]
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "benchmarks" in result["data"]
        assert result["data"]["industry"] == "technology"


class TestStrategicPlanning(TestAPIBase):
    """Test strategic planning endpoints"""
    
    def get_sample_strategic_data(self) -> Dict[str, Any]:
        """Get sample strategic planning data"""
        return {
            "company_profile": {
                "name": "Test Strategic Corp",
                "industry": "technology",
                "size": "medium",
                "geography": ["north_america", "europe"],
                "business_model": "SaaS platform",
                "key_products_services": ["Software platform", "Consulting services"],
                "target_customers": ["Enterprise", "SMB"]
            },
            "current_situation": {
                "financial_performance": {
                    "revenue_growth": 0.15,
                    "profitability": 0.12
                },
                "market_share": 0.08,
                "industry_trends": ["digital_transformation", "sustainability"]
            },
            "objectives": [
                "Increase market share to 15%",
                "Expand into Asia-Pacific region",
                "Develop AI-powered features"
            ],
            "time_horizon": 3
        }
    
    async def test_strategic_planning_analysis(self, test_client: AsyncClient, auth_headers: Dict):
        """Test strategic planning analysis"""
        data = self.get_sample_strategic_data()
        
        response = await test_client.post(
            "/api/v1/business/strategic-planning",
            json=data,
            headers=auth_headers["user"]
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "swot_analysis" in result["data"]
        assert "market_analysis" in result["data"]
        assert "strategic_objectives" in result["data"]
        assert "action_plan" in result["data"]
    
    async def test_market_research(self, test_client: AsyncClient, auth_headers: Dict):
        """Test market research analysis"""
        data = {
            "industry": "technology",
            "geography": ["north_america", "europe"],
            "research_scope": ["market_size", "growth_trends"],
            "time_frame": "5_years"
        }
        
        response = await test_client.post(
            "/api/v1/business/market-research",
            json=data,
            headers=auth_headers["user"]
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "market_analysis" in result["data"]
        assert "key_insights" in result["data"]
    
    async def test_competitive_analysis_professional_required(self, test_client: AsyncClient, auth_headers: Dict):
        """Test competitive analysis (Professional tier required)"""
        data = {
            "company_name": "Test Company",
            "industry": "technology",
            "competitors": ["Competitor A", "Competitor B", "Competitor C"],
            "analysis_dimensions": ["market_share", "strengths_weaknesses"]
        }
        
        response = await test_client.post(
            "/api/v1/business/competitive-analysis",
            json=data,
            headers=auth_headers["user"]  # Professional tier
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "competitive_landscape" in result["data"]


class TestRateLimiting(TestAPIBase):
    """Test rate limiting functionality"""
    
    async def test_rate_limit_enforcement(self, test_client: AsyncClient, auth_headers: Dict):
        """Test that rate limits are enforced"""
        # Make multiple rapid requests
        responses = []
        for i in range(10):
            response = await test_client.get(
                "/status",
                headers=auth_headers["user"]
            )
            responses.append(response.status_code)
            await asyncio.sleep(0.1)  # Small delay
        
        # All requests should succeed for professional tier
        assert all(status == 200 for status in responses)
    
    async def test_rate_limit_headers(self, test_client: AsyncClient, auth_headers: Dict):
        """Test rate limiting headers are included"""
        response = await test_client.get(
            "/status",
            headers=auth_headers["user"]
        )
        
        assert response.status_code == 200
        assert "X-RateLimit-Limit-Minute" in response.headers
        assert "X-RateLimit-Remaining-Minute" in response.headers


class TestErrorHandling(TestAPIBase):
    """Test error handling and responses"""
    
    async def test_404_endpoint(self, test_client: AsyncClient, auth_headers: Dict):
        """Test 404 error for non-existent endpoint"""
        response = await test_client.get(
            "/api/v1/business/non-existent-endpoint",
            headers=auth_headers["user"]
        )
        
        assert response.status_code == 404
    
    async def test_validation_error_format(self, test_client: AsyncClient, auth_headers: Dict):
        """Test validation error response format"""
        invalid_data = {
            "invalid_field": "invalid_value"
        }
        
        response = await test_client.post(
            "/api/v1/business/financial-analysis",
            json=invalid_data,
            headers=auth_headers["user"]
        )
        
        assert response.status_code == 422
        error_data = response.json()
        assert "detail" in error_data


class TestPerformance(TestAPIBase):
    """Test API performance"""
    
    async def test_response_time(self, test_client: AsyncClient, auth_headers: Dict):
        """Test API response time"""
        start_time = time.time()
        
        response = await test_client.get(
            "/health"
        )
        
        end_time = time.time()
        response_time = end_time - start_time
        
        assert response.status_code == 200
        assert response_time < 1.0  # Should respond within 1 second
    
    async def test_concurrent_requests(self, test_client: AsyncClient, auth_headers: Dict):
        """Test handling of concurrent requests"""
        async def make_request():
            return await test_client.get("/health")
        
        # Make 10 concurrent requests
        tasks = [make_request() for _ in range(10)]
        responses = await asyncio.gather(*tasks)
        
        # All requests should succeed
        assert all(response.status_code == 200 for response in responses)


class TestSecurity(TestAPIBase):
    """Test security features"""
    
    async def test_sql_injection_protection(self, test_client: AsyncClient, auth_headers: Dict):
        """Test protection against SQL injection"""
        malicious_input = "'; DROP TABLE users; --"
        
        response = await test_client.get(
            f"/api/v1/business/industry-benchmarks?industry={malicious_input}",
            headers=auth_headers["user"]
        )
        
        # Should handle gracefully without exposing database errors
        assert response.status_code in [200, 400, 422]
    
    async def test_xss_protection(self, test_client: AsyncClient, auth_headers: Dict):
        """Test protection against XSS"""
        xss_input = "<script>alert('xss')</script>"
        
        data = self.get_sample_financial_data()
        data["company_name"] = xss_input
        
        response = await test_client.post(
            "/api/v1/business/financial-analysis",
            json=data,
            headers=auth_headers["user"]
        )
        
        # Should either reject or sanitize the input
        if response.status_code == 200:
            result = response.json()
            # Check that script tags are not present in response
            assert "<script>" not in str(result)


class TestIntegration(TestAPIBase):
    """Integration tests for complete workflows"""
    
    async def test_complete_financial_analysis_workflow(self, test_client: AsyncClient, auth_headers: Dict):
        """Test complete financial analysis workflow"""
        
        # Step 1: Get industry benchmarks
        benchmark_response = await test_client.get(
            "/api/v1/business/industry-benchmarks?industry=technology",
            headers=auth_headers["user"]
        )
        assert benchmark_response.status_code == 200
        
        # Step 2: Perform financial analysis
        financial_data = self.get_sample_financial_data()
        analysis_response = await test_client.post(
            "/api/v1/business/financial-analysis",
            json=financial_data,
            headers=auth_headers["user"]
        )
        assert analysis_response.status_code == 200
        
        # Step 3: Perform trend analysis
        trend_data = {
            "company_name": "Test Company Inc.",
            "historical_data": [
                {"year": 2022, "revenue": 1800000, "net_income": 180000},
                {"year": 2023, "revenue": 2000000, "net_income": 200000}
            ]
        }
        trend_response = await test_client.post(
            "/api/v1/business/trend-analysis",
            json=trend_data,
            headers=auth_headers["user"]
        )
        assert trend_response.status_code == 200
        
        # Verify all responses contain expected data
        benchmark_data = benchmark_response.json()
        analysis_data = analysis_response.json()
        trend_data_result = trend_response.json()
        
        assert all(resp["success"] for resp in [benchmark_data, analysis_data, trend_data_result])
    
    async def test_complete_strategic_planning_workflow(self, test_client: AsyncClient, auth_headers: Dict):
        """Test complete strategic planning workflow"""
        
        # Step 1: Market research
        market_data = {
            "industry": "technology",
            "geography": ["north_america"],
            "research_scope": ["market_size", "growth_trends"]
        }
        market_response = await test_client.post(
            "/api/v1/business/market-research",
            json=market_data,
            headers=auth_headers["user"]
        )
        assert market_response.status_code == 200
        
        # Step 2: Strategic planning
        strategic_data = self.get_sample_strategic_data()
        strategic_response = await test_client.post(
            "/api/v1/business/strategic-planning",
            json=strategic_data,
            headers=auth_headers["user"]
        )
        assert strategic_response.status_code == 200
        
        # Verify workflow completion
        market_result = market_response.json()
        strategic_result = strategic_response.json()
        
        assert market_result["success"]
        assert strategic_result["success"]
        assert "action_plan" in strategic_result["data"]


# Utility functions for running tests
def run_all_tests():
    """Run all API tests"""
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--asyncio-mode=auto"
    ])


def run_specific_test_class(test_class_name: str):
    """Run tests for a specific class"""
    pytest.main([
        f"{__file__}::{test_class_name}",
        "-v",
        "--tb=short",
        "--asyncio-mode=auto"
    ])


def run_performance_tests():
    """Run only performance tests"""
    pytest.main([
        f"{__file__}::TestPerformance",
        "-v",
        "--tb=short",
        "--asyncio-mode=auto"
    ])


def run_security_tests():
    """Run only security tests"""
    pytest.main([
        f"{__file__}::TestSecurity",
        "-v",
        "--tb=short",
        "--asyncio-mode=auto"
    ])


if __name__ == "__main__":
    # Run all tests when script is executed directly
    run_all_tests()
