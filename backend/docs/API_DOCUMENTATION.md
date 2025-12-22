# Omnivox AI Backend API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Monitoring](#monitoring)
8. [Performance Optimization](#performance-optimization)
9. [Troubleshooting](#troubleshooting)

## Overview

The Omnivox AI Backend API provides a comprehensive suite of endpoints for managing AI-powered call center operations, user management, campaign management, and real-time monitoring.

### Base URL
- Production: `https://api.omnivox.ai`
- Development: `http://localhost:3000`

### API Version
- Current Version: `v1`
- Base Path: `/api/v1`

### Content Type
All requests and responses use `application/json` unless otherwise specified.

## Getting Started

### Prerequisites
- Node.js 16+
- PostgreSQL 13+
- Redis 6+ (optional, for caching)
- Valid API credentials

### Quick Start

1. **Obtain API credentials**
   ```bash
   # Contact support for API key and secret
   curl -X POST https://api.omnivox.ai/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email": "your@email.com", "password": "secure_password"}'
   ```

2. **Authenticate and get access token**
   ```bash
   curl -X POST https://api.omnivox.ai/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "your@email.com", "password": "secure_password"}'
   ```

3. **Make your first API call**
   ```bash
   curl -X GET https://api.omnivox.ai/api/v1/users/profile \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

## Authentication

### JWT Bearer Token

All authenticated endpoints require a valid JWT token in the Authorization header.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Lifecycle

- **Access Token**: Valid for 1 hour
- **Refresh Token**: Valid for 30 days
- **Auto-renewal**: Tokens can be refreshed before expiry

### Authentication Endpoints

#### POST /auth/login
Authenticate user and receive access token.

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "expiresIn": 3600,
    "user": {
      "id": "string",
      "email": "string",
      "role": "string"
    }
  }
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "string (required)"
}
```

## API Endpoints

### User Management

#### GET /api/v1/users/profile
Get current user profile.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "string",
    "createdAt": "string (ISO 8601)",
    "lastLoginAt": "string (ISO 8601)"
  }
}
```

#### PUT /api/v1/users/profile
Update user profile.

**Authentication:** Required

**Request Body:**
```json
{
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "phone": "string (optional)"
}
```

#### GET /api/v1/users
List all users (admin only).

**Authentication:** Required (Admin)

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50, max: 100)
- `role` (string): Filter by user role
- `search` (string): Search in name/email

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "role": "string",
      "isActive": "boolean",
      "createdAt": "string"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Campaign Management

#### POST /api/v1/campaigns
Create a new campaign.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "type": "OUTBOUND | INBOUND | PREDICTIVE",
  "status": "DRAFT | ACTIVE | PAUSED | COMPLETED",
  "settings": {
    "dialRatio": "number (for PREDICTIVE)",
    "maxRetries": "number",
    "retryInterval": "number (minutes)"
  },
  "scheduleConfig": {
    "startDate": "string (ISO 8601)",
    "endDate": "string (ISO 8601)",
    "timezone": "string",
    "workingHours": {
      "start": "string (HH:mm)",
      "end": "string (HH:mm)"
    }
  }
}
```

#### GET /api/v1/campaigns
List campaigns.

**Authentication:** Required

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by campaign status
- `type`: Filter by campaign type
- `search`: Search in campaign name/description

### Flow Management

#### POST /api/v1/flows
Create a conversation flow.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "nodes": [
    {
      "id": "string",
      "type": "START | MESSAGE | CONDITION | ACTION | END",
      "config": {
        "message": "string (for MESSAGE nodes)",
        "condition": "string (for CONDITION nodes)",
        "action": "object (for ACTION nodes)"
      },
      "position": {
        "x": "number",
        "y": "number"
      }
    }
  ],
  "connections": [
    {
      "from": "string (node id)",
      "to": "string (node id)",
      "condition": "string (optional)"
    }
  ]
}
```

### Contacts Management

#### POST /api/v1/contacts
Add a new contact.

**Authentication:** Required

**Request Body:**
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "phone": "string (required)",
  "email": "string (optional)",
  "customFields": {
    "key": "value"
  },
  "tags": ["string"],
  "campaignId": "string (optional)"
}
```

#### GET /api/v1/contacts
List contacts.

**Query Parameters:**
- `page`, `limit`: Pagination
- `campaignId`: Filter by campaign
- `tags`: Filter by tags (comma-separated)
- `search`: Search in name/phone/email

### Call Management

#### POST /api/v1/calls/initiate
Initiate an outbound call.

**Authentication:** Required

**Request Body:**
```json
{
  "contactId": "string (required)",
  "campaignId": "string (required)",
  "flowId": "string (optional)",
  "scheduledAt": "string (ISO 8601, optional)"
}
```

#### GET /api/v1/calls
List call records.

**Query Parameters:**
- `page`, `limit`: Pagination
- `campaignId`: Filter by campaign
- `status`: Filter by call status
- `dateFrom`, `dateTo`: Filter by date range

### Analytics

