"""
Rate Limiting Service for Frontier API
Redis-based distributed rate limiting with multiple algorithms and tiers
"""

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
import redis
import asyncio
import time
import json
import logging
import os
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://:frontier-redis@localhost:6379")

# Rate limit configurations
RATE_LIMITS = {
    "free": {
        "requests_per_hour": 100,
        "requests_per_minute": 5,
        "burst_limit": 10
    },
    "developer": {
        "requests_per_hour": 1000,
        "requests_per_minute": 50,
        "burst_limit": 100
    },
    "professional": {
        "requests_per_hour": 10000,
        "requests_per_minute": 500,
        "burst_limit": 1000
    },
    "enterprise": {
        "requests_per_hour": float("inf"),
        "requests_per_minute": float("inf"),
        "burst_limit": float("inf")
    }
}

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Redis connection
redis_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global redis_client
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    logger.info("Rate limiter Redis connection established")
    
    yield
    
    # Shutdown
    redis_client.close()
    logger.info("Rate limiter Redis connection closed")

app = FastAPI(
    title="Frontier Rate Limiter",
    description="Distributed rate limiting service with multiple algorithms",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class RateLimitRequest(BaseModel):
    user_id: str
    endpoint: str
    tier: str = Field(default="free", regex="^(free|developer|professional|enterprise)$")
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class RateLimitResponse(BaseModel):
    allowed: bool
    remaining: int
    reset_time: int
    retry_after: Optional[int] = None
    tier: str

class RateLimitStatus(BaseModel):
    user_id: str
    tier: str
    limits: Dict[str, Any]
    current_usage: Dict[str, Any]
    reset_times: Dict[str, Any]

class QuotaRequest(BaseModel):
    user_id: str
    resource: str
    amount: int = 1

class QuotaResponse(BaseModel):
    allowed: bool
    remaining: int
    total: int
    reset_date: str

# Rate Limiting Algorithms
class TokenBucket:
    """Token bucket rate limiting algorithm"""
    
    def __init__(self, capacity: int, refill_rate: int, refill_period: int = 3600):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.refill_period = refill_period
    
    async def check_limit(self, key: str, tokens_requested: int = 1) -> Dict[str, Any]:
        """Check if request is within rate limit"""
        current_time = int(time.time())
        
        # Get current bucket state
        bucket_data = redis_client.hgetall(f"bucket:{key}")
        
        if not bucket_data:
            # Initialize bucket
            bucket_data = {
                "tokens": self.capacity,
                "last_refill": current_time
            }
        else:
            bucket_data["tokens"] = int(bucket_data["tokens"])
            bucket_data["last_refill"] = int(bucket_data["last_refill"])
        
        # Calculate tokens to add based on time elapsed
        time_elapsed = current_time - bucket_data["last_refill"]
        tokens_to_add = int((time_elapsed / self.refill_period) * self.refill_rate)
        
        # Refill bucket
        bucket_data["tokens"] = min(
            self.capacity,
            bucket_data["tokens"] + tokens_to_add
        )
        bucket_data["last_refill"] = current_time
        
        # Check if request can be fulfilled
        if bucket_data["tokens"] >= tokens_requested:
            bucket_data["tokens"] -= tokens_requested
            allowed = True
        else:
            allowed = False
        
        # Update bucket state
        redis_client.hmset(f"bucket:{key}", bucket_data)
        redis_client.expire(f"bucket:{key}", self.refill_period)
        
        # Calculate retry after
        retry_after = None
        if not allowed:
            tokens_needed = tokens_requested - bucket_data["tokens"]
            retry_after = int((tokens_needed / self.refill_rate) * self.refill_period)
        
        return {
            "allowed": allowed,
            "remaining": bucket_data["tokens"],
            "retry_after": retry_after,
            "reset_time": current_time + self.refill_period
        }

class SlidingWindow:
    """Sliding window rate limiting algorithm"""
    
    def __init__(self, window_size: int, max_requests: int):
        self.window_size = window_size
        self.max_requests = max_requests
    
    async def check_limit(self, key: str, requests: int = 1) -> Dict[str, Any]:
        """Check if request is within rate limit"""
        current_time = int(time.time())
        window_start = current_time - self.window_size
        
        # Remove old entries
        redis_client.zremrangebyscore(f"window:{key}", 0, window_start)
        
        # Count current requests in window
        current_requests = redis_client.zcard(f"window:{key}")
        
        # Check if new request would exceed limit
        if current_requests + requests <= self.max_requests:
            # Add new request timestamps
            for _ in range(requests):
                redis_client.zadd(f"window:{key}", {str(uuid.uuid4()): current_time})
            
            redis_client.expire(f"window:{key}", self.window_size)
            allowed = True
            remaining = self.max_requests - (current_requests + requests)
        else:
            allowed = False
            remaining = self.max_requests - current_requests
        
        return {
            "allowed": allowed,
            "remaining": max(0, remaining),
            "reset_time": current_time + self.window_size
        }

class FixedWindow:
    """Fixed window rate limiting algorithm"""
    
    def __init__(self, window_size: int, max_requests: int):
        self.window_size = window_size
        self.max_requests = max_requests
    
    async def check_limit(self, key: str, requests: int = 1) -> Dict[str, Any]:
        """Check if request is within rate limit"""
        current_time = int(time.time())
        window = current_time // self.window_size
        window_key = f"fixed:{key}:{window}"
        
        # Get current count for this window
        current_count = redis_client.get(window_key) or 0
        current_count = int(current_count)
        
        # Check if new request would exceed limit
        if current_count + requests <= self.max_requests:
            # Increment counter
            redis_client.incrby(window_key, requests)
            redis_client.expire(window_key, self.window_size)
            
            allowed = True
            remaining = self.max_requests - (current_count + requests)
        else:
            allowed = False
            remaining = self.max_requests - current_count
        
        reset_time = (window + 1) * self.window_size
        
        return {
            "allowed": allowed,
            "remaining": max(0, remaining),
            "reset_time": reset_time
        }

# Rate limiting instances
rate_limiters = {
    "token_bucket": TokenBucket(capacity=100, refill_rate=100, refill_period=3600),
    "sliding_window": SlidingWindow(window_size=3600, max_requests=100),
    "fixed_window": FixedWindow(window_size=3600, max_requests=100)
}

# Rate Limiting Endpoints
@app.post("/check", response_model=RateLimitResponse)
async def check_rate_limit(request: RateLimitRequest):
    """Check if request is within rate limits"""
    try:
        # Get rate limits for user tier
        limits = RATE_LIMITS.get(request.tier, RATE_LIMITS["free"])
        
        # Check hourly limit
        hourly_key = f"rate_limit:hourly:{request.user_id}:{request.endpoint}"
        hourly_limiter = FixedWindow(3600, limits["requests_per_hour"])
        hourly_result = await hourly_limiter.check_limit(hourly_key)
        
        if not hourly_result["allowed"]:
            return RateLimitResponse(
                allowed=False,
                remaining=hourly_result["remaining"],
                reset_time=hourly_result["reset_time"],
                retry_after=hourly_result["reset_time"] - int(time.time()),
                tier=request.tier
            )
        
        # Check minute limit
        minute_key = f"rate_limit:minute:{request.user_id}:{request.endpoint}"
        minute_limiter = FixedWindow(60, limits["requests_per_minute"])
        minute_result = await minute_limiter.check_limit(minute_key)
        
        if not minute_result["allowed"]:
            return RateLimitResponse(
                allowed=False,
                remaining=minute_result["remaining"],
                reset_time=minute_result["reset_time"],
                retry_after=minute_result["reset_time"] - int(time.time()),
                tier=request.tier
            )
        
        # Check burst limit (token bucket)
        burst_key = f"rate_limit:burst:{request.user_id}:{request.endpoint}"
        burst_limiter = TokenBucket(
            capacity=limits["burst_limit"],
            refill_rate=limits["requests_per_minute"],
            refill_period=60
        )
        burst_result = await burst_limiter.check_limit(burst_key)
        
        if not burst_result["allowed"]:
            return RateLimitResponse(
                allowed=False,
                remaining=burst_result["remaining"],
                reset_time=burst_result["reset_time"],
                retry_after=burst_result.get("retry_after"),
                tier=request.tier
            )
        
        # All checks passed
        return RateLimitResponse(
            allowed=True,
            remaining=min(
                hourly_result["remaining"],
                minute_result["remaining"],
                burst_result["remaining"]
            ),
            reset_time=min(
                hourly_result["reset_time"],
                minute_result["reset_time"],
                burst_result["reset_time"]
            ),
            tier=request.tier
        )
        
    except Exception as e:
        logger.error(f"Rate limit check failed: {e}")
        # Fail open - allow request if rate limiting fails
        return RateLimitResponse(
            allowed=True,
            remaining=100,
            reset_time=int(time.time()) + 3600,
            tier=request.tier
        )

@app.get("/status/{user_id}", response_model=RateLimitStatus)
async def get_rate_limit_status(user_id: str, tier: str = "free"):
    """Get current rate limit status for a user"""
    limits = RATE_LIMITS.get(tier, RATE_LIMITS["free"])
    current_time = int(time.time())
    
    # Get current usage
    hourly_key = f"rate_limit:hourly:{user_id}:*"
    minute_key = f"rate_limit:minute:{user_id}:*"
    
    # This is simplified - in practice you'd need to check all endpoints
    current_usage = {
        "hourly": 0,  # Would aggregate across all endpoints
        "minute": 0,  # Would aggregate across all endpoints
        "burst": 0
    }
    
    reset_times = {
        "hourly": current_time + (3600 - (current_time % 3600)),
        "minute": current_time + (60 - (current_time % 60)),
        "burst": current_time + 60
    }
    
    return RateLimitStatus(
        user_id=user_id,
        tier=tier,
        limits=limits,
        current_usage=current_usage,
        reset_times=reset_times
    )

# Quota Management
@app.post("/quota/check", response_model=QuotaResponse)
async def check_quota(request: QuotaRequest):
    """Check and consume quota for a resource"""
    quota_key = f"quota:{request.user_id}:{request.resource}"
    
    # Get current quota usage
    current_usage = redis_client.get(quota_key) or 0
    current_usage = int(current_usage)
    
    # Get quota limits (this would typically come from database)
    quota_limits = {
        "api_calls": 10000,
        "storage_gb": 100,
        "compute_hours": 50
    }
    
    total_quota = quota_limits.get(request.resource, 1000)
    
    # Check if quota allows the request
    if current_usage + request.amount <= total_quota:
        # Consume quota
        redis_client.incrby(quota_key, request.amount)
        
        # Set expiration for monthly reset
        if not redis_client.ttl(quota_key) > 0:
            redis_client.expire(quota_key, 30 * 24 * 3600)  # 30 days
        
        allowed = True
        remaining = total_quota - (current_usage + request.amount)
    else:
        allowed = False
        remaining = total_quota - current_usage
    
    # Calculate reset date
    ttl = redis_client.ttl(quota_key)
    reset_date = (datetime.utcnow() + timedelta(seconds=ttl)).isoformat()
    
    return QuotaResponse(
        allowed=allowed,
        remaining=max(0, remaining),
        total=total_quota,
        reset_date=reset_date
    )

@app.post("/quota/reset")
async def reset_quota(user_id: str, resource: str = None):
    """Reset quota for a user (admin endpoint)"""
    if resource:
        quota_key = f"quota:{user_id}:{resource}"
        redis_client.delete(quota_key)
    else:
        # Reset all quotas for user
        keys = redis_client.keys(f"quota:{user_id}:*")
        if keys:
            redis_client.delete(*keys)
    
    return {"message": "Quota reset successfully"}

# Analytics and Monitoring
@app.get("/analytics/usage")
async def get_usage_analytics(
    user_id: Optional[str] = None,
    start_time: Optional[int] = None,
    end_time: Optional[int] = None
):
    """Get rate limiting usage analytics"""
    # This would typically aggregate data from Redis or a time-series database
    # For now, return mock data
    
    current_time = int(time.time())
    start_time = start_time or (current_time - 86400)  # Last 24 hours
    end_time = end_time or current_time
    
    analytics = {
        "time_range": {
            "start": start_time,
            "end": end_time
        },
        "total_requests": 12500,
        "blocked_requests": 145,
        "top_endpoints": [
            {"endpoint": "/api/v1/visual-design/brand-identity", "requests": 3200},
            {"endpoint": "/api/v1/image-generation/assets", "requests": 2800},
            {"endpoint": "/api/v1/code-quality/scan", "requests": 2100}
        ],
        "tier_distribution": {
            "free": 8500,
            "developer": 3200,
            "professional": 700,
            "enterprise": 100
        }
    }
    
    return analytics

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    # Check Redis connection
    try:
        redis_client.ping()
        redis_status = "healthy"
    except:
        redis_status = "unhealthy"
    
    return {
        "status": "healthy" if redis_status == "healthy" else "unhealthy",
        "service": "rate-limiter",
        "redis": redis_status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3002,
        reload=True
    )
