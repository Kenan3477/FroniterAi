"""
Production Optimization Configuration

Configuration settings for all production optimization features including
caching, CDN, database optimization, AI batching, scaling, and monitoring.
"""

import os
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum


class Environment(Enum):
    """Deployment environments"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


@dataclass
class CacheConfig:
    """Cache configuration settings"""
    enabled: bool = True
    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    redis_db: int = int(os.getenv("REDIS_DB", "0"))
    redis_password: Optional[str] = os.getenv("REDIS_PASSWORD")
    
    # Memory cache settings
    memory_cache_size: int = 10000
    memory_cache_ttl: int = 3600  # 1 hour
    
    # Cache TTL settings by type (seconds)
    ttl_settings: Dict[str, int] = field(default_factory=lambda: {
        "financial_analysis": 3600,      # 1 hour
        "market_data": 300,              # 5 minutes
        "industry_benchmarks": 86400,    # 24 hours
        "ai_model_responses": 1800,      # 30 minutes
        "strategic_analysis": 7200,      # 2 hours
        "compliance_results": 3600,      # 1 hour
        "user_sessions": 7200            # 2 hours
    })
    
    # Compression settings
    enable_compression: bool = True
    compression_threshold: int = 1024  # Compress data > 1KB


@dataclass
class CDNConfig:
    """CDN configuration settings"""
    enabled: bool = True
    provider: str = "cloudflare"  # cloudflare, aws_cloudfront, azure_cdn
    domain: Optional[str] = os.getenv("CDN_DOMAIN")
    api_key: Optional[str] = os.getenv("CDN_API_KEY")
    
    # Static asset settings
    enable_asset_compression: bool = True
    enable_asset_versioning: bool = True
    asset_cache_duration: int = 31536000  # 1 year
    
    # Upload settings
    auto_upload_assets: bool = True
    upload_on_startup: bool = True
    
    # Cache invalidation
    auto_invalidate: bool = True
    invalidation_delay: int = 300  # 5 minutes


@dataclass
class DatabaseConfig:
    """Database optimization configuration"""
    enabled: bool = True
    
    # Connection pool settings
    min_connections: int = 5
    max_connections: int = 50
    connection_timeout: int = 30
    idle_timeout: int = 300
    max_lifetime: int = 3600
    
    # Query optimization
    enable_query_optimization: bool = True
    enable_query_caching: bool = True
    query_cache_ttl: int = 300  # 5 minutes
    slow_query_threshold: float = 1.0  # seconds
    
    # Index management
    auto_create_indexes: bool = True
    index_analysis_interval: int = 3600  # 1 hour
    max_index_recommendations: int = 10
    
    # Monitoring
    enable_query_monitoring: bool = True
    metrics_retention_days: int = 30


@dataclass
class AIBatchingConfig:
    """AI model batching configuration"""
    enabled: bool = True
    
    # Batching parameters
    default_batch_size: int = 16
    max_batch_size: int = 64
    batch_timeout: float = 2.0  # seconds
    min_batch_size: int = 1
    
    # Model-specific settings
    model_configs: Dict[str, Dict[str, Any]] = field(default_factory=lambda: {
        "text_generation": {
            "max_batch_size": 16,
            "batch_timeout": 2.0,
            "max_sequence_length": 4096,
            "concurrent_batches": 4
        },
        "business_analysis": {
            "max_batch_size": 8,
            "batch_timeout": 3.0,
            "max_sequence_length": 8192,
            "concurrent_batches": 2
        },
        "financial_modeling": {
            "max_batch_size": 32,
            "batch_timeout": 1.5,
            "max_sequence_length": 2048,
            "concurrent_batches": 6
        },
        "sentiment_analysis": {
            "max_batch_size": 64,
            "batch_timeout": 1.0,
            "max_sequence_length": 512,
            "concurrent_batches": 8
        }
    })
    
    # Load balancing
    enable_load_balancing: bool = True
    health_check_interval: int = 30
    circuit_breaker_threshold: float = 0.5
    retry_attempts: int = 3


@dataclass
class ScalingConfig:
    """Auto-scaling configuration"""
    enabled: bool = True
    
    # Instance limits
    min_instances: int = 2
    max_instances: int = 50
    initial_instances: int = 3
    
    # Scaling thresholds
    cpu_scale_up_threshold: float = 75.0
    cpu_scale_down_threshold: float = 25.0
    memory_scale_up_threshold: float = 80.0
    memory_scale_down_threshold: float = 30.0
    response_time_threshold: float = 2.0  # seconds
    
    # Scaling timings
    scale_up_cooldown: int = 300     # 5 minutes
    scale_down_cooldown: int = 600   # 10 minutes
    metrics_window: int = 300        # 5 minutes
    evaluation_interval: int = 30    # 30 seconds
    
    # Load balancing algorithms
    load_balancing_algorithm: str = "least_connections"  # round_robin, least_connections, weighted
    health_check_interval: int = 30
    health_check_timeout: int = 5
    
    # Service-specific settings
    service_configs: Dict[str, Dict[str, Any]] = field(default_factory=lambda: {
        "api_server": {
            "min_instances": 3,
            "max_instances": 20,
            "target_cpu": 70.0
        },
        "worker": {
            "min_instances": 2,
            "max_instances": 30,
            "target_cpu": 80.0
        },
        "websocket": {
            "min_instances": 2,
            "max_instances": 10,
            "target_cpu": 60.0
        }
    })


@dataclass
class MonitoringConfig:
    """Performance monitoring configuration"""
    enabled: bool = True
    
    # SLA targets
    response_time_target: float = 1000.0  # ms
    availability_target: float = 99.9     # percentage
    error_rate_target: float = 0.01       # 1%
    throughput_target: float = 100.0      # requests/second
    
    # Monitoring intervals
    metrics_collection_interval: int = 10  # seconds
    sla_check_interval: int = 30          # seconds
    health_check_interval: int = 60       # seconds
    
    # Alert settings
    enable_alerting: bool = True
    alert_email: Optional[str] = os.getenv("ALERT_EMAIL")
    alert_webhook: Optional[str] = os.getenv("ALERT_WEBHOOK")
    alert_cooldown: int = 300  # 5 minutes
    
    # Benchmarking
    enable_benchmarks: bool = True
    benchmark_interval: int = 3600  # 1 hour
    benchmark_timeout: int = 300    # 5 minutes
    
    # Data retention
    metrics_retention_days: int = 30
    benchmark_retention_days: int = 90
    alert_retention_days: int = 365


@dataclass
class SecurityConfig:
    """Security optimization configuration"""
    enabled: bool = True
    
    # Rate limiting
    enable_rate_limiting: bool = True
    default_rate_limit: int = 1000  # requests per minute
    burst_limit: int = 100
    
    # DDoS protection
    enable_ddos_protection: bool = True
    max_connections_per_ip: int = 100
    connection_timeout: int = 30
    
    # Input validation
    max_request_size: int = 10 * 1024 * 1024  # 10MB
    max_file_size: int = 50 * 1024 * 1024     # 50MB
    
    # Security headers
    enable_security_headers: bool = True
    cors_origins: List[str] = field(default_factory=lambda: ["*"])
    
    # Encryption
    enable_encryption_at_rest: bool = True
    enable_encryption_in_transit: bool = True


@dataclass
class ProductionOptimizationConfig:
    """Master configuration for production optimization"""
    environment: Environment = Environment.PRODUCTION
    
    # Component configurations
    cache: CacheConfig = field(default_factory=CacheConfig)
    cdn: CDNConfig = field(default_factory=CDNConfig)
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    ai_batching: AIBatchingConfig = field(default_factory=AIBatchingConfig)
    scaling: ScalingConfig = field(default_factory=ScalingConfig)
    monitoring: MonitoringConfig = field(default_factory=MonitoringConfig)
    security: SecurityConfig = field(default_factory=SecurityConfig)
    
    # Global settings
    debug_mode: bool = os.getenv("DEBUG", "false").lower() == "true"
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Resource limits
    max_memory_usage: float = 85.0  # percentage
    max_cpu_usage: float = 90.0     # percentage
    max_disk_usage: float = 80.0    # percentage
    
    # Feature flags
    enable_experimental_features: bool = False
    enable_detailed_logging: bool = False
    enable_profiling: bool = False
    
    @classmethod
    def for_development(cls) -> "ProductionOptimizationConfig":
        """Create configuration optimized for development"""
        config = cls(environment=Environment.DEVELOPMENT)
        
        # Reduce resource requirements for development
        config.cache.memory_cache_size = 1000
        config.database.max_connections = 10
        config.scaling.min_instances = 1
        config.scaling.max_instances = 5
        config.ai_batching.default_batch_size = 4
        
        # Enable debugging features
        config.debug_mode = True
        config.enable_detailed_logging = True
        config.monitoring.metrics_collection_interval = 30
        
        return config
    
    @classmethod
    def for_staging(cls) -> "ProductionOptimizationConfig":
        """Create configuration optimized for staging"""
        config = cls(environment=Environment.STAGING)
        
        # Moderate resource allocation for staging
        config.cache.memory_cache_size = 5000
        config.database.max_connections = 25
        config.scaling.min_instances = 2
        config.scaling.max_instances = 20
        
        # Enable monitoring but reduce alerting
        config.monitoring.enable_alerting = False
        config.monitoring.benchmark_interval = 7200  # 2 hours
        
        return config
    
    @classmethod
    def for_production(cls) -> "ProductionOptimizationConfig":
        """Create configuration optimized for production"""
        config = cls(environment=Environment.PRODUCTION)
        
        # Full resource allocation for production
        config.cache.memory_cache_size = 20000
        config.database.max_connections = 50
        config.scaling.max_instances = 100
        
        # Enable all monitoring and alerting
        config.monitoring.enable_alerting = True
        config.security.enable_ddos_protection = True
        
        # Disable debugging features
        config.debug_mode = False
        config.enable_detailed_logging = False
        
        return config
    
    def validate(self) -> List[str]:
        """Validate configuration and return any errors"""
        errors = []
        
        # Validate cache settings
        if self.cache.enabled and not self.cache.redis_host:
            errors.append("Redis host is required when caching is enabled")
        
        # Validate CDN settings
        if self.cdn.enabled and not self.cdn.domain:
            errors.append("CDN domain is required when CDN is enabled")
        
        # Validate scaling settings
        if self.scaling.min_instances > self.scaling.max_instances:
            errors.append("Minimum instances cannot be greater than maximum instances")
        
        # Validate resource limits
        if self.max_memory_usage <= 0 or self.max_memory_usage > 100:
            errors.append("Max memory usage must be between 0 and 100 percent")
        
        return errors
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        from dataclasses import asdict
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ProductionOptimizationConfig":
        """Create configuration from dictionary"""
        # This would need proper deserialization logic
        # For now, return default configuration
        return cls()


# Environment-specific configurations
DEVELOPMENT_CONFIG = ProductionOptimizationConfig.for_development()
STAGING_CONFIG = ProductionOptimizationConfig.for_staging()
PRODUCTION_CONFIG = ProductionOptimizationConfig.for_production()

# Default configuration based on environment
CURRENT_ENVIRONMENT = Environment(os.getenv("ENVIRONMENT", "development"))

if CURRENT_ENVIRONMENT == Environment.DEVELOPMENT:
    DEFAULT_CONFIG = DEVELOPMENT_CONFIG
elif CURRENT_ENVIRONMENT == Environment.STAGING:
    DEFAULT_CONFIG = STAGING_CONFIG
else:
    DEFAULT_CONFIG = PRODUCTION_CONFIG
