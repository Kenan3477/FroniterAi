"""
Security Analyzer Module

Analyzes and implements security best practices for web applications
including OWASP Top 10 protection, secure coding patterns, and vulnerability assessment.
"""

import asyncio
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
from enum import Enum
import re

class SecurityVulnerability(Enum):
    XSS = "cross_site_scripting"
    SQL_INJECTION = "sql_injection"
    CSRF = "cross_site_request_forgery"
    INSECURE_AUTH = "insecure_authentication"
    BROKEN_ACCESS_CONTROL = "broken_access_control"
    SECURITY_MISCONFIGURATION = "security_misconfiguration"
    VULNERABLE_COMPONENTS = "vulnerable_components"
    INSUFFICIENT_LOGGING = "insufficient_logging"
    INSECURE_DESERIALIZATION = "insecure_deserialization"
    INJECTION = "injection"

class SecurityLevel(Enum):
    BASIC = "basic"
    STANDARD = "standard"
    ADVANCED = "advanced"
    ENTERPRISE = "enterprise"

@dataclass
class SecurityRecommendation:
    """Security recommendation with implementation details"""
    vulnerability: SecurityVulnerability
    severity: str  # Critical, High, Medium, Low
    description: str
    implementation: str
    code_example: str
    owasp_category: str

class SecurityAnalyzer:
    """
    Comprehensive security analyzer that implements:
    - OWASP Top 10 protection
    - Secure coding best practices
    - Authentication and authorization patterns
    - Input validation and sanitization
    - Secure headers and CORS configuration
    - Rate limiting and DDoS protection
    - Security testing recommendations
    """
    
    def __init__(self):
        self.owasp_top_10 = self._initialize_owasp_top_10()
        self.security_headers = self._initialize_security_headers()
        self.auth_patterns = self._initialize_auth_patterns()
        
    def analyze_security_requirements(self, requirements) -> Dict[str, Any]:
        """Analyze project requirements and generate security recommendations"""
        security_level = self._determine_security_level(requirements)
        recommendations = self._generate_security_recommendations(requirements, security_level)
        
        return {
            "security_level": security_level,
            "recommendations": recommendations,
            "implementation_guide": self._generate_implementation_guide(recommendations),
            "security_checklist": self._generate_security_checklist(security_level),
            "compliance_requirements": self._analyze_compliance_requirements(requirements)
        }
    
    def generate_security_configurations(self, tech_stack, requirements) -> Dict[str, str]:
        """Generate security configurations for specific tech stack"""
        configurations = {}
        
        # Security headers configuration
        configurations["security_headers"] = self._generate_security_headers_config(tech_stack)
        
        # CORS configuration
        configurations["cors_config"] = self._generate_cors_config(requirements)
        
        # Rate limiting configuration
        configurations["rate_limiting"] = self._generate_rate_limiting_config(tech_stack)
        
        # Authentication configuration
        if requirements.authentication:
            configurations["auth_config"] = self._generate_auth_security_config(tech_stack)
        
        # Database security
        configurations["database_security"] = self._generate_database_security_config(requirements.database)
        
        # Environment security
        configurations["env_security"] = self._generate_env_security_config()
        
        return configurations
    
    def _determine_security_level(self, requirements) -> SecurityLevel:
        """Determine appropriate security level based on requirements"""
        if requirements.payment_integration or "enterprise" in requirements.features:
            return SecurityLevel.ENTERPRISE
        elif requirements.authentication and requirements.admin_panel:
            return SecurityLevel.ADVANCED
        elif requirements.authentication or "api" in requirements.features:
            return SecurityLevel.STANDARD
        else:
            return SecurityLevel.BASIC
    
    def _generate_security_recommendations(self, requirements, security_level: SecurityLevel) -> List[SecurityRecommendation]:
        """Generate security recommendations based on requirements and level"""
        recommendations = []
        
        # Input Validation & Sanitization
        recommendations.append(SecurityRecommendation(
            vulnerability=SecurityVulnerability.INJECTION,
            severity="Critical",
            description="Implement comprehensive input validation and sanitization",
            implementation="Use schema validation (Zod, Pydantic) and sanitize all user inputs",
            code_example=self._get_input_validation_example(requirements.tech_stack),
            owasp_category="A03:2021 – Injection"
        ))
        
        # Authentication Security
        if requirements.authentication:
            recommendations.append(SecurityRecommendation(
                vulnerability=SecurityVulnerability.INSECURE_AUTH,
                severity="High",
                description="Implement secure authentication with proper session management",
                implementation="Use JWT with secure storage, implement password policies, and MFA",
                code_example=self._get_auth_security_example(requirements.tech_stack),
                owasp_category="A07:2021 – Identification and Authentication Failures"
            ))
        
        # XSS Protection
        recommendations.append(SecurityRecommendation(
            vulnerability=SecurityVulnerability.XSS,
            severity="High",
            description="Implement XSS protection mechanisms",
            implementation="Content Security Policy, input escaping, and secure templating",
            code_example=self._get_xss_protection_example(requirements.tech_stack),
            owasp_category="A03:2021 – Injection"
        ))
        
        # CSRF Protection
        recommendations.append(SecurityRecommendation(
            vulnerability=SecurityVulnerability.CSRF,
            severity="Medium",
            description="Implement CSRF protection for state-changing operations",
            implementation="CSRF tokens, SameSite cookies, and proper CORS configuration",
            code_example=self._get_csrf_protection_example(requirements.tech_stack),
            owasp_category="A01:2021 – Broken Access Control"
        ))
        
        # Access Control
        if requirements.authorization or requirements.admin_panel:
            recommendations.append(SecurityRecommendation(
                vulnerability=SecurityVulnerability.BROKEN_ACCESS_CONTROL,
                severity="Critical",
                description="Implement proper access control and authorization",
                implementation="Role-based access control (RBAC) with principle of least privilege",
                code_example=self._get_access_control_example(requirements.tech_stack),
                owasp_category="A01:2021 – Broken Access Control"
            ))
        
        # Security Headers
        recommendations.append(SecurityRecommendation(
            vulnerability=SecurityVulnerability.SECURITY_MISCONFIGURATION,
            severity="Medium",
            description="Implement comprehensive security headers",
            implementation="Security headers including HSTS, CSP, X-Frame-Options, etc.",
            code_example=self._get_security_headers_example(requirements.tech_stack),
            owasp_category="A05:2021 – Security Misconfiguration"
        ))
        
        # Logging and Monitoring
        recommendations.append(SecurityRecommendation(
            vulnerability=SecurityVulnerability.INSUFFICIENT_LOGGING,
            severity="Medium",
            description="Implement comprehensive security logging and monitoring",
            implementation="Security event logging, intrusion detection, and alerting",
            code_example=self._get_security_logging_example(requirements.tech_stack),
            owasp_category="A09:2021 – Security Logging and Monitoring Failures"
        ))
        
        return recommendations
    
    def _get_input_validation_example(self, tech_stack) -> str:
        """Generate input validation example for tech stack"""
        if "react" in tech_stack.value.lower():
            return '''// React + Zod Input Validation
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const userSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number, and special character'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\\s]+$/, 'Name can only contain letters and spaces')
})

function UserForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(userSchema)
  })
  
  const onSubmit = (data) => {
    // Data is automatically validated and sanitized
    console.log('Validated data:', data)
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} placeholder="Email" />
      {errors.email && <span>{errors.email.message}</span>}
      
      <input {...register('password')} type="password" placeholder="Password" />
      {errors.password && <span>{errors.password.message}</span>}
    </form>
  )
}'''
        
        elif "fastapi" in tech_stack.value.lower():
            return '''# FastAPI + Pydantic Input Validation
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
import re

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., min_length=2, max_length=50)
    
    @validator('password')
    def validate_password(cls, v):
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]', v):
            raise ValueError('Password must contain uppercase, lowercase, number, and special character')
        return v
    
    @validator('name')
    def validate_name(cls, v):
        if not re.match(r'^[a-zA-Z\\s]+$', v):
            raise ValueError('Name can only contain letters and spaces')
        return v

@app.post("/users/")
async def create_user(user: UserCreate):
    # Input is automatically validated by Pydantic
    # Sanitize additional fields if needed
    sanitized_name = user.name.strip().title()
    return {"message": "User created", "name": sanitized_name}'''
        
        return "# Input validation implementation depends on chosen tech stack"
    
    def _get_auth_security_example(self, tech_stack) -> str:
        """Generate authentication security example"""
        if "nextjs" in tech_stack.value.lower():
            return '''// Next.js + NextAuth.js Secure Authentication
import NextAuth, { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        
        if (!user || !await bcrypt.compare(credentials.password, user.password)) {
          return null
        }
        
        return { id: user.id, email: user.email, name: user.name }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id
      return token
    },
    async session({ session, token }) {
      session.userId = token.userId
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  }
}'''
        
        elif "fastapi" in tech_stack.value.lower():
            return '''# FastAPI Secure Authentication
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SECRET_KEY = "your-secret-key"  # Use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

class AuthService:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        return pwd_context.hash(password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = get_user(username=username)
    if user is None:
        raise credentials_exception
    return user'''
        
        return "# Authentication implementation depends on chosen tech stack"
    
    def _get_xss_protection_example(self, tech_stack) -> str:
        """Generate XSS protection example"""
        return '''// Content Security Policy (CSP) Headers
const securityHeaders = {
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://api.example.com;
    frame-ancestors 'none';
  `.replace(/\\s{2,}/g, ' ').trim(),
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}

// React: Use dangerouslySetInnerHTML carefully
function SafeContent({ htmlContent }: { htmlContent: string }) {
  // Use DOMPurify to sanitize HTML
  const sanitizedHTML = DOMPurify.sanitize(htmlContent)
  
  return (
    <div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
  )
}

// Always escape user input when displaying
function UserComment({ comment }: { comment: string }) {
  // React automatically escapes content
  return <p>{comment}</p> // Safe by default
}'''
    
    def _get_csrf_protection_example(self, tech_stack) -> str:
        """Generate CSRF protection example"""
        return '''// CSRF Protection Implementation
// Next.js API Route with CSRF protection
import { getCsrfToken } from 'next-auth/react'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const token = await getCsrfToken({ req })
    
    if (req.body.csrfToken !== token) {
      return res.status(403).json({ error: 'Invalid CSRF token' })
    }
    
    // Process the request
    res.json({ success: true })
  }
}

// Client-side form with CSRF token
function SecureForm() {
  const [csrfToken, setCsrfToken] = useState('')
  
  useEffect(() => {
    getCsrfToken().then(setCsrfToken)
  }, [])
  
  const handleSubmit = async (data) => {
    await fetch('/api/secure-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, csrfToken })
    })
  }
  
  return <form onSubmit={handleSubmit}>...</form>
}

// FastAPI CSRF Protection
from fastapi_csrf_protect import CsrfProtect
from fastapi_csrf_protect.exceptions import CsrfProtectError

@app.exception_handler(CsrfProtectError)
def csrf_protect_exception_handler(request: Request, exc: CsrfProtectError):
    return JSONResponse(
        status_code=exc.status_code,
        content={ 'detail':  exc.message }
    )

@app.post('/protected')
def protected_route(
    request: Request,
    csrf_protect: CsrfProtect = Depends()
):
    csrf_protect.validate_csrf_in_cookies(request)
    return {'message': 'Protected route accessed successfully'}'''
    
    def _get_access_control_example(self, tech_stack) -> str:
        """Generate access control example"""
        return '''// Role-Based Access Control (RBAC)
enum Role {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

enum Permission {
  READ_POSTS = 'read:posts',
  WRITE_POSTS = 'write:posts',
  DELETE_POSTS = 'delete:posts',
  MANAGE_USERS = 'manage:users'
}

const rolePermissions = {
  [Role.USER]: [Permission.READ_POSTS, Permission.WRITE_POSTS],
  [Role.MODERATOR]: [Permission.READ_POSTS, Permission.WRITE_POSTS, Permission.DELETE_POSTS],
  [Role.ADMIN]: Object.values(Permission)
}

// Next.js middleware for route protection
export function middleware(request: NextRequest) {
  const token = request.cookies.get('session-token')
  const { pathname } = request.nextUrl
  
  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!token || !hasRole(token, Role.ADMIN)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  return NextResponse.next()
}

// React component with permission checking
function ProtectedComponent({ requiredPermission, children }) {
  const { user } = useAuth()
  
  if (!hasPermission(user, requiredPermission)) {
    return <div>Access denied</div>
  }
  
  return children
}

// FastAPI dependency for permission checking
def require_permission(permission: Permission):
    def permission_checker(current_user: User = Depends(get_current_user)):
        if not has_permission(current_user, permission):
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions"
            )
        return current_user
    return permission_checker

@app.delete("/posts/{post_id}")
async def delete_post(
    post_id: int,
    current_user: User = Depends(require_permission(Permission.DELETE_POSTS))
):
    # Only users with delete permission can access this endpoint
    return {"message": f"Post {post_id} deleted by {current_user.email}"}'''
    
    def _get_security_headers_example(self, tech_stack) -> str:
        """Generate security headers example"""
        return '''// Comprehensive Security Headers
const securityHeaders = {
  // Prevent XSS attacks
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // HSTS for HTTPS enforcement
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "frame-src 'none'",
  ].join('; '),
  
  // Feature Policy / Permissions Policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()'
  ].join(', ')
}

// Next.js implementation
export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

// FastAPI implementation
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

app.add_middleware(HTTPSRedirectMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["example.com", "*.example.com"])

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    for header, value in security_headers.items():
        response.headers[header] = value
    
    return response'''
    
    def _get_security_logging_example(self, tech_stack) -> str:
        """Generate security logging example"""
        return '''// Security Event Logging
import winston from 'winston'

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'security.log' }),
    new winston.transports.Console()
  ]
})

// Authentication events
function logAuthEvent(event: string, userId?: string, details?: any) {
  securityLogger.info('Auth Event', {
    event,
    userId,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    details
  })
}

// Usage examples
logAuthEvent('LOGIN_SUCCESS', user.id, { method: 'password' })
logAuthEvent('LOGIN_FAILED', null, { email: attemptedEmail, reason: 'invalid_password' })
logAuthEvent('PASSWORD_CHANGED', user.id)
logAuthEvent('ACCOUNT_LOCKED', user.id, { attempts: 5 })

// Security monitoring middleware
app.use((req, res, next) => {
  // Log suspicious activity
  if (req.path.includes('admin') && !req.user?.isAdmin) {
    securityLogger.warn('Unauthorized admin access attempt', {
      userId: req.user?.id,
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    })
  }
  
  // Rate limiting logs
  if (req.rateLimit && req.rateLimit.remaining < 10) {
    securityLogger.warn('Rate limit approaching', {
      ip: req.ip,
      remaining: req.rateLimit.remaining,
      path: req.path
    })
  }
  
  next()
})

// FastAPI security logging
import logging
from datetime import datetime

security_logger = logging.getLogger('security')
security_logger.setLevel(logging.INFO)

handler = logging.FileHandler('security.log')
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
handler.setFormatter(formatter)
security_logger.addHandler(handler)

def log_security_event(event: str, user_id: str = None, details: dict = None):
    security_logger.info(f"Security Event: {event}", extra={
        'user_id': user_id,
        'timestamp': datetime.utcnow().isoformat(),
        'details': details or {}
    })'''
    
    def _initialize_owasp_top_10(self) -> Dict[str, Dict[str, Any]]:
        """Initialize OWASP Top 10 security risks"""
        return {
            "A01_2021": {
                "name": "Broken Access Control",
                "description": "Access control enforces policy such that users cannot act outside of their intended permissions",
                "prevention": ["Implement proper access controls", "Use principle of least privilege", "Rate limiting"]
            },
            "A02_2021": {
                "name": "Cryptographic Failures",
                "description": "Failures related to cryptography which often leads to sensitive data exposure",
                "prevention": ["Use strong encryption", "Secure key management", "TLS everywhere"]
            },
            "A03_2021": {
                "name": "Injection",
                "description": "Injection flaws occur when untrusted data is sent to an interpreter",
                "prevention": ["Input validation", "Parameterized queries", "Output encoding"]
            }
            # ... other OWASP categories
        }
    
    def _initialize_security_headers(self) -> Dict[str, str]:
        """Initialize security headers configuration"""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
        }
    
    def _initialize_auth_patterns(self) -> Dict[str, Dict[str, Any]]:
        """Initialize secure authentication patterns"""
        return {
            "password_policy": {
                "min_length": 12,
                "require_uppercase": True,
                "require_lowercase": True,
                "require_numbers": True,
                "require_special_chars": True,
                "prevent_common_passwords": True
            },
            "session_management": {
                "secure_cookies": True,
                "httponly_cookies": True,
                "samesite_cookies": "Strict",
                "session_timeout": 3600,  # 1 hour
                "csrf_protection": True
            },
            "mfa_options": ["TOTP", "SMS", "Email", "Hardware tokens"]
        }
