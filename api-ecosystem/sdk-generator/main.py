"""
SDK Generator
Automatically generates client SDKs for multiple programming languages
"""

import os
import json
import yaml
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import logging

import jinja2
from openapi_spec_validator import validate_spec
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SdkConfig:
    """SDK generation configuration"""
    language: str
    package_name: str
    version: str
    author: str
    description: str
    base_url: str
    output_dir: str
    
@dataclass
class ApiEndpoint:
    """API endpoint definition"""
    path: str
    method: str
    operation_id: str
    summary: str
    description: str
    parameters: List[Dict[str, Any]]
    request_body: Optional[Dict[str, Any]]
    responses: Dict[str, Dict[str, Any]]
    tags: List[str]
    security: List[Dict[str, Any]]

class SdkGenerator:
    """Main SDK generator class"""
    
    def __init__(self, openapi_spec_url: str = "https://api.frontier.ai/openapi.json"):
        self.openapi_spec_url = openapi_spec_url
        self.spec = None
        self.endpoints = []
        
        # Initialize Jinja2 environment
        self.jinja_env = jinja2.Environment(
            loader=jinja2.FileSystemLoader('templates'),
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        # Add custom filters
        self.jinja_env.filters['camel_case'] = self._camel_case
        self.jinja_env.filters['snake_case'] = self._snake_case
        self.jinja_env.filters['pascal_case'] = self._pascal_case
        self.jinja_env.filters['kebab_case'] = self._kebab_case
    
    async def load_openapi_spec(self):
        """Load and validate OpenAPI specification"""
        try:
            response = requests.get(self.openapi_spec_url)
            response.raise_for_status()
            self.spec = response.json()
            
            # Validate spec
            validate_spec(self.spec)
            logger.info("OpenAPI spec loaded and validated successfully")
            
            # Parse endpoints
            self._parse_endpoints()
            
        except Exception as e:
            logger.error(f"Failed to load OpenAPI spec: {str(e)}")
            raise
    
    def _parse_endpoints(self):
        """Parse endpoints from OpenAPI spec"""
        self.endpoints = []
        
        for path, path_item in self.spec.get('paths', {}).items():
            for method, operation in path_item.items():
                if method.upper() in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']:
                    endpoint = ApiEndpoint(
                        path=path,
                        method=method.upper(),
                        operation_id=operation.get('operationId', f"{method}_{path.replace('/', '_')}"),
                        summary=operation.get('summary', ''),
                        description=operation.get('description', ''),
                        parameters=operation.get('parameters', []),
                        request_body=operation.get('requestBody'),
                        responses=operation.get('responses', {}),
                        tags=operation.get('tags', []),
                        security=operation.get('security', [])
                    )
                    self.endpoints.append(endpoint)
    
    async def generate_sdk(self, language: str, config: SdkConfig) -> str:
        """Generate SDK for specified language"""
        logger.info(f"Generating {language} SDK...")
        
        # Ensure output directory exists
        os.makedirs(config.output_dir, exist_ok=True)
        
        # Get language-specific generator
        generator_method = getattr(self, f'_generate_{language}_sdk', None)
        if not generator_method:
            raise ValueError(f"Unsupported language: {language}")
        
        return await generator_method(config)
    
    async def _generate_javascript_sdk(self, config: SdkConfig) -> str:
        """Generate JavaScript/TypeScript SDK"""
        output_dir = config.output_dir
        
        # Create directory structure
        os.makedirs(f"{output_dir}/src", exist_ok=True)
        os.makedirs(f"{output_dir}/types", exist_ok=True)
        
        # Generate package.json
        package_json = {
            "name": config.package_name,
            "version": config.version,
            "description": config.description,
            "main": "dist/index.js",
            "types": "dist/index.d.ts",
            "scripts": {
                "build": "tsc",
                "test": "jest",
                "prepare": "npm run build"
            },
            "dependencies": {
                "axios": "^1.6.0",
                "form-data": "^4.0.0"
            },
            "devDependencies": {
                "@types/node": "^20.0.0",
                "typescript": "^5.0.0",
                "jest": "^29.0.0",
                "@types/jest": "^29.0.0"
            },
            "author": config.author,
            "license": "MIT",
            "keywords": ["frontier", "ai", "api", "sdk"]
        }
        
        with open(f"{output_dir}/package.json", 'w') as f:
            json.dump(package_json, f, indent=2)
        
        # Generate TypeScript definitions
        self._generate_typescript_types(output_dir)
        
        # Generate main client
        self._generate_javascript_client(output_dir, config)
        
        # Generate TypeScript config
        tsconfig = {
            "compilerOptions": {
                "target": "es2018",
                "module": "commonjs",
                "lib": ["es2018"],
                "declaration": True,
                "outDir": "./dist",
                "rootDir": "./src",
                "strict": True,
                "esModuleInterop": True,
                "skipLibCheck": True,
                "forceConsistentCasingInFileNames": True
            },
            "include": ["src/**/*"],
            "exclude": ["node_modules", "dist", "**/*.test.ts"]
        }
        
        with open(f"{output_dir}/tsconfig.json", 'w') as f:
            json.dump(tsconfig, f, indent=2)
        
        # Generate README
        self._generate_readme(output_dir, config, 'javascript')
        
        logger.info(f"JavaScript SDK generated in {output_dir}")
        return output_dir
    
    async def _generate_python_sdk(self, config: SdkConfig) -> str:
        """Generate Python SDK"""
        output_dir = config.output_dir
        package_name = config.package_name.replace('-', '_')
        
        # Create directory structure
        os.makedirs(f"{output_dir}/{package_name}", exist_ok=True)
        os.makedirs(f"{output_dir}/tests", exist_ok=True)
        
        # Generate setup.py
        setup_py = f'''from setuptools import setup, find_packages

setup(
    name="{config.package_name}",
    version="{config.version}",
    description="{config.description}",
    author="{config.author}",
    packages=find_packages(),
    install_requires=[
        "requests>=2.28.0",
        "pydantic>=2.0.0",
        "python-dateutil>=2.8.0",
    ],
    python_requires=">=3.7",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    keywords="frontier ai api sdk",
)
'''
        with open(f"{output_dir}/setup.py", 'w') as f:
            f.write(setup_py)
        
        # Generate __init__.py
        init_py = f'''"""
{config.description}
"""

__version__ = "{config.version}"

from .client import FrontierClient
from .exceptions import FrontierException, APIException, AuthenticationException
from .models import *

__all__ = [
    "FrontierClient",
    "FrontierException", 
    "APIException",
    "AuthenticationException",
]
'''
        with open(f"{output_dir}/{package_name}/__init__.py", 'w') as f:
            f.write(init_py)
        
        # Generate models
        self._generate_python_models(output_dir, package_name)
        
        # Generate client
        self._generate_python_client(output_dir, package_name, config)
        
        # Generate exceptions
        self._generate_python_exceptions(output_dir, package_name)
        
        # Generate requirements.txt
        requirements = '''requests>=2.28.0
pydantic>=2.0.0
python-dateutil>=2.8.0
'''
        with open(f"{output_dir}/requirements.txt", 'w') as f:
            f.write(requirements)
        
        # Generate README
        self._generate_readme(output_dir, config, 'python')
        
        logger.info(f"Python SDK generated in {output_dir}")
        return output_dir
    
    async def _generate_java_sdk(self, config: SdkConfig) -> str:
        """Generate Java SDK"""
        output_dir = config.output_dir
        package_path = config.package_name.replace('-', '').replace('_', '')
        
        # Create Maven directory structure
        src_dir = f"{output_dir}/src/main/java/ai/frontier/{package_path}"
        test_dir = f"{output_dir}/src/test/java/ai/frontier/{package_path}"
        resources_dir = f"{output_dir}/src/main/resources"
        
        os.makedirs(src_dir, exist_ok=True)
        os.makedirs(test_dir, exist_ok=True)
        os.makedirs(resources_dir, exist_ok=True)
        
        # Generate pom.xml
        pom_xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
                             http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <groupId>ai.frontier</groupId>
    <artifactId>{config.package_name}</artifactId>
    <version>{config.version}</version>
    <packaging>jar</packaging>
    
    <name>Frontier Java SDK</name>
    <description>{config.description}</description>
    
    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>com.squareup.okhttp3</groupId>
            <artifactId>okhttp</artifactId>
            <version>4.12.0</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>2.16.0</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.datatype</groupId>
            <artifactId>jackson-datatype-jsr310</artifactId>
            <version>2.16.0</version>
        </dependency>
        <dependency>
            <groupId>junit</groupId>
            <artifactId>junit</artifactId>
            <version>4.13.2</version>
            <scope>test</scope>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.11.0</version>
                <configuration>
                    <source>11</source>
                    <target>11</target>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
'''
        with open(f"{output_dir}/pom.xml", 'w') as f:
            f.write(pom_xml)
        
        # Generate Java client
        self._generate_java_client(src_dir, config)
        
        # Generate README
        self._generate_readme(output_dir, config, 'java')
        
        logger.info(f"Java SDK generated in {output_dir}")
        return output_dir
    
    def _generate_typescript_types(self, output_dir: str):
        """Generate TypeScript type definitions"""
        types_content = '''// Auto-generated TypeScript definitions

export interface BrandIdentityRequest {
  company_name: string;
  industry: string;
  style?: string;
  target_audience?: string;
  color_preferences?: string[];
}

export interface BrandIdentityResponse {
  company_name: string;
  logo_urls: string[];
  color_palette: Record<string, string>;
  typography: Record<string, string>;
  style_guide: string;
  created_at: string;
}

export interface CodeAnalysisRequest {
  code: string;
  language: string;
  analysis_types?: string[];
}

export interface CodeAnalysisResponse {
  analysis_id: string;
  language: string;
  quality_score: number;
  issues: string[];
  suggestions: string[];
  security_vulnerabilities: string[];
  performance_metrics: Record<string, number>;
  maintainability_index: number;
  created_at: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  style?: string;
  size?: string;
  count?: number;
}

export interface ImageGenerationResponse {
  image_id: string;
  prompt: string;
  image_urls: string[];
  style: string;
  dimensions: string;
  generation_time: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  execution_time?: number;
}

export interface FrontierClientConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}
'''
        
        with open(f"{output_dir}/types/index.ts", 'w') as f:
            f.write(types_content)
    
    def _generate_javascript_client(self, output_dir: str, config: SdkConfig):
        """Generate JavaScript client"""
        client_content = f'''import axios, {{ AxiosInstance, AxiosRequestConfig }} from 'axios';
