"""
User Management System

Comprehensive user management with subscription tiers, role-based access control,
and authentication features.
"""

import bcrypt
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
from enum import Enum
from dataclasses import dataclass
from sqlalchemy.orm import sessionmaker
from sqlalchemy import and_, or_

from api.database.config import DatabaseManager
from api.database.models.user_models import (
    User, Role, Permission, UserProfile, APIKey, UserSession
)
from api.middleware.auth.jwt_manager import jwt_manager


class SubscriptionTier(Enum):
    """Subscription tier levels"""
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class UserStatus(Enum):
    """User account status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


@dataclass
class UserCreationData:
    """Data structure for user creation"""
    username: str
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    subscription_tier: str = "basic"
    roles: Optional[List[str]] = None


@dataclass
class AuthResult:
    """Authentication result structure"""
    success: bool
    user: Optional[User] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    session_id: Optional[str] = None
    error_message: Optional[str] = None


class UserManager:
    """Main user management class"""
    
    def __init__(self):
        self.db_manager = DatabaseManager()
        self.SessionLocal = sessionmaker(bind=self.db_manager.engines['primary'])
        
        # Subscription tier limits
        self.tier_limits = {
            SubscriptionTier.BASIC.value: {
                "api_calls_per_minute": 10,
                "api_calls_per_hour": 100,
                "api_calls_per_day": 1000,
                "features": ["basic_financial_analysis", "industry_benchmarks"],
                "max_api_keys": 0,
                "storage_mb": 100
            },
            SubscriptionTier.PROFESSIONAL.value: {
                "api_calls_per_minute": 50,
                "api_calls_per_hour": 1000,
                "api_calls_per_day": 10000,
                "features": [
                    "basic_financial_analysis", "industry_benchmarks",
                    "valuation_analysis", "trend_analysis", "strategic_planning",
                    "competitive_analysis"
                ],
                "max_api_keys": 5,
                "storage_mb": 1000
            },
            SubscriptionTier.ENTERPRISE.value: {
                "api_calls_per_minute": 200,
                "api_calls_per_hour": 5000,
                "api_calls_per_day": 50000,
                "features": [
                    "basic_financial_analysis", "industry_benchmarks",
                    "valuation_analysis", "trend_analysis", "strategic_planning",
                    "competitive_analysis", "custom_reports", "bulk_analysis",
                    "advanced_analytics", "compliance_tracking"
                ],
                "max_api_keys": 20,
                "storage_mb": 10000
            }
        }
    
    def create_user(self, user_data: UserCreationData) -> User:
        """Create a new user"""
        with self.SessionLocal() as session:
            # Check if username or email already exists
            existing_user = session.query(User).filter(
                or_(User.username == user_data.username, User.email == user_data.email)
            ).first()
            
            if existing_user:
                if existing_user.username == user_data.username:
                    raise ValueError("Username already exists")
                else:
                    raise ValueError("Email already exists")
            
            # Validate subscription tier
            if user_data.subscription_tier not in [tier.value for tier in SubscriptionTier]:
                raise ValueError(f"Invalid subscription tier: {user_data.subscription_tier}")
            
            # Create user
            user = User(
                username=user_data.username,
                email=user_data.email,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                subscription_tier=user_data.subscription_tier,
                is_active=True,
                is_verified=False,
                status=UserStatus.PENDING_VERIFICATION.value
            )
            
            # Set password
            user.set_password(user_data.password)
            
            # Add roles if specified
            if user_data.roles:
                for role_name in user_data.roles:
                    role = session.query(Role).filter_by(name=role_name).first()
                    if role:
                        user.roles.append(role)
            
            # Add default role based on subscription tier
            default_role = self._get_default_role_for_tier(session, user_data.subscription_tier)
            if default_role and default_role not in user.roles:
                user.roles.append(default_role)
            
            session.add(user)
            session.commit()
            session.refresh(user)
            
            # Create user profile
            self._create_user_profile(session, user)
            
            return user
    
    def authenticate_user(self, username_or_email: str, password: str, 
                         remember_me: bool = False) -> AuthResult:
        """Authenticate user with username/email and password"""
        with self.SessionLocal() as session:
            # Find user by username or email
            user = session.query(User).filter(
                or_(User.username == username_or_email, User.email == username_or_email)
            ).first()
            
            if not user:
                return AuthResult(success=False, error_message="Invalid credentials")
            
            # Check password
            if not user.check_password(password):
                return AuthResult(success=False, error_message="Invalid credentials")
            
            # Check if user is active
            if not user.is_active:
                return AuthResult(success=False, error_message="Account is inactive")
            
            if user.status == UserStatus.SUSPENDED.value:
                return AuthResult(success=False, error_message="Account is suspended")
            
            # Create session
            session_id = str(uuid.uuid4())
            expires_at = datetime.utcnow() + timedelta(days=30 if remember_me else 1)
            
            user_session = UserSession(
                user_id=user.id,
                session_id=session_id,
                expires_at=expires_at,
                is_active=True
            )
            session.add(user_session)
            
            # Update last login
            user.last_login = datetime.utcnow()
            session.commit()
            
            # Generate tokens
            access_token = jwt_manager.create_access_token(user, session_id)
            refresh_token = jwt_manager.create_refresh_token(user, session_id)
            
            return AuthResult(
                success=True,
                user=user,
                access_token=access_token,
                refresh_token=refresh_token,
                session_id=session_id
            )
    
    def authenticate_api_key(self, api_key: str) -> Optional[User]:
        """Authenticate using API key"""
        key_info = jwt_manager.validate_api_key(api_key)
        if not key_info:
            return None
        
        with self.SessionLocal() as session:
            user = session.query(User).get(key_info["user_id"])
            if user and user.is_active:
                return user
        
        return None
    
    def create_api_key(self, user_id: int, name: str, 
                       permissions: Optional[List[str]] = None) -> Dict[str, Any]:
        """Create an API key for a user"""
        with self.SessionLocal() as session:
            user = session.query(User).get(user_id)
            if not user:
                raise ValueError("User not found")
            
            # Check subscription tier limits
            tier_limits = self.tier_limits.get(user.subscription_tier, {})
            max_api_keys = tier_limits.get("max_api_keys", 0)
            
            if max_api_keys == 0:
                raise ValueError("API keys not available for your subscription tier")
            
            # Check current API key count
            current_count = session.query(APIKey).filter_by(
                user_id=user_id, is_active=True
            ).count()
            
            if current_count >= max_api_keys:
                raise ValueError(f"Maximum API keys ({max_api_keys}) reached for your subscription tier")
            
            # Create API key
            api_key_data = jwt_manager.create_api_key(user, name, permissions)
            
            # Store in database
            api_key_record = APIKey(
                user_id=user_id,
                key_id=api_key_data["key_id"],
                name=name,
                key_hash=api_key_data["key_id"],  # Simplified for demo
                permissions=permissions or [],
                expires_at=datetime.fromisoformat(api_key_data["expires_at"]),
                is_active=True
            )
            
            session.add(api_key_record)
            session.commit()
            
            return api_key_data
    
    def revoke_api_key(self, user_id: int, key_id: str) -> bool:
        """Revoke an API key"""
        with self.SessionLocal() as session:
            api_key = session.query(APIKey).filter_by(
                user_id=user_id, key_id=key_id, is_active=True
            ).first()
            
            if api_key:
                api_key.is_active = False
                api_key.revoked_at = datetime.utcnow()
                session.commit()
                return True
        
        return False
    
    def get_user_permissions(self, user: User) -> List[str]:
        """Get all permissions for a user"""
        permissions = set()
        
        # Add permissions from roles
        for role in user.roles:
            for permission in role.permissions:
                permissions.add(permission.name)
        
        # Add subscription tier permissions
        tier_features = self.tier_limits.get(user.subscription_tier, {}).get("features", [])
        permissions.update(tier_features)
        
        return list(permissions)
    
    def check_permission(self, user: User, permission: str) -> bool:
        """Check if user has a specific permission"""
        user_permissions = self.get_user_permissions(user)
        return permission in user_permissions
    
    def check_subscription_tier(self, user: User, required_tier: str) -> bool:
        """Check if user has required subscription tier or higher"""
        tier_hierarchy = {
            SubscriptionTier.BASIC.value: 1,
            SubscriptionTier.PROFESSIONAL.value: 2,
            SubscriptionTier.ENTERPRISE.value: 3
        }
        
        user_tier_level = tier_hierarchy.get(user.subscription_tier, 0)
        required_tier_level = tier_hierarchy.get(required_tier, 0)
        
        return user_tier_level >= required_tier_level
    
    def get_rate_limits(self, user: User) -> Dict[str, int]:
        """Get rate limits for a user based on subscription tier"""
        tier_limits = self.tier_limits.get(user.subscription_tier, {})
        
        return {
            "calls_per_minute": tier_limits.get("api_calls_per_minute", 10),
            "calls_per_hour": tier_limits.get("api_calls_per_hour", 100),
            "calls_per_day": tier_limits.get("api_calls_per_day", 1000)
        }
    
    def update_user_profile(self, user_id: int, profile_data: Dict[str, Any]) -> bool:
        """Update user profile information"""
        with self.SessionLocal() as session:
            user = session.query(User).get(user_id)
            if not user:
                return False
            
            profile = session.query(UserProfile).filter_by(user_id=user_id).first()
            if not profile:
                profile = UserProfile(user_id=user_id)
                session.add(profile)
            
            # Update profile fields
            for field, value in profile_data.items():
                if hasattr(profile, field):
                    setattr(profile, field, value)
            
            session.commit()
            return True
    
    def change_password(self, user_id: int, current_password: str, new_password: str) -> bool:
        """Change user password"""
        with self.SessionLocal() as session:
            user = session.query(User).get(user_id)
            if not user:
                return False
            
            # Verify current password
            if not user.check_password(current_password):
                return False
            
            # Set new password
            user.set_password(new_password)
            session.commit()
            
            # Revoke all existing sessions
            jwt_manager.revoke_all_user_sessions(user_id)
            
            return True
    
    def reset_password(self, email: str) -> str:
        """Initiate password reset process"""
        with self.SessionLocal() as session:
            user = session.query(User).filter_by(email=email).first()
            if not user:
                raise ValueError("Email not found")
            
            # Generate reset token
            reset_token = secrets.token_urlsafe(32)
            expires_at = datetime.utcnow() + timedelta(hours=1)
            
            user.password_reset_token = reset_token
            user.password_reset_expires = expires_at
            session.commit()
            
            return reset_token
    
    def confirm_password_reset(self, token: str, new_password: str) -> bool:
        """Confirm password reset with token"""
        with self.SessionLocal() as session:
            user = session.query(User).filter_by(password_reset_token=token).first()
            
            if not user or not user.password_reset_expires:
                return False
            
            if user.password_reset_expires < datetime.utcnow():
                return False
            
            # Set new password
            user.set_password(new_password)
            user.password_reset_token = None
            user.password_reset_expires = None
            session.commit()
            
            # Revoke all existing sessions
            jwt_manager.revoke_all_user_sessions(user.id)
            
            return True
    
    def verify_email(self, user_id: int, verification_token: str) -> bool:
        """Verify user email"""
        with self.SessionLocal() as session:
            user = session.query(User).get(user_id)
            
            if not user or user.email_verification_token != verification_token:
                return False
            
            if user.email_verification_expires and user.email_verification_expires < datetime.utcnow():
                return False
            
            user.is_verified = True
            user.status = UserStatus.ACTIVE.value
            user.email_verification_token = None
            user.email_verification_expires = None
            session.commit()
            
            return True
    
    def suspend_user(self, user_id: int, reason: str) -> bool:
        """Suspend a user account"""
        with self.SessionLocal() as session:
            user = session.query(User).get(user_id)
            if not user:
                return False
            
            user.status = UserStatus.SUSPENDED.value
            user.is_active = False
            session.commit()
            
            # Revoke all sessions
            jwt_manager.revoke_all_user_sessions(user_id)
            
            return True
    
    def activate_user(self, user_id: int) -> bool:
        """Activate a suspended user account"""
        with self.SessionLocal() as session:
            user = session.query(User).get(user_id)
            if not user:
                return False
            
            user.status = UserStatus.ACTIVE.value
            user.is_active = True
            session.commit()
            
            return True
    
    def upgrade_subscription(self, user_id: int, new_tier: str) -> bool:
        """Upgrade user subscription tier"""
        if new_tier not in [tier.value for tier in SubscriptionTier]:
            return False
        
        with self.SessionLocal() as session:
            user = session.query(User).get(user_id)
            if not user:
                return False
            
            user.subscription_tier = new_tier
            session.commit()
            
            return True
    
    def get_user_statistics(self, user_id: int) -> Dict[str, Any]:
        """Get user usage statistics"""
        with self.SessionLocal() as session:
            user = session.query(User).get(user_id)
            if not user:
                return {}
            
            # Get API key count
            api_key_count = session.query(APIKey).filter_by(
                user_id=user_id, is_active=True
            ).count()
            
            # Get active sessions
            active_sessions = jwt_manager.get_active_sessions(user_id)
            
            return {
                "user_id": user_id,
                "username": user.username,
                "subscription_tier": user.subscription_tier,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "api_keys_count": api_key_count,
                "active_sessions_count": len(active_sessions),
                "rate_limits": self.get_rate_limits(user),
                "permissions": self.get_user_permissions(user)
            }
    
    def _get_default_role_for_tier(self, session, tier: str) -> Optional[Role]:
        """Get default role for subscription tier"""
        role_mapping = {
            SubscriptionTier.BASIC.value: "user",
            SubscriptionTier.PROFESSIONAL.value: "analyst",
            SubscriptionTier.ENTERPRISE.value: "analyst"
        }
        
        role_name = role_mapping.get(tier)
        if role_name:
            return session.query(Role).filter_by(name=role_name).first()
        
        return None
    
    def _create_user_profile(self, session, user: User):
        """Create initial user profile"""
        profile = UserProfile(
            user_id=user.id,
            preferences={
                "theme": "light",
                "notifications": True,
                "dashboard_layout": "default"
            },
            settings={
                "timezone": "UTC",
                "date_format": "YYYY-MM-DD",
                "currency": "USD"
            }
        )
        session.add(profile)
        session.commit()


# Global user manager instance
user_manager = UserManager()
