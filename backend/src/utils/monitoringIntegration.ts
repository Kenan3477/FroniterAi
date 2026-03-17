/**
 * Monitoring Integration Setup
 * 
 * This file provides integration utilities to add monitoring to the existing Express application
 */

import express from 'express';
import { Express } from 'express';
import { logger, errorTrackingMiddleware, requestLoggingMiddleware, performanceMonitoringMiddleware } from '../utils/logging';
import { metricsMiddleware } from '../utils/metrics';
import { initializeRequestMonitoring, monitoringSystem } from '../utils/monitoring';
import monitoringRoutes from '../routes/monitoring';

/**
 * Add comprehensive monitoring to an Express application
 */
export function addMonitoringToApp(app: Express): void {
  logger.info('🔧 Setting up monitoring middleware...');

  // Add request logging (should be one of the first middleware)
  app.use(requestLoggingMiddleware);
  
  // Add metrics collection
  app.use(metricsMiddleware());
  
  // Add performance monitoring
  app.use(performanceMonitoringMiddleware);
  
  // Add request monitoring context
  app.use(initializeRequestMonitoring());

  // Add monitoring routes
  app.use('/api/monitoring', monitoringRoutes);

  // Add error tracking middleware (should be after all other middleware but before error handlers)
  app.use(errorTrackingMiddleware);

  logger.info('✅ Monitoring middleware setup complete');
}

/**
 * Initialize the monitoring system at application startup
 */
