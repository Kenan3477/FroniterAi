"""
Cache Manager

High-performance caching system for database queries and application data
with support for multiple backends, TTL management, and cache invalidation.
"""

import asyncio
import json
import pickle
import hashlib
import logging
from typing import Any, Dict, List, Optional, Union, Callable
from datetime import datetime, timedelta
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum

# Redis imports
try:
    import redis.asyncio as redis
    from redis.exceptions import RedisError, ConnectionError as RedisConnectionError
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from .exceptions import CacheException

logger = logging.getLogger(__name__)

class CacheBackend(Enum):
    """Available cache backends"""
    MEMORY = "memory"
    REDIS = "redis"
    HYBRID = "hybrid"

@dataclass
class CacheConfig:
    """Cache configuration"""
    backend: CacheBackend = CacheBackend.MEMORY
    default_ttl: int = 3600  # 1 hour
    max_memory_size: int = 1000  # Max items in memory cache
    key_prefix: str = "frontier:"
    
    # Redis configuration
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: Optional[str] = None
    redis_max_connections: int = 10
    redis_timeout: int = 5
    
    # Serialization
    serialize_method: str = "json"  # json, pickle
    compress_data: bool = False
    
    # Performance
    enable_stats: bool = True
    stats_ttl: int = 300  # 5 minutes

@dataclass
class CacheStats:
    """Cache statistics"""
    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    errors: int = 0
    total_requests: int = 0
    
    @property
    def hit_rate(self) -> float:
        """Calculate cache hit rate"""
        if self.total_requests == 0:
            return 0.0
        return (self.hits / self.total_requests) * 100
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert stats to dictionary"""
        return {
            "hits": self.hits,
            "misses": self.misses,
            "sets": self.sets,
            "deletes": self.deletes,
            "errors": self.errors,
            "total_requests": self.total_requests,
            "hit_rate": round(self.hit_rate, 2)
        }

class CacheItem:
    """Cache item with metadata"""
    
    def __init__(self, value: Any, ttl: Optional[int] = None):
        self.value = value
        self.created_at = datetime.now()
        self.expires_at = (
            self.created_at + timedelta(seconds=ttl)
            if ttl else None
        )
        self.access_count = 0
        self.last_accessed = self.created_at
    
    def is_expired(self) -> bool:
        """Check if cache item is expired"""
        if self.expires_at is None:
            return False
        return datetime.now() > self.expires_at
    
    def access(self) -> Any:
        """Access the cached value and update metadata"""
        self.access_count += 1
        self.last_accessed = datetime.now()
        return self.value

class BaseCacheBackend(ABC):
    """Base class for cache backends"""
    
    def __init__(self, config: CacheConfig):
        self.config = config
        self.stats = CacheStats()
    
    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        pass
    
    @abstractmethod
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        pass
    
    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete value from cache"""
        pass
    
    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        pass
    
    @abstractmethod
    async def clear(self) -> bool:
        """Clear all cache entries"""
        pass
    
    @abstractmethod
    async def keys(self, pattern: str = "*") -> List[str]:
        """Get keys matching pattern"""
        pass
    
    def _serialize(self, value: Any) -> bytes:
        """Serialize value for storage"""
        try:
            if self.config.serialize_method == "json":
                return json.dumps(value, default=str).encode('utf-8')
            elif self.config.serialize_method == "pickle":
                return pickle.dumps(value)
            else:
                raise ValueError(f"Unknown serialization method: {self.config.serialize_method}")
        except Exception as e:
            raise CacheException(
                message=f"Serialization failed: {e}",
                operation="serialize",
                inner_exception=e
            )
    
    def _deserialize(self, data: bytes) -> Any:
        """Deserialize value from storage"""
        try:
            if self.config.serialize_method == "json":
                return json.loads(data.decode('utf-8'))
            elif self.config.serialize_method == "pickle":
                return pickle.loads(data)
            else:
                raise ValueError(f"Unknown serialization method: {self.config.serialize_method}")
        except Exception as e:
            raise CacheException(
                message=f"Deserialization failed: {e}",
                operation="deserialize",
                inner_exception=e
            )
    
    def _record_hit(self):
        """Record cache hit"""
        if self.config.enable_stats:
            self.stats.hits += 1
            self.stats.total_requests += 1
    
    def _record_miss(self):
        """Record cache miss"""
        if self.config.enable_stats:
            self.stats.misses += 1
            self.stats.total_requests += 1
    
    def _record_set(self):
        """Record cache set"""
        if self.config.enable_stats:
            self.stats.sets += 1
    
    def _record_delete(self):
        """Record cache delete"""
        if self.config.enable_stats:
            self.stats.deletes += 1
    
    def _record_error(self):
        """Record cache error"""
        if self.config.enable_stats:
            self.stats.errors += 1

