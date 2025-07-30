"""
Database Module Initialization

Entry point for the Frontier database system providing unified access
to all database components and utilities.
"""

from .config import (
    FrontierDatabaseConfig,
    DatabaseInitializer,
    DatabaseUtilities,
    config,
    database_initializer
)

from .schema import (
    Base,
    User,
    Company,
    Industry,
    FinancialStatement,
    FinancialAnalysis,
    ComplianceFramework,
    ComplianceRequirement,
    ComplianceAssessment,
    ComplianceAssessmentItem,
    CompliancePolicy,
    Risk,
    RiskCategory,
    RiskAssessment,
    MarketData,
    StrategicPlan,
    APIRequest,
    SystemConfiguration,
    DatabaseMigration
)

from .adapters import (
    DatabaseManager,
    SQLiteAdapter,
    PostgreSQLAdapter,
    MongoDBAdapter,
    db_manager
)

from .migrations import (
    MigrationManager,
    DataMigration,
    SeedDataManager
)

from .backup import (
    BackupManager,
    BackupConfig,
    BackupMetadata,
    backup_manager
)

from .optimization import (
    ConnectionPool,
    ConnectionPoolConfig,
    QueryCache,
    QueryCacheConfig,
    QueryPerformanceMonitor,
    connection_pool
)

# Version information
__version__ = "1.0.0"
__author__ = "Frontier Business Operations Team"

# Export main classes and functions
__all__ = [
    # Configuration
    "FrontierDatabaseConfig",
    "DatabaseInitializer", 
    "DatabaseUtilities",
    "config",
    "database_initializer",
    
    # Schema
    "Base",
    "User",
    "Company", 
    "Industry",
    "FinancialStatement",
    "FinancialAnalysis",
    "ComplianceFramework",
    "ComplianceRequirement",
    "ComplianceAssessment",
    "ComplianceAssessmentItem",
    "CompliancePolicy",
    "Risk",
    "RiskCategory", 
    "RiskAssessment",
    "MarketData",
    "StrategicPlan",
    "APIRequest",
    "SystemConfiguration",
    "DatabaseMigration",
    
    # Adapters
    "DatabaseManager",
    "SQLiteAdapter",
    "PostgreSQLAdapter", 
    "MongoDBAdapter",
    "db_manager",
    
    # Migrations
    "MigrationManager",
    "DataMigration",
    "SeedDataManager",
    
    # Backup
    "BackupManager",
    "BackupConfig",
    "BackupMetadata", 
    "backup_manager",
    
    # Optimization
    "ConnectionPool",
    "ConnectionPoolConfig",
    "QueryCache",
    "QueryCacheConfig",
    "QueryPerformanceMonitor",
    "connection_pool",
    
    # Utilities
    "initialize_database",
    "get_session",
    "health_check",
    "shutdown_database"
]

# Convenience functions for common operations
async def initialize_database(config_override: dict = None) -> bool:
    """Initialize the complete database system"""
    global database_initializer
    
    if config_override:
        # Update configuration with overrides
        for key, value in config_override.items():
            setattr(database_initializer.config, key, value)
    
    return await database_initializer.initialize()

async def get_session(database: str = "primary"):
    """Get a database session"""
    if not database_initializer.is_initialized:
        raise RuntimeError("Database system not initialized. Call initialize_database() first.")
    
    return database_initializer.connection_pool.get_session(database)

async def health_check() -> dict:
    """Perform system health check"""
    if not database_initializer.is_initialized:
        return {"status": "not_initialized"}
    
    return await database_initializer.health_check()

async def shutdown_database():
    """Shutdown the database system"""
    if database_initializer.is_initialized:
        await database_initializer.shutdown()

# Quick start function for development
async def quick_start(primary_db: str = "sqlite", debug: bool = False) -> bool:
    """Quick start database system with minimal configuration"""
    config_override = {
        "primary_database": primary_db,
        "debug": debug,
        "create_tables": True,
        "load_seed_data": True,
        "enable_monitoring": debug
    }
    
    return await initialize_database(config_override)
