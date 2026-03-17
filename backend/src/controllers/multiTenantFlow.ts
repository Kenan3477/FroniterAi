/**
 * Omnivox AI Multi-Tenant Flow Management Controllers
 * API endpoints for organization-based flow management, sharing, and analytics
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { multiTenantFlowService } from '../services/multiTenantFlowService';

const prisma = new PrismaClient();

// Input validation schemas
const OrganizationParamsSchema = z.object({
  organizationId: z.string().min(1)
});

const GetOrganizationFlowsSchema = z.object({
  includeShared: z.string().transform(val => val === 'true').optional(),
  includeTemplates: z.string().transform(val => val === 'true').optional(),
  visibility: z.enum(['PRIVATE', 'ORG_PUBLIC', 'GLOBAL_PUBLIC']).optional(),
  category: z.string().optional(),
  status: z.string().optional()
});

const CreateTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  flowData: z.record(z.any()),
  isPublic: z.boolean().optional(),
  previewImage: z.string().url().optional()
});

const ShareFlowSchema = z.object({
  targetOrganizationId: z.string().min(1),
  accessType: z.enum(['VIEW_ONLY', 'COPY_ALLOWED', 'COLLABORATIVE']),
  permissions: z.array(z.string()).optional(),
  expiresAt: z.string().optional()
});

const GrantPermissionSchema = z.object({
  userId: z.number().int(),
  permissionType: z.enum(['VIEW', 'EDIT', 'EXECUTE', 'ADMIN']),
  expiresAt: z.string().optional()
});

const CreateFromTemplateSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  customizations: z.record(z.any()).optional()
});

/**
 * Get flows for an organization
 */
