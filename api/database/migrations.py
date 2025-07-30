"""
Database Migration System for Frontier

Handles database versioning, migrations, and schema evolution across different
database backends (SQLite, PostgreSQL, MongoDB).
"""

import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import sqlite3
import logging
from abc import ABC, abstractmethod
import hashlib
import json

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from api.database.schema import Base, DatabaseMigration
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
import alembic
from alembic.config import Config
from alembic import command

logger = logging.getLogger(__name__)

class MigrationManager:
    """Manages database migrations and versioning"""
    
    def __init__(self, database_url: str, migration_dir: str = None):
        self.database_url = database_url
        self.migration_dir = migration_dir or str(Path(__file__).parent / "migrations")
        self.engine = create_engine(database_url)
        self.SessionLocal = sessionmaker(bind=self.engine)
        
        # Ensure migration directory exists
        Path(self.migration_dir).mkdir(parents=True, exist_ok=True)
    
    def initialize_migration_system(self):
        """Initialize Alembic migration system"""
        try:
            # Create alembic.ini configuration
            alembic_ini_path = Path(self.migration_dir).parent / "alembic.ini"
            if not alembic_ini_path.exists():
                self._create_alembic_config(alembic_ini_path)
            
            # Initialize Alembic environment if not exists
            alembic_dir = Path(self.migration_dir) / "alembic"
            if not alembic_dir.exists():
                config = Config(str(alembic_ini_path))
                command.init(config, str(alembic_dir))
                logger.info("Alembic migration environment initialized")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize migration system: {e}")
            return False
    
    def _create_alembic_config(self, config_path: Path):
        """Create Alembic configuration file"""
        config_content = f"""
[alembic]
script_location = {self.migration_dir}/alembic
prepend_sys_path = .
version_path_separator = os
sqlalchemy.url = {self.database_url}

[post_write_hooks]

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
"""
        config_path.write_text(config_content.strip())
    
    def create_migration(self, message: str, auto_generate: bool = True) -> Optional[str]:
        """Create a new migration"""
        try:
            alembic_ini = Path(self.migration_dir).parent / "alembic.ini"
            config = Config(str(alembic_ini))
            
            if auto_generate:
                # Auto-generate migration from model changes
                command.revision(config, message=message, autogenerate=True)
            else:
                # Create empty migration
                command.revision(config, message=message)
            
            logger.info(f"Migration created: {message}")
            return message
            
        except Exception as e:
            logger.error(f"Failed to create migration: {e}")
            return None
    
    def apply_migrations(self, target_revision: str = "head") -> bool:
        """Apply pending migrations"""
        try:
            alembic_ini = Path(self.migration_dir).parent / "alembic.ini"
            config = Config(str(alembic_ini))
            
            command.upgrade(config, target_revision)
            logger.info(f"Migrations applied successfully to {target_revision}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to apply migrations: {e}")
            return False
    
    def rollback_migration(self, target_revision: str) -> bool:
        """Rollback to a specific migration"""
        try:
            alembic_ini = Path(self.migration_dir).parent / "alembic.ini"
            config = Config(str(alembic_ini))
            
            command.downgrade(config, target_revision)
            logger.info(f"Rolled back to revision {target_revision}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to rollback migration: {e}")
            return False
    
    def get_migration_history(self) -> List[Dict[str, Any]]:
        """Get migration history"""
        try:
            with self.SessionLocal() as session:
                migrations = session.query(DatabaseMigration).order_by(
                    DatabaseMigration.applied_at.desc()
                ).all()
                
                return [
                    {
                        "migration_id": m.migration_id,
                        "description": m.description,
                        "version": m.version,
                        "applied_at": m.applied_at.isoformat() if m.applied_at else None,
                        "applied_by": m.applied_by,
                        "execution_time_ms": m.execution_time_ms
                    }
                    for m in migrations
                ]
        except Exception as e:
            logger.error(f"Failed to get migration history: {e}")
            return []
    
    def get_current_revision(self) -> Optional[str]:
        """Get current database revision"""
        try:
            alembic_ini = Path(self.migration_dir).parent / "alembic.ini"
            config = Config(str(alembic_ini))
            
            from alembic.runtime.migration import MigrationContext
            with self.engine.connect() as connection:
                context = MigrationContext.configure(connection)
                return context.get_current_revision()
                
        except Exception as e:
            logger.error(f"Failed to get current revision: {e}")
            return None
    
    def validate_schema(self) -> Dict[str, Any]:
        """Validate current database schema"""
        try:
            inspector = inspect(self.engine)
            tables = inspector.get_table_names()
            
            # Check for required tables
            required_tables = [
                'users', 'companies', 'financial_statements', 'compliance_assessments',
                'compliance_frameworks', 'risk_assessments', 'strategic_plans'
            ]
            
            missing_tables = [table for table in required_tables if table not in tables]
            
            # Check for foreign key constraints
            constraint_issues = []
            for table_name in tables:
                try:
                    foreign_keys = inspector.get_foreign_keys(table_name)
                    for fk in foreign_keys:
                        if fk['referred_table'] not in tables:
                            constraint_issues.append(
                                f"Table {table_name} references non-existent table {fk['referred_table']}"
                            )
                except Exception as e:
                    constraint_issues.append(f"Error checking constraints for {table_name}: {e}")
            
            return {
                "valid": len(missing_tables) == 0 and len(constraint_issues) == 0,
                "total_tables": len(tables),
                "missing_tables": missing_tables,
                "constraint_issues": constraint_issues,
                "tables": tables
            }
            
        except Exception as e:
            logger.error(f"Schema validation failed: {e}")
            return {"valid": False, "error": str(e)}

