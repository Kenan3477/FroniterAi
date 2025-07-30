"""
Example Usage of Frontier Model Artifact Management System

This script demonstrates how to use all components of the model management system
including versioning, storage, checkpointing, registry, A/B testing, evaluation,
and format conversion.
"""

import asyncio
import logging
import torch
import torch.nn as nn
import numpy as np
from datetime import datetime, timedelta

from ml.model_management import (
    # Core components
    ModelVersionManager,
    ModelStorageManager,
    CheckpointManager,
    ModelRegistry,
    ABTestingFramework,
    ModelEvaluator,
    ModelConverter,
    
    # Configuration classes
    EvaluationConfig,
    QualityGate,
    ConversionConfig,
    
    # Enums
    VersionStatus,
    StorageBackend,
    RegistryProvider,
    TrafficSplitStrategy,
    EvaluationStatus,
    ModelFormat,
    OptimizationLevel
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Example model for demonstration
class SimpleModel(nn.Module):
    def __init__(self, input_size=10, hidden_size=50, output_size=1):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, output_size)
        )
    
    def forward(self, x):
        return self.layers(x)

async def demonstrate_complete_workflow():
    """Demonstrate the complete model management workflow"""
    
    logger.info("=== Starting Frontier Model Management Demo ===")
    
    # 1. Initialize core components
    logger.info("\n1. Initializing components...")
    
    storage_manager = ModelStorageManager(
        backend=StorageBackend.LOCAL,
        storage_config={"base_path": "./model_storage"}
    )
    
    version_manager = ModelVersionManager(storage_manager)
    
    checkpoint_manager = CheckpointManager(
        storage_manager=storage_manager,
        version_manager=version_manager
    )
    
    model_registry = ModelRegistry(
        storage_manager=storage_manager,
        registry_provider=RegistryProvider.MLFLOW,
        registry_config={"tracking_uri": "./mlruns"}
    )
    
    ab_testing = ABTestingFramework(
        model_registry=model_registry,
        storage_manager=storage_manager
    )
    
    evaluator = ModelEvaluator(
        storage_manager=storage_manager,
        model_registry=model_registry
    )
    
    converter = ModelConverter()
    
    # 2. Create and train a model
    logger.info("\n2. Creating and training model...")
    
    model = SimpleModel()
    model_id = "frontier_demo_model"
    
    # Simulate training
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    
    # Generate synthetic training data
    X_train = torch.randn(1000, 10)
    y_train = torch.sum(X_train, dim=1, keepdim=True) + torch.randn(1000, 1) * 0.1
    
    # Training loop
    model.train()
    for epoch in range(10):
        optimizer.zero_grad()
        outputs = model(X_train)
        loss = criterion(outputs, y_train)
        loss.backward()
        optimizer.step()
        
        if epoch % 5 == 0:
            logger.info(f"Epoch {epoch}, Loss: {loss.item():.4f}")
    
    # 3. Version management
    logger.info("\n3. Managing model versions...")
    
    # Create initial version
    version_1_0_0 = await version_manager.create_version(
        model_id=model_id,
        model_artifact=model.state_dict(),
        metadata={
            "architecture": "SimpleModel",
            "training_epochs": 10,
            "training_loss": loss.item(),
            "created_by": "demo_script"
        }
    )
    
    logger.info(f"Created version: {version_1_0_0.version}")
    
    # Create a branch for experimentation
    experimental_version = await version_manager.create_branch(
        model_id=model_id,
        source_version="1.0.0",
        branch_name="experimental",
        metadata={"purpose": "Testing new architecture"}
    )
    
    logger.info(f"Created experimental branch: {experimental_version.version}")
    
    # 4. Checkpoint management
    logger.info("\n4. Managing checkpoints...")
    
    # Create checkpoints during training
    checkpoint_metadata = await checkpoint_manager.save_checkpoint(
        model_id=model_id,
        version="1.0.0",
        model_state=model.state_dict(),
        optimizer_state=optimizer.state_dict(),
        epoch=10,
        loss=loss.item(),
        metrics={"accuracy": 0.95, "f1_score": 0.92}
    )
    
    logger.info(f"Created checkpoint: {checkpoint_metadata.checkpoint_id}")
    
    # 5. Model registry integration
    logger.info("\n5. Registering model...")
    
    model_metadata = await model_registry.register_model(
        model_id=model_id,
        version="1.0.0",
        model_artifact=model.state_dict(),
        metadata={
            "model_type": "regression",
            "framework": "pytorch",
            "input_shape": [10],
            "output_shape": [1],
            "performance_metrics": {
                "mse": loss.item(),
                "training_time_minutes": 5
            }
        }
    )
    
    logger.info(f"Registered model with ID: {model_metadata.model_id}")
    
    # 6. Model evaluation
    logger.info("\n6. Evaluating model...")
    
    # Define quality gates
    quality_gates = [
        QualityGate(
            name="minimum_accuracy",
            metric_name="accuracy",
            threshold=0.8,
            comparison=">=",
            severity="critical",
            description="Model must have at least 80% accuracy"
        ),
        QualityGate(
            name="maximum_inference_time",
            metric_name="inference_time_ms",
            threshold=100,
            comparison="<=",
            severity="major",
            description="Inference time must be under 100ms"
        )
    ]
    
    # Create evaluation configuration
    evaluation_config = EvaluationConfig(
        evaluation_id=f"eval_{model_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        model_id=model_id,
        version="1.0.0",
        test_datasets=["synthetic_test"],
        benchmark_suites=["performance_benchmark"],
        quality_gates=quality_gates,
        metrics_to_compute=["accuracy", "mse", "inference_time"],
        performance_tests_enabled=True,
        generate_report=True
    )
    
    # Run evaluation
    evaluation_results = await evaluator.evaluate_model(evaluation_config, model)
    
    logger.info(f"Evaluation status: {evaluation_results['status']}")
    logger.info(f"Quality gates passed: {evaluation_results['summary']['quality_gates_passed']}/{evaluation_results['summary']['quality_gates_total']}")
    
    # 7. Format conversion
    logger.info("\n7. Converting model formats...")
    
    # Save PyTorch model first
    pytorch_model_path = "./temp_model.pth"
    torch.save(model, pytorch_model_path)
    
    # Convert to ONNX
    onnx_config = ConversionConfig(
        source_format=ModelFormat.PYTORCH,
        target_format=ModelFormat.ONNX,
        model_path=pytorch_model_path,
        output_path="./model.onnx",
        optimization_level=OptimizationLevel.BASIC,
        input_shapes={"input": (1, 10)},
        input_names=["input"],
        output_names=["output"],
        validate_conversion=True
    )
    
    onnx_result = converter.convert_model(onnx_config)
    
    if onnx_result.success:
        logger.info(f"Successfully converted to ONNX: {onnx_result.output_path}")
        logger.info(f"File size: {onnx_result.file_size_mb:.2f} MB")
        logger.info(f"Validation passed: {onnx_result.validation_passed}")
    else:
        logger.error(f"ONNX conversion failed: {onnx_result.error_message}")
    
    # 8. A/B Testing setup
    logger.info("\n8. Setting up A/B testing...")
    
    # Create a second model version for testing
    model_v2 = SimpleModel(input_size=10, hidden_size=100, output_size=1)  # Larger model
    
    version_2_0_0 = await version_manager.create_version(
        model_id=model_id,
        model_artifact=model_v2.state_dict(),
        metadata={
            "architecture": "SimpleModel_v2",
            "training_epochs": 10,
            "hidden_size": 100,
            "created_by": "demo_script"
        }
    )
    
    # Register the new version
    await model_registry.register_model(
        model_id=model_id,
        version="2.0.0",
        model_artifact=model_v2.state_dict(),
        metadata={
            "model_type": "regression",
            "framework": "pytorch",
            "input_shape": [10],
            "output_shape": [1],
            "improvements": "Larger hidden layer for better capacity"
        }
    )
    
    # Create A/B test
    ab_test = await ab_testing.create_test(
        test_name="model_v1_vs_v2",
        description="Compare original model vs larger model",
        control_variant={
            "model_id": model_id,
            "version": "1.0.0",
            "traffic_percentage": 50
        },
        treatment_variants=[{
            "model_id": model_id,
            "version": "2.0.0",
            "traffic_percentage": 50
        }],
        traffic_split_strategy=TrafficSplitStrategy.RANDOM,
        success_metrics=["accuracy", "response_time"],
        start_date=datetime.utcnow(),
        end_date=datetime.utcnow() + timedelta(days=7)
    )
    
    logger.info(f"Created A/B test: {ab_test.test_id}")
    
    # Start the test
    await ab_testing.start_test(ab_test.test_id)
    logger.info("A/B test started")
    
    # Simulate some test metrics
    for i in range(5):
        await ab_testing.record_metrics(
            test_id=ab_test.test_id,
            variant_id="control",
            metrics={"accuracy": 0.85 + np.random.normal(0, 0.02)}
        )
        
        await ab_testing.record_metrics(
            test_id=ab_test.test_id,
            variant_id="treatment_0",
            metrics={"accuracy": 0.88 + np.random.normal(0, 0.02)}
        )
    
    # 9. Performance benchmarking
    logger.info("\n9. Running performance benchmarks...")
    
    # Benchmark different formats
    test_data = np.random.randn(100, 10).astype(np.float32)
    
    try:
        benchmark_results = benchmark_conversion_formats(
            model_path=pytorch_model_path,
            test_data=test_data,
            formats_to_test=["pytorch", "onnx"]  # Only test available formats
        )
        
        for format_name, metrics in benchmark_results.items():
            if "error" not in metrics:
                logger.info(f"{format_name.upper()}: "
                          f"Inference time: {metrics['inference_time_ms']:.2f}ms, "
                          f"File size: {metrics['file_size_mb']:.2f}MB")
    except Exception as e:
        logger.warning(f"Benchmarking failed: {e}")
    
    # 10. Cleanup and summary
    logger.info("\n10. Cleanup and summary...")
    
    # Get model registry statistics
    all_models = await model_registry.list_models()
    logger.info(f"Total models in registry: {len(all_models)}")
    
    # Get version information
    versions = await version_manager.list_versions(model_id)
    logger.info(f"Total versions for {model_id}: {len(versions)}")
    
    # Clean up temporary files
    import os
    if os.path.exists(pytorch_model_path):
        os.remove(pytorch_model_path)
    
    logger.info("\n=== Demo completed successfully! ===")
    
    return {
        "model_id": model_id,
        "versions_created": len(versions),
        "evaluation_passed": evaluation_results['summary']['overall_status'] == 'passed',
        "ab_test_id": ab_test.test_id,
        "conversion_successful": onnx_result.success
    }

