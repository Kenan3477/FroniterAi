"""
Authentication Middleware Integration

Main authentication middleware that integrates JWT management, 
user management, RBAC, rate limiting, and input validation.
"""

from fastapi import FastAPI, Request, HTTPException, Depends, status
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional, List, Callable
import logging
import time
import json
from datetime import datetime

from .jwt_manager import JWTManager
from .user_manager import UserManager
from .rbac import RBACManager, require_permission, require_role
from .rate_limiter import RateLimitMiddleware
from .validators import (
    input_sanitizer, 
    data_validator, 
    validate_request_security,
    ValidationError
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security headers for production
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'",
    "Referrer-Policy": "strict-origin-when-cross-origin"
}


class AuthenticationManager:
    """Main authentication manager coordinating all auth components"""
    
    def __init__(self, 
                 redis_url: str = "redis://localhost:6379",
                 database_url: str = None,
                 secret_key: str = None,
                 algorithm: str = "HS256",
                 access_token_expire_minutes: int = 30,
                 refresh_token_expire_days: int = 30):
        
        self.jwt_manager = JWTManager(
            secret_key=secret_key,
            algorithm=algorithm,
            access_token_expire_minutes=access_token_expire_minutes,
            refresh_token_expire_days=refresh_token_expire_days,
            redis_url=redis_url
        )
        
        self.user_manager = UserManager(
            jwt_manager=self.jwt_manager,
            database_url=database_url
        )
        
        self.rbac_manager = RBACManager(database_url=database_url)
        
        # HTTP Bearer for token extraction
        self.bearer_scheme = HTTPBearer(auto_error=False)
    
    async def initialize(self):
        """Initialize all components"""
        await self.jwt_manager.initialize()
        await self.user_manager.initialize()
        await self.rbac_manager.initialize()
        logger.info("Authentication system initialized")
    
    async def cleanup(self):
        """Cleanup resources"""
        await self.jwt_manager.cleanup()
        await self.user_manager.cleanup()
        await self.rbac_manager.cleanup()
        logger.info("Authentication system cleaned up")
    
    async def authenticate_request(self, request: Request) -> Optional[Dict[str, Any]]:
        """Authenticate a request and return user context"""
        try:
            # Try JWT token first
            auth_header = request.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                payload = await self.jwt_manager.validate_token(token)
                if payload:
                    user = await self.user_manager.get_user_by_id(payload["user_id"])
                    if user:
                        return {
                            "user_id": user.id,
                            "username": user.username,
                            "email": user.email,
                            "subscription_tier": user.subscription_tier,
                            "roles": [role.name for role in user.roles],
                            "permissions": await self.rbac_manager.get_user_permissions(user.id),
                            "auth_type": "jwt"
                        }
            
            # Try API key
            api_key = request.headers.get("x-api-key")
            if api_key:
                user = await self.user_manager.get_user_by_api_key(api_key)
                if user:
                    return {
                        "user_id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "subscription_tier": user.subscription_tier,
                        "roles": [role.name for role in user.roles],
                        "permissions": await self.rbac_manager.get_user_permissions(user.id),
                        "auth_type": "api_key"
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return None
    
    def get_current_user(self) -> Callable:
        """FastAPI dependency to get current authenticated user"""
        async def _get_current_user(request: Request):
            user_context = await self.authenticate_request(request)
            if not user_context:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required",
                    headers={"WWW-Authenticate": "Bearer"}
                )
            return user_context
        
        return _get_current_user
    
    def get_optional_user(self) -> Callable:
        """FastAPI dependency to get current user if authenticated"""
        async def _get_optional_user(request: Request):
            return await self.authenticate_request(request)
        
        return _get_optional_user
    
    def require_subscription_tier(self, required_tier: str) -> Callable:
        """FastAPI dependency to require minimum subscription tier"""
        tier_hierarchy = {"basic": 0, "professional": 1, "enterprise": 2}
        
        async def _require_tier(user_context: Dict = Depends(self.get_current_user())):
            user_tier_level = tier_hierarchy.get(user_context["subscription_tier"], 0)
            required_tier_level = tier_hierarchy.get(required_tier, 0)
            
            if user_tier_level < required_tier_level:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Subscription tier '{required_tier}' or higher required"
                )
            
            return user_context
        
        return _require_tier


class SecurityMiddleware(BaseHTTPMiddleware):
    """Comprehensive security middleware"""
    
    def __init__(self, app: FastAPI, auth_manager: AuthenticationManager):
        super().__init__(app)
        self.auth_manager = auth_manager
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        try:
            # Add security headers
            response = await call_next(request)
            
            # Add security headers to response
            for header, value in SECURITY_HEADERS.items():
                response.headers[header] = value
            
            # Add request timing
            process_time = time.time() - start_time
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as e:
            logger.error(f"Security middleware error: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"}
            )