import FormData from 'form-data';
import {{ 
  FrontierClientConfig, 
  ApiResponse,
  BrandIdentityRequest,
  BrandIdentityResponse,
  CodeAnalysisRequest,
  CodeAnalysisResponse,
  ImageGenerationRequest,
  ImageGenerationResponse
}} from '../types';

export class FrontierClient {{
  private client: AxiosInstance;
  private apiKey?: string;

  constructor(config: FrontierClientConfig = {{}}) {{
    this.apiKey = config.apiKey;
    
    this.client = axios.create({{
      baseURL: config.baseUrl || '{config.base_url}',
      timeout: config.timeout || 60000,
      headers: {{
        'Content-Type': 'application/json',
        'User-Agent': 'Frontier-JS-SDK/{config.version}',
        ...(this.apiKey && {{ 'X-API-Key': this.apiKey }})
      }}
    }});

    // Response interceptor
    this.client.interceptors.response.use(
      response => response.data,
      error => {{
        if (error.response) {{
          throw new Error(`API Error: ${{error.response.status}} - ${{error.response.data?.error || error.message}}`);
        }}
        throw error;
      }}
    );
  }}

  // Visual Design Methods
  async createBrandIdentity(request: BrandIdentityRequest): Promise<ApiResponse<BrandIdentityResponse>> {{
    return this.client.post('/api/v1/visual-design/brand-identity', request);
  }}

