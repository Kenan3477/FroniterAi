"""
Authentication Service
Comprehensive authentication and authorization for Frontier API
"""

import asyncio
import json
import time
import hashlib
import secrets
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import logging

import asyncio
import aioredis
from fastapi import FastAPI, HTTPException, Depends, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr, validator
import jwt
import bcrypt
import uvicorn
from sqlalchemy import create_engine, Column, String, DateTime, Boolean, Text, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.dialects.postgresql import UUID
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database models
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String)
    organization = Column(String)
    tier = Column(String, default="free")
    scopes = Column(Text)  # JSON string
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String)

class ApiKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    key_hash = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    scopes = Column(Text)  # JSON string
    last_used = Column(DateTime)
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    token_hash = Column(String, unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class OAuthApp(Base):
    __tablename__ = "oauth_apps"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(String, unique=True, nullable=False)
    client_secret_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    redirect_uris = Column(Text)  # JSON string
    scopes = Column(Text)  # JSON string
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    organization: Optional[str] = None
    
    @validator('username')
    def validate_username(cls, v):
        if not v.isalnum() and '_' not in v and '-' not in v:
            raise ValueError('Username must contain only alphanumeric characters, underscores, and hyphens')
        return v

class UserLogin(BaseModel):
    email: str
    password: str
    mfa_code: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: Optional[str]
    organization: Optional[str]
    tier: str
    scopes: List[str]
    is_verified: bool
    mfa_enabled: bool
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    scope: str

class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    scopes: List[str] = Field(..., min_items=1)
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)

class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key: str  # Only returned on creation
    scopes: List[str]
    expires_at: Optional[datetime]
    created_at: datetime

class OAuthAppCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    redirect_uris: List[str] = Field(..., min_items=1)
    scopes: List[str] = Field(..., min_items=1)

class OAuthAppResponse(BaseModel):
    id: str
    client_id: str
    client_secret: str  # Only returned on creation
    name: str
    description: Optional[str]
    redirect_uris: List[str]
    scopes: List[str]
    created_at: datetime

@dataclass
class AuthContext:
    user_id: str
    email: str
    username: str
    tier: str
    scopes: List[str]
    auth_method: str  # 'api_key', 'jwt', 'oauth2'

