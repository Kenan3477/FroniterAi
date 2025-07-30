# Frontier Database System

A comprehensive database infrastructure for Frontier business operations with support for multiple database backends, advanced optimization, automated backups, and comprehensive monitoring.

## Features

### Multi-Database Support
- **SQLite**: Development and lightweight deployments
- **PostgreSQL**: Production-grade relational database with advanced features
- **MongoDB**: Document storage for flexible data structures
- **Redis**: High-performance caching and session storage

### Advanced Connection Pooling
- Intelligent connection pool management with automatic scaling
- Connection health monitoring and automatic recovery
- Query performance optimization and caching
- Resource usage monitoring and alerting

### Automated Backup & Recovery
- Scheduled automated backups with configurable retention
- Multiple compression and encryption options
- Cloud storage integration (AWS S3, Azure Blob)
- Point-in-time recovery capabilities
- Disaster recovery procedures

### Migration Management
- Alembic-based schema versioning
- Automatic table creation and updates
- Data migration utilities
- Seed data management
- Cross-database migration support

### Performance Optimization
- Query result caching with Redis backend
- Slow query detection and analysis
- Connection pool optimization
- Performance metrics and reporting
- Resource usage monitoring

## Quick Start

### Installation

```bash
pip install -r requirements.txt
```

### Basic Setup

```python
import asyncio
from api.database import initialize_database, get_session

async def main():
    # Initialize database system
    await initialize_database({
        "primary_database": "sqlite",
        "debug": True
    })
    
    # Use database session
    async with get_session() as session:
        # Your database operations here
        pass

asyncio.run(main())
```

### Configuration

The database system can be configured via environment variables or configuration files:

#### Environment Variables

```bash
# Primary database settings
PRIMARY_DATABASE=sqlite
SQLITE_PATH=./data/frontier_business.db

# PostgreSQL settings (for production)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=frontier_business
POSTGRES_USER=frontier_user
POSTGRES_PASSWORD=frontier_pass

# Connection pooling
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30

# Caching
ENABLE_QUERY_CACHING=true
REDIS_HOST=localhost
REDIS_PORT=6379

# Backup settings
ENABLE_AUTO_BACKUP=true
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
```

#### Configuration File

```yaml
# config/database.yaml
database:
  environment: development
  primary_database: sqlite
  sqlite_path: ./data/frontier_business.db
  
  # Connection pooling
  pool_size: 10
  max_overflow: 20
  
  # Optimization
  enable_query_caching: true
  slow_query_threshold: 1.0
  
  # Backup
  enable_auto_backup: true
  backup_schedule: "0 2 * * *"
  backup_retention_days: 30
```

## Database Schema

The system includes a comprehensive schema covering all business operations:

### Core Entities
- **Users**: User accounts and authentication
- **Companies**: Business entity management
- **Industries**: Industry classification and data

### Financial Management
- **FinancialStatements**: Financial reporting data
- **FinancialAnalysis**: Analysis results and metrics
- **MarketData**: Market intelligence and trends

### Compliance Management
- **ComplianceFrameworks**: Regulatory frameworks
- **ComplianceRequirements**: Specific compliance rules
- **ComplianceAssessments**: Assessment results
- **CompliancePolicies**: Policy definitions

### Risk Management
- **RiskCategories**: Risk classification
- **Risks**: Risk definitions and parameters
- **RiskAssessments**: Risk evaluation results

### Strategic Planning
- **StrategicPlans**: Business planning data
- **SystemConfiguration**: System settings
- **APIRequests**: API usage tracking

## Usage Examples

### Basic Database Operations

```python
from api.database import get_session, User, Company

async def create_user_and_company():
    async with get_session() as session:
        # Create a new user
        user = User(
            username="john_doe",
            email="john@example.com",
            full_name="John Doe"
        )
        session.add(user)
        
        # Create a company
        company = Company(
            name="Example Corp",
            legal_structure="LLC",
            jurisdiction="Delaware",
            created_by=user
        )
        session.add(company)
        
        await session.commit()
        return user, company
```

### Query with Caching

```python
from api.database import connection_pool

async def get_companies_with_cache():
    # This query will be cached automatically
    result = await connection_pool.execute_query(
        "SELECT * FROM companies WHERE active = :active",
        {"active": True},
        use_cache=True
    )
    return result
```

### Performance Monitoring

```python
from api.database import database_initializer

async def check_performance():
    # Get comprehensive performance metrics
    metrics = await database_initializer.connection_pool.get_performance_metrics()
    
    print(f"Average query time: {metrics['query_performance']['average_response_time']:.3f}s")
    print(f"Cache hit rate: {metrics['cache_stats']['hit_rate']:.1f}%")
    print(f"Active connections: {metrics['pool_status']['primary']['checked_out']}")
```

## Backup and Recovery

### Manual Backup

