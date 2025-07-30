"""
CDN and Static Asset Optimization

Implements CDN integration, static asset optimization, and content delivery
optimization for the Frontier platform.
"""

import os
import hashlib
import gzip
import json
import mimetypes
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from datetime import datetime, timedelta
import aiofiles
import asyncio
from dataclasses import dataclass

from api.config import settings
from api.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class AssetInfo:
    """Information about a static asset"""
    path: str
    size: int
    content_type: str
    hash: str
    compressed_size: Optional[int] = None
    last_modified: datetime = None
    cache_control: str = "public, max-age=31536000"  # 1 year default


class StaticAssetOptimizer:
    """Optimize static assets for CDN delivery"""
    
    def __init__(self, static_dir: str = "static"):
        self.static_dir = Path(static_dir)
        self.static_dir.mkdir(exist_ok=True)
        self.asset_manifest: Dict[str, AssetInfo] = {}
        self.compression_enabled = True
        
        # Create subdirectories
        (self.static_dir / "js").mkdir(exist_ok=True)
        (self.static_dir / "css").mkdir(exist_ok=True)
        (self.static_dir / "images").mkdir(exist_ok=True)
        (self.static_dir / "docs").mkdir(exist_ok=True)
        (self.static_dir / "compressed").mkdir(exist_ok=True)
    
    async def initialize(self):
        """Initialize the asset optimizer"""
        await self.generate_static_assets()
        await self.build_asset_manifest()
        await self.compress_assets()
        logger.info("Static asset optimizer initialized")
    
    async def generate_static_assets(self):
        """Generate static assets for the application"""
        
        # Generate API documentation
        await self._generate_api_docs()
        
        # Generate CSS for documentation
        await self._generate_css_files()
        
        # Generate JavaScript for interactive features
        await self._generate_js_files()
        
        # Generate favicon and images
        await self._generate_image_assets()
    
    async def _generate_api_docs(self):
        """Generate static API documentation"""
        docs_content = {
            "openapi_spec": await self._get_openapi_spec(),
            "api_reference": await self._generate_api_reference(),
            "examples": await self._generate_api_examples()
        }
        
        # Save as JSON
        docs_path = self.static_dir / "docs" / "api.json"
        async with aiofiles.open(docs_path, 'w') as f:
            await f.write(json.dumps(docs_content, indent=2))
        
        # Generate HTML documentation
        html_content = await self._generate_docs_html(docs_content)
        html_path = self.static_dir / "docs" / "index.html"
        async with aiofiles.open(html_path, 'w') as f:
            await f.write(html_content)
    
    async def _get_openapi_spec(self) -> Dict:
        """Get OpenAPI specification"""
        return {
            "openapi": "3.0.0",
            "info": {
                "title": "Frontier Business Intelligence API",
                "version": "1.0.0",
                "description": "Comprehensive business intelligence and financial analysis API"
            },
            "servers": [
                {"url": settings.API_BASE_URL, "description": "Production server"}
            ],
            "paths": {
                "/api/v1/business/financial-analysis": {
                    "post": {
                        "summary": "Financial Analysis",
                        "description": "Perform comprehensive financial analysis",
                        "tags": ["Financial Analysis"]
                    }
                },
                "/api/v1/business/strategic-planning": {
                    "post": {
                        "summary": "Strategic Planning",
                        "description": "Generate strategic planning insights",
                        "tags": ["Strategic Planning"]
                    }
                }
            }
        }
    
    async def _generate_api_reference(self) -> Dict:
        """Generate API reference documentation"""
        return {
            "endpoints": {
                "financial_analysis": {
                    "method": "POST",
                    "path": "/api/v1/business/financial-analysis",
                    "description": "Analyze financial statements and ratios",
                    "parameters": {
                        "company_name": "string",
                        "industry": "string",
                        "financial_statements": "object"
                    },
                    "response": {
                        "financial_ratios": "object",
                        "score": "number",
                        "insights": "array"
                    }
                },
                "strategic_planning": {
                    "method": "POST",
                    "path": "/api/v1/business/strategic-planning",
                    "description": "Generate strategic planning analysis",
                    "parameters": {
                        "company_profile": "object",
                        "objectives": "array",
                        "time_horizon": "number"
                    },
                    "response": {
                        "swot_analysis": "object",
                        "action_plan": "array",
                        "recommendations": "array"
                    }
                }
            }
        }
    
    async def _generate_api_examples(self) -> Dict:
        """Generate API usage examples"""
        return {
            "financial_analysis_example": {
                "request": {
                    "company_name": "Tech Corp Inc.",
                    "industry": "technology",
                    "financial_statements": {
                        "balance_sheet": {
                            "total_assets": 1000000,
                            "total_liabilities": 600000
                        }
                    }
                },
                "response": {
                    "success": True,
                    "data": {
                        "financial_ratios": {
                            "debt_to_equity": 1.5,
                            "current_ratio": 2.0
                        },
                        "score": 75.5
                    }
                }
            }
        }
    
    async def _generate_docs_html(self, docs_content: Dict) -> str:
        """Generate HTML documentation"""
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Frontier API Documentation</title>
    <link rel="stylesheet" href="../css/docs.css">
    <link rel="icon" type="image/x-icon" href="../images/favicon.ico">
