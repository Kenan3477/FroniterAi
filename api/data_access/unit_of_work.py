"""
Unit of Work Pattern

Manages database transactions and coordinates changes across multiple repositories
ensuring data consistency and proper transaction handling.
"""

import asyncio
from typing import Dict, Any, List, Optional, Type, TypeVar, Generic, Callable
from uuid import UUID
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import logging

from .models import BaseModel
from .base_repository import BaseRepository, RepositoryConfig
from .repositories import (
    UserRepository, CompanyRepository, FinancialStatementRepository,
    ComplianceFrameworkRepository, RiskRepository, DocumentRepository,
    AuditLogRepository
)
from .connection_manager import ConnectionManager
from .cache_manager import CacheManager
from .exceptions import (
    UnitOfWorkException, 
    TransactionException,
    RepositoryException
)

logger = logging.getLogger(__name__)

# Generic type for repository instances
RepositoryType = TypeVar('RepositoryType', bound=BaseRepository)

class UnitOfWorkConfig:
    """Unit of Work configuration"""
    
    def __init__(
        self,
        auto_commit: bool = True,
        rollback_on_error: bool = True,
        enable_transaction_logging: bool = True,
        transaction_timeout: int = 30,
        max_retry_attempts: int = 3,
        retry_delay: float = 0.1
    ):
        self.auto_commit = auto_commit
        self.rollback_on_error = rollback_on_error
        self.enable_transaction_logging = enable_transaction_logging
        self.transaction_timeout = transaction_timeout
        self.max_retry_attempts = max_retry_attempts
        self.retry_delay = retry_delay

class TransactionState:
    """Transaction state tracking"""
    
    def __init__(self):
        self.is_active = False
        self.is_committed = False
        self.is_rolled_back = False
        self.operations: List[Dict[str, Any]] = []
        self.savepoints: List[str] = []
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
    
    def add_operation(self, operation: str, entity_type: str, entity_id: Any = None, **kwargs):
        """Add operation to transaction log"""
        self.operations.append({
            'operation': operation,
            'entity_type': entity_type,
            'entity_id': entity_id,
            'timestamp': asyncio.get_event_loop().time(),
            **kwargs
        })
    
    def get_duration(self) -> Optional[float]:
        """Get transaction duration in seconds"""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return None

