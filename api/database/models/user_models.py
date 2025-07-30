"""
User Management Models

Models for user authentication, authorization, and profile management.
"""

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Float, JSON,
    ForeignKey, Table, Index, UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from datetime import datetime, timedelta
import hashlib
import secrets

from .base import EnhancedBaseModel, register_model

# Association table for many-to-many relationship between users and roles
user_roles_association = Table(
    'user_roles',
    EnhancedBaseModel.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True)
)

# Association table for many-to-many relationship between roles and permissions
role_permissions_association = Table(
    'role_permissions',
    EnhancedBaseModel.metadata,
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id'), primary_key=True)
)

@register_model
class User(EnhancedBaseModel):
    """User accounts and authentication"""
    __tablename__ = 'users'
    
    # Basic user information
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    salt = Column(String(32), nullable=False)
    
    # Personal information
    first_name = Column(String(50))
    last_name = Column(String(50))
    full_name = Column(String(100))
    phone = Column(String(20))
    
    # Account settings
    subscription_tier = Column(String(20), default='basic', nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    phone_verified = Column(Boolean, default=False, nullable=False)
    
    # Security settings
    two_factor_enabled = Column(Boolean, default=False, nullable=False)
    two_factor_secret = Column(String(32))
    password_reset_token = Column(String(100))
    password_reset_expires = Column(DateTime)
    email_verification_token = Column(String(100))
    email_verification_expires = Column(DateTime)
    
    # Activity tracking
    last_login = Column(DateTime)
    last_activity = Column(DateTime)
    login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime)
    
    # Preferences
    timezone = Column(String(50), default='UTC')
    language = Column(String(10), default='en')
    theme = Column(String(20), default='light')
    notifications_enabled = Column(Boolean, default=True)
    
    # Usage tracking
    api_requests_count = Column(Integer, default=0)
    last_api_request = Column(DateTime)
    
    # Relationships
    roles = relationship("Role", secondary=user_roles_association, back_populates="users")
    profile = relationship("UserProfile", back_populates="user", uselist=False)
    api_keys = relationship("APIKey", back_populates="user")
    sessions = relationship("UserSession", back_populates="user")
    companies = relationship("Company", back_populates="owner")
    
    __table_args__ = (
        CheckConstraint('subscription_tier IN ("basic", "professional", "enterprise")', 
                       name='valid_subscription_tier'),
        CheckConstraint('login_attempts >= 0', name='valid_login_attempts'),
        Index('idx_user_email_active', 'email', 'is_active'),
        Index('idx_user_subscription', 'subscription_tier'),
        Index('idx_user_activity', 'last_activity'),
    )
    
    def set_password(self, password: str):
        """Set password with salt and hash"""
        self.salt = secrets.token_hex(16)
        self.password_hash = self._hash_password(password, self.salt)
    
    def check_password(self, password: str) -> bool:
        """Check if password is correct"""
        return self.password_hash == self._hash_password(password, self.salt)
    
    @staticmethod
    def _hash_password(password: str, salt: str) -> str:
        """Hash password with salt using SHA-256"""
        return hashlib.sha256((password + salt).encode()).hexdigest()
    
    def generate_password_reset_token(self) -> str:
        """Generate password reset token"""
        self.password_reset_token = secrets.token_urlsafe(32)
        self.password_reset_expires = datetime.utcnow() + timedelta(hours=24)
        return self.password_reset_token
    
    def generate_email_verification_token(self) -> str:
        """Generate email verification token"""
        self.email_verification_token = secrets.token_urlsafe(32)
        self.email_verification_expires = datetime.utcnow() + timedelta(hours=48)
        return self.email_verification_token
    
    def is_password_reset_valid(self) -> bool:
        """Check if password reset token is valid"""
        return (self.password_reset_token and 
                self.password_reset_expires and 
                datetime.utcnow() < self.password_reset_expires)
    
    def is_email_verification_valid(self) -> bool:
        """Check if email verification token is valid"""
        return (self.email_verification_token and 
                self.email_verification_expires and 
                datetime.utcnow() < self.email_verification_expires)
    
    def record_login_attempt(self, successful: bool):
        """Record login attempt"""
        if successful:
            self.login_attempts = 0
            self.last_login = datetime.utcnow()
            self.locked_until = None
        else:
            self.login_attempts += 1
            if self.login_attempts >= 5:  # Lock after 5 failed attempts
                self.locked_until = datetime.utcnow() + timedelta(minutes=30)
    
    def is_locked(self) -> bool:
        """Check if account is locked"""
        return (self.locked_until and datetime.utcnow() < self.locked_until)
    
    def can_access_feature(self, feature: str) -> bool:
        """Check if user can access a feature based on subscription tier"""
        tier_features = {
            'basic': ['financial_analysis', 'basic_reports'],
            'professional': [
                'financial_analysis', 'basic_reports', 'valuation_analysis',
                'trend_analysis', 'industry_benchmarks', 'strategic_planning'
            ],
            'enterprise': [
                'financial_analysis', 'basic_reports', 'valuation_analysis',
                'trend_analysis', 'industry_benchmarks', 'strategic_planning',
                'competitive_analysis', 'market_research', 'compliance_monitoring',
                'risk_assessment', 'custom_reporting', 'api_access'
            ]
        }
        
        return feature in tier_features.get(self.subscription_tier, [])
    
    @property
    def display_name(self) -> str:
        """Get display name"""
        if self.full_name:
            return self.full_name
        elif self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.first_name:
            return self.first_name
        else:
            return self.username

