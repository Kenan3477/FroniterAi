"""
Model Format Conversion Utilities

Scripts for converting models between different formats (PyTorch, ONNX, TensorRT)
with optimization and validation capabilities.
"""

import os
import json
import logging
import tempfile
import warnings
import time
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, asdict
from enum import Enum

import torch
import torch.nn as nn
import torch.onnx
import numpy as np

# Optional imports (will be imported as needed)
try:
    import onnx
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False

try:
    import tensorrt as trt
    import pycuda.driver as cuda
    import pycuda.autoinit
    TENSORRT_AVAILABLE = True
except ImportError:
    TENSORRT_AVAILABLE = False

try:
    import onnx_tf
    import tensorflow as tf
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

class ModelFormat(Enum):
    """Supported model formats"""
    PYTORCH = "pytorch"
    ONNX = "onnx"
    TENSORRT = "tensorrt"
    TENSORFLOW = "tensorflow"
    COREML = "coreml"
    OPENVINO = "openvino"

class OptimizationLevel(Enum):
    """Optimization levels for model conversion"""
    NONE = "none"
    BASIC = "basic"
    AGGRESSIVE = "aggressive"
    MAX_PERFORMANCE = "max_performance"

@dataclass
class ConversionConfig:
    """Configuration for model conversion"""
    # Basic settings
    source_format: ModelFormat
    target_format: ModelFormat
    model_path: str
    output_path: str
    
    # Optimization settings
    optimization_level: OptimizationLevel = OptimizationLevel.BASIC
    precision: str = "fp32"  # fp32, fp16, int8
    batch_size: int = 1
    
    # Input specifications
    input_shapes: Dict[str, Tuple[int, ...]] = None
    input_names: List[str] = None
    output_names: List[str] = None
    
    # ONNX specific
    onnx_opset_version: int = 11
    dynamic_axes: Dict[str, Dict[int, str]] = None
    
    # TensorRT specific
    max_workspace_size: int = 1 << 30  # 1GB
    max_batch_size: int = 32
    min_shape: Dict[str, Tuple[int, ...]] = None
    opt_shape: Dict[str, Tuple[int, ...]] = None
    max_shape: Dict[str, Tuple[int, ...]] = None
    
    # Validation settings
    validate_conversion: bool = True
    tolerance: float = 1e-5
    num_test_samples: int = 100
    
    def __post_init__(self):
        if self.input_shapes is None:
            self.input_shapes = {}
        if self.input_names is None:
            self.input_names = []
        if self.output_names is None:
            self.output_names = []
        if self.dynamic_axes is None:
            self.dynamic_axes = {}
        if self.min_shape is None:
            self.min_shape = {}
        if self.opt_shape is None:
            self.opt_shape = {}
        if self.max_shape is None:
            self.max_shape = {}

@dataclass
class ConversionResult:
    """Result of model conversion"""
    success: bool
    output_path: str
    source_format: str
    target_format: str
    file_size_mb: float
    conversion_time_seconds: float
    validation_passed: bool = False
    validation_error: Optional[float] = None
    optimization_applied: str = ""
    metadata: Dict[str, Any] = None
    warnings: List[str] = None
    error_message: Optional[str] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
        if self.warnings is None:
            self.warnings = []

