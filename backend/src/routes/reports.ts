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

export default router;