# Frontier Database System

A comprehensive database management system for Frontier business operations, featuring multi-database support, automated migrations, performance optimization, and robust backup/recovery capabilities.

## 🏗️ Architecture Overview

The Frontier database system is built with production-ready features:

- **Multi-Database Support**: PostgreSQL (primary), SQLite (fallback), Redis (cache), MongoDB (documents)
- **Comprehensive ORM Models**: Complete business data modeling with SQLAlchemy
- **Advanced Migration System**: Alembic-based with custom enhancements
- **Automated Backup/Recovery**: Scheduled backups with retention policies
- **Performance Optimization**: Query analysis and automated index management
- **Security Features**: Password hashing, API key management, audit trails

## 📁 Project Structure

```
api/database/
├── models/                     # ORM Models
│   ├── __init__.py            # Model exports
│   ├── base.py                # Base classes and mixins
│   ├── user_models.py         # User management models
│   ├── company_models.py      # Company and organization models
│   ├── financial_models.py    # Financial analysis models
│   ├── strategic_models.py    # Strategic planning models
│   ├── compliance_models.py   # Compliance and risk models
│   ├── risk_models.py         # Risk assessment models
│   ├── operation_models.py    # Operational data models
│   └── analytics_models.py    # Analytics and reporting models
├── config.py                  # Database configuration
├── migrations.py              # Migration management system
├── initialize_database.py     # Database initialization script
├── db_cli.py                  # Command-line interface
└── README.md                  # This file
```

## 🚀 Quick Start

### 1. Initialize Database

```bash
# Initialize with all features
python api/database/initialize_database.py

# Initialize without sample data
python api/database/initialize_database.py --no-sample-data

# Verbose output
python api/database/initialize_database.py --verbose
```

### 2. Using the CLI Tool

```bash
# Show database status
python api/database/db_cli.py status

# Initialize database
python api/database/db_cli.py init

# Create a backup
python api/database/db_cli.py backup create

# Apply migrations
python api/database/db_cli.py migrate apply
```

## 📊 Database Models

### Base Classes and Mixins

All models inherit from `EnhancedBaseModel` which includes:

- **TimestampMixin**: `created_at`, `updated_at` fields
- **SoftDeleteMixin**: `is_deleted`, `deleted_at` fields
- **UUIDMixin**: `uuid` field for external references
- **MetadataMixin**: `metadata` JSON field for flexible data
- **VersionMixin**: `version` field for optimistic locking
- **AuditMixin**: `created_by`, `updated_by` audit fields
- **StatusMixin**: `status`, `status_changed_at` fields

```python
from api.database.models.base import EnhancedBaseModel

class MyModel(EnhancedBaseModel):
    __tablename__ = 'my_models'
    
    name = Column(String(100), nullable=False)
    description = Column(Text)
```

### User Management Models

- **User**: Authentication and profile management
- **Role**: Role-based access control
- **Permission**: Granular permissions system
- **UserProfile**: Extended user information
- **APIKey**: API access management
- **UserSession**: Session tracking and security

### Financial Models

- **FinancialStatement**: Base for all financial statements
- **BalanceSheet**: Balance sheet data with detailed line items
- **IncomeStatement**: Income statement with revenue/expense tracking
- **CashFlowStatement**: Cash flow analysis
- **FinancialRatio**: Financial ratio calculations
- **FinancialAnalysis**: Analysis results and insights
- **ValuationModel**: Company valuation models

### Business Models

- **Company**: Core company information
- **Industry**: Industry classifications
- **ComplianceFramework**: Regulatory frameworks
- **RiskAssessment**: Risk analysis and management
- **StrategicPlan**: Strategic planning and execution

## 🔧 Configuration

### Database Configuration

Create a configuration file or use environment variables:

```yaml
# config/database.yaml
database:
  primary:
    type: postgresql  # or sqlite
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
  
mongodb:
  enabled: true
  host: localhost
  port: 27017
  database: frontier_documents
```

### Environment Variables

```bash
# PostgreSQL
export POSTGRES_PASSWORD=your_secure_password
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=frontier_business
export POSTGRES_USER=frontier_user

# Redis
export REDIS_PASSWORD=your_redis_password
export REDIS_HOST=localhost
export REDIS_PORT=6379

# MongoDB
export MONGO_USERNAME=frontier_user
export MONGO_PASSWORD=your_mongo_password
export MONGO_HOST=localhost
export MONGO_PORT=27017
```

## 📈 Migration Management

### Creating Migrations

```bash
# Auto-generate migration from model changes
python api/database/db_cli.py migrate create "Add new financial fields" --auto

# Create empty migration
python api/database/db_cli.py migrate create "Custom data migration"
```

### Applying Migrations

```bash
# Apply all pending migrations
python api/database/db_cli.py migrate apply

# Apply to specific revision
python api/database/db_cli.py migrate apply 001_initial_schema
```

### Migration Rollbacks

```bash
# Rollback to previous migration
python api/database/db_cli.py migrate rollback 001_initial_schema
```

### Migration History

```bash
# View migration history
python api/database/db_cli.py migrate history
```

## 💾 Backup and Recovery

### Creating Backups

```bash
# Create full backup
python api/database/db_cli.py backup create

# Create schema-only backup
python api/database/db_cli.py backup create --no-data

# Create named backup
python api/database/db_cli.py backup create --name "pre_migration_backup"
```

