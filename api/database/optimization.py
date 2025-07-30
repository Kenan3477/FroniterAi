"""
Database Connection Pooling and Query Optimization Configuration

Provides advanced connection pooling, query optimization, caching strategies,
and performance monitoring for database operations.
"""

import os
import sys
import asyncio
import logging
import time
from typing import Dict, Any, Optional, List, Union, Callable
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
import threading
from collections import defaultdict, deque
import weakref

# SQLAlchemy imports for connection pooling
from sqlalchemy import create_engine, event, text, Engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlalchemy.pool import QueuePool, NullPool, StaticPool
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

# Query performance monitoring
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

# Redis for query caching
try:
    import redis.asyncio as redis
    from redis.exceptions import RedisError
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

# APScheduler for maintenance tasks
try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.interval import IntervalTrigger
    SCHEDULER_AVAILABLE = True
except ImportError:
    SCHEDULER_AVAILABLE = False

logger = logging.getLogger(__name__)

@dataclass
class ConnectionPoolConfig:
    """Configuration for database connection pooling"""
    
    # Pool size settings
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600
    pool_pre_ping: bool = True
    
    # Connection retry settings
    connect_timeout: int = 10
    max_retries: int = 3
    retry_interval: float = 1.0
    
    # Health check settings
    health_check_interval: int = 60
    max_connection_age: int = 7200
    
    # Performance settings
    statement_timeout: int = 300
    idle_timeout: int = 600
    
    # Monitoring settings
    enable_monitoring: bool = True
    log_slow_queries: bool = True
    slow_query_threshold: float = 1.0

@dataclass
class QueryCacheConfig:
    """Configuration for query result caching"""
    
    # Cache settings
    enable_caching: bool = True
    cache_backend: str = "redis"  # redis, memory
    default_ttl: int = 3600
    max_cache_size: int = 1000
    
    # Redis settings
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 1
    redis_password: Optional[str] = None
    redis_max_connections: int = 10
    
    # Cache key settings
    cache_prefix: str = "frontier_query:"
    hash_keys: bool = True
    
    # Performance settings
    cache_compression: bool = True
    batch_invalidation: bool = True

@dataclass
class QueryMetrics:
    """Metrics for query performance monitoring"""
    
    query_hash: str = ""
    query_text: str = ""
    execution_time: float = 0.0
    rows_affected: int = 0
    timestamp: datetime = field(default_factory=datetime.now)
    connection_id: str = ""
    database_name: str = ""
    table_names: List[str] = field(default_factory=list)
    cache_hit: bool = False
    error: Optional[str] = None