#### GET /api/v1/analytics/dashboard
Get dashboard analytics.

**Authentication:** Required

**Query Parameters:**
- `period`: `day | week | month | year`
- `campaignId`: Filter by campaign
- `dateFrom`, `dateTo`: Custom date range

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalCalls": "number",
      "successfulCalls": "number",
      "averageDuration": "number (seconds)",
      "conversionRate": "number (percentage)"
    },
    "trends": {
      "calls": [
        {
          "date": "string",
          "count": "number"
        }
      ],
      "conversions": [
        {
          "date": "string",
          "rate": "number"
        }
      ]
    }
  }
}
```

### Monitoring

#### GET /api/v1/monitoring/health
System health check.

**Authentication:** Not required

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "string (ISO 8601)",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "twilio": "healthy"
  },
  "metrics": {
    "uptime": "number (seconds)",
    "memoryUsage": "number (percentage)",
    "cpuUsage": "number (percentage)"
  }
}
```

#### GET /api/v1/monitoring/metrics
System metrics.

**Authentication:** Required (Admin)

**Response:** Real-time metrics data including performance counters, resource usage, and error rates.

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "Additional error details"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error

### Common Error Codes

- `AUTH_REQUIRED` - Authentication required
- `AUTH_INVALID` - Invalid authentication credentials
- `AUTH_EXPIRED` - Token expired
- `VALIDATION_ERROR` - Request validation failed
- `RESOURCE_NOT_FOUND` - Requested resource not found
- `RESOURCE_CONFLICT` - Resource already exists
- `RATE_LIMITED` - Rate limit exceeded
- `INTERNAL_ERROR` - Internal server error

## Rate Limiting

### Default Limits

- **Authenticated requests**: 1000 requests per hour per user
- **Unauthenticated requests**: 100 requests per hour per IP
- **Bulk operations**: 50 requests per minute

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### Exceeding Limits

When rate limits are exceeded, the API returns:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Try again later."
  }
}
```

## Performance Optimization

### Caching

- **Response Caching**: GET endpoints are cached for 5 minutes
- **Cache Headers**: Check `X-Cache: HIT|MISS` header
- **Cache Invalidation**: Automatic on data mutations

### Pagination

- **Default page size**: 50 items
- **Maximum page size**: 100 items
- **Cursor-based pagination**: Available for large datasets

### Compression

- **Gzip compression**: Automatic for responses > 1KB
- **Request compression**: Supported with `Content-Encoding: gzip`

### Optimization Headers

```http
X-Response-Time: 45ms
X-Cache: HIT
Content-Encoding: gzip
```

## Monitoring

### Health Checks

Monitor API health using the health check endpoint:

```bash
curl https://api.omnivox.ai/api/v1/monitoring/health
```

### Metrics

Real-time metrics available at:
- `/api/v1/monitoring/metrics` - Detailed metrics
- `/api/v1/monitoring/dashboard` - Web dashboard

### Alerting

Set up monitoring for:
- Response times > 1000ms
- Error rates > 5%
- Memory usage > 80%
- Database connection issues

## Troubleshooting

### Common Issues

#### 1. Authentication Errors

**Issue**: `401 Unauthorized`
**Solution**: 
- Verify token is included in Authorization header
- Check token expiry and refresh if needed
- Ensure correct Bearer token format

```bash
# Correct format
curl -H "Authorization: Bearer YOUR_TOKEN" ...

# Incorrect format (missing 'Bearer')
curl -H "Authorization: YOUR_TOKEN" ...
```

#### 2. Validation Errors

**Issue**: `422 Validation Error`
**Solution**: Check request body format and required fields

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "email": "Invalid email format",
      "phone": "Phone number is required"
    }
  }
}
```

#### 3. Rate Limiting

**Issue**: `429 Rate Limited`
**Solution**: 
- Implement exponential backoff
- Check rate limit headers
- Consider upgrading API plan

#### 4. Server Errors

**Issue**: `500 Internal Server Error`
**Solution**:
- Check API status page
- Retry with exponential backoff
- Contact support if persists

### Debug Mode

Enable debug logging by including:

```http
X-Debug: true
```

This provides additional information in error responses (development only).

### Support

- **Documentation**: https://docs.omnivox.ai
- **Status Page**: https://status.omnivox.ai
- **Support**: support@omnivox.ai
- **GitHub**: https://github.com/omnivox-ai/api-docs

### SDKs and Libraries

- **JavaScript/TypeScript**: `@kennex/api-client`
- **Python**: `kennex-python`
- **Go**: `github.com/kennex-ai/go-client`
- **PHP**: `kennex/api-client`

### Changelog

#### v1.2.0 (2024-01-15)
- Added flow execution analytics
- Improved error handling
- Enhanced monitoring dashboard

#### v1.1.0 (2024-01-01)
- Added campaign scheduling
- Implemented rate limiting
- Added bulk operations

#### v1.0.0 (2023-12-01)
- Initial API release
- Basic CRUD operations
- Authentication system