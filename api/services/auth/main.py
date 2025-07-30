"""
Authentication Service for Frontier API
Handles JWT tokens, OAuth2, OIDC, and API key management
"""

from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2AuthorizationCodeBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List
import jwt
import redis
import asyncpg
import hashlib
import uuid
import time
import httpx
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
REFRESH_TOKEN_EXPIRATION = int(os.getenv("REFRESH_TOKEN_EXPIRATION_DAYS", "7"))

# OAuth Configuration
OAUTH_CLIENT_ID = os.getenv("OAUTH_CLIENT_ID")
OAUTH_CLIENT_SECRET = os.getenv("OAUTH_CLIENT_SECRET")
OAUTH_REDIRECT_URI = os.getenv("OAUTH_REDIRECT_URI", "http://localhost:3001/auth/callback")

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
    
    db_pool = await asyncpg.create_pool(DATABASE_URL)
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    logger.info("Auth service connections established")
    
    yield
    
    # Shutdown
    await db_pool.close()
    redis_client.close()
    logger.info("Auth service connections closed")

app = FastAPI(
    title="Frontier Auth Service",
    description="Authentication and authorization service for Frontier API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Pydantic Models
class TokenRequest(BaseModel):
    grant_type: str = Field(..., regex="^(password|authorization_code|refresh_token|client_credentials)$")
    username: Optional[str] = None
    password: Optional[str] = None
    refresh_token: Optional[str] = None
    code: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    scope: Optional[str] = None

class APIKeyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    scopes: Optional[List[str]] = None
    expires_at: Optional[datetime] = None

class APIKeyResponse(BaseModel):
    id: str
    name: str
    key: str
    scopes: List[str]
    created_at: datetime
    expires_at: Optional[datetime]
    last_used: Optional[datetime]

class UserInfo(BaseModel):
    sub: str
    email: str
    name: str
    given_name: str
    family_name: str
    picture: Optional[str] = None
    email_verified: bool = False

# Utility Functions
def generate_jwt_token(user_id: str, email: str, scopes: List[str] = None) -> str:
    """Generate JWT access token"""
    payload = {
        "user_id": user_id,
        "email": email,
        "scopes": scopes or [],
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION),
        "iat": datetime.utcnow(),
        "iss": "frontier-auth"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def generate_refresh_token(user_id: str) -> str:
    """Generate refresh token"""
    payload = {
        "user_id": user_id,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRATION),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def generate_api_key() -> str:
    """Generate API key"""
    return f"fk_{uuid.uuid4().hex}"

async def verify_jwt_token(token: str) -> Dict[str, Any]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Check if token is blacklisted
        if redis_client.get(f"blacklist:{token}"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked"
            )
        
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def verify_api_key(api_key: str) -> Dict[str, Any]:
    """Verify API key and return user info"""
    try:
        async with db_pool.acquire() as conn:
            key_info = await conn.fetchrow(
                """
                SELECT ak.*, u.id as user_id, u.email, u.tier 
                FROM api_keys ak
                JOIN users u ON ak.user_id = u.id
                WHERE ak.key_hash = $1 AND ak.is_active = true
                AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
                """,
                hashlib.sha256(api_key.encode()).hexdigest()
            )
            
        if not key_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key"
            )
        
        # Update last used timestamp
        async with db_pool.acquire() as conn:
            await conn.execute(
                "UPDATE api_keys SET last_used = NOW() WHERE id = $1",
                key_info["id"]
            )
        
        return dict(key_info)
        
    except Exception as e:
        logger.error(f"API key verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key verification failed"
        )

