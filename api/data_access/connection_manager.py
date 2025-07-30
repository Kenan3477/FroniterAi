"""
Connection Manager

Advanced database connection management with connection pooling,
health monitoring, and automatic failover capabilities.
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List, AsyncContextManager
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
import weakref
from dataclasses import dataclass
from enum import Enum

from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool, NullPool, StaticPool
from sqlalchemy.exc import SQLAlchemyError, DisconnectionError
from sqlalchemy.engine import Engine

from .exceptions import (
    ConnectionException, 
    TransactionException,
    DataAccessException
)

logger = logging.getLogger(__name__)

class ConnectionState(Enum):
    """Connection states"""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"
    RECONNECTING = "reconnecting"

@dataclass
class ConnectionConfig:
    """Connection configuration"""
    url: str
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600
    pool_pre_ping: bool = True
    echo: bool = False
    connect_timeout: int = 10
    max_retries: int = 3
    retry_interval: float = 1.0
    health_check_interval: int = 60

@dataclass
class ConnectionMetrics:
    """Connection metrics and statistics"""
    total_connections: int = 0
    active_connections: int = 0
    idle_connections: int = 0
    failed_connections: int = 0
    total_queries: int = 0
    failed_queries: int = 0
    avg_response_time: float = 0.0
    last_health_check: Optional[datetime] = None
    uptime: timedelta = timedelta()

class ConnectionMonitor:
    """Monitors connection health and performance"""
    
    def __init__(self, connection_manager: 'ConnectionManager'):
        self.connection_manager = connection_manager
        self.metrics = ConnectionMetrics()
        self.query_times: List[float] = []
        self.max_query_history = 1000
        
    def record_query(self, response_time: float, success: bool = True):
        """Record query execution metrics"""
        self.metrics.total_queries += 1
        
        if success:
            self.query_times.append(response_time)
            if len(self.query_times) > self.max_query_history:
                self.query_times.pop(0)
            
            # Update average response time
            self.metrics.avg_response_time = sum(self.query_times) / len(self.query_times)
        else:
            self.metrics.failed_queries += 1
    
    def record_connection_attempt(self, success: bool = True):
        """Record connection attempt"""
        self.metrics.total_connections += 1
        if not success:
            self.metrics.failed_connections += 1
    
    def update_pool_metrics(self, pool_status: Dict[str, int]):
        """Update connection pool metrics"""
        self.metrics.active_connections = pool_status.get('checked_out', 0)
        self.metrics.idle_connections = pool_status.get('checked_in', 0)
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get connection health status"""
        return {
            "state": self.connection_manager.state.value,
            "metrics": {
                "total_connections": self.metrics.total_connections,
                "active_connections": self.metrics.active_connections,
                "idle_connections": self.metrics.idle_connections,
                "failed_connections": self.metrics.failed_connections,
                "total_queries": self.metrics.total_queries,
                "failed_queries": self.metrics.failed_queries,
                "avg_response_time": round(self.metrics.avg_response_time, 3),
                "error_rate": (
                    self.metrics.failed_queries / self.metrics.total_queries * 100
                    if self.metrics.total_queries > 0 else 0
                )
            },
            "last_health_check": (
                self.metrics.last_health_check.isoformat() 
                if self.metrics.last_health_check else None
            )
        }

class SessionManager:
    """Manages database sessions with proper lifecycle management"""
    
    def __init__(self, session_factory):
        self.session_factory = session_factory
        self.active_sessions = weakref.WeakSet()
        
    @asynccontextmanager
    async def get_session(self) -> AsyncContextManager[AsyncSession]:
        """Get a managed database session"""
        session = self.session_factory()
        self.active_sessions.add(session)
        
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Session error, rolling back: {e}")
            raise
        finally:
            await session.close()
    
    async def close_all_sessions(self):
        """Close all active sessions"""
        sessions_to_close = list(self.active_sessions)
        for session in sessions_to_close:
            try:
                await session.close()
            except Exception as e:
                logger.warning(f"Error closing session: {e}")

