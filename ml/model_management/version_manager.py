"""
Model Version Management System

Handles semantic versioning, metadata tracking, and version lifecycle management
for ML models in the Frontier platform.
"""

import hashlib
import json
import logging
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from packaging import version

import torch
import numpy as np
from sqlalchemy import create_engine, Column, String, DateTime, Text, Integer, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class ModelStatus(Enum):
    """Model version status enum"""
    DEVELOPMENT = "development"
    TESTING = "testing"
    STAGING = "staging"
    PRODUCTION = "production"
    DEPRECATED = "deprecated"
    ARCHIVED = "archived"

class ModelType(Enum):
    """Model type enum"""
    FINANCIAL_PREDICTOR = "financial_predictor"
    MARKET_ANALYZER = "market_analyzer"
    RISK_ASSESSOR = "risk_assessor"
    COMPLIANCE_MONITOR = "compliance_monitor"
    BUSINESS_OPTIMIZER = "business_optimizer"
    CUSTOM = "custom"

@dataclass
class ModelVersion:
    """Model version metadata"""
    model_id: str
    version: str
    model_type: ModelType
    status: ModelStatus
    created_at: datetime
    created_by: str
    description: str
    tags: List[str]
    parameters: Dict[str, Any]
    metrics: Dict[str, float]
    dependencies: Dict[str, str]
    model_size_mb: float
    checksum: str
    parent_version: Optional[str] = None
    branch: str = "main"
    commit_hash: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['model_type'] = self.model_type.value
        data['status'] = self.status.value
        data['created_at'] = self.created_at.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ModelVersion':
        """Create from dictionary"""
        data['model_type'] = ModelType(data['model_type'])
        data['status'] = ModelStatus(data['status'])
        data['created_at'] = datetime.fromisoformat(data['created_at'])
        return cls(**data)

class ModelVersionORM(Base):
    """SQLAlchemy model for model versions"""
    __tablename__ = 'model_versions'
    
    model_id = Column(String(100), primary_key=True)
    version = Column(String(50), primary_key=True)
    model_type = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False)
    created_at = Column(DateTime, nullable=False)
    created_by = Column(String(100), nullable=False)
    description = Column(Text)
    tags = Column(JSON)
    parameters = Column(JSON)
    metrics = Column(JSON)
    dependencies = Column(JSON)
    model_size_mb = Column(Integer)
    checksum = Column(String(64), nullable=False)
    parent_version = Column(String(50))
    branch = Column(String(50), default="main")
    commit_hash = Column(String(40))

