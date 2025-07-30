"""
Authentication System Configuration and Examples

This file demonstrates how to use the comprehensive authentication system
with FastAPI applications.
"""

import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from typing import Dict, List, Optional
import asyncio

# Import our authentication system
from api.middleware.auth import (
    setup_authentication,
    require_auth,
    optional_auth,
    require_basic_tier,
    require_professional_tier,
    require_enterprise_tier,
    require_permission,
    require_role
)
from api.middleware.auth.validators import (
    UserRegistrationModel,
    FinancialAnalysisModel,
    APIKeyModel,
    ValidationError
)

# Example FastAPI application setup
app = FastAPI(
    title="Frontier Financial API",
    description="Comprehensive financial analysis platform with advanced authentication",
    version="1.0.0"
)

# Configuration from environment variables
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./frontier.db")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")

# Setup authentication system
auth_manager = setup_authentication(
    app=app,
    redis_url=REDIS_URL,
    database_url=DATABASE_URL,
    secret_key=SECRET_KEY,
    enable_rate_limiting=True,
    enable_input_validation=True,
    enable_audit_logging=True
)

# Example routes demonstrating different authentication levels

@app.post("/api/auth/register")
async def register_user(user_data: UserRegistrationModel):
    """
    User registration with comprehensive input validation
    
    This endpoint demonstrates:
    - Input validation and sanitization
    - Password strength requirements
    - Email validation
    - Username validation
    """
    try:
        user = await auth_manager.user_manager.create_user(
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            subscription_tier=user_data.subscription_tier
        )
        
        return {
            "message": "User registered successfully",
            "user_id": user.id,
            "username": user.username
        }
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Registration failed")


