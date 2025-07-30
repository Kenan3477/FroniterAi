"""
API Configuration Settings

Centralized configuration management for the Frontier Business Operations API
including environment variables, security settings, rate limiting, and database configuration.
"""

import os
from typing import List, Optional
from pydantic import BaseSettings, validator
from pathlib import Path


class Settings(BaseSettings):
    """API configuration settings"""
    
    # Application settings
    APP_NAME: str = "Frontier Business Operations API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    
    # Security settings
    SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_SECRET_KEY: str = "your-jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # CORS settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000"
    ]
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Database settings
    DATABASE_URL: str = "sqlite:///./frontier_business_api.db"
    DATABASE_ECHO: bool = False
    
    # Redis settings (for rate limiting and caching)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    
    # Rate limiting settings
    RATE_LIMIT_ENABLED: bool = True
    DEFAULT_RATE_LIMIT: str = "100/hour"  # requests per hour
    
    # Rate limits by subscription tier
    FREE_TIER_LIMIT: str = "100/hour"
    PROFESSIONAL_LIMIT: str = "1000/hour"
    ENTERPRISE_LIMIT: str = "10000/hour"
    
    # Authentication settings
    AUTH_ENABLED: bool = True
    API_KEY_HEADER: str = "X-API-Key"
    
    # Logging settings
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE: Optional[str] = None
    
    # External API settings
    ALPHA_VANTAGE_API_KEY: Optional[str] = None
    NEWS_API_KEY: Optional[str] = None
    FRED_API_KEY: Optional[str] = None
    
    # Business module settings
    COMPLIANCE_MODULE_ENABLED: bool = True
    FINANCIAL_ANALYSIS_ENABLED: bool = True
    MARKET_ANALYSIS_ENABLED: bool = True
    AI_REASONING_ENABLED: bool = True
    
    # File upload settings
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_FILE_TYPES: List[str] = [".pdf", ".csv", ".xlsx", ".json", ".txt"]
    UPLOAD_DIRECTORY: str = "./uploads"
    
    # Cache settings
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 3600  # 1 hour
    
    # Monitoring and metrics
    METRICS_ENABLED: bool = True
    PROMETHEUS_ENABLED: bool = False
    HEALTH_CHECK_ENABLED: bool = True
    
    # Documentation settings
    DOCS_ENABLED: bool = True
    REDOC_ENABLED: bool = True
    OPENAPI_URL: str = "/openapi.json"
    
    @validator("ALLOWED_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        """Parse CORS origins from environment variable"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("ALLOWED_HOSTS", pre=True)
    def parse_allowed_hosts(cls, v):
        """Parse allowed hosts from environment variable"""
        if isinstance(v, str):
            return [host.strip() for host in v.split(",")]
        return v
    
    @validator("UPLOAD_DIRECTORY")
    def create_upload_directory(cls, v):
        """Ensure upload directory exists"""
        Path(v).mkdir(parents=True, exist_ok=True)
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Rate limiting tiers
class RateLimitTier:
    """Rate limiting tier definitions"""
    
    FREE = {
        "requests_per_hour": 100,
        "requests_per_minute": 5,
        "burst_limit": 10
    }
    
    PROFESSIONAL = {
        "requests_per_hour": 1000,
        "requests_per_minute": 50,
        "burst_limit": 100
    }
    
    ENTERPRISE = {
        "requests_per_hour": 10000,
        "requests_per_minute": 500,
        "burst_limit": 1000
    }


# Error codes
class ErrorCodes:
    """Standardized error codes"""
    
    # Authentication errors
    INVALID_TOKEN = "INVALID_TOKEN"
    EXPIRED_TOKEN = "EXPIRED_TOKEN"
    MISSING_TOKEN = "MISSING_TOKEN"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    
    # Authorization errors
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    SUBSCRIPTION_REQUIRED = "SUBSCRIPTION_REQUIRED"
    
    # Rate limiting errors
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"
    
    # Validation errors
    INVALID_REQUEST = "INVALID_REQUEST"
    MISSING_PARAMETER = "MISSING_PARAMETER"
    INVALID_PARAMETER = "INVALID_PARAMETER"
    
    # Business logic errors
    ANALYSIS_FAILED = "ANALYSIS_FAILED"
    DATA_NOT_FOUND = "DATA_NOT_FOUND"
    PROCESSING_ERROR = "PROCESSING_ERROR"
    
    # System errors
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    DATABASE_ERROR = "DATABASE_ERROR"


# API response messages
class ResponseMessages:
    """Standardized response messages"""
    
    # Success messages
    ANALYSIS_COMPLETED = "Analysis completed successfully"
    DATA_RETRIEVED = "Data retrieved successfully"
    OPERATION_SUCCESSFUL = "Operation completed successfully"
    
    # Error messages
    INVALID_REQUEST_FORMAT = "Invalid request format"
    MISSING_REQUIRED_FIELD = "Missing required field"
    UNAUTHORIZED_ACCESS = "Unauthorized access"
    RATE_LIMIT_EXCEEDED = "Rate limit exceeded"
    INTERNAL_SERVER_ERROR = "Internal server error occurred"


# Subscription tiers
class SubscriptionTier:
    """User subscription tier definitions"""
    
    FREE = "free"
    PROFESSIONAL = "professional" 
    ENTERPRISE = "enterprise"
    
    FEATURES = {
        FREE: {
            "rate_limit": RateLimitTier.FREE,
            "features": ["basic_analysis", "limited_reports"],
            "max_requests_per_day": 500
        },
        PROFESSIONAL: {
            "rate_limit": RateLimitTier.PROFESSIONAL,
            "features": ["advanced_analysis", "detailed_reports", "api_access"],
            "max_requests_per_day": 10000
        },
        ENTERPRISE: {
            "rate_limit": RateLimitTier.ENTERPRISE,
            "features": ["full_analysis", "custom_reports", "priority_support", "webhook_integration"],
            "max_requests_per_day": 100000
        }
    }


# Business module configuration
class BusinessModuleConfig:
    """Configuration for business operation modules"""
    
    FINANCIAL_ANALYSIS = {
        "enabled": True,
        "cache_ttl": 1800,  # 30 minutes
        "max_processing_time": 300,  # 5 minutes
        "supported_formats": ["json", "csv", "excel"]
    }
    
    STRATEGIC_PLANNING = {
        "enabled": True,
        "cache_ttl": 3600,  # 1 hour
        "max_processing_time": 600,  # 10 minutes
        "supported_formats": ["json", "pdf", "docx"]
    }
    
    COMPLIANCE_RISK_MANAGEMENT = {
        "enabled": True,
        "cache_ttl": 7200,  # 2 hours
        "max_processing_time": 900,  # 15 minutes
        "supported_regulations": ["GDPR", "CCPA", "HIPAA", "SOX"]
    }
    
    MARKET_ANALYSIS = {
        "enabled": True,
        "cache_ttl": 300,  # 5 minutes
        "max_processing_time": 180,  # 3 minutes
        "real_time_enabled": True
    }


# Initialize settings
settings = Settings()

# Export commonly used configurations
__all__ = [
    "settings",
    "RateLimitTier", 
    "ErrorCodes",
    "ResponseMessages",
    "SubscriptionTier",
    "BusinessModuleConfig"
]
