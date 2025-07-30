"""
Frontier Business Operations API - Python SDK

Official Python client library for the Frontier Business Operations API.
Provides convenient access to business intelligence, financial analysis,
and strategic planning capabilities.
"""

import httpx
import asyncio
from typing import Dict, Any, Optional, List, Union
from datetime import datetime
import json
from urllib.parse import urlencode


class FrontierAPIError(Exception):
    """Base exception for Frontier API errors"""
    
    def __init__(self, message: str, status_code: int = None, error_code: str = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(message)


class RateLimitError(FrontierAPIError):
    """Raised when rate limit is exceeded"""
    pass


class AuthenticationError(FrontierAPIError):
    """Raised when authentication fails"""
    pass


class ValidationError(FrontierAPIError):
    """Raised when request validation fails"""
    pass


class FrontierClient:
    """
    Main client for interacting with the Frontier Business Operations API.
    
    Example:
        client = FrontierClient(api_key="your_api_key")
        result = client.financial_analysis({
            "company_name": "Example Corp",
            "industry": "technology",
            # ... more data
        })
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.frontier-business.com/v1",
        timeout: int = 30,
        max_retries: int = 3
    ):
        """
        Initialize the Frontier API client.
        
        Args:
            api_key: Your Frontier API key
            base_url: API base URL (default: production)
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.max_retries = max_retries
        
        self._client = httpx.Client(
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "frontier-python-sdk/1.0.0"
            }
        )
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
    
    def close(self):
        """Close the HTTP client"""
        self._client.close()
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to the API"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        for attempt in range(self.max_retries + 1):
            try:
                if method.upper() == "GET":
                    response = self._client.get(url, params=params)
                elif method.upper() == "POST":
                    response = self._client.post(url, json=data, params=params)
                elif method.upper() == "PUT":
                    response = self._client.put(url, json=data, params=params)
                elif method.upper() == "DELETE":
                    response = self._client.delete(url, params=params)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                # Handle rate limiting
                if response.status_code == 429:
                    if attempt < self.max_retries:
                        retry_after = int(response.headers.get("Retry-After", 60))
                        asyncio.sleep(retry_after)
                        continue
                    raise RateLimitError("Rate limit exceeded", status_code=429)
                
                # Handle authentication errors
                if response.status_code == 401:
                    raise AuthenticationError("Authentication failed", status_code=401)
                
                # Handle validation errors
                if response.status_code == 422:
                    error_data = response.json() if response.content else {}
                    raise ValidationError(
                        error_data.get("error", {}).get("message", "Validation error"),
                        status_code=422
                    )
                
                # Handle other client errors
                if 400 <= response.status_code < 500:
                    error_data = response.json() if response.content else {}
                    raise FrontierAPIError(
                        error_data.get("error", {}).get("message", f"Client error {response.status_code}"),
                        status_code=response.status_code
                    )
                
                # Handle server errors
                if response.status_code >= 500:
                    if attempt < self.max_retries:
                        asyncio.sleep(2 ** attempt)  # Exponential backoff
                        continue
                    raise FrontierAPIError(
                        f"Server error {response.status_code}",
                        status_code=response.status_code
                    )
                
                # Success
                response.raise_for_status()
                return response.json()
                
            except httpx.RequestError as e:
                if attempt < self.max_retries:
                    asyncio.sleep(2 ** attempt)
                    continue
                raise FrontierAPIError(f"Request failed: {str(e)}")
        
        raise FrontierAPIError("Max retries exceeded")
    
    # Health and Status Methods
    def health_check(self) -> Dict[str, Any]:
        """Check API health status"""
        return self._make_request("GET", "/health")
    
    def get_status(self) -> Dict[str, Any]:
        """Get detailed API status"""
        return self._make_request("GET", "/status")
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get API metrics"""
        return self._make_request("GET", "/metrics")
    
    # Financial Analysis Methods
    def financial_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform comprehensive financial analysis.
        
        Args:
            data: Financial data including company info and statements
            
        Returns:
            Analysis results with ratios, scores, and insights
        """
        return self._make_request("POST", "/business/financial-analysis", data=data)
    
    def valuation_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform company valuation analysis (Professional tier required).
        
        Args:
            data: Valuation data including financial and market data
            
        Returns:
            Valuation results with multiple methods
        """
        return self._make_request("POST", "/business/valuation", data=data)
    
    def trend_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze historical trends and generate forecasts.
        
        Args:
            data: Historical data and analysis parameters
            
        Returns:
            Trend analysis and forecasts
        """
        return self._make_request("POST", "/business/trend-analysis", data=data)
    
    def get_industry_benchmarks(
        self,
        industry: str,
        region: str = "global",
        company_size: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get industry benchmark data.
        
        Args:
            industry: Industry sector
            region: Geographic region
            company_size: Company size category
            
        Returns:
            Industry benchmarks and statistics
        """
        params = {"industry": industry, "region": region}
        if company_size:
            params["company_size"] = company_size
        
        return self._make_request("GET", "/business/industry-benchmarks", params=params)
    
    # Strategic Planning Methods
    def strategic_planning(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate comprehensive strategic plan.
        
        Args:
            data: Company profile and strategic planning data
            
        Returns:
            Strategic plan with SWOT, objectives, and action plan
        """
        return self._make_request("POST", "/business/strategic-planning", data=data)
    
    def market_research(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Conduct market research analysis.
        
        Args:
            data: Market research parameters
            
        Returns:
            Market analysis and insights
        """
        return self._make_request("POST", "/business/market-research", data=data)
    
    def competitive_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze competitive landscape (Professional tier required).
        
        Args:
            data: Competitive analysis parameters
            
        Returns:
            Competitive landscape analysis
        """
        return self._make_request("POST", "/business/competitive-analysis", data=data)


class AsyncFrontierClient:
    """
    Async version of the Frontier API client.
    
    Example:
        async with AsyncFrontierClient(api_key="your_api_key") as client:
            result = await client.financial_analysis({...})
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.frontier-business.com/v1",
        timeout: int = 30,
        max_retries: int = 3
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.max_retries = max_retries
        
        self._client = httpx.AsyncClient(
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "frontier-python-sdk/1.0.0"
            }
        )
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    async def close(self):
        """Close the HTTP client"""
        await self._client.aclose()
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make async HTTP request to the API"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        for attempt in range(self.max_retries + 1):
            try:
                if method.upper() == "GET":
                    response = await self._client.get(url, params=params)
                elif method.upper() == "POST":
                    response = await self._client.post(url, json=data, params=params)
                elif method.upper() == "PUT":
                    response = await self._client.put(url, json=data, params=params)
                elif method.upper() == "DELETE":
                    response = await self._client.delete(url, params=params)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                # Handle rate limiting
                if response.status_code == 429:
                    if attempt < self.max_retries:
                        retry_after = int(response.headers.get("Retry-After", 60))
                        await asyncio.sleep(retry_after)
                        continue
                    raise RateLimitError("Rate limit exceeded", status_code=429)
                
                # Handle authentication errors
                if response.status_code == 401:
                    raise AuthenticationError("Authentication failed", status_code=401)
                
                # Handle validation errors
                if response.status_code == 422:
                    error_data = response.json() if response.content else {}
                    raise ValidationError(
                        error_data.get("error", {}).get("message", "Validation error"),
                        status_code=422
                    )
                
                # Handle other client errors
                if 400 <= response.status_code < 500:
                    error_data = response.json() if response.content else {}
                    raise FrontierAPIError(
                        error_data.get("error", {}).get("message", f"Client error {response.status_code}"),
                        status_code=response.status_code
                    )
                
                # Handle server errors
                if response.status_code >= 500:
                    if attempt < self.max_retries:
                        await asyncio.sleep(2 ** attempt)  # Exponential backoff
                        continue
                    raise FrontierAPIError(
                        f"Server error {response.status_code}",
                        status_code=response.status_code
                    )
                
                # Success
                response.raise_for_status()
                return response.json()
                
            except httpx.RequestError as e:
                if attempt < self.max_retries:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise FrontierAPIError(f"Request failed: {str(e)}")
        
        raise FrontierAPIError("Max retries exceeded")
    
    # Async versions of all methods (same signatures as sync client)
    async def health_check(self) -> Dict[str, Any]:
        return await self._make_request("GET", "/health")
    
    async def get_status(self) -> Dict[str, Any]:
        return await self._make_request("GET", "/status")
    
    async def financial_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._make_request("POST", "/business/financial-analysis", data=data)
    
    async def valuation_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._make_request("POST", "/business/valuation", data=data)
    
    async def trend_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._make_request("POST", "/business/trend-analysis", data=data)
    
    async def get_industry_benchmarks(
        self,
        industry: str,
        region: str = "global",
        company_size: Optional[str] = None
    ) -> Dict[str, Any]:
        params = {"industry": industry, "region": region}
        if company_size:
            params["company_size"] = company_size
        
        return await self._make_request("GET", "/business/industry-benchmarks", params=params)
    
    async def strategic_planning(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._make_request("POST", "/business/strategic-planning", data=data)
    
    async def market_research(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._make_request("POST", "/business/market-research", data=data)
    
    async def competitive_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._make_request("POST", "/business/competitive-analysis", data=data)


# Convenience functions
def create_client(api_key: str, **kwargs) -> FrontierClient:
    """Create a new Frontier API client"""
    return FrontierClient(api_key=api_key, **kwargs)


def create_async_client(api_key: str, **kwargs) -> AsyncFrontierClient:
    """Create a new async Frontier API client"""
    return AsyncFrontierClient(api_key=api_key, **kwargs)


# Package metadata
__version__ = "1.0.0"
__author__ = "Frontier Business Operations"
__email__ = "developers@frontier-business.com"
__url__ = "https://github.com/frontier-business/python-sdk"
