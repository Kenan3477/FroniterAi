/**
 * Adaptive Quick Actions Routes
 * RESTful endpoints for personalized admin shortcuts and AI-powered workflow intelligence
 */

import { Router } from 'express';
import {
  getPersonalizedQuickActions,
  trackAdminNavigation,
  getAdminNavigationAnalytics
} from '../controllers/adaptiveQuickActionsController';

import {
  getPredictiveActions,
  getTeamLearningSuggestions,
  getIntegrationShortcuts,
  getWorkflowTemplates,
  processVoiceCommand,
  getMobileOptimizedActions
} from '../controllers/advancedAdaptiveController';

const router = Router();

/**
 * Basic Adaptive Quick Actions
 */

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

/**
 * Advanced AI-Powered Features
 */

/**
 * Get AI-powered predictive actions
 * GET /api/admin/quick-actions/predictive?currentPage=&timeOfDay=&recentActions=&activeProjects=
 */
router.get('/predictive', getPredictiveActions);

/**
 * Get team learning suggestions
 * GET /api/admin/quick-actions/team-learning
 */
router.get('/team-learning', getTeamLearningSuggestions);

/**
 * Get integration shortcuts
 * GET /api/admin/quick-actions/integrations
 */
router.get('/integrations', getIntegrationShortcuts);

/**
 * Get workflow templates
 * GET /api/admin/quick-actions/templates
 */
router.get('/templates', getWorkflowTemplates);

/**
 * Process voice command
 * POST /api/admin/quick-actions/voice-command
 * Body: { command, context?, organizationId }
 */
router.post('/voice-command', processVoiceCommand);

/**
 * Get mobile-optimized quick actions
 * GET /api/admin/quick-actions/mobile
 */
router.get('/mobile', getMobileOptimizedActions);

export default router;