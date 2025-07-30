"""
REST API Server
Provides REST endpoints for all Frontier capabilities
"""

from typing import Dict, List, Optional, Any, Union
import asyncio
import json
import time
from datetime import datetime
from dataclasses import dataclass
import logging

from fastapi import FastAPI, HTTPException, Depends, Security, status, File, UploadFile, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, validator
import uvicorn

# Import Frontier modules
from modules.visual_design.main import VisualDesignModule
from modules.self_improvement.main import SelfImprovementFramework
from modules.code_quality.main import CodeQualityAnalyzer
from modules.image_generation.main import ImageGenerationModule
from modules.audio_video.main import AudioVideoModule

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security schemes
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)

# Pydantic models for requests/responses

# Visual Design Models
class BrandIdentityRequest(BaseModel):
    company_name: str = Field(..., description="Company name")
    industry: str = Field(..., description="Industry sector")
    style: str = Field("modern", description="Design style preference")
    target_audience: Optional[str] = Field(None, description="Target audience description")
    color_preferences: Optional[List[str]] = Field(None, description="Preferred colors")
    
class UILayoutRequest(BaseModel):
    layout_type: str = Field(..., description="Type of layout (landing, dashboard, etc.)")
    target_device: str = Field("responsive", description="Target device type")
    content_sections: List[str] = Field(..., description="Required content sections")
    style_preferences: Optional[Dict[str, Any]] = Field(None, description="Style preferences")
    
class WebsiteMockupRequest(BaseModel):
    website_type: str = Field(..., description="Type of website")
    pages: List[str] = Field(..., description="Required pages")
    brand_identity: Optional[Dict[str, Any]] = Field(None, description="Brand identity to use")
    features: Optional[List[str]] = Field(None, description="Required features")

# Code Quality Models
class CodeAnalysisRequest(BaseModel):
    code: str = Field(..., description="Code to analyze")
    language: str = Field(..., description="Programming language")
    analysis_types: List[str] = Field(["patterns", "security", "performance"], description="Types of analysis")
    
class RefactorRequest(BaseModel):
    code: str = Field(..., description="Code to refactor")
    language: str = Field(..., description="Programming language")
    refactor_goals: List[str] = Field(..., description="Refactoring objectives")

# Image Generation Models
class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., description="Image generation prompt")
    style: str = Field("photorealistic", description="Image style")
    size: str = Field("1024x1024", description="Image dimensions")
    count: int = Field(1, description="Number of images to generate")
    
    @validator('size')
    def validate_size(cls, v):
        valid_sizes = ["512x512", "1024x1024", "1024x768", "768x1024", "1536x1024", "1024x1536"]
        if v not in valid_sizes:
            raise ValueError(f"Size must be one of {valid_sizes}")
        return v

class ProductPhotographyRequest(BaseModel):
    product_description: str = Field(..., description="Product description")
    photography_style: str = Field("professional", description="Photography style")
    background: str = Field("white", description="Background setting")
    lighting: str = Field("studio", description="Lighting setup")

# Audio/Video Models
class ScriptGenerationRequest(BaseModel):
    topic: str = Field(..., description="Video topic")
    duration: int = Field(60, description="Target duration in seconds")
    style: str = Field("professional", description="Script style")
    target_audience: str = Field("general", description="Target audience")
    
class VoiceoverRequest(BaseModel):
    text: str = Field(..., description="Text to convert to speech")
    voice_style: str = Field("professional", description="Voice style")
    language: str = Field("en", description="Language code")
    speed: float = Field(1.0, description="Speech speed multiplier")
    
class TranscriptionRequest(BaseModel):
    audio_url: Optional[str] = Field(None, description="URL to audio file")
    language: Optional[str] = Field("auto", description="Audio language")
    include_timestamps: bool = Field(False, description="Include timestamps")

# Business Operations Models
class FinancialAnalysisRequest(BaseModel):
    financial_data: Dict[str, Any] = Field(..., description="Financial statements/data")
    analysis_type: str = Field("comprehensive", description="Type of analysis")
    comparison_period: Optional[str] = Field(None, description="Comparison period")
    
class StrategyPlanningRequest(BaseModel):
    business_context: Dict[str, Any] = Field(..., description="Business context and goals")
    planning_horizon: str = Field("1-year", description="Planning time horizon")
    focus_areas: List[str] = Field(..., description="Strategic focus areas")

# Response Models
class ApiResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    execution_time: Optional[float] = None

class JobResponse(BaseModel):
    job_id: str
    status: str
    created_at: datetime
    estimated_completion: Optional[datetime] = None