export const getOrganizationFlows = async (req: Request, res: Response) => {
  try {
    const params = OrganizationParamsSchema.parse(req.params);
    const query = GetOrganizationFlowsSchema.parse(req.query);

    // Get user ID from JWT token (simplified)
    const userId = (req as any).user?.id || 1;

    const result = await multiTenantFlowService.getOrganizationFlows({
      organizationId: params.organizationId,
      includeShared: query.includeShared || false,
      includeTemplates: query.includeTemplates || false,
      visibility: query.visibility,
      category: query.category,
      status: query.status
    }, userId);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting organization flows:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get organization flows',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Create a flow template
 */
export const createFlowTemplate = async (req: Request, res: Response) => {
  try {
    const params = OrganizationParamsSchema.parse(req.params);
    const body = CreateTemplateSchema.parse(req.body);

    // Get user ID from JWT token (simplified)
    const userId = (req as any).user?.id || 1;

    const result = await multiTenantFlowService.createFlowTemplate(
      {
        ...body,
        isPublic: body.isPublic ?? false
      },
      params.organizationId,
      userId
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Flow template created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating flow template:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create flow template',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Create flow from template
 */
export const createFlowFromTemplate = async (req: Request, res: Response) => {
  try {
    const params = OrganizationParamsSchema.parse(req.params);
    const body = CreateFromTemplateSchema.parse(req.body);

    // Get user ID from JWT token (simplified)
    const userId = (req as any).user?.id || 1;

    const result = await multiTenantFlowService.createFlowFromTemplate({
      ...body,
      organizationId: params.organizationId
    }, userId);

    res.status(201).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating flow from template:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create flow from template',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Share a flow with another organization
 */
export const shareFlow = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;
    const body = ShareFlowSchema.parse(req.body);

    // Get user ID from JWT token (simplified)
    const userId = (req as any).user?.id || 1;

    const result = await multiTenantFlowService.shareFlow({
      flowId,
      ...body
    }, userId);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sharing flow:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to share flow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Grant flow permission to user
 */
export const grantFlowPermission = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;
    const body = GrantPermissionSchema.parse(req.body);

    // Get user ID from JWT token (simplified)
    const userId = (req as any).user?.id || 1;

    const result = await multiTenantFlowService.grantFlowPermission({
      flowId,
      ...body
    }, userId);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error granting flow permission:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to grant flow permission',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get flow permissions
 */
export const getFlowPermissions = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;

    // Get user ID from JWT token (simplified)
    const userId = (req as any).user?.id || 1;

    const result = await multiTenantFlowService.getFlowPermissions(flowId, userId);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting flow permissions:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get flow permissions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Revoke flow permission
 */
export const revokeFlowPermission = async (req: Request, res: Response) => {
  try {
    const { permissionId } = req.params;

    // Get user ID from JWT token (simplified)
    const userId = (req as any).user?.id || 1;

    const result = await multiTenantFlowService.revokeFlowPermission(permissionId, userId);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error revoking flow permission:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to revoke flow permission',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get organization analytics
 */
export const getOrganizationAnalytics = async (req: Request, res: Response) => {
  try {
    const params = OrganizationParamsSchema.parse(req.params);
    const { period = 'WEEKLY', startDate, endDate } = req.query as any;

    // Get user ID from JWT token (simplified)
    const userId = (req as any).user?.id || 1;

    const result = await multiTenantFlowService.getOrganizationAnalytics(
      params.organizationId,
      period,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      userId
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting organization analytics:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get organization analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get shared flows for organization
 */
export const getSharedFlows = async (req: Request, res: Response) => {
  try {
    const params = OrganizationParamsSchema.parse(req.params);

    // Get user ID from JWT token (simplified)
    const userId = (req as any).user?.id || 1;

    const result = await multiTenantFlowService.getSharedFlows(params.organizationId, userId);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting shared flows:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get shared flows',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get multi-tenant dashboard overview
 */
export const getMultiTenantDashboard = async (req: Request, res: Response) => {
  try {
    // Get user ID from JWT token (simplified)
    const userId = (req as any).user?.id || 1;

    // Get user's organizations (simplified - for now just use one)
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        createdAt: true
      },
      take: 10
    });

    // Get summary data for each organization
    const organizationSummaries = await Promise.all(
      organizations.map(async (org) => {
        try {
          const flows = await multiTenantFlowService.getOrganizationFlows({
            organizationId: org.id,
            includeShared: false,
            includeTemplates: false
          }, userId);

          const analytics = await multiTenantFlowService.getOrganizationAnalytics(
            org.id,
            'WEEKLY',
            undefined,
            undefined,
            userId
          );

          return {
            organization: org,
            summary: flows.summary,
            recentAnalytics: analytics[0] || null
          };
        } catch (error) {
          return {
            organization: org,
            summary: {
              totalFlows: 0,
              activeFlows: 0,
              templatesCount: 0,
              sharedCount: 0
            },
            recentAnalytics: null,
            error: 'Failed to load data'
          };
        }
      })
    );

    // Calculate global statistics
    const globalStats = {
      totalOrganizations: organizations.length,
      totalFlows: organizationSummaries.reduce((sum, org) => sum + org.summary.totalFlows, 0),
      totalActiveFlows: organizationSummaries.reduce((sum, org) => sum + org.summary.activeFlows, 0),
      totalTemplates: organizationSummaries.reduce((sum, org) => sum + org.summary.templatesCount, 0),
      totalSharedFlows: organizationSummaries.reduce((sum, org) => sum + org.summary.sharedCount, 0)
    };

    res.json({
      success: true,
      data: {
        globalStats,
        organizations: organizationSummaries,
        recommendations: [
          'Consider creating flow templates for commonly used patterns',
          'Share high-performing flows across organizations',
          'Set up automated analytics reporting for better insights',
          'Implement flow governance policies for better control'
        ]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting multi-tenant dashboard:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get multi-tenant dashboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get available organizations for current user
 */
export const getUserOrganizations = async (req: Request, res: Response) => {
  try {
    // Get user ID from JWT token (simplified)
    const userId = (req as any).user?.id || 1;

    // For now, return all organizations since we don't have user-org membership implemented
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        website: true,
        industry: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: {
        organizations,
        userRole: 'ADMIN', // Placeholder until proper role system is implemented
        permissions: ['VIEW', 'EDIT', 'ADMIN'] // Placeholder
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting user organizations:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get user organizations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};