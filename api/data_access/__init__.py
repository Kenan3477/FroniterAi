"""
Data Access Layer for Frontier Business Operations

Provides a comprehensive data access layer implementing the repository pattern,
ORM mappings, CRUD operations, transaction management, and caching.
"""

from .models import *
from .exceptions import *
from .validators import *
from .connection_manager import *
from .cache_manager import *
from .query_builder import *
from .base_repository import *
from .repositories import *
from .unit_of_work import *

# Version information
__version__ = "1.0.0"
__author__ = "Frontier Data Access Team"

# Main exports
__all__ = [
    # Core infrastructure
    "UnitOfWork",
    "UnitOfWorkFactory",
    "CacheManager",
    "ConnectionManager",
    "QueryBuilder",
    "BaseRepository",
    
    # Models (ORM entities)
    "BaseModel",
    "UserModel",
    "CompanyModel",
    "IndustryModel",
    "EntityTypeModel",
    "StateModel",
    "CountryModel",
    "ServiceModel",
    "FinancialStatementModel",
    "ComplianceFrameworkModel",
    "RiskModel",
    "AuditLogModel",
    "DocumentModel",
    "NotificationModel",
    "SubscriptionModel",
    "PaymentModel",
    "SupportTicketModel",
    "CompanyIndustryModel",
    "CompanyServiceModel",
    "UserRoleModel",
    
    # Repositories
    "UserRepository",
    "CompanyRepository", 
    "FinancialStatementRepository",
    "ComplianceFrameworkRepository",
    "RiskRepository",
    "DocumentRepository",
    "AuditLogRepository",
    
    # Validators
    "BaseValidator",
    "UserValidator",
    "CompanyValidator",
    "FinancialValidator",
    "ComplianceValidator",
    "RiskValidator",
    "CommonValidators",
    "ValidationRule",
    "FieldValidator",
    "ValidatorFactory",
    
    # Exceptions
    "DataAccessException",
    "ValidationException",
    "RepositoryException",
    "TransactionException",
    "UnitOfWorkException",
    "CacheException",
    "EntityNotFoundException",
    "DuplicateEntityException",
    "ConcurrencyException",
    
    # Query Builder
    "QueryBuilder",
    "QueryBuilderFactory",
    "QueryResult",
    "FilterOperator",
    "SortDirection",
    "JoinType",
    "FilterCondition",
    "SortCondition",
    "JoinCondition",
    "PaginationParams",
    
    # Cache Management
    "CacheConfig",
    "CacheBackend",
    "CacheStats",
    "MemoryCacheBackend",
    "RedisCacheBackend",
    
    # Connection Management
    "ConnectionConfig",
    "ConnectionMonitor",
    "SessionManager",
    
    # Configuration
    "RepositoryConfig",
    "UnitOfWorkConfig",
    
    # Utility functions
    "configure_data_access",
    "create_unit_of_work",
    "get_repository",
    "initialize_data_access",
    "create_all_tables",
    "health_check"
]

# Core configuration function
def configure_data_access(
    database_url: str,
    cache_backend: str = "memory",
    enable_logging: bool = True,
    pool_size: int = 10,
    max_overflow: int = 20
):
    """
    Configure the data access layer with database and cache settings
    
    Args:
        database_url: Database connection string
        cache_backend: Cache backend type ('memory', 'redis')
        enable_logging: Enable SQL query logging
        pool_size: Database connection pool size
        max_overflow: Maximum connection pool overflow
    
    Returns:
        Configured connection manager and cache manager
    """
    from .connection_manager import ConnectionManager, ConnectionConfig
    from .cache_manager import CacheManager, CacheConfig, CacheBackend
    
    # Configure database connection
    db_config = ConnectionConfig(
        database_url=database_url,
        pool_size=pool_size,
        max_overflow=max_overflow,
        enable_logging=enable_logging
    )
    
    connection_manager = ConnectionManager(db_config)
    
    # Configure cache
    cache_config = CacheConfig(
        backend=CacheBackend(cache_backend)
    )
    
    cache_manager = CacheManager(cache_config)
    
    return connection_manager, cache_manager

# Factory functions for dependency injection
def create_unit_of_work(connection_manager, cache_manager=None):
    """Create Unit of Work instance"""
    from .unit_of_work import UnitOfWorkFactory
    
    return UnitOfWorkFactory(
        connection_manager=connection_manager,
        cache_manager=cache_manager
    )

def get_repository(repository_class, session, cache_manager=None):
    """Get repository instance"""
    return repository_class(
        session=session,
        cache_manager=cache_manager
    )

# Async initialization function
async def initialize_data_access(
    database_url: str,
    cache_backend: str = "memory",
    enable_logging: bool = True,
    pool_size: int = 10,
    max_overflow: int = 20
):
    """
    Initialize the complete data access layer
    
    Returns:
        Tuple of (connection_manager, cache_manager, unit_of_work_factory)
    """
    # Configure components
    connection_manager, cache_manager = configure_data_access(
        database_url=database_url,
        cache_backend=cache_backend,
        enable_logging=enable_logging,
        pool_size=pool_size,
        max_overflow=max_overflow
    )
    
    # Initialize connection manager
    await connection_manager.initialize()
    
    # Initialize cache manager
    await cache_manager.initialize()
    
    # Create unit of work factory
    uow_factory = create_unit_of_work(connection_manager, cache_manager)
    
    return connection_manager, cache_manager, uow_factory

# Convenience function for creating database tables
async def create_all_tables(connection_manager):
    """Create all database tables"""
    from .models import BaseModel
    
    async with connection_manager.get_engine() as engine:
        async with engine.begin() as conn:
            await conn.run_sync(BaseModel.metadata.create_all)

# Health check function
async def health_check(connection_manager, cache_manager=None):
    """Check health of data access components"""
    health_status = {
        'database': False,
        'cache': False,
        'overall': False
    }
    
    try:
        # Check database
        health_status['database'] = await connection_manager.health_check()
        
        # Check cache
        if cache_manager:
            cache_stats = cache_manager.get_stats()
            health_status['cache'] = not cache_stats.get('error', False)
        else:
            health_status['cache'] = True
        
        # Overall health
        health_status['overall'] = health_status['database'] and health_status['cache']
        
    except Exception as e:
        health_status['error'] = str(e)
    
    return health_status
