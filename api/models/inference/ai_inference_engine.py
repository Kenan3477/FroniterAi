"""
AI Model Inference Engine

High-performance inference engine that orchestrates model serving,
versioning, monitoring, and provides the main API interface for AI models.
"""

import asyncio
import json
import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

from fastapi import HTTPException
from pydantic import BaseModel, Field

from ..serving.model_server import (
    ModelConfig, ModelType, InferenceBackend, model_server
)
from ..serving.model_versioning import (
    experiment_manager, version_manager, ModelVariant, Experiment, ExperimentStatus
)
from ..monitoring.model_monitor import model_monitor

logger = logging.getLogger(__name__)


class TaskType(str, Enum):
    """Supported AI task types"""
    TEXT_CLASSIFICATION = "text_classification"
    SENTIMENT_ANALYSIS = "sentiment_analysis"
    NAMED_ENTITY_RECOGNITION = "ner"
    TEXT_GENERATION = "text_generation"
    SUMMARIZATION = "summarization"
    QUESTION_ANSWERING = "question_answering"
    FINANCIAL_ANALYSIS = "financial_analysis"
    RISK_ASSESSMENT = "risk_assessment"
    MARKET_PREDICTION = "market_prediction"
    DOCUMENT_PROCESSING = "document_processing"


# Request/Response Models
class InferenceRequest(BaseModel):
    """Inference request model"""
    task_type: TaskType
    input_data: Dict[str, Any]
    model_id: Optional[str] = None
    version: Optional[str] = None
    experiment_id: Optional[str] = None
    user_id: Optional[str] = None
    use_cache: bool = True
    parameters: Dict[str, Any] = Field(default_factory=dict)


class InferenceResponse(BaseModel):
    """Inference response model"""
    request_id: str
    task_type: TaskType
    predictions: Any
    model_id: str
    version: str
    confidence: Optional[float] = None
    inference_time: float
    from_cache: bool = False
    experiment_id: Optional[str] = None
    variant_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BatchInferenceRequest(BaseModel):
    """Batch inference request"""
    task_type: TaskType
    batch_data: List[Dict[str, Any]]
    model_id: Optional[str] = None
    version: Optional[str] = None
    batch_size: int = 32
    parameters: Dict[str, Any] = Field(default_factory=dict)


class BatchInferenceResponse(BaseModel):
    """Batch inference response"""
    request_id: str
    task_type: TaskType
    results: List[InferenceResponse]
    total_items: int
    successful_items: int
    failed_items: int
    batch_inference_time: float


class ModelDeploymentRequest(BaseModel):
    """Model deployment request"""
    model_id: str
    model_type: ModelType
    model_path: str
    version: str = "1.0.0"
    backend: InferenceBackend = InferenceBackend.CPU
    max_batch_size: int = 32
    cache_ttl: int = 3600
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ExperimentRequest(BaseModel):
    """A/B test experiment request"""
    name: str
    description: str
    variants: List[Dict[str, Any]]  # Will be converted to ModelVariant
    target_metric: str = "accuracy"
    duration_hours: int = 24
    success_criteria: Dict[str, Any] = Field(default_factory=dict)


@dataclass
class ModelRegistry:
    """Registry of available models for different tasks"""
    
    def __init__(self):
        self.task_models = {
            TaskType.FINANCIAL_ANALYSIS: [
                "financial-bert-v1",
                "financial-roberta-v2"
            ],
            TaskType.SENTIMENT_ANALYSIS: [
                "sentiment-bert-v1",
                "sentiment-distilbert-v1"
            ],
            TaskType.TEXT_CLASSIFICATION: [
                "classifier-bert-v1",
                "classifier-roberta-v1"
            ],
            TaskType.RISK_ASSESSMENT: [
                "risk-assessment-v1",
                "risk-neural-v2"
            ],
            TaskType.MARKET_PREDICTION: [
                "market-lstm-v1",
                "market-transformer-v1"
            ]
        }
        
        self.default_models = {
            TaskType.FINANCIAL_ANALYSIS: "financial-bert-v1",
            TaskType.SENTIMENT_ANALYSIS: "sentiment-bert-v1",
            TaskType.TEXT_CLASSIFICATION: "classifier-bert-v1",
            TaskType.RISK_ASSESSMENT: "risk-assessment-v1",
            TaskType.MARKET_PREDICTION: "market-lstm-v1"
        }
    
    def get_default_model(self, task_type: TaskType) -> str:
        """Get default model for a task type"""
        return self.default_models.get(task_type, "default-model")
    
    def get_available_models(self, task_type: TaskType) -> List[str]:
        """Get available models for a task type"""
        return self.task_models.get(task_type, [])