```python
from api.database import backup_manager

async def create_backup():
    # Create a backup
    metadata = await backup_manager.create_backup(
        db_type="sqlite",
        connection_params={"database_path": "./data/frontier_business.db"},
        backup_name="manual_backup"
    )
    
    print(f"Backup created: {metadata.backup_type} - {metadata.file_size} bytes")
```

### Restore from Backup

```python
async def restore_backup():
    # List available backups
    backups = await backup_manager.list_backups("sqlite")
    
    if backups:
        latest_backup = backups[0]
        success = await backup_manager.restore_backup(
            backup_path=Path(latest_backup["backup_path"]),
            db_type="sqlite",
            connection_params={"database_path": "./data/frontier_business.db"}
        )
        
        if success:
            print("Database restored successfully")
```

## Migration Management

### Create Migration

```python
from api.database import MigrationManager

async def create_migration():
    migration_manager = MigrationManager()
    
    # Create a new migration
    await migration_manager.create_migration(
        message="Add new business metrics table"
    )
```

### Run Migrations

```python
async def upgrade_database():
    migration_manager = MigrationManager()
    
    # Upgrade to latest version
    await migration_manager.upgrade_to_head()
```

## Health Monitoring

```python
from api.database import health_check

async def monitor_system():
    # Get comprehensive health status
    health = await health_check()
    
    if health["status"] == "healthy":
        print("All systems operational")
    else:
        print(f"System status: {health['status']}")
        if "error" in health:
            print(f"Error: {health['error']}")
```

## Production Deployment

### PostgreSQL Setup

1. Install PostgreSQL
2. Create database and user:

```sql
CREATE DATABASE frontier_business;
CREATE USER frontier_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE frontier_business TO frontier_user;
```

3. Configure environment:

```bash
export PRIMARY_DATABASE=postgresql
export POSTGRES_HOST=your-postgres-host
export POSTGRES_DB=frontier_business
export POSTGRES_USER=frontier_user
export POSTGRES_PASSWORD=secure_password
```

### Redis Setup

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis for caching
export REDIS_HOST=your-redis-host
export REDIS_PORT=6379
export ENABLE_QUERY_CACHING=true
```

### Cloud Backup Setup

#### AWS S3

```bash
export ENABLE_CLOUD_BACKUP=true
export CLOUD_PROVIDER=aws
export AWS_S3_BACKUP_BUCKET=your-backup-bucket
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
```

#### Azure Blob Storage

```bash
export ENABLE_CLOUD_BACKUP=true
export CLOUD_PROVIDER=azure
export AZURE_STORAGE_ACCOUNT=your-storage-account
export AZURE_STORAGE_KEY=your-storage-key
export AZURE_BACKUP_CONTAINER=backups
```

## Monitoring and Alerts

The system provides comprehensive monitoring capabilities:

- Connection pool utilization
- Query performance metrics
- Cache hit rates
- Error rates and slow queries
- System resource usage
- Backup success/failure notifications

## Security Features

- Backup encryption with configurable algorithms
- Connection string security (no passwords in logs)
- SQL injection prevention through parameterized queries
- Role-based access control integration
- Audit logging for all database operations

## Performance Tuning

### Connection Pool Optimization

```python
# Adjust pool settings based on workload
config_override = {
    "pool_size": 20,  # Increase for high concurrency
    "max_overflow": 40,
    "pool_timeout": 60,
    "slow_query_threshold": 0.5  # Stricter slow query detection
}

await initialize_database(config_override)
```

### Query Optimization

- Enable query caching for read-heavy workloads
- Monitor slow queries and optimize indexes
- Use connection pooling for better resource utilization
- Implement proper database normalization

### Caching Strategy

- Cache frequently accessed data with appropriate TTL
- Use cache invalidation for data consistency
- Monitor cache hit rates and adjust cache size
- Implement cache warming for critical queries

## Troubleshooting

### Common Issues

1. **Connection Pool Exhaustion**
   - Increase `pool_size` and `max_overflow`
   - Check for connection leaks in application code
   - Monitor connection usage patterns

2. **Slow Query Performance**
   - Review queries flagged by slow query monitor
   - Add appropriate database indexes
   - Optimize query structure and joins

3. **Backup Failures**
   - Check disk space and permissions
   - Verify cloud storage credentials
   - Review backup logs for specific errors

4. **Cache Issues**
   - Verify Redis connectivity
   - Check cache configuration and TTL settings
   - Monitor cache memory usage

### Debug Mode

Enable debug mode for detailed logging:

```python
await initialize_database({
    "debug": True,
    "log_slow_queries": True,
    "enable_monitoring": True
})
```

## API Reference

See individual module documentation for detailed API references:

- `config.py` - Configuration management
- `adapters.py` - Database adapters and connections
- `schema.py` - Database schema definitions
- `migrations.py` - Migration management
- `backup.py` - Backup and recovery
- `optimization.py` - Performance optimization and caching

## Contributing

When contributing to the database system:

1. Follow the established patterns for new features
2. Add comprehensive tests for all new functionality
3. Update documentation for any API changes
4. Ensure backward compatibility with existing schemas
5. Test with multiple database backends
