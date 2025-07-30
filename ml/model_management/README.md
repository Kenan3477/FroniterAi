# Frontier Model Artifact Management System

A comprehensive, production-ready system for managing ML model artifacts throughout their entire lifecycle. This system provides enterprise-grade capabilities for model versioning, storage, checkpointing, registry integration, A/B testing, automated evaluation, and format conversion.

## 🚀 Features

### Core Capabilities
- **Model Versioning**: Semantic versioning with git-like branching and status management
- **Multi-Backend Storage**: Support for local, S3, Azure Blob, Google Cloud Storage, and Redis
- **Intelligent Checkpointing**: Automated checkpoint management with configurable cleanup policies
- **Registry Integration**: MLflow and Weights & Biases integration for centralized tracking
- **A/B Testing Framework**: Statistical A/B testing with automated decision making
- **Automated Evaluation**: Comprehensive model evaluation with quality gates
- **Format Conversion**: Convert between PyTorch, ONNX, TensorRT, and other formats

### Enterprise Features
- **Compliance & Audit Trails**: Complete model lineage and change tracking
- **Automated Quality Gates**: Configurable quality thresholds with automated validation
- **Statistical Analysis**: Built-in statistical significance testing for A/B experiments
- **Performance Monitoring**: Automated performance benchmarking and optimization
- **Safety Mechanisms**: Automated rollback capabilities and safety violation detection
- **Multi-Cloud Support**: Deploy across different cloud providers seamlessly

## 📦 Installation

### Basic Installation
```bash
# Clone the repository
git clone <repository-url>
cd Frontier/ml/model_management

# Install dependencies
pip install -r requirements.txt
```

### Optional Dependencies
```bash
# For TensorRT support (requires NVIDIA setup)
pip install tensorrt>=8.0.0

# For TensorFlow conversion
pip install tensorflow>=2.7.0 onnx-tf>=1.9.0

# For cloud storage
pip install boto3 azure-storage-blob google-cloud-storage

# For experiment tracking
pip install mlflow wandb
```

## 🔧 Quick Start

### Basic Usage
```python
import asyncio
from ml.model_management import (
    ModelVersionManager,
    ModelStorageManager,
    ModelRegistry,
    ModelEvaluator,
    StorageBackend
)

async def basic_example():
    # Initialize components
    storage_manager = ModelStorageManager(
        backend=StorageBackend.LOCAL,
        storage_config={"base_path": "./models"}
    )
    
    version_manager = ModelVersionManager(storage_manager)
    model_registry = ModelRegistry(storage_manager)
    
    # Create a model version
    version = await version_manager.create_version(
        model_id="my_model",
        model_artifact=model.state_dict(),
        metadata={"accuracy": 0.95, "training_time": "2h"}
    )
    
    # Register with MLflow
    await model_registry.register_model(
        model_id="my_model",
        version=version.version,
        model_artifact=model.state_dict()
    )

# Run the example
asyncio.run(basic_example())
```

### Complete Workflow Example
See [`examples/complete_workflow_demo.py`](examples/complete_workflow_demo.py) for a comprehensive demonstration of all features.

## 📚 Documentation

### Core Components

#### 1. Model Version Manager
Handles semantic versioning with git-like branching capabilities.

```python
from ml.model_management import ModelVersionManager, VersionStatus

# Create versions
version = await version_manager.create_version(
    model_id="fraud_detection",
    model_artifact=model.state_dict(),
    metadata={"accuracy": 0.92}
)

# Create experimental branches
branch = await version_manager.create_branch(
    model_id="fraud_detection",
    source_version="1.0.0",
    branch_name="experimental"
)

# Promote versions
await version_manager.set_version_status(
    model_id="fraud_detection",
    version="1.0.0",
    status=VersionStatus.PRODUCTION
)
```

#### 2. Storage Manager
Multi-backend storage with compression and caching.

```python
from ml.model_management import ModelStorageManager, StorageBackend

# Local storage
storage = ModelStorageManager(
    backend=StorageBackend.LOCAL,
    storage_config={"base_path": "./models"}
)

# S3 storage
storage = ModelStorageManager(
    backend=StorageBackend.S3,
    storage_config={
        "bucket_name": "my-models",
        "region": "us-west-2"
    }
)

# Store and retrieve artifacts
await storage.store_artifact("model_id", "1.0.0", model_data)
model_data = await storage.retrieve_artifact("model_id", "1.0.0")
```