@register_model
class Role(EnhancedBaseModel):
    """User roles for authorization"""
    __tablename__ = 'roles'
    
    name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    description = Column(Text)
    is_system_role = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    users = relationship("User", secondary=user_roles_association, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions_association, back_populates="roles")
    
    __table_args__ = (
        Index('idx_role_name', 'name'),
        Index('idx_role_active', 'is_active'),
    )

@register_model
class Permission(EnhancedBaseModel):
    """Granular permissions"""
    __tablename__ = 'permissions'
    
    name = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(150), nullable=False)
    description = Column(Text)
    resource = Column(String(50), nullable=False)  # e.g., 'financial_analysis', 'user_management'
    action = Column(String(50), nullable=False)    # e.g., 'read', 'write', 'delete', 'execute'
    is_system_permission = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    roles = relationship("Role", secondary=role_permissions_association, back_populates="permissions")
    
    __table_args__ = (
        UniqueConstraint('resource', 'action', name='unique_resource_action'),
        Index('idx_permission_resource', 'resource'),
        Index('idx_permission_action', 'action'),
    )

@register_model
class UserProfile(EnhancedBaseModel):
    """Extended user profile information"""
    __tablename__ = 'user_profiles'
    
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    
    # Professional information
    job_title = Column(String(100))
    company_name = Column(String(100))
    department = Column(String(50))
    industry = Column(String(50))
    
    # Contact information
    address_line1 = Column(String(200))
    address_line2 = Column(String(200))
    city = Column(String(100))
    state_province = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100))
    
    # Social media and web presence
    linkedin_url = Column(String(200))
    twitter_handle = Column(String(50))
    website_url = Column(String(200))
    
    # Professional details
    years_experience = Column(Integer)
    education_level = Column(String(50))
    certifications = Column(JSON)  # Store as JSON array
    specializations = Column(JSON)  # Store as JSON array
    
    # Preferences and settings
    communication_preferences = Column(JSON)  # Email, SMS, push notifications
    privacy_settings = Column(JSON)
    marketing_consent = Column(Boolean, default=False)
    
    # Profile completion and verification
    profile_completion_percentage = Column(Float, default=0.0)
    profile_verified = Column(Boolean, default=False)
    verification_documents = Column(JSON)
    
    # Relationships
    user = relationship("User", back_populates="profile")
    
    __table_args__ = (
        Index('idx_profile_company', 'company_name'),
        Index('idx_profile_industry', 'industry'),
        CheckConstraint('profile_completion_percentage >= 0 AND profile_completion_percentage <= 100',
                       name='valid_completion_percentage'),
    )
    
    def calculate_completion_percentage(self) -> float:
        """Calculate profile completion percentage"""
        total_fields = 15  # Number of important fields
        completed_fields = 0
        
        fields_to_check = [
            'job_title', 'company_name', 'department', 'industry',
            'address_line1', 'city', 'state_province', 'postal_code', 'country',
            'linkedin_url', 'years_experience', 'education_level'
        ]
        
        for field in fields_to_check:
            if getattr(self, field, None):
                completed_fields += 1
        
        # Check if user has basic info
        if self.user.first_name:
            completed_fields += 1
        if self.user.last_name:
            completed_fields += 1
        if self.user.phone:
            completed_fields += 1
        
        percentage = (completed_fields / total_fields) * 100
        self.profile_completion_percentage = round(percentage, 1)
        return self.profile_completion_percentage