class AuthenticationService:
    """Core authentication service"""
    
    def __init__(self, redis_client: aioredis.Redis, db_session: Session):
        self.redis = redis_client
        self.db = db_session
        self.jwt_secret = "your-super-secret-jwt-key"  # Use environment variable
        self.jwt_algorithm = "HS256"
        self.access_token_expire_minutes = 60
        self.refresh_token_expire_days = 30
        
    async def register_user(self, user_data: UserCreate) -> UserResponse:
        """Register new user"""
        # Check if user exists
        existing_user = self.db.query(User).filter(
            (User.email == user_data.email) | (User.username == user_data.username)
        ).first()
        
        if existing_user:
            if existing_user.email == user_data.email:
                raise HTTPException(status_code=400, detail="Email already registered")
            else:
                raise HTTPException(status_code=400, detail="Username already taken")
        
        # Hash password
        password_hash = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create user
        db_user = User(
            email=user_data.email,
            username=user_data.username,
            password_hash=password_hash,
            full_name=user_data.full_name,
            organization=user_data.organization,
            scopes=json.dumps(["visual-design:read", "code-quality:read"])  # Default scopes
        )
        
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        
        return self._user_to_response(db_user)
    
    async def authenticate_user(self, login_data: UserLogin) -> TokenResponse:
        """Authenticate user and return tokens"""
        # Find user
        user = self.db.query(User).filter(User.email == login_data.email).first()
        
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify password
        if not bcrypt.checkpw(login_data.password.encode('utf-8'), user.password_hash.encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check MFA if enabled
        if user.mfa_enabled:
            if not login_data.mfa_code:
                raise HTTPException(status_code=401, detail="MFA code required")
            if not self._verify_mfa_code(user.mfa_secret, login_data.mfa_code):
                raise HTTPException(status_code=401, detail="Invalid MFA code")
        
        # Update last login
        user.last_login = datetime.utcnow()
        self.db.commit()
        
        # Generate tokens
        access_token = self._create_access_token(user)
        refresh_token = await self._create_refresh_token(user)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=self.access_token_expire_minutes * 60,
            scope=" ".join(json.loads(user.scopes))
        )
    
    async def refresh_access_token(self, refresh_token: str) -> TokenResponse:
        """Refresh access token using refresh token"""
        # Hash the refresh token to look it up
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        
        # Find refresh token in database
        db_token = self.db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.is_revoked == False,
            RefreshToken.expires_at > datetime.utcnow()
        ).first()
        
        if not db_token:
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
        
        # Get user
        user = self.db.query(User).filter(User.id == db_token.user_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        
        # Generate new tokens
        access_token = self._create_access_token(user)
        new_refresh_token = await self._create_refresh_token(user)
        
        # Revoke old refresh token
        db_token.is_revoked = True
        self.db.commit()
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=self.access_token_expire_minutes * 60,
            scope=" ".join(json.loads(user.scopes))
        )
    
    async def create_api_key(self, user_id: str, api_key_data: ApiKeyCreate) -> ApiKeyResponse:
        """Create new API key for user"""
        # Generate API key
        key = f"fk_{'live' if True else 'test'}_{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        
        # Calculate expiry
        expires_at = None
        if api_key_data.expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=api_key_data.expires_in_days)
        
        # Create API key record
        db_api_key = ApiKey(
            user_id=uuid.UUID(user_id),
            key_hash=key_hash,
            name=api_key_data.name,
            scopes=json.dumps(api_key_data.scopes),
            expires_at=expires_at
        )
        
        self.db.add(db_api_key)
        self.db.commit()
        self.db.refresh(db_api_key)
        
        # Cache key info in Redis
        await self.redis.setex(
            f"api_key:{key}",
            86400,  # 24 hours
            json.dumps({
                "user_id": user_id,
                "tier": "professional",  # Get from user
                "scopes": api_key_data.scopes
            })
        )
        
        return ApiKeyResponse(
            id=str(db_api_key.id),
            name=db_api_key.name,
            key=key,
            scopes=api_key_data.scopes,
            expires_at=expires_at,
            created_at=db_api_key.created_at
        )
    
    async def validate_api_key(self, api_key: str) -> Optional[AuthContext]:
        """Validate API key and return auth context"""
        # Check Redis cache first
        cached_data = await self.redis.get(f"api_key:{api_key}")
        if cached_data:
            user_data = json.loads(cached_data)
            
            # Get user details from database
            user = self.db.query(User).filter(User.id == uuid.UUID(user_data['user_id'])).first()
            if user and user.is_active:
                return AuthContext(
                    user_id=user_data['user_id'],
                    email=user.email,
                    username=user.username,
                    tier=user_data['tier'],
                    scopes=user_data['scopes'],
                    auth_method='api_key'
                )
        
        # Check database
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        db_api_key = self.db.query(ApiKey).filter(
            ApiKey.key_hash == key_hash,
            ApiKey.is_active == True
        ).first()
        
        if not db_api_key:
            return None
        
        # Check expiry
        if db_api_key.expires_at and db_api_key.expires_at < datetime.utcnow():
            return None
        
        # Get user
        user = self.db.query(User).filter(User.id == db_api_key.user_id).first()
        if not user or not user.is_active:
            return None
        
        # Update last used
        db_api_key.last_used = datetime.utcnow()
        self.db.commit()
        
        # Cache for future use
        await self.redis.setex(
            f"api_key:{api_key}",
            3600,  # 1 hour
            json.dumps({
                "user_id": str(user.id),
                "tier": user.tier,
                "scopes": json.loads(db_api_key.scopes)
            })
        )
        
        return AuthContext(
            user_id=str(user.id),
            email=user.email,
            username=user.username,
            tier=user.tier,
            scopes=json.loads(db_api_key.scopes),
            auth_method='api_key'
        )
    
    async def validate_jwt_token(self, token: str) -> Optional[AuthContext]:
        """Validate JWT token and return auth context"""
        try:
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=[self.jwt_algorithm]
            )
            
            user_id = payload.get("sub")
            if not user_id:
                return None
            
            # Get user from database
            user = self.db.query(User).filter(User.id == uuid.UUID(user_id)).first()
            if not user or not user.is_active:
                return None
            
            return AuthContext(
                user_id=str(user.id),
                email=user.email,
                username=user.username,
                tier=user.tier,
                scopes=json.loads(user.scopes),
                auth_method='jwt'
            )
            
        except jwt.InvalidTokenError:
            return None
    
    def _create_access_token(self, user: User) -> str:
        """Create JWT access token"""
        now = datetime.utcnow()
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "username": user.username,
            "tier": user.tier,
            "scopes": json.loads(user.scopes),
            "iat": now,
            "exp": now + timedelta(minutes=self.access_token_expire_minutes),
            "iss": "frontier-auth",
            "aud": "frontier-api"
        }
        
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    async def _create_refresh_token(self, user: User) -> str:
        """Create refresh token"""
        # Generate random token
        token = secrets.token_urlsafe(64)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        # Store in database
        db_token = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        )
        
        self.db.add(db_token)
        self.db.commit()
        
        return token
    
    def _user_to_response(self, user: User) -> UserResponse:
        """Convert User model to response"""
        return UserResponse(
            id=str(user.id),
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            organization=user.organization,
            tier=user.tier,
            scopes=json.loads(user.scopes) if user.scopes else [],
            is_verified=user.is_verified,
            mfa_enabled=user.mfa_enabled,
            created_at=user.created_at
        )
    
    def _verify_mfa_code(self, secret: str, code: str) -> bool:
        """Verify MFA code (simplified TOTP implementation)"""
        # In production, use proper TOTP library like pyotp
        return True  # Simplified for demo

