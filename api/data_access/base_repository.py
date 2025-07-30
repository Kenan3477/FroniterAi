"""
Base Repository

Foundation repository class implementing core CRUD operations and common
database patterns with support for caching, validation, and error handling.
"""

import asyncio
from typing import Any, Dict, List, Optional, Type, TypeVar, Generic, Union
from uuid import UUID
from datetime import datetime
from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import func, and_, or_
import logging

from .models import BaseModel
from .exceptions import (
    RepositoryException, 
    EntityNotFoundException, 
    ValidationException,
    DuplicateEntityException
)
from .validators import BaseValidator
from .query_builder import QueryBuilder, QueryResult, PaginationParams
from .cache_manager import CacheManager

logger = logging.getLogger(__name__)

# Generic type for model instances
ModelType = TypeVar('ModelType', bound=BaseModel)

class RepositoryConfig:
    """Repository configuration"""
    
    def __init__(
        self,
        enable_caching: bool = True,
        cache_ttl: int = 3600,
        enable_soft_delete: bool = True,
        enable_audit_logging: bool = True,
        validate_on_save: bool = True,
        auto_commit: bool = False
    ):
        self.enable_caching = enable_caching
        self.cache_ttl = cache_ttl
        self.enable_soft_delete = enable_soft_delete
        self.enable_audit_logging = enable_audit_logging
        self.validate_on_save = validate_on_save
        self.auto_commit = auto_commit

