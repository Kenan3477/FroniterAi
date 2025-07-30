"""
Rate Limiting System

Advanced rate limiting based on subscription tiers, user authentication,
and API key usage with Redis backend for distributed rate limiting.
"""

import time
import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
from enum import Enum
from dataclasses import dataclass
import redis
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from api.config import settings
from api.database.models.user_models import User


class RateLimitType(Enum):
    """Rate limit types"""
    PER_MINUTE = "per_minute"
    PER_HOUR = "per_hour"
    PER_DAY = "per_day"
    PER_MONTH = "per_month"


@dataclass
class RateLimitRule:
    """Rate limit rule configuration"""
    limit: int
    window: int  # in seconds
    identifier: str
    rule_type: RateLimitType


@dataclass
class RateLimitResult:
    """Rate limit check result"""
    allowed: bool
    limit: int
    remaining: int
    reset_time: int
    retry_after: Optional[int] = None


class RateLimiter:
    """Redis-based rate limiter"""
    
    def __init__(self):
        try:
            self.redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD,
                db=2,  # Use db 2 for rate limiting
                decode_responses=True
            )
        except Exception:
            self.redis_client = None
        
        # Rate limit configurations by subscription tier
        self.tier_limits = {
            "basic": {
                RateLimitType.PER_MINUTE: 10,
                RateLimitType.PER_HOUR: 100,
                RateLimitType.PER_DAY: 1000,
                RateLimitType.PER_MONTH: 25000
            },
            "professional": {
                RateLimitType.PER_MINUTE: 50,
                RateLimitType.PER_HOUR: 1000,
                RateLimitType.PER_DAY: 10000,
                RateLimitType.PER_MONTH: 250000
            },
            "enterprise": {
                RateLimitType.PER_MINUTE: 200,
                RateLimitType.PER_HOUR: 5000,
                RateLimitType.PER_DAY: 50000,
                RateLimitType.PER_MONTH: 1000000
            }
        }
        
        # Window sizes in seconds
        self.window_sizes = {
            RateLimitType.PER_MINUTE: 60,
            RateLimitType.PER_HOUR: 3600,
            RateLimitType.PER_DAY: 86400,
            RateLimitType.PER_MONTH: 2592000  # 30 days
        }
    
    def check_rate_limit(self, identifier: str, limit: int, window: int,
                        rule_type: RateLimitType) -> RateLimitResult:
        """Check if request is within rate limit"""
        if not self.redis_client:
            # Fallback - allow all requests if Redis is unavailable
            return RateLimitResult(
                allowed=True,
                limit=limit,
                remaining=limit - 1,
                reset_time=int(time.time() + window)
            )
        
        current_time = int(time.time())
        window_start = current_time - window
        key = f"rate_limit:{rule_type.value}:{identifier}"
        
        try:
            # Use sliding window approach with sorted sets
            pipe = self.redis_client.pipeline()
            
            # Remove expired entries
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count current requests in window
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(current_time): current_time})
            
            # Set expiration
            pipe.expire(key, window)
            
            results = pipe.execute()
            current_count = results[1]
            
            # Check if limit exceeded
            if current_count >= limit:
                # Remove the request we just added since it's rejected
                self.redis_client.zrem(key, str(current_time))
                
                # Calculate reset time
                oldest_request = self.redis_client.zrange(key, 0, 0, withscores=True)
                if oldest_request:
                    reset_time = int(oldest_request[0][1]) + window
                else:
                    reset_time = current_time + window
                
                return RateLimitResult(
                    allowed=False,
                    limit=limit,
                    remaining=0,
                    reset_time=reset_time,
                    retry_after=reset_time - current_time
                )
            
            # Calculate remaining requests
            remaining = limit - current_count - 1
            reset_time = current_time + window
            
            return RateLimitResult(
                allowed=True,
                limit=limit,
                remaining=remaining,
                reset_time=reset_time
            )
            
        except Exception as e:
            # Log error and allow request on Redis failure
            print(f"Rate limit check failed: {e}")
            return RateLimitResult(
                allowed=True,
                limit=limit,
                remaining=limit - 1,
                reset_time=current_time + window
            )
    
    def check_user_rate_limits(self, user: User, endpoint: str = None) -> Dict[str, RateLimitResult]:
        """Check all rate limits for a user"""
        subscription_tier = getattr(user, 'subscription_tier', 'basic')
        tier_limits = self.tier_limits.get(subscription_tier, self.tier_limits['basic'])
        
        results = {}
        user_identifier = f"user:{user.id}"
        
        # Add endpoint-specific identifier if provided
        if endpoint:
            user_identifier = f"{user_identifier}:{endpoint}"
        
        for limit_type, limit_value in tier_limits.items():
            window_size = self.window_sizes[limit_type]
            
            result = self.check_rate_limit(
                identifier=user_identifier,
                limit=limit_value,
                window=window_size,
                rule_type=limit_type
            )
            
            results[limit_type.value] = result
        
        return results
    
    def check_ip_rate_limit(self, ip_address: str, limit: int = 1000, 
                           window: int = 3600) -> RateLimitResult:
        """Check rate limit for IP address"""
        return self.check_rate_limit(
            identifier=f"ip:{ip_address}",
            limit=limit,
            window=window,
            rule_type=RateLimitType.PER_HOUR
        )
    
    def check_api_key_rate_limit(self, api_key_hash: str, 
                                subscription_tier: str) -> Dict[str, RateLimitResult]:
        """Check rate limits for API key"""
        tier_limits = self.tier_limits.get(subscription_tier, self.tier_limits['basic'])
        
        results = {}
        key_identifier = f"api_key:{api_key_hash}"
        
        for limit_type, limit_value in tier_limits.items():
            window_size = self.window_sizes[limit_type]
            
            result = self.check_rate_limit(
                identifier=key_identifier,
                limit=limit_value,
                window=window_size,
                rule_type=limit_type
            )
            
            results[limit_type.value] = result
        
        return results
    
    def get_rate_limit_info(self, identifier: str, rule_type: RateLimitType) -> Dict[str, Any]:
        """Get current rate limit status for an identifier"""
        if not self.redis_client:
            return {"error": "Rate limiting unavailable"}
        
        key = f"rate_limit:{rule_type.value}:{identifier}"
        window_size = self.window_sizes[rule_type]
        current_time = int(time.time())
        window_start = current_time - window_size
        
        try:
            # Count requests in current window
            current_count = self.redis_client.zcount(key, window_start, current_time)
            
            # Get oldest request in window
            oldest_requests = self.redis_client.zrange(key, 0, 0, withscores=True)
            if oldest_requests:
                oldest_time = int(oldest_requests[0][1])
                reset_time = oldest_time + window_size
            else:
                reset_time = current_time + window_size
            
            return {
                "current_count": current_count,
                "window_start": window_start,
                "window_end": current_time,
                "reset_time": reset_time,
                "window_size": window_size
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def reset_rate_limit(self, identifier: str, rule_type: RateLimitType) -> bool:
        """Reset rate limit for an identifier (admin function)"""
        if not self.redis_client:
            return False
        
        key = f"rate_limit:{rule_type.value}:{identifier}"
        
        try:
            self.redis_client.delete(key)
            return True
        except Exception:
            return False
    
    def get_usage_statistics(self, identifier: str) -> Dict[str, Any]:
        """Get usage statistics for an identifier"""
        if not self.redis_client:
            return {}
        
        stats = {}
        current_time = int(time.time())
        
        for limit_type in RateLimitType:
            key = f"rate_limit:{limit_type.value}:{identifier}"
            window_size = self.window_sizes[limit_type]
            window_start = current_time - window_size
            
            try:
                # Get all requests in current window
                requests = self.redis_client.zrangebyscore(key, window_start, current_time)
                count = len(requests)
                
                # Calculate requests per time unit
                if limit_type == RateLimitType.PER_MINUTE:
                    rate = count / (window_size / 60)
                elif limit_type == RateLimitType.PER_HOUR:
                    rate = count / (window_size / 3600)
                elif limit_type == RateLimitType.PER_DAY:
                    rate = count / (window_size / 86400)
                else:  # PER_MONTH
                    rate = count / (window_size / 2592000)
                
                stats[limit_type.value] = {
                    "count": count,
                    "rate": round(rate, 2),
                    "window_size": window_size
                }
                
            except Exception:
                stats[limit_type.value] = {"error": "Unable to retrieve stats"}
        
        return stats


class RateLimitMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for rate limiting"""
    
    def __init__(self, app, rate_limiter: RateLimiter = None):
        super().__init__(app)
        self.rate_limiter = rate_limiter or RateLimiter()
        
        # Endpoints that are exempt from rate limiting
        self.exempt_paths = {
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json"
        }
        
        # Custom rate limits for specific endpoints
        self.endpoint_limits = {
            "/api/v1/auth/login": {"limit": 5, "window": 300},  # 5 attempts per 5 minutes
            "/api/v1/auth/register": {"limit": 3, "window": 3600},  # 3 attempts per hour
            "/api/v1/auth/reset-password": {"limit": 3, "window": 3600}
        }
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for exempt paths
        if request.url.path in self.exempt_paths:
            return await call_next(request)
        
        # Get client IP
        client_ip = self._get_client_ip(request)
        
        # Check IP-based rate limit first (anti-abuse)
        ip_result = self.rate_limiter.check_ip_rate_limit(client_ip)
        if not ip_result.allowed:
            return self._create_rate_limit_response(ip_result, "IP rate limit exceeded")
        
        # Get user from request (this would be set by auth middleware)
        current_user = getattr(request.state, 'user', None)
        
        if current_user:
            # Check user-specific rate limits
            endpoint = request.url.path
            user_results = self.rate_limiter.check_user_rate_limits(current_user, endpoint)
            
            # Check if any rate limit is exceeded
            for limit_type, result in user_results.items():
                if not result.allowed:
                    return self._create_rate_limit_response(
                        result, 
                        f"User rate limit exceeded: {limit_type}"
                    )
        
        # Check API key rate limits if present
        api_key = request.headers.get("X-API-Key")
        if api_key:
            # This would validate the API key and get user info
            # For now, assume we have a way to get subscription tier
            api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()
            api_results = self.rate_limiter.check_api_key_rate_limit(
                api_key_hash, 
                "professional"  # This would come from API key validation
            )
            
            for limit_type, result in api_results.items():
                if not result.allowed:
                    return self._create_rate_limit_response(
                        result,
                        f"API key rate limit exceeded: {limit_type}"
                    )
        
        # Check endpoint-specific rate limits
        if request.url.path in self.endpoint_limits:
            endpoint_config = self.endpoint_limits[request.url.path]
            identifier = f"endpoint:{request.url.path}:{client_ip}"
            
            result = self.rate_limiter.check_rate_limit(
                identifier=identifier,
                limit=endpoint_config["limit"],
                window=endpoint_config["window"],
                rule_type=RateLimitType.PER_HOUR
            )
            
            if not result.allowed:
                return self._create_rate_limit_response(
                    result,
                    f"Endpoint rate limit exceeded: {request.url.path}"
                )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        if current_user:
            user_results = self.rate_limiter.check_user_rate_limits(current_user)
            minute_result = user_results.get(RateLimitType.PER_MINUTE.value)
            
            if minute_result:
                response.headers["X-RateLimit-Limit-Minute"] = str(minute_result.limit)
                response.headers["X-RateLimit-Remaining-Minute"] = str(minute_result.remaining)
                response.headers["X-RateLimit-Reset-Minute"] = str(minute_result.reset_time)
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address from request"""
        # Check for forwarded headers
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection
        if hasattr(request.client, 'host'):
            return request.client.host
        
        return "unknown"
    
    def _create_rate_limit_response(self, result: RateLimitResult, message: str) -> Response:
        """Create rate limit exceeded response"""
        headers = {
            "X-RateLimit-Limit": str(result.limit),
            "X-RateLimit-Remaining": str(result.remaining),
            "X-RateLimit-Reset": str(result.reset_time),
            "Content-Type": "application/json"
        }
        
        if result.retry_after:
            headers["Retry-After"] = str(result.retry_after)
        
        body = json.dumps({
            "error": "Rate limit exceeded",
            "message": message,
            "limit": result.limit,
            "remaining": result.remaining,
            "reset_time": result.reset_time,
            "retry_after": result.retry_after
        })
        
        return Response(
            content=body,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            headers=headers
        )


# Rate limiting decorators
def rate_limit(limit: int, window: int, per: str = "minute"):
    """Decorator for function-level rate limiting"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # This would be implemented for specific use cases
            # For FastAPI, you'd typically use dependency injection instead
            return func(*args, **kwargs)
        return wrapper
    return decorator


# Global rate limiter instance
rate_limiter = RateLimiter()
