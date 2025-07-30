"""
Response Caching System for Production Performance

Implements multi-layer caching with Redis, in-memory cache, and CDN integration
for expensive computations and frequently accessed data.
"""

import json
import hashlib
import pickle
import asyncio
from typing import Any, Dict, Optional, Union, Callable, List
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import redis.asyncio as redis
import aiofiles
from pathlib import Path

from api.config import settings
from api.utils.logger import get_logger

logger = get_logger(__name__)


class CacheLevel(Enum):
    """Cache level priorities"""
    MEMORY = "memory"
    REDIS = "redis"
    DISK = "disk"
    CDN = "cdn"


@dataclass
class CacheConfig:
    """Cache configuration for different data types"""
    ttl_seconds: int
    max_size: int
    compression: bool = False
    levels: List[CacheLevel] = None
    invalidation_tags: List[str] = None


class CacheKey:
    """Smart cache key generation"""
    
    @staticmethod
    def generate(prefix: str, **kwargs) -> str:
        """Generate deterministic cache key"""
        # Sort kwargs for consistent key generation
        sorted_params = sorted(kwargs.items())
        param_string = json.dumps(sorted_params, sort_keys=True)
        hash_suffix = hashlib.md5(param_string.encode()).hexdigest()[:16]
        return f"{prefix}:{hash_suffix}"
    
    @staticmethod
    def generate_batch(prefix: str, items: List[Dict[str, Any]]) -> List[str]:
        """Generate cache keys for batch operations"""
        return [CacheKey.generate(prefix, **item) for item in items]


