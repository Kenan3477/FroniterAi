# API Ecosystem Implementation Guide

## Overview
This document provides a complete implementation guide for the Frontier API ecosystem, including REST and GraphQL endpoints, authentication, rate limiting, and SDK generation.

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for SDK generation)
- Python 3.11+ (for GraphQL service)
- PostgreSQL 15+
- Redis 7+

### Environment Setup

1. **Clone and Navigate**
   ```bash
   cd c:\Users\kenne\Frontier\api
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your specific configuration
   ```

3. **Start Services**
   ```bash
   docker-compose up -d
   ```

4. **Verify Health**
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:3000/health
   curl http://localhost:4000/health
   ```

## Service Architecture

### API Gateway (Kong) - Port 8000
- **Proxy**: Routes requests to appropriate services
- **Authentication**: JWT validation and API key verification
- **Rate Limiting**: Distributed rate limiting with Redis
- **Monitoring**: Prometheus metrics collection

### REST API Service - Port 3000
- **Framework**: FastAPI with async support
- **Features**: OpenAPI 3.0 documentation, input validation, error handling
- **Endpoints**: All Frontier capabilities exposed via RESTful interface

### GraphQL API Service - Port 4000
- **Framework**: Strawberry GraphQL with federation
- **Features**: Type-safe schema, real-time subscriptions, introspection
- **Schema**: Unified interface for all Frontier capabilities

### Authentication Service - Port 3001
- **OAuth2**: Authorization code, client credentials, password grants
- **JWT**: Token generation, validation, and refresh
- **API Keys**: Creation, management, and validation
- **OIDC**: OpenID Connect compliant user info endpoint

### Rate Limiter Service - Port 3002
- **Algorithms**: Token bucket, sliding window, fixed window
- **Tiers**: Free, Developer, Professional, Enterprise
- **Quotas**: Resource-based quota management
- **Analytics**: Usage tracking and reporting

## Authentication Methods

### 1. JWT Tokens (Recommended)

**Obtain Token:**
```bash
curl -X POST http://localhost:3001/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "password",
    "username": "demo@frontier.ai",
    "password": ""
  }'
```

**Use Token:**
```bash
curl -X GET http://localhost:8000/api/v1/visual-design/brand-identity \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. API Keys

**Create API Key:**
```bash
curl -X POST http://localhost:3001/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Application",
    "description": "API key for my app",
    "scopes": ["api:read", "api:write"]
  }'
```

**Use API Key:**
```bash
curl -X GET http://localhost:8000/api/v1/visual-design/brand-identity \
  -H "X-API-Key: fk_your_api_key_here"
```

### 3. OAuth2 Flow

**Authorization URL:**
```
http://localhost:3001/authorize?client_id=frontier-api-client&response_type=code&redirect_uri=http://localhost:3000/auth/callback&scope=openid+email+profile
```

**Exchange Code for Token:**
```bash
curl -X POST http://localhost:3001/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTHORIZATION_CODE",
    "client_id": "frontier-api-client",
    "client_secret": "frontier-api-secret-change-in-production"
  }'
```

## API Endpoints

### Visual Design
```bash
# Generate brand identity
POST /api/v1/visual-design/brand-identity
{
  "business_name": "TechCorp Solutions",
  "industry": "Technology",
  "style": "modern",
  "preferred_colors": ["blue", "white"]
}

# Generate responsive layouts
POST /api/v1/visual-design/layouts
{
  "layout_type": "homepage",
  "target_device": "responsive",
  "content_sections": ["hero", "features", "testimonials"]
}
```

### Code Quality
```bash
# Scan code quality
POST /api/v1/code-quality/scan
{
  "code": "def hello():\n    print('Hello World')",
  "language": "python",
  "include_security": true
}
```

### Image Generation
```bash
# Generate assets
POST /api/v1/image-generation/assets
{
  "description": "Modern tech company logo",
  "asset_type": "logo",
  "style": "minimalist",
  "format": "svg"
}
```

### Audio/Video
```bash
# Generate video script
POST /api/v1/audio-video/scripts
{
  "topic": "Product Demo",
  "duration": "60s",
  "target_audience": "Business professionals",
  "tone": "professional"
}

# Generate voiceover
POST /api/v1/audio-video/voiceover
{
  "text": "Welcome to our amazing product demo",
  "voice": "professional-female",
  "language": "en",
  "format": "mp3"
}
```

## GraphQL Usage

