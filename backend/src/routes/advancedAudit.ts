/**
 * Advanced Audit Routes - Organization-scoped user activity tracking and monitoring
 * RESTful endpoints for comprehensive audit functionality
 */

import { Router } from 'express';
import {
  trackUserActivity,
  getOrganizationActivityLogs,
  getSuspiciousActivityAlerts,
  updateAlertReviewStatus,
  getUserBehaviorAnalytics,
  exportAuditLogs
} from '../controllers/advancedAuditController';

const router = Router();

/**
 * Activity Tracking Routes
 */

/**
 * Track user activity
 * POST /api/admin/audit/track-activity
 * Body: { activityType, pagePath, elementType?, clickData?, metadata? }
 */
router.post('/track-activity', trackUserActivity);

/**
 * Organization Activity Logs Routes
 */

/**
 * Get organization activity logs with filtering
 * GET /api/admin/audit/:organizationId/activity-logs?userId=&activityType=&startDate=&endDate=&limit=&offset=
 */
router.get('/:organizationId/activity-logs', getOrganizationActivityLogs);

/**
 * Export organization activity logs
 * GET /api/admin/audit/:organizationId/export?format=csv|json&userId=&activityType=&startDate=&endDate=
 */
router.get('/:organizationId/export', exportAuditLogs);

/**
 * Suspicious Activity Alert Routes
 */

/**
 * Get suspicious activity alerts for organization
 * GET /api/admin/audit/:organizationId/suspicious-alerts?severity=&reviewStatus=&limit=&offset=
 */
router.get('/:organizationId/suspicious-alerts', getSuspiciousActivityAlerts);

/**
 * Update suspicious activity alert review status
 * PUT /api/admin/audit/:organizationId/suspicious-alerts/:alertId/review
 * Body: { reviewStatus, reviewNotes? }
 */
router.put('/:organizationId/suspicious-alerts/:alertId/review', updateAlertReviewStatus);

/**
 * Analytics Routes
 */

/**
 * Get user behavior analytics for organization
 * GET /api/admin/audit/:organizationId/analytics/user-behavior?timeRange=24h|7d|30d
 */
router.get('/:organizationId/analytics/user-behavior', getUserBehaviorAnalytics);

export default router;