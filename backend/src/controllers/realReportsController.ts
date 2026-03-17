/**
 * Real Reports Controller - API endpoints for report management
 * Replaces "NOT IMPLEMENTED" placeholders with functional reports
 */

import { Request, Response } from 'express';
import { realReportsService } from '../services/realReportsService';
import { z } from 'zod';

// Validation schemas
const generateReportSchema = z.object({
  templateId: z.string(),
  filters: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    campaignId: z.string().optional(),
    agentId: z.string().optional()
  }).optional()
});

const createScheduledReportSchema = z.object({
  name: z.string().min(1, 'Report name is required'),
  templateId: z.string(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  recipients: z.array(z.string().email()),
  filters: z.object({}).optional(),
  enabled: z.boolean().optional()
});

/**
 * Real Reports Controller with database-driven functionality
 */
export class RealReportsController {

  /**
   * Get dashboard analytics
   */
  async getDashboardAnalytics(req: Request, res: Response) {
    try {
      console.log('📊 Fetching dashboard analytics');

      const organizationId = '1'; // Default org ID for single-tenant system
      const widgets = await realReportsService.getDashboardAnalytics(organizationId);

      res.json({
        success: true,
        data: widgets,
        generatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error in getDashboardAnalytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate dashboard analytics'
      });
    }
  }

  /**
   * Get available report templates
   */
  async getReportTemplates(req: Request, res: Response) {
    try {
      console.log('📋 Fetching report templates');

      const templates = await realReportsService.getReportTemplates();

      res.json({
        success: true,
        data: templates
      });

    } catch (error) {
      console.error('❌ Error in getReportTemplates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch report templates'
      });
    }
  }

  /**
   * Generate report using template
   */
  async generateReport(req: Request, res: Response) {
    try {
      console.log('🔄 Generating report');

      const validation = generateReportSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validation.error.issues
        });
      }

      const { templateId, filters = {} } = validation.data;
      const report = await realReportsService.generateReport(templateId, filters);

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('❌ Error in generateReport:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate report'
      });
    }
  }

  /**
   * Get scheduled reports
   */
  async getScheduledReports(req: Request, res: Response) {
    try {
      console.log('📅 Fetching scheduled reports');

      const reports = await realReportsService.getScheduledReports();

      res.json({
        success: true,
        data: reports
      });

    } catch (error) {
      console.error('❌ Error in getScheduledReports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch scheduled reports'
      });
    }
  }

  /**
   * Create scheduled report
   */
  async createScheduledReport(req: Request, res: Response) {
    try {
      console.log('➕ Creating scheduled report');

      const validation = createScheduledReportSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validation.error.issues
        });
      }

      const reportData = {
        ...validation.data,
        enabled: validation.data.enabled ?? true,
        filters: validation.data.filters || {}
      };

      const scheduledReport = await realReportsService.createScheduledReport(reportData);

      res.status(201).json({
        success: true,
        data: scheduledReport
      });

    } catch (error) {
      console.error('❌ Error in createScheduledReport:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create scheduled report'
      });
    }
  }

  /**
   * Export report
   */
  async exportReport(req: Request, res: Response) {
    try {
      console.log('📤 Exporting report');

      const { reportId } = req.params;
      const { format = 'pdf' } = req.query as { format?: 'pdf' | 'excel' | 'csv' };

      if (!reportId) {
        return res.status(400).json({
          success: false,
          error: 'Report ID is required'
        });
      }

      if (!['pdf', 'excel', 'csv'].includes(format)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid export format'
        });
      }

      const exportData = await realReportsService.exportReport(reportId, format);

      // Set appropriate headers for file download
      const filename = `report_${reportId}.${format}`;
      const contentTypes = {
        pdf: 'application/pdf',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv'
      };

      res.setHeader('Content-Type', contentTypes[format]);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);

    } catch (error) {
      console.error('❌ Error in exportReport:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export report'
      });
    }
  }

  /**
   * Get report builder configuration
   */
  async getReportBuilderConfig(req: Request, res: Response) {
    try {
      console.log('🔧 Fetching report builder configuration');

      // Available data sources and fields for report builder
      const config = {
        dataSources: [
          {
            id: 'calls',
            name: 'Call Data',
            fields: [
              { id: 'callDate', name: 'Call Date', type: 'date' },
              { id: 'disposition', name: 'Disposition', type: 'string' },
              { id: 'outcome', name: 'Outcome', type: 'string' },
              { id: 'duration', name: 'Duration', type: 'number' },
              { id: 'agentName', name: 'Agent', type: 'string' },
              { id: 'campaignId', name: 'Campaign', type: 'string' }
            ]
          },
          {
            id: 'agents',
            name: 'Agent Performance',
            fields: [
              { id: 'agentName', name: 'Agent Name', type: 'string' },
              { id: 'totalCalls', name: 'Total Calls', type: 'number' },
              { id: 'conversions', name: 'Conversions', type: 'number' },
              { id: 'conversionRate', name: 'Conversion Rate', type: 'number' },
              { id: 'talkTime', name: 'Talk Time', type: 'number' }
            ]
          },
          {
            id: 'campaigns',
            name: 'Campaign Analytics',
            fields: [
              { id: 'campaignName', name: 'Campaign Name', type: 'string' },
              { id: 'startDate', name: 'Start Date', type: 'date' },
              { id: 'status', name: 'Status', type: 'string' },
              { id: 'totalCalls', name: 'Total Calls', type: 'number' },
              { id: 'conversions', name: 'Conversions', type: 'number' }
            ]
          }
        ],
        chartTypes: [
          { id: 'bar', name: 'Bar Chart', icon: '📊' },
          { id: 'line', name: 'Line Chart', icon: '📈' },
          { id: 'pie', name: 'Pie Chart', icon: '🥧' },
          { id: 'table', name: 'Data Table', icon: '📋' }
        ],
        filters: [
          { id: 'dateRange', name: 'Date Range', type: 'daterange' },
          { id: 'campaign', name: 'Campaign', type: 'select' },
          { id: 'agent', name: 'Agent', type: 'select' },
          { id: 'outcome', name: 'Outcome', type: 'multiselect' }
        ]
      };

      res.json({
        success: true,
        data: config
      });

    } catch (error) {
      console.error('❌ Error in getReportBuilderConfig:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch report builder configuration'
      });
    }
  }
}

export const realReportsController = new RealReportsController();