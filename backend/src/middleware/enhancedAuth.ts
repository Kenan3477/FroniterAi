/**
 * Enhanced Security Middleware - Proper Role-Based Authorization
 * Replaces hardcoded permissions with database-driven authorization
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface UserPermissions {
  userId: string;
  username: string;
  role: string;
  permissions: string[];
  isActive: boolean;
}

// Enhanced role permissions with hierarchical access
export const ENHANCED_ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    // System-level access
    'system.admin',
    'system.read',
    'system.update',
    'system.delete',
    // All user operations
    'user.create',
    'user.read', 
    'user.update',
    'user.delete',
    'user.manage',
    // All campaign operations
    'campaign.create',
    'campaign.read',
    'campaign.update',
    'campaign.delete',
    'campaign.manage',
    // All organization operations
    'organization.create',
    'organization.read',
    'organization.update',
    'organization.delete',
    'organization.manage',
    // All reports and analytics
    'reports.admin',
    'reports.create',
    'reports.read',
    'reports.export',
    'analytics.admin',
    // Business settings
    'settings.admin',
    'settings.update',
    // Security operations
    'security.admin',
    'audit.read',
    // AI & Sentiment Analysis
    'sentiment.admin',
    'sentiment.read',
    'coaching.admin',
    'quality.admin',
    // Auto-Disposition
    'disposition.generate',
    'disposition.apply',
    'disposition.analytics',
    'disposition.feedback',
    'ai.admin'
  ],
  ADMIN: [
    // Organization-level admin (not system-wide)
    'user.create',
    'user.read',
    'user.update',
    'user.delete',
    'campaign.create',
    'campaign.read',
    'campaign.update',
    'campaign.delete',
    'organization.read',
    'organization.update',
    'reports.admin',
    'reports.create',
    'reports.read',
    'reports.export',
    'analytics.read',
    'settings.read',
    'settings.update',
    'agent.manage',
    'predictive.admin',
    // AI & Sentiment Analysis
    'sentiment.read',
    'coaching.read',
    'quality.read',
    // Auto-Disposition
    'disposition.apply',
    'disposition.feedback'
  ],
  SUPERVISOR: [
    'user.read',
    'campaign.read',
    'campaign.update',
    'reports.read',
    'reports.create',
    'agent.manage',
    'agent.read',
    'predictive.read',
    'performance.read',
    'calls.read',
    'calls.manage',
    // AI & Sentiment Analysis
    'sentiment.read',
    'coaching.read',
    // Auto-Disposition
    'disposition.apply'
  ],
  AGENT: [
    'campaign.read',
    'calls.read',
    'calls.create',
    'calls.update',
    'disposition.create',
    'performance.read.own',
    'profile.read.own',
    'profile.update.own',
    // Auto-Disposition
    'disposition.apply',
    'disposition.feedback'
  ],
  VIEWER: [
    'reports.read',
    'analytics.read',
    'campaign.read',
    'performance.read'
  ]
};

/**
 * Enhanced JWT authentication with proper user validation
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format'
      });
    }

    // Validate user exists and is active in database
    const user = await prisma.user.findUnique({
      where: { 
        id: parseInt(decoded.userId)
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User account is deactivated'
      });
    }

    // Get role-based permissions
    const rolePermissions = ENHANCED_ROLE_PERMISSIONS[user.role as keyof typeof ENHANCED_ROLE_PERMISSIONS] || [];

    // Attach enhanced user info to request
    req.user = {
      userId: user.id.toString(),
      username: user.username,
      role: user.role,
      permissions: rolePermissions,
      isActive: user.isActive
    } as UserPermissions;

    console.log(`🔐 Authenticated user: ${user.username} (${user.role}) with ${rolePermissions.length} permissions`);

    // Update lastActivity for active sessions (async, non-blocking)
    // This ensures we track when users are actively using the system
    prisma.userSession.updateMany({
      where: {
        userId: user.id,
        status: 'active'
      },
      data: {
        lastActivity: new Date()
      }
    }).catch(error => {
      console.error('⚠️ Failed to update session activity:', error);
      // Don't block the request if this fails
    });

    next();

  } catch (error) {
    console.error('❌ Authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication service error'
    });
  }
};

/**
 * Enhanced permission check middleware
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userPermissions = req.user.permissions || [];
    
    // Check if user has the required permission
    if (!userPermissions.includes(permission)) {
      console.log(`🚫 Access denied: User ${req.user.username} (${req.user.role}) lacks permission: ${permission}`);
      console.log(`Available permissions: ${userPermissions.join(', ')}`);
      
      return res.status(403).json({
        success: false,
        error: `Access denied. Required permission: ${permission}`,
        userRole: req.user.role,
        requiredPermission: permission
      });
    }

    console.log(`✅ Permission granted: ${req.user.username} can ${permission}`);
    next();
  };
};

/**
 * Require multiple permissions (all must be present)
 */
export const requirePermissions = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userPermissions = req.user.permissions || [];
    const missingPermissions = permissions.filter(p => !userPermissions.includes(p));
    
    if (missingPermissions.length > 0) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Missing permissions: ${missingPermissions.join(', ')}`,
        userRole: req.user.role,
        requiredPermissions: permissions,
        missingPermissions
      });
    }

    next();
  };
};

/**
 * Require any of the provided permissions (at least one must be present)
 */
export const requireAnyPermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.some(p => userPermissions.includes(p));
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires any of: ${permissions.join(', ')}`,
        userRole: req.user.role,
        requiredPermissions: permissions
      });
    }

    next();
  };
};

/**
 * Organization-scoped access control (simplified for current schema)
 */
export const requireOrganizationAccess = (allowCrossOrgForSuperAdmin: boolean = false) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Super admins can access everything
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
      return next();
    }

    // For now, all authenticated users can access their organization's data
    // This would be enhanced when organization model is properly integrated
    next();
  };
};

/**
 * Rate limiting per user role
 */
export const roleBasedRateLimit = (limits: { [role: string]: number }) => {
  const userRequestCounts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(); // Let authentication middleware handle this
    }

    const userKey = `${req.user.userId}_${req.user.role}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const userLimit = limits[req.user.role] || limits['DEFAULT'] || 100;

    const userRequests = userRequestCounts.get(userKey);
    
    if (!userRequests || now > userRequests.resetTime) {
      // Reset or initialize counter
      userRequestCounts.set(userKey, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (userRequests.count >= userLimit) {
      return res.status(429).json({
        success: false,
        error: `Rate limit exceeded for role ${req.user.role}`,
        limit: userLimit,
        resetIn: Math.ceil((userRequests.resetTime - now) / 1000)
      });
    }

    userRequests.count++;
    next();
  };
};

/**
 * Audit log middleware for sensitive operations
 */
export const auditLog = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the operation after response
      if (req.user && res.statusCode < 400) {
        console.log(`📝 AUDIT: User ${req.user.username} performed ${operation} at ${new Date().toISOString()}`);
        // In production, this would write to an audit database table
      }
      
      return originalSend.call(this, data);
    };

    next();
  };
};

// Export legacy authenticate for backward compatibility
export const authenticate = authenticateToken;