@register_model
class APIKey(EnhancedBaseModel):
    """API keys for programmatic access"""
    __tablename__ = 'api_keys'
    
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    name = Column(String(100), nullable=False)  # User-defined name for the key
    key_hash = Column(String(255), nullable=False, unique=True)
    key_prefix = Column(String(10), nullable=False)  # First few characters for identification
    
    # Access control
    is_active = Column(Boolean, default=True, nullable=False)
    rate_limit_per_minute = Column(Integer, default=60)
    rate_limit_per_hour = Column(Integer, default=1000)
    rate_limit_per_day = Column(Integer, default=10000)
    
    # Scope and permissions
    scopes = Column(JSON)  # List of allowed scopes/endpoints
    ip_whitelist = Column(JSON)  # List of allowed IP addresses
    
    # Usage tracking
    last_used = Column(DateTime)
    requests_count = Column(Integer, default=0)
    requests_today = Column(Integer, default=0)
    last_request_date = Column(DateTime)
    
    # Expiration
    expires_at = Column(DateTime)
    
    # Relationships
    user = relationship("User", back_populates="api_keys")
    
    __table_args__ = (
        Index('idx_api_key_user', 'user_id'),
        Index('idx_api_key_active', 'is_active'),
        Index('idx_api_key_prefix', 'key_prefix'),
    )
    
    def generate_key(self) -> str:
        """Generate new API key"""
        # Generate a secure random key
        key = secrets.token_urlsafe(32)
        self.key_prefix = key[:8]
        self.key_hash = hashlib.sha256(key.encode()).hexdigest()
        return key
    
    def verify_key(self, provided_key: str) -> bool:
        """Verify provided key against stored hash"""
        provided_hash = hashlib.sha256(provided_key.encode()).hexdigest()
        return self.key_hash == provided_hash
    
    def is_expired(self) -> bool:
        """Check if API key is expired"""
        return self.expires_at and datetime.utcnow() > self.expires_at
    
    def is_rate_limited(self) -> bool:
        """Check if API key has exceeded rate limits"""
        now = datetime.utcnow()
        
        # Reset daily counter if needed
        if self.last_request_date and self.last_request_date.date() != now.date():
            self.requests_today = 0
            self.last_request_date = now
        
        # Check daily limit
        if self.requests_today >= self.rate_limit_per_day:
            return True
        
        return False
    
    def record_request(self):
        """Record API request"""
        now = datetime.utcnow()
        self.last_used = now
        self.requests_count += 1
        
        # Reset daily counter if needed
        if self.last_request_date and self.last_request_date.date() != now.date():
            self.requests_today = 0
        
        self.requests_today += 1
        self.last_request_date = now
    
    def has_scope(self, required_scope: str) -> bool:
        """Check if API key has required scope"""
        if not self.scopes:
            return False
        return required_scope in self.scopes
    
    def is_ip_allowed(self, ip_address: str) -> bool:
        """Check if IP address is allowed"""
        if not self.ip_whitelist:
            return True  # No whitelist means all IPs allowed
        return ip_address in self.ip_whitelist

@register_model
class UserSession(EnhancedBaseModel):
    """User session tracking"""
    __tablename__ = 'user_sessions'
    
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    session_token = Column(String(255), unique=True, nullable=False)
    refresh_token = Column(String(255), unique=True)
    
    # Session information
    ip_address = Column(String(45))  # IPv6 support
    user_agent = Column(Text)
    device_type = Column(String(50))  # desktop, mobile, tablet
    browser = Column(String(50))
    operating_system = Column(String(50))
    
    # Geographic information
    country = Column(String(100))
    city = Column(String(100))
    region = Column(String(100))
    
    # Session lifecycle
    started_at = Column(DateTime, default=func.now(), nullable=False)
    last_activity = Column(DateTime, default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Security
    is_suspicious = Column(Boolean, default=False)
    security_flags = Column(JSON)  # Store security-related flags
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    
    __table_args__ = (
        Index('idx_session_user', 'user_id'),
        Index('idx_session_token', 'session_token'),
        Index('idx_session_active', 'is_active'),
        Index('idx_session_expires', 'expires_at'),
    )
    
    def is_expired(self) -> bool:
        """Check if session is expired"""
        return datetime.utcnow() > self.expires_at
    
    def extend_session(self, hours: int = 24):
        """Extend session expiration"""
        self.expires_at = datetime.utcnow() + timedelta(hours=hours)
        self.last_activity = datetime.utcnow()
    
    def end_session(self):
        """End the session"""
        self.is_active = False
        self.ended_at = datetime.utcnow()
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.utcnow()
    
    def flag_as_suspicious(self, reason: str):
        """Flag session as suspicious"""
        self.is_suspicious = True
        if not self.security_flags:
            self.security_flags = []
        self.security_flags.append({
            'reason': reason,
            'timestamp': datetime.utcnow().isoformat()
        })
