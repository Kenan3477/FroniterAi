"""
AI Model API Endpoints

FastAPI endpoints for AI model inference, management, monitoring,
and A/B testing integrated with the comprehensive authentication system.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import JSONResponse

# Import authentication system
from ..middleware.auth import (
    require_auth,
    require_professional_tier,
    require_enterprise_tier,
    require_permission
)

# Import model infrastructure
from .models.inference.ai_inference_engine import (
    inference_engine,
    InferenceRequest,
    InferenceResponse,
    BatchInferenceRequest,
    BatchInferenceResponse,
    ModelDeploymentRequest,
    ExperimentRequest,
    TaskType
)
from .models.serving.model_server import model_server
from .models.serving.model_versioning import experiment_manager, version_manager
from .models.monitoring.model_monitor import model_monitor

logger = logging.getLogger(__name__)

# Create router
ai_router = APIRouter(prefix="/api/v1/ai", tags=["AI Models"])


# Basic Inference Endpoints
@ai_router.post("/predict", response_model=InferenceResponse)
async def predict(
    request: InferenceRequest,
    user: Dict = Depends(require_auth)
):
    """
    Run AI model inference
    
    Supports various AI tasks including:
    - Financial analysis
    - Sentiment analysis
    - Text classification
    - Risk assessment
    - Market prediction
    """
    try:
        # Add user context to request
        request.user_id = user["user_id"]
        
        # Run inference
        result = await inference_engine.predict(request)
        
        return result
        
    except Exception as e:
        logger.error(f"Prediction failed for user {user['user_id']}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


@ai_router.post("/batch-predict", response_model=BatchInferenceResponse)
async def batch_predict(
    request: BatchInferenceRequest,
    background_tasks: BackgroundTasks,
    user: Dict = Depends(require_professional_tier)
):
    """
    Run batch inference (Professional tier or higher)
    
    Process multiple inputs in a single request with optimized batching.
    """
    try:
        # Validate batch size limits based on subscription tier
        max_batch_size = {
            "basic": 10,
            "professional": 100,
            "enterprise": 1000
        }.get(user["subscription_tier"], 10)
        
        if len(request.batch_data) > max_batch_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Batch size exceeds limit for {user['subscription_tier']} tier: {max_batch_size}"
            )
        
        # Run batch inference
        result = await inference_engine.batch_predict(request)
        
        # Log batch processing in background
        background_tasks.add_task(
            log_batch_processing,
            user["user_id"],
            len(request.batch_data),
            result.successful_items,
            result.failed_items
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch prediction failed for user {user['user_id']}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch prediction failed: {str(e)}"
        )


# Financial Analysis Endpoints
@ai_router.post("/financial/sentiment-analysis")
async def financial_sentiment_analysis(
    data: Dict[str, Any],
    user: Dict = Depends(require_auth)
):
    """
    Analyze sentiment of financial texts (news, reports, etc.)
    """
    try:
        request = InferenceRequest(
            task_type=TaskType.SENTIMENT_ANALYSIS,
            input_data=data,
            model_id="financial-bert-v1",
            user_id=user["user_id"]
        )
        
        result = await inference_engine.predict(request)
        
        # Process financial sentiment result
        return {
            "success": True,
            "data": {
                "sentiment": result.predictions,
                "confidence": result.confidence,
                "model_version": result.version,
                "processing_time": result.inference_time
            }
        }
        
    except Exception as e:
        logger.error(f"Financial sentiment analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Financial sentiment analysis failed"
        )


@ai_router.post("/financial/risk-assessment")
async def financial_risk_assessment(
    data: Dict[str, Any],
    user: Dict = Depends(require_professional_tier)
):
    """
    Assess financial risk using AI models (Professional tier required)
    """
    try:
        request = InferenceRequest(
            task_type=TaskType.RISK_ASSESSMENT,
            input_data=data,
            model_id="risk-assessment-v1",
            user_id=user["user_id"]
        )
        
        result = await inference_engine.predict(request)
        
        return {
            "success": True,
            "data": {
                "risk_score": result.predictions,
                "risk_factors": result.metadata.get("risk_factors", []),
                "recommendations": result.metadata.get("recommendations", []),
                "confidence": result.confidence,
                "model_version": result.version
            }
        }
        
    except Exception as e:
        logger.error(f"Risk assessment failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Risk assessment failed"
        )


@ai_router.post("/financial/market-prediction")
async def market_prediction(
    data: Dict[str, Any],
    user: Dict = Depends(require_professional_tier)
):
    """
    Predict market trends using AI models (Professional tier required)
    """
    try:
        request = InferenceRequest(
            task_type=TaskType.MARKET_PREDICTION,
            input_data=data,
            model_id="market-transformer-v1",
            user_id=user["user_id"]
        )
        
        result = await inference_engine.predict(request)
        
        return {
            "success": True,
            "data": {
                "predictions": result.predictions,
                "forecast_horizon": result.metadata.get("forecast_horizon", "1 month"),
                "confidence_intervals": result.metadata.get("confidence_intervals", {}),
                "key_indicators": result.metadata.get("key_indicators", []),
                "model_version": result.version
            }
        }
        
    except Exception as e:
        logger.error(f"Market prediction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Market prediction failed"
        )


# Model Management Endpoints (Enterprise tier)
@ai_router.post("/models/deploy")
async def deploy_model(
    request: ModelDeploymentRequest,
    user: Dict = Depends(require_enterprise_tier)
):
    """
    Deploy a new AI model (Enterprise tier only)
    """
    try:
        result = await inference_engine.deploy_model(request)
        
        # Log deployment
        logger.info(f"Model deployed by user {user['user_id']}: {request.model_id}")
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Model deployment failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model deployment failed: {str(e)}"
        )


@ai_router.delete("/models/{model_id}")
async def unload_model(
    model_id: str,
    user: Dict = Depends(require_enterprise_tier)
):
    """
    Unload a model from memory (Enterprise tier only)
    """
    try:
        success = await model_server.unload_model(model_id)
        
        if success:
            model_monitor.unregister_model(model_id)
            
            return {
                "success": True,
                "message": f"Model {model_id} unloaded successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model {model_id} not found"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Model unloading failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Model unloading failed"
        )


@ai_router.get("/models/{model_id}/status")
async def get_model_status(
    model_id: str,
    user: Dict = Depends(require_auth)
):
    """
    Get status and metrics for a specific model
    """
    try:
        status_info = inference_engine.get_model_status(model_id)
        
        if not status_info or status_info.get("status") == "not_loaded":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model {model_id} not found or not loaded"
            )
        
        return {
            "success": True,
            "data": status_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get model status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get model status"
        )


@ai_router.get("/models")
async def list_models(
    user: Dict = Depends(require_auth)
):
    """
    List all loaded models and their status
    """
    try:
        system_status = inference_engine.get_system_status()
        
        return {
            "success": True,
            "data": {
                "models": system_status["model_server"],
                "total_models": len(system_status["model_server"]),
                "system_health": system_status["inference_engine"]
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list models"
        )


# A/B Testing Endpoints (Enterprise tier)
@ai_router.post("/experiments")
async def create_experiment(
    request: ExperimentRequest,
    user: Dict = Depends(require_enterprise_tier)
):
    """
    Create an A/B testing experiment (Enterprise tier only)
    """
    try:
        result = await inference_engine.create_experiment(request)
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Experiment creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Experiment creation failed: {str(e)}"
        )


@ai_router.post("/experiments/{experiment_id}/start")
async def start_experiment(
    experiment_id: str,
    user: Dict = Depends(require_enterprise_tier)
):
    """
    Start an A/B testing experiment
    """
    try:
        success = await experiment_manager.start_experiment(experiment_id)
        
        if success:
            return {
                "success": True,
                "message": f"Experiment {experiment_id} started successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Experiment {experiment_id} not found"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start experiment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start experiment"
        )


@ai_router.post("/experiments/{experiment_id}/stop")
async def stop_experiment(
    experiment_id: str,
    user: Dict = Depends(require_enterprise_tier)
):
    """
    Stop an A/B testing experiment
    """
    try:
        success = await experiment_manager.stop_experiment(experiment_id)
        
        if success:
            return {
                "success": True,
                "message": f"Experiment {experiment_id} stopped successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Experiment {experiment_id} not found"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to stop experiment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to stop experiment"
        )


@ai_router.get("/experiments/{experiment_id}/results")
async def get_experiment_results(
    experiment_id: str,
    user: Dict = Depends(require_enterprise_tier)
):
    """
    Get A/B testing experiment results
    """
    try:
        results = experiment_manager.analyze_experiment(experiment_id)
        
        if "error" in results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=results["error"]
            )
        
        return {
            "success": True,
            "data": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get experiment results: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get experiment results"
        )


@ai_router.get("/experiments")
async def list_experiments(
    status_filter: Optional[str] = None,
    user: Dict = Depends(require_enterprise_tier)
):
    """
    List all A/B testing experiments
    """
    try:
        from .models.serving.model_versioning import ExperimentStatus
        
        status_enum = None
        if status_filter:
            try:
                status_enum = ExperimentStatus(status_filter)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status filter: {status_filter}"
                )
        
        experiments = experiment_manager.list_experiments(status_enum)
        
        return {
            "success": True,
            "data": {
                "experiments": [
                    {
                        "experiment_id": exp.experiment_id,
                        "name": exp.name,
                        "status": exp.status,
                        "created_at": exp.created_at.isoformat(),
                        "start_time": exp.start_time.isoformat() if exp.start_time else None,
                        "end_time": exp.end_time.isoformat() if exp.end_time else None,
                        "variants_count": len(exp.variants)
                    }
                    for exp in experiments
                ],
                "total": len(experiments)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list experiments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list experiments"
        )


# Monitoring Endpoints
@ai_router.get("/monitoring/overview")
async def get_monitoring_overview(
    user: Dict = Depends(require_auth)
):
    """
    Get system monitoring overview
    """
    try:
        overview = model_monitor.get_system_overview()
        
        return {
            "success": True,
            "data": overview
        }
        
    except Exception as e:
        logger.error(f"Failed to get monitoring overview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get monitoring overview"
        )


@ai_router.get("/monitoring/models/{model_id}")
async def get_model_metrics(
    model_id: str,
    user: Dict = Depends(require_auth)
):
    """
    Get detailed metrics for a specific model
    """
    try:
        metrics = model_monitor.get_model_metrics(model_id)
        
        if not metrics:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No metrics found for model {model_id}"
            )
        
        return {
            "success": True,
            "data": metrics
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get model metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get model metrics"
        )


@ai_router.get("/monitoring/alerts")
async def get_alerts(
    model_id: Optional[str] = None,
    user: Dict = Depends(require_auth)
):
    """
    Get active alerts
    """
    try:
        alerts = model_monitor.alert_manager.get_active_alerts(model_id)
        
        return {
            "success": True,
            "data": {
                "alerts": [
                    {
                        "alert_id": alert.alert_id,
                        "model_id": alert.model_id,
                        "metric_type": alert.metric_type,
                        "severity": alert.severity,
                        "message": alert.message,
                        "value": alert.value,
                        "threshold": alert.threshold,
                        "timestamp": alert.timestamp.isoformat()
                    }
                    for alert in alerts
                ],
                "total": len(alerts)
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get alerts"
        )


# System Status Endpoints
@ai_router.get("/system/status")
async def get_system_status(
    user: Dict = Depends(require_auth)
):
    """
    Get overall AI system status
    """
    try:
        status_info = inference_engine.get_system_status()
        
        return {
            "success": True,
            "data": {
                "status": "healthy" if status_info["inference_engine"]["initialized"] else "initializing",
                "timestamp": datetime.utcnow().isoformat(),
                "details": status_info
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get system status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get system status"
        )


@ai_router.get("/system/health")
async def health_check():
    """
    Health check endpoint (no authentication required)
    """
    try:
        is_healthy = inference_engine._initialized
        
        return {
            "status": "healthy" if is_healthy else "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0"
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
        )


# Background tasks
async def log_batch_processing(user_id: str, total_items: int, successful: int, failed: int):
    """Background task to log batch processing statistics"""
    try:
        logger.info(
            f"Batch processing completed for user {user_id}: "
            f"{total_items} total, {successful} successful, {failed} failed"
        )
    except Exception as e:
        logger.error(f"Failed to log batch processing: {e}")


# Helper endpoints for testing
@ai_router.get("/tasks/supported")
async def get_supported_tasks(
    user: Dict = Depends(require_auth)
):
    """
    Get list of supported AI tasks
    """
    tasks = [
        {
            "task_type": task.value,
            "name": task.value.replace("_", " ").title(),
            "description": f"AI-powered {task.value.replace('_', ' ')} task",
            "tier_required": "basic" if task in [
                TaskType.TEXT_CLASSIFICATION,
                TaskType.SENTIMENT_ANALYSIS
            ] else "professional"
        }
        for task in TaskType
    ]
    
    return {
        "success": True,
        "data": {
            "tasks": tasks,
            "total": len(tasks)
        }
    }