@app.post("/api/auth/login")
async def login_user(username: str, password: str):
    """
    User login with JWT token generation
    
    Returns access and refresh tokens
    """
    try:
        user = await auth_manager.user_manager.authenticate_user(username, password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Generate tokens
        access_token = await auth_manager.jwt_manager.create_access_token(
            user_id=user.id,
            username=user.username,
            subscription_tier=user.subscription_tier
        )
        
        refresh_token = await auth_manager.jwt_manager.create_refresh_token(user.id)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "subscription_tier": user.subscription_tier
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Login failed")


@app.post("/api/auth/refresh")
async def refresh_token(refresh_token: str):
    """Refresh access token using refresh token"""
    try:
        new_access_token = await auth_manager.jwt_manager.refresh_access_token(refresh_token)
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@app.post("/api/auth/logout")
async def logout_user(user: Dict = Depends(require_auth)):
    """Logout user and revoke tokens"""
    try:
        # Revoke all user tokens
        await auth_manager.jwt_manager.revoke_all_user_tokens(user["user_id"])
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Logout failed")


# Public endpoint (no authentication required)
@app.get("/api/public/status")
async def public_status():
    """Public endpoint accessible without authentication"""
    return {
        "status": "online",
        "message": "Frontier Financial API is running",
        "version": "1.0.0"
    }


# Protected endpoint (authentication required)
@app.get("/api/user/profile")
async def get_user_profile(user: Dict = Depends(require_auth)):
    """
    Get user profile (authentication required)
    
    This endpoint demonstrates:
    - JWT token validation
    - User context extraction
    """
    return {
        "user_id": user["user_id"],
        "username": user["username"],
        "email": user["email"],
        "subscription_tier": user["subscription_tier"],
        "roles": user["roles"],
        "permissions": user["permissions"]
    }


# Subscription tier-based access
@app.get("/api/analysis/basic")
async def basic_analysis(user: Dict = Depends(require_basic_tier)):
    """Basic financial analysis (Basic tier or higher)"""
    return {
        "message": "Basic analysis available",
        "features": ["basic_ratios", "simple_charts"],
        "user_tier": user["subscription_tier"]
    }


@app.get("/api/analysis/advanced")
async def advanced_analysis(user: Dict = Depends(require_professional_tier)):
    """Advanced financial analysis (Professional tier or higher)"""
    return {
        "message": "Advanced analysis available",
        "features": ["advanced_ratios", "predictive_models", "custom_charts"],
        "user_tier": user["subscription_tier"]
    }


@app.get("/api/analysis/enterprise")
async def enterprise_analysis(user: Dict = Depends(require_enterprise_tier)):
    """Enterprise financial analysis (Enterprise tier only)"""
    return {
        "message": "Enterprise analysis available",
        "features": ["ai_insights", "bulk_processing", "api_access", "white_labeling"],
        "user_tier": user["subscription_tier"]
    }


# Role-based access control
@app.get("/api/admin/users")
async def list_users(user: Dict = Depends(require_role("admin"))):
    """List all users (Admin role required)"""
    return {
        "message": "User list access granted",
        "note": "This endpoint requires admin role"
    }


# Permission-based access control
@app.post("/api/admin/financial-data")
async def create_financial_data(
    data: FinancialAnalysisModel,
    user: Dict = Depends(require_permission("create_financial_data"))
):
    """
    Create financial data (specific permission required)
    
    This endpoint demonstrates:
    - Permission-based access control
    - Complex input validation
    - Financial data validation
    """
    return {
        "message": "Financial data created",
        "company": data.company_name,
        "industry": data.industry,
        "analysis_period": data.analysis_period,
        "created_by": user["username"]
    }


# API Key authentication for enterprise clients
@app.post("/api/enterprise/api-keys")
async def create_api_key(
    api_key_data: APIKeyModel,
    user: Dict = Depends(require_enterprise_tier)
):
    """
    Create API key for enterprise users
    
    This endpoint demonstrates:
    - Subscription tier restrictions
    - API key management
    """
    try:
        api_key = await auth_manager.user_manager.create_api_key(
            user_id=user["user_id"],
            name=api_key_data.name,
            permissions=api_key_data.permissions
        )
        
        return {
            "message": "API key created",
            "api_key": api_key.key,
            "name": api_key.name,
            "created_at": api_key.created_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="API key creation failed")


# Endpoint using API key authentication
@app.get("/api/enterprise/bulk-analysis")
async def bulk_analysis(user: Dict = Depends(optional_auth)):
    """
    Bulk analysis endpoint supporting both JWT and API key authentication
    
    This endpoint demonstrates:
    - Multiple authentication methods
    - Optional authentication
    - Different response based on auth type
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if user["subscription_tier"] != "enterprise":
        raise HTTPException(status_code=403, detail="Enterprise subscription required")
    
    return {
        "message": "Bulk analysis access granted",
        "auth_type": user["auth_type"],
        "features": ["batch_processing", "concurrent_analysis", "priority_queue"],
        "limits": {
            "concurrent_jobs": 10,
            "max_file_size": "100MB",
            "api_calls_per_hour": 10000
        }
    }


# Health check with authentication status
@app.get("/api/health")
async def health_check(user: Dict = Depends(optional_auth)):
    """
    Health check endpoint with optional user context
    
    Shows different information based on authentication status
    """
    base_response = {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z",
        "version": "1.0.0"
    }
    
    if user:
        base_response.update({
            "authenticated": True,
            "user_id": user["user_id"],
            "subscription_tier": user["subscription_tier"],
            "auth_type": user["auth_type"]
        })
    else:
        base_response["authenticated"] = False
    
    return base_response


# Error handling examples
@app.exception_handler(ValidationError)
async def validation_error_handler(request, exc: ValidationError):
    """Handle validation errors"""
    return HTTPException(
        status_code=400,
        detail={
            "error": "validation_error",
            "message": exc.message,
            "field": exc.field,
            "code": exc.code
        }
    )


if __name__ == "__main__":
    import uvicorn
    
    # Run the application
    uvicorn.run(
        "config_example:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
