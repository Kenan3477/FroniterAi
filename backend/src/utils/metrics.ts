import { performance } from 'perf_hooks';
import { logger } from './logging';

export interface MetricData {
  name: string;
  value: number;
  unit: 'ms' | 'count' | 'bytes' | 'percent' | 'ratio';
  timestamp: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface AggregatedMetric {
  name: string;
  unit: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  sum: number;
  timestamp: Date;
}

class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: MetricData[] = [];
  private maxMetricsSize = 10000;
  private aggregationIntervals: Map<string, NodeJS.Timeout> = new Map();

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Record a metric
   */
  public recordMetric(name: string, value: number, unit: MetricData['unit'], tags?: Record<string, string>, metadata?: Record<string, any>): void {
    const metric: MetricData = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags,
      metadata
    };

    this.addMetric(metric);

    // Log metric for debugging
    logger.debug('Metric recorded', {
      metric: name,
      value,
      unit,
      tags
    });
  }

  /**
   * Record response time metric
   */
  public recordResponseTime(route: string, method: string, statusCode: number, duration: number): void {
    this.recordMetric(
      'http_request_duration',
      duration,
      'ms',
      {
        route,
        method,
        status_code: statusCode.toString(),
        status_class: `${Math.floor(statusCode / 100)}xx`
      }
    );
  }

  /**
   * Record database operation metric
   */
  public recordDatabaseOperation(operation: string, model: string, duration: number, success: boolean): void {
    this.recordMetric(
      'database_operation_duration',
      duration,
      'ms',
      {
        operation,
        model,
        status: success ? 'success' : 'error'
      }
    );
  }

  /**
   * Record memory usage metric
   */
  public recordMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    
    this.recordMetric('memory_heap_used', memUsage.heapUsed, 'bytes');
    this.recordMetric('memory_heap_total', memUsage.heapTotal, 'bytes');
    this.recordMetric('memory_rss', memUsage.rss, 'bytes');
    this.recordMetric('memory_external', memUsage.external, 'bytes');
    
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    this.recordMetric('memory_heap_usage_percent', heapUsagePercent, 'percent');
  }

  /**
   * Record API endpoint usage
   */
  public recordAPIUsage(endpoint: string, method: string, userId?: string): void {
    this.recordMetric(
      'api_endpoint_usage',
      1,
      'count',
      {
        endpoint,
        method,
        user_id: userId || 'anonymous'
      }
    );
  }

  /**
   * Record custom business metric
   */
  public recordBusinessMetric(name: string, value: number, unit: MetricData['unit'], context?: Record<string, any>): void {
    this.recordMetric(
      `business_${name}`,
      value,
      unit,
      undefined,
      context
    );
  }

  /**
   * Get metrics by name within time range
   */
  public getMetrics(name: string, since?: Date, until?: Date): MetricData[] {
    return this.metrics.filter(metric => {
      if (metric.name !== name) return false;
      if (since && metric.timestamp < since) return false;
      if (until && metric.timestamp > until) return false;
      return true;
    });
  }

  /**
   * Get aggregated metrics for a specific metric name
   */
  public getAggregatedMetrics(name: string, since?: Date, until?: Date): AggregatedMetric | null {
    const filteredMetrics = this.getMetrics(name, since, until);
    
    if (filteredMetrics.length === 0) {
      return null;
    }

    const values = filteredMetrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / count;
    
    const p50Index = Math.floor(count * 0.5);
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);

    return {
      name,
      unit: filteredMetrics[0].unit,
      count,
      min: values[0],
      max: values[count - 1],
      avg,
      p50: values[p50Index],
      p95: values[p95Index],
      p99: values[p99Index],
      sum,
      timestamp: new Date()
    };
  }

  /**
   * Get metrics summary for dashboard
   */
  public getMetricsSummary(timeRangeMinutes: number = 60): {
    responseTime: AggregatedMetric | null;
    databaseOps: AggregatedMetric | null;
    memoryUsage: AggregatedMetric | null;
    apiUsage: AggregatedMetric | null;
    errorRate: number;
    totalRequests: number;
  } {
    const since = new Date(Date.now() - timeRangeMinutes * 60 * 1000);

    const responseTime = this.getAggregatedMetrics('http_request_duration', since);
    const databaseOps = this.getAggregatedMetrics('database_operation_duration', since);
    const memoryUsage = this.getAggregatedMetrics('memory_heap_usage_percent', since);
    const apiUsage = this.getAggregatedMetrics('api_endpoint_usage', since);

    // Calculate error rate
    const allRequests = this.getMetrics('http_request_duration', since);
    const errorRequests = allRequests.filter(m => 
      m.tags?.status_class === '4xx' || m.tags?.status_class === '5xx'
    );
    const errorRate = allRequests.length > 0 ? (errorRequests.length / allRequests.length) * 100 : 0;

    return {
      responseTime,
      databaseOps,
      memoryUsage,
      apiUsage,
      errorRate,
      totalRequests: allRequests.length
    };
  }

  /**
   * Get top slow endpoints
   */
  public getSlowEndpoints(limit: number = 10, timeRangeMinutes: number = 60): Array<{
    route: string;
    method: string;
    avgDuration: number;
    p95Duration: number;
    requestCount: number;
  }> {
    const since = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
    const requests = this.getMetrics('http_request_duration', since);

    // Group by route and method
    const groupedRequests = new Map<string, MetricData[]>();
    
    requests.forEach(request => {
      const key = `${request.tags?.method || 'UNKNOWN'} ${request.tags?.route || 'UNKNOWN'}`;
      if (!groupedRequests.has(key)) {
        groupedRequests.set(key, []);
      }
      groupedRequests.get(key)!.push(request);
    });

    // Calculate statistics for each endpoint
    const endpointStats = Array.from(groupedRequests.entries()).map(([key, metrics]) => {
      const [method, route] = key.split(' ', 2);
      const durations = metrics.map(m => m.value).sort((a, b) => a - b);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const p95Index = Math.floor(durations.length * 0.95);
      const p95Duration = durations[p95Index] || durations[durations.length - 1];

      return {
        route,
        method,
        avgDuration: Math.round(avgDuration),
        p95Duration: Math.round(p95Duration),
        requestCount: metrics.length
      };
    });

    // Sort by P95 duration (slowest first)
    return endpointStats
      .sort((a, b) => b.p95Duration - a.p95Duration)
      .slice(0, limit);
  }

  /**
   * Start automatic metrics collection
   */
  public startAutomaticCollection(): void {
    // Collect memory metrics every 30 seconds
    const memoryInterval = setInterval(() => {
      this.recordMemoryUsage();
    }, 30000);

    this.aggregationIntervals.set('memory', memoryInterval);

    // Clean up old metrics every 10 minutes
    const cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 10 * 60 * 1000);

    this.aggregationIntervals.set('cleanup', cleanupInterval);

    logger.info('Automatic metrics collection started');
  }

  /**
   * Stop automatic metrics collection
   */
  public stopAutomaticCollection(): void {
    this.aggregationIntervals.forEach((interval, name) => {
      clearInterval(interval);
      logger.debug(`Stopped metrics collection: ${name}`);
    });
    this.aggregationIntervals.clear();
    logger.info('Automatic metrics collection stopped');
  }

  /**
   * Clean up metrics older than 24 hours
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const initialCount = this.metrics.length;
    
    this.metrics = this.metrics.filter(metric => metric.timestamp >= cutoffTime);
    
    const removedCount = initialCount - this.metrics.length;
    if (removedCount > 0) {
      logger.debug(`Cleaned up ${removedCount} old metrics`);
    }
  }

  private addMetric(metric: MetricData): void {
    this.metrics.push(metric);
    
    // Keep only the latest metrics if we exceed the limit
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }
  }
}

/**
 * Performance timing decorator
 */