class DataMigration:
    """Handles data migration between database versions"""
    
    def __init__(self, source_db: str, target_db: str):
        self.source_engine = create_engine(source_db)
        self.target_engine = create_engine(target_db)
    
    def migrate_data(self, table_mappings: Dict[str, str] = None) -> bool:
        """Migrate data from source to target database"""
        try:
            # Default table mappings (source -> target)
            if table_mappings is None:
                table_mappings = self._get_default_table_mappings()
            
            source_inspector = inspect(self.source_engine)
            target_inspector = inspect(self.target_engine)
            
            for source_table, target_table in table_mappings.items():
                if (source_table in source_inspector.get_table_names() and 
                    target_table in target_inspector.get_table_names()):
                    
                    self._migrate_table_data(source_table, target_table)
                    logger.info(f"Migrated data from {source_table} to {target_table}")
            
            return True
            
        except Exception as e:
            logger.error(f"Data migration failed: {e}")
            return False
    
    def _get_default_table_mappings(self) -> Dict[str, str]:
        """Get default table mappings for data migration"""
        return {
            'users': 'users',
            'companies': 'companies',
            'financial_statements': 'financial_statements',
            'compliance_assessments': 'compliance_assessments',
            'risk_assessments': 'risk_assessments'
        }
    
    def _migrate_table_data(self, source_table: str, target_table: str):
        """Migrate data for a specific table"""
        with self.source_engine.connect() as source_conn:
            with self.target_engine.connect() as target_conn:
                # Get data from source
                result = source_conn.execute(text(f"SELECT * FROM {source_table}"))
                rows = result.fetchall()
                
                if rows:
                    # Get column names
                    columns = result.keys()
                    
                    # Prepare insert statement
                    placeholders = ', '.join(['?' for _ in columns])
                    insert_sql = f"INSERT INTO {target_table} ({', '.join(columns)}) VALUES ({placeholders})"
                    
                    # Insert data into target
                    for row in rows:
                        target_conn.execute(text(insert_sql), dict(row))
                    
                    target_conn.commit()

