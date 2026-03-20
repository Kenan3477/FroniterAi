/**
 * Advanced Audit Controller - Organization-scoped user activity tracking and monitoring
 * Provides API endpoints for comprehensive audit functionality
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { advancedAuditService, ActivityTrackingData } from '../services/advancedAuditService';
import { requireOrganizationAccess, auditOrganizationAction } from '../middleware/organizationSecurity';
import { authenticateToken, requirePermission } from '../middleware/enhancedAuth';
import { SuspiciousAlertStatus, AlertSeverity } from '@prisma/client';

// Validation schemas
const TrackActivitySchema = z.object({
  activityType: z.enum(['click', 'page_view', 'tab_switch', 'idle_start', 'idle_end', 'data_export', 'login', 'logout']),
  elementType: z.string().optional(),
  elementId: z.string().optional(),
  pagePath: z.string(),
  pageTitle: z.string().optional(),
  timeOnPage: z.number().optional(),
  clickData: z.object({
    x: z.number(),
    y: z.number(),
    elementText: z.string().optional(),
    elementClass: z.string().optional(),
  }).optional(),
  metadata: z.record(z.any()).optional()
});

const AuditFiltersSchema = z.object({
  userId: z.string().optional(),
  activityType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  pagePath: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  reviewStatus: z.enum(['PENDING', 'UNDER_REVIEW', 'FALSE_POSITIVE', 'CONFIRMED_THREAT', 'RESOLVED']).optional(),
  limit: z.number().min(1).max(500).default(50),
  offset: z.number().min(0).default(0)
});

const UpdateAlertReviewSchema = z.object({
  reviewStatus: z.enum(['PENDING', 'UNDER_REVIEW', 'FALSE_POSITIVE', 'CONFIRMED_THREAT', 'RESOLVED']),
  reviewNotes: z.string().optional()
});

/**
 * Track user activity
 * POST /api/admin/audit/track-activity
 */
export const trackUserActivity = [
  authenticateToken,
  requirePermission('audit.create'),
  async (req: Request, res: Response) => {
    try {
      const validatedData = TrackActivitySchema.parse(req.body);
      const user = (req as any).user;

      // Get organization ID from user context or request
      const organizationId = user.organizationId || req.body.organizationId;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'Organization ID is required for activity tracking'
        });
      }

      const activityData: ActivityTrackingData = {
        userId: user.id,
        organizationId,
        sessionId: (req as any).sessionID || req.headers['x-session-id'] as string || 'unknown',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        activityType: validatedData.activityType || 'page_view',
        pagePath: validatedData.pagePath || req.path,
        ...(validatedData.pageTitle && { pageTitle: validatedData.pageTitle }),
        ...(validatedData.timeOnPage && { timeOnPage: validatedData.timeOnPage }),
        ...(validatedData.elementType && { elementType: validatedData.elementType }),
        ...(validatedData.elementId && { elementId: validatedData.elementId }),
        ...(validatedData.clickData?.x !== undefined && validatedData.clickData?.y !== undefined && {
          clickData: {
            x: validatedData.clickData.x,
            y: validatedData.clickData.y,
            ...(validatedData.clickData.elementText && { elementText: validatedData.clickData.elementText }),
            ...(validatedData.clickData.elementClass && { elementClass: validatedData.clickData.elementClass })
          }
        }),
        ...(validatedData.metadata && { metadata: validatedData.metadata })
      };

      await advancedAuditService.trackUserActivity(activityData);

      res.json({
        success: true,
        message: 'Activity tracked successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error tracking user activity:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to track user activity'
      });
    }
  }
];

/**
 * Get organization activity logs
 * GET /api/admin/audit/:organizationId/activity-logs
 */
export const getOrganizationActivityLogs = [
  authenticateToken,
  requirePermission('audit.read'),
  requireOrganizationAccess(false),
  auditOrganizationAction('audit.activity_logs.view'),
  async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.params;
      const queryFilters = AuditFiltersSchema.parse(req.query);

      const filters = {
        organizationId,
        ...queryFilters,
        startDate: queryFilters.startDate ? new Date(queryFilters.startDate) : undefined,
        endDate: queryFilters.endDate ? new Date(queryFilters.endDate) : undefined
      };

      const result = await advancedAuditService.getOrganizationActivityLogs(filters);

      res.json({
        success: true,
        data: result,
        pagination: {
          limit: queryFilters.limit,
          offset: queryFilters.offset,
          total: result.total,
          hasMore: result.total > (queryFilters.offset + queryFilters.limit)
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error getting organization activity logs:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get organization activity logs'
      });
    }
  }
];