class ModelConverter:
    """
    Universal model format converter supporting multiple deep learning frameworks
    """
    
    def __init__(self, cache_dir: str = "./conversion_cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.logger = logging.getLogger(__name__)
        
        # Check available backends
        self._check_available_backends()
        
        # Conversion registry
        self._converters = {
            (ModelFormat.PYTORCH, ModelFormat.ONNX): self._pytorch_to_onnx,
            (ModelFormat.PYTORCH, ModelFormat.TENSORRT): self._pytorch_to_tensorrt,
            (ModelFormat.ONNX, ModelFormat.TENSORRT): self._onnx_to_tensorrt,
            (ModelFormat.ONNX, ModelFormat.PYTORCH): self._onnx_to_pytorch,
            (ModelFormat.ONNX, ModelFormat.TENSORFLOW): self._onnx_to_tensorflow,
        }
    
    def convert_model(self, config: ConversionConfig) -> ConversionResult:
        """
        Convert model from one format to another
        
        Args:
            config: Conversion configuration
        
        Returns:
            ConversionResult with conversion details
        """
        self.logger.info(f"Converting {config.source_format.value} to {config.target_format.value}")
        
        start_time = time.time()
        result = ConversionResult(
            success=False,
            output_path="",
            source_format=config.source_format.value,
            target_format=config.target_format.value,
            file_size_mb=0.0,
            conversion_time_seconds=0.0
        )
        
        try:
            # Check if conversion is supported
            converter_key = (config.source_format, config.target_format)
            if converter_key not in self._converters:
                raise ValueError(f"Conversion from {config.source_format.value} to {config.target_format.value} not supported")
            
            # Check backend availability
            self._validate_backend_availability(config)
            
            # Perform conversion
            converter_func = self._converters[converter_key]
            output_path = converter_func(config)
            
            # Calculate file size
            file_size = os.path.getsize(output_path) / (1024 * 1024)  # MB
            
            # Validate conversion if requested
            validation_passed = False
            validation_error = None
            
            if config.validate_conversion:
                validation_passed, validation_error = self._validate_conversion(config, output_path)
            
            # Update result
            result.success = True
            result.output_path = output_path
            result.file_size_mb = file_size
            result.conversion_time_seconds = time.time() - start_time
            result.validation_passed = validation_passed
            result.validation_error = validation_error
            result.optimization_applied = config.optimization_level.value
            
            self.logger.info(f"Conversion completed successfully: {output_path}")
            
        except Exception as e:
            result.error_message = str(e)
            result.conversion_time_seconds = time.time() - start_time
            self.logger.error(f"Conversion failed: {e}")
        
        return result
    
    def batch_convert(
        self,
        configs: List[ConversionConfig]
    ) -> List[ConversionResult]:
        """Convert multiple models"""
        results = []
        
        for config in configs:
            result = self.convert_model(config)
            results.append(result)
        
        return results
    
    def optimize_for_inference(
        self,
        model_path: str,
        target_format: ModelFormat,
        optimization_config: Dict[str, Any]
    ) -> ConversionResult:
        """Optimize model specifically for inference"""
        # Determine source format
        source_format = self._detect_model_format(model_path)
        
        # Create optimization-focused conversion config
        config = ConversionConfig(
            source_format=source_format,
            target_format=target_format,
            model_path=model_path,
            output_path=optimization_config.get("output_path", model_path.replace(
                f".{source_format.value}", f"_optimized.{target_format.value}"
            )),
            optimization_level=OptimizationLevel.MAX_PERFORMANCE,
            precision=optimization_config.get("precision", "fp16"),
            batch_size=optimization_config.get("batch_size", 1),
            **optimization_config
        )
        
        return self.convert_model(config)
    
    def _pytorch_to_onnx(self, config: ConversionConfig) -> str:
        """Convert PyTorch model to ONNX"""
        if not ONNX_AVAILABLE:
            raise ImportError("ONNX not available. Install with: pip install onnx onnxruntime")
        
        # Load PyTorch model
        model = torch.load(config.model_path, map_location='cpu')
        model.eval()
        
        # Prepare dummy input
        dummy_input = self._create_dummy_input(config)
        
        # Set output path
        output_path = config.output_path
        if not output_path.endswith('.onnx'):
            output_path += '.onnx'
        
        # Export to ONNX
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            
            torch.onnx.export(
                model,
                dummy_input,
                output_path,
                export_params=True,
                opset_version=config.onnx_opset_version,
                do_constant_folding=True,
                input_names=config.input_names or ['input'],
                output_names=config.output_names or ['output'],
                dynamic_axes=config.dynamic_axes
            )
        
        # Optimize ONNX model if requested
        if config.optimization_level != OptimizationLevel.NONE:
            self._optimize_onnx_model(output_path, config)
        
        return output_path
    
    def _pytorch_to_tensorrt(self, config: ConversionConfig) -> str:
        """Convert PyTorch model to TensorRT (via ONNX)"""
        if not TENSORRT_AVAILABLE:
            raise ImportError("TensorRT not available")
        
        # First convert to ONNX
        onnx_config = ConversionConfig(
            source_format=config.source_format,
            target_format=ModelFormat.ONNX,
            model_path=config.model_path,
            output_path=config.output_path.replace('.trt', '.onnx'),
            input_shapes=config.input_shapes,
            input_names=config.input_names,
            output_names=config.output_names,
            onnx_opset_version=config.onnx_opset_version,
            dynamic_axes=config.dynamic_axes
        )
        
        onnx_path = self._pytorch_to_onnx(onnx_config)
        
        # Then convert ONNX to TensorRT
        tensorrt_config = ConversionConfig(
            source_format=ModelFormat.ONNX,
            target_format=ModelFormat.TENSORRT,
            model_path=onnx_path,
            output_path=config.output_path,
            optimization_level=config.optimization_level,
            precision=config.precision,
            batch_size=config.batch_size,
            max_workspace_size=config.max_workspace_size,
            max_batch_size=config.max_batch_size,
            min_shape=config.min_shape,
            opt_shape=config.opt_shape,
            max_shape=config.max_shape
        )
        
        return self._onnx_to_tensorrt(tensorrt_config)
    
    def _onnx_to_tensorrt(self, config: ConversionConfig) -> str:
        """Convert ONNX model to TensorRT"""
        if not TENSORRT_AVAILABLE:
            raise ImportError("TensorRT not available")
        
        # Load ONNX model
        onnx_model = onnx.load(config.model_path)
        
        # Create TensorRT logger and builder
        TRT_LOGGER = trt.Logger(trt.Logger.WARNING)
        builder = trt.Builder(TRT_LOGGER)
        
        # Create network and parser
        network = builder.create_network(1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH))
        parser = trt.OnnxParser(network, TRT_LOGGER)
        
        # Parse ONNX model
        with open(config.model_path, 'rb') as model_file:
            if not parser.parse(model_file.read()):
                for error in range(parser.num_errors):
                    self.logger.error(f"ONNX parsing error: {parser.get_error(error)}")
                raise RuntimeError("Failed to parse ONNX model")
        
        # Configure builder
        builder_config = builder.create_builder_config()
        builder_config.max_workspace_size = config.max_workspace_size
        
        # Set precision
        if config.precision == "fp16":
            builder_config.set_flag(trt.BuilderFlag.FP16)
        elif config.precision == "int8":
            builder_config.set_flag(trt.BuilderFlag.INT8)
            # Note: INT8 calibration would be needed here for production
        
        # Set optimization profiles for dynamic shapes
        if config.min_shape or config.opt_shape or config.max_shape:
            profile = builder.create_optimization_profile()
            
            for input_name in config.input_names or ['input']:
                min_shape = config.min_shape.get(input_name, (1, 3, 224, 224))
                opt_shape = config.opt_shape.get(input_name, (1, 3, 224, 224))
                max_shape = config.max_shape.get(input_name, (config.max_batch_size, 3, 224, 224))
                
                profile.set_shape(input_name, min_shape, opt_shape, max_shape)
            
            builder_config.add_optimization_profile(profile)
        
        # Build engine
        engine = builder.build_engine(network, builder_config)
        if engine is None:
            raise RuntimeError("Failed to build TensorRT engine")
        
        # Serialize and save engine
        output_path = config.output_path
        if not output_path.endswith('.trt'):
            output_path += '.trt'
        
        with open(output_path, 'wb') as f:
            f.write(engine.serialize())
        
        return output_path
    
    def _onnx_to_pytorch(self, config: ConversionConfig) -> str:
        """Convert ONNX model to PyTorch (basic conversion)"""
        if not ONNX_AVAILABLE:
            raise ImportError("ONNX not available")
        
        # Load ONNX model
        onnx_model = onnx.load(config.model_path)
        
        # This is a simplified conversion - in practice, you'd need
        # a more sophisticated ONNX to PyTorch converter
        # For now, we'll create a wrapper that runs ONNX inference
        
        class ONNXWrapper(nn.Module):
            def __init__(self, onnx_path):
                super().__init__()
                self.onnx_session = ort.InferenceSession(onnx_path)
                
            def forward(self, x):
                # Convert to numpy
                if isinstance(x, torch.Tensor):
                    x_np = x.detach().cpu().numpy()
                else:
                    x_np = x
                
                # Run ONNX inference
                input_name = self.onnx_session.get_inputs()[0].name
                outputs = self.onnx_session.run(None, {input_name: x_np})
                
                # Convert back to torch
                return torch.from_numpy(outputs[0])
        
        # Create wrapper model
        wrapper_model = ONNXWrapper(config.model_path)
        
        # Save PyTorch model
        output_path = config.output_path
        if not output_path.endswith('.pth'):
            output_path += '.pth'
        
        torch.save(wrapper_model.state_dict(), output_path)
        
        return output_path
    
    def _onnx_to_tensorflow(self, config: ConversionConfig) -> str:
        """Convert ONNX model to TensorFlow"""
        if not TF_AVAILABLE:
            raise ImportError("TensorFlow and onnx-tf not available")
        
        # Load ONNX model
        onnx_model = onnx.load(config.model_path)
        
        # Convert to TensorFlow
        tf_rep = onnx_tf.backend.prepare(onnx_model)
        
        # Export to SavedModel format
        output_path = config.output_path
        if not output_path.endswith('.pb'):
            output_path = output_path.replace('.tf', '') + '_savedmodel'
        
        tf_rep.export_graph(output_path)
        
        return output_path
    
    def _optimize_onnx_model(self, model_path: str, config: ConversionConfig):
        """Optimize ONNX model"""
        if not ONNX_AVAILABLE:
            return
        
        # Load model
        model = onnx.load(model_path)
        
        # Apply optimizations based on level
        if config.optimization_level == OptimizationLevel.BASIC:
            # Basic optimizations
            from onnx import optimizer
            optimized_model = optimizer.optimize(model, passes=[
                'eliminate_deadend',
                'eliminate_identity',
                'eliminate_nop_dropout',
                'eliminate_nop_transpose',
                'fuse_consecutive_transposes',
                'fuse_transpose_into_gemm'
            ])
        
        elif config.optimization_level in [OptimizationLevel.AGGRESSIVE, OptimizationLevel.MAX_PERFORMANCE]:
            # More aggressive optimizations
            from onnx import optimizer
            optimized_model = optimizer.optimize(model, passes=[
                'eliminate_deadend',
                'eliminate_identity',
                'eliminate_nop_dropout',
                'eliminate_nop_transpose',
                'eliminate_unused_initializer',
                'extract_constant_to_initializer',
                'fuse_add_bias_into_conv',
                'fuse_bn_into_conv',
                'fuse_consecutive_concats',
                'fuse_consecutive_log_softmax',
                'fuse_consecutive_reduce_unsqueeze',
                'fuse_consecutive_squeezes',
                'fuse_consecutive_transposes',
                'fuse_matmul_add_bias_into_gemm',
                'fuse_pad_into_conv',
                'fuse_transpose_into_gemm'
            ])
        else:
            optimized_model = model
        
        # Save optimized model
        onnx.save(optimized_model, model_path)
    
    def _validate_conversion(
        self,
        config: ConversionConfig,
        converted_model_path: str
    ) -> Tuple[bool, Optional[float]]:
        """Validate that conversion preserved model behavior"""
        try:
            # Generate test data
            test_inputs = self._generate_test_data(config)
            
            # Get outputs from original model
            original_outputs = self._run_inference(
                config.model_path, test_inputs, config.source_format
            )
            
            # Get outputs from converted model
            converted_outputs = self._run_inference(
                converted_model_path, test_inputs, config.target_format
            )
            
            # Compare outputs
            max_error = 0.0
            for orig, conv in zip(original_outputs, converted_outputs):
                error = np.max(np.abs(orig - conv))
                max_error = max(max_error, error)
            
            # Check if within tolerance
            passed = max_error <= config.tolerance
            
            return passed, max_error
            
        except Exception as e:
            self.logger.error(f"Validation failed: {e}")
            return False, None
    
    def _run_inference(
        self,
        model_path: str,
        inputs: List[np.ndarray],
        model_format: ModelFormat
    ) -> List[np.ndarray]:
        """Run inference on a model"""
        if model_format == ModelFormat.PYTORCH:
            model = torch.load(model_path, map_location='cpu')
            model.eval()
            
            outputs = []
            for inp in inputs:
                with torch.no_grad():
                    torch_input = torch.FloatTensor(inp)
                    output = model(torch_input)
                    outputs.append(output.numpy())
            
            return outputs
        
        elif model_format == ModelFormat.ONNX:
            if not ONNX_AVAILABLE:
                raise ImportError("ONNX runtime not available")
            
            session = ort.InferenceSession(model_path)
            input_name = session.get_inputs()[0].name
            
            outputs = []
            for inp in inputs:
                result = session.run(None, {input_name: inp})
                outputs.append(result[0])
            
            return outputs
        
        elif model_format == ModelFormat.TENSORRT:
            if not TENSORRT_AVAILABLE:
                raise ImportError("TensorRT not available")
            
            # Load TensorRT engine
            with open(model_path, 'rb') as f:
                engine_data = f.read()
            
            runtime = trt.Runtime(trt.Logger(trt.Logger.WARNING))
            engine = runtime.deserialize_cuda_engine(engine_data)
            context = engine.create_execution_context()
            
            outputs = []
            for inp in inputs:
                # Allocate GPU memory and run inference
                # This is simplified - real implementation would need proper memory management
                output = self._run_tensorrt_inference(context, inp)
                outputs.append(output)
            
            return outputs
        
        else:
            raise ValueError(f"Inference not implemented for format: {model_format}")
    
    def _generate_test_data(self, config: ConversionConfig) -> List[np.ndarray]:
        """Generate test data for validation"""
        test_data = []
        
        # Use specified input shapes or default
        if config.input_shapes:
            for shape in config.input_shapes.values():
                test_data.append(np.random.randn(config.num_test_samples, *shape[1:]).astype(np.float32))
        else:
            # Default shape for testing
            test_data.append(np.random.randn(config.num_test_samples, 3, 224, 224).astype(np.float32))
        
        return test_data
    
    def _create_dummy_input(self, config: ConversionConfig) -> torch.Tensor:
        """Create dummy input for model export"""
        if config.input_shapes:
            # Use first input shape
            shape = list(config.input_shapes.values())[0]
            return torch.randn(shape)
        else:
            # Default shape
            return torch.randn(config.batch_size, 3, 224, 224)
    
    def _detect_model_format(self, model_path: str) -> ModelFormat:
        """Detect model format from file extension"""
        path = Path(model_path)
        ext = path.suffix.lower()
        
        if ext in ['.pth', '.pt']:
            return ModelFormat.PYTORCH
        elif ext == '.onnx':
            return ModelFormat.ONNX
        elif ext in ['.trt', '.engine']:
            return ModelFormat.TENSORRT
        elif ext == '.pb':
            return ModelFormat.TENSORFLOW
        else:
            raise ValueError(f"Unknown model format for file: {model_path}")
    
    def _check_available_backends(self):
        """Check which backends are available"""
        self.available_backends = {
            'onnx': ONNX_AVAILABLE,
            'tensorrt': TENSORRT_AVAILABLE,
            'tensorflow': TF_AVAILABLE
        }
        
        self.logger.info(f"Available backends: {self.available_backends}")
    
    def _validate_backend_availability(self, config: ConversionConfig):
        """Validate that required backends are available"""
        if config.target_format == ModelFormat.ONNX and not ONNX_AVAILABLE:
            raise ImportError("ONNX not available. Install with: pip install onnx onnxruntime")
        
        if config.target_format == ModelFormat.TENSORRT and not TENSORRT_AVAILABLE:
            raise ImportError("TensorRT not available. Please install TensorRT.")
        
        if config.target_format == ModelFormat.TENSORFLOW and not TF_AVAILABLE:
            raise ImportError("TensorFlow not available. Install with: pip install tensorflow onnx-tf")
    
    def get_supported_conversions(self) -> List[Tuple[str, str]]:
        """Get list of supported conversions"""
        supported = []
        for (source, target) in self._converters.keys():
            supported.append((source.value, target.value))
        return supported
    
    def get_conversion_info(self, source: str, target: str) -> Dict[str, Any]:
        """Get information about a specific conversion"""
        source_format = ModelFormat(source)
        target_format = ModelFormat(target)
        
        info = {
            "supported": (source_format, target_format) in self._converters,
            "requires_backends": [],
            "typical_speedup": "Unknown",
            "typical_accuracy_loss": "Unknown"
        }
        
        # Add backend requirements
        if target_format == ModelFormat.ONNX:
            info["requires_backends"].append("onnx")
        elif target_format == ModelFormat.TENSORRT:
            info["requires_backends"].extend(["onnx", "tensorrt"])
        elif target_format == ModelFormat.TENSORFLOW:
            info["requires_backends"].extend(["onnx", "tensorflow", "onnx-tf"])
        
        # Add typical performance characteristics
        if target_format == ModelFormat.TENSORRT:
            info["typical_speedup"] = "2-5x faster inference"
            info["typical_accuracy_loss"] = "< 1% for FP16, varies for INT8"
        elif target_format == ModelFormat.ONNX:
            info["typical_speedup"] = "10-30% faster"
            info["typical_accuracy_loss"] = "Minimal (< 0.1%)"
        
        return info