class SeedDataManager:
    """Manages seed data for initial database setup"""
    
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)
        self.SessionLocal = sessionmaker(bind=self.engine)
    
    def load_seed_data(self) -> bool:
        """Load initial seed data"""
        try:
            with self.SessionLocal() as session:
                # Load compliance frameworks
                self._load_compliance_frameworks(session)
                
                # Load risk categories
                self._load_risk_categories(session)
                
                # Load industries
                self._load_industries(session)
                
                # Load default roles
                self._load_default_roles(session)
                
                session.commit()
                logger.info("Seed data loaded successfully")
                return True
                
        except Exception as e:
            logger.error(f"Failed to load seed data: {e}")
            return False
    
    def _load_compliance_frameworks(self, session):
        """Load standard compliance frameworks"""
        from api.database.schema import ComplianceFramework
        
        frameworks = [
            {
                "name": "SOX (Sarbanes-Oxley Act)",
                "code": "SOX",
                "description": "US federal law for public company financial reporting",
                "jurisdiction": "United States",
                "category": "regulatory",
                "version": "2002",
                "requirements": {
                    "sections": ["302", "404", "409", "906"],
                    "key_requirements": [
                        "CEO/CFO certification",
                        "Internal controls assessment",
                        "Real-time disclosure"
                    ]
                }
            },
            {
                "name": "GDPR (General Data Protection Regulation)",
                "code": "GDPR",
                "description": "EU regulation on data protection and privacy",
                "jurisdiction": "European Union",
                "category": "regulatory",
                "version": "2018",
                "requirements": {
                    "principles": ["lawfulness", "fairness", "transparency"],
                    "rights": ["access", "rectification", "erasure", "portability"]
                }
            },
            {
                "name": "ISO 27001",
                "code": "ISO27001",
                "description": "Information security management systems",
                "jurisdiction": "International",
                "category": "industry",
                "version": "2013",
                "requirements": {
                    "domains": [
                        "Information security policies",
                        "Organization of information security",
                        "Human resource security",
                        "Asset management"
                    ]
                }
            }
        ]
        
        for framework_data in frameworks:
            existing = session.query(ComplianceFramework).filter_by(
                code=framework_data["code"]
            ).first()
            
            if not existing:
                framework = ComplianceFramework(**framework_data)
                session.add(framework)
    
    def _load_risk_categories(self, session):
        """Load standard risk categories"""
        from api.database.schema import RiskCategory
        
        categories = [
            {
                "name": "Operational Risk",
                "description": "Risks arising from internal processes, people, and systems"
            },
            {
                "name": "Financial Risk",
                "description": "Risks related to financial loss or market volatility"
            },
            {
                "name": "Compliance Risk",
                "description": "Risk of regulatory violations and legal penalties"
            },
            {
                "name": "Strategic Risk",
                "description": "Risks that affect business strategy and objectives"
            },
            {
                "name": "Reputational Risk",
                "description": "Risk of damage to organization's reputation"
            }
        ]
        
        for category_data in categories:
            existing = session.query(RiskCategory).filter_by(
                name=category_data["name"]
            ).first()
            
            if not existing:
                category = RiskCategory(**category_data)
                session.add(category)
    
    def _load_industries(self, session):
        """Load industry classifications"""
        from api.database.schema import Industry
        
        industries = [
            {"name": "Technology", "code": "54", "description": "Professional, Scientific, and Technical Services"},
            {"name": "Healthcare", "code": "62", "description": "Health Care and Social Assistance"},
            {"name": "Financial Services", "code": "52", "description": "Finance and Insurance"},
            {"name": "Manufacturing", "code": "31-33", "description": "Manufacturing"},
            {"name": "Retail Trade", "code": "44-45", "description": "Retail Trade"},
            {"name": "Construction", "code": "23", "description": "Construction"},
            {"name": "Real Estate", "code": "53", "description": "Real Estate and Rental and Leasing"}
        ]
        
        for industry_data in industries:
            existing = session.query(Industry).filter_by(
                code=industry_data["code"]
            ).first()
            
            if not existing:
                industry = Industry(**industry_data)
                session.add(industry)
    
    def _load_default_roles(self, session):
        """Load default user roles"""
        from api.database.schema import Role
        
        roles = [
            {
                "name": "admin",
                "description": "System administrator with full access",
                "permissions": {
                    "all": True,
                    "system_config": True,
                    "user_management": True
                }
            },
            {
                "name": "analyst",
                "description": "Business analyst with analysis capabilities",
                "permissions": {
                    "financial_analysis": True,
                    "risk_assessment": True,
                    "compliance_check": True,
                    "strategic_planning": True
                }
            },
            {
                "name": "viewer",
                "description": "Read-only access to reports and data",
                "permissions": {
                    "view_reports": True,
                    "export_data": False
                }
            }
        ]
        
        for role_data in roles:
            existing = session.query(Role).filter_by(
                name=role_data["name"]
            ).first()
            
            if not existing:
                role = Role(**role_data)
                session.add(role)

