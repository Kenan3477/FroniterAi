"""
FastAPI + React Generator

Generates complete, production-ready FastAPI backend with React frontend
using modern Python and JavaScript/TypeScript best practices.
"""

import json
from typing import Dict, List, Any
from ..web_development import ProjectRequirements, DatabaseType, TechStack

class FastAPIGenerator:
    """
    FastAPI + React generator that creates:
    - FastAPI backend with async/await
    - SQLAlchemy 2.0 ORM
    - Alembic migrations
    - Pydantic v2 models
    - JWT authentication
    - OAuth2 security
    - React frontend with TypeScript
    - OpenAPI documentation
    - Docker configuration
    """
    
    def __init__(self):
        self.backend_generators = BackendGenerators()
        self.frontend_generators = FrontendGenerators()
        self.auth_generators = AuthGenerators()
        self.database_generators = DatabaseGenerators()
    
    async def generate_project_files(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate complete FastAPI + React project"""
        files = {}
        
        # Backend files
        files.update(await self._generate_backend_structure(requirements))
        
        # Frontend files
        files.update(await self._generate_frontend_structure(requirements))
        
        # Docker configuration
        files.update(await self._generate_docker_config(requirements))
        
        # Development configuration
        files.update(await self._generate_dev_config(requirements))
        
        return files
    
    async def _generate_backend_structure(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate FastAPI backend structure"""
        files = {}
        
        # Core application files
        files["backend/app/main.py"] = self.backend_generators.generate_main_app(requirements)
        files["backend/app/core/config.py"] = self.backend_generators.generate_config(requirements)
        files["backend/app/core/security.py"] = self.backend_generators.generate_security(requirements)
        files["backend/app/core/database.py"] = self.database_generators.generate_database_config(requirements)
        
        # Models
        files["backend/app/models/__init__.py"] = ""
        files["backend/app/models/user.py"] = self.backend_generators.generate_user_model(requirements)
        
        # Schemas (Pydantic models)
        files["backend/app/schemas/__init__.py"] = ""
        files["backend/app/schemas/user.py"] = self.backend_generators.generate_user_schemas()
        files["backend/app/schemas/token.py"] = self.backend_generators.generate_token_schemas()
        
        # API routes
        files["backend/app/api/__init__.py"] = ""
        files["backend/app/api/deps.py"] = self.backend_generators.generate_dependencies()
        files["backend/app/api/v1/__init__.py"] = ""
        files["backend/app/api/v1/api.py"] = self.backend_generators.generate_api_router(requirements)
        files["backend/app/api/v1/endpoints/__init__.py"] = ""
        files["backend/app/api/v1/endpoints/auth.py"] = self.auth_generators.generate_auth_endpoints()
        files["backend/app/api/v1/endpoints/users.py"] = self.backend_generators.generate_user_endpoints()
        
        # CRUD operations
        files["backend/app/crud/__init__.py"] = ""
        files["backend/app/crud/base.py"] = self.backend_generators.generate_base_crud()
        files["backend/app/crud/user.py"] = self.backend_generators.generate_user_crud()
        
        # Database migrations
        files["backend/alembic.ini"] = self.database_generators.generate_alembic_config()
        files["backend/alembic/env.py"] = self.database_generators.generate_alembic_env()
        files["backend/alembic/script.py.mako"] = self.database_generators.generate_alembic_template()
        
        # Requirements
        files["backend/requirements.txt"] = self._generate_backend_requirements(requirements)
        files["backend/requirements-dev.txt"] = self._generate_backend_dev_requirements()
        
        # Tests
        files["backend/tests/__init__.py"] = ""
        files["backend/tests/conftest.py"] = self.backend_generators.generate_test_config()
        files["backend/tests/test_auth.py"] = self.backend_generators.generate_auth_tests()
        files["backend/tests/test_users.py"] = self.backend_generators.generate_user_tests()
        
        # Add feature-specific files
        if "blog" in requirements.features:
            files.update(self._generate_blog_backend(requirements))
        
        if "ecommerce" in requirements.features:
            files.update(self._generate_ecommerce_backend(requirements))
        
        return files
    
    async def _generate_frontend_structure(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate React frontend structure"""
        files = {}
        
        # Package configuration
        files["frontend/package.json"] = self._generate_frontend_package_json(requirements)
        files["frontend/tsconfig.json"] = self._generate_frontend_tsconfig()
        files["frontend/vite.config.ts"] = self._generate_vite_config()
        
        # Source files
        files["frontend/src/main.tsx"] = self.frontend_generators.generate_main_tsx()
        files["frontend/src/App.tsx"] = self.frontend_generators.generate_app_component(requirements)
        files["frontend/src/index.css"] = self.frontend_generators.generate_index_css()
        
        # API client
        files["frontend/src/api/client.ts"] = self.frontend_generators.generate_api_client(requirements)
        files["frontend/src/api/auth.ts"] = self.frontend_generators.generate_auth_api()
        files["frontend/src/api/users.ts"] = self.frontend_generators.generate_users_api()
        
        # Types
        files["frontend/src/types/index.ts"] = self.frontend_generators.generate_types()
        files["frontend/src/types/api.ts"] = self.frontend_generators.generate_api_types()
        
        # Components
        files["frontend/src/components/Layout.tsx"] = self.frontend_generators.generate_layout_component()
        files["frontend/src/components/Header.tsx"] = self.frontend_generators.generate_header_component()
        files["frontend/src/components/LoginForm.tsx"] = self.frontend_generators.generate_login_form()
        files["frontend/src/components/SignupForm.tsx"] = self.frontend_generators.generate_signup_form()
        
        # Pages
        files["frontend/src/pages/Home.tsx"] = self.frontend_generators.generate_home_page(requirements)
        files["frontend/src/pages/Login.tsx"] = self.frontend_generators.generate_login_page()
        files["frontend/src/pages/Dashboard.tsx"] = self.frontend_generators.generate_dashboard_page()
        
        # Hooks
        files["frontend/src/hooks/useAuth.ts"] = self.frontend_generators.generate_use_auth_hook()
        files["frontend/src/hooks/useApi.ts"] = self.frontend_generators.generate_use_api_hook()
        
        # Context
        files["frontend/src/context/AuthContext.tsx"] = self.frontend_generators.generate_auth_context()
        
        # Utils
        files["frontend/src/utils/auth.ts"] = self.frontend_generators.generate_auth_utils()
        files["frontend/src/utils/api.ts"] = self.frontend_generators.generate_api_utils()
        
        # Public files
        files["frontend/public/index.html"] = self.frontend_generators.generate_index_html(requirements)
        files["frontend/public/vite.svg"] = self.frontend_generators.generate_vite_svg()
        
        return files
    
    async def _generate_docker_config(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate Docker configuration"""
        files = {}
        
        # Backend Dockerfile
        files["backend/Dockerfile"] = self._generate_backend_dockerfile()
        
        # Frontend Dockerfile
        files["frontend/Dockerfile"] = self._generate_frontend_dockerfile()
        
        # Docker Compose
        files["docker-compose.yml"] = self._generate_docker_compose(requirements)
        files["docker-compose.dev.yml"] = self._generate_docker_compose_dev(requirements)
        
        return files
    
    async def _generate_dev_config(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate development configuration"""
        files = {}
        
        # Environment files
        files[".env.example"] = self._generate_env_example(requirements)
        files["backend/.env.example"] = self._generate_backend_env_example(requirements)
        files["frontend/.env.example"] = self._generate_frontend_env_example()
        
        # Scripts
        files["scripts/start-dev.sh"] = self._generate_dev_start_script()
        files["scripts/setup.sh"] = self._generate_setup_script()
        
        # Makefile
        files["Makefile"] = self._generate_makefile()
        
        return files
    
    def _generate_backend_requirements(self, requirements: ProjectRequirements) -> str:
        """Generate backend requirements.txt"""
        deps = [
            "fastapi==0.104.1",
            "uvicorn[standard]==0.24.0",
            "sqlalchemy==2.0.23",
            "alembic==1.13.0",
            "pydantic==2.5.0",
            "pydantic-settings==2.1.0",
            "python-jose[cryptography]==3.3.0",
            "passlib[bcrypt]==1.7.4",
            "python-multipart==0.0.6",
            "email-validator==2.1.0",
            "python-dotenv==1.0.0",
            "httpx==0.25.2"
        ]
        
        # Database-specific dependencies
        if requirements.database == DatabaseType.POSTGRESQL:
            deps.append("psycopg2-binary==2.9.9")
        elif requirements.database == DatabaseType.MYSQL:
            deps.append("PyMySQL==1.1.0")
        elif requirements.database == DatabaseType.SQLITE:
            deps.append("aiosqlite==0.19.0")
        
        # Feature-specific dependencies
        if requirements.payment_integration:
            deps.append("stripe==7.8.0")
        
        if requirements.real_time_features:
            deps.append("websockets==12.0")
        
        if "email" in requirements.features:
            deps.append("fastapi-mail==1.4.1")
        
        if "file_upload" in requirements.features:
            deps.extend(["python-multipart==0.0.6", "aiofiles==23.2.1"])
        
        return "\n".join(deps)
    
    def _generate_frontend_package_json(self, requirements: ProjectRequirements) -> str:
        """Generate frontend package.json"""
        dependencies = {
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "react-router-dom": "^6.20.1",
            "axios": "^1.6.2",
            "@tanstack/react-query": "^5.8.4",
            "zustand": "^4.4.7",
            "react-hook-form": "^7.48.2",
            "zod": "^3.22.4",
            "@hookform/resolvers": "^3.3.2"
        }
        
        dev_dependencies = {
            "@types/react": "^18.2.37",
            "@types/react-dom": "^18.2.15",
            "@typescript-eslint/eslint-plugin": "^6.13.1",
            "@typescript-eslint/parser": "^6.13.1",
            "@vitejs/plugin-react": "^4.2.0",
            "eslint": "^8.55.0",
            "eslint-plugin-react-hooks": "^4.6.0",
            "eslint-plugin-react-refresh": "^0.4.5",
            "typescript": "^5.3.2",
            "vite": "^5.0.5"
        }
        
        # Add styling dependencies
        if "tailwind" in requirements.features:
            dependencies.update({
                "tailwindcss": "^3.3.6",
                "autoprefixer": "^10.4.16",
                "postcss": "^8.4.32"
            })
        
        scripts = {
            "dev": "vite",
            "build": "tsc && vite build",
            "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
            "preview": "vite preview"
        }
        
        package = {
            "name": f"{requirements.name.lower().replace(' ', '-')}-frontend",
            "private": True,
            "version": "0.0.0",
            "type": "module",
            "scripts": scripts,
            "dependencies": dependencies,
            "devDependencies": dev_dependencies
        }
        
        return json.dumps(package, indent=2)


# Helper classes for code generation
class BackendGenerators:
    def generate_main_app(self, requirements: ProjectRequirements) -> str:
        """Generate main FastAPI application"""
        return f'''from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1.api import api_router
from app.core.config import settings

app = FastAPI(
    title="{requirements.name} API",
    description="{requirements.description}",
    version="1.0.0",
    openapi_url=f"{{settings.API_V1_STR}}/openapi.json"
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=settings.BACKEND_CORS_ORIGINS
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {{"message": "Welcome to {requirements.name} API"}}


@app.get("/health")
async def health_check():
    return {{"status": "healthy", "version": "1.0.0"}}
'''
    
    def generate_config(self, requirements: ProjectRequirements) -> str:
        """Generate configuration module"""
        return '''import secrets
from typing import List, Optional, Union
from pydantic import AnyHttpUrl, EmailStr, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []
    
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    PROJECT_NAME: str = "FastAPI Project"
    
    # Database
    DATABASE_URL: Optional[str] = None
    
    # Email
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = None
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[EmailStr] = None
    EMAILS_FROM_NAME: Optional[str] = None
    
    # First superuser
    FIRST_SUPERUSER: EmailStr = "admin@example.com"
    FIRST_SUPERUSER_PASSWORD: str = "changethis"
    
    # Security
    ALGORITHM: str = "HS256"
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()'''


class FrontendGenerators:
    def generate_main_tsx(self) -> str:
        """Generate main.tsx entry point"""
        return '''import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)'''
    
    def generate_app_component(self, requirements: ProjectRequirements) -> str:
        """Generate main App component"""
        return f'''import {{ Routes, Route }} from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import {{ useAuth }} from './hooks/useAuth'

function App() {{
  const {{ user, loading }} = useAuth()

  if (loading) {{
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }}

  return (
    <Layout>
      <Routes>
        <Route path="/" element={{<Home />}} />
        <Route path="/login" element={{<Login />}} />
        {{user && <Route path="/dashboard" element={{<Dashboard />}} />}}
      </Routes>
    </Layout>
  )
}}

export default App'''


class AuthGenerators:
    def generate_auth_endpoints(self) -> str:
        """Generate authentication endpoints"""
        return '''from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.security import get_password_hash

router = APIRouter()


@router.post("/login/access-token", response_model=schemas.Token)
def login_access_token(
    db: Session = Depends(deps.get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = crud.user.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Incorrect email or password"
        )
    elif not crud.user.is_active(user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Inactive user"
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }


@router.post("/test-token", response_model=schemas.User)
def test_token(current_user: models.User = Depends(deps.get_current_user)) -> Any:
    """
    Test access token
    """
    return current_user


@router.post("/register", response_model=schemas.User)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserCreate,
) -> Any:
    """
    Create new user.
    """
    user = crud.user.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = crud.user.create(db, obj_in=user_in)
    return user'''


class DatabaseGenerators:
    def generate_database_config(self, requirements: ProjectRequirements) -> str:
        """Generate database configuration"""
        return '''from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()'''