### Restoring Backups

```bash
# List available backups
python api/database/db_cli.py backup list

# Restore from backup
python api/database/db_cli.py backup restore backup_file.sql
```

### Automated Backups

```bash
# Clean up old backups (older than 30 days)
python api/database/db_cli.py backup cleanup --days 30
```

Set up automated backups using the generated script:

```bash
# The initialization creates an automated backup script
./api/database/backups/automated_backup.py

# Add to cron for daily backups (Linux/Mac)
echo "0 2 * * * /path/to/python /path/to/automated_backup.py" | crontab -

# Add to Task Scheduler (Windows)
# Use the automated_backup.py script in Windows Task Scheduler
```

## 🚀 Performance Optimization

### Creating Indexes

```bash
# Create recommended performance indexes
python api/database/db_cli.py optimize indexes
```

### Query Analysis

```bash
# Analyze query performance
python api/database/db_cli.py optimize analyze "SELECT * FROM users WHERE email = 'test@example.com'"
```

### Connection Pooling

The system automatically configures connection pooling:

```python
# Automatic connection pooling configuration
connection_pool:
  max_connections: 20
  overflow: 30
  pool_timeout: 30
  pool_recycle: 3600
```

## 🔍 Schema Validation

```bash
# Validate database schema
python api/database/db_cli.py validate

# Get detailed validation report
python api/database/db_cli.py validate --format json
```

## 🌱 Seed Data

```bash
# Load initial seed data
python api/database/db_cli.py seed
```

Seed data includes:
- Default user roles and permissions
- Industry classifications
- Compliance frameworks
- Risk categories
- Sample data (optional)

## 🔐 Security Features

### Password Security

- **Bcrypt Hashing**: Secure password storage
- **Salt Generation**: Unique salts for each password
- **Password Validation**: Configurable password policies

### API Security

- **API Key Management**: Secure API access tokens
- **Rate Limiting**: Built-in rate limiting support
- **Session Tracking**: Comprehensive session management

### Audit Trails

- **Change Tracking**: All modifications tracked
- **User Attribution**: Actions linked to users
- **Timestamp Logging**: Detailed timing information

## 📊 Monitoring and Maintenance

### Health Checks

```bash
# Check database status
python api/database/db_cli.py status
```

### Log Management

Logs are written to:
- `logs/database.log` - General database operations
- `database_init.log` - Initialization logs
- Console output for CLI operations

### Performance Monitoring

- Query execution time tracking
- Connection pool monitoring
- Migration performance metrics

## 🔧 Development Usage

### Using Models in Code

```python
from api.database.config import DatabaseManager
from api.database.models import User, Company, FinancialStatement
from sqlalchemy.orm import sessionmaker

# Initialize database manager
db_manager = DatabaseManager()
SessionLocal = sessionmaker(bind=db_manager.engines['primary'])

# Use in application
with SessionLocal() as session:
    # Create user
    user = User(
        username='john_doe',
        email='john@example.com',
        first_name='John',
        last_name='Doe'
    )
    user.set_password('secure_password')
    session.add(user)
    
    # Query data
    companies = session.query(Company).filter(
        Company.industry_id == 1
    ).all()
    
    session.commit()
```

### Custom Migrations

```python
from api.database.migrations import MigrationManager, SchemaMigration

# Create custom migration
def custom_data_migration(engine):
    # Your custom migration logic
    with engine.connect() as conn:
        conn.execute("UPDATE users SET subscription_tier = 'basic' WHERE subscription_tier IS NULL")

migration_manager = MigrationManager("sqlite:///frontier.db")
migration_manager.register_data_migration(
    "002_update_subscription_tiers",
    "Update null subscription tiers",
    custom_data_migration
)
```

## 🚨 Troubleshooting

### Common Issues

1. **Connection Errors**
   ```bash
   # Check database status
   python api/database/db_cli.py status
   
   # Verify configuration
   python api/database/db_cli.py validate
   ```

2. **Migration Failures**
   ```bash
   # Check migration history
   python api/database/db_cli.py migrate history
   
   # Validate schema
   python api/database/db_cli.py validate
   ```

3. **Performance Issues**
   ```bash
   # Create performance indexes
   python api/database/db_cli.py optimize indexes
   
   # Analyze slow queries
   python api/database/db_cli.py optimize analyze "YOUR_SLOW_QUERY"
   ```

### Log Analysis

Check logs for detailed error information:

```bash
# View recent database logs
tail -f logs/database.log

# Check initialization logs
cat database_init.log
```

## 📚 API Reference

### DatabaseManager

Main database connection manager with multi-database support.

```python
db_manager = DatabaseManager()
primary_engine = db_manager.engines['primary']
cache_client = db_manager.cache_client
```

### Migration System

Comprehensive migration management with versioning and rollback support.

```python
migration_manager = MigrationManager(database_url)
migration_manager.apply_migrations()
migration_manager.rollback_migration('001_initial')
```

### Backup System

Automated backup and recovery with retention policies.

```python
backup_manager = BackupManager(database_url)
backup_file = backup_manager.create_backup()
backup_manager.restore_backup(backup_file)
```

## 🤝 Contributing

1. Follow the existing model patterns in `models/base.py`
2. Add appropriate indexes for new models
3. Create migrations for schema changes
4. Update seed data as needed
5. Add tests for new functionality

## 📄 License

This database system is part of the Frontier business operations platform.
