/**
 * KPI Routes - Real database-driven analytics endpoints
 * Replaces mock KPI endpoints with actual database queries
 */

import { Router } from 'express';
import * as kpiController from '../controllers/kpiController';
import { authenticateToken, requirePermission } from '../middleware/enhancedAuth';

const router = Router();

// Apply enhanced authentication
router.use(authenticateToken);

// KPI endpoints require analytics permission
/**
 * GET /api/kpi/summary
 * Get comprehensive KPI summary for date range
 * Query params: startDate, endDate, campaignId?, agentId?
 */
router.get('/summary', requirePermission('analytics.read'), kpiController.getKPISummary);

/**
 * GET /api/kpi/hourly
 * Get hourly performance breakdown
 * Query params: startDate, endDate, campaignId?, agentId?
 */
router.get('/hourly', requirePermission('analytics.read'), kpiController.getHourlyPerformance);

/**
 * GET /api/kpi/outcomes
 * Get call outcome distribution
 * Query params: startDate, endDate, campaignId?, agentId?
 */
router.get('/outcomes', requirePermission('analytics.read'), kpiController.getOutcomeDistribution);

/**
 * GET /api/kpi/agents
 * Get agent performance rankings
 * Query params: startDate, endDate, campaignId?
 */
router.get('/agents', requirePermission('performance.read'), kpiController.getAgentPerformance);

/**
 * GET /api/kpi/campaign/:campaignId
 * Get campaign-specific metrics
 * Query params: days? (default: 7)
 */
router.get('/campaign/:campaignId', requirePermission('campaign.read'), kpiController.getCampaignMetrics);

/**
 * GET /api/kpi/dashboard
 * Get dashboard overview with key metrics and trends
 */
router.get('/dashboard', requirePermission('analytics.read'), kpiController.getDashboardOverview);

/**
 * POST /api/kpi/record
 * Record a new call KPI entry
 * Body: KPI data object
 */
router.post('/record', requirePermission('calls.create'), kpiController.recordCallKPI);

export default router;