async def demonstrate_advanced_features():
    """Demonstrate advanced features like custom evaluators and optimization pipelines"""
    
    logger.info("\n=== Advanced Features Demo ===")
    
    # Custom evaluation function
    def custom_business_metric(model, predictions, actuals, dataset):
        # Simulate a business metric calculation
        # In practice, this could calculate revenue impact, user engagement, etc.
        return np.mean(predictions) * 1000  # Example business value
    
    # Initialize evaluator and register custom metric
    storage_manager = ModelStorageManager(
        backend=StorageBackend.LOCAL,
        storage_config={"base_path": "./model_storage"}
    )
    
    evaluator = ModelEvaluator(storage_manager=storage_manager)
    evaluator.register_custom_evaluator("business_value", custom_business_metric)
    
    # Optimization pipeline for multiple formats
    converter = ModelConverter()
    
    # Create a simple model for testing
    model = SimpleModel()
    pytorch_path = "./test_model.pth"
    torch.save(model, pytorch_path)
    
    try:
        optimization_results = create_optimization_pipeline(
            model_path=pytorch_path,
            target_formats=["onnx"],  # Only test ONNX for compatibility
            optimization_configs={
                "onnx": {
                    "output_path": "./optimized_model.onnx",
                    "precision": "fp32",
                    "batch_size": 1
                }
            }
        )
        
        for result in optimization_results:
            if result.success:
                logger.info(f"Optimization successful: {result.target_format}")
                logger.info(f"File size: {result.file_size_mb:.2f} MB")
            else:
                logger.error(f"Optimization failed: {result.error_message}")
    
    except Exception as e:
        logger.warning(f"Optimization pipeline failed: {e}")
    
    # Clean up
    if os.path.exists(pytorch_path):
        os.remove(pytorch_path)
    
    logger.info("Advanced features demo completed")

def main():
    """Main function to run all demonstrations"""
    try:
        # Run basic workflow
        result = asyncio.run(demonstrate_complete_workflow())
        
        logger.info(f"\nDemo Results:")
        logger.info(f"- Model ID: {result['model_id']}")
        logger.info(f"- Versions created: {result['versions_created']}")
        logger.info(f"- Evaluation passed: {result['evaluation_passed']}")
        logger.info(f"- A/B test ID: {result['ab_test_id']}")
        logger.info(f"- Format conversion: {result['conversion_successful']}")
        
        # Run advanced features
        asyncio.run(demonstrate_advanced_features())
        
    except Exception as e:
        logger.error(f"Demo failed: {e}")
        raise

if __name__ == "__main__":
    main()
