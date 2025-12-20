/**
 * Authentication and Authorization Middleware
 * Role-based access control for Omnivox-AI API
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: string;
        permissions: string[];
      };
    }
  }
}

// Role-based permissions
export const ROLE_PERMISSIONS = {
  ADMIN: [
    'user.create',
    'user.read',
    'user.update', 
    'user.delete',
    'campaign.create',
    'campaign.read',
    'campaign.update',
    'campaign.delete',
    'system.admin',
    'reports.admin',
    'settings.admin',
    'predictive.admin',
    'performance.admin'
  ],
  SUPERVISOR: [
    'user.read',
    'campaign.read',
    'campaign.update',
    'reports.read',
    'agent.manage',
    'predictive.read',
    'performance.read'
  ],
  AGENT: [
    'user.read.self',
    'campaign.read.assigned',
    'calls.make',
    'contacts.read',
    'contacts.update',
    'queue.read'
  ]
};

/**
 * Authentication middleware - verifies JWT token
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'NO_TOKEN'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    if (!decoded.userId || !decoded.username) {
      res.status(401).json({
        success: false,
        message: 'Invalid token format',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Get user from database to verify they still exist and are active
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.userId  // Remove parseInt since id is string in schema
      },
      select: {
        id: true,
        name: true,
        role: true,
        status: true
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    if (!user || user.status !== 'ACTIVE') {
      res.status(401).json({
        success: false,
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
      return;
    }

    // Get user permissions based on role
    const permissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];

    // Attach user info to request
    req.user = {
      userId: user.id.toString(),
      username: user.name,
      role: user.role,
      permissions
    };

    next();

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
}

/**
 * Authorization middleware factory - checks if user has required permissions
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    const hasPermission = req.user.permissions.includes(permission) || req.user.role === 'ADMIN';
    
    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permission}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permission,
        userRole: req.user.role,
        userPermissions: req.user.permissions
      });
      return;
    }

    next();
  };
}

/**
 * Role-based authorization middleware factory
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    const hasRole = allowedRoles.includes(req.user.role);
    
    if (!hasRole) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        code: 'INSUFFICIENT_ROLE',
        required: allowedRoles,
        userRole: req.user.role
      });
      return;
    }

    next();
  };
}

/**
 * Campaign access authorization - checks if user can access specific campaign
 */
export function requireCampaignAccess(campaignIdParam: string = 'campaignId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const campaignId = req.params[campaignIdParam] || req.body.campaignId;
      
      if (!campaignId) {
        res.status(400).json({
          success: false,
          message: 'Campaign ID required'
        });
        return;
      }

      // Admins have access to all campaigns
      if (req.user.role === 'ADMIN') {
        next();
        return;
      }

      // Check if user has access to this specific campaign
      const hasAccess = await checkCampaignAccess(req.user.userId, campaignId);
      
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied to this campaign',
          code: 'CAMPAIGN_ACCESS_DENIED',
          campaignId
        });
        return;
      }

      next();

    } catch (error) {
      console.error('Campaign access check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify campaign access'
      });
    }
  };
}

/**
 * Check if user has access to a specific campaign
 */
async function checkCampaignAccess(userId: string, campaignId: string): Promise<boolean> {
  try {
    // Get user role
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId, 10) }, // Convert string to number for User.id field
      select: { role: true }
    });

    if (!user) return false;

    // Admins have access to all campaigns
    if (user.role === 'ADMIN') return true;

    // TODO: Implement campaign-specific access control
    // This would require a CampaignUserAccess table
    // For now, allow supervisors and agents access to all campaigns
    // In production, this should be properly restricted
    
    return ['SUPERVISOR', 'AGENT'].includes(user.role);

  } catch (error) {
    console.error('Error checking campaign access:', error);
    return false;
  }
}

/**
 * Optional authentication - sets user if token is provided but doesn't require it
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    if (process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      
      if (decoded.userId && decoded.username) {
        const user = await prisma.user.findUnique({
          where: { 
            id: decoded.userId  // Use string id directly
          },
          select: {
            id: true,
            name: true,
            role: true,
            status: true
          }
        });

        if (user && user.status === 'ACTIVE') {
          const permissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
          
          req.user = {
            userId: user.id.toString(),
            username: user.name,
            role: user.role,
            permissions
          };
        }
      }
    }

    next();

  } catch (error) {
    // Token is invalid but that's okay for optional auth
    next();
  }
}

/**
 * Self-access authorization - allows users to access their own data
 */
export function requireSelfAccess(userIdParam: string = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const targetUserId = req.params[userIdParam];
    
    // Admins can access any user's data
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    // Users can only access their own data
    if (req.user.userId !== targetUserId) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own data',
        code: 'SELF_ACCESS_ONLY'
      });
      return;
    }

    next();
  };
}

/**
 * Combine multiple authorization checks
 */
export function requireAny(...checks: Array<(req: Request, res: Response, next: NextFunction) => void>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let lastError: any = null;

    for (const check of checks) {
      try {
        // Create a mock response to capture the result
        let passed = false;
        const mockRes = {
          status: () => ({ json: () => { /* noop */ } }),
          json: () => { /* noop */ }
        } as any;
        
        const mockNext = () => { passed = true; };
        
        check(req, mockRes, mockNext);
        
        if (passed) {
          next();
          return;
        }
      } catch (error) {
        lastError = error;
      }
    }

    // None of the checks passed
    res.status(403).json({
      success: false,
      message: 'Access denied',
      code: 'AUTHORIZATION_FAILED'
    });
  };
}