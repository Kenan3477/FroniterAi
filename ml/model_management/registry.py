"""
Model Registry Integration System

Provides centralized model registry with metadata tracking, lineage management,
and integration with popular ML platforms (MLflow, Weights & Biases, etc.).
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from urllib.parse import urlparse

import requests
import mlflow
import mlflow.pytorch
from mlflow.tracking import MlflowClient
import wandb
from sqlalchemy import create_engine, Column, String, DateTime, Text, JSON, Float, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

from .version_manager import ModelVersion, ModelType, ModelStatus
from .storage_manager import ModelStorageManager

Base = declarative_base()

class RegistryType(Enum):
    """Types of model registries"""
    INTERNAL = "internal"
    MLFLOW = "mlflow"
    WANDB = "wandb"
    HUGGINGFACE = "huggingface"
    CUSTOM = "custom"

class ModelStage(Enum):
    """Model deployment stages"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    ARCHIVED = "archived"

@dataclass
class ModelMetadata:
    """Comprehensive model metadata"""
    # Basic information
    model_id: str
    name: str
    version: str
    description: str
    model_type: ModelType
    
    # Registry information
    registry_type: RegistryType
    registry_model_id: str
    registry_version_id: str
    registry_url: str
    
    # Status and lifecycle
    status: ModelStatus
    stage: ModelStage
    created_at: datetime
    updated_at: datetime
    created_by: str
    
    # Technical details
    framework: str
    framework_version: str
    python_version: str
    model_size_mb: float
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    
    # Performance metrics
    metrics: Dict[str, float]
    benchmarks: Dict[str, Any]
    
    # Dependencies and environment
    dependencies: Dict[str, str]
    environment: Dict[str, Any]
    
    # Lineage and provenance
    parent_models: List[str]
    derived_models: List[str]
    dataset_references: List[str]
    experiment_id: Optional[str]
    run_id: Optional[str]
    
    # Business metadata
    use_cases: List[str]
    tags: Dict[str, str]
    business_impact: Dict[str, Any]
    
    # Compliance and governance
    approval_status: str
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    compliance_notes: str
    
    # Deployment information
    deployment_targets: List[str]
    resource_requirements: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        data = asdict(self)
        # Handle datetime serialization
        for field in ['created_at', 'updated_at', 'approved_at']:
            if data[field]:
                data[field] = data[field].isoformat()
        # Handle enums
        data['model_type'] = self.model_type.value
        data['registry_type'] = self.registry_type.value
        data['status'] = self.status.value
        data['stage'] = self.stage.value
        return data