  async createUILayout(request: any): Promise<ApiResponse<any>> {{
    return this.client.post('/api/v1/visual-design/ui-layout', request);
  }}

  async createWebsiteMockup(request: any): Promise<ApiResponse<any>> {{
    return this.client.post('/api/v1/visual-design/mockup', request);
  }}

  // Code Quality Methods
  async analyzeCode(request: CodeAnalysisRequest): Promise<ApiResponse<CodeAnalysisResponse>> {{
    return this.client.post('/api/v1/code-quality/analyze', request);
  }}

  async securityScan(request: CodeAnalysisRequest): Promise<ApiResponse<any>> {{
    return this.client.post('/api/v1/code-quality/security-scan', request);
  }}

  async refactorCode(request: any): Promise<ApiResponse<any>> {{
    return this.client.post('/api/v1/code-quality/refactor', request);
  }}

  // Image Generation Methods
  async generateImage(request: ImageGenerationRequest): Promise<ApiResponse<ImageGenerationResponse>> {{
    return this.client.post('/api/v1/image-generation/create', request);
  }}

  async generateProductPhoto(request: any): Promise<ApiResponse<any>> {{
    return this.client.post('/api/v1/image-generation/product-photo', request);
  }}

  // Audio/Video Methods
  async generateScript(request: any): Promise<ApiResponse<any>> {{
    return this.client.post('/api/v1/audio-video/script-generation', request);
  }}