class QueryPerformanceMonitor:
    """Monitors and analyzes query performance"""
    
    def __init__(self, config: ConnectionPoolConfig):
        self.config = config
        self.query_history = deque(maxlen=10000)
        self.slow_queries = deque(maxlen=1000)
        self.query_stats = defaultdict(lambda: {
            'count': 0,
            'total_time': 0.0,
            'avg_time': 0.0,
            'max_time': 0.0,
            'min_time': float('inf')
        })
        self.connection_stats = defaultdict(lambda: {
            'queries': 0,
            'total_time': 0.0,
            'errors': 0,
            'created_at': datetime.now()
        })
        
    def record_query(self, metrics: QueryMetrics):
        """Record query execution metrics"""
        # Add to history
        self.query_history.append(metrics)
        
        # Track slow queries
        if metrics.execution_time > self.config.slow_query_threshold:
            self.slow_queries.append(metrics)
            if self.config.log_slow_queries:
                logger.warning(
                    f"Slow query detected: {metrics.execution_time:.3f}s - "
                    f"{metrics.query_text[:100]}..."
                )
        
        # Update statistics
        stats = self.query_stats[metrics.query_hash]
        stats['count'] += 1
        stats['total_time'] += metrics.execution_time
        stats['avg_time'] = stats['total_time'] / stats['count']
        stats['max_time'] = max(stats['max_time'], metrics.execution_time)
        stats['min_time'] = min(stats['min_time'], metrics.execution_time)
        
        # Update connection statistics
        conn_stats = self.connection_stats[metrics.connection_id]
        conn_stats['queries'] += 1
        conn_stats['total_time'] += metrics.execution_time
        if metrics.error:
            conn_stats['errors'] += 1
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Generate performance analysis report"""
        now = datetime.now()
        last_hour = now - timedelta(hours=1)
        
        # Recent queries
        recent_queries = [
            q for q in self.query_history 
            if q.timestamp > last_hour
        ]
        
        # Calculate metrics
        total_queries = len(recent_queries)
        if total_queries == 0:
            return {"message": "No queries executed in the last hour"}
        
        avg_response_time = sum(q.execution_time for q in recent_queries) / total_queries
        slow_query_count = len([q for q in recent_queries if q.execution_time > self.config.slow_query_threshold])
        error_count = len([q for q in recent_queries if q.error])
        cache_hit_rate = len([q for q in recent_queries if q.cache_hit]) / total_queries if total_queries > 0 else 0
        
        # Top slow queries
        top_slow_queries = sorted(
            [q for q in self.slow_queries if q.timestamp > last_hour],
            key=lambda x: x.execution_time,
            reverse=True
        )[:10]
        
        # Most frequent queries
        query_frequency = defaultdict(int)
        for q in recent_queries:
            query_frequency[q.query_hash] += 1
        
        frequent_queries = sorted(
            query_frequency.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        return {
            "time_period": "last_hour",
            "total_queries": total_queries,
            "average_response_time": round(avg_response_time, 3),
            "slow_queries": slow_query_count,
            "error_rate": round(error_count / total_queries * 100, 2),
            "cache_hit_rate": round(cache_hit_rate * 100, 2),
            "top_slow_queries": [
                {
                    "query": q.query_text[:100] + "..." if len(q.query_text) > 100 else q.query_text,
                    "execution_time": q.execution_time,
                    "timestamp": q.timestamp.isoformat()
                }
                for q in top_slow_queries
            ],
            "most_frequent_queries": [
                {
                    "query_hash": qh,
                    "frequency": freq,
                    "avg_time": round(self.query_stats[qh]['avg_time'], 3)
                }
                for qh, freq in frequent_queries
            ]
        }

class QueryCache:
    """Query result caching system"""
    
    def __init__(self, config: QueryCacheConfig):
        self.config = config
        self.redis_client = None
        self.memory_cache = {}
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0
        }
        
    async def initialize(self) -> bool:
        """Initialize cache backend"""
        if not self.config.enable_caching:
            return True
        
        try:
            if self.config.cache_backend == "redis" and REDIS_AVAILABLE:
                self.redis_client = redis.Redis(
                    host=self.config.redis_host,
                    port=self.config.redis_port,
                    db=self.config.redis_db,
                    password=self.config.redis_password,
                    max_connections=self.config.redis_max_connections,
                    decode_responses=True
                )
                
                # Test connection
                await self.redis_client.ping()
                logger.info("Redis query cache initialized")
                
            logger.info(f"Query cache initialized with {self.config.cache_backend} backend")
            return True
            
        except Exception as e:
            logger.error(f"Query cache initialization failed: {e}")
            return False
    
    def _generate_cache_key(self, query: str, params: Dict[str, Any] = None) -> str:
        """Generate cache key for query and parameters"""
        import hashlib
        
        # Create key components
        key_data = f"{query}:{params}" if params else query
        
        if self.config.hash_keys:
            # Hash the key for consistent length
            key_hash = hashlib.md5(key_data.encode()).hexdigest()
            return f"{self.config.cache_prefix}{key_hash}"
        else:
            # Use direct key (truncated if too long)
            safe_key = key_data.replace(" ", "_").replace(":", "_")[:200]
            return f"{self.config.cache_prefix}{safe_key}"
    
    async def get(self, query: str, params: Dict[str, Any] = None) -> Optional[Any]:
        """Get cached query result"""
        if not self.config.enable_caching:
            return None
        
        try:
            cache_key = self._generate_cache_key(query, params)
            
            if self.config.cache_backend == "redis" and self.redis_client:
                result = await self.redis_client.get(cache_key)
                if result:
                    self.cache_stats['hits'] += 1
                    # In a real implementation, you'd deserialize the result
                    return result
            
            elif self.config.cache_backend == "memory":
                result = self.memory_cache.get(cache_key)
                if result and result['expires'] > datetime.now():
                    self.cache_stats['hits'] += 1
                    return result['data']
                elif result:
                    # Expired entry
                    del self.memory_cache[cache_key]
            
            self.cache_stats['misses'] += 1
            return None
            
        except Exception as e:
            logger.error(f"Cache get failed: {e}")
            return None
    
    async def set(self, query: str, result: Any, params: Dict[str, Any] = None, 
                  ttl: int = None) -> bool:
        """Cache query result"""
        if not self.config.enable_caching:
            return False
        
        try:
            cache_key = self._generate_cache_key(query, params)
            ttl = ttl or self.config.default_ttl
            
            if self.config.cache_backend == "redis" and self.redis_client:
                # In a real implementation, you'd serialize the result
                await self.redis_client.setex(cache_key, ttl, str(result))
                
            elif self.config.cache_backend == "memory":
                # Implement LRU eviction if cache is full
                if len(self.memory_cache) >= self.config.max_cache_size:
                    # Remove oldest entry
                    oldest_key = min(
                        self.memory_cache.keys(),
                        key=lambda k: self.memory_cache[k]['created']
                    )
                    del self.memory_cache[oldest_key]
                
                self.memory_cache[cache_key] = {
                    'data': result,
                    'created': datetime.now(),
                    'expires': datetime.now() + timedelta(seconds=ttl)
                }
            
            self.cache_stats['sets'] += 1
            return True
            
        except Exception as e:
            logger.error(f"Cache set failed: {e}")
            return False
    
    async def invalidate(self, pattern: str = None) -> bool:
        """Invalidate cache entries"""
        try:
            if pattern:
                if self.config.cache_backend == "redis" and self.redis_client:
                    keys = await self.redis_client.keys(f"{self.config.cache_prefix}{pattern}")
                    if keys:
                        await self.redis_client.delete(*keys)
                        self.cache_stats['deletes'] += len(keys)
                
                elif self.config.cache_backend == "memory":
                    keys_to_delete = [
                        k for k in self.memory_cache.keys() 
                        if pattern in k
                    ]
                    for key in keys_to_delete:
                        del self.memory_cache[key]
                    self.cache_stats['deletes'] += len(keys_to_delete)
            else:
                # Clear all cache
                if self.config.cache_backend == "redis" and self.redis_client:
                    await self.redis_client.flushdb()
                elif self.config.cache_backend == "memory":
                    self.memory_cache.clear()
                
                self.cache_stats['deletes'] += 1
            
            return True
            
        except Exception as e:
            logger.error(f"Cache invalidation failed: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = self.cache_stats['hits'] + self.cache_stats['misses']
        hit_rate = (self.cache_stats['hits'] / total_requests * 100) if total_requests > 0 else 0
        
        stats = {
            "backend": self.config.cache_backend,
            "hit_rate": round(hit_rate, 2),
            "total_requests": total_requests,
            **self.cache_stats
        }
        
        if self.config.cache_backend == "memory":
            stats["cache_size"] = len(self.memory_cache)
            stats["max_cache_size"] = self.config.max_cache_size
        
        return stats

class ConnectionPool:
    """Advanced database connection pool manager"""
    
    def __init__(self, config: ConnectionPoolConfig):
        self.config = config
        self.engines = {}
        self.session_makers = {}
        self.monitor = QueryPerformanceMonitor(config)
        self.cache = QueryCache(QueryCacheConfig())
        self.active_connections = weakref.WeakSet()
        self.connection_events = {}
        
    async def initialize(self, database_configs: Dict[str, Dict[str, Any]]) -> bool:
        """Initialize connection pools for multiple databases"""
        try:
            for db_name, db_config in database_configs.items():
                await self._create_engine(db_name, db_config)
            
            # Initialize query cache
            await self.cache.initialize()
            
            # Start maintenance scheduler if available
            if SCHEDULER_AVAILABLE:
                await self._start_maintenance_scheduler()
            
            logger.info(f"Connection pools initialized for {len(database_configs)} databases")
            return True
            
        except Exception as e:
            logger.error(f"Connection pool initialization failed: {e}")
            return False
    
    async def _create_engine(self, db_name: str, db_config: Dict[str, Any]) -> bool:
        """Create SQLAlchemy engine with optimized settings"""
        try:
            db_type = db_config.get("type", "sqlite")
            
            # Build connection URL
            if db_type == "sqlite":
                url = db_config.get("url", "sqlite:///frontier_business.db")
                poolclass = StaticPool
                connect_args = {"check_same_thread": False}
            elif db_type == "postgresql":
                url = (
                    f"postgresql+asyncpg://"
                    f"{db_config['username']}:{db_config['password']}@"
                    f"{db_config['host']}:{db_config['port']}/"
                    f"{db_config['database']}"
                )
                poolclass = QueuePool
                connect_args = {}
            else:
                raise ValueError(f"Unsupported database type: {db_type}")
            
            # Create async engine with optimized settings
            engine = create_async_engine(
                url,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                pool_timeout=self.config.pool_timeout,
                pool_recycle=self.config.pool_recycle,
                pool_pre_ping=self.config.pool_pre_ping,
                poolclass=poolclass,
                connect_args=connect_args,
                echo=db_config.get("echo", False)
            )
            
            # Create session maker
            session_maker = async_sessionmaker(
                bind=engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            self.engines[db_name] = engine
            self.session_makers[db_name] = session_maker
            
            # Set up connection event listeners
            self._setup_connection_events(engine, db_name)
            
            logger.info(f"Engine created for database: {db_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create engine for {db_name}: {e}")
            return False
    
    def _setup_connection_events(self, engine: AsyncEngine, db_name: str):
        """Set up SQLAlchemy event listeners for monitoring"""
        
        @event.listens_for(engine.sync_engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            context._query_start_time = time.time()
            context._query_statement = statement
            context._query_parameters = parameters
        
        @event.listens_for(engine.sync_engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            execution_time = time.time() - context._query_start_time
            
            # Create query metrics
            metrics = QueryMetrics(
                query_hash=str(hash(statement)),
                query_text=statement,
                execution_time=execution_time,
                rows_affected=cursor.rowcount if hasattr(cursor, 'rowcount') else 0,
                connection_id=str(id(conn)),
                database_name=db_name
            )
            
            # Record metrics
            if self.config.enable_monitoring:
                self.monitor.record_query(metrics)
    
    @asynccontextmanager
    async def get_session(self, database: str = "primary"):
        """Get database session with automatic cleanup"""
        if database not in self.session_makers:
            raise ValueError(f"Database '{database}' not configured")
        
        session_maker = self.session_makers[database]
        session = session_maker()
        
        try:
            # Add to active connections tracking
            self.active_connections.add(session)
            yield session
            await session.commit()
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Session error in database '{database}': {e}")
            raise
            
        finally:
            await session.close()
    
    async def execute_query(self, query: str, params: Dict[str, Any] = None, 
                          database: str = "primary", use_cache: bool = True) -> Any:
        """Execute query with caching and monitoring"""
        start_time = time.time()
        
        try:
            # Check cache first
            if use_cache:
                cached_result = await self.cache.get(query, params)
                if cached_result is not None:
                    # Record cache hit metrics
                    metrics = QueryMetrics(
                        query_hash=str(hash(query)),
                        query_text=query,
                        execution_time=time.time() - start_time,
                        cache_hit=True,
                        database_name=database
                    )
                    self.monitor.record_query(metrics)
                    return cached_result
            
            # Execute query
            async with self.get_session(database) as session:
                result = await session.execute(text(query), params or {})
                
                # Cache result if appropriate
                if use_cache and self._should_cache_query(query):
                    await self.cache.set(query, result, params)
                
                return result
                
        except Exception as e:
            # Record error metrics
            metrics = QueryMetrics(
                query_hash=str(hash(query)),
                query_text=query,
                execution_time=time.time() - start_time,
                error=str(e),
                database_name=database
            )
            self.monitor.record_query(metrics)
            raise
    
    def _should_cache_query(self, query: str) -> bool:
        """Determine if query results should be cached"""
        # Don't cache write operations
        write_operations = ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER']
        query_upper = query.upper().strip()
        
        for operation in write_operations:
            if query_upper.startswith(operation):
                return False
        
        return True
    
    async def get_pool_status(self) -> Dict[str, Any]:
        """Get connection pool status for all databases"""
        status = {}
        
        for db_name, engine in self.engines.items():
            pool = engine.pool
            
            status[db_name] = {
                "pool_size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "invalid": pool.invalid(),
                "active_connections": len([
                    conn for conn in self.active_connections 
                    if hasattr(conn, 'bind') and conn.bind == engine
                ])
            }
        
        return status
    
    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics"""
        return {
            "pool_status": await self.get_pool_status(),
            "query_performance": self.monitor.get_performance_report(),
            "cache_stats": self.cache.get_stats(),
            "system_resources": self._get_system_resources() if PSUTIL_AVAILABLE else {}
        }
    
    def _get_system_resources(self) -> Dict[str, Any]:
        """Get system resource usage"""
        try:
            process = psutil.Process()
            
            return {
                "cpu_percent": process.cpu_percent(),
                "memory_percent": process.memory_percent(),
                "memory_mb": process.memory_info().rss / 1024 / 1024,
                "open_files": len(process.open_files()),
                "connections": len(process.connections())
            }
        except Exception:
            return {}
    
    async def _start_maintenance_scheduler(self):
        """Start scheduler for maintenance tasks"""
        try:
            scheduler = AsyncIOScheduler()
            
            # Pool health check
            scheduler.add_job(
                self._health_check_pools,
                IntervalTrigger(seconds=self.config.health_check_interval),
                id='pool_health_check',
                name='Connection Pool Health Check'
            )
            
            # Cache cleanup
            scheduler.add_job(
                self._cleanup_expired_cache,
                IntervalTrigger(minutes=30),
                id='cache_cleanup',
                name='Cache Cleanup'
            )
            
            scheduler.start()
            logger.info("Maintenance scheduler started")
            
        except Exception as e:
            logger.error(f"Failed to start maintenance scheduler: {e}")
    
    async def _health_check_pools(self):
        """Perform health check on all connection pools"""
        for db_name, engine in self.engines.items():
            try:
                async with engine.begin() as conn:
                    await conn.execute(text("SELECT 1"))
                logger.debug(f"Health check passed for database: {db_name}")
                
            except Exception as e:
                logger.error(f"Health check failed for database {db_name}: {e}")
    
    async def _cleanup_expired_cache(self):
        """Clean up expired cache entries"""
        if self.cache.config.cache_backend == "memory":
            expired_keys = []
            now = datetime.now()
            
            for key, value in self.cache.memory_cache.items():
                if value['expires'] < now:
                    expired_keys.append(key)
            
            for key in expired_keys:
                del self.cache.memory_cache[key]
            
            if expired_keys:
                logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")
    
    async def close_all_pools(self):
        """Close all database connection pools"""
        for db_name, engine in self.engines.items():
            try:
                await engine.dispose()
                logger.info(f"Closed connection pool for database: {db_name}")
            except Exception as e:
                logger.error(f"Error closing pool for {db_name}: {e}")

# Global connection pool manager
connection_pool = ConnectionPool(ConnectionPoolConfig())