def create_initial_migration():
    """Create the initial migration with all tables"""
    migration_content = '''"""Initial database schema

Revision ID: 001_initial_schema
Revises: 
Create Date: {create_date}

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    """Create all initial tables"""
    
    # Users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(50), nullable=False),
        sa.Column('email', sa.String(100), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('first_name', sa.String(50), nullable=True),
        sa.Column('last_name', sa.String(50), nullable=True),
        sa.Column('subscription_tier', sa.String(20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username'),
        sa.UniqueConstraint('email')
    )
    
    # Continue with other tables...
    # (Additional table creation code would go here)

def downgrade():
    """Drop all tables"""
    op.drop_table('users')
    # Drop other tables in reverse order...
'''.format(create_date=datetime.now().isoformat())
    
    return migration_content

class BackupManager:
    """Manages database backup and recovery operations"""
    
    def __init__(self, database_url: str, backup_dir: str = None):
        self.database_url = database_url
        self.backup_dir = Path(backup_dir) if backup_dir else Path(__file__).parent / "backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.engine = create_engine(database_url)
    
    def create_backup(self, backup_name: str = None, include_data: bool = True) -> Optional[str]:
        """Create a database backup"""
        try:
            if backup_name is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_name = f"frontier_backup_{timestamp}"
            
            backup_path = self.backup_dir / f"{backup_name}.sql"
            
            # For SQLite databases
            if 'sqlite' in self.database_url.lower():
                return self._backup_sqlite(backup_path, include_data)
            
            # For PostgreSQL databases
            elif 'postgresql' in self.database_url.lower():
                return self._backup_postgresql(backup_path, include_data)
            
            else:
                logger.error(f"Backup not supported for database type: {self.database_url}")
                return None
                
        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            return None
    
    def _backup_sqlite(self, backup_path: Path, include_data: bool) -> str:
        """Create SQLite backup"""
        import shutil
        
        # Extract database path from URL
        db_path = self.database_url.replace('sqlite:///', '')
        
        if include_data:
            # Simple file copy for full backup
            shutil.copy2(db_path, str(backup_path).replace('.sql', '.db'))
            backup_file = str(backup_path).replace('.sql', '.db')
        else:
            # Schema-only backup
            with sqlite3.connect(db_path) as conn:
                with open(backup_path, 'w') as f:
                    for line in conn.iterdump():
                        if not line.startswith('INSERT'):
                            f.write(f"{line}\n")
            backup_file = str(backup_path)
        
        logger.info(f"SQLite backup created: {backup_file}")
        return backup_file
    
    def _backup_postgresql(self, backup_path: Path, include_data: bool) -> str:
        """Create PostgreSQL backup using pg_dump"""
        import subprocess
        from urllib.parse import urlparse
        
        # Parse database URL
        parsed = urlparse(self.database_url)
        
        # Prepare pg_dump command
        cmd = [
            'pg_dump',
            f'--host={parsed.hostname}',
            f'--port={parsed.port or 5432}',
            f'--username={parsed.username}',
            f'--dbname={parsed.path[1:]}',  # Remove leading /
            f'--file={backup_path}'
        ]
        
        if not include_data:
            cmd.append('--schema-only')
        
        # Set password environment variable
        env = os.environ.copy()
        if parsed.password:
            env['PGPASSWORD'] = parsed.password
        
        # Execute backup
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info(f"PostgreSQL backup created: {backup_path}")
            return str(backup_path)
        else:
            raise Exception(f"pg_dump failed: {result.stderr}")
    
    def restore_backup(self, backup_file: str, target_database_url: str = None) -> bool:
        """Restore database from backup"""
        try:
            backup_path = Path(backup_file)
            if not backup_path.exists():
                logger.error(f"Backup file not found: {backup_file}")
                return False
            
            target_url = target_database_url or self.database_url
            
            # For SQLite databases
            if backup_file.endswith('.db'):
                return self._restore_sqlite(backup_path, target_url)
            
            # For SQL dump files
            elif backup_file.endswith('.sql'):
                if 'sqlite' in target_url.lower():
                    return self._restore_sqlite_from_sql(backup_path, target_url)
                elif 'postgresql' in target_url.lower():
                    return self._restore_postgresql(backup_path, target_url)
            
            logger.error(f"Unsupported backup file format: {backup_file}")
            return False
            
        except Exception as e:
            logger.error(f"Backup restoration failed: {e}")
            return False
    
    def _restore_sqlite(self, backup_path: Path, target_url: str) -> bool:
        """Restore SQLite database from backup"""
        import shutil
        
        target_path = target_url.replace('sqlite:///', '')
        shutil.copy2(backup_path, target_path)
        logger.info(f"SQLite database restored from {backup_path}")
        return True
    
    def _restore_sqlite_from_sql(self, backup_path: Path, target_url: str) -> bool:
        """Restore SQLite database from SQL dump"""
        target_path = target_url.replace('sqlite:///', '')
        
        with sqlite3.connect(target_path) as conn:
            with open(backup_path, 'r') as f:
                conn.executescript(f.read())
        
        logger.info(f"SQLite database restored from SQL dump: {backup_path}")
        return True
    
    def _restore_postgresql(self, backup_path: Path, target_url: str) -> bool:
        """Restore PostgreSQL database from backup"""
        import subprocess
        from urllib.parse import urlparse
        
        parsed = urlparse(target_url)
        
        cmd = [
            'psql',
            f'--host={parsed.hostname}',
            f'--port={parsed.port or 5432}',
            f'--username={parsed.username}',
            f'--dbname={parsed.path[1:]}',
            f'--file={backup_path}'
        ]
        
        env = os.environ.copy()
        if parsed.password:
            env['PGPASSWORD'] = parsed.password
        
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info(f"PostgreSQL database restored from {backup_path}")
            return True
        else:
            raise Exception(f"psql restore failed: {result.stderr}")
    
    def schedule_automated_backup(self, schedule_type: str = "daily", retention_days: int = 30):
        """Set up automated backup scheduling"""
        try:
            # Create backup script
            script_content = f'''#!/usr/bin/env python3
"""Automated backup script for Frontier database"""

import sys
from pathlib import Path
from datetime import datetime, timedelta
import logging

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from api.database.migrations import BackupManager

def run_backup():
    backup_manager = BackupManager("{self.database_url}")
    
    # Create backup
    backup_file = backup_manager.create_backup()
    if backup_file:
        print(f"Backup created successfully: {{backup_file}}")
        
        # Clean up old backups
        backup_manager.cleanup_old_backups({retention_days})
        print(f"Cleaned up backups older than {retention_days} days")
    else:
        print("Backup failed!")
        sys.exit(1)

if __name__ == "__main__":
    run_backup()
'''
            
            script_path = self.backup_dir / "automated_backup.py"
            script_path.write_text(script_content)
            script_path.chmod(0o755)
            
            logger.info(f"Automated backup script created: {script_path}")
            logger.info(f"Schedule type: {schedule_type}, Retention: {retention_days} days")
            
            # Note: Actual scheduling would require system-specific setup (cron, Task Scheduler, etc.)
            return str(script_path)
            
        except Exception as e:
            logger.error(f"Failed to set up automated backup: {e}")
            return None
    
    def cleanup_old_backups(self, retention_days: int = 30):
        """Clean up old backup files"""
        try:
            cutoff_date = datetime.now() - timedelta(days=retention_days)
            cleaned_count = 0
            
            for backup_file in self.backup_dir.glob("frontier_backup_*"):
                if backup_file.stat().st_mtime < cutoff_date.timestamp():
                    backup_file.unlink()
                    cleaned_count += 1
                    logger.debug(f"Removed old backup: {backup_file}")
            
            logger.info(f"Cleaned up {cleaned_count} old backup files")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Backup cleanup failed: {e}")
            return 0
    
    def list_backups(self) -> List[Dict[str, Any]]:
        """List available backups"""
        backups = []
        
        for backup_file in self.backup_dir.glob("frontier_backup_*"):
            stat = backup_file.stat()
            backups.append({
                "filename": backup_file.name,
                "path": str(backup_file),
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "type": "full" if backup_file.suffix == ".db" else "schema"
            })
        
        return sorted(backups, key=lambda x: x["created_at"], reverse=True)

