/**
 * Omnivox AI Flow Monitoring Service
 * Real-time flow performance tracking, analytics, and monitoring
 * Enterprise-grade flow monitoring with failure detection and performance optimization
 */

import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Input validation schemas
const GetFlowMetricsSchema = z.object({
  flowId: z.string().min(1),
  timeRange: z.enum(['1h', '24h', '7d', '30d']).optional().default('24h'),
  includeSteps: z.boolean().optional().default(false)
});

const GetPerformanceMetricsSchema = z.object({
  flowIds: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  aggregation: z.enum(['hour', 'day', 'week']).optional().default('hour')
});

// Types
interface FlowExecutionMetrics {
  flowId: string;
  flowName: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  runningRuns: number;
  averageExecutionTime: number;
  successRate: number;
  lastExecution: Date | null;
  currentVersion: number;
  isActive: boolean;
}

interface FlowPerformanceData {
  timestamp: Date;
  executionTime: number;
  status: string;
  nodeCount: number;
  errorCount: number;
}

interface FlowNodeMetrics {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime: number;
  errorRate: number;
}

interface RealTimeFlowStatus {
  flowId: string;
  flowName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  activeVersion: number;
  currentRuns: number;
  lastActivity: Date | null;
  alertLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issues: string[];
}

interface FlowExecutionTrend {
  period: string;
  executions: number;
  successes: number;
  failures: number;
  averageTime: number;
}

export class FlowMonitoringService {

  /**
   * Get comprehensive metrics for a specific flow
   */
  async getFlowMetrics(data: z.infer<typeof GetFlowMetricsSchema>): Promise<{
    metrics: FlowExecutionMetrics;
    trends: FlowExecutionTrend[];
    nodeMetrics?: FlowNodeMetrics[];
  }> {
    const validatedData = GetFlowMetricsSchema.parse(data);
    const { flowId, timeRange, includeSteps } = validatedData;

    // Calculate time range
    const timeRangeHours = {
      '1h': 1,
      '24h': 24,
      '7d': 168,
      '30d': 720
    };

    const since = new Date(Date.now() - timeRangeHours[timeRange] * 60 * 60 * 1000);

    // Get basic flow information
    const flow = await prisma.flow.findUnique({
      where: { id: flowId },
      include: {
        versions: {
          where: { isActive: true },
          take: 1
        }
      }
    });

    if (!flow) {
      throw new Error('Flow not found');
    }

    // Get flow runs within time range
    const runs = await prisma.flowRun.findMany({
      where: {
        flowVersion: {
          flowId: flowId
        },
        startedAt: {
          gte: since
        }
      },
      include: {
        steps: true,
        flowVersion: true
      }
    });

    // Calculate basic metrics
    const totalRuns = runs.length;
    const successfulRuns = runs.filter(r => r.status === 'COMPLETED').length;
    const failedRuns = runs.filter(r => r.status === 'FAILED').length;
    const runningRuns = runs.filter(r => r.status === 'RUNNING').length;
    
    const completedRuns = runs.filter(r => r.finishedAt);
    const totalExecutionTime = completedRuns.reduce((sum, run) => {
      if (run.finishedAt) {
        return sum + (run.finishedAt.getTime() - run.startedAt.getTime());
      }
      return sum;
    }, 0);

    const averageExecutionTime = completedRuns.length > 0 
      ? totalExecutionTime / completedRuns.length / 1000 // Convert to seconds
      : 0;

    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;
    const lastExecution = runs.length > 0 ? runs[0].startedAt : null;

    const metrics: FlowExecutionMetrics = {
      flowId,
      flowName: flow.name,
      totalRuns,
      successfulRuns,
      failedRuns,
      runningRuns,
      averageExecutionTime,
      successRate,
      lastExecution,
      currentVersion: flow.versions[0]?.versionNumber || 0,
      isActive: flow.status === 'ACTIVE'
    };

    // Calculate trends (group by time periods)
    const trends = this.calculateExecutionTrends(runs, timeRange);

    // Calculate node-level metrics if requested
    let nodeMetrics: FlowNodeMetrics[] | undefined;
    if (includeSteps) {
      nodeMetrics = await this.calculateNodeMetrics(flowId, since);
    }

    return {
      metrics,
      trends,
      nodeMetrics
    };
  }