class ModelRegistryORM(Base):
    """SQLAlchemy model for model registry"""
    __tablename__ = 'model_registry'
    
    model_id = Column(String(100), primary_key=True)
    version = Column(String(50), primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    model_type = Column(String(50), nullable=False)
    registry_type = Column(String(50), nullable=False)
    registry_model_id = Column(String(200))
    registry_version_id = Column(String(200))
    registry_url = Column(Text)
    status = Column(String(20), nullable=False)
    stage = Column(String(20), nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    created_by = Column(String(100), nullable=False)
    framework = Column(String(50))
    framework_version = Column(String(20))
    python_version = Column(String(20))
    model_size_mb = Column(Float)
    input_schema = Column(JSON)
    output_schema = Column(JSON)
    metrics = Column(JSON)
    benchmarks = Column(JSON)
    dependencies = Column(JSON)
    environment = Column(JSON)
    parent_models = Column(JSON)
    derived_models = Column(JSON)
    dataset_references = Column(JSON)
    experiment_id = Column(String(100))
    run_id = Column(String(100))
    use_cases = Column(JSON)
    tags = Column(JSON)
    business_impact = Column(JSON)
    approval_status = Column(String(20), default="pending")
    approved_by = Column(String(100))
    approved_at = Column(DateTime)
    compliance_notes = Column(Text)
    deployment_targets = Column(JSON)
    resource_requirements = Column(JSON)

class ModelRegistry:
    """
    Centralized model registry with support for multiple backends
    """
    
    def __init__(
        self,
        database_url: str = "sqlite:///model_registry.db",
        mlflow_tracking_uri: Optional[str] = None,
        wandb_project: Optional[str] = None,
        storage_manager: Optional[ModelStorageManager] = None
    ):
        self.logger = logging.getLogger(__name__)
        self.storage_manager = storage_manager
        
        # Initialize database
        self.engine = create_engine(database_url)
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
        
        # Initialize external registries
        self._mlflow_client = None
        self._wandb_initialized = False
        
        if mlflow_tracking_uri:
            mlflow.set_tracking_uri(mlflow_tracking_uri)
            self._mlflow_client = MlflowClient()
        
        if wandb_project:
            wandb.init(project=wandb_project, mode="offline")
            self._wandb_initialized = True
    
    async def register_model(
        self,
        model_metadata: ModelMetadata,
        model_artifact_path: Optional[str] = None,
        auto_sync_external: bool = True
    ) -> ModelMetadata:
        """
        Register a new model in the registry
        
        Args:
            model_metadata: Model metadata
            model_artifact_path: Path to model artifacts
            auto_sync_external: Whether to sync with external registries
        
        Returns:
            ModelMetadata: Registered model metadata
        """
        # Validate metadata
        self._validate_metadata(model_metadata)
        
        # Check for existing model
        existing = await self.get_model(model_metadata.model_id, model_metadata.version)
        if existing:
            raise ValueError(f"Model {model_metadata.model_id}:{model_metadata.version} already exists")
        
        # Set timestamps
        model_metadata.created_at = datetime.utcnow()
        model_metadata.updated_at = datetime.utcnow()
        
        # Store in database
        await self._store_metadata(model_metadata)
        
        # Sync with external registries if enabled
        if auto_sync_external:
            await self._sync_to_external_registries(model_metadata, model_artifact_path)
        
        self.logger.info(f"Registered model {model_metadata.model_id}:{model_metadata.version}")
        return model_metadata
    
    async def get_model(self, model_id: str, version: str) -> Optional[ModelMetadata]:
        """Get model metadata by ID and version"""
        orm_model = self.session.query(ModelRegistryORM).filter_by(
            model_id=model_id, version=version
        ).first()
        
        if orm_model:
            return self._orm_to_metadata(orm_model)
        return None
    
    async def list_models(
        self,
        model_type: Optional[ModelType] = None,
        status: Optional[ModelStatus] = None,
        stage: Optional[ModelStage] = None,
        tags: Optional[Dict[str, str]] = None,
        limit: int = 100
    ) -> List[ModelMetadata]:
        """List models with optional filtering"""
        query = self.session.query(ModelRegistryORM)
        
        if model_type:
            query = query.filter_by(model_type=model_type.value)
        if status:
            query = query.filter_by(status=status.value)
        if stage:
            query = query.filter_by(stage=stage.value)
        
        # Tag filtering (simple implementation)
        if tags:
            for key, value in tags.items():
                query = query.filter(
                    ModelRegistryORM.tags.contains(f'"{key}": "{value}"')
                )
        
        query = query.order_by(ModelRegistryORM.updated_at.desc()).limit(limit)
        
        return [self._orm_to_metadata(orm_model) for orm_model in query.all()]
    
    async def update_model_status(
        self,
        model_id: str,
        version: str,
        status: ModelStatus
    ) -> bool:
        """Update model status"""
        orm_model = self.session.query(ModelRegistryORM).filter_by(
            model_id=model_id, version=version
        ).first()
        
        if orm_model:
            orm_model.status = status.value
            orm_model.updated_at = datetime.utcnow()
            self.session.commit()
            
            # Sync with external registries
            await self._sync_status_to_external(model_id, version, status)
            
            self.logger.info(f"Updated {model_id}:{version} status to {status.value}")
            return True
        return False
    
    async def update_model_stage(
        self,
        model_id: str,
        version: str,
        stage: ModelStage,
        approved_by: Optional[str] = None
    ) -> bool:
        """Update model deployment stage"""
        orm_model = self.session.query(ModelRegistryORM).filter_by(
            model_id=model_id, version=version
        ).first()
        
        if orm_model:
            # Validate stage transition
            if not self._is_valid_stage_transition(ModelStage(orm_model.stage), stage):
                self.logger.error(f"Invalid stage transition from {orm_model.stage} to {stage.value}")
                return False
            
            orm_model.stage = stage.value
            orm_model.updated_at = datetime.utcnow()
            
            # Handle approval for production stage
            if stage == ModelStage.PRODUCTION and approved_by:
                orm_model.approval_status = "approved"
                orm_model.approved_by = approved_by
                orm_model.approved_at = datetime.utcnow()
            
            self.session.commit()
            
            # Sync with external registries
            await self._sync_stage_to_external(model_id, version, stage)
            
            self.logger.info(f"Updated {model_id}:{version} stage to {stage.value}")
            return True
        return False
    
    async def add_model_metrics(
        self,
        model_id: str,
        version: str,
        metrics: Dict[str, float],
        benchmark_results: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Add or update model metrics"""
        orm_model = self.session.query(ModelRegistryORM).filter_by(
            model_id=model_id, version=version
        ).first()
        
        if orm_model:
            # Update metrics
            existing_metrics = orm_model.metrics or {}
            existing_metrics.update(metrics)
            orm_model.metrics = existing_metrics
            
            # Update benchmarks
            if benchmark_results:
                existing_benchmarks = orm_model.benchmarks or {}
                existing_benchmarks.update(benchmark_results)
                orm_model.benchmarks = existing_benchmarks
            
            orm_model.updated_at = datetime.utcnow()
            self.session.commit()
            
            # Sync with external registries
            await self._sync_metrics_to_external(model_id, version, metrics)
            
            self.logger.info(f"Updated metrics for {model_id}:{version}")
            return True
        return False
    
    async def get_model_lineage(self, model_id: str, version: str) -> Dict[str, Any]:
        """Get model lineage information"""
        model = await self.get_model(model_id, version)
        if not model:
            return {}
        
        # Get parent models
        parent_lineage = []
        for parent_id in model.parent_models:
            parent_parts = parent_id.split(":")
            if len(parent_parts) == 2:
                parent_model = await self.get_model(parent_parts[0], parent_parts[1])
                if parent_model:
                    parent_lineage.append(parent_model.to_dict())
        
        # Get derived models
        derived_lineage = []
        for derived_id in model.derived_models:
            derived_parts = derived_id.split(":")
            if len(derived_parts) == 2:
                derived_model = await self.get_model(derived_parts[0], derived_parts[1])
                if derived_model:
                    derived_lineage.append(derived_model.to_dict())
        
        return {
            "model": model.to_dict(),
            "parents": parent_lineage,
            "derived": derived_lineage,
            "lineage_graph": self._build_lineage_graph(model_id, version)
        }
    
    async def search_models(
        self,
        query: str,
        search_fields: List[str] = None,
        limit: int = 50
    ) -> List[ModelMetadata]:
        """Search models by text query"""
        search_fields = search_fields or ["name", "description", "use_cases"]
        
        # Simple text search implementation
        # In production, consider using full-text search
        results = []
        all_models = await self.list_models(limit=1000)  # Get more for searching
        
        for model in all_models:
            model_dict = model.to_dict()
            for field in search_fields:
                field_value = str(model_dict.get(field, "")).lower()
                if query.lower() in field_value:
                    results.append(model)
                    break
        
        return results[:limit]
    
    async def compare_models(
        self,
        model_specs: List[Tuple[str, str]]  # List of (model_id, version) pairs
    ) -> Dict[str, Any]:
        """Compare multiple model versions"""
        models = []
        for model_id, version in model_specs:
            model = await self.get_model(model_id, version)
            if model:
                models.append(model)
        
        if len(models) < 2:
            raise ValueError("At least 2 models required for comparison")
        
        comparison = {
            "models": [model.to_dict() for model in models],
            "metric_comparison": self._compare_metrics(models),
            "size_comparison": {
                model.model_id: model.model_size_mb for model in models
            },
            "framework_comparison": {
                model.model_id: f"{model.framework} {model.framework_version}"
                for model in models
            },
            "performance_summary": self._summarize_performance(models)
        }
        
        return comparison
    
    async def get_model_deployments(self, model_id: str, version: str) -> Dict[str, Any]:
        """Get deployment information for a model"""
        model = await self.get_model(model_id, version)
        if not model:
            return {}
        
        # This would integrate with deployment systems
        # For now, return basic deployment info from metadata
        return {
            "model_id": model_id,
            "version": version,
            "stage": model.stage.value,
            "deployment_targets": model.deployment_targets,
            "resource_requirements": model.resource_requirements,
            "status": model.status.value
        }
    
    async def export_model_card(self, model_id: str, version: str) -> Dict[str, Any]:
        """Export model card with comprehensive information"""
        model = await self.get_model(model_id, version)
        if not model:
            raise ValueError(f"Model {model_id}:{version} not found")
        
        model_card = {
            "model_details": {
                "name": model.name,
                "version": model.version,
                "description": model.description,
                "model_type": model.model_type.value,
                "framework": f"{model.framework} {model.framework_version}",
                "size_mb": model.model_size_mb,
                "created_at": model.created_at.isoformat(),
                "created_by": model.created_by
            },
            "intended_use": {
                "use_cases": model.use_cases,
                "business_impact": model.business_impact
            },
            "performance": {
                "metrics": model.metrics,
                "benchmarks": model.benchmarks
            },
            "training_data": {
                "dataset_references": model.dataset_references
            },
            "deployment": {
                "stage": model.stage.value,
                "resource_requirements": model.resource_requirements,
                "deployment_targets": model.deployment_targets
            },
            "governance": {
                "approval_status": model.approval_status,
                "approved_by": model.approved_by,
                "approved_at": model.approved_at.isoformat() if model.approved_at else None,
                "compliance_notes": model.compliance_notes
            },
            "technical_specifications": {
                "input_schema": model.input_schema,
                "output_schema": model.output_schema,
                "dependencies": model.dependencies,
                "environment": model.environment
            }
        }
        
        return model_card
    
    def _validate_metadata(self, metadata: ModelMetadata):
        """Validate model metadata"""
        required_fields = ['model_id', 'name', 'version', 'model_type', 'created_by']
        for field in required_fields:
            if not getattr(metadata, field):
                raise ValueError(f"Required field '{field}' is missing")
        
        # Validate version format
        if not self._is_valid_version(metadata.version):
            raise ValueError(f"Invalid version format: {metadata.version}")
    
    def _is_valid_version(self, version: str) -> bool:
        """Validate version format (semantic versioning)"""
        import re
        pattern = r'^\d+\.\d+\.\d+(-[\w\d\.-]+)?(\+[\w\d\.-]+)?$'
        return re.match(pattern, version) is not None
    
    def _is_valid_stage_transition(self, from_stage: ModelStage, to_stage: ModelStage) -> bool:
        """Validate stage transition"""
        valid_transitions = {
            ModelStage.DEVELOPMENT: [ModelStage.STAGING, ModelStage.ARCHIVED],
            ModelStage.STAGING: [ModelStage.PRODUCTION, ModelStage.DEVELOPMENT, ModelStage.ARCHIVED],
            ModelStage.PRODUCTION: [ModelStage.ARCHIVED],
            ModelStage.ARCHIVED: []  # Terminal state
        }
        
        return to_stage in valid_transitions.get(from_stage, [])
    
    async def _store_metadata(self, metadata: ModelMetadata):
        """Store metadata in database"""
        orm_model = ModelRegistryORM(
            model_id=metadata.model_id,
            version=metadata.version,
            name=metadata.name,
            description=metadata.description,
            model_type=metadata.model_type.value,
            registry_type=metadata.registry_type.value,
            registry_model_id=metadata.registry_model_id,
            registry_version_id=metadata.registry_version_id,
            registry_url=metadata.registry_url,
            status=metadata.status.value,
            stage=metadata.stage.value,
            created_at=metadata.created_at,
            updated_at=metadata.updated_at,
            created_by=metadata.created_by,
            framework=metadata.framework,
            framework_version=metadata.framework_version,
            python_version=metadata.python_version,
            model_size_mb=metadata.model_size_mb,
            input_schema=metadata.input_schema,
            output_schema=metadata.output_schema,
            metrics=metadata.metrics,
            benchmarks=metadata.benchmarks,
            dependencies=metadata.dependencies,
            environment=metadata.environment,
            parent_models=metadata.parent_models,
            derived_models=metadata.derived_models,
            dataset_references=metadata.dataset_references,
            experiment_id=metadata.experiment_id,
            run_id=metadata.run_id,
            use_cases=metadata.use_cases,
            tags=metadata.tags,
            business_impact=metadata.business_impact,
            approval_status=metadata.approval_status,
            approved_by=metadata.approved_by,
            approved_at=metadata.approved_at,
            compliance_notes=metadata.compliance_notes,
            deployment_targets=metadata.deployment_targets,
            resource_requirements=metadata.resource_requirements
        )
        
        self.session.add(orm_model)
        self.session.commit()
    
    def _orm_to_metadata(self, orm_model: ModelRegistryORM) -> ModelMetadata:
        """Convert ORM object to ModelMetadata"""
        return ModelMetadata(
            model_id=orm_model.model_id,
            name=orm_model.name,
            version=orm_model.version,
            description=orm_model.description,
            model_type=ModelType(orm_model.model_type),
            registry_type=RegistryType(orm_model.registry_type),
            registry_model_id=orm_model.registry_model_id,
            registry_version_id=orm_model.registry_version_id,
            registry_url=orm_model.registry_url,
            status=ModelStatus(orm_model.status),
            stage=ModelStage(orm_model.stage),
            created_at=orm_model.created_at,
            updated_at=orm_model.updated_at,
            created_by=orm_model.created_by,
            framework=orm_model.framework,
            framework_version=orm_model.framework_version,
            python_version=orm_model.python_version,
            model_size_mb=orm_model.model_size_mb or 0.0,
            input_schema=orm_model.input_schema or {},
            output_schema=orm_model.output_schema or {},
            metrics=orm_model.metrics or {},
            benchmarks=orm_model.benchmarks or {},
            dependencies=orm_model.dependencies or {},
            environment=orm_model.environment or {},
            parent_models=orm_model.parent_models or [],
            derived_models=orm_model.derived_models or [],
            dataset_references=orm_model.dataset_references or [],
            experiment_id=orm_model.experiment_id,
            run_id=orm_model.run_id,
            use_cases=orm_model.use_cases or [],
            tags=orm_model.tags or {},
            business_impact=orm_model.business_impact or {},
            approval_status=orm_model.approval_status,
            approved_by=orm_model.approved_by,
            approved_at=orm_model.approved_at,
            compliance_notes=orm_model.compliance_notes or "",
            deployment_targets=orm_model.deployment_targets or [],
            resource_requirements=orm_model.resource_requirements or {}
        )
    
    async def _sync_to_external_registries(
        self,
        metadata: ModelMetadata,
        model_artifact_path: Optional[str] = None
    ):
        """Sync model to external registries"""
        # MLflow integration
        if self._mlflow_client and metadata.registry_type == RegistryType.MLFLOW:
            await self._sync_to_mlflow(metadata, model_artifact_path)
        
        # Weights & Biases integration
        if self._wandb_initialized and metadata.registry_type == RegistryType.WANDB:
            await self._sync_to_wandb(metadata, model_artifact_path)
    
    async def _sync_to_mlflow(
        self,
        metadata: ModelMetadata,
        model_artifact_path: Optional[str] = None
    ):
        """Sync model to MLflow registry"""
        try:
            # Create or get registered model
            try:
                self._mlflow_client.create_registered_model(
                    name=metadata.name,
                    description=metadata.description
                )
            except Exception:
                pass  # Model might already exist
            
            # Create model version if artifact path is provided
            if model_artifact_path:
                model_version = self._mlflow_client.create_model_version(
                    name=metadata.name,
                    source=model_artifact_path,
                    description=f"Version {metadata.version}"
                )
                
                # Update metadata with MLflow IDs
                metadata.registry_model_id = metadata.name
                metadata.registry_version_id = str(model_version.version)
                metadata.registry_url = f"{mlflow.get_tracking_uri()}/#/models/{metadata.name}/versions/{model_version.version}"
                
                # Add tags and metrics
                self._mlflow_client.set_model_version_tag(
                    name=metadata.name,
                    version=model_version.version,
                    key="frontier_model_id",
                    value=metadata.model_id
                )
                
                for key, value in metadata.tags.items():
                    self._mlflow_client.set_model_version_tag(
                        name=metadata.name,
                        version=model_version.version,
                        key=key,
                        value=value
                    )
            
            self.logger.info(f"Synced {metadata.model_id} to MLflow")
            
        except Exception as e:
            self.logger.error(f"Failed to sync to MLflow: {e}")
    
    async def _sync_to_wandb(
        self,
        metadata: ModelMetadata,
        model_artifact_path: Optional[str] = None
    ):
        """Sync model to Weights & Biases"""
        try:
            if model_artifact_path:
                # Log model artifact
                model_artifact = wandb.Artifact(
                    name=f"{metadata.name}",
                    type="model",
                    description=metadata.description,
                    metadata={
                        "model_id": metadata.model_id,
                        "version": metadata.version,
                        "framework": metadata.framework,
                        "metrics": metadata.metrics
                    }
                )
                
                model_artifact.add_file(model_artifact_path)
                wandb.log_artifact(model_artifact)
                
                # Update metadata with W&B information
                metadata.registry_model_id = f"{metadata.name}"
                metadata.registry_version_id = metadata.version
            
            self.logger.info(f"Synced {metadata.model_id} to W&B")
            
        except Exception as e:
            self.logger.error(f"Failed to sync to W&B: {e}")
    
    def _compare_metrics(self, models: List[ModelMetadata]) -> Dict[str, Any]:
        """Compare metrics across models"""
        all_metrics = set()
        for model in models:
            all_metrics.update(model.metrics.keys())
        
        comparison = {}
        for metric in all_metrics:
            values = {}
            for model in models:
                values[f"{model.model_id}:{model.version}"] = model.metrics.get(metric)
            comparison[metric] = values
        
        return comparison
    
    def _summarize_performance(self, models: List[ModelMetadata]) -> Dict[str, Any]:
        """Summarize performance across models"""
        # Simple performance summary
        summary = {
            "best_accuracy": None,
            "smallest_model": None,
            "latest_model": None
        }
        
        # Find best accuracy
        best_acc = -1
        for model in models:
            acc = model.metrics.get("accuracy", 0)
            if acc > best_acc:
                best_acc = acc
                summary["best_accuracy"] = f"{model.model_id}:{model.version}"
        
        # Find smallest model
        min_size = float('inf')
        for model in models:
            if model.model_size_mb < min_size:
                min_size = model.model_size_mb
                summary["smallest_model"] = f"{model.model_id}:{model.version}"
        
        # Find latest model
        latest_time = None
        for model in models:
            if latest_time is None or model.created_at > latest_time:
                latest_time = model.created_at
                summary["latest_model"] = f"{model.model_id}:{model.version}"
        
        return summary
    
    def _build_lineage_graph(self, model_id: str, version: str) -> Dict[str, Any]:
        """Build lineage graph for visualization"""
        # Simplified lineage graph
        # In production, this would build a comprehensive graph structure
        return {
            "nodes": [{"id": f"{model_id}:{version}", "type": "model"}],
            "edges": [],
            "metadata": {"generated_at": datetime.utcnow().isoformat()}
        }
    
    def __del__(self):
        """Cleanup database session"""
        if hasattr(self, 'session'):
            self.session.close()
