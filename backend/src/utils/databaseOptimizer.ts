/**
 * Database Query Optimizer
 * 
 * This module provides utilities for analyzing and optimizing database queries
 * to improve overall application performance.
 */

import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logging';
import { MetricsCollector } from '../utils/metrics';

// Extend Prisma client to add query monitoring
interface QueryEvent {
  timestamp: string;
  query: string;
  params: string;
  duration: number;
  target: string;
}

class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  private prisma: PrismaClient;
  private queryHistory: QueryEvent[] = [];
  private slowQueries: Map<string, { count: number; totalDuration: number; avgDuration: number }> = new Map();
  private metricsCollector: MetricsCollector;

  public static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer();
    }
    return DatabaseOptimizer.instance;
  }

  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error']
    });
    this.metricsCollector = MetricsCollector.getInstance();
    this.setupQueryMonitoring();
  }

  /**
   * Setup query monitoring and logging
   */
  private setupQueryMonitoring(): void {
    // Use Prisma middleware for query monitoring
    this.prisma.$use(async (params, next) => {
      const start = Date.now();
      
      try {
        const result = await next(params);
        const duration = Date.now() - start;
        
        // Track query performance
        this.trackQueryPerformance(params, duration, true);
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        
        // Track failed queries
        this.trackQueryPerformance(params, duration, false);
        
        throw error;
      }
    });
    
    logger.info('Database monitoring initialized with middleware');
  }

  /**
   * Track query performance using middleware
   */
  private trackQueryPerformance(params: any, duration: number, success: boolean): void {
    const queryEvent: QueryEvent = {
      timestamp: new Date().toISOString(),
      query: `${params.action} on ${params.model}`,
      params: JSON.stringify(params.args || {}),
      duration,
      target: params.model || 'unknown'
    };

    this.queryHistory.push(queryEvent);

    // Keep only last 1000 queries
    if (this.queryHistory.length > 1000) {
      this.queryHistory = this.queryHistory.slice(-1000);
    }

    // Track slow queries (> 100ms)
    if (duration > 100) {
      this.trackSlowQuery(queryEvent.query, duration);
      
      logger.warn('Slow database query detected', {
        duration,
        query: queryEvent.query,
        model: params.model,
        action: params.action
      });
    }

    // Record database operation metrics
    this.metricsCollector.recordDatabaseOperation(
      params.action || 'unknown',
      params.model || 'unknown',
      duration,
      success
    );
  }

  /**
   * Track slow queries for analysis
   */
  private trackSlowQuery(query: string, duration: number): void {
    const querySignature = this.getQuerySignature(query);
    const existing = this.slowQueries.get(querySignature);

    if (existing) {
      existing.count += 1;
      existing.totalDuration += duration;
      existing.avgDuration = existing.totalDuration / existing.count;
    } else {
      this.slowQueries.set(querySignature, {
        count: 1,
        totalDuration: duration,
        avgDuration: duration
      });
    }
  }

  /**
   * Extract operation type from query
   */
  private extractOperationType(query: string): string {
    const operation = query.trim().split(' ')[0].toUpperCase();
    return operation || 'UNKNOWN';
  }

  /**
   * Extract model name from query
   */
  private extractModelName(query: string): string {
    const match = query.match(/FROM `?(\w+)`?/i) || query.match(/UPDATE `?(\w+)`?/i) || query.match(/INSERT INTO `?(\w+)`?/i);
    return match ? match[1] : 'UNKNOWN';
  }

  /**
   * Get query signature by removing parameters
   */
  private getQuerySignature(query: string): string {
    // Replace parameter placeholders with generic markers
    return query.replace(/\$\d+/g, '?').replace(/'\w+'/g, "'?'").substring(0, 200);
  }

  /**
   * Get database performance analytics
   */
  public getPerformanceAnalytics(): {
    totalQueries: number;
    slowQueries: number;
    averageDuration: number;
    topSlowQueries: Array<{ signature: string; count: number; avgDuration: number }>;
    operationBreakdown: Record<string, { count: number; avgDuration: number }>;
    recentTrend: 'improving' | 'degrading' | 'stable';
  } {
    const totalQueries = this.queryHistory.length;
    const slowQueries = this.queryHistory.filter(q => q.duration > 100).length;
    const averageDuration = this.queryHistory.length > 0 
      ? this.queryHistory.reduce((sum, q) => sum + q.duration, 0) / this.queryHistory.length 
      : 0;

    // Top slow queries
    const topSlowQueries = Array.from(this.slowQueries.entries())
      .map(([signature, stats]) => ({ signature, ...stats }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    // Operation breakdown
    const operationBreakdown: Record<string, { count: number; totalDuration: number; avgDuration: number }> = {};
    this.queryHistory.forEach(query => {
      const op = this.extractOperationType(query.query);
      if (!operationBreakdown[op]) {
        operationBreakdown[op] = { count: 0, totalDuration: 0, avgDuration: 0 };
      }
      operationBreakdown[op].count++;
      operationBreakdown[op].totalDuration += query.duration;
      operationBreakdown[op].avgDuration = operationBreakdown[op].totalDuration / operationBreakdown[op].count;
    });

    // Calculate trend (comparing last 100 vs previous 100 queries)
    let recentTrend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (this.queryHistory.length >= 200) {
      const recent100 = this.queryHistory.slice(-100);
      const previous100 = this.queryHistory.slice(-200, -100);
      
      const recentAvg = recent100.reduce((sum, q) => sum + q.duration, 0) / 100;
      const previousAvg = previous100.reduce((sum, q) => sum + q.duration, 0) / 100;
      
      if (recentAvg > previousAvg * 1.2) {
        recentTrend = 'degrading';
      } else if (recentAvg < previousAvg * 0.8) {
        recentTrend = 'improving';
      }
    }

    return {
      totalQueries,
      slowQueries,
      averageDuration,
      topSlowQueries,
      operationBreakdown: Object.fromEntries(
        Object.entries(operationBreakdown).map(([op, stats]) => [op, { count: stats.count, avgDuration: stats.avgDuration }])
      ),
      recentTrend
    };
  }

  /**
   * Optimize common query patterns
   */
  public async analyzeAndOptimize(): Promise<{
    recommendations: string[];
    potentialImprovements: Array<{ issue: string; solution: string; priority: 'high' | 'medium' | 'low' }>;
  }> {
    const analytics = this.getPerformanceAnalytics();
    const recommendations: string[] = [];
    const potentialImprovements: Array<{ issue: string; solution: string; priority: 'high' | 'medium' | 'low' }> = [];

    // Analyze slow queries
    if (analytics.slowQueries > analytics.totalQueries * 0.1) {
      recommendations.push('High number of slow queries detected. Consider adding database indexes.');
      potentialImprovements.push({
        issue: `${analytics.slowQueries} out of ${analytics.totalQueries} queries are slow (>100ms)`,
        solution: 'Add database indexes for frequently queried columns',
        priority: 'high'
      });
    }

    // Analyze N+1 queries
    const selectCount = analytics.operationBreakdown.SELECT?.count || 0;
    if (selectCount > analytics.totalQueries * 0.8) {
      recommendations.push('High SELECT query ratio suggests possible N+1 query problems. Use eager loading with includes.');
      potentialImprovements.push({
        issue: 'Too many SELECT queries may indicate N+1 query problem',
        solution: 'Use Prisma include/select to reduce query count',
        priority: 'medium'
      });
    }

    // Analyze average response time
    if (analytics.averageDuration > 50) {
      recommendations.push('Average query duration is high. Consider query optimization or database scaling.');
      potentialImprovements.push({
        issue: `Average query duration is ${analytics.averageDuration.toFixed(2)}ms`,
        solution: 'Optimize slow queries or consider database connection pooling',
        priority: analytics.averageDuration > 100 ? 'high' : 'medium'
      });
    }

    // Check for trending issues
    if (analytics.recentTrend === 'degrading') {
      recommendations.push('Database performance is degrading over time. Monitor system resources and query patterns.');
      potentialImprovements.push({
        issue: 'Database performance trending downward',
        solution: 'Investigate recent changes and monitor system resources',
        priority: 'high'
      });
    }

    return { recommendations, potentialImprovements };
  }

  /**
   * Create optimized query patterns for common operations
   */
  public getOptimizedQueries(): Record<string, string> {
    return {
      // Optimized user queries with campaign access
      getUserWithCampaigns: `
        // Instead of multiple queries, use single query with includes
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            campaignAssignments: {
              where: { isActive: true },
              include: {
                campaign: {
                  select: { id: true, name: true, status: true }
                }
              }
            }
          }
        });
      `,

      // Optimized campaign queries with related data
      getCampaignWithStats: `
        // Use aggregation instead of multiple count queries
        const campaignWithStats = await prisma.campaign.findUnique({
          where: { id: campaignId },
          include: {
            _count: {
              select: {
                calls: true,
                campaignAgents: true,
                campaignLists: true
              }
            },
            calls: {
              take: 10,
              orderBy: { startTime: 'desc' },
              select: {
                id: true,
                status: true,
                startTime: true,
                duration: true
              }
            }
          }
        });
      `,

      // Optimized pagination
      paginatedUsers: `
        // Use cursor-based pagination for better performance
        const users = await prisma.user.findMany({
          cursor: lastUserId ? { id: lastUserId } : undefined,
          take: limit + 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        });
        const hasMore = users.length > limit;
        if (hasMore) users.pop();
      `,

      // Optimized search with full-text search
      searchUsers: `
        // Use database full-text search instead of LIKE queries
        const users = await prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } }
            ]
          },
          take: limit,
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        });
      `,

      // Batch operations for better performance
      batchCreateRecords: `
        // Use createMany for batch inserts
        const result = await prisma.campaignRecord.createMany({
          data: records.map(record => ({
            campaignId,
            name: record.name,
            phone: record.phone,
            email: record.email,
            data: JSON.stringify(record.customData)
          })),
          skipDuplicates: true
        });
      `
    };
  }

  /**
   * Get recent query history for debugging
   */
  public getRecentQueries(limit: number = 50): QueryEvent[] {
    return this.queryHistory.slice(-limit);
  }

  /**
   * Clear query history
   */
  public clearHistory(): void {
    this.queryHistory = [];
    this.slowQueries.clear();
    logger.info('Database query history cleared');
  }

  /**
   * Get database connection info
   */
  public async getConnectionInfo(): Promise<any> {
    try {
      // Test connection and get some basic info
      const result = await this.prisma.$queryRaw`SELECT 1 as connected`;
      const userCount = await this.prisma.user.count();
      const campaignCount = await this.prisma.campaign.count();
      
      return {
        connected: true,
        userCount,
        campaignCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get Prisma client instance
   */
  public getPrisma(): PrismaClient {
    return this.prisma;
  }
}

/**
 * Performance monitoring decorator for database operations
 */
export function monitorDbPerformance(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = async function (...args: any[]) {
    const startTime = performance.now();
    const metricsCollector = MetricsCollector.getInstance();
    
    try {
      const result = await method.apply(this, args);
      const duration = performance.now() - startTime;
      
      // Record successful database operation
      metricsCollector.recordDatabaseOperation(
        propertyName,
        target.constructor.name,
        duration,
        true
      );
      
      // Log slow operations
      if (duration > 1000) { // > 1 second
        logger.warn('Slow database operation', {
          method: `${target.constructor.name}.${propertyName}`,
          duration,
          args: args.length
        });
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Record failed database operation
      metricsCollector.recordDatabaseOperation(
        propertyName,
        target.constructor.name,
        duration,
        false
      );
      
      logger.error('Database operation failed', {
        method: `${target.constructor.name}.${propertyName}`,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  };
}

export { DatabaseOptimizer };
export default DatabaseOptimizer.getInstance();