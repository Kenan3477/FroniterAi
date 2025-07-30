#!/usr/bin/env python3
"""
Simple AI Model Infrastructure Test Script

This script tests the AI model infrastructure without requiring external dependencies.
"""

import os
import sys
import logging
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_imports():
    """Test that all components can be imported"""
    try:
        print("🔍 Testing imports...")
        
        # Test config
        from api.models.config import get_model_server_config, get_monitoring_config
        print("✅ Config imports successful")
        
        # Test model server components (without Redis)
        from api.models.serving.model_server import ModelConfig, ModelType, InferenceBackend
        print("✅ Model server imports successful")
        
        # Test monitoring components
        from api.models.monitoring.model_monitor import PerformanceMetrics
        print("✅ Model monitor imports successful")
        
        # Test inference engine components
        from api.models.inference.ai_inference_engine import InferenceRequest, TaskType
        print("✅ AI inference engine imports successful")
        
        return True
    except Exception as e:
        print(f"❌ Import test failed: {e}")
        return False

def test_model_config():
    """Test model configuration creation"""
    try:
        print("\n🔧 Testing model configuration...")
        
        from api.models.serving.model_server import ModelConfig, ModelType, InferenceBackend
        
        # Create a test model config
        test_config = ModelConfig(
            model_id="test-sentiment",
            model_type=ModelType.HUGGINGFACE,
            model_path="cardiffnlp/twitter-roberta-base-sentiment-latest",
            version="1.0.0",
            backend=InferenceBackend.CPU,
            max_batch_size=8,
            max_sequence_length=128
        )
        
        print(f"✅ Created test model config: {test_config.model_id}")
        return True
    except Exception as e:
        print(f"❌ Model config test failed: {e}")
        return False

def test_ai_tasks():
    """Test AI task definitions"""
    try:
        print("\n🎯 Testing AI task definitions...")
        
        from api.models.inference.ai_inference_engine import InferenceRequest, TaskType
        
        # Create a test task
        test_task = InferenceRequest(
            task_type=TaskType.SENTIMENT_ANALYSIS,
            input_data={"text": "This is a test message"},
            model_id="test-model",
            user_id="test-user"
        )
        
        print(f"✅ Created test task: {test_task.task_type}")
        return True
    except Exception as e:
        print(f"❌ AI task test failed: {e}")
        return False

def test_directory_structure():
    """Test that required directories can be created"""
    try:
        print("\n📁 Testing directory structure...")
        
        required_dirs = [
            "models",
            "logs",
            "cache"
        ]
        
        for dir_name in required_dirs:
            dir_path = project_root / dir_name
            if not dir_path.exists():
                dir_path.mkdir(parents=True, exist_ok=True)
                print(f"📂 Created directory: {dir_name}")
            else:
                print(f"✅ Directory exists: {dir_name}")
        
        return True
    except Exception as e:
        print(f"❌ Directory structure test failed: {e}")
        return False

def show_available_models():
    """Show predefined models that can be loaded"""
    try:
        print("\n📋 Available Predefined Models:")
        
        from api.models.config import PREDEFINED_MODELS
        
        for model_id, model_config in PREDEFINED_MODELS.items():
            print(f"\n• {model_id}:")
            print(f"  Path: {model_config.model_path}")
            print(f"  Type: {model_config.model_type}, Backend: {model_config.backend}")
            if hasattr(model_config, 'metadata') and model_config.metadata:
                task = model_config.metadata.get('task', 'unknown')
                domain = model_config.metadata.get('domain', 'general')
                print(f"  Task: {task}, Domain: {domain}")
        
        return True
    except Exception as e:
        print(f"❌ Failed to show models: {e}")
        return False

def test_fastapi_endpoints():
    """Test that FastAPI endpoints can be imported"""
    try:
        print("\n🌐 Testing FastAPI endpoints...")
        
        from api.models.ai_endpoints import router
        print("✅ AI endpoints router imported successfully")
        
        # Count available endpoints
        endpoint_count = len(router.routes)
        print(f"✅ Found {endpoint_count} AI endpoints")
        
        return True
    except Exception as e:
        print(f"❌ FastAPI endpoints test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Frontier AI Infrastructure Test Suite")
    print("=" * 50)
    
    tests = [
        ("Import Tests", test_imports),
        ("Directory Structure", test_directory_structure),
        ("Model Configuration", test_model_config),
        ("AI Task Definitions", test_ai_tasks),
        ("Available Models", show_available_models),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            print(f"\n{'='*20} {test_name} {'='*20}")
            if test_func():
                passed += 1
            else:
                print(f"❌ {test_name} failed")
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
    
    print(f"\n{'='*50}")
    print(f"🎯 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! AI infrastructure is ready.")
        print("\nNext steps:")
        print("1. Start Redis server: docker run -d -p 6379:6379 redis:alpine")
        print("2. Run the full initialization: python api/models/initialize_models.py")
        print("3. Start the API server: uvicorn api.main:app --reload")
    else:
        print("💥 Some tests failed. Please check the errors above.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
