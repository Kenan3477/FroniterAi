"""
Data Access Exceptions

Custom exception classes for the data access layer with proper error handling,
logging, and contextual information.
"""

from typing import Any, Dict, Optional, List
import logging

logger = logging.getLogger(__name__)

class DataAccessException(Exception):
    """Base exception for data access layer"""
    
    def __init__(
        self, 
        message: str, 
        error_code: str = None,
        context: Dict[str, Any] = None,
        inner_exception: Exception = None
    ):
        self.message = message
        self.error_code = error_code or "DATA_ACCESS_ERROR"
        self.context = context or {}
        self.inner_exception = inner_exception
        
        # Log the exception
        logger.error(
            f"DataAccessException: {message}",
            extra={
                "error_code": self.error_code,
                "context": self.context,
                "inner_exception": str(inner_exception) if inner_exception else None
            }
        )
        
        super().__init__(message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses"""
        return {
            "error_code": self.error_code,
            "message": self.message,
            "context": self.context,
            "inner_exception": str(self.inner_exception) if self.inner_exception else None
        }

class ValidationException(DataAccessException):
    """Exception for data validation errors"""
    
    def __init__(
        self,
        message: str,
        field_errors: Dict[str, List[str]] = None,
        model_name: str = None,
        context: Dict[str, Any] = None
    ):
        self.field_errors = field_errors or {}
        self.model_name = model_name
        
        # Enhanced context with validation details
        validation_context = {
            "model_name": model_name,
            "field_errors": self.field_errors,
            **(context or {})
        }
        
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            context=validation_context
        )
    
    def add_field_error(self, field: str, error: str):
        """Add a field-specific error"""
        if field not in self.field_errors:
            self.field_errors[field] = []
        self.field_errors[field].append(error)
    
    def has_field_errors(self) -> bool:
        """Check if there are any field errors"""
        return bool(self.field_errors)
    
    def get_field_errors(self, field: str) -> List[str]:
        """Get errors for a specific field"""
        return self.field_errors.get(field, [])

class RepositoryException(DataAccessException):
    """Exception for repository-level operations"""
    
    def __init__(
        self,
        message: str,
        repository_name: str = None,
        operation: str = None,
        entity_id: str = None,
        context: Dict[str, Any] = None,
        inner_exception: Exception = None
    ):
        self.repository_name = repository_name
        self.operation = operation
        self.entity_id = entity_id
        
        # Enhanced context with repository details
        repo_context = {
            "repository_name": repository_name,
            "operation": operation,
            "entity_id": entity_id,
            **(context or {})
        }
        
        super().__init__(
            message=message,
            error_code="REPOSITORY_ERROR",
            context=repo_context,
            inner_exception=inner_exception
        )

class EntityNotFoundException(RepositoryException):
    """Exception for when an entity is not found"""
    
    def __init__(
        self,
        entity_type: str,
        entity_id: str = None,
        search_criteria: Dict[str, Any] = None,
        context: Dict[str, Any] = None
    ):
        self.entity_type = entity_type
        self.search_criteria = search_criteria or {}
        
        if entity_id:
            message = f"{entity_type} with ID '{entity_id}' not found"
        else:
            message = f"{entity_type} not found with criteria: {search_criteria}"
        
        # Enhanced context
        not_found_context = {
            "entity_type": entity_type,
            "search_criteria": self.search_criteria,
            **(context or {})
        }
        
        super().__init__(
            message=message,
            operation="find",
            entity_id=entity_id,
            context=not_found_context
        )
        
        # Override error code
        self.error_code = "ENTITY_NOT_FOUND"

class DuplicateEntityException(RepositoryException):
    """Exception for when attempting to create a duplicate entity"""
    
    def __init__(
        self,
        entity_type: str,
        duplicate_fields: Dict[str, Any],
        context: Dict[str, Any] = None
    ):
        self.entity_type = entity_type
        self.duplicate_fields = duplicate_fields
        
        message = f"Duplicate {entity_type} found with fields: {duplicate_fields}"
        
        # Enhanced context
        duplicate_context = {
            "entity_type": entity_type,
            "duplicate_fields": duplicate_fields,
            **(context or {})
        }
        
        super().__init__(
            message=message,
            operation="create",
            context=duplicate_context
        )
        
        # Override error code
        self.error_code = "DUPLICATE_ENTITY"

class TransactionException(DataAccessException):
    """Exception for transaction management errors"""
    
    def __init__(
        self,
        message: str,
        transaction_id: str = None,
        operation: str = None,
        rollback_attempted: bool = False,
        context: Dict[str, Any] = None,
        inner_exception: Exception = None
    ):
        self.transaction_id = transaction_id
        self.operation = operation
        self.rollback_attempted = rollback_attempted
        
        # Enhanced context with transaction details
        transaction_context = {
            "transaction_id": transaction_id,
            "operation": operation,
            "rollback_attempted": rollback_attempted,
            **(context or {})
        }
        
        super().__init__(
            message=message,
            error_code="TRANSACTION_ERROR",
            context=transaction_context,
            inner_exception=inner_exception
        )

class ConcurrencyException(DataAccessException):
    """Exception for concurrency and locking issues"""
    
    def __init__(
        self,
        message: str,
        entity_type: str = None,
        entity_id: str = None,
        current_version: int = None,
        expected_version: int = None,
        context: Dict[str, Any] = None
    ):
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.current_version = current_version
        self.expected_version = expected_version
        
        # Enhanced context with concurrency details
        concurrency_context = {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "current_version": current_version,
            "expected_version": expected_version,
            **(context or {})
        }
        
        super().__init__(
            message=message,
            error_code="CONCURRENCY_ERROR",
            context=concurrency_context
        )

class CacheException(DataAccessException):
    """Exception for cache-related operations"""
    
    def __init__(
        self,
        message: str,
        cache_key: str = None,
        operation: str = None,
        cache_backend: str = None,
        context: Dict[str, Any] = None,
        inner_exception: Exception = None
    ):
        self.cache_key = cache_key
        self.operation = operation
        self.cache_backend = cache_backend
        
        # Enhanced context with cache details
        cache_context = {
            "cache_key": cache_key,
            "operation": operation,
            "cache_backend": cache_backend,
            **(context or {})
        }
        
        super().__init__(
            message=message,
            error_code="CACHE_ERROR",
            context=cache_context,
            inner_exception=inner_exception
        )

class ConnectionException(DataAccessException):
    """Exception for database connection issues"""
    
    def __init__(
        self,
        message: str,
        connection_string: str = None,
        database_type: str = None,
        operation: str = None,
        retry_count: int = 0,
        context: Dict[str, Any] = None,
        inner_exception: Exception = None
    ):
        self.connection_string = connection_string
        self.database_type = database_type
        self.operation = operation
        self.retry_count = retry_count
        
        # Enhanced context with connection details (sanitized)
        connection_context = {
            "database_type": database_type,
            "operation": operation,
            "retry_count": retry_count,
            # Don't include full connection string for security
            "has_connection_string": bool(connection_string),
            **(context or {})
        }
        
        super().__init__(
            message=message,
            error_code="CONNECTION_ERROR",
            context=connection_context,
            inner_exception=inner_exception
        )

class QueryException(DataAccessException):
    """Exception for query execution errors"""
    
    def __init__(
        self,
        message: str,
        query: str = None,
        parameters: Dict[str, Any] = None,
        query_type: str = None,
        execution_time_ms: int = None,
        context: Dict[str, Any] = None,
        inner_exception: Exception = None
    ):
        self.query = query
        self.parameters = parameters
        self.query_type = query_type
        self.execution_time_ms = execution_time_ms
        
        # Enhanced context with query details (sanitized)
        query_context = {
            "query_type": query_type,
            "execution_time_ms": execution_time_ms,
            "has_parameters": bool(parameters),
            "parameter_count": len(parameters) if parameters else 0,
            # Include partial query for debugging (first 100 chars)
            "query_preview": query[:100] + "..." if query and len(query) > 100 else query,
            **(context or {})
        }
        
        super().__init__(
            message=message,
            error_code="QUERY_ERROR", 
            context=query_context,
            inner_exception=inner_exception
        )

class ConfigurationException(DataAccessException):
    """Exception for configuration-related errors"""
    
    def __init__(
        self,
        message: str,
        config_key: str = None,
        config_value: Any = None,
        expected_type: str = None,
        context: Dict[str, Any] = None
    ):
        self.config_key = config_key
        self.config_value = config_value
        self.expected_type = expected_type
        
        # Enhanced context with configuration details
        config_context = {
            "config_key": config_key,
            "expected_type": expected_type,
            "actual_type": type(config_value).__name__ if config_value is not None else None,
            **(context or {})
        }
        
        super().__init__(
            message=message,
            error_code="CONFIGURATION_ERROR",
            context=config_context
        )

class AuthorizationException(DataAccessException):
    """Exception for authorization/permission errors"""
    
    def __init__(
        self,
        message: str,
        user_id: str = None,
        required_permission: str = None,
        resource_type: str = None,
        resource_id: str = None,
        context: Dict[str, Any] = None
    ):
        self.user_id = user_id
        self.required_permission = required_permission
        self.resource_type = resource_type
        self.resource_id = resource_id
        
        # Enhanced context with authorization details
        auth_context = {
            "user_id": user_id,
            "required_permission": required_permission,
            "resource_type": resource_type,
            "resource_id": resource_id,
            **(context or {})
        }
        
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR",
            context=auth_context
        )

# Exception mapping for common database errors
DATABASE_ERROR_MAPPING = {
    # PostgreSQL errors
    "23505": DuplicateEntityException,  # unique_violation
    "23503": ValidationException,       # foreign_key_violation
    "23502": ValidationException,       # not_null_violation
    "23514": ValidationException,       # check_violation
    
    # SQLite errors
    "UNIQUE constraint failed": DuplicateEntityException,
    "FOREIGN KEY constraint failed": ValidationException,
    "NOT NULL constraint failed": ValidationException,
    "CHECK constraint failed": ValidationException,
}

def map_database_error(error: Exception, context: Dict[str, Any] = None) -> DataAccessException:
    """Map database-specific errors to appropriate exception types"""
    error_message = str(error)
    
    # Check for specific error patterns
    for pattern, exception_class in DATABASE_ERROR_MAPPING.items():
        if pattern in error_message:
            if exception_class == DuplicateEntityException:
                return DuplicateEntityException(
                    entity_type="Unknown",
                    duplicate_fields={"error": error_message},
                    context=context
                )
            elif exception_class == ValidationException:
                return ValidationException(
                    message=f"Database validation error: {error_message}",
                    context=context
                )
    
    # Default to generic repository exception
    return RepositoryException(
        message=f"Database operation failed: {error_message}",
        context=context,
        inner_exception=error
    )

def handle_exception(func):
    """Decorator to handle and map exceptions in repository methods"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except DataAccessException:
            # Re-raise our custom exceptions
            raise
        except Exception as e:
            # Map other exceptions to our custom types
            context = {
                "function": func.__name__,
                "args": str(args)[:200],  # Limit for logging
                "kwargs": str(kwargs)[:200]
            }
            raise map_database_error(e, context)
    
    return wrapper

async def handle_async_exception(func):
    """Async version of exception handler decorator"""
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except DataAccessException:
            # Re-raise our custom exceptions
            raise
        except Exception as e:
            # Map other exceptions to our custom types
            context = {
                "function": func.__name__,
                "args": str(args)[:200],
                "kwargs": str(kwargs)[:200]
            }
            raise map_database_error(e, context)
    
    return wrapper