/**
 * Get suspicious activity alerts
 * GET /api/admin/audit/:organizationId/suspicious-alerts
 */
export const getSuspiciousActivityAlerts = [
  authenticateToken,
  requirePermission('audit.read'),
  requireOrganizationAccess(false),
  auditOrganizationAction('audit.suspicious_alerts.view'),
  async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.params;
      const queryFilters = AuditFiltersSchema.parse(req.query);

      const filters = {
        organizationId,
        ...queryFilters,
        startDate: queryFilters.startDate ? new Date(queryFilters.startDate) : undefined,
        endDate: queryFilters.endDate ? new Date(queryFilters.endDate) : undefined
      };

      const result = await advancedAuditService.getSuspiciousActivityAlerts(filters);

      res.json({
        success: true,
        data: result,
        pagination: {
          limit: queryFilters.limit,
          offset: queryFilters.offset,
          total: result.total,
          hasMore: result.total > (queryFilters.offset + queryFilters.limit)
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error getting suspicious activity alerts:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get suspicious activity alerts'
      });
    }
  }
];

/**
 * Update alert review status
 * PUT /api/admin/audit/:organizationId/suspicious-alerts/:alertId/review
 */
export const updateAlertReviewStatus = [
  authenticateToken,
  requirePermission('audit.admin'),
  requireOrganizationAccess(true),
  auditOrganizationAction('audit.alert.review'),
  async (req: Request, res: Response) => {
    try {
      const { organizationId, alertId } = req.params;
      const validatedData = UpdateAlertReviewSchema.parse(req.body);
      const user = (req as any).user;

      await advancedAuditService.updateAlertReviewStatus(
        alertId,
        validatedData.reviewStatus as SuspiciousAlertStatus,
        user.id,
        validatedData.reviewNotes
      );

      res.json({
        success: true,
        message: 'Alert review status updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error updating alert review status:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update alert review status'
      });
    }
  }
];

/**
 * Get user behavior analytics for organization
 * GET /api/admin/audit/:organizationId/analytics/user-behavior
 */
export const getUserBehaviorAnalytics = [
  authenticateToken,
  requirePermission('analytics.read'),
  requireOrganizationAccess(false),
  auditOrganizationAction('audit.analytics.user_behavior.view'),
  async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.params;
      const timeRange = req.query.timeRange as '24h' | '7d' | '30d' || '7d';

      // Validate time range
      if (!['24h', '7d', '30d'].includes(timeRange)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid time range. Must be 24h, 7d, or 30d'
        });
      }

      const result = await advancedAuditService.getUserBehaviorAnalytics(organizationId, timeRange);

      res.json({
        success: true,
        data: result,
        metadata: {
          organizationId,
          timeRange,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error getting user behavior analytics:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get user behavior analytics'
      });
    }
  }
];

/**
 * Export audit logs
 * GET /api/admin/audit/:organizationId/export
 */
export const exportAuditLogs = [
  authenticateToken,
  requirePermission('audit.export'),
  requireOrganizationAccess(false),
  auditOrganizationAction('audit.export'),
  async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.params;
      const format = req.query.format as 'csv' | 'json' || 'csv';
      const queryFilters = AuditFiltersSchema.parse(req.query);

      const filters = {
        organizationId,
        ...queryFilters,
        limit: 10000, // Export limit
        offset: 0,
        startDate: queryFilters.startDate ? new Date(queryFilters.startDate) : undefined,
        endDate: queryFilters.endDate ? new Date(queryFilters.endDate) : undefined
      };

      const result = await advancedAuditService.getOrganizationActivityLogs(filters);

      if (format === 'csv') {
        // Generate CSV export
        const csvHeader = 'Timestamp,User,Email,Role,Activity Type,Page Path,Element Type,Element ID,Time on Page,IP Address\n';
        const csvRows = result.logs.map(log => {
          const metadata = log.metadata || {};
          return [
            log.timestamp.toISOString(),
            log.user.name,
            log.user.email,
            log.user.role,
            log.activityType,
            log.pagePath,
            log.elementType || '',
            log.elementId || '',
            log.timeOnPage || '',
            metadata.ipAddress || ''
          ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
        }).join('\n');

        const csvContent = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${organizationId}-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);

      } else {
        // JSON export
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${organizationId}-${new Date().toISOString().split('T')[0]}.json"`);
        res.json({
          exportMetadata: {
            organizationId,
            exportedAt: new Date().toISOString(),
            totalRecords: result.total,
            exportedRecords: result.logs.length,
            filters: queryFilters
          },
          auditLogs: result.logs,
          summary: result.summary
        });
      }

    } catch (error) {
      console.error('❌ Error exporting audit logs:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to export audit logs'
      });
    }
  }
];