  async createVoiceover(request: any): Promise<ApiResponse<any>> {{
    return this.client.post('/api/v1/audio-video/voiceover', request);
  }}

  async transcribeAudio(file: File | Buffer, options: any = {{}}): Promise<ApiResponse<any>> {{
    const formData = new FormData();
    formData.append('file', file);
    
    Object.keys(options).forEach(key => {{
      formData.append(key, options[key]);
    }});

    return this.client.post('/api/v1/audio-video/transcription', formData, {{
      headers: {{
        'Content-Type': 'multipart/form-data'
      }}
    }});
  }}

  // Business Operations Methods
  async analyzeFinancials(request: any): Promise<ApiResponse<any>> {{
    return this.client.post('/api/v1/business/financial-analysis', request);
  }}

  async createStrategyPlan(request: any): Promise<ApiResponse<any>> {{
    return this.client.post('/api/v1/business/strategic-planning', request);
  }}

  // Job Management
  async getJobStatus(jobId: string): Promise<ApiResponse<any>> {{
    return this.client.get(`/api/v1/jobs/${{jobId}}`);
  }}

  async listJobs(options: {{ status?: string; limit?: number }} = {{}}): Promise<ApiResponse<any>> {{
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit.toString());
    
    return this.client.get(`/api/v1/jobs?${{params}}`);
  }}

  // Utility Methods
  setApiKey(apiKey: string): void {{
    this.apiKey = apiKey;
    this.client.defaults.headers['X-API-Key'] = apiKey;
  }}

  setTimeout(timeout: number): void {{
    this.client.defaults.timeout = timeout;
  }}
}}

export default FrontierClient;
'''
        
        with open(f"{output_dir}/src/index.ts", 'w') as f:
            f.write(client_content)
    
    def _generate_python_models(self, output_dir: str, package_name: str):
        """Generate Python model classes"""
        models_content = '''"""
Auto-generated Pydantic models for Frontier API
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field


class BrandIdentityRequest(BaseModel):
    company_name: str = Field(..., description="Company name")
    industry: str = Field(..., description="Industry sector")
    style: str = Field("modern", description="Design style preference")
    target_audience: Optional[str] = Field(None, description="Target audience description")
    color_preferences: Optional[List[str]] = Field(None, description="Preferred colors")


class BrandIdentityResponse(BaseModel):
    company_name: str
    logo_urls: List[str]
    color_palette: Dict[str, str]
    typography: Dict[str, str]
    style_guide: str
    created_at: datetime


class CodeAnalysisRequest(BaseModel):
    code: str = Field(..., description="Code to analyze")
    language: str = Field(..., description="Programming language")
    analysis_types: List[str] = Field(["patterns", "security", "performance"], description="Types of analysis")


class CodeAnalysisResponse(BaseModel):
    analysis_id: str
    language: str
    quality_score: float
    issues: List[str]
    suggestions: List[str]
    security_vulnerabilities: List[str]
    performance_metrics: Dict[str, float]
    maintainability_index: float
    created_at: datetime


class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., description="Image generation prompt")
    style: str = Field("photorealistic", description="Image style")
    size: str = Field("1024x1024", description="Image dimensions")
    count: int = Field(1, description="Number of images to generate")


class ImageGenerationResponse(BaseModel):
    image_id: str
    prompt: str
    image_urls: List[str]
    style: str
    dimensions: str
    generation_time: float
    metadata: Dict[str, Any]
    created_at: datetime


class ApiResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    timestamp: datetime
    execution_time: Optional[float] = None


class JobResponse(BaseModel):
    job_id: str
    status: str
    created_at: datetime
    estimated_completion: Optional[datetime] = None
'''
        
        with open(f"{output_dir}/{package_name}/models.py", 'w') as f:
            f.write(models_content)
    
    def _generate_python_client(self, output_dir: str, package_name: str, config: SdkConfig):
        """Generate Python client"""
        client_content = f'''"""