  /**
   * Get real-time status for all flows
   */
  async getRealTimeFlowStatus(): Promise<RealTimeFlowStatus[]> {
    const flows = await prisma.flow.findMany({
      where: {
        status: { not: 'ARCHIVED' }
      },
      include: {
        versions: {
          where: { isActive: true },
          take: 1,
          include: {
            runs: {
              where: {
                status: 'RUNNING'
              },
              select: { id: true }
            }
          }
        }
      }
    });

    const statuses: RealTimeFlowStatus[] = [];

    for (const flow of flows) {
      const activeVersion = flow.versions[0];
      const currentRuns = activeVersion?.runs.length || 0;

      // Get last activity
      const lastRun = await prisma.flowRun.findFirst({
        where: {
          flowVersion: {
            flowId: flow.id
          }
        },
        orderBy: { startedAt: 'desc' }
      });

      // Calculate alert level and issues
      const { alertLevel, issues } = await this.calculateAlertLevel(flow.id);

      statuses.push({
        flowId: flow.id,
        flowName: flow.name,
        status: flow.status as any,
        activeVersion: activeVersion?.versionNumber || 0,
        currentRuns,
        lastActivity: lastRun?.startedAt || null,
        alertLevel,
        issues
      });
    }

    return statuses;
  }

  /**
   * Get performance metrics across multiple flows
   */
  async getPerformanceMetrics(data: z.infer<typeof GetPerformanceMetricsSchema>): Promise<{
    overview: {
      totalFlows: number;
      activeFlows: number;
      totalRuns: number;
      averageSuccessRate: number;
      averageExecutionTime: number;
    };
    flowMetrics: FlowExecutionMetrics[];
    performanceData: FlowPerformanceData[];
  }> {
    const validatedData = GetPerformanceMetricsSchema.parse(data);
    const { flowIds, startDate, endDate, aggregation } = validatedData;

    // Build date range
    let dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
    } else {
      // Default to last 24 hours
      dateFilter.gte = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // Build flow filter
    const flowFilter = flowIds ? { id: { in: flowIds } } : {};

    // Get flows
    const flows = await prisma.flow.findMany({
      where: {
        ...flowFilter,
        status: { not: 'ARCHIVED' }
      },
      include: {
        versions: {
          include: {
            runs: {
              where: {
                startedAt: dateFilter
              },
              include: {
                steps: true
              }
            }
          }
        }
      }
    });

    // Calculate overview metrics
    const totalFlows = flows.length;
    const activeFlows = flows.filter(f => f.status === 'ACTIVE').length;
    
    const allRuns = flows.flatMap(f => f.versions.flatMap(v => v.runs));
    const totalRuns = allRuns.length;
    
    const completedRuns = allRuns.filter(r => r.finishedAt);
    const successfulRuns = allRuns.filter(r => r.status === 'COMPLETED');
    
    const averageSuccessRate = totalRuns > 0 ? (successfulRuns.length / totalRuns) * 100 : 0;
    
    const totalExecutionTime = completedRuns.reduce((sum, run) => {
      if (run.finishedAt) {
        return sum + (run.finishedAt.getTime() - run.startedAt.getTime());
      }
      return sum;
    }, 0);
    
    const averageExecutionTime = completedRuns.length > 0 
      ? totalExecutionTime / completedRuns.length / 1000 
      : 0;

    // Calculate individual flow metrics
    const flowMetrics: FlowExecutionMetrics[] = flows.map(flow => {
      const flowRuns = flow.versions.flatMap(v => v.runs);
      const flowCompletedRuns = flowRuns.filter(r => r.finishedAt);
      const flowSuccessfulRuns = flowRuns.filter(r => r.status === 'COMPLETED');
      
      const flowTotalTime = flowCompletedRuns.reduce((sum, run) => {
        if (run.finishedAt) {
          return sum + (run.finishedAt.getTime() - run.startedAt.getTime());
        }
        return sum;
      }, 0);

      return {
        flowId: flow.id,
        flowName: flow.name,
        totalRuns: flowRuns.length,
        successfulRuns: flowSuccessfulRuns.length,
        failedRuns: flowRuns.filter(r => r.status === 'FAILED').length,
        runningRuns: flowRuns.filter(r => r.status === 'RUNNING').length,
        averageExecutionTime: flowCompletedRuns.length > 0 
          ? flowTotalTime / flowCompletedRuns.length / 1000 
          : 0,
        successRate: flowRuns.length > 0 ? (flowSuccessfulRuns.length / flowRuns.length) * 100 : 0,
        lastExecution: flowRuns.length > 0 ? flowRuns[0].startedAt : null,
        currentVersion: flow.versions.find(v => v.isActive)?.versionNumber || 0,
        isActive: flow.status === 'ACTIVE'
      };
    });

    // Generate performance data points
    const performanceData = this.generatePerformanceDataPoints(allRuns, aggregation);

    return {
      overview: {
        totalFlows,
        activeFlows,
        totalRuns,
        averageSuccessRate,
        averageExecutionTime
      },
      flowMetrics,
      performanceData
    };
  }

