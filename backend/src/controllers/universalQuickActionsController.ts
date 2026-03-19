/**
 * Universal Quick Actions Controller
 * API endpoints for adaptive quick actions for all authenticated users
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { universalQuickActionsService } from '../services/universalQuickActionsService';
import { authenticateToken } from '../middleware/enhancedAuth';

// Validation schemas
const TrackNavigationSchema = z.object({
  pagePath: z.string().min(1),
  timeOnPage: z.number().optional(),
  organizationId: z.string().uuid()
});

/**
 * Get adaptive quick actions for authenticated user
 * GET /api/dashboard/quick-actions?timeRange=7d|30d
 */
export const getAdaptiveQuickActions = [
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const timeRange = (req.query.timeRange as '7d' | '30d') || '30d';

      if (!user || !user.organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const quickActions = await universalQuickActionsService.getAdaptiveQuickActions(
        user.id,
        user.organizationId,
        user.role,
        timeRange
      );

      res.json({
        success: true,
        data: {
          quickActions,
          metadata: {
            userId: user.id,
            userRole: user.role,
            timeRange,
            generatedAt: new Date().toISOString(),
            isPersonalized: quickActions.some(action => action.frequency > 0)
          }
        }
      });

    } catch (error) {
      console.error('❌ Error getting adaptive quick actions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get adaptive quick actions'
      });
    }
  }
];

/**
 * Track user navigation for quick actions learning
 * POST /api/dashboard/track-navigation
 */
export const trackNavigation = [
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const validation = TrackNavigationSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors
        });
      }

      const { pagePath, timeOnPage, organizationId } = validation.data;

      // Verify organization ID matches user's organization
      if (organizationId !== user.organizationId) {
        return res.status(403).json({
          success: false,
          error: 'Organization ID mismatch'
        });
      }

      await universalQuickActionsService.trackNavigation(
        user.id,
        organizationId,
        pagePath,
        timeOnPage
      );

      res.json({
        success: true,
        message: 'Navigation tracked successfully'
      });

    } catch (error) {
      console.error('❌ Error tracking navigation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track navigation'
      });
    }
  }
];

/**
 * Get navigation analytics for user (optional endpoint)
 * GET /api/dashboard/navigation-analytics?timeRange=7d|30d
 */
export const getNavigationAnalytics = [
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const timeRange = (req.query.timeRange as '7d' | '30d') || '30d';

      if (!user || !user.organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // This could be implemented later for user insights
      res.json({
        success: true,
        data: {
          message: 'Navigation analytics coming soon',
          userId: user.id,
          timeRange
        }
      });

    } catch (error) {
      console.error('❌ Error getting navigation analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get navigation analytics'
      });
    }
  }
];