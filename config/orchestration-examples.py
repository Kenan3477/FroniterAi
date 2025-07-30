"""
Module Orchestration Configuration
Configuration files and examples for setting up the Frontier module orchestration system
"""

# orchestration-config.yaml
orchestration_config_yaml = """
# Frontier Module Orchestration Configuration
orchestration:
  router:
    # Router configuration
    max_concurrent_requests: 1000
    request_timeout: 30.0
    enable_request_queuing: true
    queue_size: 10000
    
    # Classification settings
    classification:
      confidence_threshold: 0.8
      use_user_history: true
      history_window: 10
      keyword_weight: 0.4
      context_weight: 0.3
      user_history_weight: 0.2
      metadata_weight: 0.1
    
    # Confidence scoring
    confidence_scoring:
      quality_weights:
        relevance: 0.25
        coherence: 0.20
        accuracy: 0.20
        completeness: 0.15
        safety: 0.10
        performance: 0.10
      
      # Historical performance tracking
      enable_history_tracking: true
      max_history_size: 1000
      
      # Time factor calculation
      optimal_response_time_min: 0.1
      optimal_response_time_max: 2.0
      slow_response_threshold: 10.0

  # Communication protocols
  communication:
    protocols:
      http:
        enabled: true
        base_timeout: 30.0
        max_retries: 3
        retry_delay: 1.0
      
      websocket:
        enabled: true
        connection_timeout: 10.0
        heartbeat_interval: 30.0
      
      message_broker:
        enabled: true
        type: "redis"
        host: "redis.frontier.svc.cluster.local"
        port: 6379
        queue_prefix: "frontier"
    
    # Security settings
    security:
      enable_authentication: true
      enable_encryption: false  # Set to true in production
      rate_limiting:
        enabled: true
        max_requests_per_minute: 1000
        window_minutes: 1
      
      # Module authentication
      module_auth:
        required_fields:
          - module_id
          - api_key
          - signature
        token_expiry_hours: 24

  # Dynamic loading configuration
  dynamic_loading:
    enabled: true
    strategy: "on_demand"  # on_demand, predictive, preemptive, scheduled
    
    # Loading thresholds
    auto_load_threshold: 10  # requests before auto-loading
    max_concurrent_loads: 3
    module_idle_timeout_minutes: 30
    health_check_interval_seconds: 30
    
    # Kubernetes configuration
    kubernetes:
      namespace: "frontier-modules"
      config_type: "in_cluster"  # in_cluster or local
      default_resource_limits:
        cpu: "2000m"
        memory: "4Gi"
        gpu: "1"
      default_resource_requests:
        cpu: "1000m" 
        memory: "2Gi"
    
    # Predictive loading
    predictive:
      enable_usage_prediction: true
      prediction_window_minutes: 15
      confidence_threshold: 0.7
      pattern_analysis_days: 7

  # Fallback and resilience
  fallback:
    enabled: true
    default_confidence_threshold: 0.6
    default_success_rate_threshold: 0.8
    
    # Circuit breaker settings
    circuit_breaker:
      enabled: true
      failure_threshold: 5
      recovery_timeout_seconds: 60
      half_open_max_calls: 3
    
    # Health monitoring
    health_monitoring:
      enabled: true
      monitoring_window_seconds: 300
      min_success_rate: 0.8
      max_response_time_ms: 5000
      min_availability: 0.95
    
    # Adaptive learning
    adaptive_learning:
      enabled: true
      adaptation_window: 100
      learning_rate: 0.1
      performance_history_size: 1000

# Module specifications
modules:
  foundation:
    module_id: "foundation"
    module_type: "foundation"
    image: "frontier/foundation-model"
    version: "1.0.0"
    endpoint_pattern: "http://{service_name}.{namespace}.svc.cluster.local:8080"
    
    resource_requirements:
      requests:
        cpu: "4000m"
        memory: "16Gi"
        nvidia.com/gpu: "2"
      limits:
        cpu: "8000m"
        memory: "32Gi"
        nvidia.com/gpu: "2"
    
    scaling:
      min_replicas: 2
      max_replicas: 10
      target_cpu_utilization: 70
    
    health_check:
      path: "/health"
      initial_delay_seconds: 60
      period_seconds: 10
      timeout_seconds: 5
      failure_threshold: 3

  business-operations:
    module_id: "business-operations"
    module_type: "business"
    image: "frontier/business-module"
    version: "1.0.0"
    
    resource_requirements:
      requests:
        cpu: "2000m"
        memory: "8Gi"
        nvidia.com/gpu: "1"
      limits:
        cpu: "4000m"
        memory: "16Gi"
        nvidia.com/gpu: "1"
    
    scaling:
      min_replicas: 1
      max_replicas: 5
      target_cpu_utilization: 70
    
    dependencies:
      - foundation
    
    environment_variables:
      SPECIALIZED_DOMAIN: "business"
      FOUNDATION_MODEL_ENDPOINT: "http://foundation.frontier-modules.svc.cluster.local:8080"

  web-development:
    module_id: "web-development"
    module_type: "development"
    image: "frontier/development-module"
    version: "1.0.0"
    
    resource_requirements:
      requests:
        cpu: "2000m"
        memory: "8Gi"
        nvidia.com/gpu: "1"
      limits:
        cpu: "6000m"
        memory: "20Gi"
        nvidia.com/gpu: "1"
    
    scaling:
      min_replicas: 1
      max_replicas: 8
      target_cpu_utilization: 70
    
    dependencies:
      - foundation

  marketing-creative:
    module_id: "marketing-creative"
    module_type: "creative"
    image: "frontier/creative-module"
    version: "1.0.0"
    
    resource_requirements:
      requests:
        cpu: "2000m"
        memory: "8Gi"
        nvidia.com/gpu: "1"
      limits:
        cpu: "4000m"
        memory: "16Gi"
        nvidia.com/gpu: "1"
    
    scaling:
      min_replicas: 1
      max_replicas: 6
      target_cpu_utilization: 70
    
    dependencies:
      - foundation
      - multimodal-processor

  multimodal-processor:
    module_id: "multimodal-processor"
    module_type: "multimodal"
    image: "frontier/multimodal-module"
    version: "1.0.0"
    
    resource_requirements:
      requests:
        cpu: "3000m"
        memory: "12Gi"
        nvidia.com/gpu: "2"
      limits:
        cpu: "6000m"
        memory: "24Gi"
        nvidia.com/gpu: "2"
    
    scaling:
      min_replicas: 1
      max_replicas: 4
      target_cpu_utilization: 75

# Fallback rules configuration
fallback_rules:
  business-operations:
    - trigger_conditions:
        - "timeout"
        - "low_confidence"
        - "service_unavailable"
      fallback_modules:
        - "foundation"
      strategy: "adaptive"
      priority: 1
      quality_threshold: 0.7
      max_retries: 2
      retry_delay: 1.0

  web-development:
    - trigger_conditions:
        - "error_response"
        - "timeout"
        - "quality_threshold_not_met"
      fallback_modules:
        - "foundation"
      strategy: "sequential"
      priority: 1
      quality_threshold: 0.6
      max_retries: 3
      retry_delay: 0.5

  marketing-creative:
    - trigger_conditions:
        - "low_confidence"
        - "service_unavailable"
      fallback_modules:
        - "foundation"
      strategy: "sequential"
      priority: 1
      quality_threshold: 0.5
      max_retries: 2
      retry_delay: 1.0

  multimodal-processor:
    - trigger_conditions:
        - "timeout"
        - "error_response"
        - "resource_exhaustion"
      fallback_modules:
        - "foundation"
      strategy: "adaptive"
      priority: 1
      quality_threshold: 0.6
      max_retries: 2
      retry_delay: 2.0

# Monitoring and observability
monitoring:
  enabled: true
  
  metrics:
    # Module performance metrics
    module_metrics:
      - "request_count"
      - "response_time"
      - "error_rate"
      - "confidence_score"
      - "throughput"
      - "queue_depth"
    
    # System-level metrics
    system_metrics:
      - "total_requests"
      - "active_connections"
      - "memory_usage"
      - "cpu_utilization"
      - "gpu_utilization"
    
    # Fallback metrics
    fallback_metrics:
      - "fallback_rate"
      - "fallback_success_rate"
      - "circuit_breaker_state"
      - "failure_types"
  
  # Export configuration
  prometheus:
    enabled: true
    port: 9090
    path: "/metrics"
  
  # Alerting rules
  alerts:
    high_error_rate:
      condition: "error_rate > 0.1"
      duration: "5m"
      severity: "warning"
    
    module_unavailable:
      condition: "module_health == 0"
      duration: "1m" 
      severity: "critical"
    
    high_response_time:
      condition: "avg_response_time > 5000"
      duration: "3m"
      severity: "warning"
    
    circuit_breaker_open:
      condition: "circuit_breaker_state == 'OPEN'"
      duration: "0m"
      severity: "warning"

# Deployment configuration
deployment:
  environment: "production"  # development, staging, production
  
  # API Gateway
  gateway:
    enabled: true
    replicas: 3
    image: "frontier/api-gateway"
    version: "1.0.0"
    
    ingress:
      enabled: true
      host: "api.frontier.ai"
      tls_enabled: true
      certificate_issuer: "letsencrypt-prod"
    
    rate_limiting:
      enabled: true
      requests_per_second: 1000
      burst_size: 2000
  
  # Load balancer
  load_balancer:
    type: "nginx"
    algorithm: "round_robin"
    health_check_path: "/health"
    health_check_interval: 10
    
  # Service mesh (optional)
  service_mesh:
    enabled: false
    type: "istio"
    mtls_enabled: true
"""

