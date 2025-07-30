"""
Base Database Models

Foundation classes for all database models including common mixins,
base model class, and shared functionality.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.dialects.sqlite import TEXT as SQLiteText

# Create base class
Base = declarative_base()

class TimestampMixin:
    """Mixin for created_at and updated_at timestamps"""
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

class SoftDeleteMixin:
    """Mixin for soft delete functionality"""
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    
    def soft_delete(self):
        """Mark record as deleted"""
        self.is_deleted = True
        self.deleted_at = func.now()
    
    def restore(self):
        """Restore soft-deleted record"""
        self.is_deleted = False
        self.deleted_at = None

class BaseModel(Base):
    """Base model class with common functionality"""
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    def to_dict(self, exclude_fields: Optional[list] = None) -> Dict[str, Any]:
        """Convert model to dictionary"""
        exclude_fields = exclude_fields or []
        
        result = {}
        for column in self.__table__.columns:
            field_name = column.name
            if field_name not in exclude_fields:
                value = getattr(self, field_name)
                
                # Handle datetime serialization
                if isinstance(value, datetime):
                    result[field_name] = value.isoformat()
                else:
                    result[field_name] = value
        
        return result
    
    def update_from_dict(self, data: Dict[str, Any], exclude_fields: Optional[list] = None):
        """Update model from dictionary"""
        exclude_fields = exclude_fields or ['id', 'created_at', 'updated_at']
        
        for key, value in data.items():
            if key not in exclude_fields and hasattr(self, key):
                setattr(self, key, value)
    
    @classmethod
    def get_column_names(cls) -> list:
        """Get list of column names"""
        return [column.name for column in cls.__table__.columns]
    
    def __repr__(self) -> str:
        """String representation"""
        class_name = self.__class__.__name__
        if hasattr(self, 'id'):
            return f"<{class_name}(id={self.id})>"
        return f"<{class_name}>"

class UUIDMixin:
    """Mixin for UUID primary keys"""
    uuid = Column(
        PostgresUUID(as_uuid=True) if 'postgresql' in str(Base.metadata.bind) else SQLiteText,
        default=uuid.uuid4,
        unique=True,
        nullable=False,
        index=True
    )
    
    @hybrid_property
    def uuid_str(self) -> str:
        """Get UUID as string"""
        return str(self.uuid)

class MetadataMixin:
    """Mixin for storing additional metadata"""
    metadata_json = Column(JSON, default=dict)
    tags = Column(JSON, default=list)  # Store tags as JSON array
    
    def add_metadata(self, key: str, value: Any):
        """Add metadata key-value pair"""
        if self.metadata_json is None:
            self.metadata_json = {}
        self.metadata_json[key] = value
    
    def get_metadata(self, key: str, default: Any = None) -> Any:
        """Get metadata value by key"""
        if self.metadata_json is None:
            return default
        return self.metadata_json.get(key, default)
    
    def add_tag(self, tag: str):
        """Add a tag"""
        if self.tags is None:
            self.tags = []
        if tag not in self.tags:
            self.tags.append(tag)
    
    def remove_tag(self, tag: str):
        """Remove a tag"""
        if self.tags and tag in self.tags:
            self.tags.remove(tag)
    
    def has_tag(self, tag: str) -> bool:
        """Check if tag exists"""
        return tag in (self.tags or [])

class VersionMixin:
    """Mixin for record versioning"""
    version = Column(Integer, default=1, nullable=False)
    version_notes = Column(Text)
    
    def increment_version(self, notes: Optional[str] = None):
        """Increment version number"""
        self.version += 1
        if notes:
            self.version_notes = notes

class AuditMixin:
    """Mixin for audit trail information"""
    created_by = Column(String(100))
    updated_by = Column(String(100))
    
    def set_created_by(self, user_id: str):
        """Set created by user"""
        self.created_by = user_id
    
    def set_updated_by(self, user_id: str):
        """Set updated by user"""
        self.updated_by = user_id

class StatusMixin:
    """Mixin for status tracking"""
    status = Column(String(50), default='active', nullable=False)
    status_notes = Column(Text)
    status_changed_at = Column(DateTime)
    status_changed_by = Column(String(100))
    
    def change_status(self, new_status: str, notes: Optional[str] = None, changed_by: Optional[str] = None):
        """Change status with audit trail"""
        self.status = new_status
        self.status_notes = notes
        self.status_changed_at = func.now()
        self.status_changed_by = changed_by

# Combined base model with common mixins
class EnhancedBaseModel(BaseModel, TimestampMixin, SoftDeleteMixin, UUIDMixin, 
                       MetadataMixin, VersionMixin, AuditMixin, StatusMixin):
    """Enhanced base model with all common functionality"""
    __abstract__ = True

# Model registry for dynamic model discovery
MODEL_REGISTRY = {}

def register_model(model_class):
    """Register a model class in the registry"""
    MODEL_REGISTRY[model_class.__name__] = model_class
    return model_class

def get_model_by_name(model_name: str):
    """Get model class by name"""
    return MODEL_REGISTRY.get(model_name)

def get_all_models():
    """Get all registered models"""
    return list(MODEL_REGISTRY.values())

# Utility functions for model operations
def create_tables(engine, models: Optional[list] = None):
    """Create database tables for specified models or all models"""
    if models:
        # Create tables for specific models
        for model in models:
            model.__table__.create(engine, checkfirst=True)
    else:
        # Create all tables
        Base.metadata.create_all(engine)

def drop_tables(engine, models: Optional[list] = None):
    """Drop database tables for specified models or all models"""
    if models:
        # Drop tables for specific models
        for model in models:
            model.__table__.drop(engine, checkfirst=True)
    else:
        # Drop all tables
        Base.metadata.drop_all(engine)

def get_table_info(model_class) -> Dict[str, Any]:
    """Get table information for a model"""
    table = model_class.__table__
    
    columns = []
    for column in table.columns:
        col_info = {
            'name': column.name,
            'type': str(column.type),
            'nullable': column.nullable,
            'primary_key': column.primary_key,
            'unique': column.unique,
            'default': str(column.default) if column.default else None
        }
        columns.append(col_info)
    
    indexes = []
    for index in table.indexes:
        idx_info = {
            'name': index.name,
            'columns': [col.name for col in index.columns],
            'unique': index.unique
        }
        indexes.append(idx_info)
    
    constraints = []
    for constraint in table.constraints:
        const_info = {
            'name': constraint.name,
            'type': constraint.__class__.__name__
        }
        constraints.append(const_info)
    
    return {
        'table_name': table.name,
        'columns': columns,
        'indexes': indexes,
        'constraints': constraints
    }

def validate_model_data(model_class, data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate data against model schema"""
    errors = {}
    warnings = []
    
    # Get model columns
    columns = {col.name: col for col in model_class.__table__.columns}
    
    # Check required fields
    for col_name, column in columns.items():
        if not column.nullable and column.default is None and col_name not in data:
            errors[col_name] = f"Field '{col_name}' is required"
    
    # Check data types and constraints
    for field_name, value in data.items():
        if field_name in columns:
            column = columns[field_name]
            
            # Type checking would go here
            # This is a simplified version
            if value is not None:
                # Add specific type validation based on column type
                pass
        else:
            warnings.append(f"Field '{field_name}' is not defined in model")
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }

