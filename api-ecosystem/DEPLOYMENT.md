# Frontier API Ecosystem Deployment Guide

This guide provides step-by-step instructions for deploying the Frontier API ecosystem in different environments.

## 📋 Prerequisites

### Required Software
- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **Node.js** (v18+) for development
- **Python** (v3.9+) for Python services
- **Git** for version control

### System Requirements
- **Development**: 8GB RAM, 4 CPU cores, 20GB storage
- **Production**: 16GB RAM, 8 CPU cores, 100GB storage
- **Network**: Reliable internet connection for downloads and API calls

## 🚀 Quick Start (Development)

### 1. Clone Repository
```bash
git clone https://github.com/frontier-ai/api-ecosystem.git
cd api-ecosystem
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 3. Start Services
```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f api-gateway
```

### 4. Verify Deployment
```bash
# Health check
curl http://localhost:3000/health

# API documentation
open http://localhost:3009

# Monitoring
open http://localhost:3010  # Grafana (admin/admin)
```

## 🏗️ Production Deployment

### 1. Infrastructure Setup

#### Option A: Cloud Deployment (AWS)
```bash
# Install AWS CLI and configure
aws configure

# Create infrastructure with Terraform
cd infrastructure/terraform
terraform init
terraform plan -var-file="production.tfvars"
terraform apply
```

#### Option B: Self-Hosted Deployment
```bash
# Ensure production server meets requirements
# - Ubuntu 20.04+ or CentOS 8+
# - Docker and Docker Compose installed
# - SSL certificates configured
# - Domain name configured
```

### 2. Production Configuration

#### Environment Variables
```bash
# Production environment file
cat > .env.production << EOF
# Server Configuration
NODE_ENV=production
API_VERSION=v1
DOMAIN=api.yourdomain.com

# Database Configuration
DATABASE_URL=postgresql://user:password@postgres-host:5432/frontier_api
REDIS_URL=redis://redis-host:6379

# Authentication
JWT_SECRET=$(openssl rand -base64 32)
JWT_ALGORITHM=RS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# OAuth Configuration
OAUTH_CLIENT_ID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=10000

# External Services
FRONTIER_AI_ENDPOINT=https://internal.frontier.ai
FRONTIER_AI_API_KEY=your-internal-api-key

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
PROMETHEUS_ENDPOINT=http://prometheus:9090

# SSL Configuration
SSL_CERT_PATH=/etc/ssl/certs/api.yourdomain.com.crt
SSL_KEY_PATH=/etc/ssl/private/api.yourdomain.com.key
EOF
```

#### SSL Certificate Setup
```bash
# Using Let's Encrypt
sudo apt-get install certbot
sudo certbot certonly --standalone -d api.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem ./nginx/ssl/
sudo cp /etc/letsencrypt/live/api.yourdomain.com/privkey.pem ./nginx/ssl/
```

### 3. Production Deployment
```bash
# Build and start production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify all services are running
docker-compose ps

# Check health endpoints
curl https://api.yourdomain.com/health
curl https://docs.yourdomain.com/health
```

## 🔧 Configuration

### API Gateway Configuration
```yaml
# config/gateway.yaml
server:
  host: '0.0.0.0'
  port: 3000
  cors:
    enabled: true
    origins: 
      - 'https://yourdomain.com'
      - 'https://*.yourdomain.com'

rate_limiting:
  enabled: true
  tiers:
    free:
      requests_per_minute: 10
      requests_per_hour: 100
    professional:
      requests_per_minute: 500
      requests_per_hour: 10000

authentication:
  providers:
    api_key:
      enabled: true
    jwt:
      enabled: true
    oauth2:
      enabled: true
```

### Database Migration
```bash
# Run database migrations
docker-compose exec auth-service python -m alembic upgrade head

