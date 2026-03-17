/**
 * Monitoring System Initialization
 * 
 * This module sets up and configures the comprehensive monitoring system
 * including health checks, error tracking, metrics collection, and alerting.
 */

import { logger } from '../utils/logging';
import { MetricsCollector } from '../utils/metrics';
import AlertingSystem from '../utils/alerting';
import HealthCheckService from '../middleware/healthCheck';

class MonitoringSystem {
  private static instance: MonitoringSystem;
  private metricsCollector: MetricsCollector;
  private alertingSystem: AlertingSystem;
  private healthCheckService: HealthCheckService;
  private initialized = false;

  public static getInstance(): MonitoringSystem {
    if (!MonitoringSystem.instance) {
      MonitoringSystem.instance = new MonitoringSystem();
    }
    return MonitoringSystem.instance;
  }

  constructor() {
    this.metricsCollector = MetricsCollector.getInstance();
    this.alertingSystem = AlertingSystem.getInstance();
    this.healthCheckService = HealthCheckService.getInstance();
  }

  /**
   * Initialize the monitoring system
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Monitoring system is already initialized');
      return;
    }

    try {
      logger.info('🚀 Initializing monitoring system...');

      // Start metrics collection
      this.metricsCollector.startAutomaticCollection();
      logger.info('✅ Metrics collection started');

      // Start alerting system
      this.alertingSystem.start();
      logger.info('✅ Alerting system started');

      // Setup alert handlers
      this.setupAlertHandlers();

      // Perform initial health check
      await this.performInitialHealthCheck();

      this.initialized = true;
      logger.info('🎯 Monitoring system initialization complete');

      // Log system overview
      this.logSystemOverview();

    } catch (error) {
      logger.error('Failed to initialize monitoring system', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Shutdown the monitoring system
   */
  public async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      logger.info('🔄 Shutting down monitoring system...');

      // Stop alerting system
      this.alertingSystem.stop();
      logger.info('✅ Alerting system stopped');

      // Stop metrics collection
      this.metricsCollector.stopAutomaticCollection();
      logger.info('✅ Metrics collection stopped');

      this.initialized = false;
      logger.info('🎯 Monitoring system shutdown complete');

    } catch (error) {
      logger.error('Error during monitoring system shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Setup alert event handlers
   */
  private setupAlertHandlers(): void {
    this.alertingSystem.on('alert', (alert) => {
      logger.warn('🚨 Alert triggered', {
        alertId: alert.id,
        type: alert.type,
        title: alert.title,
        message: alert.message
      });

      // Record alert as a metric
      this.metricsCollector.recordBusinessMetric(
        'alert_triggered',
        1,
        'count',
        {
          alertType: alert.type,
          alertSource: alert.source,
          ruleId: alert.metadata?.ruleId
        }
      );
    });

    this.alertingSystem.on('alert_resolved', (alert) => {
      logger.info('✅ Alert resolved', {
        alertId: alert.id,
        title: alert.title,
        resolvedAt: alert.resolvedAt
      });

      // Record alert resolution as a metric
      this.metricsCollector.recordBusinessMetric(
        'alert_resolved',
        1,
        'count',
        {
          alertType: alert.type,
          alertSource: alert.source
        }
      );
    });
  }

  /**
   * Perform initial health check
   */
  private async performInitialHealthCheck(): Promise<void> {
    try {
      const healthStatus = await this.healthCheckService.performHealthCheck();
      
      logger.info('🏥 Initial health check completed', {
        status: healthStatus.status,
        uptime: healthStatus.uptime,
        services: Object.keys(healthStatus.services).reduce((acc, key) => {
          acc[key] = healthStatus.services[key as keyof typeof healthStatus.services].status;
          return acc;
        }, {} as Record<string, string>)
      });

      // Record health metrics
      this.metricsCollector.recordBusinessMetric(
        'system_health_score',
        healthStatus.status === 'healthy' ? 100 : healthStatus.status === 'degraded' ? 50 : 0,
        'percent'
      );

    } catch (error) {
      logger.error('Initial health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Log system overview at startup
   */
  private logSystemOverview(): void {
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      pid: process.pid,
      environment: process.env.NODE_ENV || 'development',
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };

    logger.info('📊 System Overview', systemInfo);

    // Log monitoring configuration
    const alertingStatus = this.alertingSystem.getStatus();
    logger.info('⚙️ Monitoring Configuration', {
      alerting: {
        enabled: alertingStatus.running,
        totalRules: alertingStatus.totalRules,
        enabledRules: alertingStatus.enabledRules
      },
      metrics: {
        automaticCollection: true,
        collectionInterval: '30s'
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.NODE_ENV === 'production' ? 'json' : 'console'
      }
    });
  }

  /**
   * Get monitoring system status
   */
  public getStatus(): {
    initialized: boolean;
    uptime: number;
    alerts: ReturnType<AlertingSystem['getStatus']>;
    metrics: {
      recentSummary: ReturnType<MetricsCollector['getMetricsSummary']>;
      slowEndpoints: ReturnType<MetricsCollector['getSlowEndpoints']>;
    };
    health: {
      lastCheck?: Date;
      status?: string;
    };
  } {
    return {
      initialized: this.initialized,
      uptime: process.uptime(),
      alerts: this.alertingSystem.getStatus(),
      metrics: {
        recentSummary: this.metricsCollector.getMetricsSummary(60),
        slowEndpoints: this.metricsCollector.getSlowEndpoints(5, 60)
      },
      health: {
        // This would be populated from health check service
        lastCheck: new Date(),
        status: 'unknown'
      }
    };
  }

  /**
   * Record a custom business metric
   */
  public recordBusinessMetric(name: string, value: number, unit: 'count' | 'ms' | 'bytes' | 'percent', context?: Record<string, any>): void {
    this.metricsCollector.recordBusinessMetric(name, value, unit, context);
  }

  /**
   * Force health check
   */
  public async performHealthCheck(): Promise<any> {
    return await this.healthCheckService.performHealthCheck();
  }

  /**
   * Get recent alerts
   */
  public getRecentAlerts(limit: number = 10): ReturnType<AlertingSystem['getAlerts']> {
    return this.alertingSystem.getAlerts(limit);
  }

  /**
   * Resolve an alert manually
   */
  public resolveAlert(alertId: string): boolean {
    return this.alertingSystem.resolveAlert(alertId);
  }
}

/**
 * Express middleware to initialize monitoring for requests
 */
export function initializeRequestMonitoring() {
  const monitoringSystem = MonitoringSystem.getInstance();
  
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    // Add monitoring utilities to request context
    req.monitoring = {
      recordMetric: (name: string, value: number, unit: any) => {
        monitoringSystem.recordBusinessMetric(name, value, unit, {
          route: req.path,
          method: req.method,
          userId: req.user?.id
        });
      },
      
      recordBusinessEvent: (eventName: string, metadata?: any) => {
        monitoringSystem.recordBusinessMetric(eventName, 1, 'count', {
          ...metadata,
          route: req.path,
          method: req.method,
          userId: req.user?.id
        });
      }
    };

    // Record request start
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      // This will be handled by the metrics middleware we created earlier
      // But we could add additional business-specific metrics here
      if (duration > 5000) { // Slow request
        monitoringSystem.recordBusinessMetric('slow_request', 1, 'count', {
          route: req.path,
          method: req.method,
          duration,
          statusCode: res.statusCode
        });
      }
    });

    next();
  };
}

// Global singleton instance
export const monitoringSystem = MonitoringSystem.getInstance();

export default MonitoringSystem;