# Example Docker Compose for development
docker_compose_yaml = """
version: '3.8'

services:
  # Redis for message brokering
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  # PostgreSQL for metadata storage
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: frontier
      POSTGRES_USER: frontier
      POSTGRES_PASSWORD: frontier_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Module Router
  module-router:
    build:
      context: .
      dockerfile: orchestration/Dockerfile.router
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://frontier:frontier_password@postgres:5432/frontier
      - CONFIG_PATH=/app/config/orchestration-config.yaml
    volumes:
      - ./config:/app/config
      - ./orchestration:/app/orchestration
    depends_on:
      - redis
      - postgres

  # Foundation Module (Mock)
  foundation-module:
    build:
      context: .
      dockerfile: modules/Dockerfile.foundation
    ports:
      - "8001:8080"
    environment:
      - MODULE_ID=foundation
      - MODULE_TYPE=foundation
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  # Business Module (Mock)
  business-module:
    build:
      context: .
      dockerfile: modules/Dockerfile.business
    ports:
      - "8002:8080"
    environment:
      - MODULE_ID=business-operations
      - MODULE_TYPE=business
      - FOUNDATION_ENDPOINT=http://foundation-module:8080
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - foundation-module

  # Development Module (Mock)
  dev-module:
    build:
      context: .
      dockerfile: modules/Dockerfile.development
    ports:
      - "8003:8080"
    environment:
      - MODULE_ID=web-development
      - MODULE_TYPE=development
      - FOUNDATION_ENDPOINT=http://foundation-module:8080
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - foundation-module

  # Creative Module (Mock)
  creative-module:
    build:
      context: .
      dockerfile: modules/Dockerfile.creative
    ports:
      - "8004:8080"
    environment:
      - MODULE_ID=marketing-creative
      - MODULE_TYPE=creative
      - FOUNDATION_ENDPOINT=http://foundation-module:8080
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - foundation-module

  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources

volumes:
  redis_data:
  postgres_data:
  prometheus_data:
  grafana_data:
"""

