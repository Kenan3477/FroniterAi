import express from 'express';
import { Request, Response } from 'express';
import { healthCheckHandler, healthSummaryHandler } from '../middleware/healthCheck';
import { getErrorStatsHandler, getRecentErrorsHandler } from '../utils/logging';
import { MetricsCollector } from '../utils/metrics';
import { createSimpleMonitoringDashboard } from '../utils/monitoringIntegration';
import * as flowMonitoringController from '../controllers/flowMonitoring';

const router = express.Router();

/**
 * Monitoring Dashboard HTML
 * GET /monitoring/dashboard.html
 */
router.get('/dashboard.html', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(createSimpleMonitoringDashboard());
});

/**
 * Health check endpoint
 * GET /monitoring/health
 */
router.get('/health', healthCheckHandler);

/**
 * Health summary endpoint
 * GET /monitoring/health/summary
 */
router.get('/health/summary', healthSummaryHandler);

/**
 * Error statistics endpoint
 * GET /monitoring/errors/stats
 */
router.get('/errors/stats', getErrorStatsHandler);

/**
 * Recent errors endpoint
 * GET /monitoring/errors/recent
 */
router.get('/errors/recent', getRecentErrorsHandler);

/**
 * Metrics summary endpoint
 * GET /monitoring/metrics/summary
 */
router.get('/metrics/summary', async (req: Request, res: Response) => {
  try {
    const metricsCollector = MetricsCollector.getInstance();
    const timeRange = parseInt(req.query.minutes as string) || 60;
    
    const summary = metricsCollector.getMetricsSummary(timeRange);
    
    res.json({
      success: true,
      data: {
        timeRangeMinutes: timeRange,
        summary
      },
      message: 'Metrics summary retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve metrics summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * Slow endpoints analysis
 * GET /monitoring/performance/slow-endpoints
 */
router.get('/performance/slow-endpoints', async (req: Request, res: Response) => {
  try {
    const metricsCollector = MetricsCollector.getInstance();
    const limit = parseInt(req.query.limit as string) || 10;
    const timeRange = parseInt(req.query.minutes as string) || 60;
    
    const slowEndpoints = metricsCollector.getSlowEndpoints(limit, timeRange);
    
    res.json({
      success: true,
      data: {
        timeRangeMinutes: timeRange,
        limit,
        endpoints: slowEndpoints
      },
      message: 'Slow endpoints analysis retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve slow endpoints analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * Specific metric data endpoint
 * GET /monitoring/metrics/:metricName
 */
router.get('/metrics/:metricName', async (req: Request, res: Response) => {
  try {
    const metricsCollector = MetricsCollector.getInstance();
    const { metricName } = req.params;
    const since = req.query.since ? new Date(req.query.since as string) : new Date(Date.now() - 60 * 60 * 1000);
    const until = req.query.until ? new Date(req.query.until as string) : new Date();
    
    const rawMetrics = metricsCollector.getMetrics(metricName, since, until);
    const aggregated = metricsCollector.getAggregatedMetrics(metricName, since, until);
    
    res.json({
      success: true,
      data: {
        metricName,
        timeRange: { since, until },
        aggregated,
        rawCount: rawMetrics.length,
        // Include raw data only for small datasets to avoid memory issues
        rawMetrics: rawMetrics.length <= 1000 ? rawMetrics : []
      },
      message: 'Metric data retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve metric data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * System overview endpoint
 * GET /monitoring/overview
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const metricsCollector = MetricsCollector.getInstance();
    
    // Get metrics for last hour
    const since = new Date(Date.now() - 60 * 60 * 1000);
    
    const overview = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      // Performance metrics
      performance: metricsCollector.getMetricsSummary(60),
      
      // Memory usage
      memory: process.memoryUsage(),
      
      // CPU usage (basic)
      cpuUsage: process.cpuUsage(),
      
      // Process info
      processInfo: {
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      }
    };
    
    res.json({
      success: true,
      data: overview,
      message: 'System overview retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve system overview',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * Monitoring dashboard data endpoint
 * GET /monitoring/dashboard
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const metricsCollector = MetricsCollector.getInstance();
    const timeRange = parseInt(req.query.minutes as string) || 60;
    
    const [
      performanceSummary,
      slowEndpoints,
      errorStats
    ] = await Promise.all([
      metricsCollector.getMetricsSummary(timeRange),
      metricsCollector.getSlowEndpoints(5, timeRange),
      // Error stats would come from ErrorTracker if we had that import here
      Promise.resolve({ totalErrors: 0, recentErrors: 0, topErrors: [], recentErrorTrend: 'stable' as const })
    ]);

    const dashboardData = {
      timestamp: new Date().toISOString(),
      timeRangeMinutes: timeRange,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      performance: performanceSummary,
      slowEndpoints,
      errors: errorStats,
      alerts: [] // TODO: Implement alerting system
    };
    
    res.json({
      success: true,
      data: dashboardData,
      message: 'Monitoring dashboard data retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * Real-time metrics endpoint (for websocket or SSE)
 * GET /monitoring/realtime
 */
router.get('/realtime', async (req: Request, res: Response) => {
  try {
    const metricsCollector = MetricsCollector.getInstance();
    
    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial data
    const initialData = metricsCollector.getMetricsSummary(5); // Last 5 minutes
    res.write(`data: ${JSON.stringify(initialData)}\n\n`);

    // Send updates every 10 seconds
    const interval = setInterval(() => {
      try {
        const realtimeData = {
          timestamp: new Date().toISOString(),
          metrics: metricsCollector.getMetricsSummary(5),
          memory: process.memoryUsage(),
          uptime: process.uptime()
        };
        
        res.write(`data: ${JSON.stringify(realtimeData)}\n\n`);
      } catch (error) {
        console.error('Error sending realtime data:', error);
        clearInterval(interval);
        res.end();
      }
    }, 10000);

    // Clean up on disconnect
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to start realtime monitoring',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * Flow Monitoring Endpoints
 * Advanced flow monitoring, analytics, and performance tracking
 */

// Real-time flow monitoring endpoints
router.get('/flows/status', flowMonitoringController.getRealTimeStatus);
router.get('/flows/dashboard', flowMonitoringController.getMonitoringDashboard);
router.get('/flows/performance', flowMonitoringController.getPerformanceMetrics);

// Flow-specific monitoring endpoints
router.get('/flows/:flowId/metrics', flowMonitoringController.getFlowMetrics);
router.get('/flows/:flowId/errors', flowMonitoringController.getFlowErrors);

// Detailed debugging endpoints
router.get('/flows/executions/:runId/timeline', flowMonitoringController.getFlowExecutionTimeline);

// Data export endpoints
router.get('/flows/export', flowMonitoringController.exportMonitoringData);

export default router;