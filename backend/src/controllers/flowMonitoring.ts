/**
 * Omnivox AI Flow Monitoring Controllers
 * API endpoints for real-time flow monitoring, analytics, and performance tracking
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { flowMonitoringService } from '../services/flowMonitoringService';

// Input validation schemas
const GetFlowMetricsSchema = z.object({
  timeRange: z.enum(['1h', '24h', '7d', '30d']).optional(),
  includeSteps: z.string().transform(val => val === 'true').optional()
});

const GetPerformanceMetricsSchema = z.object({
  flowIds: z.string().transform(val => val.split(',')).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  aggregation: z.enum(['hour', 'day', 'week']).optional()
});

const GetFlowErrorsSchema = z.object({
  limit: z.string().transform(val => parseInt(val)).optional()
});

/**
 * Get comprehensive metrics for a specific flow
 */
export const getFlowMetrics = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;
    const query = GetFlowMetricsSchema.parse(req.query);

    const result = await flowMonitoringService.getFlowMetrics({
      flowId,
      timeRange: query.timeRange || '24h',
      includeSteps: query.includeSteps || false
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting flow metrics:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get flow metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get real-time status for all flows
 */
export const getRealTimeStatus = async (req: Request, res: Response) => {
  try {
    const statuses = await flowMonitoringService.getRealTimeFlowStatus();

    res.json({
      success: true,
      data: {
        flows: statuses,
        summary: {
          totalFlows: statuses.length,
          activeFlows: statuses.filter(s => s.status === 'ACTIVE').length,
          flowsWithIssues: statuses.filter(s => s.alertLevel === 'HIGH' || s.alertLevel === 'CRITICAL').length,
          totalActiveRuns: statuses.reduce((sum, s) => sum + s.currentRuns, 0)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting real-time status:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get real-time status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get performance metrics across multiple flows
 */
export const getPerformanceMetrics = async (req: Request, res: Response) => {
  try {
    const query = GetPerformanceMetricsSchema.parse(req.query);

    const result = await flowMonitoringService.getPerformanceMetrics({
      flowIds: query.flowIds,
      startDate: query.startDate,
      endDate: query.endDate,
      aggregation: query.aggregation || 'hour'
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get flow execution errors and patterns
 */
export const getFlowErrors = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;
    const query = GetFlowErrorsSchema.parse(req.query);

    const result = await flowMonitoringService.getFlowErrors(
      flowId,
      query.limit
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting flow errors:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get flow errors',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get monitoring dashboard data (combined endpoint)
 */
export const getMonitoringDashboard = async (req: Request, res: Response) => {
  try {
    // Get real-time status for all flows
    const realTimeStatus = await flowMonitoringService.getRealTimeFlowStatus();

    // Get performance metrics for the last 24 hours
    const performanceMetrics = await flowMonitoringService.getPerformanceMetrics({
      aggregation: 'hour'
    });

    // Calculate system-wide alerts and issues
    const systemAlerts = {
      critical: realTimeStatus.filter(s => s.alertLevel === 'CRITICAL').length,
      high: realTimeStatus.filter(s => s.alertLevel === 'HIGH').length,
      medium: realTimeStatus.filter(s => s.alertLevel === 'MEDIUM').length,
      issues: realTimeStatus.flatMap(s => s.issues.map(issue => ({
        flowId: s.flowId,
        flowName: s.flowName,
        issue,
        alertLevel: s.alertLevel
      })))
    };

    // Calculate activity metrics
    const activityMetrics = {
      totalExecutions: performanceMetrics.overview.totalRuns,
      activeExecutions: realTimeStatus.reduce((sum, s) => sum + s.currentRuns, 0),
      successRate: performanceMetrics.overview.averageSuccessRate,
      avgExecutionTime: performanceMetrics.overview.averageExecutionTime
    };

    // Top performing and problematic flows
    const topPerformingFlows = performanceMetrics.flowMetrics
      .filter(f => f.totalRuns > 0)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    const problematicFlows = performanceMetrics.flowMetrics
      .filter(f => f.totalRuns > 0 && f.successRate < 90)
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        overview: {
          totalFlows: realTimeStatus.length,
          activeFlows: realTimeStatus.filter(s => s.status === 'ACTIVE').length,
          ...activityMetrics
        },
        realTimeStatus,
        performanceMetrics: performanceMetrics.performanceData,
        systemAlerts,
        topPerformingFlows,
        problematicFlows,
        trends: {
          executionTrend: performanceMetrics.performanceData.map(p => ({
            timestamp: p.timestamp,
            value: p.status === 'active' ? 1 : 0
          })),
          errorTrend: performanceMetrics.performanceData.map(p => ({
            timestamp: p.timestamp,
            value: p.errorCount
          })),
          performanceTrend: performanceMetrics.performanceData.map(p => ({
            timestamp: p.timestamp,
            value: p.executionTime
          }))
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting monitoring dashboard:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get monitoring dashboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get flow execution timeline (for detailed debugging)
 */
export const getFlowExecutionTimeline = async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;

    // This would require a more detailed implementation
    // For now, return a placeholder response
    res.json({
      success: true,
      data: {
        runId,
        timeline: [],
        message: 'Flow execution timeline feature coming soon'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting flow execution timeline:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get execution timeline',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Export flow monitoring data (CSV/JSON)
 */
export const exportMonitoringData = async (req: Request, res: Response) => {
  try {
    const { format = 'json', flowId, startDate, endDate } = req.query as any;

    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export format. Use json or csv.'
      });
    }

    // Get performance data
    const data = await flowMonitoringService.getPerformanceMetrics({
      flowIds: flowId ? [flowId] : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
      aggregation: 'hour'
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = 'Flow ID,Flow Name,Total Runs,Successful Runs,Failed Runs,Success Rate,Avg Execution Time\n';
      const csvRows = data.flowMetrics.map(f => 
        `${f.flowId},${f.flowName},${f.totalRuns},${f.successfulRuns},${f.failedRuns},${f.successRate.toFixed(2)},${f.averageExecutionTime.toFixed(2)}`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="flow-monitoring-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvHeaders + csvRows);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="flow-monitoring-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        exportDate: new Date().toISOString(),
        data
      });
    }
  } catch (error) {
    console.error('Error exporting monitoring data:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to export monitoring data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};