# Utility functions
def create_optimization_pipeline(
    model_path: str,
    target_formats: List[str],
    optimization_configs: Dict[str, Any]
) -> List[ConversionResult]:
    """
    Create an optimization pipeline for multiple target formats
    """
    converter = ModelConverter()
    results = []
    
    for target_format in target_formats:
        try:
            result = converter.optimize_for_inference(
                model_path=model_path,
                target_format=ModelFormat(target_format),
                optimization_config=optimization_configs.get(target_format, {})
            )
            results.append(result)
        except Exception as e:
            logging.error(f"Failed to optimize for {target_format}: {e}")
    
    return results


def benchmark_conversion_formats(
    model_path: str,
    test_data: np.ndarray,
    formats_to_test: List[str]
) -> Dict[str, Dict[str, Any]]:
    """
    Benchmark different model formats for performance comparison
    """
    converter = ModelConverter()
    results = {}
    
    # Convert to each format
    converted_models = {}
    for format_name in formats_to_test:
        try:
            config = ConversionConfig(
                source_format=converter._detect_model_format(model_path),
                target_format=ModelFormat(format_name),
                model_path=model_path,
                output_path=f"{model_path}_{format_name}",
                optimization_level=OptimizationLevel.MAX_PERFORMANCE
            )
            
            result = converter.convert_model(config)
            if result.success:
                converted_models[format_name] = result.output_path
        except Exception as e:
            logging.error(f"Failed to convert to {format_name}: {e}")
    
    # Benchmark each format
    for format_name, model_path in converted_models.items():
        try:
            # Measure inference time
            import time
            start_time = time.time()
            
            outputs = converter._run_inference(
                model_path, [test_data], ModelFormat(format_name)
            )
            
            inference_time = time.time() - start_time
            file_size = os.path.getsize(model_path) / (1024 * 1024)  # MB
            
            results[format_name] = {
                "inference_time_ms": inference_time * 1000,
                "file_size_mb": file_size,
                "throughput_samples_per_second": len(test_data) / inference_time
            }
            
        except Exception as e:
            logging.error(f"Failed to benchmark {format_name}: {e}")
            results[format_name] = {"error": str(e)}
    
    return results
