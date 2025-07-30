# Frontier Data Access Layer

A comprehensive data access layer implementing repository pattern, ORM mappings, validation, caching, and transaction management for Frontier business operations.

## Overview

The data access layer provides a robust foundation for database operations with the following key features:

- **Repository Pattern**: Clean separation of concerns with domain-specific repositories
- **ORM Mappings**: Complete SQLAlchemy models for all business entities
- **Validation Framework**: Comprehensive validation with business rules
- **Caching System**: High-performance caching with multiple backends
- **Transaction Management**: Unit of Work pattern for transaction coordination
- **Query Builder**: Advanced query construction with filtering, sorting, and pagination
- **Connection Management**: Database connection pooling and health monitoring

## Architecture

```
api/data_access/
├── __init__.py              # Module exports and configuration
├── models.py                # ORM models and relationships
├── exceptions.py            # Exception hierarchy
├── validators.py            # Validation framework
├── connection_manager.py    # Database connection management
├── cache_manager.py         # Caching system
├── query_builder.py         # Query construction
├── base_repository.py       # Base repository implementation
├── repositories.py          # Domain-specific repositories
└── unit_of_work.py         # Transaction management
```

## Quick Start

### 1. Initialize Data Access Layer

```python
from api.data_access import initialize_data_access

# Initialize with database URL
connection_manager, cache_manager, uow_factory = await initialize_data_access(
    database_url="postgresql://user:pass@localhost/frontier",
    cache_backend="redis",  # or "memory"
    enable_logging=True
)
```

### 2. Create Database Tables

```python
from api.data_access import create_all_tables

# Create all database tables
await create_all_tables(connection_manager)
```

### 3. Use Unit of Work Pattern

```python
# Create and use Unit of Work
async with uow_factory.transaction() as uow:
    # Create user
    user_data = {
        "username": "john_doe",
        "email": "john@example.com",
        "first_name": "John",
        "last_name": "Doe"
    }
    user = await uow.users.create(user_data)
    
    # Create company
    company_data = {
        "name": "Acme Corp",
        "owner_id": user.id,
        "description": "Technology company"
    }
    company = await uow.companies.create(company_data)
    
    # Transaction automatically commits
```

## Core Components

### Models

Complete ORM models for all business entities:

```python
from api.data_access.models import UserModel, CompanyModel, FinancialStatementModel

# Models include relationships, validation, and business logic
user = UserModel(username="john", email="john@example.com")
company = CompanyModel(name="Acme Corp", owner=user)
```

### Repositories

Domain-specific repositories with specialized methods:

```python
from api.data_access.repositories import UserRepository, CompanyRepository

# User operations
user_repo = UserRepository(session, cache_manager)
user = await user_repo.find_by_email("john@example.com")
active_users = await user_repo.get_active_users()

# Company operations
company_repo = CompanyRepository(session, cache_manager)
companies = await company_repo.get_companies_by_state(state_id)
companies = await company_repo.search_companies("tech", industry_id=industry_id)
```

### Query Builder

Advanced query construction:

```python
from api.data_access.query_builder import QueryBuilder

# Build complex queries
builder = QueryBuilder(CompanyModel, session)
result = await (builder
    .filter("status", "eq", "active")
    .filter_like("name", "%tech%")
    .sort("created_at", "desc")
    .include("owner", "industry")
    .paginate(page=1, page_size=20)
    .paginate_result())

print(f"Found {result.total_count} companies")
for company in result.items:
    print(f"- {company.name}")
```

### Validation

Comprehensive validation framework:

```python
from api.data_access.validators import UserValidator, ValidationRule

# Validate entities
validator = UserValidator()
is_valid = validator.validate(user_data)

# Custom validation rules
email_rule = ValidationRule(
    name="email_format",
    validator=lambda value: "@" in value,
    message="Invalid email format"
)
```

### Caching

High-performance caching with multiple backends:

```python
from api.data_access.cache_manager import CacheManager, CacheConfig

# Configure cache
cache_config = CacheConfig(
    backend="redis",
    default_ttl=3600,
    redis_host="localhost"
)

cache_manager = CacheManager(cache_config)
await cache_manager.initialize()

# Cache operations
await cache_manager.set("user:123", user_data, ttl=1800)
cached_user = await cache_manager.get("user:123")
```

## Advanced Features

### Transaction Management

```python
# Automatic transaction handling
async with uow_factory.transaction() as uow:
    # All operations in transaction
    user = await uow.users.create(user_data)
    company = await uow.companies.create(company_data)
    # Auto-commit on success, rollback on error

# Manual transaction control
uow = await uow_factory.create()
await uow.begin()
try:
    # Operations
    await uow.commit()
except Exception:
    await uow.rollback()
```