  /**
   * Get flow execution errors and issues
   */
  async getFlowErrors(flowId: string, limit: number = 50): Promise<{
    errors: Array<{
      runId: string;
      timestamp: Date;
      error: string;
      nodeId?: string;
      nodeLabel?: string;
      stepIndex?: number;
    }>;
    errorPatterns: Array<{
      errorType: string;
      count: number;
      lastOccurred: Date;
      affectedNodes: string[];
    }>;
  }> {
    // Get recent failed runs
    const failedRuns = await prisma.flowRun.findMany({
      where: {
        flowVersion: {
          flowId
        },
        status: 'FAILED'
      },
      include: {
        steps: true
      },
      orderBy: { startedAt: 'desc' },
      take: limit
    });

    const errors: any[] = [];
    const errorCounts: Map<string, { count: number; lastOccurred: Date; nodes: Set<string> }> = new Map();

    for (const run of failedRuns) {
      // Find failed steps
      const failedSteps = run.steps.filter(step => step.status === 'FAILED');
      
      for (const step of failedSteps) {
        if (step.output) {
          try {
            const output = JSON.parse(step.output);
            if (output.error) {
              const errorMessage = output.error;
              
              errors.push({
                runId: run.id,
                timestamp: step.finishedAt || step.startedAt,
                error: errorMessage,
                nodeId: step.nodeId,
                stepIndex: run.steps.indexOf(step)
              });

              // Track error patterns
              const errorType = this.categorizeError(errorMessage);
              const existing = errorCounts.get(errorType) || { count: 0, lastOccurred: step.startedAt, nodes: new Set() };
              existing.count++;
              existing.lastOccurred = step.finishedAt || step.startedAt;
              existing.nodes.add(step.nodeId);
              errorCounts.set(errorType, existing);
            }
          } catch {
            // Ignore JSON parse errors
          }
        }
      }
    }

    const errorPatterns = Array.from(errorCounts.entries()).map(([errorType, data]) => ({
      errorType,
      count: data.count,
      lastOccurred: data.lastOccurred,
      affectedNodes: Array.from(data.nodes)
    })).sort((a, b) => b.count - a.count);

    return {
      errors,
      errorPatterns
    };
  }

  /**
   * Calculate execution trends
   */
  private calculateExecutionTrends(runs: any[], timeRange: string): FlowExecutionTrend[] {
    const trends: FlowExecutionTrend[] = [];
    const now = new Date();
    
    // Determine period size based on time range
    const periodSizes = {
      '1h': 10 * 60 * 1000, // 10 minutes
      '24h': 60 * 60 * 1000, // 1 hour
      '7d': 4 * 60 * 60 * 1000, // 4 hours
      '30d': 24 * 60 * 60 * 1000 // 1 day
    };

    const periodSize = periodSizes[timeRange as keyof typeof periodSizes];
    const periods = timeRange === '1h' ? 6 : timeRange === '24h' ? 24 : timeRange === '7d' ? 42 : 30;

    for (let i = periods - 1; i >= 0; i--) {
      const periodEnd = new Date(now.getTime() - i * periodSize);
      const periodStart = new Date(periodEnd.getTime() - periodSize);

      const periodRuns = runs.filter(r => 
        r.startedAt >= periodStart && r.startedAt < periodEnd
      );

      const executions = periodRuns.length;
      const successes = periodRuns.filter(r => r.status === 'COMPLETED').length;
      const failures = periodRuns.filter(r => r.status === 'FAILED').length;
      
      const completedRuns = periodRuns.filter(r => r.finishedAt);
      const totalTime = completedRuns.reduce((sum, run) => {
        if (run.finishedAt) {
          return sum + (run.finishedAt.getTime() - run.startedAt.getTime());
        }
        return sum;
      }, 0);
      
      const averageTime = completedRuns.length > 0 ? totalTime / completedRuns.length / 1000 : 0;

      trends.push({
        period: periodStart.toISOString(),
        executions,
        successes,
        failures,
        averageTime
      });
    }

    return trends;
  }