class ConnectionManager:
    """Advanced database connection manager"""
    
    def __init__(self, config: ConnectionConfig):
        self.config = config
        self.state = ConnectionState.DISCONNECTED
        self.engine: Optional[Engine] = None
        self.async_engine = None
        self.session_factory = None
        self.async_session_factory = None
        self.session_manager: Optional[SessionManager] = None
        self.monitor = ConnectionMonitor(self)
        self.health_check_task: Optional[asyncio.Task] = None
        self.reconnect_attempts = 0
        self.last_error: Optional[Exception] = None
        
    async def initialize(self) -> bool:
        """Initialize database connections"""
        try:
            self.state = ConnectionState.CONNECTING
            logger.info("Initializing database connection...")
            
            # Create engines
            await self._create_engines()
            
            # Test connection
            if await self._test_connection():
                self.state = ConnectionState.CONNECTED
                self.reconnect_attempts = 0
                logger.info("Database connection established successfully")
                
                # Start health monitoring
                if self.config.health_check_interval > 0:
                    self.health_check_task = asyncio.create_task(
                        self._health_check_loop()
                    )
                
                return True
            else:
                self.state = ConnectionState.ERROR
                return False
                
        except Exception as e:
            self.state = ConnectionState.ERROR
            self.last_error = e
            logger.error(f"Database connection initialization failed: {e}")
            return False
    
    async def _create_engines(self):
        """Create SQLAlchemy engines"""
        try:
            # Determine pool class based on database type
            if self.config.url.startswith('sqlite'):
                poolclass = StaticPool
                connect_args = {"check_same_thread": False}
            else:
                poolclass = QueuePool
                connect_args = {}
            
            # Create synchronous engine
            self.engine = create_engine(
                self.config.url,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                pool_timeout=self.config.pool_timeout,
                pool_recycle=self.config.pool_recycle,
                pool_pre_ping=self.config.pool_pre_ping,
                poolclass=poolclass,
                connect_args=connect_args,
                echo=self.config.echo
            )
            
            # Create asynchronous engine
            async_url = self._get_async_url()
            self.async_engine = create_async_engine(
                async_url,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                pool_timeout=self.config.pool_timeout,
                pool_recycle=self.config.pool_recycle,
                pool_pre_ping=self.config.pool_pre_ping,
                echo=self.config.echo
            )
            
            # Create session factories
            self.session_factory = sessionmaker(bind=self.engine)
            self.async_session_factory = async_sessionmaker(
                bind=self.async_engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            # Create session manager
            self.session_manager = SessionManager(self.async_session_factory)
            
            # Set up event listeners
            self._setup_event_listeners()
            
        except Exception as e:
            raise ConnectionException(
                message=f"Failed to create database engines: {e}",
                database_type=self._get_database_type(),
                operation="create_engine",
                inner_exception=e
            )
    
    def _get_async_url(self) -> str:
        """Convert sync URL to async URL"""
        url = self.config.url
        
        if url.startswith('sqlite:'):
            return url.replace('sqlite:', 'sqlite+aiosqlite:')
        elif url.startswith('postgresql:'):
            return url.replace('postgresql:', 'postgresql+asyncpg:')
        elif url.startswith('mysql:'):
            return url.replace('mysql:', 'mysql+aiomysql:')
        
        return url
    
    def _get_database_type(self) -> str:
        """Get database type from URL"""
        url = self.config.url.lower()
        if url.startswith('sqlite'):
            return 'sqlite'
        elif url.startswith('postgresql'):
            return 'postgresql'
        elif url.startswith('mysql'):
            return 'mysql'
        else:
            return 'unknown'
    
    def _setup_event_listeners(self):
        """Set up SQLAlchemy event listeners for monitoring"""
        
        @event.listens_for(self.engine, "connect")
        def receive_connect(dbapi_connection, connection_record):
            """Handle successful connection"""
            self.monitor.record_connection_attempt(success=True)
            logger.debug("Database connection established")
        
        @event.listens_for(self.engine, "checkout")
        def receive_checkout(dbapi_connection, connection_record, connection_proxy):
            """Handle connection checkout from pool"""
            pool_status = {
                'checked_out': self.engine.pool.checkedout(),
                'checked_in': self.engine.pool.checkedin()
            }
            self.monitor.update_pool_metrics(pool_status)
        
        @event.listens_for(self.engine, "before_cursor_execute")
        def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            """Track query start time"""
            context._query_start_time = datetime.now()
        
        @event.listens_for(self.engine, "after_cursor_execute")
        def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            """Track query completion"""
            if hasattr(context, '_query_start_time'):
                response_time = (datetime.now() - context._query_start_time).total_seconds()
                self.monitor.record_query(response_time, success=True)
    
    async def _test_connection(self) -> bool:
        """Test database connection"""
        try:
            async with self.async_engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            self.monitor.record_connection_attempt(success=False)
            return False
    
    async def _health_check_loop(self):
        """Continuous health check loop"""
        while self.state == ConnectionState.CONNECTED:
            try:
                await asyncio.sleep(self.config.health_check_interval)
                await self._perform_health_check()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health check error: {e}")
    
    async def _perform_health_check(self):
        """Perform health check"""
        try:
            # Test connection
            if await self._test_connection():
                self.monitor.metrics.last_health_check = datetime.now()
                logger.debug("Health check passed")
            else:
                logger.warning("Health check failed, attempting reconnection")
                await self._attempt_reconnection()
                
        except Exception as e:
            logger.error(f"Health check error: {e}")
            await self._attempt_reconnection()
    
    async def _attempt_reconnection(self):
        """Attempt to reconnect to database"""
        if self.state == ConnectionState.RECONNECTING:
            return  # Already reconnecting
        
        self.state = ConnectionState.RECONNECTING
        max_attempts = self.config.max_retries
        
        for attempt in range(1, max_attempts + 1):
            try:
                logger.info(f"Reconnection attempt {attempt}/{max_attempts}")
                
                # Close existing connections
                if self.async_engine:
                    await self.async_engine.dispose()
                if self.engine:
                    self.engine.dispose()
                
                # Recreate connections
                await self._create_engines()
                
                # Test new connection
                if await self._test_connection():
                    self.state = ConnectionState.CONNECTED
                    self.reconnect_attempts = 0
                    logger.info("Reconnection successful")
                    return
                
            except Exception as e:
                logger.error(f"Reconnection attempt {attempt} failed: {e}")
                if attempt < max_attempts:
                    await asyncio.sleep(self.config.retry_interval * attempt)
        
        # All reconnection attempts failed
        self.state = ConnectionState.ERROR
        self.reconnect_attempts += 1
        logger.error(f"All reconnection attempts failed")
    
    @asynccontextmanager
    async def get_session(self) -> AsyncContextManager[AsyncSession]:
        """Get a managed database session"""
        if self.state != ConnectionState.CONNECTED:
            raise ConnectionException(
                message=f"Database not connected. Current state: {self.state.value}",
                database_type=self._get_database_type(),
                operation="get_session"
            )
        
        if not self.session_manager:
            raise ConnectionException(
                message="Session manager not initialized",
                database_type=self._get_database_type(),
                operation="get_session"
            )
        
        async with self.session_manager.get_session() as session:
            yield session
    
    def get_sync_session(self) -> Session:
        """Get a synchronous session (for non-async operations)"""
        if self.state != ConnectionState.CONNECTED:
            raise ConnectionException(
                message=f"Database not connected. Current state: {self.state.value}",
                database_type=self._get_database_type(),
                operation="get_sync_session"
            )
        
        if not self.session_factory:
            raise ConnectionException(
                message="Session factory not initialized",
                database_type=self._get_database_type(),
                operation="get_sync_session"
            )
        
        return self.session_factory()
    
    async def execute_query(self, query: str, parameters: Dict[str, Any] = None) -> Any:
        """Execute a raw SQL query"""
        try:
            async with self.get_session() as session:
                result = await session.execute(text(query), parameters or {})
                return result
        except Exception as e:
            self.monitor.record_query(0, success=False)
            raise ConnectionException(
                message=f"Query execution failed: {e}",
                database_type=self._get_database_type(),
                operation="execute_query",
                inner_exception=e
            )
    
    def get_pool_status(self) -> Dict[str, Any]:
        """Get connection pool status"""
        if not self.engine:
            return {"status": "not_initialized"}
        
        pool = self.engine.pool
        return {
            "pool_size": pool.size(),
            "checked_out": pool.checkedout(),
            "checked_in": pool.checkedin(),
            "overflow": pool.overflow(),
            "invalid": pool.invalid(),
            "total_capacity": pool.size() + pool.overflow()
        }
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get comprehensive health status"""
        return {
            **self.monitor.get_health_status(),
            "pool_status": self.get_pool_status(),
            "reconnect_attempts": self.reconnect_attempts,
            "last_error": str(self.last_error) if self.last_error else None
        }
    
    async def close(self):
        """Close database connections"""
        try:
            logger.info("Closing database connections...")
            
            # Cancel health check task
            if self.health_check_task:
                self.health_check_task.cancel()
                try:
                    await self.health_check_task
                except asyncio.CancelledError:
                    pass
            
            # Close all active sessions
            if self.session_manager:
                await self.session_manager.close_all_sessions()
            
            # Dispose engines
            if self.async_engine:
                await self.async_engine.dispose()
            
            if self.engine:
                self.engine.dispose()
            
            self.state = ConnectionState.DISCONNECTED
            logger.info("Database connections closed")
            
        except Exception as e:
            logger.error(f"Error closing database connections: {e}")
            raise ConnectionException(
                message=f"Failed to close database connections: {e}",
                database_type=self._get_database_type(),
                operation="close",
                inner_exception=e
            )
    
    def __enter__(self):
        """Synchronous context manager entry"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Synchronous context manager exit"""
        # Note: Cannot call async close() in sync context
        # This should be handled by the application
        pass
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