# API Server Class
class FrontierRestAPI:
    """Main REST API server for Frontier capabilities"""
    
    def __init__(self):
        self.app = FastAPI(
            title="Frontier AI API",
            description="Comprehensive AI capabilities API",
            version="1.0.0",
            docs_url="/docs",
            redoc_url="/redoc"
        )
        
        # Initialize Frontier modules
        self.visual_design = VisualDesignModule()
        self.self_improvement = SelfImprovementFramework()
        self.code_quality = CodeQualityAnalyzer()
        self.image_generation = ImageGenerationModule()
        self.audio_video = AudioVideoModule()
        
        # Job tracking
        self.jobs = {}
        
        # Setup middleware and routes
        self._setup_middleware()
        self._setup_routes()
    
    def _setup_middleware(self):
        """Setup FastAPI middleware"""
        # CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # Configure properly for production
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Compression
        self.app.add_middleware(GZipMiddleware, minimum_size=1000)
        
        # Custom middleware for timing and logging
        @self.app.middleware("http")
        async def timing_middleware(request, call_next):
            start_time = time.time()
            response = await call_next(request)
            process_time = time.time() - start_time
            response.headers["X-Process-Time"] = str(process_time)
            logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.3f}s")
            return response
    
    def _setup_routes(self):
        """Setup API routes"""
        
        # Health check
        @self.app.get("/health")
        async def health_check():
            return {"status": "healthy", "timestamp": datetime.utcnow()}
        
        # Authentication dependency
        async def get_current_user(
            api_key: Optional[str] = Security(api_key_header),
            token: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme)
        ):
            # Simplified authentication - implement proper auth in production
            if api_key and api_key.startswith("fk_"):
                return {"user_id": "api_user", "tier": "professional"}
            if token:
                return {"user_id": "jwt_user", "tier": "developer"}
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Visual Design Endpoints
        @self.app.post("/api/v1/visual-design/brand-identity", response_model=ApiResponse)
        async def create_brand_identity(
            request: BrandIdentityRequest,
            user: dict = Depends(get_current_user)
        ):
            start_time = time.time()
            try:
                result = await self.visual_design.brand_identity_generator.generate_brand_identity(
                    company_name=request.company_name,
                    industry=request.industry,
                    style=request.style,
                    target_audience=request.target_audience,
                    color_preferences=request.color_preferences
                )
                
                execution_time = time.time() - start_time
                return ApiResponse(
                    success=True,
                    data=result,
                    execution_time=execution_time
                )
            except Exception as e:
                logger.error(f"Brand identity generation failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/visual-design/ui-layout", response_model=ApiResponse)
        async def create_ui_layout(
            request: UILayoutRequest,
            user: dict = Depends(get_current_user)
        ):
            start_time = time.time()
            try:
                result = await self.visual_design.layout_generator.generate_responsive_layout(
                    layout_type=request.layout_type,
                    target_device=request.target_device,
                    content_sections=request.content_sections,
                    style_preferences=request.style_preferences or {}
                )
                
                execution_time = time.time() - start_time
                return ApiResponse(
                    success=True,
                    data=result,
                    execution_time=execution_time
                )
            except Exception as e:
                logger.error(f"UI layout generation failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/visual-design/mockup", response_model=ApiResponse)
        async def create_website_mockup(
            request: WebsiteMockupRequest,
            user: dict = Depends(get_current_user)
        ):
            start_time = time.time()
            try:
                result = await self.visual_design.mockup_generator.generate_website_mockup(
                    website_type=request.website_type,
                    pages=request.pages,
                    brand_identity=request.brand_identity,
                    features=request.features or []
                )
                
                execution_time = time.time() - start_time
                return ApiResponse(
                    success=True,
                    data=result,
                    execution_time=execution_time
                )
            except Exception as e:
                logger.error(f"Website mockup generation failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # Code Quality Endpoints
        @self.app.post("/api/v1/code-quality/analyze", response_model=ApiResponse)
        async def analyze_code(
            request: CodeAnalysisRequest,
            user: dict = Depends(get_current_user)
        ):
            start_time = time.time()
            try:
                result = await self.code_quality.analyze_code_comprehensive(
                    code=request.code,
                    language=request.language,
                    analysis_types=request.analysis_types
                )
                
                execution_time = time.time() - start_time
                return ApiResponse(
                    success=True,
                    data=result,
                    execution_time=execution_time
                )
            except Exception as e:
                logger.error(f"Code analysis failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/code-quality/security-scan", response_model=ApiResponse)
        async def security_scan(
            request: CodeAnalysisRequest,
            user: dict = Depends(get_current_user)
        ):
            start_time = time.time()
            try:
                result = await self.code_quality.security_scanner.scan_code_security(
                    code=request.code,
                    language=request.language
                )
                
                execution_time = time.time() - start_time
                return ApiResponse(
                    success=True,
                    data=result,
                    execution_time=execution_time
                )
            except Exception as e:
                logger.error(f"Security scan failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/code-quality/refactor", response_model=ApiResponse)
        async def refactor_code(
            request: RefactorRequest,
            user: dict = Depends(get_current_user)
        ):
            start_time = time.time()
            try:
                result = await self.code_quality.refactoring_engine.refactor_code(
                    code=request.code,
                    language=request.language,
                    goals=request.refactor_goals
                )
                
                execution_time = time.time() - start_time
                return ApiResponse(
                    success=True,
                    data=result,
                    execution_time=execution_time
                )
            except Exception as e:
                logger.error(f"Code refactoring failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # Image Generation Endpoints
        @self.app.post("/api/v1/image-generation/create", response_model=ApiResponse)
        async def generate_image(
            request: ImageGenerationRequest,
            background_tasks: BackgroundTasks,
            user: dict = Depends(get_current_user)
        ):
            start_time = time.time()
            try:
                # For long-running tasks, return job ID
                if request.count > 1 or "complex" in request.style:
                    job_id = f"img_{int(time.time())}_{hash(request.prompt) % 10000}"
                    self.jobs[job_id] = {
                        "status": "queued",
                        "created_at": datetime.utcnow(),
                        "type": "image_generation",
                        "params": request.dict()
                    }
                    
                    background_tasks.add_task(self._process_image_generation, job_id, request)
                    
                    return ApiResponse(
                        success=True,
                        data=JobResponse(
                            job_id=job_id,
                            status="queued",
                            created_at=datetime.utcnow()
                        ).dict()
                    )
                
                # Synchronous generation for simple requests
                result = await self.image_generation.asset_generator.generate_image(
                    prompt=request.prompt,
                    style=request.style,
                    dimensions=request.size
                )
                
                execution_time = time.time() - start_time
                return ApiResponse(
                    success=True,
                    data=result,
                    execution_time=execution_time
                )
            except Exception as e:
                logger.error(f"Image generation failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/image-generation/product-photo", response_model=ApiResponse)
        async def generate_product_photo(
            request: ProductPhotographyRequest,
            user: dict = Depends(get_current_user)
        ):
            start_time = time.time()
            try:
                result = await self.image_generation.product_photography.generate_product_photo(
                    product_description=request.product_description,
                    style=request.photography_style,
                    background=request.background,
                    lighting=request.lighting
                )
                
                execution_time = time.time() - start_time
                return ApiResponse(
                    success=True,
                    data=result,
                    execution_time=execution_time
                )
            except Exception as e:
                logger.error(f"Product photography generation failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # Audio/Video Endpoints
        @self.app.post("/api/v1/audio-video/script-generation", response_model=ApiResponse)
        async def generate_script(
            request: ScriptGenerationRequest,
            user: dict = Depends(get_current_user)
        ):
            start_time = time.time()
            try:
                result = await self.audio_video.script_generator.generate_video_script(
                    topic=request.topic,
                    duration=request.duration,
                    style=request.style,
                    target_audience=request.target_audience
                )
                
                execution_time = time.time() - start_time
                return ApiResponse(
                    success=True,
                    data=result,
                    execution_time=execution_time
                )
            except Exception as e:
                logger.error(f"Script generation failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/audio-video/voiceover", response_model=ApiResponse)
        async def create_voiceover(
            request: VoiceoverRequest,
            user: dict = Depends(get_current_user)
        ):
            start_time = time.time()
            try:
                result = await self.audio_video.audio_processor.generate_voiceover(
                    text=request.text,
                    voice_style=request.voice_style,
                    language=request.language,
                    speed=request.speed
                )
                
                execution_time = time.time() - start_time
                return ApiResponse(
                    success=True,
                    data=result,
                    execution_time=execution_time
                )
            except Exception as e:
                logger.error(f"Voiceover generation failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/audio-video/transcription", response_model=ApiResponse)
        async def transcribe_audio(
            request: TranscriptionRequest = None,
            file: UploadFile = File(None),
            user: dict = Depends(get_current_user)
        ):
            start_time = time.time()
            try:
                if file:
                    # Handle file upload
                    audio_data = await file.read()
                    result = await self.audio_video.video_transcriber.transcribe_audio_data(
                        audio_data=audio_data,
                        filename=file.filename
                    )
                elif request and request.audio_url:
                    # Handle URL
                    result = await self.audio_video.video_transcriber.transcribe_audio_url(
                        audio_url=request.audio_url,
                        language=request.language,
                        include_timestamps=request.include_timestamps
                    )
                else:
                    raise HTTPException(status_code=400, detail="Either file or audio_url required")
                
                execution_time = time.time() - start_time
                return ApiResponse(
                    success=True,
                    data=result,
                    execution_time=execution_time
                )
            except Exception as e:
                logger.error(f"Audio transcription failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # Business Operations Endpoints (from config)
        @self.app.post("/api/v1/business/financial-analysis", response_model=ApiResponse)
        async def analyze_financials(
            request: FinancialAnalysisRequest,
            user: dict = Depends(get_current_user)
        ):
            start_time = time.time()
            try:
                # Implement business operations module integration
                result = {
                    "analysis_type": request.analysis_type,
                    "financial_metrics": {
                        "revenue_growth": "12.5%",
                        "profit_margin": "18.3%",
                        "roi": "24.7%"
                    },
                    "recommendations": [
                        "Focus on high-margin products",
                        "Optimize operational efficiency",
                        "Consider expansion opportunities"
                    ]
                }
                
                execution_time = time.time() - start_time
                return ApiResponse(
                    success=True,
                    data=result,
                    execution_time=execution_time
                )
            except Exception as e:
                logger.error(f"Financial analysis failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/business/strategic-planning", response_model=ApiResponse)
        async def create_strategy_plan(
            request: StrategyPlanningRequest,
            user: dict = Depends(get_current_user)
        ):
            start_time = time.time()
            try:
                result = {
                    "planning_horizon": request.planning_horizon,
                    "strategic_initiatives": [
                        {
                            "area": area,
                            "objectives": [f"Objective 1 for {area}", f"Objective 2 for {area}"],
                            "timeline": "Q1-Q4",
                            "resources_required": "To be determined"
                        }
                        for area in request.focus_areas
                    ],
                    "risk_assessment": {
                        "high_risks": ["Market volatility", "Competition"],
                        "mitigation_strategies": ["Diversification", "Innovation"]
                    }
                }
                
                execution_time = time.time() - start_time
                return ApiResponse(
                    success=True,
                    data=result,
                    execution_time=execution_time
                )
            except Exception as e:
                logger.error(f"Strategy planning failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # Job Management Endpoints
        @self.app.get("/api/v1/jobs/{job_id}", response_model=ApiResponse)
        async def get_job_status(
            job_id: str,
            user: dict = Depends(get_current_user)
        ):
            if job_id not in self.jobs:
                raise HTTPException(status_code=404, detail="Job not found")
            
            job = self.jobs[job_id]
            return ApiResponse(success=True, data=job)
        
        @self.app.get("/api/v1/jobs", response_model=ApiResponse)
        async def list_jobs(
            user: dict = Depends(get_current_user),
            status: Optional[str] = None,
            limit: int = 10
        ):
            jobs = list(self.jobs.values())
            
            if status:
                jobs = [job for job in jobs if job["status"] == status]
            
            jobs = jobs[:limit]
            
            return ApiResponse(success=True, data={"jobs": jobs, "total": len(jobs)})
    
    async def _process_image_generation(self, job_id: str, request: ImageGenerationRequest):
        """Background task for image generation"""
        try:
            self.jobs[job_id]["status"] = "processing"
            self.jobs[job_id]["started_at"] = datetime.utcnow()
            
            # Simulate image generation
            await asyncio.sleep(5)  # Simulate processing time
            
            result = await self.image_generation.asset_generator.generate_image(
                prompt=request.prompt,
                style=request.style,
                dimensions=request.size
            )
            
            self.jobs[job_id]["status"] = "completed"
            self.jobs[job_id]["completed_at"] = datetime.utcnow()
            self.jobs[job_id]["result"] = result
            
        except Exception as e:
            self.jobs[job_id]["status"] = "failed"
            self.jobs[job_id]["error"] = str(e)
            logger.error(f"Job {job_id} failed: {str(e)}")

def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    api = FrontierRestAPI()
    return api.app

# Development server
if __name__ == "__main__":
    app = create_app()
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3001,
        reload=True,
        log_level="info"
    )