# Kubernetes deployment example
kubernetes_deployment_yaml = """
apiVersion: v1
kind: Namespace
metadata:
  name: frontier-orchestration
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: module-router
  namespace: frontier-orchestration
spec:
  replicas: 3
  selector:
    matchLabels:
      app: module-router
  template:
    metadata:
      labels:
        app: module-router
    spec:
      containers:
      - name: router
        image: frontier/module-router:1.0.0
        ports:
        - containerPort: 8000
        env:
        - name: REDIS_URL
          value: "redis://redis.frontier-orchestration.svc.cluster.local:6379"
        - name: CONFIG_PATH
          value: "/app/config/orchestration-config.yaml"
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
        volumeMounts:
        - name: config
          mountPath: /app/config
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: orchestration-config
---
apiVersion: v1
kind: Service
metadata:
  name: module-router
  namespace: frontier-orchestration
spec:
  selector:
    app: module-router
  ports:
  - port: 8000
    targetPort: 8000
  type: ClusterIP
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: orchestration-config
  namespace: frontier-orchestration
data:
  orchestration-config.yaml: |
    # Inline configuration here
    orchestration:
      router:
        max_concurrent_requests: 1000
        request_timeout: 30.0
"""

# Prometheus monitoring configuration
prometheus_config_yaml = """
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "frontier_alerts.yml"

scrape_configs:
  - job_name: 'module-router'
    static_configs:
      - targets: ['module-router:8000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'foundation-module'
    static_configs:
      - targets: ['foundation-module:8080']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'business-module'
    static_configs:
      - targets: ['business-module:8080']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'dev-module'
    static_configs:
      - targets: ['dev-module:8080']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'creative-module'
    static_configs:
      - targets: ['creative-module:8080']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - frontier-modules
            - frontier-orchestration
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
"""

