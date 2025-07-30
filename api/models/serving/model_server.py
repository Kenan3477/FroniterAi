"""
AI Model Serving Infrastructure

Comprehensive model serving system with TensorRT, ONNX Runtime,
GPU acceleration, caching, and performance monitoring.
"""

import asyncio
import json
import logging
import os
import time
import uuid
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Union, Tuple
import hashlib

import numpy as np
import torch
import onnxruntime as ort
from transformers import AutoTokenizer, AutoModel, pipeline
import redis.asyncio as redis
from pydantic import BaseModel, Field

# TensorRT imports (optional, install with nvidia-tensorrt)
try:
    import tensorrt as trt
    import pycuda.driver as cuda
    import pycuda.autoinit
    TENSORRT_AVAILABLE = True
except ImportError:
    TENSORRT_AVAILABLE = False
    logging.warning("TensorRT not available. GPU acceleration limited.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ModelType(str, Enum):
    """Supported model types"""
    PYTORCH = "pytorch"
    ONNX = "onnx"
    TENSORRT = "tensorrt"
    HUGGINGFACE = "huggingface"


class ModelStatus(str, Enum):
    """Model status"""
    LOADING = "loading"
    READY = "ready"
    ERROR = "error"
    UNLOADED = "unloaded"


class InferenceBackend(str, Enum):
    """Inference backends"""
    CPU = "cpu"
    CUDA = "cuda"
    TENSORRT = "tensorrt"
    ONNX_CPU = "onnx_cpu"
    ONNX_GPU = "onnx_gpu"


@dataclass
class ModelConfig:
    """Model configuration"""
    model_id: str
    model_type: ModelType
    model_path: str
    version: str = "1.0.0"
    backend: InferenceBackend = InferenceBackend.CPU
    max_batch_size: int = 32
    max_sequence_length: int = 512
    cache_ttl: int = 3600  # Cache TTL in seconds
    warmup_samples: int = 5
    memory_limit_mb: int = 1024
    gpu_memory_fraction: float = 0.3
    precision: str = "fp16"  # fp32, fp16, int8
    metadata: Dict[str, Any] = None


class ModelMetrics:
    """Model performance metrics"""
    
    def __init__(self):
        self.request_count = 0
        self.total_latency = 0.0
        self.error_count = 0
        self.cache_hits = 0
        self.cache_misses = 0
        self.gpu_memory_used = 0.0
        self.throughput_samples = []
    
    def record_request(self, latency: float, error: bool = False, cache_hit: bool = False):
        """Record a request metric"""
        self.request_count += 1
        self.total_latency += latency
        
        if error:
            self.error_count += 1
        
        if cache_hit:
            self.cache_hits += 1
        else:
            self.cache_misses += 1
        
        # Keep throughput samples for last 100 requests
        self.throughput_samples.append(time.time())
        if len(self.throughput_samples) > 100:
            self.throughput_samples.pop(0)
    
    @property
    def average_latency(self) -> float:
        """Calculate average latency"""
        return self.total_latency / max(self.request_count, 1)
    
    @property
    def error_rate(self) -> float:
        """Calculate error rate"""
        return self.error_count / max(self.request_count, 1)
    
    @property
    def cache_hit_rate(self) -> float:
        """Calculate cache hit rate"""
        total_cache_requests = self.cache_hits + self.cache_misses
        return self.cache_hits / max(total_cache_requests, 1)
    
    @property
    def throughput_rps(self) -> float:
        """Calculate requests per second"""
        if len(self.throughput_samples) < 2:
            return 0.0
        
        time_window = self.throughput_samples[-1] - self.throughput_samples[0]
        return len(self.throughput_samples) / max(time_window, 1)


class BaseModelEngine(ABC):
    """Base class for model engines"""
    
    def __init__(self, config: ModelConfig):
        self.config = config
        self.model = None
        self.tokenizer = None
        self.status = ModelStatus.UNLOADED
        self.metrics = ModelMetrics()
        self.last_used = time.time()
    
    @abstractmethod
    async def load_model(self) -> bool:
        """Load the model"""
        pass
    
    @abstractmethod
    async def predict(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run inference"""
        pass
    
    @abstractmethod
    async def unload_model(self):
        """Unload the model from memory"""
        pass
    
    async def warmup(self):
        """Warm up the model with sample inputs"""
        logger.info(f"Warming up model {self.config.model_id}")
        
        try:
            for i in range(self.config.warmup_samples):
                # Create dummy input based on model type
                dummy_input = self._create_dummy_input()
                await self.predict(dummy_input)
                
            logger.info(f"Model {self.config.model_id} warmed up successfully")
            
        except Exception as e:
            logger.error(f"Warmup failed for {self.config.model_id}: {str(e)}")
    
    def _create_dummy_input(self) -> Dict[str, Any]:
        """Create dummy input for warmup"""
        return {
            "text": "This is a sample input for model warmup.",
            "max_length": 50
        }
    
    def update_last_used(self):
        """Update last used timestamp"""
        self.last_used = time.time()


class ONNXModelEngine(BaseModelEngine):
    """ONNX Runtime model engine"""
    
    async def load_model(self) -> bool:
        """Load ONNX model"""
        try:
            self.status = ModelStatus.LOADING
            logger.info(f"Loading ONNX model: {self.config.model_id}")
            
            # Configure ONNX Runtime providers
            providers = []
            if self.config.backend == InferenceBackend.ONNX_GPU and ort.get_device() == 'GPU':
                providers.append('CUDAExecutionProvider')
            providers.append('CPUExecutionProvider')
            
            # Session options
            sess_options = ort.SessionOptions()
            sess_options.inter_op_num_threads = os.cpu_count()
            sess_options.intra_op_num_threads = os.cpu_count()
            
            # Load model
            self.model = ort.InferenceSession(
                self.config.model_path,
                sess_options=sess_options,
                providers=providers
            )
            
            # Load tokenizer if available
            tokenizer_path = Path(self.config.model_path).parent / "tokenizer"
            if tokenizer_path.exists():
                self.tokenizer = AutoTokenizer.from_pretrained(str(tokenizer_path))
            
            self.status = ModelStatus.READY
            logger.info(f"ONNX model loaded successfully: {self.config.model_id}")
            return True
            
        except Exception as e:
            self.status = ModelStatus.ERROR
            logger.error(f"Failed to load ONNX model {self.config.model_id}: {str(e)}")
            return False
    
    async def predict(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run ONNX inference"""
        start_time = time.time()
        
        try:
            self.update_last_used()
            
            # Prepare inputs
            if self.tokenizer and "text" in inputs:
                # Tokenize text input
                encoded = self.tokenizer(
                    inputs["text"],
                    padding=True,
                    truncation=True,
                    max_length=self.config.max_sequence_length,
                    return_tensors="np"
                )
                onnx_inputs = {
                    name: encoded[name] for name in self.model.get_inputs()[0].name
                }
            else:
                onnx_inputs = inputs
            
            # Run inference
            outputs = self.model.run(None, onnx_inputs)
            
            # Process outputs
            result = {
                "predictions": outputs[0].tolist() if isinstance(outputs[0], np.ndarray) else outputs[0],
                "model_id": self.config.model_id,
                "version": self.config.version,
                "inference_time": time.time() - start_time
            }
            
            self.metrics.record_request(time.time() - start_time)
            return result
            
        except Exception as e:
            self.metrics.record_request(time.time() - start_time, error=True)
            logger.error(f"ONNX inference failed for {self.config.model_id}: {str(e)}")
            raise
    
    async def unload_model(self):
        """Unload ONNX model"""
        self.model = None
        self.tokenizer = None
        self.status = ModelStatus.UNLOADED
        logger.info(f"ONNX model unloaded: {self.config.model_id}")


class TensorRTModelEngine(BaseModelEngine):
    """TensorRT model engine for GPU acceleration"""
    
    def __init__(self, config: ModelConfig):
        super().__init__(config)
        self.context = None
        self.engine = None
        self.stream = None
        self.bindings = []
        self.inputs = []
        self.outputs = []
    
    async def load_model(self) -> bool:
        """Load TensorRT model"""
        if not TENSORRT_AVAILABLE:
            logger.error("TensorRT not available")
            return False
        
        try:
            self.status = ModelStatus.LOADING
            logger.info(f"Loading TensorRT model: {self.config.model_id}")
            
            # Load TensorRT engine
            with open(self.config.model_path, 'rb') as f:
                runtime = trt.Runtime(trt.Logger(trt.Logger.WARNING))
                self.engine = runtime.deserialize_cuda_engine(f.read())
            
            # Create execution context
            self.context = self.engine.create_execution_context()
            
            # Create CUDA stream
            self.stream = cuda.Stream()
            
            # Allocate buffers
            self._allocate_buffers()
            
            # Load tokenizer if available
            tokenizer_path = Path(self.config.model_path).parent / "tokenizer"
            if tokenizer_path.exists():
                self.tokenizer = AutoTokenizer.from_pretrained(str(tokenizer_path))
            
            self.status = ModelStatus.READY
            logger.info(f"TensorRT model loaded successfully: {self.config.model_id}")
            return True
            
        except Exception as e:
            self.status = ModelStatus.ERROR
            logger.error(f"Failed to load TensorRT model {self.config.model_id}: {str(e)}")
            return False
    
    def _allocate_buffers(self):
        """Allocate GPU and CPU buffers"""
        self.inputs = []
        self.outputs = []
        self.bindings = []
        
        for binding in self.engine:
            size = trt.volume(self.engine.get_binding_shape(binding)) * self.engine.max_batch_size
            dtype = trt.nptype(self.engine.get_binding_dtype(binding))
            
            # Allocate host and device buffers
            host_mem = cuda.pagelocked_empty(size, dtype)
            device_mem = cuda.mem_alloc(host_mem.nbytes)
            
            self.bindings.append(int(device_mem))
            
            if self.engine.binding_is_input(binding):
                self.inputs.append({'host': host_mem, 'device': device_mem})
            else:
                self.outputs.append({'host': host_mem, 'device': device_mem})
    
    async def predict(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run TensorRT inference"""
        start_time = time.time()
        
        try:
            self.update_last_used()
            
            # Prepare inputs
            if self.tokenizer and "text" in inputs:
                encoded = self.tokenizer(
                    inputs["text"],
                    padding=True,
                    truncation=True,
                    max_length=self.config.max_sequence_length,
                    return_tensors="np"
                )
                input_data = encoded["input_ids"].astype(np.float32)
            else:
                input_data = np.array(inputs["input_data"], dtype=np.float32)
            
            # Copy input data to GPU
            np.copyto(self.inputs[0]['host'], input_data.ravel())
            cuda.memcpy_htod_async(self.inputs[0]['device'], self.inputs[0]['host'], self.stream)
            
            # Run inference
            self.context.execute_async_v2(bindings=self.bindings, stream_handle=self.stream.handle)
            
            # Copy output data from GPU
            cuda.memcpy_dtoh_async(self.outputs[0]['host'], self.outputs[0]['device'], self.stream)
            self.stream.synchronize()
            
            # Process outputs
            output_data = self.outputs[0]['host'].reshape(self.engine.get_binding_shape(1))
            
            result = {
                "predictions": output_data.tolist(),
                "model_id": self.config.model_id,
                "version": self.config.version,
                "inference_time": time.time() - start_time
            }
            
            self.metrics.record_request(time.time() - start_time)
            return result
            
        except Exception as e:
            self.metrics.record_request(time.time() - start_time, error=True)
            logger.error(f"TensorRT inference failed for {self.config.model_id}: {str(e)}")
            raise
    
    async def unload_model(self):
        """Unload TensorRT model"""
        if self.context:
            self.context.__del__()
        if self.engine:
            self.engine.__del__()
        
        self.context = None
        self.engine = None
        self.stream = None
        self.bindings = []
        self.inputs = []
        self.outputs = []
        self.tokenizer = None
        
        self.status = ModelStatus.UNLOADED
        logger.info(f"TensorRT model unloaded: {self.config.model_id}")


class PyTorchModelEngine(BaseModelEngine):
    """PyTorch model engine"""
    
    async def load_model(self) -> bool:
        """Load PyTorch model"""
        try:
            self.status = ModelStatus.LOADING
            logger.info(f"Loading PyTorch model: {self.config.model_id}")
            
            # Set device
            device = torch.device("cuda" if torch.cuda.is_available() and self.config.backend == InferenceBackend.CUDA else "cpu")
            
            # Load model
            if self.config.model_path.endswith('.pt') or self.config.model_path.endswith('.pth'):
                self.model = torch.load(self.config.model_path, map_location=device)
            else:
                # Load from HuggingFace
                self.model = AutoModel.from_pretrained(self.config.model_path)
                self.tokenizer = AutoTokenizer.from_pretrained(self.config.model_path)
            
            self.model.to(device)
            self.model.eval()
            
            # Set precision
            if self.config.precision == "fp16" and device.type == "cuda":
                self.model.half()
            
            self.status = ModelStatus.READY
            logger.info(f"PyTorch model loaded successfully: {self.config.model_id}")
            return True
            
        except Exception as e:
            self.status = ModelStatus.ERROR
            logger.error(f"Failed to load PyTorch model {self.config.model_id}: {str(e)}")
            return False
    
    async def predict(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run PyTorch inference"""
        start_time = time.time()
        
        try:
            self.update_last_used()
            
            with torch.no_grad():
                # Prepare inputs
                if self.tokenizer and "text" in inputs:
                    encoded = self.tokenizer(
                        inputs["text"],
                        padding=True,
                        truncation=True,
                        max_length=self.config.max_sequence_length,
                        return_tensors="pt"
                    )
                    
                    # Move to device
                    device = next(self.model.parameters()).device
                    encoded = {k: v.to(device) for k, v in encoded.items()}
                    
                    # Run inference
                    outputs = self.model(**encoded)
                    
                    if hasattr(outputs, 'logits'):
                        predictions = outputs.logits.cpu().numpy()
                    else:
                        predictions = outputs.cpu().numpy()
                else:
                    # Direct tensor input
                    input_tensor = torch.tensor(inputs["input_data"])
                    device = next(self.model.parameters()).device
                    input_tensor = input_tensor.to(device)
                    
                    outputs = self.model(input_tensor)
                    predictions = outputs.cpu().numpy()
                
                result = {
                    "predictions": predictions.tolist(),
                    "model_id": self.config.model_id,
                    "version": self.config.version,
                    "inference_time": time.time() - start_time
                }
                
                self.metrics.record_request(time.time() - start_time)
                return result
                
        except Exception as e:
            self.metrics.record_request(time.time() - start_time, error=True)
            logger.error(f"PyTorch inference failed for {self.config.model_id}: {str(e)}")
            raise
    
    async def unload_model(self):
        """Unload PyTorch model"""
        del self.model
        self.model = None
        self.tokenizer = None
        
        # Clear GPU cache
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        self.status = ModelStatus.UNLOADED
        logger.info(f"PyTorch model unloaded: {self.config.model_id}")


class HuggingFaceModelEngine(BaseModelEngine):
    """HuggingFace transformers model engine"""
    
    async def load_model(self) -> bool:
        """Load HuggingFace model"""
        try:
            self.status = ModelStatus.LOADING
            logger.info(f"Loading HuggingFace model: {self.config.model_id}")
            
            # Determine task based on model metadata
            task = self.config.metadata.get("task", "text-classification") if self.config.metadata else "text-classification"
            
            # Set device
            device = 0 if torch.cuda.is_available() and self.config.backend == InferenceBackend.CUDA else -1
            
            # Create pipeline
            self.model = pipeline(
                task=task,
                model=self.config.model_path,
                device=device,
                torch_dtype=torch.float16 if self.config.precision == "fp16" else torch.float32
            )
            
            self.status = ModelStatus.READY
            logger.info(f"HuggingFace model loaded successfully: {self.config.model_id}")
            return True
            
        except Exception as e:
            self.status = ModelStatus.ERROR
            logger.error(f"Failed to load HuggingFace model {self.config.model_id}: {str(e)}")
            return False
    
    async def predict(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run HuggingFace inference"""
        start_time = time.time()
        
        try:
            self.update_last_used()
            
            # Run inference
            text_input = inputs.get("text", inputs.get("input_text", ""))
            outputs = self.model(text_input)
            
            result = {
                "predictions": outputs,
                "model_id": self.config.model_id,
                "version": self.config.version,
                "inference_time": time.time() - start_time
            }
            
            self.metrics.record_request(time.time() - start_time)
            return result
            
        except Exception as e:
            self.metrics.record_request(time.time() - start_time, error=True)
            logger.error(f"HuggingFace inference failed for {self.config.model_id}: {str(e)}")
            raise
    
    async def unload_model(self):
        """Unload HuggingFace model"""
        del self.model
        self.model = None
        
        # Clear GPU cache
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        self.status = ModelStatus.UNLOADED
        logger.info(f"HuggingFace model unloaded: {self.config.model_id}")


class ModelCache:
    """Redis-based model output cache"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis_client = None
    
    async def initialize(self):
        """Initialize Redis connection"""
        self.redis_client = await redis.from_url(self.redis_url)
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
    
    def _generate_cache_key(self, model_id: str, inputs: Dict[str, Any]) -> str:
        """Generate cache key from model ID and inputs"""
        input_str = json.dumps(inputs, sort_keys=True)
        input_hash = hashlib.md5(input_str.encode()).hexdigest()
        return f"model_cache:{model_id}:{input_hash}"
    
    async def get(self, model_id: str, inputs: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get cached result"""
        if not self.redis_client:
            return None
        
        try:
            cache_key = self._generate_cache_key(model_id, inputs)
            cached_result = await self.redis_client.get(cache_key)
            
            if cached_result:
                return json.loads(cached_result)
            
            return None
            
        except Exception as e:
            logger.error(f"Cache get error: {str(e)}")
            return None
    
    async def set(self, model_id: str, inputs: Dict[str, Any], result: Dict[str, Any], ttl: int = 3600):
        """Cache result"""
        if not self.redis_client:
            return
        
        try:
            cache_key = self._generate_cache_key(model_id, inputs)
            await self.redis_client.setex(
                cache_key,
                ttl,
                json.dumps(result)
            )
            
        except Exception as e:
            logger.error(f"Cache set error: {str(e)}")


class ModelServer:
    """Main model server orchestrating all models"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.models: Dict[str, BaseModelEngine] = {}
        self.cache = ModelCache(redis_url)
        self.executor = ThreadPoolExecutor(max_workers=4)
        self._cleanup_task = None
    
    async def initialize(self):
        """Initialize model server"""
        await self.cache.initialize()
        self._start_cleanup_task()
        logger.info("Model server initialized")
    
    async def shutdown(self):
        """Shutdown model server"""
        # Cancel cleanup task
        if self._cleanup_task:
            self._cleanup_task.cancel()
        
        # Unload all models
        for model_engine in self.models.values():
            await model_engine.unload_model()
        
        # Shutdown executor
        self.executor.shutdown(wait=True)
        
        # Close cache
        await self.cache.close()
        
        logger.info("Model server shutdown complete")
    
    def _start_cleanup_task(self):
        """Start background cleanup task"""
        self._cleanup_task = asyncio.create_task(self._cleanup_unused_models())
    
    async def _cleanup_unused_models(self):
        """Clean up unused models periodically"""
        while True:
            try:
                await asyncio.sleep(300)  # Check every 5 minutes
                
                current_time = time.time()
                models_to_remove = []
                
                for model_id, engine in self.models.items():
                    # Unload models unused for 30 minutes
                    if current_time - engine.last_used > 1800:
                        models_to_remove.append(model_id)
                
                for model_id in models_to_remove:
                    logger.info(f"Unloading unused model: {model_id}")
                    await self.unload_model(model_id)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cleanup task error: {str(e)}")
    
    async def load_model(self, config: ModelConfig) -> bool:
        """Load a model"""
        try:
            logger.info(f"Loading model: {config.model_id}")
            
            # Create appropriate engine
            if config.model_type == ModelType.ONNX:
                engine = ONNXModelEngine(config)
            elif config.model_type == ModelType.TENSORRT:
                engine = TensorRTModelEngine(config)
            elif config.model_type == ModelType.PYTORCH:
                engine = PyTorchModelEngine(config)
            elif config.model_type == ModelType.HUGGINGFACE:
                engine = HuggingFaceModelEngine(config)
            else:
                raise ValueError(f"Unsupported model type: {config.model_type}")
            
            # Load model in executor to avoid blocking
            success = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: asyncio.run(engine.load_model())
            )
            
            if success:
                self.models[config.model_id] = engine
                await engine.warmup()
                logger.info(f"Model loaded successfully: {config.model_id}")
                return True
            else:
                logger.error(f"Failed to load model: {config.model_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error loading model {config.model_id}: {str(e)}")
            return False
    
    async def unload_model(self, model_id: str) -> bool:
        """Unload a model"""
        try:
            if model_id in self.models:
                engine = self.models[model_id]
                await engine.unload_model()
                del self.models[model_id]
                logger.info(f"Model unloaded: {model_id}")
                return True
            else:
                logger.warning(f"Model not found: {model_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error unloading model {model_id}: {str(e)}")
            return False
    
    async def predict(self, model_id: str, inputs: Dict[str, Any], use_cache: bool = True) -> Dict[str, Any]:
        """Run inference"""
        try:
            # Check if model is loaded
            if model_id not in self.models:
                raise ValueError(f"Model not loaded: {model_id}")
            
            engine = self.models[model_id]
            
            # Check cache first
            if use_cache:
                cached_result = await self.cache.get(model_id, inputs)
                if cached_result:
                    engine.metrics.record_request(0.001, cache_hit=True)  # Minimal latency for cache hit
                    cached_result["from_cache"] = True
                    return cached_result
            
            # Run inference
            result = await engine.predict(inputs)
            
            # Cache result
            if use_cache:
                await self.cache.set(model_id, inputs, result, engine.config.cache_ttl)
            
            result["from_cache"] = False
            return result
            
        except Exception as e:
            logger.error(f"Prediction error for model {model_id}: {str(e)}")
            raise
    
    def get_model_status(self, model_id: str) -> Dict[str, Any]:
        """Get model status and metrics"""
        if model_id not in self.models:
            return {"status": "not_loaded"}
        
        engine = self.models[model_id]
        metrics = engine.metrics
        
        return {
            "model_id": model_id,
            "status": engine.status.value,
            "version": engine.config.version,
            "backend": engine.config.backend.value,
            "last_used": engine.last_used,
            "metrics": {
                "request_count": metrics.request_count,
                "average_latency": metrics.average_latency,
                "error_rate": metrics.error_rate,
                "cache_hit_rate": metrics.cache_hit_rate,
                "throughput_rps": metrics.throughput_rps
            }
        }
    
    def get_all_models_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status for all loaded models"""
        return {
            model_id: self.get_model_status(model_id)
            for model_id in self.models.keys()
        }


# Global model server instance
model_server = ModelServer()
