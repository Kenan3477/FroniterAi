"""
AI Model Infrastructure Configuration

Configuration for model serving, monitoring, and deployment infrastructure.
"""

import os
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from pydantic import BaseModel, Field


class ModelServerConfig(BaseModel):
    """Model server configuration"""
    
    # Redis configuration
    redis_url: str = Field(default="redis://localhost:6379")
    redis_db: int = Field(default=0)
    
    # Model storage
    model_storage_path: str = Field(default="./models", env="MODEL_STORAGE_PATH")
    model_cache_size: int = Field(default=10, env="MODEL_CACHE_SIZE")
    
    # Performance settings
    max_concurrent_requests: int = Field(default=100, env="MAX_CONCURRENT_REQUESTS")
    request_timeout: int = Field(default=60, env="REQUEST_TIMEOUT")
    model_warmup_enabled: bool = Field(default=True, env="MODEL_WARMUP_ENABLED")
    
    # GPU settings
    gpu_enabled: bool = Field(default=True)
    gpu_memory_fraction: float = Field(default=0.3)
    tensorrt_enabled: bool = Field(default=False)
    
    # Monitoring
    monitoring_enabled: bool = Field(default=True)
    metrics_retention_hours: int = Field(default=168)  # 1 week
    alert_webhook_url: Optional[str] = Field(default=None)


class MonitoringConfig(BaseModel):
    """Monitoring configuration"""
    
    # Alert thresholds
    latency_p95_threshold: float = Field(default=1.0)
    error_rate_threshold: float = Field(default=0.05)
    cpu_usage_threshold: float = Field(default=80.0)
    memory_usage_threshold: float = Field(default=80.0)
    gpu_usage_threshold: float = Field(default=90.0)
    drift_score_threshold: float = Field(default=0.1)
    
    # Monitoring intervals
    metrics_collection_interval: int = Field(default=30)
    resource_monitoring_interval: int = Field(default=60)
    health_check_interval: int = Field(default=120)
    
    # Alert settings
    alert_cooldown_minutes: int = Field(default=10)
    max_alerts_per_hour: int = Field(default=10)


@dataclass
class ModelConfig:
    """Individual model configuration"""
    model_id: str
    model_type: str  # "huggingface", "onnx", "tensorrt", "pytorch"
    model_path: str
    version: str = "1.0.0"
    backend: str = "cpu"  # "cpu", "cuda", "tensorrt"
    max_batch_size: int = 32
    max_sequence_length: int = 512
    cache_ttl: int = 3600
    warmup_samples: int = 5
    memory_limit_mb: int = 1024
    precision: str = "fp16"
    metadata: Dict = field(default_factory=dict)


@dataclass
class DeploymentConfig:
    """Deployment environment configuration"""
    environment: str = "development"  # development, staging, production
    debug: bool = False
    log_level: str = "INFO"
    
    # API settings
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_workers: int = 1
    
    # Database
    database_url: str = "sqlite:///./frontier.db"
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    cors_origins: List[str] = field(default_factory=lambda: ["http://localhost:3000"])
    
    # Model defaults
    default_models: Dict[str, str] = field(default_factory=lambda: {
        "financial_analysis": "financial-bert-v1",
        "sentiment_analysis": "sentiment-bert-v1",
        "text_classification": "classifier-bert-v1",
        "risk_assessment": "risk-assessment-v1",
        "market_prediction": "market-lstm-v1"
    })


# Predefined model configurations
PREDEFINED_MODELS = {
    "financial-bert-v1": ModelConfig(
        model_id="financial-bert-v1",
        model_type="huggingface",
        model_path="ProsusAI/finbert",
        version="1.0.0",
        backend="cpu",
        max_batch_size=16,
        max_sequence_length=512,
        metadata={
            "task": "text-classification",
            "domain": "finance",
            "description": "FinBERT model for financial text classification"
        }
    ),
    
    "sentiment-bert-v1": ModelConfig(
        model_id="sentiment-bert-v1",
        model_type="huggingface",
        model_path="cardiffnlp/twitter-roberta-base-sentiment-latest",
        version="1.0.0",
        backend="cpu",
        max_batch_size=32,
        max_sequence_length=256,
        metadata={
            "task": "text-classification",
            "domain": "sentiment",
            "description": "RoBERTa model for sentiment analysis"
        }
    ),
    
    "classifier-bert-v1": ModelConfig(
        model_id="classifier-bert-v1",
        model_type="huggingface",
        model_path="distilbert-base-uncased-finetuned-sst-2-english",
        version="1.0.0",
        backend="cpu",
        max_batch_size=32,
        max_sequence_length=512,
        metadata={
            "task": "text-classification",
            "domain": "general",
            "description": "DistilBERT model for general text classification"
        }
    ),
    
    "risk-assessment-v1": ModelConfig(
        model_id="risk-assessment-v1",
        model_type="huggingface",
        model_path="nlptown/bert-base-multilingual-uncased-sentiment",
        version="1.0.0",
        backend="cpu",
        max_batch_size=16,
        max_sequence_length=512,
        metadata={
            "task": "text-classification",
            "domain": "risk",
            "description": "BERT model for financial risk assessment"
        }
    ),
    
    "market-lstm-v1": ModelConfig(
        model_id="market-lstm-v1",
        model_type="pytorch",
        model_path="./models/market_prediction_lstm.pt",
        version="1.0.0",
        backend="cpu",
        max_batch_size=64,
        metadata={
            "task": "regression",
            "domain": "finance",
            "description": "LSTM model for market trend prediction"
        }
    )
}

