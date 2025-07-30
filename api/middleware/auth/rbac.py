"""
Role-Based Access Control (RBAC) System

Comprehensive RBAC implementation with hierarchical roles, permissions,
and fine-grained access control.
"""

from typing import Dict, Any, Optional, List, Set
from enum import Enum
from dataclasses import dataclass
from sqlalchemy.orm import sessionmaker
from functools import wraps
from fastapi import HTTPException, status

from api.database.config import DatabaseManager
from api.database.models.user_models import User, Role, Permission


class PermissionAction(Enum):
    """Standard permission actions"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    EXECUTE = "execute"
    ADMIN = "admin"


class ResourceType(Enum):
    """System resource types"""
    FINANCIAL_ANALYSIS = "financial_analysis"
    STRATEGIC_PLANNING = "strategic_planning"
    COMPLIANCE = "compliance"
    RISK_ASSESSMENT = "risk_assessment"
    USERS = "users"
    ROLES = "roles"
    PERMISSIONS = "permissions"
    API_KEYS = "api_keys"
    SYSTEM = "system"
    REPORTS = "reports"
    ANALYTICS = "analytics"


@dataclass
class PermissionCheck:
    """Permission check result"""
    granted: bool
    reason: str
    required_permission: str
    user_permissions: List[str]


class RBACManager:
    """Role-Based Access Control Manager"""
    
    def __init__(self):
        self.db_manager = DatabaseManager()
        self.SessionLocal = sessionmaker(bind=self.db_manager.engines['primary'])
        
        # Permission hierarchy - higher level permissions include lower ones
        self.permission_hierarchy = {
            PermissionAction.ADMIN.value: [
                PermissionAction.DELETE.value,
                PermissionAction.UPDATE.value,
                PermissionAction.CREATE.value,
                PermissionAction.READ.value,
                PermissionAction.EXECUTE.value
            ],
            PermissionAction.DELETE.value: [
                PermissionAction.UPDATE.value,
                PermissionAction.CREATE.value,
                PermissionAction.READ.value
            ],
            PermissionAction.UPDATE.value: [
                PermissionAction.CREATE.value,
                PermissionAction.READ.value
            ],
            PermissionAction.CREATE.value: [
                PermissionAction.READ.value
            ],
            PermissionAction.EXECUTE.value: [
                PermissionAction.READ.value
            ]
        }
        
        # Role hierarchy - higher roles inherit permissions from lower ones
        self.role_hierarchy = {
            "admin": ["analyst", "user", "viewer"],
            "analyst": ["user", "viewer"],
            "user": ["viewer"],
            "viewer": []
        }
    
    def create_role(self, name: str, display_name: str, description: str,
                    permissions: List[str] = None, is_system_role: bool = False) -> Role:
        """Create a new role"""
        with self.SessionLocal() as session:
            # Check if role already exists
            existing_role = session.query(Role).filter_by(name=name).first()
            if existing_role:
                raise ValueError(f"Role '{name}' already exists")
            
            # Create role
            role = Role(
                name=name,
                display_name=display_name,
                description=description,
                is_system_role=is_system_role,
                is_active=True
            )
            
            # Add permissions
            if permissions:
                for perm_name in permissions:
                    permission = session.query(Permission).filter_by(name=perm_name).first()
                    if permission:
                        role.permissions.append(permission)
            
            session.add(role)
            session.commit()
            session.refresh(role)
            
            return role
    
    def create_permission(self, name: str, display_name: str, description: str,
                         resource: str, action: str, is_system_permission: bool = False) -> Permission:
        """Create a new permission"""
        with self.SessionLocal() as session:
            # Check if permission already exists
            existing_perm = session.query(Permission).filter_by(name=name).first()
            if existing_perm:
                raise ValueError(f"Permission '{name}' already exists")
            
            # Create permission
            permission = Permission(
                name=name,
                display_name=display_name,
                description=description,
                resource=resource,
                action=action,
                is_system_permission=is_system_permission,
                is_active=True
            )
            
            session.add(permission)
            session.commit()
            session.refresh(permission)
            
            return permission
    
    def assign_role_to_user(self, user_id: int, role_name: str) -> bool:
        """Assign a role to a user"""
        with self.SessionLocal() as session:
            user = session.query(User).get(user_id)
            role = session.query(Role).filter_by(name=role_name).first()
            
            if not user or not role:
                return False
            
            if role not in user.roles:
                user.roles.append(role)
                session.commit()
            
            return True
    
    def remove_role_from_user(self, user_id: int, role_name: str) -> bool:
        """Remove a role from a user"""
        with self.SessionLocal() as session:
            user = session.query(User).get(user_id)
            role = session.query(Role).filter_by(name=role_name).first()
            
            if not user or not role:
                return False
            
            if role in user.roles:
                user.roles.remove(role)
                session.commit()
            
            return True
    
    def assign_permission_to_role(self, role_name: str, permission_name: str) -> bool:
        """Assign a permission to a role"""
        with self.SessionLocal() as session:
            role = session.query(Role).filter_by(name=role_name).first()
            permission = session.query(Permission).filter_by(name=permission_name).first()
            
            if not role or not permission:
                return False
            
            if permission not in role.permissions:
                role.permissions.append(permission)
                session.commit()
            
            return True
    
    def remove_permission_from_role(self, role_name: str, permission_name: str) -> bool:
        """Remove a permission from a role"""
        with self.SessionLocal() as session:
            role = session.query(Role).filter_by(name=role_name).first()
            permission = session.query(Permission).filter_by(name=permission_name).first()
            
            if not role or not permission:
                return False
            
            if permission in role.permissions:
                role.permissions.remove(permission)
                session.commit()
            
            return True
    
    def check_permission(self, user: User, resource: str, action: str) -> PermissionCheck:
        """Check if user has permission for resource/action"""
        required_permission = f"{resource}_{action}"
        user_permissions = self.get_user_permissions(user)
        
        # Direct permission check
        if required_permission in user_permissions:
            return PermissionCheck(
                granted=True,
                reason="Direct permission granted",
                required_permission=required_permission,
                user_permissions=user_permissions
            )
        
        # Check permission hierarchy
        for user_perm in user_permissions:
            if self._permission_includes(user_perm, required_permission):
                return PermissionCheck(
                    granted=True,
                    reason="Permission granted through hierarchy",
                    required_permission=required_permission,
                    user_permissions=user_permissions
                )
        
        # Check subscription tier features
        if hasattr(user, 'subscription_tier'):
            from api.middleware.auth.user_manager import user_manager
            tier_limits = user_manager.tier_limits.get(user.subscription_tier, {})
            tier_features = tier_limits.get("features", [])
            
            if resource in tier_features:
                return PermissionCheck(
                    granted=True,
                    reason="Permission granted through subscription tier",
                    required_permission=required_permission,
                    user_permissions=user_permissions
                )
        
        return PermissionCheck(
            granted=False,
            reason="Permission denied",
            required_permission=required_permission,
            user_permissions=user_permissions
        )
    
    def get_user_permissions(self, user: User) -> List[str]:
        """Get all permissions for a user including inherited ones"""
        permissions = set()
        
        # Get permissions from direct roles
        for role in user.roles:
            for permission in role.permissions:
                permissions.add(permission.name)
            
            # Get permissions from inherited roles
            inherited_roles = self.role_hierarchy.get(role.name, [])
            with self.SessionLocal() as session:
                for inherited_role_name in inherited_roles:
                    inherited_role = session.query(Role).filter_by(name=inherited_role_name).first()
                    if inherited_role:
                        for permission in inherited_role.permissions:
                            permissions.add(permission.name)
        
        return list(permissions)
    
    def get_user_roles(self, user: User) -> List[str]:
        """Get all roles for a user including inherited ones"""
        roles = set()
        
        # Get direct roles
        for role in user.roles:
            roles.add(role.name)
            
            # Get inherited roles
            inherited_roles = self.role_hierarchy.get(role.name, [])
            roles.update(inherited_roles)
        
        return list(roles)
    
    def has_role(self, user: User, role_name: str) -> bool:
        """Check if user has a specific role (including inherited)"""
        user_roles = self.get_user_roles(user)
        return role_name in user_roles
    
    def has_any_role(self, user: User, role_names: List[str]) -> bool:
        """Check if user has any of the specified roles"""
        user_roles = self.get_user_roles(user)
        return any(role in user_roles for role in role_names)
    
    def has_all_roles(self, user: User, role_names: List[str]) -> bool:
        """Check if user has all of the specified roles"""
        user_roles = self.get_user_roles(user)
        return all(role in user_roles for role in role_names)
    
    def get_accessible_resources(self, user: User) -> Dict[str, List[str]]:
        """Get all resources and actions accessible to user"""
        permissions = self.get_user_permissions(user)
        resources = {}
        
        for permission in permissions:
            # Parse permission name (format: resource_action)
            parts = permission.split('_')
            if len(parts) >= 2:
                resource = '_'.join(parts[:-1])
                action = parts[-1]
                
                if resource not in resources:
                    resources[resource] = []
                
                if action not in resources[resource]:
                    resources[resource].append(action)
        
        return resources
    
    def create_system_roles_and_permissions(self):
        """Create default system roles and permissions"""
        with self.SessionLocal() as session:
            # Create system permissions
            system_permissions = [
                # Financial Analysis
                ("financial_analysis_read", "Read Financial Analysis", "View financial analysis results", "financial_analysis", "read"),
                ("financial_analysis_execute", "Execute Financial Analysis", "Run financial analysis", "financial_analysis", "execute"),
                
                # Strategic Planning
                ("strategic_planning_read", "Read Strategic Planning", "View strategic planning results", "strategic_planning", "read"),
                ("strategic_planning_execute", "Execute Strategic Planning", "Run strategic planning", "strategic_planning", "execute"),
                
                # Compliance
                ("compliance_read", "Read Compliance", "View compliance data", "compliance", "read"),
                ("compliance_write", "Write Compliance", "Manage compliance data", "compliance", "update"),
                
                # Risk Assessment
                ("risk_assessment_read", "Read Risk Assessment", "View risk assessments", "risk_assessment", "read"),
                ("risk_assessment_execute", "Execute Risk Assessment", "Run risk assessments", "risk_assessment", "execute"),
                
                # User Management
                ("users_read", "Read Users", "View user information", "users", "read"),
                ("users_write", "Write Users", "Manage users", "users", "update"),
                ("users_admin", "Admin Users", "Full user administration", "users", "admin"),
                
                # System Administration
                ("system_admin", "System Administration", "Full system administration", "system", "admin"),
                ("system_config", "System Configuration", "Configure system settings", "system", "update"),
                
                # Reports and Analytics
                ("reports_read", "Read Reports", "View reports", "reports", "read"),
                ("reports_create", "Create Reports", "Create custom reports", "reports", "create"),
                ("analytics_read", "Read Analytics", "View analytics", "analytics", "read"),
                ("analytics_execute", "Execute Analytics", "Run analytics", "analytics", "execute"),
            ]
            
            created_permissions = []
            for name, display_name, description, resource, action in system_permissions:
                existing = session.query(Permission).filter_by(name=name).first()
                if not existing:
                    permission = Permission(
                        name=name,
                        display_name=display_name,
                        description=description,
                        resource=resource,
                        action=action,
                        is_system_permission=True,
                        is_active=True
                    )
                    session.add(permission)
                    created_permissions.append(name)
            
            session.commit()
            
            # Create system roles
            system_roles = [
                ("viewer", "Viewer", "Read-only access to basic features", [
                    "financial_analysis_read", "strategic_planning_read", "reports_read"
                ]),
                ("user", "Standard User", "Standard user with basic analysis capabilities", [
                    "financial_analysis_read", "financial_analysis_execute",
                    "strategic_planning_read", "reports_read"
                ]),
                ("analyst", "Business Analyst", "Advanced analysis capabilities", [
                    "financial_analysis_read", "financial_analysis_execute",
                    "strategic_planning_read", "strategic_planning_execute",
                    "risk_assessment_read", "risk_assessment_execute",
                    "compliance_read", "reports_read", "reports_create",
                    "analytics_read", "analytics_execute"
                ]),
                ("admin", "Administrator", "Full system administration", [
                    "system_admin", "system_config", "users_admin",
                    "financial_analysis_read", "financial_analysis_execute",
                    "strategic_planning_read", "strategic_planning_execute",
                    "risk_assessment_read", "risk_assessment_execute",
                    "compliance_read", "compliance_write",
                    "reports_read", "reports_create",
                    "analytics_read", "analytics_execute"
                ])
            ]
            
            for role_name, display_name, description, permission_names in system_roles:
                existing_role = session.query(Role).filter_by(name=role_name).first()
                if not existing_role:
                    role = Role(
                        name=role_name,
                        display_name=display_name,
                        description=description,
                        is_system_role=True,
                        is_active=True
                    )
                    
                    # Add permissions to role
                    for perm_name in permission_names:
                        permission = session.query(Permission).filter_by(name=perm_name).first()
                        if permission:
                            role.permissions.append(permission)
                    
                    session.add(role)
            
            session.commit()
    
    def _permission_includes(self, user_permission: str, required_permission: str) -> bool:
        """Check if user permission includes required permission through hierarchy"""
        # Parse permissions
        user_parts = user_permission.split('_')
        required_parts = required_permission.split('_')
        
        if len(user_parts) < 2 or len(required_parts) < 2:
            return False
        
        # Check if same resource
        user_resource = '_'.join(user_parts[:-1])
        required_resource = '_'.join(required_parts[:-1])
        
        if user_resource != required_resource:
            return False
        
        # Check action hierarchy
        user_action = user_parts[-1]
        required_action = required_parts[-1]
        
        included_actions = self.permission_hierarchy.get(user_action, [])
        return required_action in included_actions
    
    def get_role_permissions_matrix(self) -> Dict[str, Dict[str, List[str]]]:
        """Get a matrix of roles and their permissions"""
        with self.SessionLocal() as session:
            roles = session.query(Role).filter_by(is_active=True).all()
            matrix = {}
            
            for role in roles:
                permissions_by_resource = {}
                
                for permission in role.permissions:
                    resource = permission.resource
                    if resource not in permissions_by_resource:
                        permissions_by_resource[resource] = []
                    permissions_by_resource[resource].append(permission.action)
                
                matrix[role.name] = permissions_by_resource
            
            return matrix


# Permission decorators for FastAPI routes
def require_permission(resource: str, action: str):
    """Decorator to require specific permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # This would be used with FastAPI dependency injection
            # The actual implementation would get the current user from the request
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            rbac_manager = RBACManager()
            permission_check = rbac_manager.check_permission(current_user, resource, action)
            
            if not permission_check.granted:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {permission_check.reason}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_role(role_name: str):
    """Decorator to require specific role"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            rbac_manager = RBACManager()
            if not rbac_manager.has_role(current_user, role_name):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role '{role_name}' required"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_subscription_tier(tier: str):
    """Decorator to require minimum subscription tier"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            from api.middleware.auth.user_manager import user_manager
            if not user_manager.check_subscription_tier(current_user, tier):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Subscription tier '{tier}' or higher required"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Global RBAC manager instance
rbac_manager = RBACManager()