# Alerting rules
alerting_rules_yaml = """
groups:
  - name: frontier.rules
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} for {{ $labels.instance }}"

      - alert: ModuleDown
        expr: up{job=~".*-module"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Module is down"
          description: "{{ $labels.job }} has been down for more than 1 minute"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 5
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile latency is {{ $value }}s for {{ $labels.instance }}"

      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state{state="open"} == 1
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "Circuit breaker is open"
          description: "Circuit breaker for {{ $labels.module }} is open"

      - alert: LowConfidenceScore
        expr: avg_over_time(confidence_score[5m]) < 0.6
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Low confidence scores"
          description: "Average confidence score is {{ $value }} for {{ $labels.module }}"
"""

if __name__ == "__main__":
    """Save configuration files to appropriate locations"""
    import os
    from pathlib import Path
    
    # Create config directory
    config_dir = Path("c:/Users/kenne/Frontier/config")
    config_dir.mkdir(exist_ok=True)
    
    # Create monitoring directory
    monitoring_dir = Path("c:/Users/kenne/Frontier/monitoring")
    monitoring_dir.mkdir(exist_ok=True)
    
    # Create deployment directory
    deployment_dir = Path("c:/Users/kenne/Frontier/deployment")
    deployment_dir.mkdir(exist_ok=True)
    
    # Save orchestration config
    with open(config_dir / "orchestration-config.yaml", "w") as f:
        f.write(orchestration_config_yaml)
    
    # Save Docker Compose
    with open(deployment_dir / "docker-compose.yml", "w") as f:
        f.write(docker_compose_yaml)
    
    # Save Kubernetes deployment
    with open(deployment_dir / "kubernetes-deployment.yaml", "w") as f:
        f.write(kubernetes_deployment_yaml)
    
    # Save Prometheus config
    with open(monitoring_dir / "prometheus.yml", "w") as f:
        f.write(prometheus_config_yaml)
    
    # Save alerting rules
    with open(monitoring_dir / "frontier_alerts.yml", "w") as f:
        f.write(alerting_rules_yaml)
    
    print("Configuration files created successfully!")
    print(f"Config directory: {config_dir}")
    print(f"Monitoring directory: {monitoring_dir}")
    print(f"Deployment directory: {deployment_dir}")