class InputValidationMiddleware(BaseHTTPMiddleware):
    """Input validation and sanitization middleware"""
    
    def __init__(self, app: FastAPI, validate_all_requests: bool = True):
        super().__init__(app)
        self.validate_all_requests = validate_all_requests
        self.skip_validation_paths = {"/docs", "/openapi.json", "/redoc"}
    
    async def dispatch(self, request: Request, call_next):
        # Skip validation for certain paths
        if request.url.path in self.skip_validation_paths:
            return await call_next(request)
        
        try:
            # Validate and sanitize request body if present
            if request.method in ["POST", "PUT", "PATCH"]:
                content_type = request.headers.get("content-type", "")
                
                if "application/json" in content_type:
                    body = await request.body()
                    if body:
                        try:
                            data = json.loads(body)
                            
                            if self.validate_all_requests:
                                # Validate for security threats
                                validated_data = validate_request_security(data)
                                
                                # Replace request body with sanitized data
                                sanitized_body = json.dumps(validated_data).encode()
                                
                                # Create new request with sanitized body
                                async def receive():
                                    return {
                                        "type": "http.request",
                                        "body": sanitized_body,
                                        "more_body": False
                                    }
                                
                                # Update request
                                request._receive = receive
                                
                        except (json.JSONDecodeError, ValidationError) as e:
                            logger.warning(f"Input validation failed: {str(e)}")
                            return JSONResponse(
                                status_code=400,
                                content={"detail": f"Invalid input: {str(e)}"}
                            )
            
            return await call_next(request)
            
        except Exception as e:
            logger.error(f"Input validation middleware error: {str(e)}")
            return JSONResponse(
                status_code=400,
                content={"detail": "Invalid request format"}
            )


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    """Audit logging middleware for security monitoring"""
    
    def __init__(self, app: FastAPI, auth_manager: AuthenticationManager):
        super().__init__(app)
        self.auth_manager = auth_manager
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Get user context if available
        user_context = await self.auth_manager.authenticate_request(request)
        
        # Log request
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "method": request.method,
            "path": str(request.url.path),
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "user_id": user_context.get("user_id") if user_context else None,
            "auth_type": user_context.get("auth_type") if user_context else None
        }
        
        # Process request
        response = await call_next(request)
        
        # Log response
        process_time = time.time() - start_time
        log_data.update({
            "status_code": response.status_code,
            "process_time": process_time
        })
        
        # Log based on sensitivity
        if response.status_code >= 400:
            logger.warning(f"Request failed: {json.dumps(log_data)}")
        elif user_context:
            logger.info(f"Authenticated request: {json.dumps(log_data)}")
        else:
            logger.debug(f"Request: {json.dumps(log_data)}")
        
        return response


def setup_authentication(app: FastAPI, 
                        redis_url: str = "redis://localhost:6379",
                        database_url: str = None,
                        secret_key: str = None,
                        enable_rate_limiting: bool = True,
                        enable_input_validation: bool = True,
                        enable_audit_logging: bool = True) -> AuthenticationManager:
    """
    Setup complete authentication system for FastAPI app
    
    Args:
        app: FastAPI application instance
        redis_url: Redis connection URL
        database_url: Database connection URL
        secret_key: JWT secret key
        enable_rate_limiting: Enable rate limiting middleware
        enable_input_validation: Enable input validation middleware
        enable_audit_logging: Enable audit logging middleware
    
    Returns:
        AuthenticationManager instance
    """
    
    # Create authentication manager
    auth_manager = AuthenticationManager(
        redis_url=redis_url,
        database_url=database_url,
        secret_key=secret_key
    )
    
    # Add middlewares in reverse order (last added = first executed)
    
    # Audit logging (last)
    if enable_audit_logging:
        app.add_middleware(AuditLoggingMiddleware, auth_manager=auth_manager)
    
    # Security headers
    app.add_middleware(SecurityMiddleware, auth_manager=auth_manager)
    
    # Input validation
    if enable_input_validation:
        app.add_middleware(InputValidationMiddleware)
    
    # Rate limiting (first)
    if enable_rate_limiting:
        app.add_middleware(RateLimitMiddleware, auth_manager=auth_manager)
    
    # Add startup/shutdown events
    @app.on_event("startup")
    async def startup_event():
        await auth_manager.initialize()
    
    @app.on_event("shutdown")
    async def shutdown_event():
        await auth_manager.cleanup()
    
    # Store auth manager in app state
    app.state.auth_manager = auth_manager
    
    logger.info("Authentication system setup complete")
    return auth_manager


# Convenience exports for common dependencies
def get_auth_manager(request: Request) -> AuthenticationManager:
    """Get authentication manager from app state"""
    return request.app.state.auth_manager


def require_auth(request: Request):
    """Require authentication dependency"""
    auth_manager = get_auth_manager(request)
    return auth_manager.get_current_user()


def optional_auth(request: Request):
    """Optional authentication dependency"""
    auth_manager = get_auth_manager(request)
    return auth_manager.get_optional_user()


def require_basic_tier(request: Request):
    """Require basic subscription tier"""
    auth_manager = get_auth_manager(request)
    return auth_manager.require_subscription_tier("basic")


def require_professional_tier(request: Request):
    """Require professional subscription tier"""
    auth_manager = get_auth_manager(request)
    return auth_manager.require_subscription_tier("professional")


def require_enterprise_tier(request: Request):
    """Require enterprise subscription tier"""
    auth_manager = get_auth_manager(request)
    return auth_manager.require_subscription_tier("enterprise")