#### 3. Checkpoint Manager
Intelligent checkpoint management with automated cleanup.

```python
from ml.model_management import CheckpointManager, CleanupPolicy

checkpoint_manager = CheckpointManager(
    storage_manager=storage_manager,
    version_manager=version_manager,
    cleanup_policy=CleanupPolicy.KEEP_BEST_AND_RECENT
)

# Save checkpoints during training
checkpoint = await checkpoint_manager.save_checkpoint(
    model_id="my_model",
    version="1.0.0",
    model_state=model.state_dict(),
    optimizer_state=optimizer.state_dict(),
    epoch=100,
    loss=0.05,
    metrics={"accuracy": 0.95}
)
```

#### 4. Model Registry
Integration with MLflow and Weights & Biases.

```python
from ml.model_management import ModelRegistry, RegistryProvider

registry = ModelRegistry(
    storage_manager=storage_manager,
    registry_provider=RegistryProvider.MLFLOW,
    registry_config={"tracking_uri": "http://mlflow-server:5000"}
)

# Register models with rich metadata
await registry.register_model(
    model_id="recommendation_engine",
    version="2.1.0",
    model_artifact=model.state_dict(),
    metadata={
        "model_type": "collaborative_filtering",
        "training_data_size": 1000000,
        "performance_metrics": {"precision@10": 0.85}
    }
)
```

#### 5. A/B Testing Framework
Statistical A/B testing with automated analysis.

```python
from ml.model_management import ABTestingFramework, TrafficSplitStrategy

ab_testing = ABTestingFramework(
    model_registry=registry,
    storage_manager=storage_manager
)

# Create A/B test
test = await ab_testing.create_test(
    test_name="model_v1_vs_v2",
    description="Compare baseline vs new architecture",
    control_variant={"model_id": "my_model", "version": "1.0.0"},
    treatment_variants=[{"model_id": "my_model", "version": "2.0.0"}],
    traffic_split_strategy=TrafficSplitStrategy.RANDOM,
    success_metrics=["accuracy", "response_time"]
)

# Start test and record metrics
await ab_testing.start_test(test.test_id)
await ab_testing.record_metrics(
    test_id=test.test_id,
    variant_id="control",
    metrics={"accuracy": 0.85, "response_time": 120}
)
```

#### 6. Model Evaluator
Automated evaluation with quality gates.

```python
from ml.model_management import (
    ModelEvaluator, 
    EvaluationConfig, 
    QualityGate,
    EvaluationStatus
)

evaluator = ModelEvaluator(
    storage_manager=storage_manager,
    model_registry=registry
)

# Define quality gates
quality_gates = [
    QualityGate(
        name="minimum_accuracy",
        metric_name="accuracy",
        threshold=0.85,
        comparison=">=",
        severity="critical",
        description="Model must achieve 85% accuracy"
    )
]

# Configure evaluation
config = EvaluationConfig(
    evaluation_id="eval_001",
    model_id="my_model",
    version="1.0.0",
    test_datasets=["validation_set"],
    quality_gates=quality_gates,
    performance_tests_enabled=True
)

# Run evaluation
results = await evaluator.evaluate_model(config, model)
```

#### 7. Model Converter
Convert between different model formats.

```python
from ml.model_management import (
    ModelConverter, 
    ConversionConfig, 
    ModelFormat,
    OptimizationLevel
)

converter = ModelConverter()

# Convert PyTorch to ONNX
config = ConversionConfig(
    source_format=ModelFormat.PYTORCH,
    target_format=ModelFormat.ONNX,
    model_path="./model.pth",
    output_path="./model.onnx",
    optimization_level=OptimizationLevel.MAX_PERFORMANCE,
    input_shapes={"input": (1, 3, 224, 224)},
    validate_conversion=True
)

result = converter.convert_model(config)
if result.success:
    print(f"Conversion successful: {result.output_path}")
```

## 🏗️ Architecture

### System Components
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontier Model Management                 │
├─────────────────────────────────────────────────────────────┤
│  Version Manager  │  Storage Manager  │  Checkpoint Manager │
├─────────────────────────────────────────────────────────────┤
│  Model Registry   │  A/B Testing     │  Model Evaluator    │
├─────────────────────────────────────────────────────────────┤
│              Model Converter & Format Support              │
├─────────────────────────────────────────────────────────────┤
│     Local Storage │ S3 │ Azure │ GCS │ Redis │ MLflow      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow
1. **Model Development**: Train models with integrated checkpointing
2. **Versioning**: Create semantic versions with metadata
3. **Storage**: Store artifacts across multiple backends
4. **Registration**: Register with external tracking systems
5. **Evaluation**: Automated quality assessment with gates
6. **Testing**: A/B testing with statistical analysis
7. **Conversion**: Format optimization for deployment
8. **Deployment**: Production deployment with monitoring