Frontier AI Python SDK Client
"""

import json
import time
from typing import Dict, List, Optional, Any, Union, BinaryIO
from datetime import datetime
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

from .models import *
from .exceptions import FrontierException, APIException, AuthenticationException


class FrontierClient:
    """Main client for Frontier AI API"""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "{config.base_url}",
        timeout: int = 60,
        retries: int = 3
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        
        # Setup session with retries
        self.session = requests.Session()
        retry_strategy = Retry(
            total=retries,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Set default headers
        self.session.headers.update({{
            'Content-Type': 'application/json',
            'User-Agent': f'Frontier-Python-SDK/{config.version}',
        }})
        
        if self.api_key:
            self.session.headers['X-API-Key'] = self.api_key
    
    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        files: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to API"""
        url = f"{{self.base_url}}{{endpoint}}"
        
        kwargs = {{
            'timeout': self.timeout,
            'params': params
        }}
        
        if files:
            # Don't set Content-Type for file uploads
            headers = self.session.headers.copy()
            headers.pop('Content-Type', None)
            kwargs['headers'] = headers
            kwargs['files'] = files
            if data:
                kwargs['data'] = data
        elif data:
            kwargs['json'] = data
        
        try:
            response = self.session.request(method, url, **kwargs)
            
            if response.status_code == 401:
                raise AuthenticationException("Invalid API key or expired token")
            elif response.status_code == 429:
                raise APIException("Rate limit exceeded", status_code=429)
            elif not response.ok:
                error_data = response.json() if response.content else {{}}
                error_msg = error_data.get('error', f'HTTP {{response.status_code}}')
                raise APIException(error_msg, status_code=response.status_code)
            
            return response.json()
            
        except requests.exceptions.Timeout:
            raise FrontierException("Request timeout")
        except requests.exceptions.RequestException as e:
            raise FrontierException(f"Request failed: {{str(e)}}")
    
    # Visual Design Methods
    def create_brand_identity(self, **kwargs) -> BrandIdentityResponse:
        """Generate brand identity package"""
        request = BrandIdentityRequest(**kwargs)
        response = self._request('POST', '/api/v1/visual-design/brand-identity', request.dict())
        return BrandIdentityResponse(**response['data'])
    
    def create_ui_layout(self, **kwargs) -> Dict[str, Any]:
        """Generate responsive UI layout"""
        response = self._request('POST', '/api/v1/visual-design/ui-layout', kwargs)
        return response['data']
    
    def create_website_mockup(self, **kwargs) -> Dict[str, Any]:
        """Generate website mockup"""
        response = self._request('POST', '/api/v1/visual-design/mockup', kwargs)
        return response['data']
    
    # Code Quality Methods
    def analyze_code(self, **kwargs) -> CodeAnalysisResponse:
        """Analyze code quality and patterns"""
        request = CodeAnalysisRequest(**kwargs)
        response = self._request('POST', '/api/v1/code-quality/analyze', request.dict())
        return CodeAnalysisResponse(**response['data'])
    
    def security_scan(self, code: str, language: str, **kwargs) -> Dict[str, Any]:
        """Perform security vulnerability scan"""
        data = {{'code': code, 'language': language, **kwargs}}
        response = self._request('POST', '/api/v1/code-quality/security-scan', data)
        return response['data']
    
    def refactor_code(self, code: str, language: str, refactor_goals: List[str], **kwargs) -> Dict[str, Any]:
        """Refactor code with improvements"""
        data = {{'code': code, 'language': language, 'refactor_goals': refactor_goals, **kwargs}}
        response = self._request('POST', '/api/v1/code-quality/refactor', data)
        return response['data']
    
    # Image Generation Methods
    def generate_image(self, **kwargs) -> ImageGenerationResponse:
        """Generate image from text prompt"""
        request = ImageGenerationRequest(**kwargs)
        response = self._request('POST', '/api/v1/image-generation/create', request.dict())
        
        # Handle async jobs
        if 'job_id' in response.get('data', {{}}):
            return response['data']  # Return job info
        
        return ImageGenerationResponse(**response['data'])
    
    def generate_product_photo(self, **kwargs) -> Dict[str, Any]:
        """Generate product photography"""
        response = self._request('POST', '/api/v1/image-generation/product-photo', kwargs)
        return response['data']
    
    # Audio/Video Methods
    def generate_script(self, **kwargs) -> Dict[str, Any]:
        """Generate video script"""
        response = self._request('POST', '/api/v1/audio-video/script-generation', kwargs)
        return response['data']
    
    def create_voiceover(self, **kwargs) -> Dict[str, Any]:
        """Create voiceover from text"""
        response = self._request('POST', '/api/v1/audio-video/voiceover', kwargs)
        return response['data']
    
    def transcribe_audio(
        self,
        file: Union[str, BinaryIO],
        filename: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Transcribe audio file"""
        if isinstance(file, str):
            with open(file, 'rb') as f:
                files = {{'file': (filename or file, f)}}
                response = self._request('POST', '/api/v1/audio-video/transcription', kwargs, files)
        else:
            files = {{'file': (filename or 'audio.wav', file)}}
            response = self._request('POST', '/api/v1/audio-video/transcription', kwargs, files)
        
        return response['data']
    
    # Business Operations Methods
    def analyze_financials(self, **kwargs) -> Dict[str, Any]:
        """Analyze financial data"""
        response = self._request('POST', '/api/v1/business/financial-analysis', kwargs)
        return response['data']
    
    def create_strategy_plan(self, **kwargs) -> Dict[str, Any]:
        """Create strategic plan"""
        response = self._request('POST', '/api/v1/business/strategic-planning', kwargs)
        return response['data']
    
    # Job Management
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get job status by ID"""
        response = self._request('GET', f'/api/v1/jobs/{{job_id}}')
        return response['data']
    
    def list_jobs(self, status: Optional[str] = None, limit: int = 10) -> Dict[str, Any]:
        """List jobs"""
        params = {{'limit': limit}}
        if status:
            params['status'] = status
        
        response = self._request('GET', '/api/v1/jobs', params=params)
        return response['data']
    
    # Utility Methods
    def set_api_key(self, api_key: str) -> None:
        """Set API key"""
        self.api_key = api_key
        self.session.headers['X-API-Key'] = api_key
    
    def set_timeout(self, timeout: int) -> None:
        """Set request timeout"""
        self.timeout = timeout
'''
        
        with open(f"{output_dir}/{package_name}/client.py", 'w') as f:
            f.write(client_content)
    
    def _generate_python_exceptions(self, output_dir: str, package_name: str):
        """Generate Python exception classes"""
        exceptions_content = '''"""
Exception classes for Frontier SDK
"""


class FrontierException(Exception):
    """Base exception for Frontier SDK"""
    pass


class APIException(FrontierException):
    """API-related exceptions"""
    
    def __init__(self, message: str, status_code: int = None):
        super().__init__(message)
        self.status_code = status_code


class AuthenticationException(FrontierException):
    """Authentication-related exceptions"""
    pass


class RateLimitException(APIException):
    """Rate limit exceeded"""
    pass


class ValidationException(FrontierException):
    """Request validation failed"""
    pass
'''
        
        with open(f"{output_dir}/{package_name}/exceptions.py", 'w') as f:
            f.write(exceptions_content)
    
    def _generate_java_client(self, src_dir: str, config: SdkConfig):
        """Generate Java client"""
        client_content = f'''package ai.frontier.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import okhttp3.*;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Frontier AI Java SDK Client
 */
public class FrontierClient {{
    private static final String DEFAULT_BASE_URL = "{config.base_url}";
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String baseUrl;
    private String apiKey;
    
    public FrontierClient() {{
        this(null, DEFAULT_BASE_URL);
    }}
    
    public FrontierClient(String apiKey) {{
        this(apiKey, DEFAULT_BASE_URL);
    }}
    
    public FrontierClient(String apiKey, String baseUrl) {{
        this.apiKey = apiKey;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        
        this.httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .addInterceptor(this::addHeaders)
            .build();
        
        this.objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());
    }}
    
    private Response addHeaders(Interceptor.Chain chain) throws IOException {{
        Request.Builder builder = chain.request().newBuilder()
            .addHeader("User-Agent", "Frontier-Java-SDK/{config.version}")
            .addHeader("Content-Type", "application/json");
        
        if (apiKey != null) {{
            builder.addHeader("X-API-Key", apiKey);
        }}
        
        return chain.proceed(builder.build());
    }}
    
    private <T> T post(String endpoint, Object requestBody, Class<T> responseType) throws IOException {{
        String json = objectMapper.writeValueAsString(requestBody);
        RequestBody body = RequestBody.create(json, JSON);
        
        Request request = new Request.Builder()
            .url(baseUrl + endpoint)
            .post(body)
            .build();
        
        try (Response response = httpClient.newCall(request).execute()) {{
            if (!response.isSuccessful()) {{
                throw new IOException("API call failed: " + response.code() + " " + response.message());
            }}
            
            String responseBody = response.body().string();
            Map<String, Object> apiResponse = objectMapper.readValue(responseBody, Map.class);
            
            if (!(Boolean) apiResponse.get("success")) {{
                throw new IOException("API error: " + apiResponse.get("error"));
            }}
            
            Object data = apiResponse.get("data");
            return objectMapper.convertValue(data, responseType);
        }}
    }}
    
    // Visual Design Methods
    public BrandIdentityResponse createBrandIdentity(BrandIdentityRequest request) throws IOException {{
        return post("/api/v1/visual-design/brand-identity", request, BrandIdentityResponse.class);
    }}
    
    // Code Quality Methods
    public CodeAnalysisResponse analyzeCode(CodeAnalysisRequest request) throws IOException {{
        return post("/api/v1/code-quality/analyze", request, CodeAnalysisResponse.class);
    }}
    
    // Image Generation Methods
    public ImageGenerationResponse generateImage(ImageGenerationRequest request) throws IOException {{
        return post("/api/v1/image-generation/create", request, ImageGenerationResponse.class);
    }}
    
    // Utility Methods
    public void setApiKey(String apiKey) {{
        this.apiKey = apiKey;
    }}
    
    public void close() {{
        httpClient.dispatcher().executorService().shutdown();
        httpClient.connectionPool().evictAll();
    }}
}}
'''
        
        with open(f"{src_dir}/FrontierClient.java", 'w') as f:
            f.write(client_content)
    
    def _generate_readme(self, output_dir: str, config: SdkConfig, language: str):
        """Generate README for SDK"""
        readme_content = f'''# {config.package_name}

