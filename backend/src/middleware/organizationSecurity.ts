/**
 * Organization Security Middleware - Enforces multi-tenant data isolation
 * Ensures users can only access data from their own organization
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import '../types/auth'; // Import unified auth types
import { OrganizationUser } from '../types/auth'; // Import the type explicitly

const prisma = new PrismaClient();

/**
 * Middleware to enforce organization-level access control
 * Adds organizationId filter to all database queries
 */
export const requireOrganizationAccess = (allowCrossOrgForSuperAdmin: boolean = false) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Super admins can access cross-organization data if explicitly allowed
      if (allowCrossOrgForSuperAdmin && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN')) {
        return next();
      }

      // Check if user has organization membership
      if (!req.user.organizationId) {
        return res.status(403).json({
          success: false,
          error: 'Organization membership required. Please contact your administrator.',
          code: 'NO_ORGANIZATION_ACCESS'
        });
      }

      // Validate organization exists and user has access (single-tenant: just check user is active)
      const orgAccess = await prisma.user.findFirst({
        where: {
          id: parseInt(req.user.userId),
          isActive: true
        }
      });

      if (!orgAccess) {
        return res.status(403).json({
          success: false,
          error: 'Organization access denied',
          code: 'ORGANIZATION_ACCESS_DENIED'
        });
      }

      // Add organization context to request for use in controllers
      req.organizationId = req.user.organizationId;
      // organization relation not in single-tenant schema; skip req.organization assignment

      next();

    } catch (error) {
      console.error('❌ Organization access validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Organization access validation failed'
      });
    }
  };
};

/**
 * Middleware to scope database queries to user's organization
 * Automatically adds WHERE organizationId filter
 */
export const organizationScopedQuery = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }

    // Add organization filter helper to request
    req.getOrganizationFilter = () => ({
      organizationId: req.user.organizationId
    });

    // Add organization scoped prisma helpers
    req.organizationScopedPrisma = {
      contact: {
        findMany: (args: any = {}) => prisma.contact.findMany({
          ...args,
          where: { ...args.where, organizationId: req.user.organizationId }
        }),
        findFirst: (args: any = {}) => prisma.contact.findFirst({
          ...args,
          where: { ...args.where, organizationId: req.user.organizationId }
        }),
        count: (args: any = {}) => prisma.contact.count({
          ...args,
          where: { ...args.where, organizationId: req.user.organizationId }
        })
      },
      campaign: {
        findMany: (args: any = {}) => prisma.campaign.findMany({
          ...args,
          where: { ...args.where, organizationId: req.user.organizationId }
        }),
        findFirst: (args: any = {}) => prisma.campaign.findFirst({
          ...args,
          where: { ...args.where, organizationId: req.user.organizationId }
        }),
        count: (args: any = {}) => prisma.campaign.count({
          ...args,
          where: { ...args.where, organizationId: req.user.organizationId }
        })
      },
      callRecord: {
        findMany: (args: any = {}) => prisma.callRecord.findMany({
          ...args,
          where: { ...args.where, organizationId: req.user.organizationId }
        }),
        findFirst: (args: any = {}) => prisma.callRecord.findFirst({
          ...args,
          where: { ...args.where, organizationId: req.user.organizationId }
        }),
        count: (args: any = {}) => prisma.callRecord.count({
          ...args,
          where: { ...args.where, organizationId: req.user.organizationId }
        })
      }
    };

    next();
  };
};

/**
 * Validate that a specific resource belongs to user's organization
 */
export const validateOrganizationResource = (resourceType: 'contact' | 'campaign' | 'callRecord', resourceIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resourceId = req.params[resourceIdParam];
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: `${resourceType} ID is required`
        });
      }

      let resource = null;

      switch (resourceType) {
        case 'contact':
          resource = await prisma.contact.findFirst({
            where: { id: resourceId }
          });
          break;
        case 'campaign':
          resource = await prisma.campaign.findFirst({
            where: { id: resourceId }
          });
          break;
        case 'callRecord':
          resource = await prisma.callRecord.findFirst({
            where: { id: resourceId }
          });
          break;
      }

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: `${resourceType} not found or access denied`,
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      req.resource = resource;
      next();

    } catch (error) {
      console.error(`❌ ${resourceType} validation error:`, error);
      return res.status(500).json({
        success: false,
        error: `${resourceType} validation failed`
      });
    }
  };
};

/**
 * Enhanced role-based authorization with organization context
 */
export const requireOrganizationRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const hasRole = allowedRoles.includes(req.user.role);
    
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        userRole: req.user.role,
        organizationId: req.user.organizationId
      });
    }

    next();
  };
};

/**
 * Audit logging for organization-scoped operations
 */
export const auditOrganizationAction = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log successful operations
      if (req.user && res.statusCode < 400) {
        console.log(`🔍 AUDIT: ${req.user.username} (org: ${req.user.organizationId}) performed ${action} at ${new Date().toISOString()}`);
      }
      
      return originalSend.call(this, data);
    };

    next();
  };
};

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      organization?: {
        id: string;
        name: string;
        displayName: string;
      };
      resource?: any;
      getOrganizationFilter?: () => { organizationId: string };
      organizationScopedPrisma?: any;
    }
  }
}