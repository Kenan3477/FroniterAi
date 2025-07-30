"""
Frontier Business Operations API - Main Application

Comprehensive FastAPI application providing RESTful endpoints for all business operations
capabilities including financial analysis, strategic planning, compliance, risk management,
and market analysis with authentication, rate limiting, and comprehensive documentation.
"""

from fastapi import FastAPI, HTTPException, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from contextlib import asynccontextmanager
import logging
import time
import uvicorn
from typing import Dict, Any, Optional, List
import asyncio
from datetime import datetime, timedelta
import jwt
import redis
import hashlib
from pathlib import Path
import sys
import os

# Add modules to path
current_dir = Path(__file__).parent
project_root = current_dir.parent
sys.path.insert(0, str(project_root))

# Import route modules
from api.routers import (
    financial_analysis,
    strategic_planning,
    operations_consulting,
    compliance_check,
    market_intelligence,
    compliance_risk_management,
    industry_compliance,
    risk_assessment,
    policy_generator,
    regulatory_monitoring,
    financial_market_analysis,
    ai_reasoning,
    sentiment_analysis,
    volatility_analysis,
    gold_analysis,
    real_time_feeds,
    market_alerts,
    government_apis
)

# Import middleware and utilities
from api.middleware.auth import AuthMiddleware, get_current_user
from api.middleware.rate_limiting import RateLimitMiddleware
from api.middleware.logging import LoggingMiddleware
from api.utils.response_models import APIResponse, ErrorResponse
from api.utils.database import get_database_connection
from api.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global state management
app_state = {
    "startup_time": None,
    "request_count": 0,
    "error_count": 0,
    "active_connections": 0
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management with full integration"""
    
    # Startup
    logger.info("Starting Frontier Business Operations API with full integration")
    app_state["startup_time"] = datetime.now()
    
    try:
        # Initialize database connections
        await initialize_database()
        
        # Initialize Redis for rate limiting
        await initialize_redis()
        
        # Initialize business modules
        await initialize_business_modules()
        
        # Initialize integration hub (connects all components)
        from integration_hub import initialize_integration_hub
        await initialize_integration_hub()
        logger.info("Integration hub initialized")
        
        # Initialize production optimization
        from optimization.production_optimizer import production_optimizer
        await production_optimizer.initialize()
        await production_optimizer.start()
        logger.info("Production optimization initialized")
        
        # Initialize real-time data orchestrator
        from data_feeds.realtime_orchestrator import data_orchestrator
        await data_orchestrator.initialize()
        logger.info("Real-time data orchestrator initialized")
        
        # Initialize performance monitoring
        from monitoring.performance_monitor import performance_monitor
        await performance_monitor.initialize()
        logger.info("Performance monitoring initialized")
        
        # Start WebSocket server
        from websockets.websocket_server import start_websocket_server
        asyncio.create_task(start_websocket_server("0.0.0.0", 8765))
        logger.info("WebSocket server started on port 8765")
        
        logger.info("API startup with full optimization completed successfully")
        
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Frontier Business Operations API")
    try:
        # Graceful shutdown of optimization
        from optimization.production_optimizer import production_optimizer
        await production_optimizer.stop()
        logger.info("Production optimization stopped")
        
        # Graceful shutdown of integration components
        from integration_hub import integration_hub
        from data_feeds.realtime_orchestrator import data_orchestrator
        from monitoring.performance_monitor import performance_monitor
        from websockets.websocket_server import websocket_server
        
        await integration_hub.shutdown()
        await data_orchestrator.close()
        await performance_monitor.close()
        await websocket_server.stop()
        
        # Cleanup standard resources
        await cleanup_resources()
        
    except Exception as e:
        logger.error(f"Shutdown error: {e}")


# Create FastAPI application
app = FastAPI(
    title="Frontier Business Operations API",
    description="""
    Comprehensive business operations and decision support API providing:
    
    - **Financial Analysis**: Financial statement analysis, ratio analysis, valuation models
    - **Strategic Planning**: SWOT analysis, market analysis, competitive intelligence
    - **Operations Management**: Process optimization, supply chain analysis, quality management
    - **Compliance & Risk**: Regulatory compliance, risk assessment, policy generation
    - **Market Intelligence**: Market analysis, sentiment analysis, volatility modeling
    - **AI Reasoning**: Advanced AI-powered business insights and decision support
    
    All endpoints include comprehensive authentication, rate limiting, and error handling.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Security scheme
security = HTTPBearer()

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# Custom middleware
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(AuthMiddleware)


# Global exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with standardized response format"""
    
    app_state["error_count"] += 1
    
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error="HTTP_ERROR",
            message=exc.detail,
            status_code=exc.status_code,
            timestamp=datetime.now().isoformat(),
            path=str(request.url.path)
        ).dict()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions with standardized response format"""
    
    app_state["error_count"] += 1
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="INTERNAL_SERVER_ERROR",
            message="An internal server error occurred",
            status_code=500,
            timestamp=datetime.now().isoformat(),
            path=str(request.url.path)
        ).dict()
    )


# Include all route modules
app.include_router(
    financial_analysis.router,
    prefix="/api/v1/business",
    tags=["Financial Analysis"]
)

app.include_router(
    strategic_planning.router,
    prefix="/api/v1/business",
    tags=["Strategic Planning"]
)

app.include_router(
    operations_consulting.router,
    prefix="/api/v1/business",
    tags=["Operations Consulting"]
)

app.include_router(
    compliance_check.router,
    prefix="/api/v1/business",
    tags=["Compliance Check"]
)

app.include_router(
    market_intelligence.router,
    prefix="/api/v1/business",
    tags=["Market Intelligence"]
)

app.include_router(
    compliance_risk_management.router,
    prefix="/api/v1/business",
    tags=["Compliance Risk Management"]
)

app.include_router(
    industry_compliance.router,
    prefix="/api/v1/business",
    tags=["Industry Compliance"]
)

app.include_router(
    risk_assessment.router,
    prefix="/api/v1/business",
    tags=["Risk Assessment"]
)

app.include_router(
    policy_generator.router,
    prefix="/api/v1/business",
    tags=["Policy Generator"]
)

app.include_router(
    regulatory_monitoring.router,
    prefix="/api/v1/business",
    tags=["Regulatory Monitoring"]
)

app.include_router(
    financial_market_analysis.router,
    prefix="/api/v1/business",
    tags=["Financial Market Analysis"]
)

app.include_router(
    ai_reasoning.router,
    prefix="/api/v1/business",
    tags=["AI Reasoning"]
)

app.include_router(
    sentiment_analysis.router,
    prefix="/api/v1/business",
    tags=["Sentiment Analysis"]
)

app.include_router(
    volatility_analysis.router,
    prefix="/api/v1/business",
    tags=["Volatility Analysis"]
)

app.include_router(
    gold_analysis.router,
    prefix="/api/v1/business",
    tags=["Gold Analysis"]
)

app.include_router(
    real_time_feeds.router,
    prefix="/api/v1/business",
    tags=["Real-time Feeds"]
)

app.include_router(
    market_alerts.router,
    prefix="/api/v1/business",
    tags=["Market Alerts"]
)

# Government API Integration router
app.include_router(
    government_apis.router,
    prefix="/api/v1/government",
    tags=["Government APIs"]
)


# ===========================================
# OPTIMIZATION AND PERFORMANCE ENDPOINTS
# ===========================================

@app.get("/optimization/status", 
         response_model=APIResponse,
         summary="Get Optimization Status",
         description="Get comprehensive status of all production optimization components")
async def get_optimization_status(current_user: dict = Depends(get_current_user)):
    """Get optimization system status"""
    try:
        from optimization.production_optimizer import production_optimizer
        status = await production_optimizer.get_optimization_status()
        return APIResponse(success=True, data=status)
    except Exception as e:
        logger.error(f"Error getting optimization status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/optimization/cache/stats", 
         response_model=APIResponse,
         summary="Get Cache Statistics",
         description="Get detailed cache performance statistics")
async def get_cache_stats(current_user: dict = Depends(get_current_user)):
    """Get cache performance statistics"""
    try:
        from optimization.cache_manager import cache_manager
        stats = cache_manager.get_stats()
        return APIResponse(success=True, data=stats)
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/optimization/cache/clear", 
          response_model=APIResponse,
          summary="Clear Cache",
          description="Clear all cache entries (admin only)")
async def clear_cache(current_user: dict = Depends(get_current_user)):
    """Clear all cache entries"""
    try:
        # Check admin privileges
        if not current_user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin privileges required")
        
        from optimization.cache_manager import cache_manager
        await cache_manager.clear_all()
        return APIResponse(success=True, data={"message": "Cache cleared successfully"})
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/optimization/database/performance", 
         response_model=APIResponse,
         summary="Get Database Performance",
         description="Get database performance analysis and optimization recommendations")
async def get_database_performance(current_user: dict = Depends(get_current_user)):
    """Get database performance analysis"""
    try:
        from optimization.database_optimizer import db_optimizer
        analysis = await db_optimizer.analyze_performance()
        return APIResponse(success=True, data=analysis)
    except Exception as e:
        logger.error(f"Error getting database performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/optimization/database/optimize", 
          response_model=APIResponse,
          summary="Optimize Database",
          description="Apply database optimizations (admin only)")
async def optimize_database(current_user: dict = Depends(get_current_user)):
    """Apply database optimizations"""
    try:
        # Check admin privileges
        if not current_user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin privileges required")
        
        from optimization.database_optimizer import db_optimizer
        optimizations = await db_optimizer.optimize_indexes()
        return APIResponse(success=True, data={
            "optimizations_applied": len(optimizations),
            "optimizations": optimizations
        })
    except Exception as e:
        logger.error(f"Error optimizing database: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/optimization/ai/stats", 
         response_model=APIResponse,
         summary="Get AI Batching Statistics",
         description="Get AI model batching performance statistics")
async def get_ai_batching_stats(current_user: dict = Depends(get_current_user)):
    """Get AI batching performance statistics"""
    try:
        from optimization.ai_batching import ai_model_manager
        stats = ai_model_manager.get_performance_stats()
        return APIResponse(success=True, data=stats)
    except Exception as e:
        logger.error(f"Error getting AI batching stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/optimization/scaling/status", 
         response_model=APIResponse,
         summary="Get Scaling Status",
         description="Get auto-scaling and load balancing status")
async def get_scaling_status(current_user: dict = Depends(get_current_user)):
    """Get scaling system status"""
    try:
        from optimization.scaling_manager import service_registry
        stats = service_registry.get_service_stats()
        return APIResponse(success=True, data=stats)
    except Exception as e:
        logger.error(f"Error getting scaling status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/optimization/performance/dashboard", 
         response_model=APIResponse,
         summary="Get Performance Dashboard",
         description="Get comprehensive performance monitoring dashboard data")
async def get_performance_dashboard(current_user: dict = Depends(get_current_user)):
    """Get performance monitoring dashboard"""
    try:
        from optimization.performance_monitor import performance_manager
        dashboard = performance_manager.get_dashboard_data()
        return APIResponse(success=True, data=dashboard)
    except Exception as e:
        logger.error(f"Error getting performance dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/optimization/audit", 
          response_model=APIResponse,
          summary="Run Optimization Audit",
          description="Run comprehensive optimization audit (admin only)")
async def run_optimization_audit(current_user: dict = Depends(get_current_user)):
    """Run comprehensive optimization audit"""
    try:
        # Check admin privileges
        if not current_user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin privileges required")
        
        from optimization.production_optimizer import production_optimizer
        audit_results = await production_optimizer.run_optimization_audit()
        return APIResponse(success=True, data=audit_results)
    except Exception as e:
        logger.error(f"Error running optimization audit: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/optimization/cdn/assets", 
         response_model=APIResponse,
         summary="Get CDN Asset Information",
         description="Get CDN and static asset optimization information")
async def get_cdn_assets(current_user: dict = Depends(get_current_user)):
    """Get CDN asset information"""
    try:
        from optimization.cdn_manager import static_optimizer
        manifest = static_optimizer.asset_manifest
        
        asset_info = {}
        for path, info in manifest.items():
            asset_info[path] = {
                "size": info.size,
                "hash": info.hash,
                "content_type": info.content_type,
                "compressed_size": info.compressed_size,
                "cache_control": info.cache_control
            }
        
        return APIResponse(success=True, data={
            "total_assets": len(asset_info),
            "assets": asset_info
        })
    except Exception as e:
        logger.error(f"Error getting CDN assets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Integration monitoring endpoints
@app.get("/integration/status", response_model=APIResponse)
async def integration_status(current_user: dict = Depends(get_current_user)):
    """Get comprehensive integration system status"""
    try:
        from integration_hub import get_integration_status
        status = await get_integration_status()
        
        return APIResponse(
            success=True,
            data=status,
            message="Integration status retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error getting integration status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get integration status")


@app.get("/integration/feeds", response_model=APIResponse)
async def data_feeds_status(current_user: dict = Depends(get_current_user)):
    """Get real-time data feeds status"""
    try:
        from data_feeds.realtime_orchestrator import data_orchestrator
        status = await data_orchestrator.get_feed_status()
        
        return APIResponse(
            success=True,
            data=status,
            message="Data feeds status retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error getting data feeds status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get data feeds status")


@app.get("/integration/websockets", response_model=APIResponse)
async def websocket_status(current_user: dict = Depends(get_current_user)):
    """Get WebSocket server status"""
    try:
        from websockets.websocket_server import get_websocket_stats
        stats = get_websocket_stats()
        
        return APIResponse(
            success=True,
            data=stats,
            message="WebSocket status retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error getting WebSocket status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get WebSocket status")


@app.get("/integration/monitoring", response_model=APIResponse)
async def monitoring_status(current_user: dict = Depends(get_current_user)):
    """Get performance monitoring status"""
    try:
        from monitoring.performance_monitor import performance_monitor
        metrics = await performance_monitor.get_current_metrics()
        alerts = await performance_monitor.get_active_alerts()
        
        return APIResponse(
            success=True,
            data={
                "metrics": metrics,
                "active_alerts": alerts,
                "monitoring_healthy": await performance_monitor.health_check()
            },
            message="Performance monitoring status retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error getting monitoring status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get monitoring status")


@app.get("/integration/data/{source}/{symbol}", response_model=APIResponse)
async def get_realtime_data(
    source: str,
    symbol: str,
    current_user: dict = Depends(get_current_user)
):
    """Get latest real-time data for specific source and symbol"""
    try:
        from data_feeds.realtime_orchestrator import data_orchestrator
        data = await data_orchestrator.get_latest_data(source, symbol)
        
        if data:
            return APIResponse(
                success=True,
                data=data,
                message=f"Latest data retrieved for {source}:{symbol}"
            )
        else:
            raise HTTPException(status_code=404, detail="Data not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting real-time data: {e}")
        raise HTTPException(status_code=500, detail="Failed to get real-time data")


@app.get("/integration/data/{source}/{symbol}/history", response_model=APIResponse)
async def get_historical_data(
    source: str,
    symbol: str,
    hours: int = 1,
    current_user: dict = Depends(get_current_user)
):
    """Get historical data for specific source and symbol"""
    try:
        from data_feeds.realtime_orchestrator import data_orchestrator
        data = await data_orchestrator.get_historical_data(source, symbol, hours)
        
        return APIResponse(
            success=True,
            data={
                "source": source,
                "symbol": symbol,
                "hours": hours,
                "data_points": len(data),
                "data": data
            },
            message=f"Historical data retrieved for {source}:{symbol}"
        )


# Health check and status endpoints
@app.get("/health", response_model=APIResponse)
async def health_check():
    """API health check endpoint"""
    
    return APIResponse(
        success=True,
        data={
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": (datetime.now() - app_state["startup_time"]).total_seconds(),
            "version": "1.0.0"
        },
        message="API is healthy"
    )


@app.get("/status", response_model=APIResponse)
async def api_status(current_user: dict = Depends(get_current_user)):
    """Get detailed API status information"""
    
    uptime = datetime.now() - app_state["startup_time"]
    
    return APIResponse(
        success=True,
        data={
            "api_name": "Frontier Business Operations API",
            "version": "1.0.0",
            "status": "running",
            "startup_time": app_state["startup_time"].isoformat(),
            "uptime": {
                "seconds": uptime.total_seconds(),
                "days": uptime.days,
                "hours": uptime.seconds // 3600,
                "minutes": (uptime.seconds // 60) % 60
            },
            "statistics": {
                "total_requests": app_state["request_count"],
                "error_count": app_state["error_count"],
                "error_rate": app_state["error_count"] / max(app_state["request_count"], 1),
                "active_connections": app_state["active_connections"]
            },
            "modules": {
                "financial_analysis": "enabled",
                "strategic_planning": "enabled",
                "operations_consulting": "enabled",
                "compliance_risk_management": "enabled",
                "market_intelligence": "enabled",
                "ai_reasoning": "enabled"
            }
        },
        message="API status retrieved successfully"
    )


@app.get("/metrics", response_model=APIResponse)
async def api_metrics(current_user: dict = Depends(get_current_user)):
    """Get API performance metrics"""
    
    return APIResponse(
        success=True,
        data={
            "performance": {
                "total_requests": app_state["request_count"],
                "error_count": app_state["error_count"],
                "success_rate": 1 - (app_state["error_count"] / max(app_state["request_count"], 1)),
                "active_connections": app_state["active_connections"]
            },
            "endpoints": {
                "financial_analysis": "/api/v1/business/financial-analysis",
                "strategic_planning": "/api/v1/business/strategic-planning",
                "operations_consulting": "/api/v1/business/operations",
                "compliance_check": "/api/v1/business/compliance",
                "market_intelligence": "/api/v1/business/market-intel"
            },
            "documentation": {
                "swagger_ui": "/docs",
                "redoc": "/redoc",
                "openapi_spec": "/openapi.json"
            }
        },
        message="API metrics retrieved successfully"
    )


# Custom OpenAPI schema
def custom_openapi():
    """Generate custom OpenAPI schema with enhanced documentation"""
    
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="Frontier Business Operations API",
        version="1.0.0",
        description="""
        ## Overview
        
        The Frontier Business Operations API provides comprehensive business intelligence,
        analysis, and decision support capabilities across multiple domains:
        
        ### Core Capabilities
        
        - **Financial Analysis**: Advanced financial modeling, ratio analysis, valuation
        - **Strategic Planning**: Market analysis, competitive intelligence, scenario planning
        - **Operations Management**: Process optimization, supply chain analysis
        - **Compliance & Risk**: Regulatory compliance, risk assessment, policy generation
        - **Market Intelligence**: Real-time market analysis, sentiment analysis, volatility modeling
        - **AI Reasoning**: Advanced AI-powered insights and decision support
        
        ### Authentication
        
        All endpoints require JWT authentication. Include your token in the Authorization header:
        ```
        Authorization: Bearer <your-jwt-token>
        ```
        
        ### Rate Limiting
        
        API requests are rate-limited based on your subscription tier:
        - **Free Tier**: 100 requests/hour
        - **Professional**: 1,000 requests/hour  
        - **Enterprise**: 10,000 requests/hour
        
        ### Response Format
        
        All responses follow a standardized format:
        ```json
        {
            "success": true,
            "data": { ... },
            "message": "Operation completed successfully",
            "timestamp": "2025-07-24T10:30:00Z"
        }
        ```
        
        ### Error Handling
        
        Errors are returned with appropriate HTTP status codes and detailed messages:
        ```json
        {
            "error": "ERROR_CODE",
            "message": "Detailed error description",
            "status_code": 400,
            "timestamp": "2025-07-24T10:30:00Z",
            "path": "/api/v1/business/financial-analysis"
        }
        ```
        """,
        routes=app.routes,
    )
    
    # Add custom security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    
    # Add global security requirement
    openapi_schema["security"] = [{"BearerAuth": []}]
    
    # Add custom tags
    openapi_schema["tags"] = [
        {
            "name": "Financial Analysis",
            "description": "Financial statement analysis, ratio analysis, and valuation models"
        },
        {
            "name": "Strategic Planning", 
            "description": "SWOT analysis, market research, and strategic roadmapping"
        },
        {
            "name": "Operations Consulting",
            "description": "Process optimization, supply chain analysis, and quality management"
        },
        {
            "name": "Compliance Check",
            "description": "Regulatory compliance checking and audit support"
        },
        {
            "name": "Market Intelligence",
            "description": "Market analysis, competitive intelligence, and industry insights"
        },
        {
            "name": "Compliance Risk Management",
            "description": "Comprehensive compliance and risk management solutions"
        },
        {
            "name": "AI Reasoning",
            "description": "Advanced AI-powered business insights and decision support"
        }
    ]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


# Initialization functions
async def initialize_database():
    """Initialize database connections"""
    try:
        # Test database connection
        db = await get_database_connection()
        logger.info("Database connection established successfully")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise


async def initialize_redis():
    """Initialize Redis connection for rate limiting"""
    try:
        import redis.asyncio as redis_async
        
        redis_client = redis_async.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )
        
        # Test Redis connection
        await redis_client.ping()
        logger.info("Redis connection established successfully")
        
        # Store in app state
        app.state.redis = redis_client
        
    except Exception as e:
        logger.warning(f"Redis initialization failed (rate limiting will use memory): {e}")
        app.state.redis = None


async def initialize_business_modules():
    """Initialize business operation modules"""
    try:
        # Initialize compliance risk management module
        from modules.compliance_risk_management import initialize_compliance_risk_management
        
        app.state.compliance_module = initialize_compliance_risk_management()
        logger.info("Compliance risk management module initialized")
        
        # Initialize other modules as needed
        logger.info("All business modules initialized successfully")
        
    except Exception as e:
        logger.error(f"Business module initialization failed: {e}")
        raise


async def cleanup_resources():
    """Cleanup resources on shutdown"""
    try:
        if hasattr(app.state, 'redis') and app.state.redis:
            await app.state.redis.close()
            logger.info("Redis connection closed")
            
        logger.info("Resource cleanup completed")
        
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")


# Request middleware to track statistics
@app.middleware("http")
async def track_requests(request: Request, call_next):
    """Track request statistics"""
    
    start_time = time.time()
    app_state["request_count"] += 1
    app_state["active_connections"] += 1
    
    try:
        response = await call_next(request)
        
        # Log request details
        process_time = time.time() - start_time
        logger.info(
            f"{request.method} {request.url.path} - "
            f"Status: {response.status_code} - "
            f"Time: {process_time:.3f}s"
        )
        
        # Add custom headers
        response.headers["X-Process-Time"] = str(process_time)
        response.headers["X-API-Version"] = "1.0.0"
        
        return response
        
    finally:
        app_state["active_connections"] -= 1


if __name__ == "__main__":
    # Development server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        access_log=True
    )
