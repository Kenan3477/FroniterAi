"""
Authentication Middleware

JWT-based authentication system with role-based access control,
subscription tier management, and comprehensive security features.
"""

import jwt
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import logging
import hashlib
import secrets
from pathlib import Path
import json

from ..config import settings, SubscriptionTier, ErrorCodes

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()


class AuthMiddleware(BaseHTTPMiddleware):
    """Authentication middleware for JWT token validation"""
    
    def __init__(self, app):
        super().__init__(app)
        self.excluded_paths = {
            "/docs",
            "/redoc", 
            "/openapi.json",
            "/health",
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/refresh"
        }
    
    async def dispatch(self, request: Request, call_next):
        """Process authentication for each request"""
        
        # Skip authentication for excluded paths
        if request.url.path in self.excluded_paths:
            return await call_next(request)
        
        # Skip authentication if disabled
        if not settings.AUTH_ENABLED:
            return await call_next(request)
        
        try:
            # Extract and validate token
            token = self._extract_token(request)
            if not token:
                raise HTTPException(
                    status_code=401,
                    detail="Missing authentication token"
                )
            
            # Decode and validate JWT
            user_data = self._decode_jwt_token(token)
            
            # Add user data to request state
            request.state.user = user_data
            
            return await call_next(request)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )
    
    def _extract_token(self, request: Request) -> Optional[str]:
        """Extract JWT token from request headers"""
        
        # Try Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            return auth_header.split(" ")[1]
        
        # Try API key header
        api_key = request.headers.get(settings.API_KEY_HEADER)
        if api_key:
            return api_key
        
        return None
    
    def _decode_jwt_token(self, token: str) -> Dict[str, Any]:
        """Decode and validate JWT token"""
        
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            # Check token expiration
            exp_timestamp = payload.get("exp")
            if exp_timestamp and datetime.fromtimestamp(exp_timestamp) < datetime.now():
                raise HTTPException(
                    status_code=401,
                    detail="Token has expired"
                )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=401,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )


