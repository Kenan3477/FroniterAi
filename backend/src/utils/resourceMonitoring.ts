import os from 'os';
import fs from 'fs/promises';
import { EventEmitter } from 'events';
import { logger } from './logging';
import { MetricsCollector } from './metrics';

/**
 * System resource utilization interface
 */
export interface ResourceUtilization {
  cpu: {
    usage: number; // Percentage
    loadAverage: number[];
    cores: number;
    model: string;
  };
  memory: {
    total: number; // Bytes
    used: number; // Bytes
    free: number; // Bytes
    usage: number; // Percentage
    available: number; // Bytes
  };
  disk: {
    total: number; // Bytes
    used: number; // Bytes
    free: number; // Bytes
    usage: number; // Percentage
  };
  network: {
    connections: number;
    bytesReceived: number;
    bytesSent: number;
  };
  process: {
    pid: number;
    uptime: number; // Seconds
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

/**
 * Resource alert interface
 */
export interface ResourceAlert {
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'process';
  level: 'warning' | 'critical';
  threshold: number;
  current: number;
  message: string;
  timestamp: string;
}

/**
 * Monitoring configuration interface
 */
export interface ResourceMonitoringConfig {
  enabled: boolean;
  interval: number; // Monitoring interval in milliseconds
  alerts: {
    enabled: boolean;
    thresholds: {
      cpu: { warning: number; critical: number };
      memory: { warning: number; critical: number };
      disk: { warning: number; critical: number };
    };
  };
  history: {
    enabled: boolean;
    maxEntries: number;
    aggregationInterval: number; // Minutes
  };
}

/**
 * Resource utilization trends interface
 */
interface ResourceTrends {
  cpu: number[];
  memory: number[];
  disk: number[];
  timestamps: string[];
}

/**
 * System Resource Monitor
 * Monitors CPU, memory, disk, and network usage with alerting
 */
export class ResourceMonitor extends EventEmitter {
  private static instance: ResourceMonitor;
  private config: ResourceMonitoringConfig;
  private metricsCollector: MetricsCollector;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private resourceHistory: ResourceUtilization[] = [];
  private trends: ResourceTrends;
  private lastCpuUsage: NodeJS.CpuUsage | null = null;

  private constructor(config: Partial<ResourceMonitoringConfig> = {}) {
    super();
    
    this.config = {
      enabled: true,
      interval: 30000, // 30 seconds
      alerts: {
        enabled: true,
        thresholds: {
          cpu: { warning: 70, critical: 90 },
          memory: { warning: 80, critical: 95 },
          disk: { warning: 85, critical: 95 }
        }
      },
      history: {
        enabled: true,
        maxEntries: 2880, // 24 hours at 30-second intervals
        aggregationInterval: 5 // 5 minutes
      },
      ...config
    };

    this.metricsCollector = MetricsCollector.getInstance();
    this.trends = {
      cpu: [],
      memory: [],
      disk: [],
      timestamps: []
    };

    this.initializeMonitoring();

    logger.info('Resource monitor initialized', {
      config: this.config
    });
  }

  static getInstance(config?: Partial<ResourceMonitoringConfig>): ResourceMonitor {
    if (!ResourceMonitor.instance) {
      ResourceMonitor.instance = new ResourceMonitor(config);
    }
    return ResourceMonitor.instance;
  }

  /**
   * Start resource monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval || !this.config.enabled) {
      return;
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectResourceMetrics();
      } catch (error) {
        logger.error('Failed to collect resource metrics', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, this.config.interval);

    logger.info('Resource monitoring started', {
      interval: this.config.interval
    });
  }

  /**
   * Stop resource monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Resource monitoring stopped');
    }
  }

  /**
   * Get current resource utilization
   */
  async getCurrentUtilization(): Promise<ResourceUtilization> {
    try {
      const [cpu, memory, disk, network, processInfo] = await Promise.all([
        this.getCpuUtilization(),
        this.getMemoryUtilization(),
        this.getDiskUtilization(),
        this.getNetworkUtilization(),
        this.getProcessInfo()
      ]);

      return {
        cpu,
        memory,
        disk,
        network,
        process: processInfo
      };
    } catch (error) {
      logger.error('Failed to get current utilization', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get resource utilization history
   */
  getResourceHistory(): ResourceUtilization[] {
    return [...this.resourceHistory];
  }

  /**
   * Get resource usage trends
   */
  getResourceTrends(): ResourceTrends {
    return {
      cpu: [...this.trends.cpu],
      memory: [...this.trends.memory],
      disk: [...this.trends.disk],
      timestamps: [...this.trends.timestamps]
    };
  }

  /**
   * Get aggregated metrics for a time period
   */
  getAggregatedMetrics(minutes: number = 60): {
    cpu: { avg: number; max: number; min: number };
    memory: { avg: number; max: number; min: number };
    disk: { avg: number; max: number; min: number };
  } {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    const recentHistory = this.resourceHistory.filter(
      entry => new Date(entry.process.uptime).getTime() > cutoff
    );

    if (recentHistory.length === 0) {
      return {
        cpu: { avg: 0, max: 0, min: 0 },
        memory: { avg: 0, max: 0, min: 0 },
        disk: { avg: 0, max: 0, min: 0 }
      };
    }

    const cpuUsages = recentHistory.map(h => h.cpu.usage);
    const memoryUsages = recentHistory.map(h => h.memory.usage);
    const diskUsages = recentHistory.map(h => h.disk.usage);

    return {
      cpu: {
        avg: cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length,
        max: Math.max(...cpuUsages),
        min: Math.min(...cpuUsages)
      },
      memory: {
        avg: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
        max: Math.max(...memoryUsages),
        min: Math.min(...memoryUsages)
      },
      disk: {
        avg: diskUsages.reduce((a, b) => a + b, 0) / diskUsages.length,
        max: Math.max(...diskUsages),
        min: Math.min(...diskUsages)
      }
    };
  }

  /**
   * Initialize monitoring
   */
  private initializeMonitoring(): void {
    if (this.config.enabled) {
      // Start monitoring immediately
      this.startMonitoring();
    }

    // Set up event listeners for alerts
    this.on('resource-alert', (alert: ResourceAlert) => {
      logger.warn('Resource alert triggered', alert);
      
      // Record alert metric
      this.metricsCollector.recordMetric(
        `resource_alert_${alert.type}`,
        1,
        'count',
        { level: alert.level }
      );
    });
  }

  /**
   * Collect resource metrics
   */
  private async collectResourceMetrics(): Promise<void> {
    try {
      const utilization = await this.getCurrentUtilization();
      
      // Store in history
      if (this.config.history.enabled) {
        this.resourceHistory.push(utilization);
        
        // Limit history size
        if (this.resourceHistory.length > this.config.history.maxEntries) {
          this.resourceHistory = this.resourceHistory.slice(-this.config.history.maxEntries);
        }
      }

      // Update trends
      this.updateTrends(utilization);

      // Record metrics
      this.recordMetrics(utilization);

      // Check for alerts
      if (this.config.alerts.enabled) {
        this.checkResourceAlerts(utilization);
      }

      // Emit utilization update
      this.emit('utilization-update', utilization);

    } catch (error) {
      logger.error('Failed to collect resource metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get CPU utilization
   */
  private async getCpuUtilization(): Promise<ResourceUtilization['cpu']> {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    // Calculate CPU usage
    let usage = 0;
    if (this.lastCpuUsage) {
      const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
      const total = currentCpuUsage.user + currentCpuUsage.system;
      const interval = this.config.interval * 1000; // Convert to microseconds
      usage = (total / interval) * 100;
    }
    
    this.lastCpuUsage = process.cpuUsage();

    return {
      usage: Math.min(100, Math.max(0, usage)),
      loadAverage: loadAvg,
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown'
    };
  }

  /**
   * Get memory utilization
   */
  private getMemoryUtilization(): ResourceUtilization['memory'] {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usage = (used / total) * 100;

    return {
      total,
      used,
      free,
      usage,
      available: free
    };
  }

  /**
   * Get disk utilization
   */
  private async getDiskUtilization(): Promise<ResourceUtilization['disk']> {
    try {
      // This is a simplified implementation for the root directory
      // In production, you might want to check multiple mount points
      const stats = await fs.stat('.');
      
      // Approximate disk usage (this is not accurate, just for demo)
      const total = 100 * 1024 * 1024 * 1024; // 100GB estimate
      const free = 50 * 1024 * 1024 * 1024; // 50GB estimate
      const used = total - free;
      const usage = (used / total) * 100;

      return {
        total,
        used,
        free,
        usage
      };
    } catch (error) {
      return {
        total: 0,
        used: 0,
        free: 0,
        usage: 0
      };
    }
  }

  /**
   * Get network utilization
   */
  private getNetworkUtilization(): ResourceUtilization['network'] {
    // This is a simplified implementation
    // In production, you would collect actual network statistics
    return {
      connections: 0,
      bytesReceived: 0,
      bytesSent: 0
    };
  }

  /**
   * Get process information
   */
  private getProcessInfo(): ResourceUtilization['process'] {
    return {
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
  }

  /**
   * Update resource trends
   */
  private updateTrends(utilization: ResourceUtilization): void {
    const timestamp = new Date().toISOString();
    
    this.trends.cpu.push(utilization.cpu.usage);
    this.trends.memory.push(utilization.memory.usage);
    this.trends.disk.push(utilization.disk.usage);
    this.trends.timestamps.push(timestamp);

    // Limit trend data
    const maxTrendEntries = 288; // 24 hours at 5-minute aggregation
    if (this.trends.cpu.length > maxTrendEntries) {
      this.trends.cpu = this.trends.cpu.slice(-maxTrendEntries);
      this.trends.memory = this.trends.memory.slice(-maxTrendEntries);
      this.trends.disk = this.trends.disk.slice(-maxTrendEntries);
      this.trends.timestamps = this.trends.timestamps.slice(-maxTrendEntries);
    }
  }

  /**
   * Record metrics for external consumption
   */
  private recordMetrics(utilization: ResourceUtilization): void {
    // Record system metrics
    this.metricsCollector.recordMetric('system_cpu_usage', utilization.cpu.usage, 'percent');
    this.metricsCollector.recordMetric('system_memory_usage', utilization.memory.usage, 'percent');
    this.metricsCollector.recordMetric('system_disk_usage', utilization.disk.usage, 'percent');
    this.metricsCollector.recordMetric('system_load_average', utilization.cpu.loadAverage[0], 'count');

    // Record process metrics
    this.metricsCollector.recordMetric(
      'process_memory_heap_used',
      utilization.process.memoryUsage.heapUsed,
      'bytes'
    );
    this.metricsCollector.recordMetric(
      'process_memory_rss',
      utilization.process.memoryUsage.rss,
      'bytes'
    );
  }

  /**
   * Check for resource alerts
   */
  private checkResourceAlerts(utilization: ResourceUtilization): void {
    const alerts: ResourceAlert[] = [];

    // CPU alerts
    if (utilization.cpu.usage >= this.config.alerts.thresholds.cpu.critical) {
      alerts.push({
        type: 'cpu',
        level: 'critical',
        threshold: this.config.alerts.thresholds.cpu.critical,
        current: utilization.cpu.usage,
        message: `CPU usage is critically high: ${utilization.cpu.usage.toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    } else if (utilization.cpu.usage >= this.config.alerts.thresholds.cpu.warning) {
      alerts.push({
        type: 'cpu',
        level: 'warning',
        threshold: this.config.alerts.thresholds.cpu.warning,
        current: utilization.cpu.usage,
        message: `CPU usage is high: ${utilization.cpu.usage.toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Memory alerts
    if (utilization.memory.usage >= this.config.alerts.thresholds.memory.critical) {
      alerts.push({
        type: 'memory',
        level: 'critical',
        threshold: this.config.alerts.thresholds.memory.critical,
        current: utilization.memory.usage,
        message: `Memory usage is critically high: ${utilization.memory.usage.toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    } else if (utilization.memory.usage >= this.config.alerts.thresholds.memory.warning) {
      alerts.push({
        type: 'memory',
        level: 'warning',
        threshold: this.config.alerts.thresholds.memory.warning,
        current: utilization.memory.usage,
        message: `Memory usage is high: ${utilization.memory.usage.toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Disk alerts
    if (utilization.disk.usage >= this.config.alerts.thresholds.disk.critical) {
      alerts.push({
        type: 'disk',
        level: 'critical',
        threshold: this.config.alerts.thresholds.disk.critical,
        current: utilization.disk.usage,
        message: `Disk usage is critically high: ${utilization.disk.usage.toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    } else if (utilization.disk.usage >= this.config.alerts.thresholds.disk.warning) {
      alerts.push({
        type: 'disk',
        level: 'warning',
        threshold: this.config.alerts.thresholds.disk.warning,
        current: utilization.disk.usage,
        message: `Disk usage is high: ${utilization.disk.usage.toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Emit alerts
    alerts.forEach(alert => {
      this.emit('resource-alert', alert);
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
    logger.info('Resource monitor destroyed');
  }
}

// Export singleton instance
export const resourceMonitor = ResourceMonitor.getInstance();

/**
 * Resource monitoring middleware for Express
 */
export function resourceMonitoringMiddleware() {
  return async (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    try {
      // Add resource info to request
      const utilization = await resourceMonitor.getCurrentUtilization();
      req.resourceInfo = {
        timestamp: new Date().toISOString(),
        cpu: utilization.cpu.usage,
        memory: utilization.memory.usage,
        disk: utilization.disk.usage
      };

      // Monitor request processing
      res.on('finish', () => {
        const processingTime = Date.now() - startTime;
        
        logger.debug('Request resource usage', {
          url: req.originalUrl,
          method: req.method,
          processingTime,
          cpu: utilization.cpu.usage,
          memory: utilization.memory.usage
        });
      });

      next();
    } catch (error) {
      logger.error('Resource monitoring middleware error', {
        error: error instanceof Error ? error.message : String(error)
      });
      next();
    }
  };
}