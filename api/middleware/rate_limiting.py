"""
Rate Limiting Middleware

Advanced rate limiting system with Redis backend, subscription-based limits,
and comprehensive monitoring and alerting capabilities.
"""

import asyncio
import time
import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse
import logging
import redis.asyncio as redis

from ..config import settings, RateLimitTier, SubscriptionTier, ErrorCodes

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware with Redis backend and subscription-based limits"""
    
    def __init__(self, app):
        super().__init__(app)
        self.redis_client = None
        self.memory_store = {}  # Fallback for when Redis is unavailable
        self.excluded_paths = {
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json"
        }
    
    async def dispatch(self, request: Request, call_next):
        """Process rate limiting for each request"""
        
        # Skip rate limiting for excluded paths
        if request.url.path in self.excluded_paths:
            return await call_next(request)
        
        # Skip rate limiting if disabled
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)
        
        try:
            # Get client identifier
            client_id = self._get_client_id(request)
            
            # Get user subscription tier
            subscription_tier = self._get_subscription_tier(request)
            
            # Check rate limits
            is_allowed, limit_info = await self._check_rate_limit(
                client_id, 
                subscription_tier,
                request.url.path
            )
            
            if not is_allowed:
                return await self._create_rate_limit_response(limit_info)
            
            # Process request
            response = await call_next(request)
            
            # Add rate limit headers
            self._add_rate_limit_headers(response, limit_info)
            
            return response
            
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            # Continue processing if rate limiting fails
            return await call_next(request)
    
    def _get_client_id(self, request: Request) -> str:
        """Get unique client identifier"""
        
        # Try to get user ID from request state (if authenticated)
        if hasattr(request.state, 'user') and request.state.user:
            return f"user:{request.state.user.get('username', 'unknown')}"
        
        # Fallback to IP address
        client_ip = request.client.host if request.client else "unknown"
        
        # Include X-Forwarded-For header if present (for load balancers)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        return f"ip:{client_ip}"
    
    def _get_subscription_tier(self, request: Request) -> str:
        """Get user subscription tier"""
        
        if hasattr(request.state, 'user') and request.state.user:
            return request.state.user.get('subscription_tier', SubscriptionTier.FREE)
        
        return SubscriptionTier.FREE
    
    async def _check_rate_limit(
        self, 
        client_id: str, 
        subscription_tier: str,
        endpoint: str
    ) -> Tuple[bool, Dict[str, Any]]:
        """Check if request is within rate limits"""
        
        # Get rate limits for subscription tier
        limits = self._get_rate_limits(subscription_tier)
        
        # Check different time windows
        current_time = time.time()
        
        # Check minute limit
        minute_key = f"rate_limit:{client_id}:minute:{int(current_time // 60)}"
        minute_count = await self._get_count(minute_key)
        
        # Check hour limit  
        hour_key = f"rate_limit:{client_id}:hour:{int(current_time // 3600)}"
        hour_count = await self._get_count(hour_key)
        
        # Check daily limit
        day_key = f"rate_limit:{client_id}:day:{int(current_time // 86400)}"
        day_count = await self._get_count(day_key)
        
        # Prepare limit info
        limit_info = {
            "requests_per_minute": {
                "limit": limits["requests_per_minute"],
                "remaining": max(0, limits["requests_per_minute"] - minute_count),
                "used": minute_count,
                "reset_time": (int(current_time // 60) + 1) * 60
            },
            "requests_per_hour": {
                "limit": limits["requests_per_hour"], 
                "remaining": max(0, limits["requests_per_hour"] - hour_count),
                "used": hour_count,
                "reset_time": (int(current_time // 3600) + 1) * 3600
            },
            "subscription_tier": subscription_tier,
            "client_id": client_id
        }
        
        # Check if any limit is exceeded
        if minute_count >= limits["requests_per_minute"]:
            limit_info["exceeded"] = "minute"
            return False, limit_info
        
        if hour_count >= limits["requests_per_hour"]:
            limit_info["exceeded"] = "hour"
            return False, limit_info
        
        # Increment counters
        await self._increment_count(minute_key, 60)
        await self._increment_count(hour_key, 3600)
        await self._increment_count(day_key, 86400)
        
        return True, limit_info
    
    def _get_rate_limits(self, subscription_tier: str) -> Dict[str, int]:
        """Get rate limits for subscription tier"""
        
        if subscription_tier == SubscriptionTier.ENTERPRISE:
            return RateLimitTier.ENTERPRISE
        elif subscription_tier == SubscriptionTier.PROFESSIONAL:
            return RateLimitTier.PROFESSIONAL
        else:
            return RateLimitTier.FREE
    
    async def _get_count(self, key: str) -> int:
        """Get current count for a key"""
        
        try:
            if self.redis_client:
                count = await self.redis_client.get(key)
                return int(count) if count else 0
            else:
                # Fallback to memory store
                return self.memory_store.get(key, 0)
        except Exception as e:
            logger.error(f"Error getting count for {key}: {e}")
            return 0
    
    async def _increment_count(self, key: str, ttl: int) -> int:
        """Increment count for a key with TTL"""
        
        try:
            if self.redis_client:
                # Use Redis pipeline for atomic operations
                async with self.redis_client.pipeline() as pipe:
                    await pipe.incr(key)
                    await pipe.expire(key, ttl)
                    result = await pipe.execute()
                    return result[0]
            else:
                # Fallback to memory store
                self.memory_store[key] = self.memory_store.get(key, 0) + 1
                # Simple TTL simulation (not perfect but works for fallback)
                asyncio.create_task(self._expire_key(key, ttl))
                return self.memory_store[key]
        except Exception as e:
            logger.error(f"Error incrementing count for {key}: {e}")
            return 0
    
    async def _expire_key(self, key: str, ttl: int):
        """Expire key after TTL seconds (memory store fallback)"""
        await asyncio.sleep(ttl)
        self.memory_store.pop(key, None)
    
    async def _create_rate_limit_response(self, limit_info: Dict[str, Any]) -> Response:
        """Create rate limit exceeded response"""
        
        exceeded_window = limit_info.get("exceeded", "unknown")
        
        if exceeded_window == "minute":
            reset_time = limit_info["requests_per_minute"]["reset_time"]
            message = f"Rate limit exceeded. Try again in {reset_time - time.time():.0f} seconds."
        elif exceeded_window == "hour":
            reset_time = limit_info["requests_per_hour"]["reset_time"]
            remaining_minutes = (reset_time - time.time()) / 60
            message = f"Hourly rate limit exceeded. Try again in {remaining_minutes:.0f} minutes."
        else:
            message = "Rate limit exceeded. Please try again later."
        
        response_data = {
            "error": ErrorCodes.RATE_LIMIT_EXCEEDED,
            "message": message,
            "status_code": 429,
            "timestamp": datetime.now().isoformat(),
            "rate_limit_info": {
                "subscription_tier": limit_info["subscription_tier"],
                "limits": {
                    "requests_per_minute": limit_info["requests_per_minute"]["limit"],
                    "requests_per_hour": limit_info["requests_per_hour"]["limit"]
                },
                "current_usage": {
                    "requests_per_minute": limit_info["requests_per_minute"]["used"],
                    "requests_per_hour": limit_info["requests_per_hour"]["used"]
                },
                "reset_times": {
                    "minute_reset": limit_info["requests_per_minute"]["reset_time"],
                    "hour_reset": limit_info["requests_per_hour"]["reset_time"]
                }
            }
        }
        
        headers = {
            "X-RateLimit-Limit-Minute": str(limit_info["requests_per_minute"]["limit"]),
            "X-RateLimit-Limit-Hour": str(limit_info["requests_per_hour"]["limit"]),
            "X-RateLimit-Remaining-Minute": str(limit_info["requests_per_minute"]["remaining"]),
            "X-RateLimit-Remaining-Hour": str(limit_info["requests_per_hour"]["remaining"]),
            "X-RateLimit-Reset-Minute": str(limit_info["requests_per_minute"]["reset_time"]),
            "X-RateLimit-Reset-Hour": str(limit_info["requests_per_hour"]["reset_time"]),
            "Retry-After": str(int(reset_time - time.time()))
        }
        
        return JSONResponse(
            status_code=429,
            content=response_data,
            headers=headers
        )
    
    def _add_rate_limit_headers(self, response: Response, limit_info: Dict[str, Any]):
        """Add rate limit headers to response"""
        
        response.headers["X-RateLimit-Limit-Minute"] = str(limit_info["requests_per_minute"]["limit"])
        response.headers["X-RateLimit-Limit-Hour"] = str(limit_info["requests_per_hour"]["limit"])
        response.headers["X-RateLimit-Remaining-Minute"] = str(limit_info["requests_per_minute"]["remaining"])
        response.headers["X-RateLimit-Remaining-Hour"] = str(limit_info["requests_per_hour"]["remaining"])
        response.headers["X-RateLimit-Reset-Minute"] = str(limit_info["requests_per_minute"]["reset_time"])
        response.headers["X-RateLimit-Reset-Hour"] = str(limit_info["requests_per_hour"]["reset_time"])


class AdvancedRateLimiter:
    """Advanced rate limiter with adaptive limits and burst protection"""
    
    def __init__(self, redis_client=None):
        self.redis_client = redis_client
        self.burst_protection = {}
        
    async def check_burst_protection(self, client_id: str, max_burst: int = 10, window: int = 1) -> bool:
        """Check for burst protection (too many requests in short time)"""
        
        current_time = time.time()
        burst_key = f"burst:{client_id}:{int(current_time)}"
        
        try:
            if self.redis_client:
                count = await self.redis_client.incr(burst_key)
                await self.redis_client.expire(burst_key, window)
                return count <= max_burst
            else:
                # Memory fallback
                if burst_key not in self.burst_protection:
                    self.burst_protection[burst_key] = 0
                
                self.burst_protection[burst_key] += 1
                
                # Clean old entries
                for key in list(self.burst_protection.keys()):
                    if int(key.split(":")[-1]) < current_time - window:
                        del self.burst_protection[key]
                
                return self.burst_protection[burst_key] <= max_burst
                
        except Exception as e:
            logger.error(f"Burst protection error: {e}")
            return True  # Allow request if check fails
    
    async def adaptive_rate_limit(
        self, 
        client_id: str, 
        base_limit: int, 
        error_rate: float = 0.0
    ) -> int:
        """Calculate adaptive rate limit based on error rate"""
        
        # Reduce limit if error rate is high
        if error_rate > 0.5:  # More than 50% errors
            adapted_limit = int(base_limit * 0.5)  # Reduce by 50%
        elif error_rate > 0.2:  # More than 20% errors
            adapted_limit = int(base_limit * 0.75)  # Reduce by 25%
        else:
            adapted_limit = base_limit
        
        return max(1, adapted_limit)  # Ensure at least 1 request allowed


class RateLimitMonitor:
    """Monitor and alert on rate limiting metrics"""
    
    def __init__(self):
        self.metrics = {
            "total_requests": 0,
            "rate_limited_requests": 0,
            "top_rate_limited_clients": {},
            "rate_limit_by_tier": {}
        }
    
    def record_request(self, client_id: str, subscription_tier: str, was_rate_limited: bool):
        """Record request metrics"""
        
        self.metrics["total_requests"] += 1
        
        if was_rate_limited:
            self.metrics["rate_limited_requests"] += 1
            
            # Track top rate limited clients
            if client_id not in self.metrics["top_rate_limited_clients"]:
                self.metrics["top_rate_limited_clients"][client_id] = 0
            self.metrics["top_rate_limited_clients"][client_id] += 1
            
            # Track by subscription tier
            if subscription_tier not in self.metrics["rate_limit_by_tier"]:
                self.metrics["rate_limit_by_tier"][subscription_tier] = 0
            self.metrics["rate_limit_by_tier"][subscription_tier] += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics"""
        
        total = self.metrics["total_requests"]
        rate_limited = self.metrics["rate_limited_requests"]
        
        return {
            "total_requests": total,
            "rate_limited_requests": rate_limited,
            "rate_limit_percentage": (rate_limited / total * 100) if total > 0 else 0,
            "top_rate_limited_clients": sorted(
                self.metrics["top_rate_limited_clients"].items(),
                key=lambda x: x[1],
                reverse=True
            )[:10],
            "rate_limit_by_tier": self.metrics["rate_limit_by_tier"]
        }
    
    def reset_metrics(self):
        """Reset metrics (called periodically)"""
        self.metrics = {
            "total_requests": 0,
            "rate_limited_requests": 0,
            "top_rate_limited_clients": {},
            "rate_limit_by_tier": {}
        }


# Global instances
rate_limit_monitor = RateLimitMonitor()
advanced_limiter = AdvancedRateLimiter()