class MemoryCache:
    """In-memory LRU cache with TTL"""
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.access_order: List[str] = []
        self._lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from memory cache"""
        async with self._lock:
            if key not in self.cache:
                return None
            
            entry = self.cache[key]
            
            # Check TTL
            if datetime.now() > entry["expires_at"]:
                await self._remove(key)
                return None
            
            # Update access order (LRU)
            if key in self.access_order:
                self.access_order.remove(key)
            self.access_order.append(key)
            
            return entry["value"]
    
    async def set(self, key: str, value: Any, ttl_seconds: int):
        """Set value in memory cache"""
        async with self._lock:
            expires_at = datetime.now() + timedelta(seconds=ttl_seconds)
            
            self.cache[key] = {
                "value": value,
                "expires_at": expires_at,
                "created_at": datetime.now()
            }
            
            # Update access order
            if key in self.access_order:
                self.access_order.remove(key)
            self.access_order.append(key)
            
            # Enforce size limit
            while len(self.cache) > self.max_size:
                oldest_key = self.access_order.pop(0)
                await self._remove(oldest_key)
    
    async def _remove(self, key: str):
        """Remove key from cache"""
        self.cache.pop(key, None)
        if key in self.access_order:
            self.access_order.remove(key)
    
    async def clear(self):
        """Clear all cache entries"""
        async with self._lock:
            self.cache.clear()
            self.access_order.clear()
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "utilization": len(self.cache) / self.max_size
        }


class RedisCache:
    """Redis-based distributed cache"""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self._connected = False
    
    async def connect(self):
        """Connect to Redis"""
        try:
            self.redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD,
                decode_responses=False  # Handle binary data
            )
            await self.redis_client.ping()
            self._connected = True
            logger.info("Connected to Redis cache")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self._connected = False
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from Redis"""
        if not self._connected:
            return None
        
        try:
            data = await self.redis_client.get(f"cache:{key}")
            if data:
                return pickle.loads(data)
            return None
        except Exception as e:
            logger.error(f"Redis get error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl_seconds: int):
        """Set value in Redis"""
        if not self._connected:
            return
        
        try:
            serialized = pickle.dumps(value)
            await self.redis_client.setex(
                f"cache:{key}",
                ttl_seconds,
                serialized
            )
        except Exception as e:
            logger.error(f"Redis set error: {e}")
    
    async def delete(self, key: str):
        """Delete key from Redis"""
        if not self._connected:
            return
        
        try:
            await self.redis_client.delete(f"cache:{key}")
        except Exception as e:
            logger.error(f"Redis delete error: {e}")
    
    async def delete_pattern(self, pattern: str):
        """Delete keys matching pattern"""
        if not self._connected:
            return
        
        try:
            keys = await self.redis_client.keys(f"cache:{pattern}")
            if keys:
                await self.redis_client.delete(*keys)
        except Exception as e:
            logger.error(f"Redis pattern delete error: {e}")
    
    async def clear(self):
        """Clear all cache entries"""
        if not self._connected:
            return
        
        try:
            await self.redis_client.flushdb()
        except Exception as e:
            logger.error(f"Redis clear error: {e}")


class DiskCache:
    """Disk-based cache for large objects"""
    
    def __init__(self, cache_dir: str = "cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
    
    def _get_file_path(self, key: str) -> Path:
        """Get file path for cache key"""
        safe_key = hashlib.md5(key.encode()).hexdigest()
        return self.cache_dir / f"{safe_key}.cache"
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from disk cache"""
        file_path = self._get_file_path(key)
        
        if not file_path.exists():
            return None
        
        try:
            async with aiofiles.open(file_path, 'rb') as f:
                data = await f.read()
                cache_entry = pickle.loads(data)
                
                # Check TTL
                if datetime.now() > cache_entry["expires_at"]:
                    await self.delete(key)
                    return None
                
                return cache_entry["value"]
        except Exception as e:
            logger.error(f"Disk cache get error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl_seconds: int):
        """Set value in disk cache"""
        file_path = self._get_file_path(key)
        expires_at = datetime.now() + timedelta(seconds=ttl_seconds)
        
        cache_entry = {
            "value": value,
            "expires_at": expires_at,
            "created_at": datetime.now()
        }
        
        try:
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(pickle.dumps(cache_entry))
        except Exception as e:
            logger.error(f"Disk cache set error: {e}")
    
    async def delete(self, key: str):
        """Delete key from disk cache"""
        file_path = self._get_file_path(key)
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            logger.error(f"Disk cache delete error: {e}")


class CacheManager:
    """Multi-layer cache manager"""
    
    # Cache configurations for different data types
    CACHE_CONFIGS = {
        "financial_analysis": CacheConfig(
            ttl_seconds=3600,  # 1 hour
            max_size=1000,
            compression=True,
            levels=[CacheLevel.MEMORY, CacheLevel.REDIS],
            invalidation_tags=["financial_data"]
        ),
        "market_data": CacheConfig(
            ttl_seconds=300,  # 5 minutes
            max_size=500,
            compression=False,
            levels=[CacheLevel.MEMORY, CacheLevel.REDIS],
            invalidation_tags=["market_data", "real_time"]
        ),
        "industry_benchmarks": CacheConfig(
            ttl_seconds=86400,  # 24 hours
            max_size=200,
            compression=True,
            levels=[CacheLevel.MEMORY, CacheLevel.REDIS, CacheLevel.DISK],
            invalidation_tags=["benchmarks", "industry_data"]
        ),
        "ai_model_responses": CacheConfig(
            ttl_seconds=1800,  # 30 minutes
            max_size=2000,
            compression=True,
            levels=[CacheLevel.MEMORY, CacheLevel.REDIS],
            invalidation_tags=["ai_responses"]
        ),
        "strategic_analysis": CacheConfig(
            ttl_seconds=7200,  # 2 hours
            max_size=500,
            compression=True,
            levels=[CacheLevel.REDIS, CacheLevel.DISK],
            invalidation_tags=["strategic_data"]
        )
    }
    
    def __init__(self):
        self.memory_cache = MemoryCache(max_size=5000)
        self.redis_cache = RedisCache()
        self.disk_cache = DiskCache()
        self._initialized = False
    
    async def initialize(self):
        """Initialize cache manager"""
        await self.redis_cache.connect()
        self._initialized = True
        logger.info("Cache manager initialized")
    
    async def get(self, cache_type: str, **kwargs) -> Optional[Any]:
        """Get value from cache with multi-layer fallback"""
        if not self._initialized:
            return None
        
        config = self.CACHE_CONFIGS.get(cache_type)
        if not config:
            logger.warning(f"Unknown cache type: {cache_type}")
            return None
        
        key = CacheKey.generate(cache_type, **kwargs)
        
        # Try each cache level in order
        for level in config.levels:
            try:
                if level == CacheLevel.MEMORY:
                    value = await self.memory_cache.get(key)
                elif level == CacheLevel.REDIS:
                    value = await self.redis_cache.get(key)
                elif level == CacheLevel.DISK:
                    value = await self.disk_cache.get(key)
                else:
                    continue
                
                if value is not None:
                    # Populate higher-priority caches
                    await self._populate_higher_caches(key, value, config, level)
                    logger.debug(f"Cache hit: {cache_type} from {level.value}")
                    return value
            except Exception as e:
                logger.error(f"Cache get error for {level.value}: {e}")
        
        logger.debug(f"Cache miss: {cache_type}")
        return None
    
    async def set(self, cache_type: str, value: Any, **kwargs):
        """Set value in all configured cache levels"""
        if not self._initialized:
            return
        
        config = self.CACHE_CONFIGS.get(cache_type)
        if not config:
            logger.warning(f"Unknown cache type: {cache_type}")
            return
        
        key = CacheKey.generate(cache_type, **kwargs)
        
        # Set in all configured levels
        for level in config.levels:
            try:
                if level == CacheLevel.MEMORY:
                    await self.memory_cache.set(key, value, config.ttl_seconds)
                elif level == CacheLevel.REDIS:
                    await self.redis_cache.set(key, value, config.ttl_seconds)
                elif level == CacheLevel.DISK:
                    await self.disk_cache.set(key, value, config.ttl_seconds)
            except Exception as e:
                logger.error(f"Cache set error for {level.value}: {e}")
        
        logger.debug(f"Cache set: {cache_type}")
    
    async def _populate_higher_caches(self, key: str, value: Any, config: CacheConfig, found_level: CacheLevel):
        """Populate higher-priority caches when value found in lower-priority cache"""
        level_priorities = {
            CacheLevel.MEMORY: 1,
            CacheLevel.REDIS: 2,
            CacheLevel.DISK: 3,
            CacheLevel.CDN: 4
        }
        
        found_priority = level_priorities[found_level]
        
        for level in config.levels:
            if level_priorities[level] < found_priority:
                try:
                    if level == CacheLevel.MEMORY:
                        await self.memory_cache.set(key, value, config.ttl_seconds)
                    elif level == CacheLevel.REDIS:
                        await self.redis_cache.set(key, value, config.ttl_seconds)
                except Exception as e:
                    logger.error(f"Cache populate error for {level.value}: {e}")
    
    async def invalidate(self, cache_type: str, **kwargs):
        """Invalidate specific cache entry"""
        key = CacheKey.generate(cache_type, **kwargs)
        
        # Remove from all cache levels
        await self.memory_cache._remove(key)
        await self.redis_cache.delete(key)
        await self.disk_cache.delete(key)
        
        logger.debug(f"Cache invalidated: {cache_type}")
    
    async def invalidate_by_tags(self, tags: List[str]):
        """Invalidate cache entries by tags"""
        for cache_type, config in self.CACHE_CONFIGS.items():
            if config.invalidation_tags and any(tag in config.invalidation_tags for tag in tags):
                await self.redis_cache.delete_pattern(f"{cache_type}:*")
                logger.debug(f"Cache invalidated by tags: {cache_type}")
    
    async def clear_all(self):
        """Clear all caches"""
        await self.memory_cache.clear()
        await self.redis_cache.clear()
        logger.info("All caches cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "memory_cache": self.memory_cache.stats(),
            "redis_connected": self.redis_cache._connected,
            "cache_types": list(self.CACHE_CONFIGS.keys()),
            "total_configs": len(self.CACHE_CONFIGS)
        }


# Decorator for caching function results
def cached(cache_type: str, ttl_seconds: Optional[int] = None):
    """Decorator to cache function results"""
    def decorator(func: Callable):
        async def wrapper(*args, **kwargs):
            # Generate cache key from function arguments
            cache_key_data = {
                "function": func.__name__,
                "args": str(args),
                "kwargs": kwargs
            }
            
            # Try to get from cache
            cached_result = await cache_manager.get(cache_type, **cache_key_data)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache_manager.set(cache_type, result, **cache_key_data)
            
            return result
        return wrapper
    return decorator


# Global cache manager instance
cache_manager = CacheManager()


class BatchCacheManager:
    """Batch operations for cache efficiency"""
    
    def __init__(self, cache_manager: CacheManager):
        self.cache_manager = cache_manager
    
    async def get_batch(self, cache_type: str, batch_params: List[Dict[str, Any]]) -> List[Optional[Any]]:
        """Get multiple values from cache"""
        tasks = []
        for params in batch_params:
            task = self.cache_manager.get(cache_type, **params)
            tasks.append(task)
        
        return await asyncio.gather(*tasks, return_exceptions=True)
    
    async def set_batch(self, cache_type: str, batch_data: List[Dict[str, Any]]):
        """Set multiple values in cache"""
        tasks = []
        for data in batch_data:
            value = data.pop("value")
            task = self.cache_manager.set(cache_type, value, **data)
            tasks.append(task)
        
        await asyncio.gather(*tasks, return_exceptions=True)


# Batch cache manager instance
batch_cache_manager = BatchCacheManager(cache_manager)
