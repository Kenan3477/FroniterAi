"""
Frontier Model Artifact Management System

A comprehensive system for managing ML model artifacts including:
- Model versioning and metadata management
- Weight storage and retrieval
- Checkpoint management and optimization
- Model registry integration
- A/B testing framework for model deployments
- Automated evaluation and validation
- Model format conversion utilities
- Rollback mechanisms and deployment safety
"""

from .version_manager import ModelVersionManager, ModelVersion, VersionStatus
from .storage_manager import ModelStorageManager, ArtifactMetadata, StorageBackend
from .checkpoint_manager import CheckpointManager, CheckpointMetadata, CleanupPolicy
from .registry import ModelRegistry, ModelMetadata, RegistryProvider
from .ab_testing import (
    ABTestingFramework, 
    ABTest, 
    TestStatus, 
    TrafficSplitStrategy,
    TestAnalysis,
    CompletionCriteria
)
from .evaluator import (
    ModelEvaluator,
    EvaluationConfig,
    EvaluationMetrics,
    QualityGate,
    BenchmarkResult,
    EvaluationStatus,
    QualityGateStatus,
    MetricType
)
from .converter import (
    ModelConverter,
    ConversionConfig,
    ConversionResult,
    ModelFormat,
    OptimizationLevel,
    create_optimization_pipeline,
    benchmark_conversion_formats
)

__all__ = [
    # Version Management
    'ModelVersionManager',
    'ModelVersion',
    'VersionStatus',
    
    # Storage Management
    'ModelStorageManager',
    'ArtifactMetadata',
    'StorageBackend',
    
    # Checkpoint Management
    'CheckpointManager',
    'CheckpointMetadata',
    'CleanupPolicy',
    
    # Registry Integration
    'ModelRegistry',
    'ModelMetadata',
    'RegistryProvider',
    
    # A/B Testing
    'ABTestingFramework',
    'ABTest',
    'TestStatus',
    'TrafficSplitStrategy',
    'TestAnalysis',
    'CompletionCriteria',
    
    # Model Evaluation
    'ModelEvaluator',
    'EvaluationConfig',
    'EvaluationMetrics',
    'QualityGate',
    'BenchmarkResult',
    'EvaluationStatus',
    'QualityGateStatus',
    'MetricType',
    
    # Format Conversion
    'ModelConverter',
    'ConversionConfig',
    'ConversionResult',
    'ModelFormat',
    'OptimizationLevel',
    'create_optimization_pipeline',
    'benchmark_conversion_formats'
]

__version__ = "1.0.0"