# Authentication Endpoints
@app.post("/token", response_model=TokenResponse)
async def create_token(request: TokenRequest):
    """OAuth2 token endpoint - supports multiple grant types"""
    
    if request.grant_type == "password":
        # Resource Owner Password Credentials Grant
        if not request.username or not request.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username and password required"
            )
        
        # Verify credentials
        password_hash = hashlib.sha256(request.password.encode()).hexdigest()
        async with db_pool.acquire() as conn:
            user = await conn.fetchrow(
                "SELECT * FROM users WHERE email = $1 AND password_hash = $2",
                request.username, password_hash
            )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Generate tokens
        access_token = generate_jwt_token(user["id"], user["email"])
        refresh_token = generate_refresh_token(user["id"])
        
        return TokenResponse(
            access_token=access_token,
            expires_in=JWT_EXPIRATION * 3600,
            refresh_token=refresh_token
        )
    
    elif request.grant_type == "refresh_token":
        # Refresh Token Grant
        if not request.refresh_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refresh token required"
            )
        
        try:
            payload = jwt.decode(request.refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token"
                )
            
            user_id = payload["user_id"]
            
            # Get user info
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
            
            # Generate new access token
            access_token = generate_jwt_token(user["id"], user["email"])
            
            return TokenResponse(
                access_token=access_token,
                expires_in=JWT_EXPIRATION * 3600
            )
            
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
    
    elif request.grant_type == "client_credentials":
        # Client Credentials Grant (for service-to-service auth)
        if not request.client_id or not request.client_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client credentials required"
            )
        
        # Verify client credentials
        async with db_pool.acquire() as conn:
            client = await conn.fetchrow(
                "SELECT * FROM oauth_clients WHERE client_id = $1 AND client_secret = $2",
                request.client_id, request.client_secret
            )
        
        if not client:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid client credentials"
            )
        
        # Generate access token for client
        access_token = generate_jwt_token(client["client_id"], client["name"], ["service"])
        
        return TokenResponse(
            access_token=access_token,
            expires_in=JWT_EXPIRATION * 3600
        )
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported grant type"
        )

@app.get("/userinfo", response_model=UserInfo)
async def get_user_info(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get user information from token (OpenID Connect UserInfo endpoint)"""
    token = credentials.credentials
    payload = await verify_jwt_token(token)
    
    user_id = payload["user_id"]
    
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT * FROM users WHERE id = $1",
            user_id
        )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserInfo(
        sub=user["id"],
        email=user["email"],
        name=f"{user['first_name']} {user['last_name']}",
        given_name=user["first_name"],
        family_name=user["last_name"],
        email_verified=True
    )

@app.post("/revoke")
async def revoke_token(
    token: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Revoke a token (add to blacklist)"""
    # Verify the revoking user has permission
    payload = await verify_jwt_token(credentials.credentials)
    
    # Add token to blacklist
    redis_client.set(f"blacklist:{token}", "1", ex=JWT_EXPIRATION * 3600)
    
    return {"message": "Token revoked successfully"}

# API Key Management
@app.post("/api-keys", response_model=APIKeyResponse)
async def create_api_key(
    request: APIKeyRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new API key"""
    payload = await verify_jwt_token(credentials.credentials)
    user_id = payload["user_id"]
    
    # Generate API key
    api_key = generate_api_key()
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    key_id = str(uuid.uuid4())
    
    # Store API key
    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO api_keys (id, user_id, name, description, key_hash, scopes, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            key_id, user_id, request.name, request.description,
            key_hash, request.scopes or [], request.expires_at, datetime.utcnow()
        )
    
    return APIKeyResponse(
        id=key_id,
        name=request.name,
        key=api_key,  # Only returned on creation
        scopes=request.scopes or [],
        created_at=datetime.utcnow(),
        expires_at=request.expires_at
    )

@app.get("/api-keys")
async def list_api_keys(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """List user's API keys"""
    payload = await verify_jwt_token(credentials.credentials)
    user_id = payload["user_id"]
    
    async with db_pool.acquire() as conn:
        keys = await conn.fetch(
            "SELECT id, name, description, scopes, created_at, expires_at, last_used FROM api_keys WHERE user_id = $1 AND is_active = true",
            user_id
        )
    
    return [dict(key) for key in keys]

@app.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Revoke an API key"""
    payload = await verify_jwt_token(credentials.credentials)
    user_id = payload["user_id"]
    
    async with db_pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2",
            key_id, user_id
        )
    
    if result == "UPDATE 0":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    return {"message": "API key revoked successfully"}

# OAuth2 Authorization Code Flow (for third-party integrations)
@app.get("/authorize")
async def authorize(
    client_id: str,
    redirect_uri: str,
    response_type: str = "code",
    scope: str = "openid email profile",
    state: Optional[str] = None
):
    """OAuth2 authorization endpoint"""
    # Validate client
    async with db_pool.acquire() as conn:
        client = await conn.fetchrow(
            "SELECT * FROM oauth_clients WHERE client_id = $1",
            client_id
        )
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid client_id"
        )
    
    # Generate authorization code
    auth_code = str(uuid.uuid4())
    
    # Store authorization code
    redis_client.setex(
        f"auth_code:{auth_code}",
        600,  # 10 minutes
        f"{client_id}:{redirect_uri}:{scope}"
    )
    
    # Redirect to authorization page (simplified)
    return {
        "authorization_url": f"/consent?code={auth_code}&state={state}",
        "code": auth_code
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "auth"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3001,
        reload=True
    )