class UnitOfWork:
    """
    Unit of Work implementation for managing database transactions
    and coordinating repository operations
    """
    
    def __init__(
        self,
        session: Session,
        cache_manager: Optional[CacheManager] = None,
        config: Optional[UnitOfWorkConfig] = None
    ):
        self.session = session
        self.cache_manager = cache_manager
        self.config = config or UnitOfWorkConfig()
        
        # Transaction state
        self.transaction_state = TransactionState()
        
        # Repository instances
        self._repositories: Dict[str, BaseRepository] = {}
        
        # Repository configuration
        self._repo_config = RepositoryConfig(
            auto_commit=False,  # UoW manages commits
            enable_caching=cache_manager is not None,
            enable_audit_logging=self.config.enable_transaction_logging
        )
        
        # Event handlers
        self._before_commit_handlers: List[Callable] = []
        self._after_commit_handlers: List[Callable] = []
        self._before_rollback_handlers: List[Callable] = []
        self._after_rollback_handlers: List[Callable] = []
    
    def _get_repository(self, repository_class: Type[RepositoryType]) -> RepositoryType:
        """Get or create repository instance"""
        repo_name = repository_class.__name__
        
        if repo_name not in self._repositories:
            self._repositories[repo_name] = repository_class(
                session=self.session,
                cache_manager=self.cache_manager,
                config=self._repo_config
            )
        
        return self._repositories[repo_name]
    
    @property
    def users(self) -> UserRepository:
        """Get user repository"""
        return self._get_repository(UserRepository)
    
    @property
    def companies(self) -> CompanyRepository:
        """Get company repository"""
        return self._get_repository(CompanyRepository)
    
    @property
    def financial_statements(self) -> FinancialStatementRepository:
        """Get financial statement repository"""
        return self._get_repository(FinancialStatementRepository)
    
    @property
    def compliance_frameworks(self) -> ComplianceFrameworkRepository:
        """Get compliance framework repository"""
        return self._get_repository(ComplianceFrameworkRepository)
    
    @property
    def risks(self) -> RiskRepository:
        """Get risk repository"""
        return self._get_repository(RiskRepository)
    
    @property
    def documents(self) -> DocumentRepository:
        """Get document repository"""
        return self._get_repository(DocumentRepository)
    
    @property
    def audit_logs(self) -> AuditLogRepository:
        """Get audit log repository"""
        return self._get_repository(AuditLogRepository)
    
    def add_before_commit_handler(self, handler: Callable):
        """Add handler to execute before commit"""
        self._before_commit_handlers.append(handler)
    
    def add_after_commit_handler(self, handler: Callable):
        """Add handler to execute after commit"""
        self._after_commit_handlers.append(handler)
    
    def add_before_rollback_handler(self, handler: Callable):
        """Add handler to execute before rollback"""
        self._before_rollback_handlers.append(handler)
    
    def add_after_rollback_handler(self, handler: Callable):
        """Add handler to execute after rollback"""
        self._after_rollback_handlers.append(handler)
    
    async def begin(self):
        """Begin transaction"""
        try:
            if self.transaction_state.is_active:
                raise UnitOfWorkException(
                    message="Transaction already active",
                    operation="begin"
                )
            
            # Begin database transaction
            self.session.begin()
            
            # Update state
            self.transaction_state.is_active = True
            self.transaction_state.start_time = asyncio.get_event_loop().time()
            
            if self.config.enable_transaction_logging:
                logger.info("Transaction started")
            
        except Exception as e:
            raise UnitOfWorkException(
                message=f"Error starting transaction: {e}",
                operation="begin",
                inner_exception=e
            )
    
    async def commit(self):
        """Commit transaction"""
        try:
            if not self.transaction_state.is_active:
                raise UnitOfWorkException(
                    message="No active transaction to commit",
                    operation="commit"
                )
            
            if self.transaction_state.is_committed:
                raise UnitOfWorkException(
                    message="Transaction already committed",
                    operation="commit"
                )
            
            # Execute before commit handlers
            for handler in self._before_commit_handlers:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(self)
                    else:
                        handler(self)
                except Exception as e:
                    logger.error(f"Before commit handler error: {e}")
                    if self.config.rollback_on_error:
                        await self.rollback()
                        raise
            
            # Commit database transaction
            self.session.commit()
            
            # Update state
            self.transaction_state.is_committed = True
            self.transaction_state.end_time = asyncio.get_event_loop().time()
            
            # Execute after commit handlers
            for handler in self._after_commit_handlers:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(self)
                    else:
                        handler(self)
                except Exception as e:
                    logger.error(f"After commit handler error: {e}")
            
            if self.config.enable_transaction_logging:
                duration = self.transaction_state.get_duration()
                logger.info(
                    f"Transaction committed successfully. "
                    f"Duration: {duration:.3f}s, "
                    f"Operations: {len(self.transaction_state.operations)}"
                )
            
        except Exception as e:
            if self.config.rollback_on_error:
                await self.rollback()
            
            raise TransactionException(
                message=f"Error committing transaction: {e}",
                operation="commit",
                inner_exception=e
            )
    
    async def rollback(self):
        """Rollback transaction"""
        try:
            if not self.transaction_state.is_active:
                return  # Nothing to rollback
            
            # Execute before rollback handlers
            for handler in self._before_rollback_handlers:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(self)
                    else:
                        handler(self)
                except Exception as e:
                    logger.error(f"Before rollback handler error: {e}")
            
            # Rollback database transaction
            self.session.rollback()
            
            # Update state
            self.transaction_state.is_rolled_back = True
            self.transaction_state.end_time = asyncio.get_event_loop().time()
            
            # Execute after rollback handlers
            for handler in self._after_rollback_handlers:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(self)
                    else:
                        handler(self)
                except Exception as e:
                    logger.error(f"After rollback handler error: {e}")
            
            if self.config.enable_transaction_logging:
                duration = self.transaction_state.get_duration()
                logger.info(
                    f"Transaction rolled back. "
                    f"Duration: {duration:.3f}s, "
                    f"Operations: {len(self.transaction_state.operations)}"
                )
            
        except Exception as e:
            logger.error(f"Error rolling back transaction: {e}")
            raise TransactionException(
                message=f"Error rolling back transaction: {e}",
                operation="rollback",
                inner_exception=e
            )
    
    def create_savepoint(self, name: str):
        """Create transaction savepoint"""
        try:
            if not self.transaction_state.is_active:
                raise UnitOfWorkException(
                    message="No active transaction for savepoint",
                    operation="create_savepoint"
                )
            
            # Create savepoint
            savepoint = self.session.begin_nested()
            self.transaction_state.savepoints.append(name)
            
            if self.config.enable_transaction_logging:
                logger.debug(f"Savepoint '{name}' created")
            
            return savepoint
            
        except Exception as e:
            raise UnitOfWorkException(
                message=f"Error creating savepoint: {e}",
                operation="create_savepoint",
                inner_exception=e
            )
    
    def rollback_to_savepoint(self, savepoint):
        """Rollback to savepoint"""
        try:
            savepoint.rollback()
            
            if self.config.enable_transaction_logging:
                logger.debug("Rolled back to savepoint")
            
        except Exception as e:
            raise UnitOfWorkException(
                message=f"Error rolling back to savepoint: {e}",
                operation="rollback_to_savepoint",
                inner_exception=e
            )
    
    async def execute_with_retry(
        self, 
        operation: Callable,
        *args,
        **kwargs
    ) -> Any:
        """Execute operation with retry logic"""
        last_exception = None
        
        for attempt in range(self.config.max_retry_attempts):
            try:
                if asyncio.iscoroutinefunction(operation):
                    return await operation(*args, **kwargs)
                else:
                    return operation(*args, **kwargs)
                    
            except (SQLAlchemyError, RepositoryException) as e:
                last_exception = e
                
                if attempt < self.config.max_retry_attempts - 1:
                    # Rollback and wait before retry
                    await self.rollback()
                    await asyncio.sleep(self.config.retry_delay * (2 ** attempt))
                    await self.begin()
                    
                    if self.config.enable_transaction_logging:
                        logger.warning(
                            f"Operation failed, retrying attempt {attempt + 2}: {e}"
                        )
                else:
                    if self.config.enable_transaction_logging:
                        logger.error(f"Operation failed after {self.config.max_retry_attempts} attempts: {e}")
        
        raise TransactionException(
            message=f"Operation failed after {self.config.max_retry_attempts} attempts",
            operation="execute_with_retry",
            inner_exception=last_exception
        )
    
    def get_transaction_summary(self) -> Dict[str, Any]:
        """Get transaction summary"""
        return {
            'is_active': self.transaction_state.is_active,
            'is_committed': self.transaction_state.is_committed,
            'is_rolled_back': self.transaction_state.is_rolled_back,
            'duration': self.transaction_state.get_duration(),
            'operations_count': len(self.transaction_state.operations),
            'savepoints_count': len(self.transaction_state.savepoints),
            'operations': self.transaction_state.operations[-10:]  # Last 10 operations
        }
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.begin()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if exc_type is None:
            # No exception, commit if auto_commit is enabled
            if self.config.auto_commit:
                await self.commit()
        else:
            # Exception occurred, rollback if enabled
            if self.config.rollback_on_error:
                await self.rollback()
        
        return False  # Don't suppress exceptions