# Seed initial data
docker-compose exec auth-service python -m scripts.seed_data
```

### Load Balancer Configuration
```nginx
# nginx/nginx.conf
upstream api_backend {
    server api-gateway:3000;
    # Add more servers for high availability
    # server api-gateway-2:3000;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    location / {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 Monitoring & Logging

### Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:3000']
    metrics_path: '/metrics'
    
  - job_name: 'rest-api'
    static_configs:
      - targets: ['rest-api:3001']
    metrics_path: '/metrics'
```

### Grafana Dashboards
```bash
# Import pre-built dashboards
curl -X POST http://admin:admin@localhost:3010/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @monitoring/grafana/dashboards/api-overview.json
```

### Log Aggregation
```bash
# View aggregated logs
docker-compose logs --tail=100 -f

# Export logs to external system
# Configure log shipping to ELK stack or cloud logging
```

## 🔒 Security Hardening

### 1. Network Security
```bash
# Configure firewall
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000:9999/tcp  # Block internal ports
```

### 2. Container Security
```dockerfile
# Use non-root user in containers
FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs
```

### 3. Secret Management
```bash
# Use Docker secrets for sensitive data
echo "your-jwt-secret" | docker secret create jwt_secret -
echo "your-db-password" | docker secret create db_password -
```

### 4. API Security
```yaml
# Enable rate limiting
rate_limiting:
  enabled: true
  global:
    requests_per_minute: 1000

# Enable WAF
security:
  waf:
    enabled: true
    rules:
      - name: 'sql_injection'
        action: 'block'
```

## 🚀 Scaling

### Horizontal Scaling
```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  api-gateway:
    deploy:
      replicas: 3
      
  rest-api:
    deploy:
      replicas: 3
      
  job-processor:
    deploy:
      replicas: 5
```

### Load Balancing
```bash
# Scale specific services
docker-compose up -d --scale api-gateway=3 --scale rest-api=3

# Use external load balancer (AWS ALB, HAProxy, etc.)
```

### Database Scaling
```bash
# Setup read replicas
# Configure connection pooling
# Implement caching strategy
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and push Docker images
        run: |
          docker build -t frontier/api-gateway ./gateway
          docker push frontier/api-gateway
          
      - name: Deploy to production
        run: |
          ssh production-server 'cd /app && docker-compose pull && docker-compose up -d'
```

### Health Checks
```bash
# Automated health monitoring
#!/bin/bash
HEALTH_URL="https://api.yourdomain.com/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -ne 200 ]; then
    echo "Health check failed with status $RESPONSE"
    # Send alert to monitoring system
    exit 1
fi
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Service Won't Start
```bash
# Check logs
docker-compose logs service-name

# Check resource usage
docker stats

# Restart service
docker-compose restart service-name
```

#### 2. Database Connection Issues
```bash
# Test database connectivity
docker-compose exec postgres psql -U frontier -d frontier_api -c "SELECT 1;"

# Check database logs
docker-compose logs postgres
```

#### 3. High Memory Usage
```bash
# Monitor resource usage
docker stats --no-stream

# Adjust memory limits in docker-compose.yml
services:
  api-gateway:
    mem_limit: 512m
```

#### 4. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in ./nginx/ssl/fullchain.pem -text -noout

# Renew Let's Encrypt certificate
sudo certbot renew
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';
```

#### 2. Caching Strategy
```bash
# Configure Redis caching
# Cache frequently accessed data
# Implement cache warming strategies
```

#### 3. API Optimization
```bash
# Enable response compression
# Implement request batching
# Use GraphQL for flexible queries
```

## 📈 Backup & Recovery

### Database Backup
```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec postgres pg_dump -U frontier frontier_api > backup_$DATE.sql

# Upload to cloud storage
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
```

### Disaster Recovery
```bash
# Restore from backup
docker-compose exec postgres psql -U frontier -d frontier_api < backup_20240101_120000.sql

# Test recovery procedure regularly
```

## 🎯 Best Practices

### Development
- Use feature branches and pull requests
- Run tests before deployment
- Keep dependencies updated
- Document API changes

### Production
- Monitor all critical metrics
- Implement automated alerting
- Regular security updates
- Capacity planning

### Operations
- Regular backups and recovery testing
- Log rotation and cleanup
- Performance optimization
- Security audits

## 📞 Support

### Getting Help
- **Documentation**: https://docs.frontier.ai
- **API Status**: https://status.frontier.ai
- **Support Email**: support@frontier.ai
- **Community**: https://community.frontier.ai

### Emergency Contacts
- **Production Issues**: emergency@frontier.ai
- **Security Issues**: security@frontier.ai
- **On-call Engineer**: +1-555-FRONTIER

---

## 📝 Changelog

### v1.0.0 (2024-01-01)
- Initial release
- Complete API ecosystem
- Production deployment ready
- Comprehensive monitoring
- Multi-language SDK support
