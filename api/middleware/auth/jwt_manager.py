"""
JWT Token Management System

Handles JWT token creation, validation, and management with support for
access tokens, refresh tokens, and token revocation.
"""

import jwt
import uuid
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import redis
import json
import secrets

from api.config import settings
from api.database.models.user_models import User


class TokenType(Enum):
    """Token types"""
    ACCESS = "access"
    REFRESH = "refresh"
    API_KEY = "api_key"


@dataclass
class TokenClaims:
    """JWT token claims structure"""
    user_id: int
    username: str
    email: str
    subscription_tier: str
    roles: List[str]
    permissions: List[str]
    session_id: str
    token_type: TokenType
    issued_at: datetime
    expires_at: datetime


class JWTManager:
    """JWT token management class"""
    
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 60  # 1 hour
        self.refresh_token_expire_days = 30    # 30 days
        self.api_key_expire_days = 365         # 1 year
        
        # Redis for token blacklist and session management
        try:
            self.redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD,
                db=1,  # Use db 1 for auth tokens
                decode_responses=True
            )
        except Exception:
            self.redis_client = None
    
    def create_access_token(self, user: User, session_id: str = None) -> str:
        """Create an access token for a user"""
        if session_id is None:
            session_id = str(uuid.uuid4())
        
        now = datetime.utcnow()
        expires_at = now + timedelta(minutes=self.access_token_expire_minutes)
        
        # Get user roles and permissions
        roles = [role.name for role in user.roles] if user.roles else []
        permissions = []
        for role in user.roles:
            if role.permissions:
                permissions.extend([perm.name for perm in role.permissions])
        
        claims = {
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "subscription_tier": user.subscription_tier,
            "roles": roles,
            "permissions": list(set(permissions)),  # Remove duplicates
            "session_id": session_id,
            "token_type": TokenType.ACCESS.value,
            "iat": now.timestamp(),
            "exp": expires_at.timestamp(),
            "jti": str(uuid.uuid4())  # JWT ID for revocation
        }
        
        token = jwt.encode(claims, self.secret_key, algorithm=self.algorithm)
        
        # Store session info in Redis if available
        if self.redis_client:
            self._store_session_info(session_id, user.id, expires_at)
        
        return token
    
    def create_refresh_token(self, user: User, session_id: str) -> str:
        """Create a refresh token for a user"""
        now = datetime.utcnow()
        expires_at = now + timedelta(days=self.refresh_token_expire_days)
        
        claims = {
            "user_id": user.id,
            "username": user.username,
            "session_id": session_id,
            "token_type": TokenType.REFRESH.value,
            "iat": now.timestamp(),
            "exp": expires_at.timestamp(),
            "jti": str(uuid.uuid4())
        }
        
        token = jwt.encode(claims, self.secret_key, algorithm=self.algorithm)
        
        # Store refresh token in Redis
        if self.redis_client:
            self.redis_client.setex(
                f"refresh_token:{session_id}",
                int(timedelta(days=self.refresh_token_expire_days).total_seconds()),
                token
            )
        
        return token
    
    def create_api_key(self, user: User, name: str, permissions: List[str] = None) -> Dict[str, Any]:
        """Create an API key for enterprise users"""
        if user.subscription_tier not in ["enterprise", "professional"]:
            raise ValueError("API keys are only available for Professional and Enterprise subscribers")
        
        api_key = secrets.token_urlsafe(32)
        key_id = str(uuid.uuid4())
        now = datetime.utcnow()
        expires_at = now + timedelta(days=self.api_key_expire_days)
        
        # Hash the API key for storage
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        claims = {
            "key_id": key_id,
            "user_id": user.id,
            "username": user.username,
            "subscription_tier": user.subscription_tier,
            "permissions": permissions or [],
            "token_type": TokenType.API_KEY.value,
            "iat": now.timestamp(),
            "exp": expires_at.timestamp()
        }
        
        # Store API key info in Redis
        if self.redis_client:
            self.redis_client.setex(
                f"api_key:{key_hash}",
                int(timedelta(days=self.api_key_expire_days).total_seconds()),
                json.dumps(claims)
            )
        
        return {
            "api_key": api_key,
            "key_id": key_id,
            "name": name,
            "permissions": permissions or [],
            "expires_at": expires_at.isoformat(),
            "created_at": now.isoformat()
        }
    
    def validate_token(self, token: str) -> Optional[TokenClaims]:
        """Validate and decode a JWT token"""
        try:
            # Decode token
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check if token is blacklisted
            if self._is_token_blacklisted(payload.get("jti")):
                return None
            
            # Check session validity for access tokens
            if payload.get("token_type") == TokenType.ACCESS.value:
                session_id = payload.get("session_id")
                if session_id and not self._is_session_valid(session_id):
                    return None
            
            # Create TokenClaims object
            return TokenClaims(
                user_id=payload["user_id"],
                username=payload["username"],
                email=payload.get("email", ""),
                subscription_tier=payload.get("subscription_tier", "basic"),
                roles=payload.get("roles", []),
                permissions=payload.get("permissions", []),
                session_id=payload.get("session_id", ""),
                token_type=TokenType(payload.get("token_type", "access")),
                issued_at=datetime.fromtimestamp(payload["iat"]),
                expires_at=datetime.fromtimestamp(payload["exp"])
            )
            
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
        except Exception:
            return None
    
    def validate_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """Validate an API key"""
        try:
            key_hash = hashlib.sha256(api_key.encode()).hexdigest()
            
            if not self.redis_client:
                return None
            
            # Get API key info from Redis
            key_info = self.redis_client.get(f"api_key:{key_hash}")
            if not key_info:
                return None
            
            claims = json.loads(key_info)
            
            # Check expiration
            if datetime.fromtimestamp(claims["exp"]) < datetime.utcnow():
                self.redis_client.delete(f"api_key:{key_hash}")
                return None
            
            return claims
            
        except Exception:
            return None
    
    def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, str]]:
        """Refresh an access token using a refresh token"""
        try:
            # Validate refresh token
            payload = jwt.decode(refresh_token, self.secret_key, algorithms=[self.algorithm])
            
            if payload.get("token_type") != TokenType.REFRESH.value:
                return None
            
            session_id = payload.get("session_id")
            user_id = payload.get("user_id")
            
            # Check if refresh token exists in Redis
            if self.redis_client:
                stored_token = self.redis_client.get(f"refresh_token:{session_id}")
                if not stored_token or stored_token != refresh_token:
                    return None
            
            # Get user from database (you'll need to implement this)
            # For now, create a mock user object
            from api.database.models.user_models import User
            user = User.query.get(user_id)  # This would be your actual user lookup
            
            if not user:
                return None
            
            # Create new access token
            new_access_token = self.create_access_token(user, session_id)
            
            return {
                "access_token": new_access_token,
                "token_type": "bearer"
            }
            
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
        except Exception:
            return None
    
    def revoke_token(self, token: str) -> bool:
        """Revoke a token by adding it to blacklist"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            jti = payload.get("jti")
            exp = payload.get("exp")
            
            if jti and self.redis_client:
                # Add to blacklist until expiration
                ttl = int(exp - datetime.utcnow().timestamp())
                if ttl > 0:
                    self.redis_client.setex(f"blacklist:{jti}", ttl, "revoked")
                return True
            
        except Exception:
            pass
        
        return False
    
    def revoke_session(self, session_id: str) -> bool:
        """Revoke all tokens for a session"""
        if not self.redis_client:
            return False
        
        try:
            # Remove session info
            self.redis_client.delete(f"session:{session_id}")
            self.redis_client.delete(f"refresh_token:{session_id}")
            return True
        except Exception:
            return False
    
    def revoke_all_user_sessions(self, user_id: int) -> bool:
        """Revoke all sessions for a user"""
        if not self.redis_client:
            return False
        
        try:
            # Get all sessions for user
            pattern = f"session:*"
            for key in self.redis_client.scan_iter(match=pattern):
                session_info = self.redis_client.get(key)
                if session_info:
                    info = json.loads(session_info)
                    if info.get("user_id") == user_id:
                        session_id = key.split(":")[-1]
                        self.revoke_session(session_id)
            
            return True
        except Exception:
            return False
    
    def _store_session_info(self, session_id: str, user_id: int, expires_at: datetime):
        """Store session information in Redis"""
        if not self.redis_client:
            return
        
        session_info = {
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": expires_at.isoformat(),
            "last_activity": datetime.utcnow().isoformat()
        }
        
        ttl = int((expires_at - datetime.utcnow()).total_seconds())
        self.redis_client.setex(
            f"session:{session_id}",
            ttl,
            json.dumps(session_info)
        )
    
    def _is_session_valid(self, session_id: str) -> bool:
        """Check if a session is valid"""
        if not self.redis_client:
            return True  # Fallback to token expiration
        
        try:
            session_info = self.redis_client.get(f"session:{session_id}")
            if not session_info:
                return False
            
            info = json.loads(session_info)
            expires_at = datetime.fromisoformat(info["expires_at"])
            
            if expires_at < datetime.utcnow():
                self.redis_client.delete(f"session:{session_id}")
                return False
            
            # Update last activity
            info["last_activity"] = datetime.utcnow().isoformat()
            ttl = int((expires_at - datetime.utcnow()).total_seconds())
            self.redis_client.setex(
                f"session:{session_id}",
                ttl,
                json.dumps(info)
            )
            
            return True
            
        except Exception:
            return False
    
    def _is_token_blacklisted(self, jti: str) -> bool:
        """Check if a token is blacklisted"""
        if not jti or not self.redis_client:
            return False
        
        try:
            return self.redis_client.exists(f"blacklist:{jti}") > 0
        except Exception:
            return False
    
    def get_active_sessions(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all active sessions for a user"""
        if not self.redis_client:
            return []
        
        sessions = []
        try:
            pattern = f"session:*"
            for key in self.redis_client.scan_iter(match=pattern):
                session_info = self.redis_client.get(key)
                if session_info:
                    info = json.loads(session_info)
                    if info.get("user_id") == user_id:
                        session_id = key.split(":")[-1]
                        sessions.append({
                            "session_id": session_id,
                            "created_at": info["created_at"],
                            "last_activity": info["last_activity"],
                            "expires_at": info["expires_at"]
                        })
        except Exception:
            pass
        
        return sessions
    
    def cleanup_expired_tokens(self):
        """Clean up expired tokens and sessions (run periodically)"""
        if not self.redis_client:
            return
        
        try:
            # Redis automatically handles TTL expiration, but we can do additional cleanup
            # Clean up any orphaned keys
            current_time = datetime.utcnow()
            
            # Clean up expired sessions
            for key in self.redis_client.scan_iter(match="session:*"):
                session_info = self.redis_client.get(key)
                if session_info:
                    info = json.loads(session_info)
                    expires_at = datetime.fromisoformat(info["expires_at"])
                    if expires_at < current_time:
                        self.redis_client.delete(key)
            
        except Exception as e:
            print(f"Token cleanup error: {e}")


# Global JWT manager instance
jwt_manager = JWTManager()