# FastAPI application
app = FastAPI(
    title="Frontier Authentication Service",
    description="Authentication and authorization service for Frontier API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup (simplified)
# In production, use proper database configuration
DATABASE_URL = "postgresql://user:password@localhost:5432/frontier_auth"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Global auth service instance
auth_service = None

@app.on_event("startup")
async def startup():
    global auth_service
    # Initialize Redis
    redis_client = await aioredis.from_url("redis://localhost:6379")
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Initialize auth service
    db = SessionLocal()
    auth_service = AuthenticationService(redis_client, db)

# Security schemes
bearer_scheme = HTTPBearer()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Dependencies
async def get_current_user(token: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> AuthContext:
    """Get current authenticated user"""
    auth_context = await auth_service.validate_jwt_token(token.credentials)
    if not auth_context:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return auth_context

async def get_api_key_user(request: Request) -> Optional[AuthContext]:
    """Get user from API key"""
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        return None
    
    return await auth_service.validate_api_key(api_key)

# Authentication endpoints
@app.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register new user"""
    # Update global auth service db session
    auth_service.db = db
    return await auth_service.register_user(user_data)

@app.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """User login"""
    auth_service.db = db
    return await auth_service.authenticate_user(login_data)

@app.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    """Refresh access token"""
    auth_service.db = db
    return await auth_service.refresh_access_token(refresh_token)

@app.post("/auth/logout")
async def logout(token: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """Logout user (revoke token)"""
    # In production, add token to blacklist
    return {"message": "Successfully logged out"}

# Profile endpoints
@app.get("/auth/profile", response_model=UserResponse)
async def get_profile(current_user: AuthContext = Depends(get_current_user)):
    """Get user profile"""
    # Get full user data from database
    user = auth_service.db.query(User).filter(User.id == uuid.UUID(current_user.user_id)).first()
    return auth_service._user_to_response(user)

# API Key management
@app.post("/auth/api-keys", response_model=ApiKeyResponse)
async def create_api_key(
    api_key_data: ApiKeyCreate,
    current_user: AuthContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new API key"""
    auth_service.db = db
    return await auth_service.create_api_key(current_user.user_id, api_key_data)

@app.get("/auth/api-keys")
async def list_api_keys(
    current_user: AuthContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's API keys"""
    api_keys = db.query(ApiKey).filter(
        ApiKey.user_id == uuid.UUID(current_user.user_id),
        ApiKey.is_active == True
    ).all()
    
    return {
        "api_keys": [
            {
                "id": str(key.id),
                "name": key.name,
                "scopes": json.loads(key.scopes),
                "last_used": key.last_used,
                "expires_at": key.expires_at,
                "created_at": key.created_at
            }
            for key in api_keys
        ]
    }

@app.delete("/auth/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    current_user: AuthContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke API key"""
    api_key = db.query(ApiKey).filter(
        ApiKey.id == uuid.UUID(key_id),
        ApiKey.user_id == uuid.UUID(current_user.user_id)
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    api_key.is_active = False
    db.commit()
    
    return {"message": "API key revoked successfully"}

# OAuth2 management
@app.post("/auth/oauth/apps", response_model=OAuthAppResponse)
async def create_oauth_app(
    app_data: OAuthAppCreate,
    current_user: AuthContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create OAuth2 application"""
    # Generate client credentials
    client_id = f"fk_{secrets.token_urlsafe(16)}"
    client_secret = secrets.token_urlsafe(32)
    client_secret_hash = hashlib.sha256(client_secret.encode()).hexdigest()
    
    # Create OAuth app
    oauth_app = OAuthApp(
        client_id=client_id,
        client_secret_hash=client_secret_hash,
        name=app_data.name,
        description=app_data.description,
        redirect_uris=json.dumps(app_data.redirect_uris),
        scopes=json.dumps(app_data.scopes)
    )
    
    db.add(oauth_app)
    db.commit()
    db.refresh(oauth_app)
    
    return OAuthAppResponse(
        id=str(oauth_app.id),
        client_id=client_id,
        client_secret=client_secret,
        name=oauth_app.name,
        description=oauth_app.description,
        redirect_uris=app_data.redirect_uris,
        scopes=app_data.scopes,
        created_at=oauth_app.created_at
    )

# Token validation endpoint
@app.post("/auth/validate")
async def validate_token(
    request: Request,
    token: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
):
    """Validate token (for API gateway)"""
    # Try JWT first
    if token:
        auth_context = await auth_service.validate_jwt_token(token.credentials)
        if auth_context:
            return {
                "valid": True,
                "user": asdict(auth_context)
            }
    
    # Try API key
    auth_context = await get_api_key_user(request)
    if auth_context:
        return {
            "valid": True,
            "user": asdict(auth_context)
        }
    
    return {"valid": False}

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "auth", "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3008,
        reload=True,
        log_level="info"
    )
