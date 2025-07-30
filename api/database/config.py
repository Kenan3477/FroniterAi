"""
Database Configuration and Connection Management

Comprehensive database configuration for PostgreSQL, SQLite, MongoDB, and Redis
with connection pooling, optimization, and environment-specific settings.
"""

import os
import sys
import asyncio
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass, asdict, field
import yaml
import json
from urllib.parse import quote_plus

# SQLAlchemy imports
from sqlalchemy import create_engine, MetaData, event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import QueuePool, NullPool, StaticPool

# Redis imports
import redis
from redis.connection import ConnectionPool as RedisConnectionPool

# MongoDB imports
import motor.motor_asyncio
from pymongo import MongoClient

# Import our models
from .models.base import Base, create_tables, get_all_models

logger = logging.getLogger(__name__)

@dataclass
class DatabaseCredentials:
    """Database credentials configuration"""
    username: str = ""
    password: str = ""
    host: str = "localhost"
    port: int = 5432
    database: str = "frontier_business"
    
    def get_connection_string(self, driver: str = "postgresql") -> str:
        """Generate connection string"""
        if driver == "postgresql":
            return f"postgresql://{self.username}:{quote_plus(self.password)}@{self.host}:{self.port}/{self.database}"
        elif driver == "postgresql+asyncpg":
            return f"postgresql+asyncpg://{self.username}:{quote_plus(self.password)}@{self.host}:{self.port}/{self.database}"
        elif driver == "sqlite":
            return f"sqlite:///{self.database}"
        else:
            raise ValueError(f"Unsupported driver: {driver}")

@dataclass
class ConnectionPoolConfig:
    """Database connection pool configuration"""
    pool_size: int = 10
    max_overflow: int = 20
    pool_pre_ping: bool = True
    pool_recycle: int = 3600  # 1 hour
    pool_timeout: int = 30
    
    # SQLite specific
    sqlite_check_same_thread: bool = False
    
    # PostgreSQL specific
    postgresql_connect_args: Dict[str, Any] = field(default_factory=lambda: {
        "connect_timeout": 30,
        "command_timeout": 60,
        "server_settings": {
            "jit": "off",
            "application_name": "frontier_business_api"
        }
    })

@dataclass
class RedisConfig:
    """Redis configuration"""
    host: str = "localhost"
    port: int = 6379
    password: str = ""
    database: int = 0
    max_connections: int = 50
    socket_timeout: int = 30
    socket_connect_timeout: int = 30
    retry_on_timeout: bool = True
    decode_responses: bool = True
    
    def get_connection_kwargs(self) -> Dict[str, Any]:
        """Get Redis connection kwargs"""
        return {
            "host": self.host,
            "port": self.port,
            "password": self.password if self.password else None,
            "db": self.database,
            "socket_timeout": self.socket_timeout,
            "socket_connect_timeout": self.socket_connect_timeout,
            "retry_on_timeout": self.retry_on_timeout,
            "decode_responses": self.decode_responses
        }

@dataclass
class MongoDBConfig:
    """MongoDB configuration"""
    host: str = "localhost"
    port: int = 27017
    username: str = ""
    password: str = ""
    database: str = "frontier_business"
    replica_set: Optional[str] = None
    auth_source: str = "admin"
    max_pool_size: int = 100
    min_pool_size: int = 1
    max_idle_time_ms: int = 30000
    server_selection_timeout_ms: int = 30000
    
    def get_connection_string(self) -> str:
        """Generate MongoDB connection string"""
        auth_part = ""
        if self.username and self.password:
            auth_part = f"{quote_plus(self.username)}:{quote_plus(self.password)}@"
        
        options = []
        if self.replica_set:
            options.append(f"replicaSet={self.replica_set}")
        if self.username:
            options.append(f"authSource={self.auth_source}")
        
        options_str = "&" + "&".join(options) if options else ""
        
        return f"mongodb://{auth_part}{self.host}:{self.port}/{self.database}?{options_str}"