## 🔒 Security & Compliance

### Security Features
- **Encryption**: At-rest and in-transit encryption for sensitive artifacts
- **Access Control**: Role-based access control integration
- **Audit Trails**: Complete audit logs for compliance
- **Secure Storage**: Integration with enterprise storage systems

### Compliance
- **Model Lineage**: Complete tracking from training to production
- **Change Management**: Approval workflows for model updates
- **Validation Records**: Automated validation and testing records
- **Rollback Capability**: Quick rollback for incident response

## 📊 Monitoring & Observability

### Built-in Metrics
- Model performance metrics
- Storage utilization
- Conversion success rates
- A/B test statistical significance
- System health and availability

### Integration
- Prometheus metrics export
- Structured logging with correlation IDs
- Custom dashboard support
- Alert integration

## 🚀 Production Deployment

### Recommended Setup
```yaml
# docker-compose.yml example
version: '3.8'
services:
  model-management:
    build: .
    environment:
      - STORAGE_BACKEND=s3
      - S3_BUCKET=production-models
      - MLFLOW_TRACKING_URI=http://mlflow:5000
    volumes:
      - ./config:/app/config
    depends_on:
      - postgres
      - redis
      - mlflow

  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: model_management
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secure_password

  redis:
    image: redis:6-alpine

  mlflow:
    image: mlflow/mlflow:latest
    command: mlflow server --host 0.0.0.0 --backend-store-uri postgresql://admin:secure_password@postgres/mlflow
```

### Configuration
```python
# config/production.py
STORAGE_CONFIG = {
    "backend": "s3",
    "bucket_name": "production-models",
    "encryption_enabled": True,
    "backup_enabled": True
}

REGISTRY_CONFIG = {
    "provider": "mlflow",
    "tracking_uri": "http://mlflow-server:5000",
    "experiment_name": "production_models"
}

EVALUATION_CONFIG = {
    "default_quality_gates": [
        {
            "name": "production_accuracy",
            "metric": "accuracy",
            "threshold": 0.9,
            "severity": "critical"
        }
    ]
}
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
pytest tests/

# Run specific component tests
pytest tests/test_version_manager.py
pytest tests/test_storage_manager.py
pytest tests/test_ab_testing.py

# Run with coverage
pytest --cov=ml.model_management tests/
```

### Test Categories
- **Unit Tests**: Individual component testing
- **Integration Tests**: Multi-component workflows
- **Performance Tests**: Load and stress testing
- **End-to-End Tests**: Complete workflow validation

## 📈 Performance Optimization

### Best Practices
1. **Storage Optimization**:
   - Use appropriate compression for model artifacts
   - Implement caching for frequently accessed models
   - Choose optimal storage backends for your use case

2. **Evaluation Efficiency**:
   - Parallelize evaluation across multiple datasets
   - Use sampling for large-scale validation
   - Cache evaluation results when possible

3. **A/B Testing**:
   - Use appropriate sample sizes for statistical power
   - Implement early stopping for clear winners
   - Monitor for Simpson's paradox

4. **Format Conversion**:
   - Choose optimal precision (FP16 vs FP32) for your use case
   - Leverage hardware-specific optimizations (TensorRT)
   - Validate converted models thoroughly

## 🤝 Contributing

### Development Setup
```bash
# Install development dependencies
pip install -r requirements.txt
pip install -e ".[dev]"

# Set up pre-commit hooks
pre-commit install

# Run code formatting
black ml/
flake8 ml/

# Type checking
mypy ml/
```

### Guidelines
- Follow PEP 8 style guidelines
- Add comprehensive docstrings
- Include unit tests for new features
- Update documentation for API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Reference](docs/api_reference.md)
- [Configuration Guide](docs/configuration.md)
- [Troubleshooting](docs/troubleshooting.md)

### Community
- [Issues](https://github.com/your-org/frontier/issues)
- [Discussions](https://github.com/your-org/frontier/discussions)
- [Contributing Guide](CONTRIBUTING.md)

---

**Built with ❤️ for the ML Engineering community**
