"""
Model Versioning and A/B Testing Framework

Comprehensive framework for model versioning, deployment strategies,
A/B testing, canary deployments, and experiment management.
"""

import asyncio
import json
import logging
import random
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
from pathlib import Path

import redis.asyncio as redis
from pydantic import BaseModel, Field

from .model_server import ModelConfig, ModelServer, model_server

logger = logging.getLogger(__name__)


class DeploymentStrategy(str, Enum):
    """Deployment strategies"""
    BLUE_GREEN = "blue_green"
    CANARY = "canary"
    ROLLING = "rolling"
    A_B_TEST = "a_b_test"
    SHADOW = "shadow"


class ExperimentStatus(str, Enum):
    """Experiment status"""
    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class ModelVariant(BaseModel):
    """Model variant for A/B testing"""
    variant_id: str
    model_configuration: ModelConfig
    traffic_percentage: float = Field(ge=0, le=100)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        arbitrary_types_allowed = True


class Experiment(BaseModel):
    """A/B test experiment"""
    experiment_id: str
    name: str
    description: str
    variants: List[ModelVariant]
    status: ExperimentStatus = ExperimentStatus.DRAFT
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    target_metric: str = "accuracy"
    success_criteria: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    @property
    def is_active(self) -> bool:
        """Check if experiment is currently active"""
        if self.status != ExperimentStatus.RUNNING:
            return False
        
        now = datetime.utcnow()
        if self.start_time and now < self.start_time:
            return False
        
        if self.end_time and now > self.end_time:
            return False
        
        return True
    
    def validate_traffic_allocation(self) -> bool:
        """Validate that traffic percentages sum to 100"""
        total_traffic = sum(variant.traffic_percentage for variant in self.variants)
        return abs(total_traffic - 100.0) < 0.01


class ExperimentResult(BaseModel):
    """Experiment result tracking"""
    experiment_id: str
    variant_id: str
    metric_name: str
    metric_value: float
    sample_size: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ModelVersion(BaseModel):
    """Model version tracking"""
    model_id: str
    version: str
    config: ModelConfig
    deployment_strategy: DeploymentStrategy
    status: str = "pending"
    checksum: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    deployed_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        arbitrary_types_allowed = True


class TrafficRouter:
    """Traffic routing for A/B testing and canary deployments"""
    
    def __init__(self):
        self.routing_rules: Dict[str, List[Tuple[str, float]]] = {}
        self.user_assignments: Dict[str, str] = {}  # User -> Variant mapping
        self.sticky_sessions = True
    
    def add_routing_rule(self, endpoint: str, variants: List[Tuple[str, float]]):
        """Add routing rule for an endpoint"""
        # Validate that weights sum to 1.0
        total_weight = sum(weight for _, weight in variants)
        if abs(total_weight - 1.0) > 0.01:
            raise ValueError(f"Variant weights must sum to 1.0, got {total_weight}")
        
        self.routing_rules[endpoint] = variants
        logger.info(f"Added routing rule for {endpoint}: {variants}")
    
    def remove_routing_rule(self, endpoint: str):
        """Remove routing rule for an endpoint"""
        if endpoint in self.routing_rules:
            del self.routing_rules[endpoint]
            logger.info(f"Removed routing rule for {endpoint}")
    
    def route_request(self, endpoint: str, user_id: Optional[str] = None) -> Optional[str]:
        """Route request to appropriate variant"""
        if endpoint not in self.routing_rules:
            return None
        
        # Use sticky sessions if user_id provided
        if user_id and self.sticky_sessions:
            if user_id in self.user_assignments:
                variant_id = self.user_assignments[user_id]
                # Verify variant is still valid
                variant_ids = [variant_id for variant_id, _ in self.routing_rules[endpoint]]
                if variant_id in variant_ids:
                    return variant_id
        
        # Weighted random selection
        variants = self.routing_rules[endpoint]
        weights = [weight for _, weight in variants]
        
        random_value = random.random()
        cumulative_weight = 0.0
        
        for i, (variant_id, weight) in enumerate(variants):
            cumulative_weight += weight
            if random_value <= cumulative_weight:
                # Store assignment for sticky sessions
                if user_id and self.sticky_sessions:
                    self.user_assignments[user_id] = variant_id
                return variant_id
        
        # Fallback to first variant
        return variants[0][0] if variants else None
    
    def get_routing_stats(self, endpoint: str) -> Dict[str, int]:
        """Get routing statistics"""
        if endpoint not in self.routing_rules:
            return {}
        
        # Count user assignments
        variant_counts = {}
        for variant_id, _ in self.routing_rules[endpoint]:
            variant_counts[variant_id] = 0
        
        for user_id, variant_id in self.user_assignments.items():
            if variant_id in variant_counts:
                variant_counts[variant_id] += 1
        
        return variant_counts