export function timed(metricName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const finalMetricName = metricName || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      const metricsCollector = MetricsCollector.getInstance();
      
      try {
        const result = await method.apply(this, args);
        const duration = performance.now() - startTime;
        
        metricsCollector.recordMetric(
          'method_execution_time',
          duration,
          'ms',
          {
            method: finalMetricName,
            status: 'success'
          }
        );
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        metricsCollector.recordMetric(
          'method_execution_time',
          duration,
          'ms',
          {
            method: finalMetricName,
            status: 'error'
          }
        );
        
        throw error;
      }
    };
  };
}

/**
 * Express middleware for automatic metrics collection
 */
export function metricsMiddleware() {
  const metricsCollector = MetricsCollector.getInstance();
  
  return (req: any, res: any, next: any) => {
    const startTime = performance.now();
    
    // Record API usage
    metricsCollector.recordAPIUsage(
      req.route?.path || req.path,
      req.method,
      req.user?.id
    );

    // Override res.end to capture timing
    const originalEnd = res.end.bind(res);
    res.end = function (...args: any[]) {
      const duration = performance.now() - startTime;
      
      metricsCollector.recordResponseTime(
        req.route?.path || req.path,
        req.method,
        res.statusCode,
        duration
      );

      return originalEnd(...args);
    };

    next();
  };
}

export { MetricsCollector };
export default MetricsCollector.getInstance();