class BaseRepository(Generic[ModelType], ABC):
    """
    Base repository class providing common database operations
    with caching, validation, and error handling
    """
    
    def __init__(
        self, 
        session: Session,
        model: Type[ModelType],
        cache_manager: Optional[CacheManager] = None,
        validator: Optional[BaseValidator] = None,
        config: Optional[RepositoryConfig] = None
    ):
        self.session = session
        self.model = model
        self.cache_manager = cache_manager
        self.validator = validator
        self.config = config or RepositoryConfig()
        
        # Cache key prefixes
        self._cache_prefix = f"{self.model.__name__.lower()}:"
        self._list_cache_prefix = f"{self.model.__name__.lower()}_list:"
        
        # Query builder factory
        from .query_builder import QueryBuilderFactory
        self.query_factory = QueryBuilderFactory(session)
    
    def _get_cache_key(self, entity_id: Union[str, UUID, int]) -> str:
        """Generate cache key for entity"""
        return f"{self._cache_prefix}{entity_id}"
    
    def _get_list_cache_key(self, **kwargs) -> str:
        """Generate cache key for list queries"""
        key_parts = [self._list_cache_prefix]
        for k, v in sorted(kwargs.items()):
            key_parts.append(f"{k}:{v}")
        return ":".join(key_parts)
    
    async def _cache_get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.config.enable_caching or not self.cache_manager:
            return None
        
        try:
            return await self.cache_manager.get(key)
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
            return None
    
    async def _cache_set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        if not self.config.enable_caching or not self.cache_manager:
            return False
        
        try:
            cache_ttl = ttl or self.config.cache_ttl
            return await self.cache_manager.set(key, value, cache_ttl)
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
            return False
    
    async def _cache_delete(self, key: str) -> bool:
        """Delete value from cache"""
        if not self.config.enable_caching or not self.cache_manager:
            return False
        
        try:
            return await self.cache_manager.delete(key)
        except Exception as e:
            logger.warning(f"Cache delete error: {e}")
            return False
    
    async def _invalidate_cache_pattern(self, pattern: str) -> int:
        """Invalidate cache entries matching pattern"""
        if not self.config.enable_caching or not self.cache_manager:
            return 0
        
        try:
            return await self.cache_manager.invalidate_pattern(pattern)
        except Exception as e:
            logger.warning(f"Cache invalidation error: {e}")
            return 0
    
    def _validate_entity(self, entity: ModelType) -> bool:
        """Validate entity before save"""
        if not self.config.validate_on_save or not self.validator:
            return True
        
        try:
            return self.validator.validate(entity)
        except Exception as e:
            raise ValidationException(
                message=f"Validation failed: {e}",
                model=self.model.__name__,
                inner_exception=e
            )
    
    def _log_operation(self, operation: str, entity_id: Optional[Any] = None, **kwargs):
        """Log repository operations"""
        if not self.config.enable_audit_logging:
            return
        
        log_data = {
            "operation": operation,
            "model": self.model.__name__,
            "entity_id": entity_id,
            **kwargs
        }
        
        logger.info(f"Repository operation: {log_data}")
    
    def query(self) -> QueryBuilder:
        """Create a new query builder for this repository's model"""
        return self.query_factory.for_model(self.model)
    
    async def get_by_id(self, entity_id: Union[str, UUID, int]) -> Optional[ModelType]:
        """Get entity by ID with caching support"""
        try:
            # Check cache first
            cache_key = self._get_cache_key(entity_id)
            cached_entity = await self._cache_get(cache_key)
            
            if cached_entity is not None:
                self._log_operation("get_by_id_cached", entity_id)
                return cached_entity
            
            # Query database
            entity = self.session.query(self.model).filter(
                self.model.id == entity_id
            ).first()
            
            if entity:
                # Cache the result
                await self._cache_set(cache_key, entity)
                self._log_operation("get_by_id", entity_id)
            
            return entity
            
        except Exception as e:
            self._log_operation("get_by_id_error", entity_id, error=str(e))
            raise RepositoryException(
                message=f"Error retrieving entity by ID: {e}",
                model=self.model.__name__,
                operation="get_by_id",
                inner_exception=e
            )
    
    async def get_by_id_or_fail(self, entity_id: Union[str, UUID, int]) -> ModelType:
        """Get entity by ID or raise exception if not found"""
        entity = await self.get_by_id(entity_id)
        
        if entity is None:
            raise EntityNotFoundException(
                entity_id=entity_id,
                model=self.model.__name__
            )
        
        return entity
    
    async def exists(self, entity_id: Union[str, UUID, int]) -> bool:
        """Check if entity exists by ID"""
        try:
            # Check cache first
            cache_key = self._get_cache_key(entity_id)
            cached_entity = await self._cache_get(cache_key)
            
            if cached_entity is not None:
                return True
            
            # Query database
            exists = self.session.query(
                self.session.query(self.model).filter(
                    self.model.id == entity_id
                ).exists()
            ).scalar()
            
            return bool(exists)
            
        except Exception as e:
            self._log_operation("exists_error", entity_id, error=str(e))
            raise RepositoryException(
                message=f"Error checking entity existence: {e}",
                model=self.model.__name__,
                operation="exists",
                inner_exception=e
            )
    
    async def create(self, entity_data: Dict[str, Any]) -> ModelType:
        """Create new entity"""
        try:
            # Create entity instance
            entity = self.model(**entity_data)
            
            # Validate entity
            self._validate_entity(entity)
            
            # Add to session
            self.session.add(entity)
            
            if self.config.auto_commit:
                self.session.commit()
                self.session.refresh(entity)
            else:
                self.session.flush()
            
            # Cache the new entity
            cache_key = self._get_cache_key(entity.id)
            await self._cache_set(cache_key, entity)
            
            # Invalidate list caches
            await self._invalidate_cache_pattern(f"{self._list_cache_prefix}*")
            
            self._log_operation("create", entity.id)
            return entity
            
        except IntegrityError as e:
            self.session.rollback()
            self._log_operation("create_integrity_error", error=str(e))
            raise DuplicateEntityException(
                message=f"Entity already exists: {e}",
                model=self.model.__name__,
                inner_exception=e
            )
        except Exception as e:
            self.session.rollback()
            self._log_operation("create_error", error=str(e))
            raise RepositoryException(
                message=f"Error creating entity: {e}",
                model=self.model.__name__,
                operation="create",
                inner_exception=e
            )
    
    async def update(
        self, 
        entity_id: Union[str, UUID, int], 
        update_data: Dict[str, Any]
    ) -> ModelType:
        """Update existing entity"""
        try:
            # Get existing entity
            entity = await self.get_by_id_or_fail(entity_id)
            
            # Update attributes
            for key, value in update_data.items():
                if hasattr(entity, key):
                    setattr(entity, key, value)
            
            # Update timestamp if available
            if hasattr(entity, 'updated_at'):
                entity.updated_at = datetime.utcnow()
            
            # Validate entity
            self._validate_entity(entity)
            
            if self.config.auto_commit:
                self.session.commit()
                self.session.refresh(entity)
            else:
                self.session.flush()
            
            # Update cache
            cache_key = self._get_cache_key(entity.id)
            await self._cache_set(cache_key, entity)
            
            # Invalidate list caches
            await self._invalidate_cache_pattern(f"{self._list_cache_prefix}*")
            
            self._log_operation("update", entity_id)
            return entity
            
        except EntityNotFoundException:
            raise
        except Exception as e:
            self.session.rollback()
            self._log_operation("update_error", entity_id, error=str(e))
            raise RepositoryException(
                message=f"Error updating entity: {e}",
                model=self.model.__name__,
                operation="update",
                inner_exception=e
            )
    
    async def delete(self, entity_id: Union[str, UUID, int]) -> bool:
        """Delete entity (soft delete if enabled)"""
        try:
            # Get existing entity
            entity = await self.get_by_id_or_fail(entity_id)
            
            if self.config.enable_soft_delete and hasattr(entity, 'deleted_at'):
                # Soft delete
                entity.deleted_at = datetime.utcnow()
                
                if self.config.auto_commit:
                    self.session.commit()
                else:
                    self.session.flush()
            else:
                # Hard delete
                self.session.delete(entity)
                
                if self.config.auto_commit:
                    self.session.commit()
                else:
                    self.session.flush()
            
            # Remove from cache
            cache_key = self._get_cache_key(entity_id)
            await self._cache_delete(cache_key)
            
            # Invalidate list caches
            await self._invalidate_cache_pattern(f"{self._list_cache_prefix}*")
            
            self._log_operation("delete", entity_id)
            return True
            
        except EntityNotFoundException:
            return False
        except Exception as e:
            self.session.rollback()
            self._log_operation("delete_error", entity_id, error=str(e))
            raise RepositoryException(
                message=f"Error deleting entity: {e}",
                model=self.model.__name__,
                operation="delete",
                inner_exception=e
            )
    
    async def get_all(
        self, 
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        include_deleted: bool = False
    ) -> List[ModelType]:
        """Get all entities with optional pagination"""
        try:
            # Create cache key
            cache_key = self._get_list_cache_key(
                limit=limit,
                offset=offset,
                include_deleted=include_deleted
            )
            
            # Check cache
            cached_result = await self._cache_get(cache_key)
            if cached_result is not None:
                self._log_operation("get_all_cached")
                return cached_result
            
            # Build query
            query = self.session.query(self.model)
            
            # Filter out soft deleted records
            if (self.config.enable_soft_delete and 
                hasattr(self.model, 'deleted_at') and 
                not include_deleted):
                query = query.filter(self.model.deleted_at.is_(None))
            
            # Apply pagination
            if offset:
                query = query.offset(offset)
            if limit:
                query = query.limit(limit)
            
            entities = query.all()
            
            # Cache result
            await self._cache_set(cache_key, entities)
            
            self._log_operation("get_all", count=len(entities))
            return entities
            
        except Exception as e:
            self._log_operation("get_all_error", error=str(e))
            raise RepositoryException(
                message=f"Error retrieving entities: {e}",
                model=self.model.__name__,
                operation="get_all",
                inner_exception=e
            )
    
    async def count(self, include_deleted: bool = False) -> int:
        """Get total count of entities"""
        try:
            query = self.session.query(func.count(self.model.id))
            
            # Filter out soft deleted records
            if (self.config.enable_soft_delete and 
                hasattr(self.model, 'deleted_at') and 
                not include_deleted):
                query = query.filter(self.model.deleted_at.is_(None))
            
            count = query.scalar()
            
            self._log_operation("count", count=count)
            return count or 0
            
        except Exception as e:
            self._log_operation("count_error", error=str(e))
            raise RepositoryException(
                message=f"Error counting entities: {e}",
                model=self.model.__name__,
                operation="count",
                inner_exception=e
            )
    
    async def find_by(
        self, 
        filters: Dict[str, Any],
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[ModelType]:
        """Find entities by filter criteria"""
        try:
            # Create cache key
            cache_key = self._get_list_cache_key(
                filters=filters,
                limit=limit,
                offset=offset
            )
            
            # Check cache
            cached_result = await self._cache_get(cache_key)
            if cached_result is not None:
                self._log_operation("find_by_cached")
                return cached_result
            
            # Build query using query builder
            builder = self.query()
            
            for field, value in filters.items():
                builder.filter_by(**{field: value})
            
            if limit:
                builder.paginate(1, limit)
            
            entities = builder.all()
            
            # Cache result
            await self._cache_set(cache_key, entities)
            
            self._log_operation("find_by", filters=filters, count=len(entities))
            return entities
            
        except Exception as e:
            self._log_operation("find_by_error", filters=filters, error=str(e))
            raise RepositoryException(
                message=f"Error finding entities: {e}",
                model=self.model.__name__,
                operation="find_by",
                inner_exception=e
            )
    
    async def find_one_by(self, filters: Dict[str, Any]) -> Optional[ModelType]:
        """Find single entity by filter criteria"""
        entities = await self.find_by(filters, limit=1)
        return entities[0] if entities else None
    
    async def find_one_by_or_fail(self, filters: Dict[str, Any]) -> ModelType:
        """Find single entity by filter criteria or raise exception"""
        entity = await self.find_one_by(filters)
        
        if entity is None:
            raise EntityNotFoundException(
                message=f"Entity not found with filters: {filters}",
                model=self.model.__name__
            )
        
        return entity
    
    async def bulk_create(self, entities_data: List[Dict[str, Any]]) -> List[ModelType]:
        """Create multiple entities in bulk"""
        try:
            entities = []
            
            for entity_data in entities_data:
                entity = self.model(**entity_data)
                self._validate_entity(entity)
                entities.append(entity)
            
            self.session.add_all(entities)
            
            if self.config.auto_commit:
                self.session.commit()
                for entity in entities:
                    self.session.refresh(entity)
            else:
                self.session.flush()
            
            # Invalidate list caches
            await self._invalidate_cache_pattern(f"{self._list_cache_prefix}*")
            
            self._log_operation("bulk_create", count=len(entities))
            return entities
            
        except Exception as e:
            self.session.rollback()
            self._log_operation("bulk_create_error", count=len(entities_data), error=str(e))
            raise RepositoryException(
                message=f"Error bulk creating entities: {e}",
                model=self.model.__name__,
                operation="bulk_create",
                inner_exception=e
            )
    
    async def bulk_update(
        self, 
        filters: Dict[str, Any], 
        update_data: Dict[str, Any]
    ) -> int:
        """Update multiple entities in bulk"""
        try:
            query = self.session.query(self.model)
            
            # Apply filters
            for field, value in filters.items():
                query = query.filter(getattr(self.model, field) == value)
            
            # Update timestamp if available
            if hasattr(self.model, 'updated_at'):
                update_data['updated_at'] = datetime.utcnow()
            
            updated_count = query.update(update_data)
            
            if self.config.auto_commit:
                self.session.commit()
            else:
                self.session.flush()
            
            # Invalidate all caches for this model
            await self._invalidate_cache_pattern(f"{self._cache_prefix}*")
            await self._invalidate_cache_pattern(f"{self._list_cache_prefix}*")
            
            self._log_operation("bulk_update", filters=filters, count=updated_count)
            return updated_count
            
        except Exception as e:
            self.session.rollback()
            self._log_operation("bulk_update_error", filters=filters, error=str(e))
            raise RepositoryException(
                message=f"Error bulk updating entities: {e}",
                model=self.model.__name__,
                operation="bulk_update",
                inner_exception=e
            )
    
    async def bulk_delete(self, filters: Dict[str, Any]) -> int:
        """Delete multiple entities in bulk"""
        try:
            query = self.session.query(self.model)
            
            # Apply filters
            for field, value in filters.items():
                query = query.filter(getattr(self.model, field) == value)
            
            if self.config.enable_soft_delete and hasattr(self.model, 'deleted_at'):
                # Soft delete
                deleted_count = query.update({'deleted_at': datetime.utcnow()})
            else:
                # Hard delete
                deleted_count = query.delete()
            
            if self.config.auto_commit:
                self.session.commit()
            else:
                self.session.flush()
            
            # Invalidate all caches for this model
            await self._invalidate_cache_pattern(f"{self._cache_prefix}*")
            await self._invalidate_cache_pattern(f"{self._list_cache_prefix}*")
            
            self._log_operation("bulk_delete", filters=filters, count=deleted_count)
            return deleted_count
            
        except Exception as e:
            self.session.rollback()
            self._log_operation("bulk_delete_error", filters=filters, error=str(e))
            raise RepositoryException(
                message=f"Error bulk deleting entities: {e}",
                model=self.model.__name__,
                operation="bulk_delete",
                inner_exception=e
            )
    
    async def paginate(
        self,
        page: int = 1,
        page_size: int = 20,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: Optional[str] = None,
        sort_direction: str = "asc"
    ) -> QueryResult:
        """Get paginated results with metadata"""
        try:
            # Build query
            builder = self.query()
            
            # Apply filters
            if filters:
                for field, value in filters.items():
                    builder.filter_by(**{field: value})
            
            # Apply sorting
            if sort_by:
                builder.sort(sort_by, sort_direction)
            
            # Apply pagination
            builder.paginate(page, page_size)
            
            # Get results
            result = builder.paginate_result()
            
            self._log_operation(
                "paginate", 
                page=page, 
                page_size=page_size,
                total_count=result.total_count
            )
            
            return result
            
        except Exception as e:
            self._log_operation(
                "paginate_error", 
                page=page, 
                page_size=page_size, 
                error=str(e)
            )
            raise RepositoryException(
                message=f"Error paginating entities: {e}",
                model=self.model.__name__,
                operation="paginate",
                inner_exception=e
            )
    
    def commit(self):
        """Commit current transaction"""
        try:
            self.session.commit()
            self._log_operation("commit")
        except Exception as e:
            self.session.rollback()
            self._log_operation("commit_error", error=str(e))
            raise RepositoryException(
                message=f"Error committing transaction: {e}",
                model=self.model.__name__,
                operation="commit",
                inner_exception=e
            )
    
    def rollback(self):
        """Rollback current transaction"""
        try:
            self.session.rollback()
            self._log_operation("rollback")
        except Exception as e:
            self._log_operation("rollback_error", error=str(e))
            raise RepositoryException(
                message=f"Error rolling back transaction: {e}",
                model=self.model.__name__,
                operation="rollback",
                inner_exception=e
            )