  /**
   * Calculate node-level metrics
   */
  private async calculateNodeMetrics(flowId: string, since: Date): Promise<FlowNodeMetrics[]> {
    const steps = await prisma.flowRunStep.findMany({
      where: {
        flowRun: {
          flowVersion: {
            flowId
          },
          startedAt: {
            gte: since
          }
        }
      },
      include: {
        flowRun: {
          include: {
            flowVersion: {
              include: {
                nodes: true
              }
            }
          }
        }
      }
    });

    const nodeMetricsMap = new Map<string, {
      nodeType: string;
      nodeLabel: string;
      executions: number;
      successes: number;
      failures: number;
      totalTime: number;
    }>();

    for (const step of steps) {
      const node = step.flowRun.flowVersion.nodes.find(n => n.id === step.nodeId);
      if (!node) continue;

      const existing = nodeMetricsMap.get(step.nodeId) || {
        nodeType: node.type,
        nodeLabel: node.label,
        executions: 0,
        successes: 0,
        failures: 0,
        totalTime: 0
      };

      existing.executions++;
      if (step.status === 'COMPLETED') existing.successes++;
      if (step.status === 'FAILED') existing.failures++;
      
      if (step.finishedAt) {
        existing.totalTime += step.finishedAt.getTime() - step.startedAt.getTime();
      }

      nodeMetricsMap.set(step.nodeId, existing);
    }

    return Array.from(nodeMetricsMap.entries()).map(([nodeId, data]) => ({
      nodeId,
      nodeType: data.nodeType,
      nodeLabel: data.nodeLabel,
      executionCount: data.executions,
      successCount: data.successes,
      failureCount: data.failures,
      averageExecutionTime: data.executions > 0 ? data.totalTime / data.executions / 1000 : 0,
      errorRate: data.executions > 0 ? (data.failures / data.executions) * 100 : 0
    }));
  }

  /**
   * Calculate alert level for a flow
   */
  private async calculateAlertLevel(flowId: string): Promise<{ alertLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; issues: string[] }> {
    const issues: string[] = [];
    let alertLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

    // Check recent failure rate
    const recentRuns = await prisma.flowRun.findMany({
      where: {
        flowVersion: {
          flowId
        },
        startedAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      }
    });

    if (recentRuns.length > 0) {
      const failureRate = recentRuns.filter(r => r.status === 'FAILED').length / recentRuns.length;
      
      if (failureRate > 0.5) {
        alertLevel = 'CRITICAL';
        issues.push(`High failure rate: ${Math.round(failureRate * 100)}%`);
      } else if (failureRate > 0.2) {
        alertLevel = 'HIGH';
        issues.push(`Elevated failure rate: ${Math.round(failureRate * 100)}%`);
      } else if (failureRate > 0.1) {
        alertLevel = 'MEDIUM';
        issues.push(`Moderate failure rate: ${Math.round(failureRate * 100)}%`);
      }
    }

    // Check for stuck runs
    const stuckRuns = await prisma.flowRun.count({
      where: {
        flowVersion: {
          flowId
        },
        status: 'RUNNING',
        startedAt: {
          lt: new Date(Date.now() - 30 * 60 * 1000) // Running for more than 30 minutes
        }
      }
    });

    if (stuckRuns > 0) {
      if (alertLevel < 'HIGH') alertLevel = 'HIGH';
      issues.push(`${stuckRuns} potentially stuck executions`);
    }

    return { alertLevel, issues };
  }

  /**
   * Categorize errors for pattern detection
   */
  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'Timeout Error';
    }
    if (message.includes('network') || message.includes('connection')) {
      return 'Network Error';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Validation Error';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'Permission Error';
    }
    if (message.includes('database') || message.includes('sql')) {
      return 'Database Error';
    }
    
    return 'General Error';
  }

  /**
   * Generate performance data points for charting
   */
  private generatePerformanceDataPoints(runs: any[], aggregation: string): FlowPerformanceData[] {
    const dataPoints: FlowPerformanceData[] = [];
    const now = new Date();
    
    const aggregationSizes = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    };

    const size = aggregationSizes[aggregation as keyof typeof aggregationSizes];
    const periods = aggregation === 'hour' ? 24 : aggregation === 'day' ? 30 : 4;

    for (let i = periods - 1; i >= 0; i--) {
      const periodEnd = new Date(now.getTime() - i * size);
      const periodStart = new Date(periodEnd.getTime() - size);

      const periodRuns = runs.filter(r => 
        r.startedAt >= periodStart && r.startedAt < periodEnd
      );

      const completedRuns = periodRuns.filter(r => r.finishedAt);
      const totalTime = completedRuns.reduce((sum, run) => {
        if (run.finishedAt) {
          return sum + (run.finishedAt.getTime() - run.startedAt.getTime());
        }
        return sum;
      }, 0);

      const averageExecutionTime = completedRuns.length > 0 ? totalTime / completedRuns.length / 1000 : 0;
      const errorCount = periodRuns.filter(r => r.status === 'FAILED').length;

      // Get average node count (approximation)
      const nodeCount = periodRuns.length > 0 ? 
        periodRuns.reduce((sum, run) => sum + (run.steps?.length || 0), 0) / periodRuns.length : 0;

      dataPoints.push({
        timestamp: periodStart,
        executionTime: averageExecutionTime,
        status: periodRuns.length > 0 ? 'active' : 'inactive',
        nodeCount: Math.round(nodeCount),
        errorCount
      });
    }

    return dataPoints;
  }
}

export const flowMonitoringService = new FlowMonitoringService();