class InferenceEngine:
    """Main inference engine"""
    
    def __init__(self):
        self.model_registry = ModelRegistry()
        self.active_experiments = {}
        self._initialized = False
    
    async def initialize(self):
        """Initialize the inference engine"""
        if self._initialized:
            return
        
        try:
            # Initialize all components
            await model_server.initialize()
            await experiment_manager.initialize()
            await version_manager.initialize()
            await model_monitor.initialize()
            
            # Load default models
            await self._load_default_models()
            
            self._initialized = True
            logger.info("Inference engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize inference engine: {e}")
            raise
    
    async def shutdown(self):
        """Shutdown the inference engine"""
        try:
            await model_server.shutdown()
            await experiment_manager.shutdown()
            await version_manager.shutdown()
            await model_monitor.shutdown()
            
            self._initialized = False
            logger.info("Inference engine shutdown complete")
            
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")
    
    async def _load_default_models(self):
        """Load default models for each task type"""
        # This would typically load pre-trained models
        # For now, we'll create placeholder configurations
        
        default_configs = [
            ModelConfig(
                model_id="financial-bert-v1",
                model_type=ModelType.HUGGINGFACE,
                model_path="ProsusAI/finbert",
                version="1.0.0",
                backend=InferenceBackend.CPU,
                metadata={"task": "text-classification", "domain": "finance"}
            ),
            ModelConfig(
                model_id="sentiment-bert-v1",
                model_type=ModelType.HUGGINGFACE,
                model_path="cardiffnlp/twitter-roberta-base-sentiment-latest",
                version="1.0.0",
                backend=InferenceBackend.CPU,
                metadata={"task": "text-classification", "domain": "sentiment"}
            ),
            ModelConfig(
                model_id="classifier-bert-v1",
                model_type=ModelType.HUGGINGFACE,
                model_path="distilbert-base-uncased-finetuned-sst-2-english",
                version="1.0.0",
                backend=InferenceBackend.CPU,
                metadata={"task": "text-classification"}
            )
        ]
        
        for config in default_configs:
            try:
                success = await model_server.load_model(config)
                if success:
                    model_monitor.register_model(config.model_id)
                    logger.info(f"Loaded default model: {config.model_id}")
                else:
                    logger.warning(f"Failed to load default model: {config.model_id}")
            except Exception as e:
                logger.error(f"Error loading model {config.model_id}: {e}")
    
    async def predict(self, request: InferenceRequest) -> InferenceResponse:
        """Run inference on a single request"""
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        try:
            # Determine model to use
            model_id = self._resolve_model_id(request)
            
            # Check for A/B testing
            if request.experiment_id:
                result = await experiment_manager.route_prediction(
                    request.experiment_id,
                    request.input_data,
                    request.user_id
                )
                model_id = result.get("model_id", model_id)
            else:
                # Regular inference
                result = await model_server.predict(
                    model_id,
                    request.input_data,
                    request.use_cache
                )
            
            # Process predictions based on task type
            predictions = self._process_predictions(request.task_type, result)
            
            # Calculate confidence if available
            confidence = self._calculate_confidence(result.get("predictions"))
            
            # Record metrics
            inference_time = time.time() - start_time
            model_monitor.record_prediction(
                model_id=model_id,
                latency=inference_time,
                error=False,
                input_data=request.input_data
            )
            
            # Build response
            response = InferenceResponse(
                request_id=request_id,
                task_type=request.task_type,
                predictions=predictions,
                model_id=model_id,
                version=result.get("version", "1.0.0"),
                confidence=confidence,
                inference_time=inference_time,
                from_cache=result.get("from_cache", False),
                experiment_id=request.experiment_id,
                variant_id=result.get("variant_id"),
                metadata=result.get("metadata", {})
            )
            
            return response
            
        except Exception as e:
            # Record error metrics
            error_time = time.time() - start_time
            if hasattr(self, 'model_id'):
                model_monitor.record_prediction(
                    model_id=model_id,
                    latency=error_time,
                    error=True
                )
            
            logger.error(f"Inference error for request {request_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
    
    async def batch_predict(self, request: BatchInferenceRequest) -> BatchInferenceResponse:
        """Run batch inference"""
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        try:
            model_id = request.model_id or self.model_registry.get_default_model(request.task_type)
            
            results = []
            successful_items = 0
            failed_items = 0
            
            # Process in batches
            for i in range(0, len(request.batch_data), request.batch_size):
                batch = request.batch_data[i:i + request.batch_size]
                
                for item_data in batch:
                    try:
                        # Create individual inference request
                        individual_request = InferenceRequest(
                            task_type=request.task_type,
                            input_data=item_data,
                            model_id=model_id,
                            version=request.version,
                            parameters=request.parameters
                        )
                        
                        # Run inference
                        result = await self.predict(individual_request)
                        results.append(result)
                        successful_items += 1
                        
                    except Exception as e:
                        logger.error(f"Batch item failed: {e}")
                        failed_items += 1
                        # Add failed result
                        failed_result = InferenceResponse(
                            request_id=str(uuid.uuid4()),
                            task_type=request.task_type,
                            predictions={"error": str(e)},
                            model_id=model_id,
                            version="1.0.0",
                            inference_time=0.0,
                            from_cache=False
                        )
                        results.append(failed_result)
            
            batch_time = time.time() - start_time
            
            return BatchInferenceResponse(
                request_id=request_id,
                task_type=request.task_type,
                results=results,
                total_items=len(request.batch_data),
                successful_items=successful_items,
                failed_items=failed_items,
                batch_inference_time=batch_time
            )
            
        except Exception as e:
            logger.error(f"Batch inference error: {e}")
            raise HTTPException(status_code=500, detail=f"Batch inference failed: {str(e)}")
    
    async def deploy_model(self, request: ModelDeploymentRequest) -> Dict[str, Any]:
        """Deploy a new model"""
        try:
            # Create model configuration
            config = ModelConfig(
                model_id=request.model_id,
                model_type=request.model_type,
                model_path=request.model_path,
                version=request.version,
                backend=request.backend,
                max_batch_size=request.max_batch_size,
                cache_ttl=request.cache_ttl,
                metadata=request.metadata
            )
            
            # Load model
            success = await model_server.load_model(config)
            
            if success:
                # Register for monitoring
                model_monitor.register_model(request.model_id)
                
                # Register version
                from .serving.model_versioning import ModelVersion
                version = ModelVersion(
                    model_id=request.model_id,
                    version=request.version,
                    config=config,
                    deployment_strategy="blue_green",
                    status="deployed",
                    metadata=request.metadata
                )
                await version_manager.register_version(version)
                
                logger.info(f"Successfully deployed model: {request.model_id}")
                
                return {
                    "status": "success",
                    "model_id": request.model_id,
                    "version": request.version,
                    "message": "Model deployed successfully"
                }
            else:
                raise Exception("Model loading failed")
                
        except Exception as e:
            logger.error(f"Model deployment failed: {e}")
            raise HTTPException(status_code=500, detail=f"Deployment failed: {str(e)}")
    
    async def create_experiment(self, request: ExperimentRequest) -> Dict[str, Any]:
        """Create an A/B testing experiment"""
        try:
            experiment_id = f"exp_{int(time.time())}_{str(uuid.uuid4())[:8]}"
            
            # Convert variant dictionaries to ModelVariant objects
            variants = []
            for variant_data in request.variants:
                variant = ModelVariant(
                    variant_id=variant_data["variant_id"],
                    model_config=ModelConfig(**variant_data["model_config"]),
                    traffic_percentage=variant_data["traffic_percentage"],
                    metadata=variant_data.get("metadata", {})
                )
                variants.append(variant)
            
            # Create experiment
            experiment = Experiment(
                experiment_id=experiment_id,
                name=request.name,
                description=request.description,
                variants=variants,
                target_metric=request.target_metric,
                success_criteria=request.success_criteria
            )
            
            # Register experiment
            await experiment_manager.create_experiment(experiment)
            
            return {
                "status": "success",
                "experiment_id": experiment_id,
                "message": "Experiment created successfully"
            }
            
        except Exception as e:
            logger.error(f"Experiment creation failed: {e}")
            raise HTTPException(status_code=500, detail=f"Experiment creation failed: {str(e)}")
    
    def _resolve_model_id(self, request: InferenceRequest) -> str:
        """Resolve which model to use for the request"""
        if request.model_id:
            return request.model_id
        
        return self.model_registry.get_default_model(request.task_type)
    
    def _process_predictions(self, task_type: TaskType, raw_result: Dict[str, Any]) -> Any:
        """Process raw model predictions based on task type"""
        predictions = raw_result.get("predictions", [])
        
        if task_type == TaskType.FINANCIAL_ANALYSIS:
            return self._process_financial_predictions(predictions)
        elif task_type == TaskType.SENTIMENT_ANALYSIS:
            return self._process_sentiment_predictions(predictions)
        elif task_type == TaskType.TEXT_CLASSIFICATION:
            return self._process_classification_predictions(predictions)
        else:
            return predictions
    
    def _process_financial_predictions(self, predictions: Any) -> Dict[str, Any]:
        """Process financial analysis predictions"""
        if isinstance(predictions, list) and len(predictions) > 0:
            # Assume binary classification: positive/negative/neutral
            scores = predictions[0] if isinstance(predictions[0], list) else predictions
            
            labels = ["negative", "neutral", "positive"]
            if len(scores) >= 3:
                max_idx = scores.index(max(scores))
                return {
                    "sentiment": labels[max_idx],
                    "confidence": max(scores),
                    "scores": {label: score for label, score in zip(labels, scores)}
                }
        
        return {"sentiment": "neutral", "confidence": 0.5, "scores": {}}
    
    def _process_sentiment_predictions(self, predictions: Any) -> Dict[str, Any]:
        """Process sentiment analysis predictions"""
        if isinstance(predictions, list) and len(predictions) > 0:
            if isinstance(predictions[0], dict):
                # HuggingFace format
                return predictions[0]
            else:
                # Raw scores
                labels = ["negative", "positive"]
                scores = predictions[0] if isinstance(predictions[0], list) else predictions
                
                if len(scores) >= 2:
                    max_idx = scores.index(max(scores))
                    return {
                        "label": labels[max_idx],
                        "score": max(scores)
                    }
        
        return {"label": "neutral", "score": 0.5}
    
    def _process_classification_predictions(self, predictions: Any) -> Dict[str, Any]:
        """Process general classification predictions"""
        if isinstance(predictions, list) and len(predictions) > 0:
            if isinstance(predictions[0], dict):
                return predictions[0]
            else:
                return {"class": 0, "confidence": float(predictions[0]) if predictions else 0.5}
        
        return {"class": 0, "confidence": 0.5}
    
    def _calculate_confidence(self, predictions: Any) -> Optional[float]:
        """Calculate confidence score from predictions"""
        try:
            if isinstance(predictions, list) and len(predictions) > 0:
                if isinstance(predictions[0], list):
                    # Multi-class probabilities
                    return float(max(predictions[0]))
                elif isinstance(predictions[0], dict) and "score" in predictions[0]:
                    # HuggingFace format
                    return float(predictions[0]["score"])
                elif isinstance(predictions[0], (int, float)):
                    # Single score
                    return float(predictions[0])
            
            return None
            
        except Exception as e:
            logger.warning(f"Could not calculate confidence: {e}")
            return None
    
    def get_model_status(self, model_id: str) -> Dict[str, Any]:
        """Get status of a specific model"""
        return model_server.get_model_status(model_id)
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get overall system status"""
        return {
            "inference_engine": {
                "initialized": self._initialized,
                "models_loaded": len(model_server.models)
            },
            "model_server": model_server.get_all_models_status(),
            "monitoring": model_monitor.get_system_overview(),
            "experiments": {
                "total": len(experiment_manager.experiments),
                "active": len([e for e in experiment_manager.experiments.values() if e.is_active])
            }
        }


# Global inference engine instance
inference_engine = InferenceEngine()


# Lifespan context manager for FastAPI
@asynccontextmanager
async def lifespan(app):
    """FastAPI lifespan context manager"""
    # Startup
    await inference_engine.initialize()
    yield
    # Shutdown
    await inference_engine.shutdown()