class QueryOptimizer:
    """Database query optimization utilities"""
    
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)
    
    def analyze_query_performance(self, query: str) -> Dict[str, Any]:
        """Analyze query performance and suggest optimizations"""
        try:
            with self.engine.connect() as conn:
                # Execute EXPLAIN for query analysis
                explain_query = f"EXPLAIN QUERY PLAN {query}"
                result = conn.execute(text(explain_query))
                
                execution_plan = [dict(row) for row in result]
                
                # Basic performance metrics
                start_time = datetime.now()
                conn.execute(text(query))
                execution_time = (datetime.now() - start_time).total_seconds()
                
                return {
                    "query": query,
                    "execution_time_ms": execution_time * 1000,
                    "execution_plan": execution_plan,
                    "optimization_suggestions": self._generate_optimization_suggestions(execution_plan)
                }
                
        except Exception as e:
            logger.error(f"Query analysis failed: {e}")
            return {"error": str(e)}
    
    def _generate_optimization_suggestions(self, execution_plan: List[Dict]) -> List[str]:
        """Generate optimization suggestions based on execution plan"""
        suggestions = []
        
        for step in execution_plan:
            detail = step.get('detail', '').lower()
            
            if 'scan table' in detail and 'using index' not in detail:
                suggestions.append("Consider adding an index to avoid full table scan")
            
            if 'temp b-tree' in detail:
                suggestions.append("Query requires temporary sorting - consider adding ORDER BY index")
            
            if 'nested loop' in detail:
                suggestions.append("Nested loop detected - verify join conditions and indexes")
        
        return suggestions
    
    def create_recommended_indexes(self) -> List[str]:
        """Create recommended indexes for common query patterns"""
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
            "CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_tier)",
            "CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry_id)",
            "CREATE INDEX IF NOT EXISTS idx_financial_statements_company_period ON financial_statements(company_id, period_end)",
            "CREATE INDEX IF NOT EXISTS idx_compliance_assessments_framework ON compliance_assessments(framework_id)",
            "CREATE INDEX IF NOT EXISTS idx_risk_assessments_company_date ON risk_assessments(company_id, assessment_date)",
            "CREATE INDEX IF NOT EXISTS idx_strategic_plans_company_status ON strategic_plans(company_id, status)"
        ]
        
        created_indexes = []
        
        try:
            with self.engine.connect() as conn:
                for index_sql in indexes:
                    try:
                        conn.execute(text(index_sql))
                        created_indexes.append(index_sql)
                        logger.debug(f"Created index: {index_sql}")
                    except Exception as e:
                        logger.warning(f"Failed to create index: {e}")
                
                conn.commit()
            
            logger.info(f"Created {len(created_indexes)} performance indexes")
            return created_indexes
            
        except Exception as e:
            logger.error(f"Index creation failed: {e}")
            return []

if __name__ == "__main__":
    # Example usage
    database_url = "sqlite:///frontier_business.db"
    migration_manager = MigrationManager(database_url)
    
    # Initialize migration system
    migration_manager.initialize_migration_system()
    
    # Create and apply initial migration
    migration_manager.create_migration("Initial database schema")
    migration_manager.apply_migrations()
    
    # Load seed data
    seed_manager = SeedDataManager(database_url)
    seed_manager.load_seed_data()
    
    # Create performance indexes
    optimizer = QueryOptimizer(database_url)
    optimizer.create_recommended_indexes()
    
    # Set up automated backups
    backup_manager = BackupManager(database_url)
    backup_script = backup_manager.schedule_automated_backup("daily", 30)
    
    print("Database setup completed successfully!")
    print(f"Automated backup script created: {backup_script}")
    print("Recommended to set up system scheduler (cron/Task Scheduler) for backups")