@dataclass
class FrontierDatabaseConfig:
    """Main configuration class for Frontier database system"""
    
    # Environment settings
    environment: str = "development"
    debug: bool = False
    
    # Primary database settings
    primary_database: str = "postgresql"  # sqlite, postgresql
    enable_mongodb: bool = True
    enable_redis_cache: bool = True
    
    # Database credentials
    postgresql_credentials: DatabaseCredentials = field(default_factory=lambda: DatabaseCredentials(
        username="frontier_user",
        password="frontier_pass",
        host="localhost",
        port=5432,
        database="frontier_business"
    ))
    
    sqlite_path: str = "./data/frontier_business.db"
    
    # Connection pool settings
    pool_config: ConnectionPoolConfig = field(default_factory=ConnectionPoolConfig)
    
    # Redis configuration
    redis_config: RedisConfig = field(default_factory=RedisConfig)
    
    # MongoDB configuration
    mongodb_config: MongoDBConfig = field(default_factory=MongoDBConfig)
    
    # Backup settings
    backup_enabled: bool = True
    backup_schedule: str = "0 2 * * *"  # Daily at 2 AM
    backup_retention_days: int = 30
    backup_path: str = "./backups"
    
    # Migration settings
    migration_auto_apply: bool = False
    migration_backup_before: bool = True
    
    # Query optimization
    query_cache_enabled: bool = True
    query_cache_size: int = 1000
    slow_query_threshold: float = 1.0  # seconds
    
    
    @classmethod
    def from_env(cls) -> 'FrontierDatabaseConfig':
        """Create configuration from environment variables"""
        config = cls()
        
        # Environment settings
        config.environment = os.getenv('DATABASE_ENV', 'development')
        config.debug = os.getenv('DATABASE_DEBUG', 'false').lower() == 'true'
        
        # Primary database
        config.primary_database = os.getenv('PRIMARY_DATABASE', 'postgresql')
        config.enable_mongodb = os.getenv('ENABLE_MONGODB', 'true').lower() == 'true'
        config.enable_redis_cache = os.getenv('ENABLE_REDIS', 'true').lower() == 'true'
        
        # PostgreSQL credentials
        config.postgresql_credentials.username = os.getenv('POSTGRES_USER', 'frontier_user')
        config.postgresql_credentials.password = os.getenv('POSTGRES_PASSWORD', 'frontier_pass')
        config.postgresql_credentials.host = os.getenv('POSTGRES_HOST', 'localhost')
        config.postgresql_credentials.port = int(os.getenv('POSTGRES_PORT', '5432'))
        config.postgresql_credentials.database = os.getenv('POSTGRES_DB', 'frontier_business')
        
        # SQLite
        config.sqlite_path = os.getenv('SQLITE_PATH', './data/frontier_business.db')
        
        # Redis
        config.redis_config.host = os.getenv('REDIS_HOST', 'localhost')
        config.redis_config.port = int(os.getenv('REDIS_PORT', '6379'))
        config.redis_config.password = os.getenv('REDIS_PASSWORD', '')
        config.redis_config.database = int(os.getenv('REDIS_DB', '0'))
        
        # MongoDB
        config.mongodb_config.host = os.getenv('MONGO_HOST', 'localhost')
        config.mongodb_config.port = int(os.getenv('MONGO_PORT', '27017'))
        config.mongodb_config.username = os.getenv('MONGO_USER', '')
        config.mongodb_config.password = os.getenv('MONGO_PASSWORD', '')
        config.mongodb_config.database = os.getenv('MONGO_DB', 'frontier_business')
        
        # Connection pool
        config.pool_config.pool_size = int(os.getenv('DB_POOL_SIZE', '10'))
        config.pool_config.max_overflow = int(os.getenv('DB_MAX_OVERFLOW', '20'))
        config.pool_config.pool_timeout = int(os.getenv('DB_POOL_TIMEOUT', '30'))
        
        return config
    
    @classmethod
    def from_file(cls, config_path: str) -> 'FrontierDatabaseConfig':
        """Create configuration from YAML file"""
        with open(config_path, 'r') as f:
            config_data = yaml.safe_load(f)
        
        # Convert nested dicts to dataclass instances
        if 'postgresql_credentials' in config_data:
            config_data['postgresql_credentials'] = DatabaseCredentials(**config_data['postgresql_credentials'])
        
        if 'pool_config' in config_data:
            config_data['pool_config'] = ConnectionPoolConfig(**config_data['pool_config'])
        
        if 'redis_config' in config_data:
            config_data['redis_config'] = RedisConfig(**config_data['redis_config'])
        
        if 'mongodb_config' in config_data:
            config_data['mongodb_config'] = MongoDBConfig(**config_data['mongodb_config'])
        
        return cls(**config_data)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return asdict(self)
    
    def save_to_file(self, config_path: str):
        """Save configuration to YAML file"""
        config_dict = self.to_dict()
        with open(config_path, 'w') as f:
            yaml.dump(config_dict, f, default_flow_style=False)
    
    def validate(self) -> List[str]:
        """Validate configuration and return list of errors"""
        errors = []
        
        # Validate primary database
        if self.primary_database not in ['sqlite', 'postgresql']:
            errors.append(f"Invalid primary database: {self.primary_database}")
        
        # Validate PostgreSQL configuration
        if self.primary_database == 'postgresql':
            if not self.postgresql_credentials.username:
                errors.append("PostgreSQL username is required")
            if not self.postgresql_credentials.password:
                errors.append("PostgreSQL password is required")
            if not self.postgresql_credentials.host:
                errors.append("PostgreSQL host is required")
        
        # Validate SQLite path
        if self.primary_database == 'sqlite':
            sqlite_dir = Path(self.sqlite_path).parent
            if not sqlite_dir.exists():
                try:
                    sqlite_dir.mkdir(parents=True, exist_ok=True)
                except Exception as e:
                    errors.append(f"Cannot create SQLite directory: {e}")
        
        # Validate connection pool settings
        if self.pool_config.pool_size <= 0:
            errors.append("Pool size must be positive")
        
        if self.pool_config.max_overflow < 0:
            errors.append("Max overflow cannot be negative")
        
        return errors