### Bulk Operations

```python
# Bulk operations for performance
from api.data_access.unit_of_work import BulkOperationManager

async with uow_factory.transaction() as uow:
    bulk_manager = BulkOperationManager(uow)
    
    # Queue operations
    for user_data in user_list:
        bulk_manager.add_create_operation(uow.users, user_data)
    
    # Execute all at once
    results = await bulk_manager.execute()
    print(f"Created {len(results['created'])} users")
```

### Health Monitoring

```python
from api.data_access import health_check

# Check system health
health = await health_check(connection_manager, cache_manager)
print(f"Database: {'OK' if health['database'] else 'FAIL'}")
print(f"Cache: {'OK' if health['cache'] else 'FAIL'}")
```

## Configuration

### Database Configuration

```python
from api.data_access.connection_manager import ConnectionConfig

config = ConnectionConfig(
    database_url="postgresql://user:pass@localhost/frontier",
    pool_size=20,
    max_overflow=30,
    enable_logging=True,
    health_check_interval=60
)
```

### Cache Configuration

```python
from api.data_access.cache_manager import CacheConfig, CacheBackend

config = CacheConfig(
    backend=CacheBackend.REDIS,
    default_ttl=3600,
    redis_host="localhost",
    redis_port=6379,
    max_memory_size=10000
)
```

### Repository Configuration

```python
from api.data_access.base_repository import RepositoryConfig

config = RepositoryConfig(
    enable_caching=True,
    cache_ttl=1800,
    enable_soft_delete=True,
    enable_audit_logging=True,
    validate_on_save=True
)
```

## Error Handling

Comprehensive exception hierarchy:

```python
from api.data_access.exceptions import (
    EntityNotFoundException,
    ValidationException,
    RepositoryException,
    TransactionException
)

try:
    user = await user_repo.get_by_id_or_fail(user_id)
except EntityNotFoundException as e:
    print(f"User not found: {e.entity_id}")
except ValidationException as e:
    print(f"Validation failed: {e.validation_errors}")
except RepositoryException as e:
    print(f"Repository error: {e.message}")
```

## Performance Features

### Query Optimization

- Connection pooling with health monitoring
- Query result caching with TTL management
- Eager loading configuration for relationships
- Query execution plan analysis

### Caching Strategies

- Entity-level caching with automatic invalidation
- Query result caching with pattern-based invalidation
- Multi-backend support (Memory, Redis)
- Cache statistics and monitoring

### Bulk Operations

- Batch processing for large datasets
- Transaction batching for performance
- Bulk insert/update/delete operations
- Progress tracking and error handling

## Testing

The data access layer includes comprehensive test coverage:

```python
# Example test
import pytest
from api.data_access import initialize_data_access

@pytest.fixture
async def data_access():
    return await initialize_data_access("sqlite:///:memory:")

async def test_user_creation(data_access):
    _, _, uow_factory = data_access
    
    async with uow_factory.transaction() as uow:
        user = await uow.users.create({
            "username": "test_user",
            "email": "test@example.com"
        })
        
        assert user.id is not None
        assert user.username == "test_user"
```

## Migration Support

Database migration utilities:

```python
# Create migration
from api.data_access.models import BaseModel

# All models are automatically discovered
# Alembic can generate migrations from model changes

# Apply migrations
await create_all_tables(connection_manager)
```

## Monitoring and Debugging

### Query Logging

Enable SQL query logging for debugging:

```python
await initialize_data_access(
    database_url="...",
    enable_logging=True  # Logs all SQL queries
)
```

### Performance Metrics

```python
# Get cache statistics
stats = cache_manager.get_stats()
print(f"Hit rate: {stats['hit_rate']}%")
print(f"Total requests: {stats['total_requests']}")

# Get connection pool stats
pool_stats = connection_manager.get_pool_stats()
print(f"Active connections: {pool_stats['active']}")
print(f"Pool size: {pool_stats['size']}")
```

## Best Practices

1. **Use Unit of Work**: Always use the Unit of Work pattern for transaction management
2. **Enable Caching**: Configure appropriate caching for your use case
3. **Validate Data**: Use the validation framework for data integrity
4. **Handle Exceptions**: Implement proper exception handling
5. **Monitor Performance**: Use health checks and performance metrics
6. **Test Thoroughly**: Write comprehensive tests for repository operations

## Dependencies

- SQLAlchemy 2.0+ (ORM and database toolkit)
- asyncio (Async support)
- redis (Redis caching backend, optional)
- psycopg2 or asyncpg (PostgreSQL driver)

## License

This data access layer is part of the Frontier business operations platform.
