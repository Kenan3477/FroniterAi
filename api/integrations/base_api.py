"""Base Government API Integration Class"""

import asyncio
import aiohttp
import time
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging
from urllib.parse import urljoin

@dataclass
class APIResponse:
    """Standardized API response"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    status_code: Optional[int] = None
    response_time: Optional[float] = None
    rate_limit_remaining: Optional[int] = None

@dataclass
class RateLimitConfig:
    """Rate limiting configuration"""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    burst_limit: int = 10
    retry_after: int = 60

class BaseGovernmentAPI(ABC):
    """Base class for all government API integrations"""
    
    def __init__(self, api_key: Optional[str] = None, config: Optional[RateLimitConfig] = None):
        self.api_key = api_key
        self.rate_limit_config = config or RateLimitConfig()
        self.request_history: List[datetime] = []
        self.logger = logging.getLogger(self.__class__.__name__)
        
    async def _make_request(
        self, 
        method: str, 
        url: str, 
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        timeout: int = 30
    ) -> APIResponse:
        """Make HTTP request with rate limiting and error handling"""
        
        # Check rate limits
        if not await self._check_rate_limit():
            return APIResponse(
                success=False,
                error="Rate limit exceeded",
                status_code=429
            )
        
        start_time = time.time()
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params,
                    json=data,
                    timeout=aiohttp.ClientTimeout(total=timeout)
                ) as response:
                    response_time = time.time() - start_time
                    
                    # Record request for rate limiting
                    self.request_history.append(datetime.now())
                    
                    # Parse response
                    try:
                        response_data = await response.json()
                    except:
                        response_data = {"raw_text": await response.text()}
                    
                    # Extract rate limit info from headers
                    rate_limit_remaining = None
                    if 'X-RateLimit-Remaining' in response.headers:
                        rate_limit_remaining = int(response.headers['X-RateLimit-Remaining'])
                    
                    if response.status < 400:
                        return APIResponse(
                            success=True,
                            data=response_data,
                            status_code=response.status,
                            response_time=response_time,
                            rate_limit_remaining=rate_limit_remaining
                        )
                    else:
                        error_msg = f"HTTP {response.status}: {response_data.get('message', 'Unknown error')}"
                        return APIResponse(
                            success=False,
                            error=error_msg,
                            status_code=response.status,
                            response_time=response_time,
                            rate_limit_remaining=rate_limit_remaining
                        )
                        
        except asyncio.TimeoutError:
            return APIResponse(
                success=False,
                error="Request timeout",
                status_code=408,
                response_time=time.time() - start_time
            )
        except Exception as e:
            self.logger.error(f"Request failed: {str(e)}")
            return APIResponse(
                success=False,
                error=f"Request failed: {str(e)}",
                response_time=time.time() - start_time
            )
    
    async def _check_rate_limit(self) -> bool:
        """Check if we're within rate limits"""
        now = datetime.now()
        
        # Clean old requests from history
        minute_ago = now - timedelta(minutes=1)
        hour_ago = now - timedelta(hours=1)
        
        self.request_history = [
            req_time for req_time in self.request_history 
            if req_time > hour_ago
        ]
        
        # Count recent requests
        recent_requests = [
            req_time for req_time in self.request_history 
            if req_time > minute_ago
        ]
        
        # Check limits
        if len(recent_requests) >= self.rate_limit_config.requests_per_minute:
            self.logger.warning("Rate limit exceeded (per minute)")
            return False
        
        if len(self.request_history) >= self.rate_limit_config.requests_per_hour:
            self.logger.warning("Rate limit exceeded (per hour)")
            return False
        
        return True
    
    async def _wait_for_rate_limit(self) -> None:
        """Wait if rate limit is exceeded"""
        if not await self._check_rate_limit():
            self.logger.info(f"Waiting {self.rate_limit_config.retry_after} seconds for rate limit reset")
            await asyncio.sleep(self.rate_limit_config.retry_after)
    
    @abstractmethod
    async def check_name_availability(self, name: str, entity_type: str) -> APIResponse:
        """Check if business name is available"""
        pass
    
    @abstractmethod
    async def submit_formation_documents(self, formation_data: Dict[str, Any]) -> APIResponse:
        """Submit business formation documents"""
        pass
    
    @abstractmethod
    async def get_formation_status(self, filing_id: str) -> APIResponse:
        """Get status of formation filing"""
        pass
    
    def get_base_headers(self) -> Dict[str, str]:
        """Get base headers for API requests"""
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Frontier-Business-Operations/1.0'
        }
        
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
        
        return headers