# Database event listeners for automatic audit trail
from sqlalchemy import event

@event.listens_for(BaseModel, 'before_insert', propagate=True)
def receive_before_insert(mapper, connection, target):
    """Set created timestamp and audit info before insert"""
    if hasattr(target, 'created_at') and target.created_at is None:
        target.created_at = datetime.utcnow()
    
    if hasattr(target, 'updated_at') and target.updated_at is None:
        target.updated_at = datetime.utcnow()

@event.listens_for(BaseModel, 'before_update', propagate=True)
def receive_before_update(mapper, connection, target):
    """Set updated timestamp before update"""
    if hasattr(target, 'updated_at'):
        target.updated_at = datetime.utcnow()

# Database utilities
class DatabaseUtility:
    """Utility class for common database operations"""
    
    @staticmethod
    def get_or_create(session, model_class, defaults=None, **kwargs):
        """Get existing record or create new one"""
        instance = session.query(model_class).filter_by(**kwargs).first()
        if instance:
            return instance, False
        else:
            params = kwargs.copy()
            if defaults:
                params.update(defaults)
            instance = model_class(**params)
            session.add(instance)
            return instance, True
    
    @staticmethod
    def bulk_create(session, model_class, data_list: list):
        """Bulk create records"""
        instances = []
        for data in data_list:
            instance = model_class(**data)
            instances.append(instance)
        
        session.bulk_save_objects(instances)
        return instances
    
    @staticmethod
    def soft_delete_cascade(session, instance, related_fields: list):
        """Soft delete with cascade to related objects"""
        if hasattr(instance, 'soft_delete'):
            instance.soft_delete()
            
            # Cascade to related objects
            for field_name in related_fields:
                if hasattr(instance, field_name):
                    related_objects = getattr(instance, field_name)
                    if hasattr(related_objects, '__iter__'):
                        # Collection of related objects
                        for related_obj in related_objects:
                            if hasattr(related_obj, 'soft_delete'):
                                related_obj.soft_delete()
                    elif hasattr(related_objects, 'soft_delete'):
                        # Single related object
                        related_objects.soft_delete()
    
    @staticmethod
    def get_model_statistics(session, model_class) -> Dict[str, Any]:
        """Get statistics for a model"""
        total_count = session.query(model_class).count()
        
        stats = {'total_count': total_count}
        
        # Add soft delete stats if applicable
        if hasattr(model_class, 'is_deleted'):
            active_count = session.query(model_class).filter_by(is_deleted=False).count()
            deleted_count = total_count - active_count
            stats.update({
                'active_count': active_count,
                'deleted_count': deleted_count
            })
        
        # Add timestamp stats if applicable
        if hasattr(model_class, 'created_at'):
            from sqlalchemy import func
            latest_record = session.query(func.max(model_class.created_at)).scalar()
            oldest_record = session.query(func.min(model_class.created_at)).scalar()
            stats.update({
                'latest_created': latest_record.isoformat() if latest_record else None,
                'oldest_created': oldest_record.isoformat() if oldest_record else None
            })
        
        return stats