class ExperimentManager:
    """Manage A/B testing experiments"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis_client = None
        self.experiments: Dict[str, Experiment] = {}
        self.results: Dict[str, List[ExperimentResult]] = {}
        self.traffic_router = TrafficRouter()
    
    async def initialize(self):
        """Initialize experiment manager"""
        self.redis_client = await redis.from_url(self.redis_url)
        await self._load_experiments()
        logger.info("Experiment manager initialized")
    
    async def shutdown(self):
        """Shutdown experiment manager"""
        if self.redis_client:
            await self.redis_client.close()
    
    async def _load_experiments(self):
        """Load experiments from Redis"""
        try:
            experiment_keys = await self.redis_client.keys("experiment:*")
            for key in experiment_keys:
                experiment_data = await self.redis_client.get(key)
                if experiment_data:
                    experiment = Experiment.parse_raw(experiment_data)
                    self.experiments[experiment.experiment_id] = experiment
                    
                    # Setup routing for active experiments
                    if experiment.is_active:
                        await self._setup_experiment_routing(experiment)
            
            logger.info(f"Loaded {len(self.experiments)} experiments")
            
        except Exception as e:
            logger.error(f"Error loading experiments: {str(e)}")
    
    async def _save_experiment(self, experiment: Experiment):
        """Save experiment to Redis"""
        try:
            key = f"experiment:{experiment.experiment_id}"
            await self.redis_client.set(key, experiment.json())
        except Exception as e:
            logger.error(f"Error saving experiment {experiment.experiment_id}: {str(e)}")
    
    async def _setup_experiment_routing(self, experiment: Experiment):
        """Setup traffic routing for experiment"""
        if not experiment.is_active:
            return
        
        # Convert traffic percentages to weights
        variants = [
            (variant.variant_id, variant.traffic_percentage / 100.0)
            for variant in experiment.variants
        ]
        
        # Use experiment ID as endpoint for routing
        self.traffic_router.add_routing_rule(experiment.experiment_id, variants)
        
        # Load models for all variants
        for variant in experiment.variants:
            await model_server.load_model(variant.model_configuration)
    
    async def create_experiment(self, experiment: Experiment) -> str:
        """Create a new experiment"""
        try:
            # Validate experiment
            if not experiment.validate_traffic_allocation():
                raise ValueError("Traffic allocation must sum to 100%")
            
            if len(experiment.variants) < 2:
                raise ValueError("Experiment must have at least 2 variants")
            
            # Store experiment
            self.experiments[experiment.experiment_id] = experiment
            await self._save_experiment(experiment)
            
            logger.info(f"Created experiment: {experiment.experiment_id}")
            return experiment.experiment_id
            
        except Exception as e:
            logger.error(f"Error creating experiment: {str(e)}")
            raise
    
    async def start_experiment(self, experiment_id: str) -> bool:
        """Start an experiment"""
        try:
            if experiment_id not in self.experiments:
                raise ValueError(f"Experiment not found: {experiment_id}")
            
            experiment = self.experiments[experiment_id]
            experiment.status = ExperimentStatus.RUNNING
            experiment.start_time = datetime.utcnow()
            
            # Setup routing
            await self._setup_experiment_routing(experiment)
            
            # Save updated experiment
            await self._save_experiment(experiment)
            
            logger.info(f"Started experiment: {experiment_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error starting experiment {experiment_id}: {str(e)}")
            return False
    
    async def stop_experiment(self, experiment_id: str) -> bool:
        """Stop an experiment"""
        try:
            if experiment_id not in self.experiments:
                raise ValueError(f"Experiment not found: {experiment_id}")
            
            experiment = self.experiments[experiment_id]
            experiment.status = ExperimentStatus.COMPLETED
            experiment.end_time = datetime.utcnow()
            
            # Remove routing
            self.traffic_router.remove_routing_rule(experiment_id)
            
            # Save updated experiment
            await self._save_experiment(experiment)
            
            logger.info(f"Stopped experiment: {experiment_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error stopping experiment {experiment_id}: {str(e)}")
            return False
    
    async def route_prediction(self, experiment_id: str, inputs: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
        """Route prediction request through experiment"""
        try:
            if experiment_id not in self.experiments:
                # No experiment, use default model
                default_model_id = inputs.get("model_id", "default")
                return await model_server.predict(default_model_id, inputs)
            
            experiment = self.experiments[experiment_id]
            if not experiment.is_active:
                # Experiment not active, use default
                default_model_id = inputs.get("model_id", "default")
                return await model_server.predict(default_model_id, inputs)
            
            # Route to variant
            variant_id = self.traffic_router.route_request(experiment_id, user_id)
            if not variant_id:
                raise ValueError("No variant selected")
            
            # Find variant config
            variant = next((v for v in experiment.variants if v.variant_id == variant_id), None)
            if not variant:
                raise ValueError(f"Variant not found: {variant_id}")
            
            # Run prediction
            result = await model_server.predict(variant.model_configuration.model_id, inputs)
            
            # Add experiment metadata
            result["experiment_id"] = experiment_id
            result["variant_id"] = variant_id
            
            return result
            
        except Exception as e:
            logger.error(f"Error routing prediction for experiment {experiment_id}: {str(e)}")
            raise
    
    async def record_result(self, result: ExperimentResult):
        """Record experiment result"""
        try:
            if result.experiment_id not in self.results:
                self.results[result.experiment_id] = []
            
            self.results[result.experiment_id].append(result)
            
            # Store in Redis
            key = f"result:{result.experiment_id}:{uuid.uuid4()}"
            await self.redis_client.set(key, result.json())
            
            logger.debug(f"Recorded result for experiment {result.experiment_id}")
            
        except Exception as e:
            logger.error(f"Error recording result: {str(e)}")
    
    def analyze_experiment(self, experiment_id: str) -> Dict[str, Any]:
        """Analyze experiment results"""
        if experiment_id not in self.experiments:
            return {"error": "Experiment not found"}
        
        if experiment_id not in self.results:
            return {"error": "No results found"}
        
        experiment = self.experiments[experiment_id]
        results = self.results[experiment_id]
        
        # Group results by variant
        variant_results = {}
        for result in results:
            if result.variant_id not in variant_results:
                variant_results[result.variant_id] = []
            variant_results[result.variant_id].append(result)
        
        # Calculate statistics for each variant
        variant_stats = {}
        for variant_id, variant_results_list in variant_results.items():
            if not variant_results_list:
                continue
            
            metric_values = [r.metric_value for r in variant_results_list]
            variant_stats[variant_id] = {
                "sample_size": len(metric_values),
                "mean": sum(metric_values) / len(metric_values),
                "min": min(metric_values),
                "max": max(metric_values),
                "latest_result": max(variant_results_list, key=lambda x: x.timestamp)
            }
        
        # Determine winner (highest mean for target metric)
        winner = None
        if variant_stats:
            winner = max(variant_stats.keys(), key=lambda v: variant_stats[v]["mean"])
        
        return {
            "experiment_id": experiment_id,
            "status": experiment.status,
            "variant_stats": variant_stats,
            "winner": winner,
            "routing_stats": self.traffic_router.get_routing_stats(experiment_id)
        }
    
    def get_experiment(self, experiment_id: str) -> Optional[Experiment]:
        """Get experiment by ID"""
        return self.experiments.get(experiment_id)
    
    def list_experiments(self, status: Optional[ExperimentStatus] = None) -> List[Experiment]:
        """List experiments, optionally filtered by status"""
        experiments = list(self.experiments.values())
        if status:
            experiments = [e for e in experiments if e.status == status]
        return experiments


class ModelVersionManager:
    """Manage model versions and deployments"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis_client = None
        self.versions: Dict[str, List[ModelVersion]] = {}  # model_id -> [versions]
        self.active_versions: Dict[str, str] = {}  # model_id -> active_version
    
    async def initialize(self):
        """Initialize version manager"""
        self.redis_client = await redis.from_url(self.redis_url)
        await self._load_versions()
        logger.info("Model version manager initialized")
    
    async def shutdown(self):
        """Shutdown version manager"""
        if self.redis_client:
            await self.redis_client.close()
    
    async def _load_versions(self):
        """Load versions from Redis"""
        try:
            version_keys = await self.redis_client.keys("version:*")
            for key in version_keys:
                version_data = await self.redis_client.get(key)
                if version_data:
                    version = ModelVersion.parse_raw(version_data)
                    
                    if version.model_id not in self.versions:
                        self.versions[version.model_id] = []
                    
                    self.versions[version.model_id].append(version)
            
            # Load active versions
            active_keys = await self.redis_client.keys("active:*")
            for key in active_keys:
                model_id = key.split(":")[-1]
                active_version = await self.redis_client.get(key)
                if active_version:
                    self.active_versions[model_id] = active_version.decode()
            
            logger.info(f"Loaded versions for {len(self.versions)} models")
            
        except Exception as e:
            logger.error(f"Error loading versions: {str(e)}")
    
    async def _save_version(self, version: ModelVersion):
        """Save version to Redis"""
        try:
            key = f"version:{version.model_id}:{version.version}"
            await self.redis_client.set(key, version.json())
        except Exception as e:
            logger.error(f"Error saving version: {str(e)}")
    
    async def register_version(self, version: ModelVersion) -> bool:
        """Register a new model version"""
        try:
            # Add to in-memory storage
            if version.model_id not in self.versions:
                self.versions[version.model_id] = []
            
            # Check if version already exists
            existing = [v for v in self.versions[version.model_id] if v.version == version.version]
            if existing:
                raise ValueError(f"Version {version.version} already exists for model {version.model_id}")
            
            self.versions[version.model_id].append(version)
            
            # Save to Redis
            await self._save_version(version)
            
            logger.info(f"Registered version {version.version} for model {version.model_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error registering version: {str(e)}")
            return False
    
    async def deploy_version(self, model_id: str, version: str, strategy: DeploymentStrategy = DeploymentStrategy.BLUE_GREEN) -> bool:
        """Deploy a model version"""
        try:
            # Find version
            if model_id not in self.versions:
                raise ValueError(f"Model not found: {model_id}")
            
            model_version = next((v for v in self.versions[model_id] if v.version == version), None)
            if not model_version:
                raise ValueError(f"Version not found: {version}")
            
            # Load new model
            success = await model_server.load_model(model_version.config)
            if not success:
                raise RuntimeError(f"Failed to load model {model_id} version {version}")
            
            # Handle deployment strategy
            if strategy == DeploymentStrategy.BLUE_GREEN:
                # Switch traffic immediately
                old_version = self.active_versions.get(model_id)
                self.active_versions[model_id] = version
                
                # Unload old version
                if old_version and old_version != version:
                    old_model_id = f"{model_id}_{old_version}"
                    await model_server.unload_model(old_model_id)
            
            elif strategy == DeploymentStrategy.CANARY:
                # Set up canary deployment with traffic splitting
                # This would typically involve updating routing rules
                pass
            
            # Update version status
            model_version.status = "deployed"
            model_version.deployed_at = datetime.utcnow()
            await self._save_version(model_version)
            
            # Save active version
            await self.redis_client.set(f"active:{model_id}", version)
            
            logger.info(f"Deployed version {version} for model {model_id} using {strategy}")
            return True
            
        except Exception as e:
            logger.error(f"Error deploying version {version} for model {model_id}: {str(e)}")
            return False
    
    def get_active_version(self, model_id: str) -> Optional[str]:
        """Get active version for a model"""
        return self.active_versions.get(model_id)
    
    def list_versions(self, model_id: str) -> List[ModelVersion]:
        """List all versions for a model"""
        return self.versions.get(model_id, [])
    
    def get_version(self, model_id: str, version: str) -> Optional[ModelVersion]:
        """Get specific version"""
        versions = self.versions.get(model_id, [])
        return next((v for v in versions if v.version == version), None)


# Global instances
experiment_manager = ExperimentManager()
version_manager = ModelVersionManager()
