"""
REST API Service for Frontier
FastAPI-based REST endpoints with authentication, rate limiting, and validation
"""

from fastapi import FastAPI, HTTPException, Depends, Security, status, Request, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any, Union
import jwt
import redis
import asyncpg
import asyncio
import uuid
import hashlib
import time
from datetime import datetime, timedelta
import logging
import os
from contextlib import asynccontextmanager

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://frontier:frontier@localhost:5432/frontier_api")
REDIS_URL = os.getenv("REDIS_URL", "redis://:frontier-redis@localhost:6379")
JWT_SECRET = os.getenv("JWT_SECRET", "your-jwt-secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database and Redis connections
db_pool = None
redis_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global db_pool, redis_client
    
    # Initialize database connection pool
    db_pool = await asyncpg.create_pool(DATABASE_URL)
    logger.info("Database connection pool created")
    
    # Initialize Redis connection
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    logger.info("Redis connection established")
    
    yield
    
    # Shutdown
    await db_pool.close()
    redis_client.close()
    logger.info("Connections closed")

# FastAPI app with lifespan management
app = FastAPI(
    title="Frontier REST API",
    description="Comprehensive REST API for Frontier AI capabilities",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.frontier.ai"]
)

# Security
security = HTTPBearer()

# Pydantic Models
class UserRegistration(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    company: Optional[str] = None
    tier: str = Field(default="free", regex="^(free|developer|professional|enterprise)$")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

class User(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    company: Optional[str]
    tier: str
    created_at: datetime
    rate_limits: Dict[str, Any]

class BrandIdentityRequest(BaseModel):
    business_name: str = Field(..., min_length=1)
    industry: str = Field(..., min_length=1)
    description: Optional[str] = None
    target_audience: Optional[str] = None
    style: Optional[str] = Field(None, regex="^(modern|classic|minimalist|bold|elegant)$")
    preferred_colors: Optional[List[str]] = None

class LayoutRequest(BaseModel):
    layout_type: str = Field(..., min_length=1)
    target_device: str = Field(default="responsive")
    design_system: Optional[str] = None
    content_sections: Optional[List[str]] = None
    interactive_elements: Optional[List[str]] = None

class CodeQualityScanRequest(BaseModel):
    code: str = Field(..., min_length=1)
    language: str = Field(..., min_length=1)
    file_path: Optional[str] = None
    scan_types: Optional[List[str]] = None
    include_security: bool = True

class AssetGenerationRequest(BaseModel):
    description: str = Field(..., min_length=1)
    asset_type: str = Field(..., min_length=1)
    style: Optional[str] = None
    dimensions: Optional[str] = None
    format: Optional[str] = Field(None, regex="^(png|jpg|svg|webp)$")
    color_scheme: Optional[List[str]] = None

class VideoScriptRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    duration: str = Field(..., min_length=1)
    target_audience: str = Field(..., min_length=1)
    tone: Optional[str] = None
    key_points: Optional[List[str]] = None

class VoiceoverRequest(BaseModel):
    text: str = Field(..., min_length=1)
    voice: str = Field(..., min_length=1)
    language: str = Field(default="en")
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    format: str = Field(default="mp3", regex="^(mp3|wav|aac|ogg)$")

# Utility Functions
async def get_user_from_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict[str, Any]:
    """Extract and validate user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Get user from database
        async with db_pool.acquire() as conn:
            user = await conn.fetchrow(
                "SELECT * FROM users WHERE id = $1",
                user_id
            )
            
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
            
        return dict(user)
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def check_rate_limit(user_id: str, endpoint: str) -> bool:
    """Check if user has exceeded rate limits"""
    try:
        # Get user tier and rate limits
        async with db_pool.acquire() as conn:
            user = await conn.fetchrow(
                "SELECT tier FROM users WHERE id = $1",
                user_id
            )
        
        if not user:
            return False
            
        # Rate limit configuration
        rate_limits = {
            "free": 100,
            "developer": 1000,
            "professional": 10000,
            "enterprise": float("inf")
        }
        
        limit = rate_limits.get(user["tier"], 100)
        
        if limit == float("inf"):
            return True
            
        # Check current usage
        key = f"rate_limit:{user_id}:{endpoint}:{int(time.time() // 3600)}"
        current = redis_client.get(key) or 0
        
        if int(current) >= limit:
            return False
            
        # Increment counter
        redis_client.incr(key)
        redis_client.expire(key, 3600)  # 1 hour TTL
        
        return True
        
    except Exception as e:
        logger.error(f"Rate limit check failed: {e}")
        return True  # Allow request if rate limit check fails

def create_response(success: bool, message: str, data: Any = None) -> Dict[str, Any]:
    """Create standardized API response"""
    response = {
        "success": success,
        "message": message,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if data is not None:
        response["data"] = data
        
    return response

# Authentication Endpoints
@app.post("/api/v1/auth/register", response_model=AuthResponse)
async def register_user(user_data: UserRegistration):
    """Register a new user"""
    try:
        # Check if user already exists
        async with db_pool.acquire() as conn:
            existing = await conn.fetchrow(
                "SELECT id FROM users WHERE email = $1",
                user_data.email
            )
            
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already exists"
            )
        
        # Hash password
        password_hash = hashlib.sha256(user_data.password.encode()).hexdigest()
        user_id = str(uuid.uuid4())
        
        # Insert user
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO users (id, email, password_hash, first_name, last_name, company, tier, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """,
                user_id, user_data.email, password_hash, user_data.first_name,
                user_data.last_name, user_data.company, user_data.tier, datetime.utcnow()
            )
        
        # Create JWT token
        token_payload = {
            "user_id": user_id,
            "email": user_data.email,
            "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION)
        }
        token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        return create_response(
            success=True,
            message="User registered successfully",
            data={
                "token": token,
                "user": {
                    "id": user_id,
                    "email": user_data.email,
                    "first_name": user_data.first_name,
                    "last_name": user_data.last_name,
                    "tier": user_data.tier
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@app.post("/api/v1/auth/login", response_model=AuthResponse)
async def login_user(credentials: UserLogin):
    """Authenticate user and return JWT token"""
    try:
        # Get user from database
        password_hash = hashlib.sha256(credentials.password.encode()).hexdigest()
        
        async with db_pool.acquire() as conn:
            user = await conn.fetchrow(
                "SELECT * FROM users WHERE email = $1 AND password_hash = $2",
                credentials.email, password_hash
            )
            
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Create JWT token
        token_payload = {
            "user_id": user["id"],
            "email": user["email"],
            "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION)
        }
        token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        return create_response(
            success=True,
            message="Authentication successful",
            data={
                "token": token,
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "first_name": user["first_name"],
                    "last_name": user["last_name"],
                    "tier": user["tier"]
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )

# Visual Design Endpoints
@app.post("/api/v1/visual-design/brand-identity")
async def generate_brand_identity(
    request: BrandIdentityRequest,
    user: Dict[str, Any] = Depends(get_user_from_token)
):
    """Generate brand identity package"""
    # Check rate limits
    if not await check_rate_limit(user["id"], "brand-identity"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    
    # Simulate brand identity generation
    # In reality, this would integrate with the visual design module
    brand_identity = {
        "id": str(uuid.uuid4()),
        "business_name": request.business_name,
        "logos": [
            {
                "type": "primary",
                "format": "svg",
                "url": f"https://api.frontier.ai/assets/{uuid.uuid4()}.svg"
            }
        ],
        "color_palette": {
            "primary": "#2563eb",
            "secondary": "#64748b",
            "accent": "#f59e0b"
        },
        "typography": {
            "heading": "Inter",
            "body": "Open Sans"
        },
        "created_at": datetime.utcnow().isoformat()
    }
    
    return create_response(
        success=True,
        message="Brand identity generated successfully",
        data=brand_identity
    )

@app.post("/api/v1/visual-design/layouts")
async def generate_layouts(
    request: LayoutRequest,
    user: Dict[str, Any] = Depends(get_user_from_token)
):
    """Generate responsive UI layouts"""
    if not await check_rate_limit(user["id"], "layouts"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    
    # Simulate layout generation
    layout = {
        "id": str(uuid.uuid4()),
        "name": f"{request.layout_type.title()} Layout",
        "type": request.layout_type,
        "html_structure": "<div class='container'>...</div>",
        "css_styles": ".container { max-width: 1200px; margin: 0 auto; }",
        "created_at": datetime.utcnow().isoformat()
    }
    
    return create_response(
        success=True,
        message="Layout generated successfully",
        data=layout
    )

# Code Quality Endpoints
@app.post("/api/v1/code-quality/scan")
async def scan_code_quality(
    request: CodeQualityScanRequest,
    user: Dict[str, Any] = Depends(get_user_from_token)
):
    """Scan code for quality issues"""
    if not await check_rate_limit(user["id"], "code-scan"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    
    # Simulate code quality scan
    scan_result = {
        "id": str(uuid.uuid4()),
        "issues": [
            {
                "type": "style",
                "severity": "low",
                "description": "Missing docstring",
                "line_number": 10,
                "suggestion": "Add function documentation"
            }
        ],
        "metrics": {
            "complexity": 5,
            "maintainability": 85,
            "test_coverage": 75
        },
        "created_at": datetime.utcnow().isoformat()
    }
    
    return create_response(
        success=True,
        message="Code scan completed successfully",
        data=scan_result
    )

# Image Generation Endpoints
@app.post("/api/v1/image-generation/assets")
async def generate_assets(
    request: AssetGenerationRequest,
    user: Dict[str, Any] = Depends(get_user_from_token)
):
    """Generate website assets from descriptions"""
    if not await check_rate_limit(user["id"], "image-generation"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    
    # Simulate asset generation
    assets = {
        "id": str(uuid.uuid4()),
        "images": [
            {
                "url": f"https://api.frontier.ai/assets/{uuid.uuid4()}.png",
                "format": request.format or "png",
                "width": 800,
                "height": 600
            }
        ],
        "generation_time": 2.5,
        "created_at": datetime.utcnow().isoformat()
    }
    
    return create_response(
        success=True,
        message="Assets generated successfully",
        data=assets
    )

# Audio/Video Endpoints
@app.post("/api/v1/audio-video/scripts")
async def generate_video_scripts(
    request: VideoScriptRequest,
    user: Dict[str, Any] = Depends(get_user_from_token)
):
    """Generate video scripts and storyboards"""
    if not await check_rate_limit(user["id"], "video-scripts"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    
    # Simulate script generation
    script = {
        "id": str(uuid.uuid4()),
        "title": f"Script for {request.topic}",
        "duration": request.duration,
        "scenes": [
            {
                "scene_number": 1,
                "description": "Opening scene",
                "narration": "Welcome to our presentation...",
                "duration": "30s"
            }
        ],
        "created_at": datetime.utcnow().isoformat()
    }
    
    return create_response(
        success=True,
        message="Video script generated successfully",
        data=script
    )

@app.post("/api/v1/audio-video/voiceover")
async def generate_voiceover(
    request: VoiceoverRequest,
    user: Dict[str, Any] = Depends(get_user_from_token)
):
    """Generate voiceover audio from text"""
    if not await check_rate_limit(user["id"], "voiceover"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    
    # Simulate voiceover generation
    audio = {
        "id": str(uuid.uuid4()),
        "url": f"https://api.frontier.ai/audio/{uuid.uuid4()}.{request.format}",
        "format": request.format,
        "duration": len(request.text) * 0.1,  # Rough estimate
        "created_at": datetime.utcnow().isoformat()
    }
    
    return create_response(
        success=True,
        message="Voiceover generated successfully",
        data=audio
    )

# Health Check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Custom OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="Frontier REST API",
        version="1.0.0",
        description="Comprehensive REST API for Frontier AI capabilities",
        routes=app.routes,
    )
    
    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3000,
        reload=True,
        log_level="info"
    )