class UserManager:
    """User management system with subscription tiers and permissions"""
    
    def __init__(self):
        self.users_db_path = Path("./data/users.json")
        self.users_db_path.parent.mkdir(parents=True, exist_ok=True)
        self._load_users()
    
    def _load_users(self):
        """Load users from database"""
        try:
            if self.users_db_path.exists():
                with open(self.users_db_path, 'r') as f:
                    self.users = json.load(f)
            else:
                self.users = {}
                self._save_users()
        except Exception as e:
            logger.error(f"Error loading users: {e}")
            self.users = {}
    
    def _save_users(self):
        """Save users to database"""
        try:
            with open(self.users_db_path, 'w') as f:
                json.dump(self.users, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving users: {e}")
    
    def create_user(
        self,
        username: str,
        email: str,
        password: str,
        subscription_tier: str = SubscriptionTier.FREE,
        roles: List[str] = None
    ) -> Dict[str, Any]:
        """Create a new user"""
        
        if username in self.users:
            raise ValueError("Username already exists")
        
        # Hash password
        password_hash = self._hash_password(password)
        
        user_data = {
            "username": username,
            "email": email,
            "password_hash": password_hash,
            "subscription_tier": subscription_tier,
            "roles": roles or ["user"],
            "created_at": datetime.now().isoformat(),
            "last_login": None,
            "is_active": True,
            "api_key": self._generate_api_key(),
            "request_count": 0,
            "last_request": None
        }
        
        self.users[username] = user_data
        self._save_users()
        
        return user_data
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user with username and password"""
        
        user = self.users.get(username)
        if not user or not user.get("is_active"):
            return None
        
        if self._verify_password(password, user["password_hash"]):
            # Update last login
            user["last_login"] = datetime.now().isoformat()
            self._save_users()
            return user
        
        return None
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        return self.users.get(username)
    
    def get_user_by_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """Get user by API key"""
        for user in self.users.values():
            if user.get("api_key") == api_key:
                return user
        return None
    
    def update_user_request_count(self, username: str):
        """Update user request count"""
        if username in self.users:
            self.users[username]["request_count"] += 1
            self.users[username]["last_request"] = datetime.now().isoformat()
            self._save_users()
    
    def _hash_password(self, password: str) -> str:
        """Hash password using SHA-256"""
        salt = secrets.token_hex(16)
        password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return f"{salt}:{password_hash}"
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        try:
            salt, hash_value = password_hash.split(":")
            test_hash = hashlib.sha256((password + salt).encode()).hexdigest()
            return test_hash == hash_value
        except Exception:
            return False
    
    def _generate_api_key(self) -> str:
        """Generate a new API key"""
        return f"fba_{secrets.token_urlsafe(32)}"


class JWTManager:
    """JWT token management"""
    
    @staticmethod
    def create_access_token(user_data: Dict[str, Any]) -> str:
        """Create JWT access token"""
        
        payload = {
            "username": user_data["username"],
            "email": user_data["email"],
            "subscription_tier": user_data["subscription_tier"],
            "roles": user_data["roles"],
            "exp": datetime.now() + timedelta(hours=settings.JWT_EXPIRATION_HOURS),
            "iat": datetime.now(),
            "type": "access"
        }
        
        return jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )
    
    @staticmethod
    def create_refresh_token(user_data: Dict[str, Any]) -> str:
        """Create JWT refresh token"""
        
        payload = {
            "username": user_data["username"],
            "exp": datetime.now() + timedelta(days=30),
            "iat": datetime.now(),
            "type": "refresh"
        }
        
        return jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )
    
    @staticmethod
    def decode_token(token: str) -> Dict[str, Any]:
        """Decode JWT token"""
        
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )


class PermissionManager:
    """Role-based permission management"""
    
    PERMISSIONS = {
        "admin": [
            "read_all",
            "write_all", 
            "delete_all",
            "user_management",
            "system_management"
        ],
        "analyst": [
            "financial_analysis",
            "market_analysis", 
            "risk_assessment",
            "compliance_check"
        ],
        "manager": [
            "strategic_planning",
            "operations_consulting",
            "team_management",
            "report_generation"
        ],
        "user": [
            "basic_analysis",
            "read_reports"
        ]
    }
    
    @classmethod
    def has_permission(cls, user_roles: List[str], required_permission: str) -> bool:
        """Check if user has required permission"""
        
        user_permissions = set()
        for role in user_roles:
            user_permissions.update(cls.PERMISSIONS.get(role, []))
        
        return required_permission in user_permissions
    
    @classmethod
    def get_user_permissions(cls, user_roles: List[str]) -> List[str]:
        """Get all permissions for user roles"""
        
        permissions = set()
        for role in user_roles:
            permissions.update(cls.PERMISSIONS.get(role, []))
        
        return list(permissions)


# Global instances
user_manager = UserManager()
jwt_manager = JWTManager()
permission_manager = PermissionManager()


# Dependency functions
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current authenticated user"""
    
    if not settings.AUTH_ENABLED:
        # Return default user if auth is disabled
        return {
            "username": "default_user",
            "subscription_tier": SubscriptionTier.ENTERPRISE,
            "roles": ["admin"]
        }
    
    try:
        # Decode JWT token
        payload = jwt_manager.decode_token(credentials.credentials)
        
        # Get user data
        user = user_manager.get_user_by_username(payload["username"])
        if not user or not user.get("is_active"):
            raise HTTPException(
                status_code=401,
                detail="User not found or inactive"
            )
        
        # Update request count
        user_manager.update_user_request_count(payload["username"])
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=401,
            detail="Authentication failed"
        )


def require_permission(permission: str):
    """Decorator to require specific permission"""
    
    def decorator(func):
        async def wrapper(*args, current_user: Dict[str, Any] = Depends(get_current_user), **kwargs):
            if not permission_manager.has_permission(current_user.get("roles", []), permission):
                raise HTTPException(
                    status_code=403,
                    detail=f"Insufficient permissions. Required: {permission}"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator


def require_subscription_tier(min_tier: str):
    """Decorator to require minimum subscription tier"""
    
    tier_hierarchy = {
        SubscriptionTier.FREE: 0,
        SubscriptionTier.PROFESSIONAL: 1,
        SubscriptionTier.ENTERPRISE: 2
    }
    
    def decorator(func):
        async def wrapper(*args, current_user: Dict[str, Any] = Depends(get_current_user), **kwargs):
            user_tier = current_user.get("subscription_tier", SubscriptionTier.FREE)
            
            if tier_hierarchy.get(user_tier, 0) < tier_hierarchy.get(min_tier, 0):
                raise HTTPException(
                    status_code=403,
                    detail=f"Subscription upgrade required. Minimum tier: {min_tier}"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator
