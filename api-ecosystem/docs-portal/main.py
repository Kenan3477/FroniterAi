"""
Interactive API Documentation Portal
Provides comprehensive documentation, examples, and testing interface
"""

import asyncio
import json
import yaml
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocumentationPortal:
    """Main documentation portal application"""
    
    def __init__(self):
        self.app = FastAPI(
            title="Frontier API Documentation",
            description="Interactive documentation and testing portal",
            version="1.0.0"
        )
        
        # Templates and static files
        self.templates = Jinja2Templates(directory="templates")
        
        # API metadata
        self.api_endpoints = self._load_api_endpoints()
        self.code_examples = self._load_code_examples()
        self.tutorials = self._load_tutorials()
        
        self._setup_middleware()
        self._setup_routes()
    
    def _setup_middleware(self):
        """Setup FastAPI middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def _setup_routes(self):
        """Setup application routes"""
        
        # Serve static files
        self.app.mount("/static", StaticFiles(directory="static"), name="static")
        
        @self.app.get("/", response_class=HTMLResponse)
        async def home(request: Request):
            """Homepage with API overview"""
            return self.templates.TemplateResponse("index.html", {
                "request": request,
                "title": "Frontier AI API Documentation",
                "api_stats": await self._get_api_stats(),
                "featured_endpoints": self._get_featured_endpoints()
            })
        
        @self.app.get("/docs", response_class=HTMLResponse)
        async def api_reference(request: Request):
            """API reference documentation"""
            return self.templates.TemplateResponse("api-reference.html", {
                "request": request,
                "title": "API Reference",
                "endpoints": self.api_endpoints,
                "categories": self._get_endpoint_categories()
            })
        
        @self.app.get("/docs/{category}", response_class=HTMLResponse)
        async def category_docs(request: Request, category: str):
            """Category-specific documentation"""
            category_endpoints = [ep for ep in self.api_endpoints if ep["category"] == category]
            
            if not category_endpoints:
                raise HTTPException(status_code=404, detail="Category not found")
            
            return self.templates.TemplateResponse("category.html", {
                "request": request,
                "title": f"{category.title()} API",
                "category": category,
                "endpoints": category_endpoints,
                "examples": self.code_examples.get(category, [])
            })
        
        @self.app.get("/docs/{category}/{endpoint}", response_class=HTMLResponse)
        async def endpoint_docs(request: Request, category: str, endpoint: str):
            """Individual endpoint documentation"""
            endpoint_data = next(
                (ep for ep in self.api_endpoints 
                 if ep["category"] == category and ep["name"] == endpoint),
                None
            )
            
            if not endpoint_data:
                raise HTTPException(status_code=404, detail="Endpoint not found")
            
            return self.templates.TemplateResponse("endpoint.html", {
                "request": request,
                "title": f"{endpoint_data['summary']}",
                "endpoint": endpoint_data,
                "code_examples": self._get_endpoint_examples(category, endpoint),
                "try_it_config": self._get_try_it_config(endpoint_data)
            })
        
        @self.app.get("/tutorials", response_class=HTMLResponse)
        async def tutorials_page(request: Request):
            """Tutorials and guides"""
            return self.templates.TemplateResponse("tutorials.html", {
                "request": request,
                "title": "Tutorials & Guides",
                "tutorials": self.tutorials,
                "categories": list(set(t["category"] for t in self.tutorials))
            })
        
        @self.app.get("/tutorials/{tutorial_id}", response_class=HTMLResponse)
        async def tutorial_detail(request: Request, tutorial_id: str):
            """Individual tutorial"""
            tutorial = next(
                (t for t in self.tutorials if t["id"] == tutorial_id),
                None
            )
            
            if not tutorial:
                raise HTTPException(status_code=404, detail="Tutorial not found")
            
            return self.templates.TemplateResponse("tutorial-detail.html", {
                "request": request,
                "title": tutorial["title"],
                "tutorial": tutorial
            })
        
        @self.app.get("/playground", response_class=HTMLResponse)
        async def api_playground(request: Request):
            """Interactive API testing playground"""
            return self.templates.TemplateResponse("playground.html", {
                "request": request,
                "title": "API Playground",
                "endpoints": self.api_endpoints,
                "auth_methods": ["api_key", "jwt", "oauth2"]
            })
        
        @self.app.get("/sdks", response_class=HTMLResponse)
        async def sdks_page(request: Request):
            """SDK downloads and documentation"""
            sdks = [
                {
                    "language": "JavaScript/TypeScript",
                    "package": "@frontier-ai/sdk",
                    "install": "npm install @frontier-ai/sdk",
                    "docs_url": "/sdks/javascript",
                    "download_url": "/downloads/javascript-sdk.zip",
                    "version": "1.0.0"
                },
                {
                    "language": "Python",
                    "package": "frontier-ai-sdk",
                    "install": "pip install frontier-ai-sdk",
                    "docs_url": "/sdks/python",
                    "download_url": "/downloads/python-sdk.zip",
                    "version": "1.0.0"
                },
                {
                    "language": "Java",
                    "package": "ai.frontier:frontier-java-sdk",
                    "install": "Maven/Gradle dependency",
                    "docs_url": "/sdks/java",
                    "download_url": "/downloads/java-sdk.zip",
                    "version": "1.0.0"
                },
                {
                    "language": "C#",
                    "package": "Frontier.AI.SDK",
                    "install": "dotnet add package Frontier.AI.SDK",
                    "docs_url": "/sdks/csharp",
                    "download_url": "/downloads/csharp-sdk.zip",
                    "version": "1.0.0"
                },
                {
                    "language": "Go",
                    "package": "github.com/frontier-ai/go-sdk",
                    "install": "go get github.com/frontier-ai/go-sdk",
                    "docs_url": "/sdks/go",
                    "download_url": "/downloads/go-sdk.zip",
                    "version": "1.0.0"
                },
                {
                    "language": "Ruby",
                    "package": "frontier-ai",
                    "install": "gem install frontier-ai",
                    "docs_url": "/sdks/ruby",
                    "download_url": "/downloads/ruby-sdk.zip",
                    "version": "1.0.0"
                },
                {
                    "language": "PHP",
                    "package": "frontier-ai/php-sdk",
                    "install": "composer require frontier-ai/php-sdk",
                    "docs_url": "/sdks/php",
                    "download_url": "/downloads/php-sdk.zip",
                    "version": "1.0.0"
                }
            ]
            
            return self.templates.TemplateResponse("sdks.html", {
                "request": request,
                "title": "SDKs & Libraries",
                "sdks": sdks
            })
        
        @self.app.get("/examples", response_class=HTMLResponse)
        async def examples_page(request: Request):
            """Code examples gallery"""
            return self.templates.TemplateResponse("examples.html", {
                "request": request,
                "title": "Code Examples",
                "examples": self._get_all_examples(),
                "languages": ["javascript", "python", "java", "csharp", "go", "ruby", "php"]
            })
        
        @self.app.get("/status", response_class=HTMLResponse)
        async def status_page(request: Request):
            """API status and monitoring"""
            return self.templates.TemplateResponse("status.html", {
                "request": request,
                "title": "API Status",
                "status": await self._get_system_status(),
                "metrics": await self._get_api_metrics()
            })
        
        # API endpoints for documentation
        @self.app.get("/api/search")
        async def search_docs(q: str, limit: int = 10):
            """Search documentation"""
            results = []
            query = q.lower()
            
            # Search endpoints
            for endpoint in self.api_endpoints:
                if (query in endpoint["name"].lower() or 
                    query in endpoint["summary"].lower() or 
                    query in endpoint["description"].lower()):
                    results.append({
                        "type": "endpoint",
                        "title": endpoint["summary"],
                        "description": endpoint["description"][:150] + "...",
                        "url": f"/docs/{endpoint['category']}/{endpoint['name']}",
                        "category": endpoint["category"]
                    })
            
            # Search tutorials
            for tutorial in self.tutorials:
                if (query in tutorial["title"].lower() or 
                    query in tutorial["description"].lower()):
                    results.append({
                        "type": "tutorial",
                        "title": tutorial["title"],
                        "description": tutorial["description"][:150] + "...",
                        "url": f"/tutorials/{tutorial['id']}",
                        "category": tutorial["category"]
                    })
            
            return {"results": results[:limit], "total": len(results)}
        
        @self.app.post("/api/try-it")
        async def try_api_endpoint(request: Request):
            """Proxy API calls for try-it functionality"""
            data = await request.json()
            
            endpoint = data.get("endpoint")
            method = data.get("method", "GET")
            params = data.get("params", {})
            headers = data.get("headers", {})
            body = data.get("body")
            
            # Make request to actual API
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.request(
                        method=method,
                        url=f"https://api.frontier.ai{endpoint}",
                        params=params,
                        headers=headers,
                        json=body if body else None,
                        timeout=30.0
                    )
                    
                    return {
                        "status_code": response.status_code,
                        "headers": dict(response.headers),
                        "body": response.text,
                        "json": response.json() if response.headers.get("content-type", "").startswith("application/json") else None
                    }
            except Exception as e:
                return {
                    "error": str(e),
                    "status_code": 500
                }
        
        @self.app.get("/api/openapi.json")
        async def get_openapi_spec():
            """Get OpenAPI specification"""
            return self._generate_openapi_spec()
    
    def _load_api_endpoints(self) -> List[Dict[str, Any]]:
        """Load API endpoint definitions"""
        return [
            {
                "category": "visual-design",
                "name": "brand-identity",
                "method": "POST",
                "path": "/api/v1/visual-design/brand-identity",
                "summary": "Generate Brand Identity",
                "description": "Create comprehensive brand identity packages including logos, color palettes, and typography guidelines.",
                "parameters": [
                    {
                        "name": "company_name",
                        "type": "string",
                        "required": True,
                        "description": "Name of the company"
                    },
                    {
                        "name": "industry",
                        "type": "string",
                        "required": True,
                        "description": "Industry sector"
                    },
                    {
                        "name": "style",
                        "type": "string",
                        "required": False,
                        "default": "modern",
                        "description": "Design style preference"
                    }
                ],
                "response_example": {
                    "success": True,
                    "data": {
                        "company_name": "TechCorp",
                        "logo_urls": ["https://cdn.frontier.ai/logos/techcorp_primary.svg"],
                        "color_palette": {"primary": "#2563eb", "secondary": "#64748b"},
                        "typography": {"heading": "Inter", "body": "Open Sans"}
                    }
                }
            },
            {
                "category": "visual-design",
                "name": "ui-layout",
                "method": "POST",
                "path": "/api/v1/visual-design/ui-layout",
                "summary": "Generate UI Layout",
                "description": "Create responsive user interface layouts optimized for different devices and screen sizes.",
                "parameters": [
                    {
                        "name": "layout_type",
                        "type": "string",
                        "required": True,
                        "description": "Type of layout (landing, dashboard, etc.)"
                    },
                    {
                        "name": "content_sections",
                        "type": "array",
                        "required": True,
                        "description": "Required content sections"
                    }
                ],
                "response_example": {
                    "success": True,
                    "data": {
                        "layout_id": "layout_123",
                        "html_code": "<div class='container'>...</div>",
                        "css_code": ".container { display: grid; }"
                    }
                }
            },
            {
                "category": "code-quality",
                "name": "analyze",
                "method": "POST",
                "path": "/api/v1/code-quality/analyze",
                "summary": "Analyze Code Quality",
                "description": "Comprehensive code analysis including pattern detection, security scanning, and performance optimization suggestions.",
                "parameters": [
                    {
                        "name": "code",
                        "type": "string",
                        "required": True,
                        "description": "Source code to analyze"
                    },
                    {
                        "name": "language",
                        "type": "string",
                        "required": True,
                        "description": "Programming language"
                    }
                ],
                "response_example": {
                    "success": True,
                    "data": {
                        "quality_score": 0.85,
                        "issues": ["Unused variable on line 42"],
                        "suggestions": ["Extract method for complex logic"]
                    }
                }
            },
            {
                "category": "image-generation",
                "name": "create",
                "method": "POST",
                "path": "/api/v1/image-generation/create",
                "summary": "Generate Images",
                "description": "Create high-quality images from text descriptions using advanced AI models.",
                "parameters": [
                    {
                        "name": "prompt",
                        "type": "string",
                        "required": True,
                        "description": "Text description of the image"
                    },
                    {
                        "name": "style",
                        "type": "string",
                        "required": False,
                        "default": "photorealistic",
                        "description": "Image style"
                    },
                    {
                        "name": "size",
                        "type": "string",
                        "required": False,
                        "default": "1024x1024",
                        "description": "Image dimensions"
                    }
                ],
                "response_example": {
                    "success": True,
                    "data": {
                        "image_id": "img_123",
                        "image_urls": ["https://cdn.frontier.ai/generated/img_123.png"],
                        "generation_time": 2.5
                    }
                }
            },
            {
                "category": "audio-video",
                "name": "transcription",
                "method": "POST",
                "path": "/api/v1/audio-video/transcription",
                "summary": "Transcribe Audio",
                "description": "Convert audio and video files to accurate text transcriptions with optional timestamps.",
                "parameters": [
                    {
                        "name": "file",
                        "type": "file",
                        "required": True,
                        "description": "Audio or video file to transcribe"
                    },
                    {
                        "name": "language",
                        "type": "string",
                        "required": False,
                        "default": "auto",
                        "description": "Audio language"
                    }
                ],
                "response_example": {
                    "success": True,
                    "data": {
                        "text": "Hello, this is a sample transcription.",
                        "confidence": 0.98,
                        "duration": 15.5
                    }
                }
            },
            {
                "category": "business",
                "name": "financial-analysis",
                "method": "POST",
                "path": "/api/v1/business/financial-analysis",
                "summary": "Analyze Financials",
                "description": "Comprehensive financial analysis with insights and recommendations based on financial data.",
                "parameters": [
                    {
                        "name": "financial_data",
                        "type": "object",
                        "required": True,
                        "description": "Financial statements and data"
                    },
                    {
                        "name": "analysis_type",
                        "type": "string",
                        "required": False,
                        "default": "comprehensive",
                        "description": "Type of analysis"
                    }
                ],
                "response_example": {
                    "success": True,
                    "data": {
                        "metrics": {"revenue_growth": "12.5%", "profit_margin": "18.3%"},
                        "recommendations": ["Focus on high-margin products"]
                    }
                }
            }
        ]
    
    def _load_code_examples(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load code examples for different categories"""
        return {
            "visual-design": [
                {
                    "title": "Generate Brand Identity",
                    "language": "javascript",
                    "code": '''import { FrontierClient } from '@frontier-ai/sdk';

const client = new FrontierClient({
  apiKey: 'fk_live_your_api_key'
});

const brandIdentity = await client.createBrandIdentity({
  company_name: 'TechCorp',
  industry: 'technology',
  style: 'modern',
  target_audience: 'developers'
});

console.log(brandIdentity);'''
                },
                {
                    "title": "Generate Brand Identity",
                    "language": "python",
                    "code": '''from frontier_ai import FrontierClient

client = FrontierClient(api_key='fk_live_your_api_key')

brand_identity = client.create_brand_identity(
    company_name='TechCorp',
    industry='technology',
    style='modern',
    target_audience='developers'
)

print(brand_identity)'''
                }
            ],
            "code-quality": [
                {
                    "title": "Analyze Code Quality",
                    "language": "javascript",
                    "code": '''const analysis = await client.analyzeCode({
  code: `
    function fibonacci(n) {
      if (n <= 1) return n;
      return fibonacci(n-1) + fibonacci(n-2);
    }
  `,
  language: 'javascript',
  analysis_types: ['patterns', 'performance', 'security']
});

console.log('Quality Score:', analysis.quality_score);
console.log('Issues:', analysis.issues);
console.log('Suggestions:', analysis.suggestions);'''
                }
            ],
            "image-generation": [
                {
                    "title": "Generate Product Image",
                    "language": "python",
                    "code": '''# Generate a product image
image = client.generate_image(
    prompt="A modern smartphone on a clean white background, professional product photography",
    style="photorealistic",
    size="1024x1024"
)

print(f"Generated image: {image.image_urls[0]}")'''
                }
            ]
        }
    
    def _load_tutorials(self) -> List[Dict[str, Any]]:
        """Load tutorial data"""
        return [
            {
                "id": "getting-started",
                "title": "Getting Started with Frontier API",
                "description": "Learn the basics of using the Frontier AI API, from authentication to your first API call.",
                "category": "basics",
                "duration": "10 minutes",
                "difficulty": "beginner",
                "content": """
# Getting Started with Frontier API

Welcome to the Frontier AI API! This tutorial will guide you through the basics of using our comprehensive AI platform.

## Step 1: Get Your API Key

1. Sign up at [dashboard.frontier.ai](https://dashboard.frontier.ai)
2. Navigate to the API Keys section
3. Create a new API key with appropriate scopes
4. Keep your API key secure and never expose it in client-side code

## Step 2: Make Your First API Call

Here's a simple example to generate a brand identity:

```bash
curl -X POST https://api.frontier.ai/api/v1/visual-design/brand-identity \\
  -H "X-API-Key: fk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "company_name": "TechCorp",
    "industry": "technology",
    "style": "modern"
  }'
```

## Step 3: Handle the Response

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    "company_name": "TechCorp",
    "logo_urls": ["https://cdn.frontier.ai/logos/techcorp_primary.svg"],
    "color_palette": {
      "primary": "#2563eb",
      "secondary": "#64748b"
    }
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "execution_time": 2.5
}
```

## Next Steps

- Explore the [API Reference](/docs) for all available endpoints
- Try our [SDKs](/sdks) for your preferred programming language
- Check out more [Examples](/examples) and [Tutorials](/tutorials)
"""
            },
            {
                "id": "authentication",
                "title": "Authentication Methods",
                "description": "Learn about different authentication methods including API keys, JWT tokens, and OAuth2.",
                "category": "auth",
                "duration": "15 minutes",
                "difficulty": "intermediate",
                "content": """
# Authentication Methods

Frontier API supports multiple authentication methods to suit different use cases.

## API Keys (Recommended)

API keys are the simplest and most common authentication method:

```javascript
const client = new FrontierClient({
  apiKey: 'fk_live_your_api_key'
});
```

### API Key Types
- **Live keys** (`fk_live_...`): For production use
- **Test keys** (`fk_test_...`): For development and testing

## JWT Tokens

For user-based authentication in web applications:

```javascript
// Login to get JWT token
const auth = await fetch('https://api.frontier.ai/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});

const { access_token } = await auth.json();

// Use JWT token
const client = new FrontierClient({
  accessToken: access_token
});
```

## OAuth2

For third-party applications:

1. Register your application at [dashboard.frontier.ai](https://dashboard.frontier.ai)
2. Implement OAuth2 authorization code flow
3. Exchange authorization code for access token

## Security Best Practices

- Never expose API keys in client-side code
- Use environment variables for API keys
- Implement proper token refresh for JWT
- Use HTTPS for all API calls
- Rotate API keys regularly
"""
            },
            {
                "id": "rate-limiting",
                "title": "Understanding Rate Limits",
                "description": "Learn how rate limiting works and how to handle rate limit responses.",
                "category": "advanced",
                "duration": "10 minutes",
                "difficulty": "intermediate",
                "content": """
# Understanding Rate Limits

Rate limiting ensures fair usage and maintains API performance for all users.

## Rate Limit Headers

Every API response includes rate limit information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Rate Limit Tiers

Different subscription tiers have different limits:

- **Free**: 100 requests/hour
- **Developer**: 1,000 requests/hour  
- **Professional**: 10,000 requests/hour
- **Enterprise**: Custom limits

## Handling Rate Limits

When you exceed rate limits, you'll receive a 429 response:

```json
{
  "error": "Rate limit exceeded",
  "retry_after": 60
}
```

### Best Practices

1. **Implement exponential backoff**:
```javascript
async function makeRequestWithRetry(requestFn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

2. **Monitor rate limit headers**
3. **Batch requests when possible**
4. **Cache responses to reduce API calls**
"""
            }
        ]
    
    def _get_featured_endpoints(self) -> List[Dict[str, Any]]:
        """Get featured endpoints for homepage"""
        return [
            {
                "name": "Brand Identity Generation",
                "description": "Create comprehensive brand packages",
                "category": "visual-design",
                "endpoint": "brand-identity",
                "icon": "🎨"
            },
            {
                "name": "Code Quality Analysis", 
                "description": "Analyze and improve code quality",
                "category": "code-quality",
                "endpoint": "analyze",
                "icon": "🔍"
            },
            {
                "name": "Image Generation",
                "description": "Create images from text descriptions",
                "category": "image-generation", 
                "endpoint": "create",
                "icon": "🖼️"
            },
            {
                "name": "Financial Analysis",
                "description": "Comprehensive financial insights",
                "category": "business",
                "endpoint": "financial-analysis",
                "icon": "📊"
            }
        ]
    
    def _get_endpoint_categories(self) -> List[str]:
        """Get unique endpoint categories"""
        return list(set(endpoint["category"] for endpoint in self.api_endpoints))
    
    def _get_endpoint_examples(self, category: str, endpoint: str) -> List[Dict[str, Any]]:
        """Get code examples for specific endpoint"""
        return self.code_examples.get(category, [])
    
    def _get_try_it_config(self, endpoint_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get configuration for try-it functionality"""
        return {
            "method": endpoint_data["method"],
            "path": endpoint_data["path"],
            "parameters": endpoint_data["parameters"],
            "auth_required": True
        }
    
    def _get_all_examples(self) -> List[Dict[str, Any]]:
        """Get all code examples"""
        all_examples = []
        for category, examples in self.code_examples.items():
            for example in examples:
                example["category"] = category
                all_examples.append(example)
        return all_examples
    
    async def _get_api_stats(self) -> Dict[str, Any]:
        """Get API statistics"""
        return {
            "total_endpoints": len(self.api_endpoints),
            "categories": len(self._get_endpoint_categories()),
            "supported_languages": 10,
            "monthly_requests": "2.5M+"
        }
    
    async def _get_system_status(self) -> Dict[str, Any]:
        """Get system status"""
        return {
            "status": "operational",
            "uptime": "99.9%",
            "response_time": "250ms",
            "components": {
                "API Gateway": "operational",
                "Visual Design": "operational", 
                "Code Quality": "operational",
                "Image Generation": "operational",
                "Audio/Video": "operational",
                "Business Ops": "operational"
            }
        }
    
    async def _get_api_metrics(self) -> Dict[str, Any]:
        """Get API metrics"""
        return {
            "requests_per_minute": 450,
            "average_response_time": 250,
            "error_rate": "0.1%",
            "p95_response_time": 500,
            "active_users": 1250
        }
    
    def _generate_openapi_spec(self) -> Dict[str, Any]:
        """Generate OpenAPI specification"""
        spec = {
            "openapi": "3.0.3",
            "info": {
                "title": "Frontier AI API",
                "description": "Comprehensive AI capabilities API",
                "version": "1.0.0",
                "contact": {
                    "name": "Frontier AI Support",
                    "email": "support@frontier.ai",
                    "url": "https://docs.frontier.ai"
                }
            },
            "servers": [
                {
                    "url": "https://api.frontier.ai",
                    "description": "Production server"
                },
                {
                    "url": "https://sandbox-api.frontier.ai", 
                    "description": "Sandbox server"
                }
            ],
            "paths": {},
            "components": {
                "securitySchemes": {
                    "ApiKeyAuth": {
                        "type": "apiKey",
                        "in": "header",
                        "name": "X-API-Key"
                    },
                    "BearerAuth": {
                        "type": "http",
                        "scheme": "bearer",
                        "bearerFormat": "JWT"
                    }
                }
            }
        }
        
        # Add endpoints to spec
        for endpoint in self.api_endpoints:
            path = endpoint["path"]
            method = endpoint["method"].lower()
            
            if path not in spec["paths"]:
                spec["paths"][path] = {}
            
            spec["paths"][path][method] = {
                "summary": endpoint["summary"],
                "description": endpoint["description"],
                "tags": [endpoint["category"]],
                "security": [{"ApiKeyAuth": []}],
                "responses": {
                    "200": {
                        "description": "Successful response",
                        "content": {
                            "application/json": {
                                "example": endpoint.get("response_example", {})
                            }
                        }
                    }
                }
            }
        
        return spec

def create_app() -> FastAPI:
    """Create documentation portal application"""
    portal = DocumentationPortal()
    return portal.app

if __name__ == "__main__":
    app = create_app()
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3009,
        reload=True,
        log_level="info"
    )