class MemoryCacheBackend(BaseCacheBackend):
    """In-memory cache backend"""
    
    def __init__(self, config: CacheConfig):
        super().__init__(config)
        self.cache: Dict[str, CacheItem] = {}
        self.lock = asyncio.Lock()
        
        # Start cleanup task
        self.cleanup_task = asyncio.create_task(self._cleanup_loop())
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from memory cache"""
        try:
            async with self.lock:
                full_key = f"{self.config.key_prefix}{key}"
                
                if full_key not in self.cache:
                    self._record_miss()
                    return None
                
                item = self.cache[full_key]
                
                if item.is_expired():
                    del self.cache[full_key]
                    self._record_miss()
                    return None
                
                self._record_hit()
                return item.access()
                
        except Exception as e:
            self._record_error()
            logger.error(f"Memory cache get error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in memory cache"""
        try:
            async with self.lock:
                full_key = f"{self.config.key_prefix}{key}"
                
                # Check cache size limit
                if len(self.cache) >= self.config.max_memory_size:
                    await self._evict_oldest()
                
                # Use default TTL if not specified
                if ttl is None:
                    ttl = self.config.default_ttl
                
                self.cache[full_key] = CacheItem(value, ttl)
                self._record_set()
                return True
                
        except Exception as e:
            self._record_error()
            logger.error(f"Memory cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete value from memory cache"""
        try:
            async with self.lock:
                full_key = f"{self.config.key_prefix}{key}"
                
                if full_key in self.cache:
                    del self.cache[full_key]
                    self._record_delete()
                    return True
                
                return False
                
        except Exception as e:
            self._record_error()
            logger.error(f"Memory cache delete error: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in memory cache"""
        async with self.lock:
            full_key = f"{self.config.key_prefix}{key}"
            
            if full_key not in self.cache:
                return False
            
            item = self.cache[full_key]
            if item.is_expired():
                del self.cache[full_key]
                return False
            
            return True
    
    async def clear(self) -> bool:
        """Clear all memory cache entries"""
        try:
            async with self.lock:
                self.cache.clear()
                return True
        except Exception as e:
            self._record_error()
            logger.error(f"Memory cache clear error: {e}")
            return False
    
    async def keys(self, pattern: str = "*") -> List[str]:
        """Get keys matching pattern"""
        import fnmatch
        
        async with self.lock:
            all_keys = list(self.cache.keys())
            
            if pattern == "*":
                return [key.replace(self.config.key_prefix, "") for key in all_keys]
            
            # Simple pattern matching
            pattern_with_prefix = f"{self.config.key_prefix}{pattern}"
            matching_keys = []
            
            for key in all_keys:
                if fnmatch.fnmatch(key, pattern_with_prefix):
                    matching_keys.append(key.replace(self.config.key_prefix, ""))
            
            return matching_keys
    
    async def _evict_oldest(self):
        """Evict oldest cache entry (LRU)"""
        if not self.cache:
            return
        
        oldest_key = min(
            self.cache.keys(),
            key=lambda k: self.cache[k].last_accessed
        )
        del self.cache[oldest_key]
    
    async def _cleanup_loop(self):
        """Periodic cleanup of expired entries"""
        while True:
            try:
                await asyncio.sleep(60)  # Cleanup every minute
                await self._cleanup_expired()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cache cleanup error: {e}")
    
    async def _cleanup_expired(self):
        """Remove expired entries"""
        async with self.lock:
            expired_keys = []
            
            for key, item in self.cache.items():
                if item.is_expired():
                    expired_keys.append(key)
            
            for key in expired_keys:
                del self.cache[key]
            
            if expired_keys:
                logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")
    
    async def close(self):
        """Close memory cache backend"""
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass

class RedisCacheBackend(BaseCacheBackend):
    """Redis cache backend"""
    
    def __init__(self, config: CacheConfig):
        super().__init__(config)
        self.redis_client: Optional[redis.Redis] = None
        self.connected = False
    
    async def connect(self) -> bool:
        """Connect to Redis"""
        if not REDIS_AVAILABLE:
            raise CacheException(
                message="Redis not available",
                cache_backend="redis",
                operation="connect"
            )
        
        try:
            self.redis_client = redis.Redis(
                host=self.config.redis_host,
                port=self.config.redis_port,
                db=self.config.redis_db,
                password=self.config.redis_password,
                max_connections=self.config.redis_max_connections,
                socket_timeout=self.config.redis_timeout,
                decode_responses=False  # We handle serialization ourselves
            )
            
            # Test connection
            await self.redis_client.ping()
            self.connected = True
            logger.info("Redis cache backend connected")
            return True
            
        except Exception as e:
            self.connected = False
            raise CacheException(
                message=f"Redis connection failed: {e}",
                cache_backend="redis",
                operation="connect",
                inner_exception=e
            )
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from Redis cache"""
        if not self.connected:
            self._record_error()
            return None
        
        try:
            full_key = f"{self.config.key_prefix}{key}"
            data = await self.redis_client.get(full_key)
            
            if data is None:
                self._record_miss()
                return None
            
            value = self._deserialize(data)
            self._record_hit()
            return value
            
        except Exception as e:
            self._record_error()
            logger.error(f"Redis cache get error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in Redis cache"""
        if not self.connected:
            self._record_error()
            return False
        
        try:
            full_key = f"{self.config.key_prefix}{key}"
            data = self._serialize(value)
            
            # Use default TTL if not specified
            if ttl is None:
                ttl = self.config.default_ttl
            
            await self.redis_client.setex(full_key, ttl, data)
            self._record_set()
            return True
            
        except Exception as e:
            self._record_error()
            logger.error(f"Redis cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete value from Redis cache"""
        if not self.connected:
            self._record_error()
            return False
        
        try:
            full_key = f"{self.config.key_prefix}{key}"
            result = await self.redis_client.delete(full_key)
            
            if result > 0:
                self._record_delete()
                return True
            
            return False
            
        except Exception as e:
            self._record_error()
            logger.error(f"Redis cache delete error: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in Redis cache"""
        if not self.connected:
            return False
        
        try:
            full_key = f"{self.config.key_prefix}{key}"
            return bool(await self.redis_client.exists(full_key))
        except Exception as e:
            logger.error(f"Redis cache exists error: {e}")
            return False
    
    async def clear(self) -> bool:
        """Clear all Redis cache entries with prefix"""
        if not self.connected:
            self._record_error()
            return False
        
        try:
            pattern = f"{self.config.key_prefix}*"
            keys = await self.redis_client.keys(pattern)
            
            if keys:
                await self.redis_client.delete(*keys)
            
            return True
            
        except Exception as e:
            self._record_error()
            logger.error(f"Redis cache clear error: {e}")
            return False
    
    async def keys(self, pattern: str = "*") -> List[str]:
        """Get keys matching pattern"""
        if not self.connected:
            return []
        
        try:
            full_pattern = f"{self.config.key_prefix}{pattern}"
            redis_keys = await self.redis_client.keys(full_pattern)
            
            # Remove prefix from keys
            return [
                key.decode('utf-8').replace(self.config.key_prefix, "")
                for key in redis_keys
            ]
            
        except Exception as e:
            logger.error(f"Redis cache keys error: {e}")
            return []
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            self.connected = False

class CacheManager:
    """Main cache manager with support for multiple backends"""
    
    def __init__(self, config: CacheConfig):
        self.config = config
        self.backend: Optional[BaseCacheBackend] = None
        self.is_initialized = False
    
    async def initialize(self) -> bool:
        """Initialize cache manager"""
        try:
            if self.config.backend == CacheBackend.MEMORY:
                self.backend = MemoryCacheBackend(self.config)
            elif self.config.backend == CacheBackend.REDIS:
                self.backend = RedisCacheBackend(self.config)
                await self.backend.connect()
            else:
                raise ValueError(f"Unsupported cache backend: {self.config.backend}")
            
            self.is_initialized = True
            logger.info(f"Cache manager initialized with {self.config.backend.value} backend")
            return True
            
        except Exception as e:
            logger.error(f"Cache manager initialization failed: {e}")
            return False
    
    def _generate_key(self, key_parts: List[str]) -> str:
        """Generate cache key from parts"""
        key = ":".join(str(part) for part in key_parts)
        
        # Hash long keys to ensure consistent length
        if len(key) > 200:
            key_hash = hashlib.md5(key.encode()).hexdigest()
            return f"hash:{key_hash}"
        
        return key
    
    async def get(self, key: Union[str, List[str]]) -> Optional[Any]:
        """Get value from cache"""
        if not self.is_initialized or not self.backend:
            return None
        
        cache_key = self._generate_key([key] if isinstance(key, str) else key)
        return await self.backend.get(cache_key)
    
    async def set(
        self, 
        key: Union[str, List[str]], 
        value: Any, 
        ttl: Optional[int] = None
    ) -> bool:
        """Set value in cache"""
        if not self.is_initialized or not self.backend:
            return False
        
        cache_key = self._generate_key([key] if isinstance(key, str) else key)
        return await self.backend.set(cache_key, value, ttl)
    
    async def delete(self, key: Union[str, List[str]]) -> bool:
        """Delete value from cache"""
        if not self.is_initialized or not self.backend:
            return False
        
        cache_key = self._generate_key([key] if isinstance(key, str) else key)
        return await self.backend.delete(cache_key)
    
    async def exists(self, key: Union[str, List[str]]) -> bool:
        """Check if key exists in cache"""
        if not self.is_initialized or not self.backend:
            return False
        
        cache_key = self._generate_key([key] if isinstance(key, str) else key)
        return await self.backend.exists(cache_key)
    
    async def clear(self) -> bool:
        """Clear all cache entries"""
        if not self.is_initialized or not self.backend:
            return False
        
        return await self.backend.clear()
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern"""
        if not self.is_initialized or not self.backend:
            return 0
        
        try:
            keys = await self.backend.keys(pattern)
            deleted_count = 0
            
            for key in keys:
                if await self.backend.delete(key):
                    deleted_count += 1
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Cache pattern invalidation error: {e}")
            return 0
    
    def cache_result(
        self, 
        ttl: Optional[int] = None,
        key_func: Optional[Callable] = None
    ):
        """Decorator to cache function results"""
        def decorator(func):
            async def wrapper(*args, **kwargs):
                # Generate cache key
                if key_func:
                    cache_key = key_func(*args, **kwargs)
                else:
                    key_parts = [func.__name__]
                    key_parts.extend(str(arg) for arg in args)
                    key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
                    cache_key = key_parts
                
                # Try to get from cache
                cached_result = await self.get(cache_key)
                if cached_result is not None:
                    return cached_result
                
                # Execute function and cache result
                result = await func(*args, **kwargs)
                await self.set(cache_key, result, ttl)
                
                return result
            
            return wrapper
        return decorator
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.is_initialized or not self.backend:
            return {"error": "Cache not initialized"}
        
        stats = self.backend.stats.to_dict()
        stats["backend"] = self.config.backend.value
        stats["is_connected"] = (
            self.backend.connected 
            if hasattr(self.backend, 'connected') 
            else True
        )
        
        return stats
    
    async def close(self):
        """Close cache manager"""
        if self.backend:
            await self.backend.close()
        self.is_initialized = False