</head>
<body>
    <header>
        <h1>Frontier Business Intelligence API</h1>
        <p>Comprehensive business intelligence and financial analysis API</p>
    </header>
    
    <nav>
        <ul>
            <li><a href="#overview">Overview</a></li>
            <li><a href="#authentication">Authentication</a></li>
            <li><a href="#endpoints">Endpoints</a></li>
            <li><a href="#examples">Examples</a></li>
        </ul>
    </nav>
    
    <main>
        <section id="overview">
            <h2>Overview</h2>
            <p>The Frontier API provides powerful business intelligence capabilities including financial analysis, strategic planning, and market intelligence.</p>
        </section>
        
        <section id="authentication">
            <h2>Authentication</h2>
            <p>All API requests require authentication using JWT tokens in the Authorization header:</p>
            <pre><code>Authorization: Bearer YOUR_JWT_TOKEN</code></pre>
        </section>
        
        <section id="endpoints">
            <h2>API Endpoints</h2>
            <div class="endpoint-list">
                <!-- Endpoints will be populated by JavaScript -->
            </div>
        </section>
        
        <section id="examples">
            <h2>Examples</h2>
            <div class="examples">
                <!-- Examples will be populated by JavaScript -->
            </div>
        </section>
    </main>
    
    <script src="../js/docs.js"></script>
    <script>
        // Inject API documentation data
        window.apiDocs = {json.dumps(docs_content)};
        initializeDocs();
    </script>
</body>
</html>"""
    
    async def _generate_css_files(self):
        """Generate CSS files"""
        
        # Main documentation CSS
        docs_css = """