{config.description}

## Installation

'''
        
        if language == 'javascript':
            readme_content += '''### npm
```bash
npm install @frontier-ai/sdk
```

### yarn
```bash
yarn add @frontier-ai/sdk
```

## Usage

```javascript
import { FrontierClient } from '@frontier-ai/sdk';

const client = new FrontierClient({
  apiKey: 'fk_live_your_api_key_here'
});

// Generate brand identity
const brandIdentity = await client.createBrandIdentity({
  company_name: 'TechCorp',
  industry: 'technology',
  style: 'modern'
});

console.log(brandIdentity);
```
'''
        elif language == 'python':
            readme_content += '''### pip
```bash
pip install frontier-ai-sdk
```

## Usage

```python
from frontier_ai import FrontierClient

client = FrontierClient(api_key='fk_live_your_api_key_here')

# Generate brand identity
brand_identity = client.create_brand_identity(
    company_name='TechCorp',
    industry='technology',
    style='modern'
)

print(brand_identity)
```
'''
        elif language == 'java':
            readme_content += '''### Maven
```xml
<dependency>
    <groupId>ai.frontier</groupId>
    <artifactId>frontier-java-sdk</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Gradle
```gradle
implementation 'ai.frontier:frontier-java-sdk:1.0.0'
```

## Usage

```java
import ai.frontier.client.FrontierClient;
import ai.frontier.models.*;