class ModelVersionManager:
    """
    Manages model versions with semantic versioning, branching, and lifecycle management
    """
    
    def __init__(self, database_url: str = "sqlite:///model_versions.db"):
        self.logger = logging.getLogger(__name__)
        self.engine = create_engine(database_url)
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
    
    def create_version(
        self,
        model_id: str,
        model_type: ModelType,
        model_path: Path,
        created_by: str,
        description: str,
        version_type: str = "patch",
        tags: Optional[List[str]] = None,
        parameters: Optional[Dict[str, Any]] = None,
        metrics: Optional[Dict[str, float]] = None,
        dependencies: Optional[Dict[str, str]] = None,
        branch: str = "main",
        parent_version: Optional[str] = None
    ) -> ModelVersion:
        """
        Create a new model version
        
        Args:
            model_id: Unique model identifier
            model_type: Type of the model
            model_path: Path to model artifacts
            created_by: User who created the version
            description: Version description
            version_type: Type of version bump (major, minor, patch)
            tags: Optional tags for the version
            parameters: Model hyperparameters
            metrics: Evaluation metrics
            dependencies: Model dependencies
            branch: Version branch
            parent_version: Parent version for branching
        
        Returns:
            ModelVersion: Created model version
        """
        # Calculate model checksum
        checksum = self._calculate_checksum(model_path)
        
        # Get model size
        model_size_mb = self._get_model_size(model_path)
        
        # Generate next version number
        next_version = self._generate_next_version(
            model_id, version_type, branch, parent_version
        )
        
        # Create model version
        model_version = ModelVersion(
            model_id=model_id,
            version=next_version,
            model_type=model_type,
            status=ModelStatus.DEVELOPMENT,
            created_at=datetime.utcnow(),
            created_by=created_by,
            description=description,
            tags=tags or [],
            parameters=parameters or {},
            metrics=metrics or {},
            dependencies=dependencies or {},
            model_size_mb=model_size_mb,
            checksum=checksum,
            parent_version=parent_version,
            branch=branch
        )
        
        # Save to database
        self._save_version(model_version)
        
        self.logger.info(f"Created model version {model_id}:{next_version}")
        return model_version
    
    def get_version(self, model_id: str, version: str) -> Optional[ModelVersion]:
        """Get specific model version"""
        orm_version = self.session.query(ModelVersionORM).filter_by(
            model_id=model_id, version=version
        ).first()
        
        if orm_version:
            return self._orm_to_version(orm_version)
        return None
    
    def list_versions(
        self,
        model_id: Optional[str] = None,
        status: Optional[ModelStatus] = None,
        branch: Optional[str] = None,
        limit: int = 100
    ) -> List[ModelVersion]:
        """List model versions with optional filtering"""
        query = self.session.query(ModelVersionORM)
        
        if model_id:
            query = query.filter_by(model_id=model_id)
        if status:
            query = query.filter_by(status=status.value)
        if branch:
            query = query.filter_by(branch=branch)
        
        query = query.order_by(ModelVersionORM.created_at.desc()).limit(limit)
        
        return [self._orm_to_version(orm_version) for orm_version in query.all()]
    
    def update_status(self, model_id: str, version: str, status: ModelStatus) -> bool:
        """Update model version status"""
        orm_version = self.session.query(ModelVersionORM).filter_by(
            model_id=model_id, version=version
        ).first()
        
        if orm_version:
            # Validate status transition
            if self._is_valid_status_transition(
                ModelStatus(orm_version.status), status
            ):
                orm_version.status = status.value
                self.session.commit()
                self.logger.info(f"Updated {model_id}:{version} status to {status.value}")
                return True
            else:
                self.logger.error(f"Invalid status transition from {orm_version.status} to {status.value}")
                return False
        return False
    
    def get_latest_version(
        self,
        model_id: str,
        branch: str = "main",
        status: Optional[ModelStatus] = None
    ) -> Optional[ModelVersion]:
        """Get latest version for a model"""
        query = self.session.query(ModelVersionORM).filter_by(
            model_id=model_id, branch=branch
        )
        
        if status:
            query = query.filter_by(status=status.value)
        
        orm_version = query.order_by(ModelVersionORM.created_at.desc()).first()
        
        if orm_version:
            return self._orm_to_version(orm_version)
        return None
    
    def create_branch(
        self,
        model_id: str,
        source_version: str,
        branch_name: str,
        created_by: str,
        description: str
    ) -> ModelVersion:
        """Create a new branch from existing version"""
        source = self.get_version(model_id, source_version)
        if not source:
            raise ValueError(f"Source version {model_id}:{source_version} not found")
        
        # Create new version on branch
        branch_version = ModelVersion(
            model_id=model_id,
            version=f"{source_version}-{branch_name}.1",
            model_type=source.model_type,
            status=ModelStatus.DEVELOPMENT,
            created_at=datetime.utcnow(),
            created_by=created_by,
            description=description,
            tags=source.tags.copy(),
            parameters=source.parameters.copy(),
            metrics=source.metrics.copy(),
            dependencies=source.dependencies.copy(),
            model_size_mb=source.model_size_mb,
            checksum=source.checksum,
            parent_version=source_version,
            branch=branch_name
        )
        
        self._save_version(branch_version)
        self.logger.info(f"Created branch {branch_name} from {model_id}:{source_version}")
        return branch_version
    
    def compare_versions(
        self,
        model_id: str,
        version1: str,
        version2: str
    ) -> Dict[str, Any]:
        """Compare two model versions"""
        v1 = self.get_version(model_id, version1)
        v2 = self.get_version(model_id, version2)
        
        if not v1 or not v2:
            raise ValueError("One or both versions not found")
        
        comparison = {
            "version_diff": {
                "from": version1,
                "to": version2
            },
            "parameter_changes": self._compare_dicts(v1.parameters, v2.parameters),
            "metric_changes": self._compare_dicts(v1.metrics, v2.metrics),
            "dependency_changes": self._compare_dicts(v1.dependencies, v2.dependencies),
            "size_change_mb": v2.model_size_mb - v1.model_size_mb,
            "checksum_changed": v1.checksum != v2.checksum,
            "status_change": {
                "from": v1.status.value,
                "to": v2.status.value
            }
        }
        
        return comparison
    
    def archive_version(self, model_id: str, version: str) -> bool:
        """Archive a model version"""
        return self.update_status(model_id, version, ModelStatus.ARCHIVED)
    
    def delete_version(self, model_id: str, version: str, force: bool = False) -> bool:
        """Delete a model version (with safety checks)"""
        model_version = self.get_version(model_id, version)
        if not model_version:
            return False
        
        # Safety checks
        if model_version.status == ModelStatus.PRODUCTION and not force:
            self.logger.error("Cannot delete production version without force=True")
            return False
        
        # Check for dependent versions
        dependent_versions = self.session.query(ModelVersionORM).filter_by(
            model_id=model_id, parent_version=version
        ).count()
        
        if dependent_versions > 0 and not force:
            self.logger.error("Cannot delete version with dependent versions without force=True")
            return False
        
        # Delete from database
        self.session.query(ModelVersionORM).filter_by(
            model_id=model_id, version=version
        ).delete()
        self.session.commit()
        
        self.logger.info(f"Deleted model version {model_id}:{version}")
        return True
    
    def _generate_next_version(
        self,
        model_id: str,
        version_type: str,
        branch: str,
        parent_version: Optional[str]
    ) -> str:
        """Generate next semantic version number"""
        if parent_version:
            # Branching from specific version
            return f"{parent_version}-{branch}.1"
        
        # Get latest version on branch
        latest = self.get_latest_version(model_id, branch)
        
        if not latest:
            return "1.0.0"
        
        # Parse semantic version
        try:
            current_version = version.parse(latest.version.split('-')[0])
            
            if version_type == "major":
                next_version = f"{current_version.major + 1}.0.0"
            elif version_type == "minor":
                next_version = f"{current_version.major}.{current_version.minor + 1}.0"
            else:  # patch
                next_version = f"{current_version.major}.{current_version.minor}.{current_version.micro + 1}"
            
            return next_version
        except:
            # Fallback to simple increment
            return f"{latest.version}.1"
    
    def _calculate_checksum(self, model_path: Path) -> str:
        """Calculate SHA-256 checksum for model artifacts"""
        hash_sha256 = hashlib.sha256()
        
        if model_path.is_file():
            with open(model_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
        elif model_path.is_dir():
            # Hash all files in directory
            for file_path in sorted(model_path.rglob("*")):
                if file_path.is_file():
                    with open(file_path, "rb") as f:
                        for chunk in iter(lambda: f.read(4096), b""):
                            hash_sha256.update(chunk)
        
        return hash_sha256.hexdigest()
    
    def _get_model_size(self, model_path: Path) -> float:
        """Get model size in MB"""
        total_size = 0
        
        if model_path.is_file():
            total_size = model_path.stat().st_size
        elif model_path.is_dir():
            for file_path in model_path.rglob("*"):
                if file_path.is_file():
                    total_size += file_path.stat().st_size
        
        return total_size / (1024 * 1024)  # Convert to MB
    
    def _save_version(self, model_version: ModelVersion):
        """Save model version to database"""
        orm_version = ModelVersionORM(
            model_id=model_version.model_id,
            version=model_version.version,
            model_type=model_version.model_type.value,
            status=model_version.status.value,
            created_at=model_version.created_at,
            created_by=model_version.created_by,
            description=model_version.description,
            tags=model_version.tags,
            parameters=model_version.parameters,
            metrics=model_version.metrics,
            dependencies=model_version.dependencies,
            model_size_mb=int(model_version.model_size_mb),
            checksum=model_version.checksum,
            parent_version=model_version.parent_version,
            branch=model_version.branch,
            commit_hash=model_version.commit_hash
        )
        
        self.session.add(orm_version)
        self.session.commit()
    
    def _orm_to_version(self, orm_version: ModelVersionORM) -> ModelVersion:
        """Convert ORM object to ModelVersion"""
        return ModelVersion(
            model_id=orm_version.model_id,
            version=orm_version.version,
            model_type=ModelType(orm_version.model_type),
            status=ModelStatus(orm_version.status),
            created_at=orm_version.created_at,
            created_by=orm_version.created_by,
            description=orm_version.description,
            tags=orm_version.tags or [],
            parameters=orm_version.parameters or {},
            metrics=orm_version.metrics or {},
            dependencies=orm_version.dependencies or {},
            model_size_mb=float(orm_version.model_size_mb or 0),
            checksum=orm_version.checksum,
            parent_version=orm_version.parent_version,
            branch=orm_version.branch,
            commit_hash=orm_version.commit_hash
        )
    
    def _is_valid_status_transition(self, from_status: ModelStatus, to_status: ModelStatus) -> bool:
        """Validate status transition"""
        valid_transitions = {
            ModelStatus.DEVELOPMENT: [ModelStatus.TESTING, ModelStatus.ARCHIVED],
            ModelStatus.TESTING: [ModelStatus.STAGING, ModelStatus.DEVELOPMENT, ModelStatus.ARCHIVED],
            ModelStatus.STAGING: [ModelStatus.PRODUCTION, ModelStatus.TESTING, ModelStatus.ARCHIVED],
            ModelStatus.PRODUCTION: [ModelStatus.DEPRECATED, ModelStatus.ARCHIVED],
            ModelStatus.DEPRECATED: [ModelStatus.ARCHIVED],
            ModelStatus.ARCHIVED: []  # Terminal state
        }
        
        return to_status in valid_transitions.get(from_status, [])
    
    def _compare_dicts(self, dict1: Dict, dict2: Dict) -> Dict[str, Any]:
        """Compare two dictionaries and return differences"""
        changes = {
            "added": {},
            "removed": {},
            "modified": {}
        }
        
        # Find added and modified keys
        for key, value in dict2.items():
            if key not in dict1:
                changes["added"][key] = value
            elif dict1[key] != value:
                changes["modified"][key] = {
                    "from": dict1[key],
                    "to": value
                }
        
        # Find removed keys
        for key, value in dict1.items():
            if key not in dict2:
                changes["removed"][key] = value
        
        return changes
    
    def __del__(self):
        """Cleanup database session"""
        if hasattr(self, 'session'):
            self.session.close()
