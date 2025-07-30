"""
Database Connection Adapters for Multiple Database Backends

Supports SQLite (development), PostgreSQL (production), and MongoDB (document storage)
with connection pooling, optimization, and failover capabilities.
"""

import os
import sys
import asyncio
import logging
from typing import Dict, Any, Optional, List, Union
from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
from pathlib import Path
import json
from datetime import datetime, timedelta

# SQLAlchemy imports
from sqlalchemy import create_engine, text, pool
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool, NullPool, StaticPool

# MongoDB imports
try:
    from motor.motor_asyncio import AsyncIOMotorClient
    from pymongo import MongoClient
    from pymongo.errors import ConnectionFailure, OperationFailure
    MONGODB_AVAILABLE = True
except ImportError:
    MONGODB_AVAILABLE = False

# Redis imports for caching and session storage
try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)

class DatabaseConfig:
    """Database configuration with environment-based settings"""
    
    def __init__(self):
        self.sqlite_config = {
            "url": os.getenv("SQLITE_URL", "sqlite:///frontier_business.db"),
            "echo": os.getenv("DB_ECHO", "false").lower() == "true",
            "pool_pre_ping": True,
            "pool_recycle": 3600,
            "connect_args": {
                "check_same_thread": False,
                "timeout": 30
            }
        }
        
        self.postgresql_config = {
            "host": os.getenv("POSTGRES_HOST", "localhost"),
            "port": int(os.getenv("POSTGRES_PORT", "5432")),
            "database": os.getenv("POSTGRES_DB", "frontier_business"),
            "username": os.getenv("POSTGRES_USER", "frontier_user"),
            "password": os.getenv("POSTGRES_PASSWORD", "frontier_pass"),
            "pool_size": int(os.getenv("POSTGRES_POOL_SIZE", "10")),
            "max_overflow": int(os.getenv("POSTGRES_MAX_OVERFLOW", "20")),
            "pool_timeout": int(os.getenv("POSTGRES_POOL_TIMEOUT", "30")),
            "pool_recycle": int(os.getenv("POSTGRES_POOL_RECYCLE", "3600")),
            "echo": os.getenv("DB_ECHO", "false").lower() == "true"
        }
        
        self.mongodb_config = {
            "host": os.getenv("MONGO_HOST", "localhost"),
            "port": int(os.getenv("MONGO_PORT", "27017")),
            "database": os.getenv("MONGO_DB", "frontier_business"),
            "username": os.getenv("MONGO_USER"),
            "password": os.getenv("MONGO_PASSWORD"),
            "auth_source": os.getenv("MONGO_AUTH_SOURCE", "admin"),
            "replica_set": os.getenv("MONGO_REPLICA_SET"),
            "max_pool_size": int(os.getenv("MONGO_MAX_POOL_SIZE", "10")),
            "min_pool_size": int(os.getenv("MONGO_MIN_POOL_SIZE", "1")),
            "max_idle_time_ms": int(os.getenv("MONGO_MAX_IDLE_TIME", "30000")),
            "connect_timeout_ms": int(os.getenv("MONGO_CONNECT_TIMEOUT", "10000"))
        }
        
        self.redis_config = {
            "host": os.getenv("REDIS_HOST", "localhost"),
            "port": int(os.getenv("REDIS_PORT", "6379")),
            "db": int(os.getenv("REDIS_DB", "0")),
            "password": os.getenv("REDIS_PASSWORD"),
            "max_connections": int(os.getenv("REDIS_MAX_CONNECTIONS", "10")),
            "retry_on_timeout": True,
            "health_check_interval": 30
        }