# Subscription tier limits
SUBSCRIPTION_LIMITS = {
    "basic": {
        "max_requests_per_hour": 1000,
        "max_batch_size": 10,
        "max_concurrent_requests": 5,
        "cache_enabled": True,
        "models_access": ["financial-bert-v1", "sentiment-bert-v1", "classifier-bert-v1"]
    },
    "professional": {
        "max_requests_per_hour": 5000,
        "max_batch_size": 100,
        "max_concurrent_requests": 20,
        "cache_enabled": True,
        "models_access": ["*"],  # All models
        "advanced_features": ["batch_processing", "priority_queue"]
    },
    "enterprise": {
        "max_requests_per_hour": 50000,
        "max_batch_size": 1000,
        "max_concurrent_requests": 100,
        "cache_enabled": True,
        "models_access": ["*"],
        "advanced_features": [
            "batch_processing",
            "priority_queue",
            "model_deployment",
            "a_b_testing",
            "custom_models",
            "dedicated_resources"
        ]
    }
}

# Environment-specific configurations
ENVIRONMENTS = {
    "development": DeploymentConfig(
        environment="development",
        debug=True,
        log_level="DEBUG",
        api_workers=1,
        database_url="sqlite:///./frontier_dev.db"
    ),
    
    "staging": DeploymentConfig(
        environment="staging",
        debug=False,
        log_level="INFO",
        api_workers=2,
        database_url="postgresql://user:pass@staging-db:5432/frontier_staging"
    ),
    
    "production": DeploymentConfig(
        environment="production",
        debug=False,
        log_level="WARNING",
        api_workers=4,
        database_url="postgresql://user:pass@prod-db:5432/frontier_prod",
        cors_origins=["https://app.frontier.ai", "https://dashboard.frontier.ai"]
    )
}


def get_config(environment: str = "development") -> DeploymentConfig:
    """Get configuration for specific environment"""
    return ENVIRONMENTS.get(environment, ENVIRONMENTS["development"])


def get_model_config(model_id: str) -> Optional[ModelConfig]:
    """Get predefined model configuration"""
    return PREDEFINED_MODELS.get(model_id)


def get_subscription_limits(tier: str) -> Dict:
    """Get limits for subscription tier"""
    return SUBSCRIPTION_LIMITS.get(tier, SUBSCRIPTION_LIMITS["basic"])


# Configuration validation
def validate_config(config: DeploymentConfig) -> List[str]:
    """Validate configuration and return list of issues"""
    issues = []
    
    # Check required settings
    if not config.secret_key or config.secret_key == "your-secret-key-change-in-production":
        if config.environment == "production":
            issues.append("SECRET_KEY must be set for production")
    
    if not config.database_url:
        issues.append("DATABASE_URL is required")
    
    # Check model storage path
    model_storage = Path(os.getenv("MODEL_STORAGE_PATH", "./models"))
    if not model_storage.exists():
        issues.append(f"Model storage path does not exist: {model_storage}")
    
    # Check Redis connection (would need actual connection test)
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        issues.append("REDIS_URL is required for caching and session storage")
    
    return issues


# Default configurations
def get_model_server_config() -> ModelServerConfig:
    """Get model server configuration with environment variables"""
    return ModelServerConfig(
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379"),
        redis_db=int(os.getenv("REDIS_DB", "0")),
        gpu_enabled=os.getenv("GPU_ENABLED", "true").lower() == "true",
        gpu_memory_fraction=float(os.getenv("GPU_MEMORY_FRACTION", "0.3")),
        tensorrt_enabled=os.getenv("TENSORRT_ENABLED", "false").lower() == "true",
        monitoring_enabled=os.getenv("MONITORING_ENABLED", "true").lower() == "true",
        metrics_retention_hours=int(os.getenv("METRICS_RETENTION_HOURS", "168")),
        alert_webhook_url=os.getenv("ALERT_WEBHOOK_URL")
    )

def get_monitoring_config() -> MonitoringConfig:
    """Get monitoring configuration with environment variables"""
    return MonitoringConfig(
        latency_p95_threshold=float(os.getenv("LATENCY_P95_THRESHOLD", "1.0")),
        error_rate_threshold=float(os.getenv("ERROR_RATE_THRESHOLD", "0.05")),
        cpu_usage_threshold=float(os.getenv("CPU_USAGE_THRESHOLD", "80.0")),
        memory_usage_threshold=float(os.getenv("MEMORY_USAGE_THRESHOLD", "80.0")),
        gpu_usage_threshold=float(os.getenv("GPU_USAGE_THRESHOLD", "90.0")),
        drift_score_threshold=float(os.getenv("DRIFT_SCORE_THRESHOLD", "0.1")),
        metrics_collection_interval=int(os.getenv("METRICS_COLLECTION_INTERVAL", "30")),
        resource_monitoring_interval=int(os.getenv("RESOURCE_MONITORING_INTERVAL", "60")),
        health_check_interval=int(os.getenv("HEALTH_CHECK_INTERVAL", "120")),
        alert_cooldown_minutes=int(os.getenv("ALERT_COOLDOWN_MINUTES", "10")),
        max_alerts_per_hour=int(os.getenv("MAX_ALERTS_PER_HOUR", "10"))
    )

model_server_config = get_model_server_config()
monitoring_config = get_monitoring_config()
deployment_config = get_config(os.getenv("ENVIRONMENT", "development"))