class DatabaseManager:
    """Main database manager handling all database connections"""
    
    def __init__(self, config: FrontierDatabaseConfig):
        self.config = config
        self.engines = {}
        self.session_makers = {}
        self.redis_pool = None
        self.mongo_client = None
        self.mongo_db = None
        
        # Event handlers
        self._setup_event_handlers()
    
    def _setup_event_handlers(self):
        """Setup SQLAlchemy event handlers for monitoring"""
        if self.config.enable_performance_monitoring:
            @event.listens_for(Base.metadata, "column_reflect")
            def column_reflect(inspector, table, column_info):
                logger.debug(f"Reflecting column {column_info['name']} for table {table.name}")
            
            if self.config.log_slow_queries:
                @event.listens_for(Base.metadata.bind, "before_cursor_execute")
                def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
                    context._query_start_time = asyncio.get_event_loop().time()
                
                @event.listens_for(Base.metadata.bind, "after_cursor_execute")
                def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
                    total = asyncio.get_event_loop().time() - context._query_start_time
                    if total > self.config.slow_query_threshold:
                        logger.warning(f"Slow query ({total:.2f}s): {statement[:200]}...")
    
    async def initialize(self):
        """Initialize all database connections"""
        logger.info("Initializing database connections...")
        
        # Validate configuration
        errors = self.config.validate()
        if errors:
            raise ValueError(f"Configuration errors: {', '.join(errors)}")
        
        # Initialize primary database
        await self._initialize_primary_database()
        
        # Initialize Redis if enabled
        if self.config.enable_redis_cache:
            await self._initialize_redis()
        
        # Initialize MongoDB if enabled
        if self.config.enable_mongodb:
            await self._initialize_mongodb()
        
        logger.info("Database initialization completed successfully")
    
    async def _initialize_primary_database(self):
        """Initialize primary database (PostgreSQL or SQLite)"""
        if self.config.primary_database == "postgresql":
            await self._initialize_postgresql()
        elif self.config.primary_database == "sqlite":
            await self._initialize_sqlite()
        else:
            raise ValueError(f"Unsupported primary database: {self.config.primary_database}")
    
    async def _initialize_postgresql(self):
        """Initialize PostgreSQL connection"""
        logger.info("Initializing PostgreSQL connection...")
        
        # Synchronous engine
        sync_connection_string = self.config.postgresql_credentials.get_connection_string("postgresql")
        sync_engine = create_engine(
            sync_connection_string,
            poolclass=QueuePool,
            pool_size=self.config.pool_config.pool_size,
            max_overflow=self.config.pool_config.max_overflow,
            pool_pre_ping=self.config.pool_config.pool_pre_ping,
            pool_recycle=self.config.pool_config.pool_recycle,
            pool_timeout=self.config.pool_config.pool_timeout,
            connect_args=self.config.pool_config.postgresql_connect_args,
            echo=self.config.enable_query_logging
        )
        
        # Asynchronous engine
        async_connection_string = self.config.postgresql_credentials.get_connection_string("postgresql+asyncpg")
        async_engine = create_async_engine(
            async_connection_string,
            poolclass=QueuePool,
            pool_size=self.config.pool_config.pool_size,
            max_overflow=self.config.pool_config.max_overflow,
            pool_pre_ping=self.config.pool_config.pool_pre_ping,
            pool_recycle=self.config.pool_config.pool_recycle,
            pool_timeout=self.config.pool_config.pool_timeout,
            echo=self.config.enable_query_logging
        )
        
        self.engines['postgresql_sync'] = sync_engine
        self.engines['postgresql_async'] = async_engine
        self.engines['primary'] = sync_engine
        
        # Create session makers
        self.session_makers['postgresql_sync'] = scoped_session(
            sessionmaker(bind=sync_engine, expire_on_commit=False)
        )
        self.session_makers['postgresql_async'] = sessionmaker(
            async_engine, class_=AsyncSession, expire_on_commit=False
        )
        self.session_makers['primary'] = self.session_makers['postgresql_sync']
        
        # Test connection
        try:
            with sync_engine.connect() as conn:
                conn.execute("SELECT 1")
            logger.info("PostgreSQL connection successful")
        except Exception as e:
            logger.error(f"PostgreSQL connection failed: {e}")
            raise
        
        # Create tables
        await self._create_tables(sync_engine)
    
    async def _initialize_sqlite(self):
        """Initialize SQLite connection"""
        logger.info("Initializing SQLite connection...")
        
        # Ensure directory exists
        sqlite_path = Path(self.config.sqlite_path)
        sqlite_path.parent.mkdir(parents=True, exist_ok=True)
        
        # SQLite connection string
        connection_string = f"sqlite:///{self.config.sqlite_path}"
        
        # Create engine
        engine = create_engine(
            connection_string,
            poolclass=StaticPool if self.config.pool_config.sqlite_check_same_thread else NullPool,
            connect_args={"check_same_thread": self.config.pool_config.sqlite_check_same_thread},
            echo=self.config.enable_query_logging
        )
        
        self.engines['sqlite'] = engine
        self.engines['primary'] = engine
        
        # Create session maker
        self.session_makers['sqlite'] = scoped_session(
            sessionmaker(bind=engine, expire_on_commit=False)
        )
        self.session_makers['primary'] = self.session_makers['sqlite']
        
        # Test connection
        try:
            with engine.connect() as conn:
                conn.execute("SELECT 1")
            logger.info("SQLite connection successful")
        except Exception as e:
            logger.error(f"SQLite connection failed: {e}")
            raise
        
        # Create tables
        await self._create_tables(engine)
    
    async def _initialize_redis(self):
        """Initialize Redis connection"""
        logger.info("Initializing Redis connection...")
        
        try:
            # Create connection pool
            self.redis_pool = RedisConnectionPool(
                max_connections=self.config.redis_config.max_connections,
                **self.config.redis_config.get_connection_kwargs()
            )
            
            # Test connection
            redis_client = redis.Redis(connection_pool=self.redis_pool)
            await asyncio.get_event_loop().run_in_executor(None, redis_client.ping)
            
            logger.info("Redis connection successful")
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            self.redis_pool = None
            if self.config.environment == "production":
                raise
    
    async def _initialize_mongodb(self):
        """Initialize MongoDB connection"""
        logger.info("Initializing MongoDB connection...")
        
        try:
            # Create MongoDB client
            connection_string = self.config.mongodb_config.get_connection_string()
            self.mongo_client = motor.motor_asyncio.AsyncIOMotorClient(
                connection_string,
                maxPoolSize=self.config.mongodb_config.max_pool_size,
                minPoolSize=self.config.mongodb_config.min_pool_size,
                maxIdleTimeMS=self.config.mongodb_config.max_idle_time_ms,
                serverSelectionTimeoutMS=self.config.mongodb_config.server_selection_timeout_ms
            )
            
            # Get database
            self.mongo_db = self.mongo_client[self.config.mongodb_config.database]
            
            # Test connection
            await self.mongo_client.admin.command('ping')
            
            logger.info("MongoDB connection successful")
        except Exception as e:
            logger.error(f"MongoDB connection failed: {e}")
            self.mongo_client = None
            self.mongo_db = None
            if self.config.environment == "production":
                raise
    
    async def _create_tables(self, engine):
        """Create database tables"""
        logger.info("Creating database tables...")
        
        try:
            # Import all models to ensure they're registered
            from .models import *
            
            # Create all tables
            Base.metadata.create_all(engine)
            
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create database tables: {e}")
            raise
    
    def get_session(self, database: str = "primary"):
        """Get database session"""
        if database not in self.session_makers:
            raise ValueError(f"No session maker found for database: {database}")
        
        return self.session_makers[database]()
    
    def get_async_session(self, database: str = "primary"):
        """Get async database session"""
        session_maker_key = f"{database}_async"
        if session_maker_key not in self.session_makers:
            raise ValueError(f"No async session maker found for database: {database}")
        
        return self.session_makers[session_maker_key]()
    
    def get_redis_client(self) -> Optional[redis.Redis]:
        """Get Redis client"""
        if not self.redis_pool:
            return None
        
        return redis.Redis(connection_pool=self.redis_pool)
    
    def get_mongo_db(self):
        """Get MongoDB database"""
        return self.mongo_db
    
    async def close(self):
        """Close all database connections"""
        logger.info("Closing database connections...")
        
        # Close SQLAlchemy engines
        for name, engine in self.engines.items():
            if hasattr(engine, 'dispose'):
                engine.dispose()
                logger.debug(f"Closed {name} engine")
        
        # Close Redis pool
        if self.redis_pool:
            self.redis_pool.disconnect()
            logger.debug("Closed Redis connection pool")
        
        # Close MongoDB client
        if self.mongo_client:
            self.mongo_client.close()
            logger.debug("Closed MongoDB client")
        
        logger.info("All database connections closed")
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on all database connections"""
        health_status = {
            "overall": "healthy",
            "primary_database": {"status": "unknown", "type": self.config.primary_database},
            "redis": {"status": "disabled" if not self.config.enable_redis_cache else "unknown"},
            "mongodb": {"status": "disabled" if not self.config.enable_mongodb else "unknown"}
        }
        
        # Check primary database
        try:
            session = self.get_session()
            session.execute("SELECT 1")
            session.close()
            health_status["primary_database"]["status"] = "healthy"
        except Exception as e:
            health_status["primary_database"]["status"] = "unhealthy"
            health_status["primary_database"]["error"] = str(e)
            health_status["overall"] = "unhealthy"
        
        # Check Redis
        if self.config.enable_redis_cache and self.redis_pool:
            try:
                redis_client = self.get_redis_client()
                await asyncio.get_event_loop().run_in_executor(None, redis_client.ping)
                health_status["redis"]["status"] = "healthy"
            except Exception as e:
                health_status["redis"]["status"] = "unhealthy"
                health_status["redis"]["error"] = str(e)
        
        # Check MongoDB
        if self.config.enable_mongodb and self.mongo_client:
            try:
                await self.mongo_client.admin.command('ping')
                health_status["mongodb"]["status"] = "healthy"
            except Exception as e:
                health_status["mongodb"]["status"] = "unhealthy"
                health_status["mongodb"]["error"] = str(e)
        
        return health_status

# Global database manager instance
db_manager: Optional[DatabaseManager] = None

async def initialize_database(config: Optional[FrontierDatabaseConfig] = None) -> DatabaseManager:
    """Initialize global database manager"""
    global db_manager
    
    if config is None:
        config = FrontierDatabaseConfig.from_env()
    
    db_manager = DatabaseManager(config)
    await db_manager.initialize()
    
    return db_manager

def get_database_manager() -> DatabaseManager:
    """Get global database manager"""
    if db_manager is None:
        raise RuntimeError("Database manager not initialized. Call initialize_database() first.")
    
    return db_manager

async def close_database():
    """Close global database manager"""
    global db_manager
    
    if db_manager:
        await db_manager.close()
        db_manager = None
    mongodb_username: Optional[str] = None
    mongodb_password: Optional[str] = None
    
    # Redis settings
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: Optional[str] = None
    
    # Connection pooling
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600
    
    # Query optimization
    enable_query_caching: bool = True
    query_cache_ttl: int = 3600
    slow_query_threshold: float = 1.0
    
    # Backup settings
    enable_auto_backup: bool = True
    backup_schedule: str = "0 2 * * *"  # Daily at 2 AM
    backup_retention_days: int = 30
    backup_compression: bool = True
    backup_encryption: bool = False
    
    # Migration settings
    auto_upgrade: bool = True
    create_tables: bool = True
    load_seed_data: bool = True
    
    # Monitoring settings
    enable_monitoring: bool = True
    log_slow_queries: bool = True
    health_check_interval: int = 60
    
    @classmethod
    def from_env(cls) -> 'FrontierDatabaseConfig':
        """Create configuration from environment variables"""
        return cls(
            environment=os.getenv("FRONTIER_ENV", "development"),
            debug=os.getenv("DEBUG", "false").lower() == "true",
            
            primary_database=os.getenv("PRIMARY_DATABASE", "sqlite"),
            enable_mongodb=os.getenv("ENABLE_MONGODB", "true").lower() == "true",
            enable_redis_cache=os.getenv("ENABLE_REDIS_CACHE", "true").lower() == "true",
            
            sqlite_path=os.getenv("SQLITE_PATH", "./data/frontier_business.db"),
            postgresql_host=os.getenv("POSTGRES_HOST", "localhost"),
            postgresql_port=int(os.getenv("POSTGRES_PORT", "5432")),
            postgresql_database=os.getenv("POSTGRES_DB", "frontier_business"),
            postgresql_username=os.getenv("POSTGRES_USER", "frontier_user"),
            postgresql_password=os.getenv("POSTGRES_PASSWORD", "frontier_pass"),
            
            mongodb_host=os.getenv("MONGO_HOST", "localhost"),
            mongodb_port=int(os.getenv("MONGO_PORT", "27017")),
            mongodb_database=os.getenv("MONGO_DB", "frontier_business"),
            mongodb_username=os.getenv("MONGO_USER"),
            mongodb_password=os.getenv("MONGO_PASSWORD"),
            
            redis_host=os.getenv("REDIS_HOST", "localhost"),
            redis_port=int(os.getenv("REDIS_PORT", "6379")),
            redis_db=int(os.getenv("REDIS_DB", "0")),
            redis_password=os.getenv("REDIS_PASSWORD"),
            
            pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
            max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
            pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),
            pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "3600")),
            
            enable_query_caching=os.getenv("ENABLE_QUERY_CACHING", "true").lower() == "true",
            query_cache_ttl=int(os.getenv("QUERY_CACHE_TTL", "3600")),
            slow_query_threshold=float(os.getenv("SLOW_QUERY_THRESHOLD", "1.0")),
            
            enable_auto_backup=os.getenv("ENABLE_AUTO_BACKUP", "true").lower() == "true",
            backup_schedule=os.getenv("BACKUP_SCHEDULE", "0 2 * * *"),
            backup_retention_days=int(os.getenv("BACKUP_RETENTION_DAYS", "30")),
            backup_compression=os.getenv("BACKUP_COMPRESSION", "true").lower() == "true",
            backup_encryption=os.getenv("BACKUP_ENCRYPTION", "false").lower() == "true",
            
            auto_upgrade=os.getenv("AUTO_UPGRADE", "true").lower() == "true",
            create_tables=os.getenv("CREATE_TABLES", "true").lower() == "true",
            load_seed_data=os.getenv("LOAD_SEED_DATA", "true").lower() == "true",
            
            enable_monitoring=os.getenv("ENABLE_MONITORING", "true").lower() == "true",
            log_slow_queries=os.getenv("LOG_SLOW_QUERIES", "true").lower() == "true",
            health_check_interval=int(os.getenv("HEALTH_CHECK_INTERVAL", "60"))
        )
    
    @classmethod
    def from_file(cls, config_path: Path) -> 'FrontierDatabaseConfig':
        """Load configuration from YAML or JSON file"""
        if not config_path.exists():
            raise FileNotFoundError(f"Configuration file not found: {config_path}")
        
        with open(config_path, 'r') as f:
            if config_path.suffix.lower() in ['.yaml', '.yml']:
                data = yaml.safe_load(f)
            elif config_path.suffix.lower() == '.json':
                data = json.load(f)
            else:
                raise ValueError(f"Unsupported configuration file format: {config_path.suffix}")
        
        return cls(**data.get('database', {}))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return asdict(self)
    
    def save_to_file(self, config_path: Path):
        """Save configuration to file"""
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        config_data = {'database': self.to_dict()}
        
        with open(config_path, 'w') as f:
            if config_path.suffix.lower() in ['.yaml', '.yml']:
                yaml.dump(config_data, f, default_flow_style=False)
            elif config_path.suffix.lower() == '.json':
                json.dump(config_data, f, indent=2)
            else:
                raise ValueError(f"Unsupported configuration file format: {config_path.suffix}")

class DatabaseInitializer:
    """Handles complete database system initialization"""
    
    def __init__(self, config: FrontierDatabaseConfig):
        self.config = config
        self.db_manager = None
        self.migration_manager = None
        self.backup_manager = None
        self.connection_pool = None
        self.is_initialized = False
        
    async def initialize(self) -> bool:
        """Initialize complete database system"""
        try:
            logger.info("Starting Frontier database system initialization...")
            
            # Initialize database adapters
            await self._initialize_adapters()
            
            # Initialize connection pooling
            await self._initialize_connection_pool()
            
            # Run migrations if enabled
            if self.config.auto_upgrade:
                await self._run_migrations()
            
            # Initialize backup system
            if self.config.enable_auto_backup:
                await self._initialize_backup_system()
            
            # Load seed data if enabled
            if self.config.load_seed_data:
                await self._load_seed_data()
            
            self.is_initialized = True
            logger.info("Frontier database system initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            return False
    
    async def _initialize_adapters(self):
        """Initialize database adapters"""
        self.db_manager = DatabaseManager()
        
        # Initialize primary database
        await self.db_manager.initialize(
            primary_db=self.config.primary_database,
            enable_cache=self.config.enable_redis_cache
        )
        
        logger.info(f"Database adapters initialized with {self.config.primary_database}")
    
    async def _initialize_connection_pool(self):
        """Initialize connection pooling and optimization"""
        from .optimization import connection_pool
        
        # Configure connection pool
        pool_config = ConnectionPoolConfig(
            pool_size=self.config.pool_size,
            max_overflow=self.config.max_overflow,
            pool_timeout=self.config.pool_timeout,
            pool_recycle=self.config.pool_recycle,
            enable_monitoring=self.config.enable_monitoring,
            log_slow_queries=self.config.log_slow_queries,
            slow_query_threshold=self.config.slow_query_threshold,
            health_check_interval=self.config.health_check_interval
        )
        
        # Database configurations
        database_configs = self._get_database_configs()
        
        # Initialize connection pool
        connection_pool.config = pool_config
        await connection_pool.initialize(database_configs)
        
        self.connection_pool = connection_pool
        logger.info("Connection pool and optimization initialized")
    
    def _get_database_configs(self) -> Dict[str, Dict[str, Any]]:
        """Get database configurations for connection pool"""
        configs = {}
        
        if self.config.primary_database == "sqlite":
            configs["primary"] = {
                "type": "sqlite",
                "url": f"sqlite:///{self.config.sqlite_path}",
                "echo": self.config.debug
            }
        elif self.config.primary_database == "postgresql":
            configs["primary"] = {
                "type": "postgresql",
                "host": self.config.postgresql_host,
                "port": self.config.postgresql_port,
                "database": self.config.postgresql_database,
                "username": self.config.postgresql_username,
                "password": self.config.postgresql_password,
                "echo": self.config.debug
            }
        
        return configs
    
    async def _run_migrations(self):
        """Run database migrations"""
        self.migration_manager = MigrationManager()
        
        # Configure migration manager
        self.migration_manager.alembic_config.set_main_option(
            "sqlalchemy.url",
            self._get_primary_database_url()
        )
        
        # Create tables if enabled
        if self.config.create_tables:
            await self.migration_manager.create_all_tables()
        
        # Run pending migrations
        await self.migration_manager.upgrade_to_head()
        
        logger.info("Database migrations completed")
    
    def _get_primary_database_url(self) -> str:
        """Get primary database URL for migrations"""
        if self.config.primary_database == "sqlite":
            return f"sqlite:///{self.config.sqlite_path}"
        elif self.config.primary_database == "postgresql":
            return (
                f"postgresql://"
                f"{self.config.postgresql_username}:{self.config.postgresql_password}@"
                f"{self.config.postgresql_host}:{self.config.postgresql_port}/"
                f"{self.config.postgresql_database}"
            )
        else:
            raise ValueError(f"Unsupported primary database: {self.config.primary_database}")
    
    async def _initialize_backup_system(self):
        """Initialize backup and restore system"""
        from .backup import backup_manager
        
        # Configure backup manager
        backup_manager.config.auto_backup_enabled = self.config.enable_auto_backup
        backup_manager.config.backup_schedule = self.config.backup_schedule
        backup_manager.config.retention_days = self.config.backup_retention_days
        backup_manager.config.enable_compression = self.config.backup_compression
        backup_manager.config.enable_encryption = self.config.backup_encryption
        
        # Initialize backup system
        await backup_manager.initialize()
        
        self.backup_manager = backup_manager
        logger.info("Backup system initialized")
    
    async def _load_seed_data(self):
        """Load initial seed data"""
        if not self.migration_manager:
            self.migration_manager = MigrationManager()
        
        seed_manager = SeedDataManager()
        
        # Load seed data for primary database
        if self.config.primary_database == "sqlite":
            async with self.db_manager.get_session() as session:
                await seed_manager.load_seed_data(session)
        elif self.config.primary_database == "postgresql":
            async with self.db_manager.get_session() as session:
                await seed_manager.load_seed_data(session)
        
        logger.info("Seed data loaded successfully")
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform comprehensive health check"""
        if not self.is_initialized:
            return {"status": "not_initialized", "details": {}}
        
        health_status = {
            "status": "healthy",
            "timestamp": str(datetime.now()),
            "details": {}
        }
        
        try:
            # Check database adapters
            if self.db_manager:
                health_status["details"]["databases"] = await self.db_manager.health_check_all()
            
            # Check connection pool
            if self.connection_pool:
                health_status["details"]["connection_pool"] = await self.connection_pool.get_pool_status()
                health_status["details"]["performance"] = await self.connection_pool.get_performance_metrics()
            
            # Check backup system
            if self.backup_manager:
                # Simple check - could be expanded
                health_status["details"]["backup_system"] = {"status": "available"}
            
            # Determine overall status
            database_issues = any(
                db_health.get("status") != "healthy" 
                for db_health in health_status["details"].get("databases", {}).values()
            )
            
            if database_issues:
                health_status["status"] = "degraded"
            
        except Exception as e:
            health_status["status"] = "unhealthy"
            health_status["error"] = str(e)
        
        return health_status
    
    async def shutdown(self):
        """Graceful shutdown of database system"""
        logger.info("Shutting down Frontier database system...")
        
        try:
            # Shutdown backup manager
            if self.backup_manager:
                await self.backup_manager.shutdown()
            
            # Close connection pools
            if self.connection_pool:
                await self.connection_pool.close_all_pools()
            
            # Close database adapters
            if self.db_manager:
                await self.db_manager.close_all_connections()
            
            self.is_initialized = False
            logger.info("Database system shutdown completed")
            
        except Exception as e:
            logger.error(f"Error during database shutdown: {e}")

