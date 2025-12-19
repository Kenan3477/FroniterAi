import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';
import { promisify } from 'util';
import { exec } from 'child_process';
import os from 'os';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    memory: ServiceHealth;
    disk: ServiceHealth;
    cpu: ServiceHealth;
    external_apis: ServiceHealth;
  };
  version: string;
  environment: string;
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  details?: string;
  metrics?: Record<string, any>;
}

class HealthCheckService {
  private static instance: HealthCheckService;
  private healthHistory: HealthStatus[] = [];
  private maxHistorySize = 100;

  public static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<HealthStatus> {
    const startTime = performance.now();
    
    const [database, memory, disk, cpu, externalApis] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkMemory(),
      this.checkDisk(),
      this.checkCPU(),
      this.checkExternalAPIs()
    ]);

    const services = {
      database: this.extractResult(database),
      memory: this.extractResult(memory),
      disk: this.extractResult(disk),
      cpu: this.extractResult(cpu),
      external_apis: this.extractResult(externalApis)
    };

    // Determine overall health status
    const overallStatus = this.determineOverallStatus(services);

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    // Store in history
    this.addToHistory(healthStatus);

    console.log(`🏥 Health check completed in ${Math.round(performance.now() - startTime)}ms - Status: ${overallStatus.toUpperCase()}`);
    return healthStatus;
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<ServiceHealth> {
    try {
      const startTime = performance.now();
      
      // Test basic connectivity
      await prisma.$queryRaw`SELECT 1`;
      
      // Test a more complex query to measure performance
      const userCount = await prisma.user.count();
      const campaignCount = await prisma.campaign.count();
      
      const latency = Math.round(performance.now() - startTime);
      
      return {
        status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
        latency,
        details: `Connected successfully`,
        metrics: {
          userCount,
          campaignCount,
          connectionPool: 'active'
        }
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        details: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metrics: {
          connectionPool: 'failed'
        }
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<ServiceHealth> {
    const memUsage = process.memoryUsage();
    const totalMemMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const heapUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let details = 'Memory usage within normal parameters';

    if (heapUsagePercent > 90) {
      status = 'unhealthy';
      details = 'Critical memory usage detected';
    } else if (heapUsagePercent > 75) {
      status = 'degraded';
      details = 'High memory usage detected';
    }

    return {
      status,
      details,
      metrics: {
        totalMemoryMB: totalMemMB,
        heapUsedMB,
        heapTotalMB,
        heapUsagePercent,
        external: Math.round(memUsage.external / 1024 / 1024)
      }
    };
  }

  /**
   * Check disk usage
   */
  private async checkDisk(): Promise<ServiceHealth> {
    try {
      const { stdout } = await execAsync('df -h / | tail -1');
      const diskInfo = stdout.trim().split(/\s+/);
      const usagePercent = parseInt(diskInfo[4]?.replace('%', '') || '0');
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let details = 'Disk usage within normal parameters';

      if (usagePercent > 95) {
        status = 'unhealthy';
        details = 'Critical disk usage detected';
      } else if (usagePercent > 85) {
        status = 'degraded';
        details = 'High disk usage detected';
      }

      return {
        status,
        details,
        metrics: {
          usagePercent,
          available: diskInfo[3],
          used: diskInfo[2],
          total: diskInfo[1]
        }
      };
    } catch (error) {
      return {
        status: 'degraded',
        details: 'Unable to check disk usage',
        metrics: {}
      };
    }
  }

  /**
   * Check CPU usage
   */
  private async checkCPU(): Promise<ServiceHealth> {
    try {
      const startTime = process.cpuUsage();
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms sample
      const endTime = process.cpuUsage(startTime);
      
      const cpuPercent = Math.round(((endTime.user + endTime.system) / 100000) * 100) / 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let details = 'CPU usage within normal parameters';

      if (cpuPercent > 90) {
        status = 'unhealthy';
        details = 'Critical CPU usage detected';
      } else if (cpuPercent > 75) {
        status = 'degraded';
        details = 'High CPU usage detected';
      }

      return {
        status,
        details,
        metrics: {
          cpuPercent,
          loadAverage: os.loadavg()
        }
      };
    } catch (error) {
      return {
        status: 'degraded',
        details: 'Unable to check CPU usage',
        metrics: {}
      };
    }
  }

  /**
   * Check external API dependencies
   */
  private async checkExternalAPIs(): Promise<ServiceHealth> {
    const checks = [];

    // Check if we can resolve DNS (basic connectivity test)
    try {
      const dns = require('dns').promises;
      await dns.resolve('google.com');
      checks.push({ service: 'DNS', status: 'healthy' });
    } catch (error) {
      checks.push({ service: 'DNS', status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // TODO: Add specific external API checks for Twilio, etc.
    // For now, we'll just check basic internet connectivity

    const unhealthyCount = checks.filter(check => check.status === 'unhealthy').length;
    const degradedCount = checks.filter(check => check.status === 'degraded').length;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let details = 'All external dependencies accessible';

    if (unhealthyCount > 0) {
      status = 'unhealthy';
      details = `${unhealthyCount} external dependencies unavailable`;
    } else if (degradedCount > 0) {
      status = 'degraded';
      details = `${degradedCount} external dependencies experiencing issues`;
    }

    return {
      status,
      details,
      metrics: {
        totalChecks: checks.length,
        healthyChecks: checks.filter(check => check.status === 'healthy').length,
        checks
      }
    };
  }

  /**
   * Extract result from Promise.allSettled
   */
  private extractResult(result: PromiseSettledResult<ServiceHealth>): ServiceHealth {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        details: `Health check failed: ${result.reason}`
      };
    }
  }

  /**
   * Determine overall health status based on individual services
   */
  private determineOverallStatus(services: HealthStatus['services']): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(services).map(service => service.status);
    
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    } else if (statuses.includes('degraded')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Add health status to history
   */
  private addToHistory(status: HealthStatus): void {
    this.healthHistory.push(status);
    
    // Keep only the latest entries
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get health history for trend analysis
   */
  public getHealthHistory(): HealthStatus[] {
    return [...this.healthHistory];
  }

  /**
   * Get health metrics summary
   */
  public getHealthSummary(): {
    current: HealthStatus | null;
    uptime: number;
    recentTrend: string;
    avgResponseTime: number;
  } {
    const current = this.healthHistory[this.healthHistory.length - 1] || null;
    const recent = this.healthHistory.slice(-10);
    
    let recentTrend = 'stable';
    if (recent.length > 5) {
      const recentStatuses = recent.map(h => h.status);
      const degradedCount = recentStatuses.filter(s => s === 'degraded').length;
      const unhealthyCount = recentStatuses.filter(s => s === 'unhealthy').length;
      
      if (unhealthyCount > 0) {
        recentTrend = 'declining';
      } else if (degradedCount > 3) {
        recentTrend = 'degrading';
      } else {
        recentTrend = 'stable';
      }
    }

    const avgResponseTime = recent.reduce((avg, health) => {
      const dbLatency = health.services.database.latency || 0;
      return avg + dbLatency;
    }, 0) / recent.length || 0;

    return {
      current,
      uptime: process.uptime(),
      recentTrend,
      avgResponseTime: Math.round(avgResponseTime)
    };
  }
}

/**
 * Express middleware for health check endpoint
 */
export const healthCheckHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const healthService = HealthCheckService.getInstance();
    const healthStatus = await healthService.performHealthCheck();
    
    // Set appropriate HTTP status code
    let httpStatus = 200;
    if (healthStatus.status === 'degraded') {
      httpStatus = 207; // Multi-Status
    } else if (healthStatus.status === 'unhealthy') {
      httpStatus = 503; // Service Unavailable
    }

    res.status(httpStatus).json({
      success: healthStatus.status !== 'unhealthy',
      data: healthStatus,
      message: `System is ${healthStatus.status}`
    });
  } catch (error) {
    console.error('Health check endpoint error:', error);
    res.status(503).json({
      success: false,
      error: {
        message: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    });
  }
};

/**
 * Express middleware for health summary endpoint
 */
export const healthSummaryHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const healthService = HealthCheckService.getInstance();
    const summary = healthService.getHealthSummary();
    
    res.json({
      success: true,
      data: summary,
      message: 'Health summary retrieved successfully'
    });
  } catch (error) {
    console.error('Health summary endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve health summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

export default HealthCheckService;