### Connect to GraphQL Playground
Visit: http://localhost:4000/graphql

### Example Queries

**Get User Info:**
```graphql
query GetUser {
  me {
    id
    email
    firstName
    lastName
    tier
    rateLimits {
      requestsPerHour
      requestsRemaining
    }
  }
}
```

**Generate Brand Identity:**
```graphql
mutation CreateBrandIdentity {
  createBrandIdentity(input: {
    businessName: "TechCorp"
    industry: "Technology"
    style: MODERN
    preferredColors: ["blue", "white"]
  }) {
    id
    businessName
    logos {
      type
      format
      url
    }
    colorPalette {
      primary
      secondary
      accent
    }
    typography {
      headingFont
      bodyFont
    }
  }
}
```

**Real-time Progress Subscription:**
```graphql
subscription ScanProgress {
  scanProgress(scanId: "scan-id-here")
}
```

## Rate Limiting

### Tier Limits
- **Free**: 100 requests/hour, 5 requests/minute
- **Developer**: 1,000 requests/hour, 50 requests/minute
- **Professional**: 10,000 requests/hour, 500 requests/minute
- **Enterprise**: Custom limits

### Headers
Rate limit information is returned in response headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 845
X-RateLimit-Reset: 1703025600
```

### Check Rate Limit Status
```bash
curl -X GET http://localhost:3002/status/USER_ID?tier=developer
```

## SDK Generation

### Available SDKs
- JavaScript/TypeScript
- Python
- Java
- C#
- Go
- PHP
- Ruby
- Swift
- Kotlin
- Rust

### Generate SDK
```bash
# JavaScript/TypeScript
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:8000/openapi.json \
  -g typescript-fetch \
  -o ./sdks/typescript

# Python
openapi-generator generate \
  -i http://localhost:8000/openapi.json \
  -g python \
  -o ./sdks/python
```

## Monitoring and Analytics

### Prometheus Metrics
- Visit: http://localhost:9090
- Metrics include request counts, response times, error rates

### Grafana Dashboards
- Visit: http://localhost:3004 (admin/admin)
- Pre-built dashboards for API performance

### Jaeger Tracing
- Visit: http://localhost:16686
- Distributed tracing for request flows

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": ["Email is required", "Password must be at least 8 characters"]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (resource already exists)
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## Security

### TLS Configuration
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/ssl/certs/frontier.crt;
    ssl_certificate_key /etc/ssl/private/frontier.key;
    ssl_protocols TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
}
```

### CORS Configuration
```javascript
{
  "allow_origins": ["https://app.frontier.ai", "https://docs.frontier.ai"],
  "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "allow_headers": ["Authorization", "Content-Type", "X-API-Key"],
  "allow_credentials": true
}
```

### Input Validation
All endpoints use Pydantic models for automatic input validation and sanitization.

## Deployment

### Production Environment
```bash
# Set production environment
export NODE_ENV=production
export DATABASE_URL=postgresql://user:pass@prod-db:5432/frontier_api
export REDIS_URL=redis://prod-redis:6379

# Use production secrets
export JWT_SECRET=your-production-jwt-secret
export OAUTH_CLIENT_SECRET=your-production-oauth-secret

# Start with SSL
docker-compose -f docker-compose.prod.yml up -d
```

### Health Checks
All services provide health check endpoints:
- Kong: `GET /health`
- REST API: `GET /health`
- GraphQL: `GET /health`
- Auth Service: `GET /health`
- Rate Limiter: `GET /health`

## Troubleshooting

### Common Issues

**Connection Refused:**
```bash
# Check if services are running
docker-compose ps

# Check logs
docker-compose logs kong
docker-compose logs rest-api
```

**Authentication Errors:**
```bash
# Verify JWT token
curl -X GET http://localhost:3001/userinfo \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check token expiration
echo 'YOUR_JWT_TOKEN' | base64 -d | jq .exp
```

**Rate Limit Issues:**
```bash
# Check current limits
curl -X GET http://localhost:3002/status/USER_ID?tier=free

# Reset rate limits (admin)
curl -X POST http://localhost:3002/quota/reset \
  -d "user_id=USER_ID"
```

## Support

For technical support and questions:
- **Documentation**: http://localhost:3003/docs
- **API Reference**: http://localhost:8000/docs
- **GraphQL Playground**: http://localhost:4000/graphql
- **Status Page**: http://localhost:9090 (Prometheus)
- **Monitoring**: http://localhost:3004 (Grafana)