class BaseAdapter(ABC):
    """Base class for database adapters"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.connection = None
        self.is_connected = False
        
    @abstractmethod
    async def connect(self) -> bool:
        """Establish database connection"""
        pass
    
    @abstractmethod
    async def disconnect(self) -> bool:
        """Close database connection"""
        pass
    
    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """Check database health and connectivity"""
        pass
    
    @abstractmethod
    async def execute_query(self, query: str, params: Dict[str, Any] = None) -> Any:
        """Execute a database query"""
        pass

class SQLiteAdapter(BaseAdapter):
    """SQLite database adapter with connection pooling"""
    
    def __init__(self, config: DatabaseConfig):
        super().__init__(config.sqlite_config)
        self.engine = None
        self.async_engine = None
        self.SessionLocal = None
        self.AsyncSessionLocal = None
        
    async def connect(self) -> bool:
        """Establish SQLite connection with proper configuration"""
        try:
            # Synchronous engine
            self.engine = create_engine(
                self.config["url"],
                echo=self.config["echo"],
                pool_pre_ping=self.config["pool_pre_ping"],
                pool_recycle=self.config["pool_recycle"],
                poolclass=StaticPool,  # Better for SQLite
                connect_args=self.config["connect_args"]
            )
            
            # Asynchronous engine
            async_url = self.config["url"].replace("sqlite://", "sqlite+aiosqlite://")
            self.async_engine = create_async_engine(
                async_url,
                echo=self.config["echo"],
                pool_pre_ping=True,
                connect_args={"check_same_thread": False}
            )
            
            # Session makers
            self.SessionLocal = sessionmaker(bind=self.engine)
            self.AsyncSessionLocal = async_sessionmaker(
                bind=self.async_engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            # Test connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            self.is_connected = True
            logger.info("SQLite connection established successfully")
            return True
            
        except Exception as e:
            logger.error(f"SQLite connection failed: {e}")
            return False
    
    async def disconnect(self) -> bool:
        """Close SQLite connections"""
        try:
            if self.engine:
                self.engine.dispose()
            if self.async_engine:
                await self.async_engine.dispose()
            
            self.is_connected = False
            logger.info("SQLite connection closed")
            return True
            
        except Exception as e:
            logger.error(f"Error closing SQLite connection: {e}")
            return False
    
    async def health_check(self) -> Dict[str, Any]:
        """Check SQLite database health"""
        try:
            start_time = datetime.now()
            
            if self.engine:
                with self.engine.connect() as conn:
                    result = conn.execute(text("SELECT 1"))
                    result.fetchone()
            
            response_time = (datetime.now() - start_time).total_seconds()
            
            # Get database file info
            db_path = self.config["url"].replace("sqlite:///", "")
            db_file = Path(db_path)
            
            return {
                "status": "healthy",
                "response_time_seconds": response_time,
                "database_exists": db_file.exists(),
                "database_size_bytes": db_file.stat().st_size if db_file.exists() else 0,
                "connection_pool_size": "N/A (SQLite)",
                "active_connections": "N/A (SQLite)"
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "response_time_seconds": None
            }
    
    async def execute_query(self, query: str, params: Dict[str, Any] = None) -> Any:
        """Execute SQLite query"""
        try:
            async with self.AsyncSessionLocal() as session:
                result = await session.execute(text(query), params or {})
                await session.commit()
                return result
                
        except Exception as e:
            logger.error(f"SQLite query execution failed: {e}")
            raise
    
    @asynccontextmanager
    async def get_session(self):
        """Get async database session"""
        async with self.AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

class PostgreSQLAdapter(BaseAdapter):
    """PostgreSQL database adapter with advanced connection pooling"""
    
    def __init__(self, config: DatabaseConfig):
        super().__init__(config.postgresql_config)
        self.engine = None
        self.async_engine = None
        self.SessionLocal = None
        self.AsyncSessionLocal = None
        
    def _build_url(self, async_driver: bool = False) -> str:
        """Build PostgreSQL connection URL"""
        driver = "postgresql+asyncpg" if async_driver else "postgresql+psycopg2"
        
        return (
            f"{driver}://"
            f"{self.config['username']}:{self.config['password']}@"
            f"{self.config['host']}:{self.config['port']}/"
            f"{self.config['database']}"
        )
    
    async def connect(self) -> bool:
        """Establish PostgreSQL connection with connection pooling"""
        try:
            # Synchronous engine with connection pooling
            self.engine = create_engine(
                self._build_url(async_driver=False),
                echo=self.config["echo"],
                pool_size=self.config["pool_size"],
                max_overflow=self.config["max_overflow"],
                pool_timeout=self.config["pool_timeout"],
                pool_recycle=self.config["pool_recycle"],
                pool_pre_ping=True,
                poolclass=QueuePool
            )
            
            # Asynchronous engine
            self.async_engine = create_async_engine(
                self._build_url(async_driver=True),
                echo=self.config["echo"],
                pool_size=self.config["pool_size"],
                max_overflow=self.config["max_overflow"],
                pool_timeout=self.config["pool_timeout"],
                pool_recycle=self.config["pool_recycle"],
                pool_pre_ping=True
            )
            
            # Session makers
            self.SessionLocal = sessionmaker(bind=self.engine)
            self.AsyncSessionLocal = async_sessionmaker(
                bind=self.async_engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            # Test connection
            async with self.async_engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            
            self.is_connected = True
            logger.info("PostgreSQL connection established successfully")
            return True
            
        except Exception as e:
            logger.error(f"PostgreSQL connection failed: {e}")
            return False
    
    async def disconnect(self) -> bool:
        """Close PostgreSQL connections"""
        try:
            if self.engine:
                self.engine.dispose()
            if self.async_engine:
                await self.async_engine.dispose()
            
            self.is_connected = False
            logger.info("PostgreSQL connection closed")
            return True
            
        except Exception as e:
            logger.error(f"Error closing PostgreSQL connection: {e}")
            return False
    
    async def health_check(self) -> Dict[str, Any]:
        """Check PostgreSQL database health"""
        try:
            start_time = datetime.now()
            
            async with self.async_engine.begin() as conn:
                # Basic connectivity test
                result = await conn.execute(text("SELECT 1"))
                result.fetchone()
                
                # Get database statistics
                stats_query = """
                SELECT 
                    datname,
                    numbackends,
                    xact_commit,
                    xact_rollback,
                    blks_read,
                    blks_hit,
                    tup_returned,
                    tup_fetched,
                    tup_inserted,
                    tup_updated,
                    tup_deleted
                FROM pg_stat_database 
                WHERE datname = current_database()
                """
                stats_result = await conn.execute(text(stats_query))
                db_stats = stats_result.fetchone()
            
            response_time = (datetime.now() - start_time).total_seconds()
            
            # Connection pool info
            pool_info = {
                "pool_size": self.async_engine.pool.size(),
                "checked_in": self.async_engine.pool.checkedin(),
                "checked_out": self.async_engine.pool.checkedout(),
                "overflow": self.async_engine.pool.overflow(),
                "invalid": self.async_engine.pool.invalid()
            }
            
            return {
                "status": "healthy",
                "response_time_seconds": response_time,
                "database_stats": dict(db_stats) if db_stats else None,
                "connection_pool": pool_info
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "response_time_seconds": None
            }
    
    async def execute_query(self, query: str, params: Dict[str, Any] = None) -> Any:
        """Execute PostgreSQL query"""
        try:
            async with self.AsyncSessionLocal() as session:
                result = await session.execute(text(query), params or {})
                await session.commit()
                return result
                
        except Exception as e:
            logger.error(f"PostgreSQL query execution failed: {e}")
            raise
    
    @asynccontextmanager
    async def get_session(self):
        """Get async database session"""
        async with self.AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

class MongoDBAdapter(BaseAdapter):
    """MongoDB adapter for document storage"""
    
    def __init__(self, config: DatabaseConfig):
        super().__init__(config.mongodb_config)
        self.client = None
        self.database = None
        
    def _build_uri(self) -> str:
        """Build MongoDB connection URI"""
        if self.config["username"] and self.config["password"]:
            auth_part = f"{self.config['username']}:{self.config['password']}@"
        else:
            auth_part = ""
        
        uri = f"mongodb://{auth_part}{self.config['host']}:{self.config['port']}"
        
        # Add connection options
        options = []
        if self.config["auth_source"]:
            options.append(f"authSource={self.config['auth_source']}")
        if self.config["replica_set"]:
            options.append(f"replicaSet={self.config['replica_set']}")
        
        options.extend([
            f"maxPoolSize={self.config['max_pool_size']}",
            f"minPoolSize={self.config['min_pool_size']}",
            f"maxIdleTimeMS={self.config['max_idle_time_ms']}",
            f"connectTimeoutMS={self.config['connect_timeout_ms']}"
        ])
        
        if options:
            uri += "?" + "&".join(options)
        
        return uri
    
    async def connect(self) -> bool:
        """Establish MongoDB connection"""
        if not MONGODB_AVAILABLE:
            logger.error("MongoDB libraries not available")
            return False
        
        try:
            self.client = AsyncIOMotorClient(self._build_uri())
            self.database = self.client[self.config["database"]]
            
            # Test connection
            await self.client.admin.command('ping')
            
            self.is_connected = True
            logger.info("MongoDB connection established successfully")
            return True
            
        except Exception as e:
            logger.error(f"MongoDB connection failed: {e}")
            return False
    
    async def disconnect(self) -> bool:
        """Close MongoDB connection"""
        try:
            if self.client:
                self.client.close()
            
            self.is_connected = False
            logger.info("MongoDB connection closed")
            return True
            
        except Exception as e:
            logger.error(f"Error closing MongoDB connection: {e}")
            return False
    
    async def health_check(self) -> Dict[str, Any]:
        """Check MongoDB health"""
        try:
            start_time = datetime.now()
            
            # Ping test
            await self.client.admin.command('ping')
            
            # Get server status
            server_status = await self.client.admin.command('serverStatus')
            
            # Get database stats
            db_stats = await self.database.command('dbStats')
            
            response_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "status": "healthy",
                "response_time_seconds": response_time,
                "server_version": server_status.get("version"),
                "database_stats": {
                    "collections": db_stats.get("collections"),
                    "objects": db_stats.get("objects"),
                    "data_size": db_stats.get("dataSize"),
                    "storage_size": db_stats.get("storageSize")
                },
                "connection_pool": {
                    "current_connections": server_status.get("connections", {}).get("current"),
                    "available_connections": server_status.get("connections", {}).get("available")
                }
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "response_time_seconds": None
            }
    
    async def execute_query(self, collection: str, operation: str, filter_doc: Dict[str, Any] = None, 
                          document: Dict[str, Any] = None, **kwargs) -> Any:
        """Execute MongoDB operation"""
        try:
            coll = self.database[collection]
            
            if operation == "find":
                return await coll.find(filter_doc or {}, **kwargs).to_list(length=None)
            elif operation == "find_one":
                return await coll.find_one(filter_doc or {}, **kwargs)
            elif operation == "insert_one":
                return await coll.insert_one(document, **kwargs)
            elif operation == "insert_many":
                return await coll.insert_many(document, **kwargs)
            elif operation == "update_one":
                return await coll.update_one(filter_doc, document, **kwargs)
            elif operation == "update_many":
                return await coll.update_many(filter_doc, document, **kwargs)
            elif operation == "delete_one":
                return await coll.delete_one(filter_doc, **kwargs)
            elif operation == "delete_many":
                return await coll.delete_many(filter_doc, **kwargs)
            elif operation == "aggregate":
                return await coll.aggregate(document, **kwargs).to_list(length=None)
            else:
                raise ValueError(f"Unsupported operation: {operation}")
                
        except Exception as e:
            logger.error(f"MongoDB operation failed: {e}")
            raise

class DatabaseManager:
    """Manages multiple database connections and provides unified interface"""
    
    def __init__(self):
        self.config = DatabaseConfig()
        self.adapters = {}
        self.primary_adapter = None
        self.cache_adapter = None
        
    async def initialize(self, primary_db: str = "sqlite", enable_cache: bool = True) -> bool:
        """Initialize database connections"""
        try:
            # Initialize primary database
            if primary_db == "sqlite":
                self.adapters["sqlite"] = SQLiteAdapter(self.config)
                self.primary_adapter = self.adapters["sqlite"]
            elif primary_db == "postgresql":
                self.adapters["postgresql"] = PostgreSQLAdapter(self.config)
                self.primary_adapter = self.adapters["postgresql"]
            else:
                raise ValueError(f"Unsupported primary database: {primary_db}")
            
            # Connect to primary database
            if not await self.primary_adapter.connect():
                return False
            
            # Initialize MongoDB for document storage if available
            if MONGODB_AVAILABLE:
                self.adapters["mongodb"] = MongoDBAdapter(self.config)
                await self.adapters["mongodb"].connect()
            
            # Initialize Redis for caching if available and enabled
            if enable_cache and REDIS_AVAILABLE:
                try:
                    self.cache_adapter = redis.Redis(**self.config.redis_config)
                    await self.cache_adapter.ping()
                    logger.info("Redis cache connection established")
                except Exception as e:
                    logger.warning(f"Redis cache connection failed: {e}")
            
            logger.info(f"Database manager initialized with {primary_db} as primary")
            return True
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            return False
    
    async def close_all_connections(self) -> bool:
        """Close all database connections"""
        success = True
        
        for name, adapter in self.adapters.items():
            try:
                await adapter.disconnect()
            except Exception as e:
                logger.error(f"Error closing {name} connection: {e}")
                success = False
        
        if self.cache_adapter:
            try:
                await self.cache_adapter.close()
            except Exception as e:
                logger.error(f"Error closing cache connection: {e}")
                success = False
        
        return success
    
    async def health_check_all(self) -> Dict[str, Any]:
        """Check health of all database connections"""
        results = {}
        
        for name, adapter in self.adapters.items():
            results[name] = await adapter.health_check()
        
        if self.cache_adapter:
            try:
                start_time = datetime.now()
                await self.cache_adapter.ping()
                response_time = (datetime.now() - start_time).total_seconds()
                
                results["redis"] = {
                    "status": "healthy",
                    "response_time_seconds": response_time
                }
            except Exception as e:
                results["redis"] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
        
        return results
    
    @asynccontextmanager
    async def get_session(self, database: str = "primary"):
        """Get database session"""
        if database == "primary":
            adapter = self.primary_adapter
        else:
            adapter = self.adapters.get(database)
        
        if not adapter:
            raise ValueError(f"Database adapter '{database}' not found")
        
        async with adapter.get_session() as session:
            yield session
    
    def get_mongodb_database(self):
        """Get MongoDB database instance"""
        mongodb_adapter = self.adapters.get("mongodb")
        if mongodb_adapter and mongodb_adapter.is_connected:
            return mongodb_adapter.database
        return None
    
    def get_cache_client(self):
        """Get Redis cache client"""
        return self.cache_adapter

# Global database manager instance
db_manager = DatabaseManager()