class DatabaseUtilities:
    """Utility functions for database operations"""
    
    @staticmethod
    async def export_data(db_manager: DatabaseManager, output_path: Path, 
                         format: str = "json") -> bool:
        """Export database data to file"""
        try:
            from .schema import Base
            
            export_data = {}
            
            async with db_manager.get_session() as session:
                # Export all tables
                for table in Base.metadata.tables.values():
                    result = await session.execute(text(f"SELECT * FROM {table.name}"))
                    rows = result.fetchall()
                    
                    export_data[table.name] = [
                        dict(row) for row in rows
                    ]
            
            # Save to file
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            if format.lower() == "json":
                with open(output_path, 'w') as f:
                    json.dump(export_data, f, indent=2, default=str)
            elif format.lower() == "yaml":
                with open(output_path, 'w') as f:
                    yaml.dump(export_data, f, default_flow_style=False)
            else:
                raise ValueError(f"Unsupported export format: {format}")
            
            logger.info(f"Data exported to: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Data export failed: {e}")
            return False
    
    @staticmethod
    async def import_data(db_manager: DatabaseManager, input_path: Path) -> bool:
        """Import database data from file"""
        try:
            if not input_path.exists():
                raise FileNotFoundError(f"Import file not found: {input_path}")
            
            # Load data
            with open(input_path, 'r') as f:
                if input_path.suffix.lower() == '.json':
                    import_data = json.load(f)
                elif input_path.suffix.lower() in ['.yaml', '.yml']:
                    import_data = yaml.safe_load(f)
                else:
                    raise ValueError(f"Unsupported import file format: {input_path.suffix}")
            
            async with db_manager.get_session() as session:
                # Import data for each table
                for table_name, rows in import_data.items():
                    if rows:  # Only process tables with data
                        # Clear existing data
                        await session.execute(text(f"DELETE FROM {table_name}"))
                        
                        # Insert new data
                        for row in rows:
                            columns = list(row.keys())
                            values = list(row.values())
                            placeholders = [f":{col}" for col in columns]
                            
                            insert_sql = (
                                f"INSERT INTO {table_name} ({', '.join(columns)}) "
                                f"VALUES ({', '.join(placeholders)})"
                            )
                            
                            await session.execute(text(insert_sql), row)
                
                await session.commit()
            
            logger.info(f"Data imported from: {input_path}")
            return True
            
        except Exception as e:
            logger.error(f"Data import failed: {e}")
            return False
    
    @staticmethod
    async def analyze_performance(connection_pool: ConnectionPool) -> Dict[str, Any]:
        """Analyze database performance"""
        try:
            metrics = await connection_pool.get_performance_metrics()
            
            analysis = {
                "timestamp": str(datetime.now()),
                "recommendations": [],
                "warnings": [],
                "metrics": metrics
            }
            
            # Analyze connection pool
            pool_status = metrics.get("pool_status", {})
            for db_name, status in pool_status.items():
                utilization = status["checked_out"] / (status["pool_size"] + status["overflow"])
                
                if utilization > 0.8:
                    analysis["warnings"].append(
                        f"High connection pool utilization for {db_name}: {utilization:.1%}"
                    )
                    analysis["recommendations"].append(
                        f"Consider increasing pool size for {db_name}"
                    )
            
            # Analyze query performance
            query_perf = metrics.get("query_performance", {})
            if query_perf.get("error_rate", 0) > 5:
                analysis["warnings"].append(
                    f"High query error rate: {query_perf['error_rate']:.1f}%"
                )
            
            if query_perf.get("average_response_time", 0) > 1.0:
                analysis["warnings"].append(
                    f"Slow average response time: {query_perf['average_response_time']:.3f}s"
                )
                analysis["recommendations"].append("Review slow queries and consider optimization")
            
            # Analyze cache performance
            cache_stats = metrics.get("cache_stats", {})
            if cache_stats.get("hit_rate", 0) < 50:
                analysis["recommendations"].append(
                    "Low cache hit rate - consider adjusting cache TTL or size"
                )
            
            return analysis
            
        except Exception as e:
            logger.error(f"Performance analysis failed: {e}")
            return {"error": str(e)}

# Global configuration and initializer
config = FrontierDatabaseConfig.from_env()
database_initializer = DatabaseInitializer(config)
