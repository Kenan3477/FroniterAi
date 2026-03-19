/**
 * Universal Quick Actions Routes
 * API routes for adaptive dashboard quick actions for all authenticated users
 */

import { Router } from 'express';
import { 
  getAdaptiveQuickActions,
  trackNavigation,
  getNavigationAnalytics
} from '../controllers/universalQuickActionsController';

const router = Router();

/**
 * GET /api/dashboard/quick-actions
 * Get adaptive quick actions based on user's navigation patterns
 * @query timeRange - '7d' or '30d' (default: '30d')
 * @returns Array of adaptive quick actions
 */
router.get('/quick-actions', getAdaptiveQuickActions);

/**
 * POST /api/dashboard/track-navigation  
 * Track user navigation for learning patterns
 * @body { pagePath: string, timeOnPage?: number, organizationId: string }
 * @returns Success confirmation
 */
router.post('/track-navigation', trackNavigation);

/**
 * GET /api/dashboard/navigation-analytics
 * Get navigation analytics for user (future feature)
 * @query timeRange - '7d' or '30d' (default: '30d') 
 * @returns Navigation analytics data
 */
router.get('/navigation-analytics', getNavigationAnalytics);

export default router;