/* Frontier API Documentation Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f8f9fa;
}

header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem 0;
    text-align: center;
}

header h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
}

nav {
    background: #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    position: sticky;
    top: 0;
    z-index: 100;
}

nav ul {
    display: flex;
    list-style: none;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
}

nav a {
    display: block;
    padding: 1rem 1.5rem;
    text-decoration: none;
    color: #333;
    transition: background-color 0.3s;
}

nav a:hover {
    background-color: #f8f9fa;
}

main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
}

section {
    background: white;
    margin-bottom: 2rem;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

h2 {
    color: #667eea;
    margin-bottom: 1rem;
    font-size: 1.8rem;
}

pre {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    border-left: 4px solid #667eea;
}

code {
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 0.9rem;
}

.endpoint {
    border: 1px solid #e9ecef;
    border-radius: 4px;
    margin-bottom: 1rem;
    overflow: hidden;
}

.endpoint-header {
    background: #f8f9fa;
    padding: 1rem;
    border-bottom: 1px solid #e9ecef;
}

.endpoint-body {
    padding: 1rem;
}

.method {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-weight: bold;
    font-size: 0.8rem;
    margin-right: 0.5rem;
}

.method.post { background: #28a745; color: white; }
.method.get { background: #007bff; color: white; }
.method.put { background: #ffc107; color: black; }
.method.delete { background: #dc3545; color: white; }

@media (max-width: 768px) {
    nav ul {
        flex-direction: column;
    }
    
    header h1 {
        font-size: 2rem;
    }
    
    main {
        padding: 1rem;
    }
    
    section {
        padding: 1rem;
    }
}
"""
        
        css_path = self.static_dir / "css" / "docs.css"
        async with aiofiles.open(css_path, 'w') as f:
            await f.write(docs_css)
    
    async def _generate_js_files(self):
        """Generate JavaScript files"""
        
        # Documentation JavaScript
        docs_js = """
// Frontier API Documentation JavaScript

function initializeDocs() {
    if (typeof window.apiDocs === 'undefined') {
        console.error('API documentation data not found');
        return;
    }
    
    populateEndpoints();
    populateExamples();
    setupNavigation();
}

function populateEndpoints() {
    const container = document.querySelector('.endpoint-list');
    if (!container || !window.apiDocs.api_reference) return;
    
    const endpoints = window.apiDocs.api_reference.endpoints;
    
    Object.entries(endpoints).forEach(([name, endpoint]) => {
        const endpointDiv = document.createElement('div');
        endpointDiv.className = 'endpoint';
        
        endpointDiv.innerHTML = `
            <div class="endpoint-header">
                <span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                <code>${endpoint.path}</code>
            </div>
            <div class="endpoint-body">
                <p>${endpoint.description}</p>
                <h4>Parameters:</h4>
                <pre><code>${JSON.stringify(endpoint.parameters, null, 2)}</code></pre>
                <h4>Response:</h4>
                <pre><code>${JSON.stringify(endpoint.response, null, 2)}</code></pre>
            </div>
        `;
        
        container.appendChild(endpointDiv);
    });
}

function populateExamples() {
    const container = document.querySelector('.examples');
    if (!container || !window.apiDocs.examples) return;
    
    const examples = window.apiDocs.examples;
    
    Object.entries(examples).forEach(([name, example]) => {
        const exampleDiv = document.createElement('div');
        exampleDiv.className = 'example';
        
        exampleDiv.innerHTML = `
            <h3>${name.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase())}</h3>
            <h4>Request:</h4>
            <pre><code>${JSON.stringify(example.request, null, 2)}</code></pre>
            <h4>Response:</h4>
            <pre><code>${JSON.stringify(example.response, null, 2)}</code></pre>
        `;
        
        container.appendChild(exampleDiv);
    });
}

function setupNavigation() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('nav a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDocs);
"""
        
        js_path = self.static_dir / "js" / "docs.js"
        async with aiofiles.open(js_path, 'w') as f:
            await f.write(docs_js)
    
    async def _generate_image_assets(self):
        """Generate basic image assets"""
        # Create a simple favicon (this would typically be a real image file)
        favicon_content = """
        <!-- This would be replaced with actual favicon.ico content -->
        """
        # For now, just create a placeholder file
        favicon_path = self.static_dir / "images" / "favicon.ico"
        favicon_path.touch()
    
    async def build_asset_manifest(self):
        """Build manifest of all static assets"""
        self.asset_manifest.clear()
        
        for root, dirs, files in os.walk(self.static_dir):
            for file in files:
                if file.startswith('.'):
                    continue
                
                file_path = Path(root) / file
                relative_path = str(file_path.relative_to(self.static_dir))
                
                # Get file info
                stat = file_path.stat()
                content_type, _ = mimetypes.guess_type(str(file_path))
                
                # Calculate hash
                hash_value = await self._calculate_file_hash(file_path)
                
                asset_info = AssetInfo(
                    path=relative_path,
                    size=stat.st_size,
                    content_type=content_type or 'application/octet-stream',
                    hash=hash_value,
                    last_modified=datetime.fromtimestamp(stat.st_mtime)
                )
                
                # Set cache control based on file type
                if relative_path.startswith(('css/', 'js/', 'images/')):
                    asset_info.cache_control = "public, max-age=31536000, immutable"  # 1 year
                elif relative_path.startswith('docs/'):
                    asset_info.cache_control = "public, max-age=3600"  # 1 hour
                
                self.asset_manifest[relative_path] = asset_info
        
        # Save manifest
        manifest_data = {
            path: {
                "size": info.size,
                "hash": info.hash,
                "content_type": info.content_type,
                "cache_control": info.cache_control,
                "last_modified": info.last_modified.isoformat() if info.last_modified else None
            }
            for path, info in self.asset_manifest.items()
        }
        
        manifest_path = self.static_dir / "manifest.json"
        async with aiofiles.open(manifest_path, 'w') as f:
            await f.write(json.dumps(manifest_data, indent=2))
        
        logger.info(f"Built asset manifest with {len(self.asset_manifest)} assets")
    
    async def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA-256 hash of file"""
        hash_sha256 = hashlib.sha256()
        async with aiofiles.open(file_path, 'rb') as f:
            while chunk := await f.read(8192):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()[:16]  # Use first 16 chars
    
    async def compress_assets(self):
        """Compress static assets for faster delivery"""
        if not self.compression_enabled:
            return
        
        compressible_types = [
            'text/css',
            'text/javascript',
            'application/javascript',
            'text/html',
            'application/json',
            'text/plain'
        ]
        
        compressed_count = 0
        
        for path, asset_info in self.asset_manifest.items():
            if asset_info.content_type in compressible_types:
                await self._compress_file(path, asset_info)
                compressed_count += 1
        
        logger.info(f"Compressed {compressed_count} assets")
    
    async def _compress_file(self, relative_path: str, asset_info: AssetInfo):
        """Compress individual file"""
        source_path = self.static_dir / relative_path
        compressed_path = self.static_dir / "compressed" / f"{relative_path}.gz"
        
        # Create directory if needed
        compressed_path.parent.mkdir(parents=True, exist_ok=True)
        
        async with aiofiles.open(source_path, 'rb') as source:
            content = await source.read()
            
            compressed_content = gzip.compress(content)
            
            async with aiofiles.open(compressed_path, 'wb') as compressed:
                await compressed.write(compressed_content)
            
            # Update asset info
            asset_info.compressed_size = len(compressed_content)
            
            compression_ratio = len(compressed_content) / len(content)
            logger.debug(f"Compressed {relative_path}: {compression_ratio:.2%} of original size")
    
    def get_asset_url(self, path: str, versioned: bool = True) -> str:
        """Get URL for static asset with optional versioning"""
        asset_info = self.asset_manifest.get(path)
        if not asset_info:
            return f"/static/{path}"
        
        if versioned:
            return f"/static/{path}?v={asset_info.hash}"
        return f"/static/{path}"
    
    def get_asset_headers(self, path: str) -> Dict[str, str]:
        """Get HTTP headers for static asset"""
        asset_info = self.asset_manifest.get(path)
        if not asset_info:
            return {}
        
        headers = {
            "Content-Type": asset_info.content_type,
            "Cache-Control": asset_info.cache_control,
            "ETag": f'"{asset_info.hash}"'
        }
        
        if asset_info.last_modified:
            headers["Last-Modified"] = asset_info.last_modified.strftime(
                "%a, %d %b %Y %H:%M:%S GMT"
            )
        
        return headers


class CDNIntegration:
    """CDN integration for global content delivery"""
    
    def __init__(self):
        self.cdn_enabled = getattr(settings, 'CDN_ENABLED', False)
        self.cdn_domain = getattr(settings, 'CDN_DOMAIN', '')
        self.cdn_api_key = getattr(settings, 'CDN_API_KEY', '')
        self.regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1']
    
    async def upload_assets(self, asset_optimizer: StaticAssetOptimizer):
        """Upload assets to CDN"""
        if not self.cdn_enabled:
            logger.info("CDN not enabled, skipping upload")
            return
        
        uploaded_count = 0
        
        for path, asset_info in asset_optimizer.asset_manifest.items():
            success = await self._upload_asset(path, asset_info, asset_optimizer)
            if success:
                uploaded_count += 1
        
        logger.info(f"Uploaded {uploaded_count} assets to CDN")
    
    async def _upload_asset(self, path: str, asset_info: AssetInfo, optimizer: StaticAssetOptimizer) -> bool:
        """Upload single asset to CDN"""
        try:
            # In a real implementation, this would upload to your CDN provider
            # For example: AWS CloudFront, Cloudflare, etc.
            
            source_path = optimizer.static_dir / path
            
            # Simulate CDN upload
            await asyncio.sleep(0.1)  # Simulate network delay
            
            # Here you would use your CDN provider's API
            # Example for AWS S3/CloudFront:
            # await self._upload_to_s3(source_path, path, asset_info)
            
            logger.debug(f"Uploaded {path} to CDN")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upload {path} to CDN: {e}")
            return False
    
    def get_cdn_url(self, path: str, asset_info: AssetInfo) -> str:
        """Get CDN URL for asset"""
        if not self.cdn_enabled or not self.cdn_domain:
            return f"/static/{path}?v={asset_info.hash}"
        
        return f"https://{self.cdn_domain}/{path}?v={asset_info.hash}"
    
    async def invalidate_cache(self, paths: List[str]):
        """Invalidate CDN cache for specific paths"""
        if not self.cdn_enabled:
            return
        
        try:
            # Simulate CDN cache invalidation
            await asyncio.sleep(0.5)
            
            # Here you would use your CDN provider's cache invalidation API
            logger.info(f"Invalidated CDN cache for {len(paths)} paths")
            
        except Exception as e:
            logger.error(f"Failed to invalidate CDN cache: {e}")


# Global instances
static_optimizer = StaticAssetOptimizer()
cdn_integration = CDNIntegration()
