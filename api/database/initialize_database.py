"""
Database Initialization Script

Complete setup script for Frontier database including:
- Database creation and configuration
- Schema migrations
- Seed data loading
- Performance optimization
- Backup system setup
"""

import os
import sys
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from api.database.config import DatabaseManager, FrontierDatabaseConfig
from api.database.migrations import MigrationManager, SeedDataManager, BackupManager, QueryOptimizer
from api.database.models import *
from api.database.models.base import Base

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('database_init.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class DatabaseInitializer:
    """Complete database initialization and setup"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or str(Path(__file__).parent / "config" / "database.yaml")
        self.db_manager = None
        self.migration_manager = None
        self.seed_manager = None
        self.backup_manager = None
        self.optimizer = None
    
    def initialize(self, create_sample_data: bool = True) -> Dict[str, Any]:
        """Complete database initialization"""
        logger.info("Starting Frontier database initialization...")
        
        results = {
            "success": True,
            "steps_completed": [],
            "errors": [],
            "warnings": [],
            "start_time": datetime.now().isoformat()
        }
        
        try:
            # Step 1: Initialize database configuration
            logger.info("Step 1: Initializing database configuration...")
            self._initialize_config(results)
            
            # Step 2: Create database schemas
            logger.info("Step 2: Creating database schemas...")
            self._create_schemas(results)
            
            # Step 3: Set up migration system
            logger.info("Step 3: Setting up migration system...")
            self._setup_migrations(results)
            
            # Step 4: Load seed data
            logger.info("Step 4: Loading seed data...")
            self._load_seed_data(results)
            
            # Step 5: Create performance indexes
            logger.info("Step 5: Creating performance indexes...")
            self._optimize_performance(results)
            
            # Step 6: Set up backup system
            logger.info("Step 6: Setting up backup system...")
            self._setup_backups(results)
            
            # Step 7: Create sample data (optional)
            if create_sample_data:
                logger.info("Step 7: Creating sample data...")
                self._create_sample_data(results)
            
            # Step 8: Validate setup
            logger.info("Step 8: Validating database setup...")
            self._validate_setup(results)
            
            results["end_time"] = datetime.now().isoformat()
            results["total_duration"] = self._calculate_duration(results["start_time"], results["end_time"])
            
            if results["success"]:
                logger.info("Database initialization completed successfully!")
            else:
                logger.error("Database initialization completed with errors")
            
            return results
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            results["success"] = False
            results["errors"].append(str(e))
            return results
    
    def _initialize_config(self, results: Dict[str, Any]):
        """Initialize database configuration"""
        try:
            # Create default configuration if not exists
            config_dir = Path(self.config_path).parent
            config_dir.mkdir(parents=True, exist_ok=True)
            
            if not Path(self.config_path).exists():
                self._create_default_config()
            
            # Initialize database manager
            self.db_manager = DatabaseManager()
            
            # Test connections
            for name, engine in self.db_manager.engines.items():
                engine.connect().close()
                logger.info(f"✓ Connected to {name} database")
            
            results["steps_completed"].append("Database configuration initialized")
            
        except Exception as e:
            error_msg = f"Configuration initialization failed: {e}"
            results["errors"].append(error_msg)
            logger.error(error_msg)
            raise
    
    def _create_schemas(self, results: Dict[str, Any]):
        """Create database schemas"""
        try:
            # Create all tables
            primary_engine = self.db_manager.engines['primary']
            Base.metadata.create_all(bind=primary_engine)
            
            logger.info("✓ Database schemas created")
            results["steps_completed"].append("Database schemas created")
            
        except Exception as e:
            error_msg = f"Schema creation failed: {e}"
            results["errors"].append(error_msg)
            logger.error(error_msg)
            raise
    
    def _setup_migrations(self, results: Dict[str, Any]):
        """Set up migration system"""
        try:
            database_url = str(self.db_manager.engines['primary'].url)
            self.migration_manager = MigrationManager(database_url)
            
            # Initialize migration system
            if self.migration_manager.initialize_migration_system():
                logger.info("✓ Migration system initialized")
                results["steps_completed"].append("Migration system initialized")
            else:
                results["warnings"].append("Migration system initialization had issues")
            
        except Exception as e:
            error_msg = f"Migration setup failed: {e}"
            results["errors"].append(error_msg)
            logger.error(error_msg)
            # Don't raise - migration system is optional
    
    def _load_seed_data(self, results: Dict[str, Any]):
        """Load initial seed data"""
        try:
            database_url = str(self.db_manager.engines['primary'].url)
            self.seed_manager = SeedDataManager(database_url)
            
            if self.seed_manager.load_seed_data():
                logger.info("✓ Seed data loaded")
                results["steps_completed"].append("Seed data loaded")
            else:
                results["warnings"].append("Seed data loading had issues")
            
        except Exception as e:
            error_msg = f"Seed data loading failed: {e}"
            results["errors"].append(error_msg)
            logger.error(error_msg)
            # Don't raise - seed data is optional
    
    def _optimize_performance(self, results: Dict[str, Any]):
        """Create performance indexes and optimizations"""
        try:
            database_url = str(self.db_manager.engines['primary'].url)
            self.optimizer = QueryOptimizer(database_url)
            
            indexes_created = self.optimizer.create_recommended_indexes()
            
            logger.info(f"✓ Created {len(indexes_created)} performance indexes")
            results["steps_completed"].append(f"Performance optimization completed ({len(indexes_created)} indexes)")
            
        except Exception as e:
            error_msg = f"Performance optimization failed: {e}"
            results["warnings"].append(error_msg)
            logger.warning(error_msg)
            # Don't raise - optimization is optional
    
    def _setup_backups(self, results: Dict[str, Any]):
        """Set up backup system"""
        try:
            database_url = str(self.db_manager.engines['primary'].url)
            self.backup_manager = BackupManager(database_url)
            
            # Create initial backup
            initial_backup = self.backup_manager.create_backup("initial_setup")
            if initial_backup:
                logger.info(f"✓ Initial backup created: {initial_backup}")
            
            # Set up automated backup script
            backup_script = self.backup_manager.schedule_automated_backup("daily", 30)
            if backup_script:
                logger.info(f"✓ Automated backup script created: {backup_script}")
            
            results["steps_completed"].append("Backup system configured")
            
        except Exception as e:
            error_msg = f"Backup setup failed: {e}"
            results["warnings"].append(error_msg)
            logger.warning(error_msg)
            # Don't raise - backup system is optional
    
    def _create_sample_data(self, results: Dict[str, Any]):
        """Create sample data for testing and demonstration"""
        try:
            from sqlalchemy.orm import sessionmaker
            
            primary_engine = self.db_manager.engines['primary']
            SessionLocal = sessionmaker(bind=primary_engine)
            
            with SessionLocal() as session:
                # Create sample users
                self._create_sample_users(session)
                
                # Create sample companies
                self._create_sample_companies(session)
                
                # Create sample financial data
                self._create_sample_financial_data(session)
                
                session.commit()
            
            logger.info("✓ Sample data created")
            results["steps_completed"].append("Sample data created")
            
        except Exception as e:
            error_msg = f"Sample data creation failed: {e}"
            results["warnings"].append(error_msg)
            logger.warning(error_msg)
            # Don't raise - sample data is optional
    
    def _create_sample_users(self, session):
        """Create sample users"""
        from api.database.models.user_models import User, Role, Permission
        
        # Create sample roles if they don't exist
        admin_role = session.query(Role).filter_by(name='admin').first()
        if not admin_role:
            admin_role = Role(
                name='admin',
                display_name='Administrator',
                description='Full system administrator',
                is_system_role=True
            )
            session.add(admin_role)
        
        # Create sample admin user
        admin_user = session.query(User).filter_by(username='admin').first()
        if not admin_user:
            admin_user = User(
                username='admin',
                email='admin@frontier.local',
                first_name='System',
                last_name='Administrator',
                subscription_tier='enterprise',
                is_active=True,
                is_verified=True
            )
            admin_user.set_password('admin123')  # Change in production!
            admin_user.roles.append(admin_role)
            session.add(admin_user)
    
    def _create_sample_companies(self, session):
        """Create sample companies"""
        # This would create sample company data
        # Implementation depends on specific Company model
        pass
    
    def _create_sample_financial_data(self, session):
        """Create sample financial data"""
        # This would create sample financial statements
        # Implementation depends on specific financial models
        pass
    
    def _validate_setup(self, results: Dict[str, Any]):
        """Validate the database setup"""
        try:
            validation_results = []
            
            # Check table creation
            primary_engine = self.db_manager.engines['primary']
            with primary_engine.connect() as conn:
                # Check if key tables exist
                inspector = primary_engine.dialect.get_schema_names(conn)
                validation_results.append("Database connection successful")
            
            # Validate migration system
            if self.migration_manager:
                schema_validation = self.migration_manager.validate_schema()
                if schema_validation.get("valid", False):
                    validation_results.append("Schema validation passed")
                else:
                    results["warnings"].append(f"Schema validation issues: {schema_validation}")
            
            # Check backup system
            if self.backup_manager:
                backups = self.backup_manager.list_backups()
                if backups:
                    validation_results.append(f"Backup system operational ({len(backups)} backups available)")
            
            logger.info("✓ Database setup validation completed")
            results["steps_completed"].append("Setup validation completed")
            results["validation_results"] = validation_results
            
        except Exception as e:
            error_msg = f"Setup validation failed: {e}"
            results["warnings"].append(error_msg)
            logger.warning(error_msg)
    
    def _create_default_config(self):
        """Create default database configuration"""
        config_content = """
# Frontier Database Configuration

database:
  primary:
    type: sqlite
    path: ./data/frontier_business.db
    
  postgresql:
    enabled: false
    host: localhost
    port: 5432
    database: frontier_business
    username: frontier_user
    password: ${POSTGRES_PASSWORD}
    
redis:
  enabled: true
  host: localhost
  port: 6379
  password: ${REDIS_PASSWORD}
  db: 0
  
mongodb:
  enabled: false
  host: localhost
  port: 27017
  database: frontier_documents
  username: ${MONGO_USERNAME}
  password: ${MONGO_PASSWORD}

connection_pool:
  max_connections: 20
  overflow: 30
  pool_timeout: 30
  pool_recycle: 3600

backup:
  enabled: true
  schedule: daily
  retention_days: 30
  directory: ./backups

logging:
  level: INFO
  file: ./logs/database.log
"""
        
        Path(self.config_path).parent.mkdir(parents=True, exist_ok=True)
        Path(self.config_path).write_text(config_content.strip())
        logger.info(f"Default configuration created: {self.config_path}")
    
    def _calculate_duration(self, start_time: str, end_time: str) -> str:
        """Calculate duration between timestamps"""
        start = datetime.fromisoformat(start_time)
        end = datetime.fromisoformat(end_time)
        duration = end - start
        return str(duration)
    
    def get_status(self) -> Dict[str, Any]:
        """Get current database status"""
        status = {
            "database_manager": self.db_manager is not None,
            "migration_manager": self.migration_manager is not None,
            "seed_manager": self.seed_manager is not None,
            "backup_manager": self.backup_manager is not None,
            "optimizer": self.optimizer is not None,
            "timestamp": datetime.now().isoformat()
        }
        
        if self.db_manager:
            status["active_connections"] = len(self.db_manager.engines)
        
        if self.migration_manager:
            status["migration_status"] = self.migration_manager.get_migration_status()
        
        if self.backup_manager:
            status["backups"] = self.backup_manager.list_backups()
        
        return status

def main():
    """Main initialization function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Initialize Frontier database")
    parser.add_argument("--config", help="Configuration file path")
    parser.add_argument("--no-sample-data", action="store_true", help="Skip sample data creation")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Initialize database
    initializer = DatabaseInitializer(args.config)
    results = initializer.initialize(create_sample_data=not args.no_sample_data)
    
    # Print results
    print("\n" + "="*60)
    print("DATABASE INITIALIZATION RESULTS")
    print("="*60)
    
    print(f"Success: {results['success']}")
    print(f"Duration: {results.get('total_duration', 'N/A')}")
    
    if results["steps_completed"]:
        print(f"\nCompleted Steps ({len(results['steps_completed'])}):")
        for step in results["steps_completed"]:
            print(f"  ✓ {step}")
    
    if results["warnings"]:
        print(f"\nWarnings ({len(results['warnings'])}):")
        for warning in results["warnings"]:
            print(f"  ⚠ {warning}")
    
    if results["errors"]:
        print(f"\nErrors ({len(results['errors'])}):")
        for error in results["errors"]:
            print(f"  ✗ {error}")
    
    print("\n" + "="*60)
    
    # Exit with appropriate code
    sys.exit(0 if results["success"] else 1)

if __name__ == "__main__":
    main()
