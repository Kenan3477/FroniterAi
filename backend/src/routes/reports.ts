/**
 * Reports Routes - RESTful endpoints for report management
 * Replaces "NOT IMPLEMENTED" placeholders with functional reports API
 */

import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/enhancedAuth';
import { realReportsController } from '../controllers/realReportsController';

const router = Router();

// Apply enhanced authentication to all routes
router.use(authenticateToken);

/**
 * Dashboard Analytics - Requires reports.read permission
 * GET /api/reports/dashboard
 */
router.get('/dashboard', requirePermission('reports.read'), realReportsController.getDashboardAnalytics.bind(realReportsController));

/**
 * Report Templates - Requires reports.read permission
 * GET /api/reports/templates
 */
router.get('/templates', requirePermission('reports.read'), realReportsController.getReportTemplates.bind(realReportsController));

/**
 * Generate Report - Requires reports.create permission
 * POST /api/reports/generate
 * Body: { templateId: string, filters?: object }
 */
router.post('/generate', requirePermission('reports.create'), realReportsController.generateReport.bind(realReportsController));

/**
 * Scheduled Reports - Admin only
 * GET /api/reports/scheduled
 * POST /api/reports/scheduled
 */
router.get('/scheduled', requirePermission('reports.admin'), realReportsController.getScheduledReports.bind(realReportsController));
router.post('/scheduled', requirePermission('reports.admin'), realReportsController.createScheduledReport.bind(realReportsController));

/**
 * Export Report - Requires reports.export permission
 * GET /api/reports/:reportId/export?format=pdf|excel|csv
 */
router.get('/:reportId/export', requirePermission('reports.export'), realReportsController.exportReport.bind(realReportsController));

/**
 * Report Builder Configuration - Requires reports.read permission
 * GET /api/reports/builder/config
 */
router.get('/builder/config', requirePermission('reports.read'), realReportsController.getReportBuilderConfig.bind(realReportsController));

// Legacy users report endpoint (preserved for compatibility)
router.get('/users', (req, res) => {
  try {
    console.log('📊 Users report request received');
    
    // Return basic users report structure
    res.json({
      success: true,
      data: {
        users: [
          {
            id: '1',
            name: 'Demo User',
            email: 'demo@omnivox.ai',
            role: 'agent',
            status: 'active',
            lastLogin: new Date().toISOString(),
            callsToday: 0,
            totalCalls: 0
          },
          {
            id: '2',
            name: 'Admin User',
            email: 'admin@omnivox.ai',
            role: 'admin',
            status: 'active',
            lastLogin: new Date().toISOString(),
            callsToday: 0,
            totalCalls: 0
          }
        ],
        summary: {
          totalUsers: 2,
          activeUsers: 2,
          inactiveUsers: 0,
          agents: 1,
          admins: 1
        }
      }
    });
  } catch (error) {
    console.error('Users report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users report'
    });
  }
});

/**
 * Overview Dashboard Endpoints
 * GET /api/reports/overview/kpis
 * GET /api/reports/overview/call-volume
 * GET /api/reports/overview/connection-rate
 * GET /api/reports/overview/agent-leaderboard
 * GET /api/reports/overview/recent-outcomes
 */

// Import the overview dashboard service
import { overviewDashboardService } from '../services/overviewDashboardService';

/**
 * Get overview KPIs
 * GET /api/reports/overview/kpis?filter=last_7d&start=2026-01-01&end=2026-01-31
 */
router.get('/overview/kpis', requirePermission('reports.read'), async (req, res) => {
  try {
    const { filter = 'last_7d', start, end, campaignId } = req.query;
    
    const customStart = start ? new Date(start as string) : undefined;
    const customEnd = end ? new Date(end as string) : undefined;
    
    const kpis = await overviewDashboardService.getOverviewKPIs(
      filter as any, 
      customStart, 
      customEnd,
      campaignId as string
    );

    res.json({
      success: true,
      data: kpis,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching overview KPIs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overview KPIs'
    });
  }
});

/**
 * Get call volume over time
 * GET /api/reports/overview/call-volume?filter=last_24h
 */
router.get('/overview/call-volume', requirePermission('reports.read'), async (req, res) => {
  try {
    const { filter = 'last_7d', start, end, campaignId } = req.query;
    
    const customStart = start ? new Date(start as string) : undefined;
    const customEnd = end ? new Date(end as string) : undefined;
    
    const data = await overviewDashboardService.getCallVolumeData(
      filter as any, 
      customStart, 
      customEnd,
      campaignId as string
    );

    res.json({
      success: true,
      data,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching call volume data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call volume data'
    });
  }
});

/**
 * Get connection rate trend
 * GET /api/reports/overview/connection-rate?filter=today
 */
router.get('/overview/connection-rate', requirePermission('reports.read'), async (req, res) => {
  try {
    const { filter = 'last_7d', start, end } = req.query;
    
    const customStart = start ? new Date(start as string) : undefined;
    const customEnd = end ? new Date(end as string) : undefined;
    
    const data = await overviewDashboardService.getConnectionRateData(
      filter as any, 
      customStart, 
      customEnd
    );

    res.json({
      success: true,
      data,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching connection rate data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch connection rate data'
    });
  }
});

/**
 * Get agent performance leaderboard
 * GET /api/reports/overview/agent-leaderboard?filter=last_30d
 */
router.get('/overview/agent-leaderboard', requirePermission('reports.read'), async (req, res) => {
  try {
    const { filter = 'last_7d', start, end, campaignId } = req.query;
    
    const customStart = start ? new Date(start as string) : undefined;
    const customEnd = end ? new Date(end as string) : undefined;
    
    const data = await overviewDashboardService.getAgentLeaderboard(
      filter as any, 
      customStart, 
      customEnd,
      campaignId as string
    );

    res.json({
      success: true,
      data,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching agent leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent leaderboard'
    });
  }
});

/**
 * Get recent call outcomes (live feed)
 * GET /api/reports/overview/recent-outcomes?limit=30
 */
router.get('/overview/recent-outcomes', requirePermission('reports.read'), async (req, res) => {
  try {
    const { limit = '20' } = req.query;
    
    const data = await overviewDashboardService.getRecentCallOutcomes(
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching recent call outcomes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent call outcomes'
    });
  }
});

export default router;