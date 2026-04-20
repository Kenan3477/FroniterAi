/**
 * Organization-aware authentication middleware
 * Ensures users can only access data from their organization
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import '../types/auth'; // Import unified auth types
import { OrganizationUser } from '../types/auth'; // Import the type explicitly

const prisma = new PrismaClient();

/**
 * Enhanced authentication middleware that includes organization context
 */
export const authenticateWithOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Fetch user with organization details
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId || decoded.id }
      // Note: organization relation not in single-tenant schema
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive user'
      });
    }

    // Create organization-aware user object
    req.user = {
      userId: user.id.toString(),
      username: user.username,
      role: user.role,
      permissions: [], // Will be populated by role-based middleware if needed
      id: user.id,
      organizationId: (user as any).organizationId,
      organization: (user as any).organization,
      isActive: user.isActive
    };

    next();

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

/**
 * Middleware that requires user to belong to an organization
 */
export const requireOrganization = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.organizationId) {
    return res.status(403).json({
      success: false,
      message: 'Organization membership required'
    });
  }
  next();
};

/**
 * Middleware that only allows super admins or users from specific organization
 */
export const requireOrganizationAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { organizationId } = req.params;
  
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Super admins can access any organization
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  // Users can only access their own organization
  if (req.user.organizationId !== organizationId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Organization mismatch'
    });
  }

  next();
};

/**
 * Middleware factory for role-based access within organization
 */
export const requireOrganizationRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Super admins bypass role checks
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Check if user has required role within their organization
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Requires one of roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Helper function to add organization filter to Prisma queries
 */
export const getOrganizationFilter = (user: OrganizationUser) => {
  // Super admins see all data
  if (user.role === 'SUPER_ADMIN') {
    return {};
  }

  // Regular users only see their organization's data
  if (!user.organizationId) {
    throw new Error('User must belong to an organization');
  }

  return {
    organizationId: user.organizationId
  };
};

/**
 * Helper function to validate organization access for specific resource
 */
export const validateOrganizationAccess = async (
  resourceOrganizationId: string,
  user: OrganizationUser
): Promise<boolean> => {
  // Super admins can access any resource
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  // Users can only access resources from their organization
  return user.organizationId === resourceOrganizationId;
};

/**
 * Extract token from request headers
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Also check for token in cookies for web requests
  const cookieToken = req.cookies?.token;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Organization-scoped data service base class
 */
export abstract class OrganizationScopedService {
  protected getOrgFilter(user: OrganizationUser) {
    return getOrganizationFilter(user);
  }

  protected async validateAccess(
    resourceOrganizationId: string,
    user: OrganizationUser
  ): Promise<void> {
    const hasAccess = await validateOrganizationAccess(resourceOrganizationId, user);
    if (!hasAccess) {
      throw new Error('Access denied: Organization mismatch');
    }
  }

  protected ensureOrganizationMembership(user: OrganizationUser): void {
    if (!user.organizationId && user.role !== 'SUPER_ADMIN') {
      throw new Error('User must belong to an organization');
    }
  }
}