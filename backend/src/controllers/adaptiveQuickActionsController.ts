/**
 * Adaptive Quick Actions Controller
 * API endpoints for managing personalized admin quick actions
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { adaptiveQuickActionsService } from '../services/adaptiveQuickActionsService';
import { authenticateToken, requirePermission } from '../middleware/enhancedAuth';

// Validation schemas
const TrackNavigationSchema = z.object({
  pagePath: z.string().min(1),
  timeOnPage: z.number().optional(),
  organizationId: z.string().uuid()
});

/**
 * Get personalized quick actions for admin user
 * GET /api/admin/quick-actions/personalized?timeRange=7d|30d
 */
export const getPersonalizedQuickActions = [
  authenticateToken,
  requirePermission('admin.read'),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const timeRange = (req.query.timeRange as '7d' | '30d') || '30d';

      // Ensure user has admin privileges
      if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin privileges required for adaptive quick actions.'
        });
      }

      const quickActions = await adaptiveQuickActionsService.getPersonalizedQuickActions(
        user.id,
        user.organizationId,
        timeRange
      );

      res.json({
        success: true,
        data: {
          quickActions,
          metadata: {
            userId: user.id,
            timeRange,
            generatedAt: new Date().toISOString(),
            isPersonalized: quickActions.some(action => action.frequency > 0)
          }
        }
      });

    } catch (error) {
      console.error('❌ Error getting personalized quick actions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get personalized quick actions'
      });
    }
  }
];

/**
 * Track admin navigation for quick actions learning
 * POST /api/admin/quick-actions/track-navigation
 */
export const trackAdminNavigation = [
  authenticateToken,
  requirePermission('admin.read'),
  async (req: Request, res: Response) => {
    try {
      const validatedData = TrackNavigationSchema.parse(req.body);
      const user = (req as any).user;

      // Ensure user has admin privileges
      if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin privileges required.'
        });
      }

      await adaptiveQuickActionsService.trackAdminNavigation(
        user.id,
        validatedData.organizationId,
        validatedData.pagePath,
        validatedData.timeOnPage
      );

      res.json({
        success: true,
        message: 'Navigation tracked successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error tracking admin navigation:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to track navigation'
      });
    }
  }
];

/**
 * Get admin navigation analytics
 * GET /api/admin/quick-actions/analytics?timeRange=7d|30d
 */
export const getAdminNavigationAnalytics = [
  authenticateToken,
  requirePermission('admin.read'),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const timeRange = (req.query.timeRange as '7d' | '30d') || '30d';

      // Ensure user has admin privileges
      if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin privileges required.'
        });
      }

      // Get navigation patterns (reuse service method)
      const patterns = await (adaptiveQuickActionsService as any).analyzeUserNavigationPatterns(
        user.id,
        user.organizationId,
        timeRange
      );

      res.json({
        success: true,
        data: {
          patterns,
          summary: {
            totalSessions: patterns.reduce((sum, p) => sum + p.visits, 0),
            uniqueSections: patterns.length,
            mostVisitedSection: patterns[0]?.section || 'N/A',
            avgTimePerPage: patterns.reduce((sum, p) => sum + p.avgTimeOnPage, 0) / patterns.length || 0
          },
          metadata: {
            userId: user.id,
            timeRange,
            generatedAt: new Date().toISOString()
          }
        }
      });

    } catch (error) {
      console.error('❌ Error getting admin navigation analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get navigation analytics'
      });
    }
  }
];