FrontierClient client = new FrontierClient("fk_live_your_api_key_here");

// Generate brand identity
BrandIdentityRequest request = BrandIdentityRequest.builder()
    .companyName("TechCorp")
    .industry("technology")
    .style("modern")
    .build();

BrandIdentityResponse response = client.createBrandIdentity(request);
System.out.println(response);
```
'''
        
        readme_content += f'''
## Features

- ✅ Complete API coverage
- ✅ Type-safe requests and responses
- ✅ Automatic retries and error handling
- ✅ Comprehensive documentation
- ✅ Modern {language} patterns

## API Reference

### Visual Design
- Brand identity generation
- UI layout creation
- Website mockup generation

### Code Quality
- Code analysis and pattern detection
- Security vulnerability scanning
- Automated refactoring

### Image Generation
- Text-to-image generation
- Product photography
- Asset optimization

### Audio/Video Processing
- Script generation
- Voiceover creation
- Audio transcription

### Business Operations
- Financial analysis
- Strategic planning
- Market intelligence

## Authentication

Set your API key when creating the client:

```{language}
// Get your API key from https://dashboard.frontier.ai
const client = new FrontierClient({{
  apiKey: 'fk_live_your_api_key_here'
}});
```

## Error Handling

The SDK throws descriptive errors for different scenarios:

- `AuthenticationException`: Invalid API key
- `RateLimitException`: Rate limit exceeded
- `ValidationException`: Invalid request parameters
- `APIException`: General API errors

## Support

- Documentation: https://docs.frontier.ai
- API Reference: https://api.frontier.ai/docs
- Support: support@frontier.ai

## License

MIT License - see LICENSE file for details.
'''
        
        with open(f"{output_dir}/README.md", 'w') as f:
            f.write(readme_content)
    
    # Helper methods
    def _camel_case(self, text: str) -> str:
        """Convert to camelCase"""
        components = text.split('_')
        return components[0] + ''.join(word.capitalize() for word in components[1:])
    
    def _snake_case(self, text: str) -> str:
        """Convert to snake_case"""
        import re
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', text)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()
    
    def _pascal_case(self, text: str) -> str:
        """Convert to PascalCase"""
        return ''.join(word.capitalize() for word in text.split('_'))
    
    def _kebab_case(self, text: str) -> str:
        """Convert to kebab-case"""
        return self._snake_case(text).replace('_', '-')

async def main():
    """Main function for SDK generation"""
    generator = SdkGenerator()
    
    # Load OpenAPI spec
    await generator.load_openapi_spec()
    
    # Generate SDKs for multiple languages
    languages = [
        ('javascript', 'typescript'),
        ('python', 'python'),
        ('java', 'java'),
        ('csharp', 'csharp'),
        ('go', 'go'),
        ('ruby', 'ruby'),
        ('php', 'php')
    ]
    
    for lang_key, lang_name in languages:
        try:
            config = SdkConfig(
                language=lang_name,
                package_name=f"frontier-{lang_key}-sdk",
                version="1.0.0",
                author="Frontier AI",
                description="Official Frontier AI SDK for comprehensive AI capabilities",
                base_url="https://api.frontier.ai",
                output_dir=f"./sdks/{lang_key}"
            )
            
            await generator.generate_sdk(lang_key, config)
            logger.info(f"✅ {lang_name} SDK generated successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to generate {lang_name} SDK: {str(e)}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