export async function initializeMonitoring(): Promise<void> {
  try {
    await monitoringSystem.initialize();
    logger.info('🎯 Monitoring system fully operational');
  } catch (error) {
    logger.error('❌ Failed to initialize monitoring system', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Gracefully shutdown monitoring system
 */
export async function shutdownMonitoring(): Promise<void> {
  try {
    await monitoringSystem.shutdown();
    logger.info('🏁 Monitoring system shutdown complete');
  } catch (error) {
    logger.error('❌ Error during monitoring shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Setup process event handlers for monitoring
 */
export function setupProcessHandlers(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack
    });
    
    // Record the error as a critical metric
    monitoringSystem.recordBusinessMetric('uncaught_exception', 1, 'count', {
      errorMessage: error.message,
      errorName: error.name
    });

    // Don't exit immediately, let the monitoring system log the error
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined
    });

    // Record the rejection as a critical metric
    monitoringSystem.recordBusinessMetric('unhandled_rejection', 1, 'count', {
      reason: String(reason)
    });
  });

  // Handle graceful shutdown signals
  const gracefulShutdown = (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    shutdownMonitoring().then(() => {
      logger.info('Graceful shutdown complete');
      process.exit(0);
    }).catch((error) => {
      logger.error('Error during graceful shutdown', { error });
      process.exit(1);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Setup memory monitoring
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    
    // Log memory usage if it's getting high
    if (heapUsedMB > 500) { // More than 500MB
      logger.warn('High memory usage detected', {
        heapUsedMB,
        heapTotalMB,
        rssMB: Math.round(memUsage.rss / 1024 / 1024)
      });
    }
  }, 60000); // Check every minute

  logger.info('✅ Process monitoring handlers setup complete');
}

/**
 * Development helper to log monitoring endpoints
 */
export function logMonitoringEndpoints(port: number): void {
  const baseUrl = `http://localhost:${port}/api/monitoring`;
  
  logger.info('📊 Monitoring Endpoints Available:', {
    health: `${baseUrl}/health`,
    metrics: `${baseUrl}/metrics/summary`,
    errors: `${baseUrl}/errors/stats`,
    dashboard: `${baseUrl}/dashboard`,
    realtime: `${baseUrl}/realtime`,
    performance: `${baseUrl}/performance/slow-endpoints`
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('\n📊 Monitoring Dashboard URLs:');
    console.log(`   Health Check:     ${baseUrl}/health`);
    console.log(`   Metrics Summary:  ${baseUrl}/metrics/summary`);
    console.log(`   Error Statistics: ${baseUrl}/errors/stats`);
    console.log(`   System Overview:  ${baseUrl}/overview`);
    console.log(`   Dashboard Data:   ${baseUrl}/dashboard`);
    console.log(`   Real-time Stream: ${baseUrl}/realtime`);
    console.log(`   Performance:      ${baseUrl}/performance/slow-endpoints`);
    console.log('');
  }
}

/**
 * Create a simple HTML monitoring dashboard
 */
export function createSimpleMonitoringDashboard(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Monitoring Dashboard</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f5f5f5; 
        }
        .dashboard { 
            max-width: 1200px; 
            margin: 0 auto; 
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            color: #333; 
        }
        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .metric-card { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
        }
        .metric-title { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 10px; 
            color: #333; 
        }
        .metric-value { 
            font-size: 24px; 
            font-weight: bold; 
            color: #2196F3; 
        }
        .status-healthy { color: #4CAF50; }
        .status-warning { color: #FF9800; }
        .status-critical { color: #F44336; }
        .endpoint-list { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
        }
        .endpoint-item { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 10px; 
            border-bottom: 1px solid #eee; 
        }
        .endpoint-item:last-child { border-bottom: none; }
        .refresh-btn { 
            position: fixed; 
            bottom: 20px; 
            right: 20px; 
            padding: 15px 20px; 
            background: #2196F3; 
            color: white; 
            border: none; 
            border-radius: 50px; 
            cursor: pointer; 
            font-size: 16px; 
            box-shadow: 0 4px 8px rgba(0,0,0,0.2); 
        }
        .refresh-btn:hover { background: #1976D2; }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🎯 System Monitoring Dashboard</h1>
            <p>Real-time system health and performance metrics</p>
        </div>

        <div class="metrics-grid" id="metricsGrid">
            <!-- Metrics will be loaded here -->
        </div>

        <div class="endpoint-list">
            <h2>📊 Available Monitoring Endpoints</h2>
            <div class="endpoint-item">
                <span><strong>Health Check</strong></span>
                <a href="/api/monitoring/health" target="_blank">GET /api/monitoring/health</a>
            </div>
            <div class="endpoint-item">
                <span><strong>Metrics Summary</strong></span>
                <a href="/api/monitoring/metrics/summary" target="_blank">GET /api/monitoring/metrics/summary</a>
            </div>
            <div class="endpoint-item">
                <span><strong>Error Statistics</strong></span>
                <a href="/api/monitoring/errors/stats" target="_blank">GET /api/monitoring/errors/stats</a>
            </div>
            <div class="endpoint-item">
                <span><strong>System Overview</strong></span>
                <a href="/api/monitoring/overview" target="_blank">GET /api/monitoring/overview</a>
            </div>
            <div class="endpoint-item">
                <span><strong>Performance Analytics</strong></span>
                <a href="/api/monitoring/performance/slow-endpoints" target="_blank">GET /api/monitoring/performance/slow-endpoints</a>
            </div>
        </div>
    </div>

    <button class="refresh-btn" onclick="loadMetrics()">🔄 Refresh</button>

    <script>
        async function loadMetrics() {
            try {
                const [health, metrics, errors] = await Promise.all([
                    fetch('/api/monitoring/health').then(r => r.json()),
                    fetch('/api/monitoring/metrics/summary').then(r => r.json()),
                    fetch('/api/monitoring/errors/stats').then(r => r.json())
                ]);

                updateMetricsGrid(health.data, metrics.data?.summary, errors.data);
            } catch (error) {
                console.error('Failed to load metrics:', error);
                document.getElementById('metricsGrid').innerHTML = 
                    '<div class="metric-card"><div class="metric-title">Error Loading Metrics</div><div class="metric-value status-critical">Connection Failed</div></div>';
            }
        }

        function updateMetricsGrid(health, metrics, errors) {
            const grid = document.getElementById('metricsGrid');
            
            const statusClass = health?.status === 'healthy' ? 'status-healthy' : 
                               health?.status === 'degraded' ? 'status-warning' : 'status-critical';

            grid.innerHTML = \`
                <div class="metric-card">
                    <div class="metric-title">System Health</div>
                    <div class="metric-value \${statusClass}">\${health?.status || 'Unknown'}</div>
                    <small>Uptime: \${Math.round(health?.uptime || 0)}s</small>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Average Response Time</div>
                    <div class="metric-value">\${Math.round(metrics?.responseTime?.avg || 0)}ms</div>
                    <small>P95: \${Math.round(metrics?.responseTime?.p95 || 0)}ms</small>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Error Rate</div>
                    <div class="metric-value \${metrics?.errorRate > 5 ? 'status-critical' : metrics?.errorRate > 1 ? 'status-warning' : 'status-healthy'}">\${(metrics?.errorRate || 0).toFixed(1)}%</div>
                    <small>Recent errors: \${errors?.recentErrors || 0}</small>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Memory Usage</div>
                    <div class="metric-value">\${Math.round(metrics?.memoryUsage?.avg || 0)}%</div>
                    <small>Heap: \${Math.round((process?.memoryUsage?.()?.heapUsed || 0) / 1024 / 1024)}MB</small>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Total Requests</div>
                    <div class="metric-value">\${metrics?.totalRequests || 0}</div>
                    <small>Last hour</small>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Database Operations</div>
                    <div class="metric-value">\${Math.round(metrics?.databaseOps?.avg || 0)}ms</div>
                    <small>Avg response time</small>
                </div>
            \`;
        }

        // Load metrics on page load
        loadMetrics();
        
        // Auto-refresh every 30 seconds
        setInterval(loadMetrics, 30000);
    </script>
</body>
</html>
  `;
}

export default {
  addMonitoringToApp,
  initializeMonitoring,
  shutdownMonitoring,
  setupProcessHandlers,
  logMonitoringEndpoints,
  createSimpleMonitoringDashboard
};