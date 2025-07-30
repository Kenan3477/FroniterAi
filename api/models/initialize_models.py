"""
AI Model Infrastructure Initialization Script

Script to initialize the AI model serving infrastructure including
model downloads, setup, testing, and validation.
"""

import asyncio
import logging
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

import torch
import numpy as np
from transformers import AutoTokenizer, AutoModel, pipeline

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from models.config import (
    model_server_config,
    monitoring_config,
    deployment_config,
    PREDEFINED_MODELS,
    validate_config
)
from models.serving.model_server import model_server, ModelConfig, ModelType, InferenceBackend
from models.serving.model_versioning import experiment_manager, version_manager
from models.monitoring.model_monitor import model_monitor
from models.inference.ai_inference_engine import inference_engine

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ModelInitializer:
    """Initialize and setup AI model infrastructure"""
    
    def __init__(self):
        self.model_storage_path = Path(model_server_config.model_storage_path)
        self.initialized_models = []
        self.failed_models = []
    
    async def initialize_all(self) -> bool:
        """Initialize complete AI infrastructure"""
        logger.info("Starting AI model infrastructure initialization...")
        
        try:
            # Step 1: Validate configuration
            if not await self._validate_configuration():
                return False
            
            # Step 2: Setup directories
            await self._setup_directories()
            
            # Step 3: Check system requirements
            if not await self._check_system_requirements():
                return False
            
            # Step 4: Initialize Redis and database connections
            if not await self._initialize_services():
                return False
            
            # Step 5: Download and setup models
            if not await self._setup_models():
                return False
            
            # Step 6: Initialize inference engine
            if not await self._initialize_inference_engine():
                return False
            
            # Step 7: Run validation tests
            if not await self._run_validation_tests():
                return False
            
            logger.info("✅ AI model infrastructure initialization completed successfully!")
            await self._print_summary()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Initialization failed: {e}")
            return False
    
    async def _validate_configuration(self) -> bool:
        """Validate configuration settings"""
        logger.info("Validating configuration...")
        
        issues = validate_config(deployment_config)
        
        if issues:
            logger.error("❌ Configuration validation failed:")
            for issue in issues:
                logger.error(f"  - {issue}")
            return False
        
        logger.info("✅ Configuration validation passed")
        return True
    
    async def _setup_directories(self) -> bool:
        """Setup required directories"""
        logger.info("Setting up directories...")
        
        try:
            directories = [
                self.model_storage_path,
                self.model_storage_path / "huggingface",
                self.model_storage_path / "onnx",
                self.model_storage_path / "tensorrt",
                self.model_storage_path / "pytorch",
                Path("./logs"),
                Path("./cache"),
                Path("./data")
            ]
            
            for directory in directories:
                directory.mkdir(parents=True, exist_ok=True)
                logger.info(f"  ✅ Created directory: {directory}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to setup directories: {e}")
            return False
    
    async def _check_system_requirements(self) -> bool:
        """Check system requirements"""
        logger.info("Checking system requirements...")
        
        try:
            # Check Python version
            python_version = sys.version_info
            if python_version < (3, 8):
                logger.error(f"❌ Python 3.8+ required, found {python_version}")
                return False
            
            logger.info(f"✅ Python version: {python_version.major}.{python_version.minor}.{python_version.micro}")
            
            # Check PyTorch
            logger.info(f"✅ PyTorch version: {torch.__version__}")
            
            # Check CUDA availability
            if torch.cuda.is_available():
                logger.info(f"✅ CUDA available: {torch.cuda.get_device_name(0)}")
                logger.info(f"✅ CUDA version: {torch.version.cuda}")
            else:
                logger.warning("⚠️  CUDA not available, using CPU only")
            
            # Check available memory
            try:
                import psutil
                memory = psutil.virtual_memory()
                logger.info(f"✅ Available memory: {memory.available / (1024**3):.1f}GB")
                
                if memory.available < 4 * (1024**3):  # 4GB
                    logger.warning("⚠️  Low memory detected, consider upgrading for better performance")
            except ImportError:
                logger.warning("⚠️  psutil not available, cannot check memory")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ System requirements check failed: {e}")
            return False
    
    async def _initialize_services(self) -> bool:
        """Initialize external services (Redis, database)"""
        logger.info("Initializing services...")
        
        try:
            # Initialize model server (includes Redis)
            await model_server.initialize()
            logger.info("✅ Model server initialized")
            
            # Initialize experiment manager
            await experiment_manager.initialize()
            logger.info("✅ Experiment manager initialized")
            
            # Initialize version manager
            await version_manager.initialize()
            logger.info("✅ Version manager initialized")
            
            # Initialize monitoring
            await model_monitor.initialize()
            logger.info("✅ Model monitor initialized")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Service initialization failed: {e}")
            return False
    
    async def _setup_models(self) -> bool:
        """Download and setup predefined models"""
        logger.info("Setting up AI models...")
        
        try:
            # Setup models based on configuration
            for model_id, model_config in PREDEFINED_MODELS.items():
                try:
                    logger.info(f"  Setting up model: {model_id}")
                    
                    if model_config.model_type == "huggingface":
                        success = await self._setup_huggingface_model(model_config)
                    elif model_config.model_type == "pytorch":
                        success = await self._setup_pytorch_model(model_config)
                    elif model_config.model_type == "onnx":
                        success = await self._setup_onnx_model(model_config)
                    else:
                        logger.warning(f"⚠️  Unsupported model type: {model_config.model_type}")
                        continue
                    
                    if success:
                        self.initialized_models.append(model_id)
                        logger.info(f"  ✅ Model {model_id} setup completed")
                    else:
                        self.failed_models.append(model_id)
                        logger.error(f"  ❌ Model {model_id} setup failed")
                
                except Exception as e:
                    self.failed_models.append(model_id)
                    logger.error(f"  ❌ Model {model_id} setup failed: {e}")
            
            # Check if we have at least some models working
            if len(self.initialized_models) == 0:
                logger.error("❌ No models were successfully initialized")
                return False
            
            logger.info(f"✅ Successfully initialized {len(self.initialized_models)} models")
            if self.failed_models:
                logger.warning(f"⚠️  Failed to initialize {len(self.failed_models)} models: {self.failed_models}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Model setup failed: {e}")
            return False
    
    async def _setup_huggingface_model(self, model_config: ModelConfig) -> bool:
        """Setup HuggingFace model"""
        try:
            # Download and cache model
            logger.info(f"    Downloading HuggingFace model: {model_config.model_path}")
            
            # Check if model already exists locally
            local_path = self.model_storage_path / "huggingface" / model_config.model_id
            
            if local_path.exists():
                logger.info(f"    Model already cached locally: {local_path}")
                model_config.model_path = str(local_path)
            else:
                # Download model
                tokenizer = AutoTokenizer.from_pretrained(model_config.model_path)
                model = AutoModel.from_pretrained(model_config.model_path)
                
                # Save locally
                local_path.mkdir(parents=True, exist_ok=True)
                tokenizer.save_pretrained(str(local_path))
                model.save_pretrained(str(local_path))
                
                model_config.model_path = str(local_path)
                logger.info(f"    Model downloaded and cached: {local_path}")
            
            # Load model into server
            success = await model_server.load_model(model_config)
            if success:
                # Register for monitoring
                model_monitor.register_model(model_config.model_id)
            
            return success
            
        except Exception as e:
            logger.error(f"    HuggingFace model setup failed: {e}")
            return False
    
    async def _setup_pytorch_model(self, model_config: ModelConfig) -> bool:
        """Setup PyTorch model"""
        try:
            # For PyTorch models, we need to create dummy models for demo
            logger.info(f"    Setting up PyTorch model: {model_config.model_id}")
            
            model_path = Path(model_config.model_path)
            
            if not model_path.exists():
                # Create a dummy model for demonstration
                logger.info(f"    Creating dummy PyTorch model: {model_path}")
                
                # Create simple linear model
                dummy_model = torch.nn.Sequential(
                    torch.nn.Linear(10, 64),
                    torch.nn.ReLU(),
                    torch.nn.Linear(64, 32),
                    torch.nn.ReLU(),
                    torch.nn.Linear(32, 1)
                )
                
                # Save model
                model_path.parent.mkdir(parents=True, exist_ok=True)
                torch.save(dummy_model, model_path)
                logger.info(f"    Dummy model created: {model_path}")
            
            # Load model into server
            success = await model_server.load_model(model_config)
            if success:
                model_monitor.register_model(model_config.model_id)
            
            return success
            
        except Exception as e:
            logger.error(f"    PyTorch model setup failed: {e}")
            return False
    
    async def _setup_onnx_model(self, model_config: ModelConfig) -> bool:
        """Setup ONNX model"""
        try:
            logger.info(f"    Setting up ONNX model: {model_config.model_id}")
            
            # ONNX model setup would go here
            # For now, skip ONNX models in initialization
            logger.warning(f"    ONNX model setup not implemented: {model_config.model_id}")
            return False
            
        except Exception as e:
            logger.error(f"    ONNX model setup failed: {e}")
            return False
    
    async def _initialize_inference_engine(self) -> bool:
        """Initialize inference engine"""
        logger.info("Initializing inference engine...")
        
        try:
            await inference_engine.initialize()
            logger.info("✅ Inference engine initialized")
            return True
            
        except Exception as e:
            logger.error(f"❌ Inference engine initialization failed: {e}")
            return False
    
    async def _run_validation_tests(self) -> bool:
        """Run validation tests on the setup"""
        logger.info("Running validation tests...")
        
        try:
            # Test model server
            models_status = model_server.get_all_models_status()
            working_models = [m for m, status in models_status.items() if status.get("status") == "ready"]
            
            if not working_models:
                logger.error("❌ No models are in ready state")
                return False
            
            logger.info(f"✅ {len(working_models)} models are ready")
            
            # Test inference engine
            if not inference_engine._initialized:
                logger.error("❌ Inference engine not initialized")
                return False
            
            logger.info("✅ Inference engine is ready")
            
            # Test basic prediction
            if working_models:
                test_model = working_models[0]
                try:
                    from models.inference.ai_inference_engine import InferenceRequest, TaskType
                    
                    test_request = InferenceRequest(
                        task_type=TaskType.SENTIMENT_ANALYSIS,
                        input_data={"text": "This is a test message for validation."},
                        model_id=test_model
                    )
                    
                    result = await inference_engine.predict(test_request)
                    logger.info(f"✅ Test prediction successful: {result.model_id}")
                    
                except Exception as e:
                    logger.warning(f"⚠️  Test prediction failed: {e}")
            
            # Test monitoring
            overview = model_monitor.get_system_overview()
            if overview["models_monitored"] > 0:
                logger.info(f"✅ Monitoring active for {overview['models_monitored']} models")
            else:
                logger.warning("⚠️  No models being monitored")
            
            logger.info("✅ Validation tests completed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Validation tests failed: {e}")
            return False
    
    async def _print_summary(self):
        """Print initialization summary"""
        print("\n" + "="*60)
        print("🚀 AI MODEL INFRASTRUCTURE SUMMARY")
        print("="*60)
        
        print(f"📦 Models Initialized: {len(self.initialized_models)}")
        for model_id in self.initialized_models:
            print(f"  ✅ {model_id}")
        
        if self.failed_models:
            print(f"\n❌ Failed Models: {len(self.failed_models)}")
            for model_id in self.failed_models:
                print(f"  ❌ {model_id}")
        
        print(f"\n🔧 Configuration:")
        print(f"  Environment: {deployment_config.environment}")
        print(f"  API Host: {deployment_config.api_host}:{deployment_config.api_port}")
        print(f"  Redis URL: {model_server_config.redis_url}")
        print(f"  Model Storage: {self.model_storage_path}")
        print(f"  GPU Enabled: {model_server_config.gpu_enabled}")
        print(f"  Monitoring: {model_server_config.monitoring_enabled}")
        
        # System status
        system_status = inference_engine.get_system_status()
        print(f"\n📊 System Status:")
        print(f"  Models Loaded: {system_status['model_server']}")
        print(f"  Experiments: {system_status['experiments']['total']}")
        print(f"  Active Experiments: {system_status['experiments']['active']}")
        
        print("\n🌐 API Endpoints Available:")
        print("  POST /api/v1/ai/predict - Single prediction")
        print("  POST /api/v1/ai/batch-predict - Batch prediction") 
        print("  POST /api/v1/ai/financial/sentiment-analysis - Financial sentiment")
        print("  POST /api/v1/ai/financial/risk-assessment - Risk assessment")
        print("  GET  /api/v1/ai/system/status - System status")
        print("  GET  /api/v1/ai/models - List models")
        
        print("\n✨ Ready for AI-powered financial analysis!")
        print("="*60)


async def main():
    """Main initialization function"""
    print("🤖 Frontier AI Model Infrastructure Initialization")
    print("=" * 50)
    
    initializer = ModelInitializer()
    success = await initializer.initialize_all()
    
    if success:
        print("\n🎉 Initialization completed successfully!")
        print("The AI model infrastructure is ready to serve requests.")
        return 0
    else:
        print("\n💥 Initialization failed!")
        print("Please check the logs above for details.")
        return 1


if __name__ == "__main__":
    # Run initialization
    exit_code = asyncio.run(main())