class UnitOfWorkFactory:
    """Factory for creating Unit of Work instances"""
    
    def __init__(
        self,
        connection_manager: ConnectionManager,
        cache_manager: Optional[CacheManager] = None,
        default_config: Optional[UnitOfWorkConfig] = None
    ):
        self.connection_manager = connection_manager
        self.cache_manager = cache_manager
        self.default_config = default_config or UnitOfWorkConfig()
    
    async def create(
        self,
        config: Optional[UnitOfWorkConfig] = None
    ) -> UnitOfWork:
        """Create new Unit of Work instance"""
        session = await self.connection_manager.get_session()
        
        work_config = config or self.default_config
        
        return UnitOfWork(
            session=session,
            cache_manager=self.cache_manager,
            config=work_config
        )
    
    @asynccontextmanager
    async def transaction(
        self,
        config: Optional[UnitOfWorkConfig] = None
    ):
        """Create Unit of Work with transaction context"""
        uow = await self.create(config)
        
        try:
            async with uow:
                yield uow
        finally:
            # Session cleanup is handled by connection manager
            pass
    
    async def execute_in_transaction(
        self,
        operation: Callable,
        config: Optional[UnitOfWorkConfig] = None,
        *args,
        **kwargs
    ) -> Any:
        """Execute operation in transaction"""
        async with self.transaction(config) as uow:
            if asyncio.iscoroutinefunction(operation):
                return await operation(uow, *args, **kwargs)
            else:
                return operation(uow, *args, **kwargs)

class BulkOperationManager:
    """Manager for bulk database operations"""
    
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.batch_size = 1000
        self.operations: List[Dict[str, Any]] = []
    
    def add_create_operation(self, repository: BaseRepository, data: Dict[str, Any]):
        """Add create operation to batch"""
        self.operations.append({
            'type': 'create',
            'repository': repository,
            'data': data
        })
    
    def add_update_operation(
        self, 
        repository: BaseRepository, 
        entity_id: Any, 
        data: Dict[str, Any]
    ):
        """Add update operation to batch"""
        self.operations.append({
            'type': 'update',
            'repository': repository,
            'entity_id': entity_id,
            'data': data
        })
    
    def add_delete_operation(self, repository: BaseRepository, entity_id: Any):
        """Add delete operation to batch"""
        self.operations.append({
            'type': 'delete',
            'repository': repository,
            'entity_id': entity_id
        })
    
    async def execute(self) -> Dict[str, Any]:
        """Execute all batched operations"""
        results = {
            'created': [],
            'updated': [],
            'deleted': [],
            'errors': []
        }
        
        try:
            # Process operations in batches
            for i in range(0, len(self.operations), self.batch_size):
                batch = self.operations[i:i + self.batch_size]
                
                for operation in batch:
                    try:
                        if operation['type'] == 'create':
                            result = await operation['repository'].create(operation['data'])
                            results['created'].append(result)
                        
                        elif operation['type'] == 'update':
                            result = await operation['repository'].update(
                                operation['entity_id'], 
                                operation['data']
                            )
                            results['updated'].append(result)
                        
                        elif operation['type'] == 'delete':
                            success = await operation['repository'].delete(operation['entity_id'])
                            if success:
                                results['deleted'].append(operation['entity_id'])
                    
                    except Exception as e:
                        results['errors'].append({
                            'operation': operation,
                            'error': str(e)
                        })
                
                # Commit batch
                await self.uow.commit()
                await self.uow.begin()
        
        except Exception as e:
            await self.uow.rollback()
            raise TransactionException(
                message=f"Bulk operation failed: {e}",
                operation="bulk_execute",
                inner_exception=e
            )
        
        return results
