/**
 * Adaptive Quick Actions Routes
 * RESTful endpoints for personalized admin shortcuts
 */

import { Router } from 'express';
import {
  getPersonalizedQuickActions,
  trackAdminNavigation,
  getAdminNavigationAnalytics
} from '../controllers/adaptiveQuickActionsController';

const router = Router();

/**
 * Get personalized quick actions for admin user
 * GET /api/admin/quick-actions/personalized?timeRange=7d|30d
 */
router.get('/personalized', getPersonalizedQuickActions);

/**
 * Track admin navigation for learning patterns
 * POST /api/admin/quick-actions/track-navigation
 * Body: { pagePath, timeOnPage?, organizationId }
 */
router.post('/track-navigation', trackAdminNavigation);

/**
 * Get admin navigation analytics
 * GET /api/admin/quick-actions/analytics?timeRange=7d|30d
 */
router.get('/analytics', getAdminNavigationAnalytics);

export default router;