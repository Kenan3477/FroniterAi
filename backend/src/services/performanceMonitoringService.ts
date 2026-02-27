/**
 * Performance Monitoring Service
 * Tracks system performance, analysis accuracy, and optimization metrics
 */

import { EventEmitter } from 'events';
import { prisma } from '../database';

interface PerformanceMetric {
  id: string;
  timestamp: Date;
  metric: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
}

interface AnalysisAccuracy {
  analysisId: string;
  callId: string;
  timestamp: Date;
  predictedResult: 'answering_machine' | 'human' | 'unknown';
  actualResult?: 'answering_machine' | 'human';
  confidence: number;
  detectionMethod: string;
  timeToDetection: number;
  wasCorrect?: boolean;
}

interface SystemPerformance {
  timestamp: Date;
  activeCalls: number;
  averageProcessingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
  throughput: number;
}

interface AccuracyReport {
  period: string;
  totalAnalyses: number;
  correctPredictions: number;
  accuracy: number;
  byDetectionMethod: Record<string, {
    total: number;
    correct: number;
    accuracy: number;
    averageConfidence: number;
    averageTimeToDetection: number;
  }>;
  falsePositives: number;
  falseNegatives: number;
  highConfidenceAccuracy: number;
}

export class PerformanceMonitoringService extends EventEmitter {
  private metrics: PerformanceMetric[] = [];
  private accuracyData: AnalysisAccuracy[] = [];
  private systemMetrics: SystemPerformance[] = [];
  private maxDataRetention = 10000; // Keep last 10k records
  
  // Performance tracking
  private processingTimes: number[] = [];
  private errorCounts: { [key: string]: number } = {};
  private operationCounts: { [key: string]: number } = {};

  constructor() {
    super();
    this.startPerformanceMonitoring();
    console.log('📊 Performance Monitoring Service initialized');
  }

  /**
   * Record a performance metric
   */
  public recordMetric(
    metric: string,
    value: number,
    unit: string = 'count',
    tags: Record<string, string> = {}
  ): void {
    const performanceMetric: PerformanceMetric = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      metric,
      value,
      unit,
      tags
    };

    this.metrics.push(performanceMetric);
    this.trimData('metrics');

    // Emit for real-time monitoring
    this.emit('metric_recorded', performanceMetric);

    // Log significant metrics
    if (metric.includes('error') || metric.includes('failure') || value > 1000) {
      console.log(`📊 ${metric}: ${value} ${unit}`, tags);
    }
  }

  /**
   * Record analysis accuracy data
   */
  public recordAnalysisAccuracy(data: {
    callId: string;
    predictedResult: 'answering_machine' | 'human' | 'unknown';
    actualResult: 'answering_machine' | 'human';
    confidence: number;
    detectionMethod: string;
    timeToDetection: number;
  }): void {
    const accuracy: AnalysisAccuracy = {
      analysisId: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      wasCorrect: data.predictedResult === data.actualResult,
      ...data
    };

    this.accuracyData.push(accuracy);
    this.trimData('accuracy');

    // Record metrics based on accuracy
    this.recordMetric('analysis.accuracy', accuracy.wasCorrect ? 1 : 0, 'boolean', {
      method: data.detectionMethod,
      confidence: data.confidence.toString()
    });

    this.recordMetric('analysis.time_to_detection', data.timeToDetection, 'ms', {
      method: data.detectionMethod,
      result: data.actualResult
    });

    // Emit for real-time monitoring
    this.emit('accuracy_recorded', accuracy);
  }

  /**
   * Record processing time for an operation
   */
  public recordProcessingTime(operation: string, startTime: number): void {
    const processingTime = Date.now() - startTime;
    this.processingTimes.push(processingTime);

    // Keep only last 1000 processing times
    if (this.processingTimes.length > 1000) {
      this.processingTimes = this.processingTimes.slice(-1000);
    }

    this.recordMetric(`processing.${operation}`, processingTime, 'ms');
    this.operationCounts[operation] = (this.operationCounts[operation] || 0) + 1;
  }

  /**
   * Record an error occurrence
   */
  public recordError(errorType: string, details?: Record<string, any>): void {
    this.errorCounts[errorType] = (this.errorCounts[errorType] || 0) + 1;
    
    this.recordMetric('system.error', 1, 'count', {
      type: errorType,
      ...details
    });

    console.error(`❌ Error recorded: ${errorType}`, details);
  }

  /**
   * Get real-time performance dashboard data
   */
  public getPerformanceDashboard(): any {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Recent metrics
    const recentMetrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
    const recentAccuracy = this.accuracyData.filter(a => a.timestamp > oneHourAgo);

    // System performance
    const averageProcessingTime = this.processingTimes.length > 0 
      ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
      : 0;

    const totalErrors = Object.values(this.errorCounts).reduce((a, b) => a + b, 0);
    const totalOperations = Object.values(this.operationCounts).reduce((a, b) => a + b, 0);
    const errorRate = totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0;

    // Analysis accuracy
    const correctAnalyses = recentAccuracy.filter(a => a.wasCorrect).length;
    const totalAnalyses = recentAccuracy.length;
    const accuracyRate = totalAnalyses > 0 ? (correctAnalyses / totalAnalyses) * 100 : 0;

    return {
      timestamp: now,
      performance: {
        averageProcessingTime: Math.round(averageProcessingTime),
        errorRate: Math.round(errorRate * 100) / 100,
        throughput: this.calculateThroughput(oneHourAgo),
        memoryUsage: this.getMemoryUsage(),
        activeCalls: this.getActiveCallCount()
      },
      accuracy: {
        rate: Math.round(accuracyRate * 100) / 100,
        totalAnalyses,
        correctAnalyses,
        byMethod: this.getAccuracyByMethod(recentAccuracy)
      },
      metrics: {
        hour: this.aggregateMetrics(recentMetrics, 'hour'),
        day: this.aggregateMetrics(
          this.metrics.filter(m => m.timestamp > oneDayAgo), 
          'day'
        )
      },
      errors: this.getErrorSummary(),
      operations: this.operationCounts
    };
  }

  /**
   * Generate comprehensive accuracy report
   */
  public generateAccuracyReport(
    startDate: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: Date = new Date()
  ): AccuracyReport {
    const periodData = this.accuracyData.filter(
      a => a.timestamp >= startDate && a.timestamp <= endDate
    );

    const totalAnalyses = periodData.length;
    const correctPredictions = periodData.filter(a => a.wasCorrect).length;
    const accuracy = totalAnalyses > 0 ? correctPredictions / totalAnalyses : 0;

    // Group by detection method
    const byDetectionMethod: Record<string, any> = {};
    
    for (const analysis of periodData) {
      const method = analysis.detectionMethod;
      
      if (!byDetectionMethod[method]) {
        byDetectionMethod[method] = {
          total: 0,
          correct: 0,
          accuracy: 0,
          confidences: [],
          detectionTimes: []
        };
      }

      byDetectionMethod[method].total++;
      if (analysis.wasCorrect) byDetectionMethod[method].correct++;
      byDetectionMethod[method].confidences.push(analysis.confidence);
      byDetectionMethod[method].detectionTimes.push(analysis.timeToDetection);
    }

    // Calculate averages for each method
    for (const method in byDetectionMethod) {
      const data = byDetectionMethod[method];
      data.accuracy = data.total > 0 ? data.correct / data.total : 0;
      data.averageConfidence = data.confidences.reduce((a: number, b: number) => a + b, 0) / data.confidences.length;
      data.averageTimeToDetection = data.detectionTimes.reduce((a: number, b: number) => a + b, 0) / data.detectionTimes.length;
      
      // Clean up arrays
      delete data.confidences;
      delete data.detectionTimes;
    }

    // Calculate false positives/negatives
    const falsePositives = periodData.filter(
      a => a.predictedResult === 'answering_machine' && a.actualResult === 'human'
    ).length;
    
    const falseNegatives = periodData.filter(
      a => a.predictedResult === 'human' && a.actualResult === 'answering_machine'
    ).length;

    // High confidence accuracy (confidence > 0.8)
    const highConfidenceAnalyses = periodData.filter(a => a.confidence > 0.8);
    const highConfidenceCorrect = highConfidenceAnalyses.filter(a => a.wasCorrect).length;
    const highConfidenceAccuracy = highConfidenceAnalyses.length > 0 
      ? highConfidenceCorrect / highConfidenceAnalyses.length 
      : 0;

    return {
      period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      totalAnalyses,
      correctPredictions,
      accuracy,
      byDetectionMethod,
      falsePositives,
      falseNegatives,
      highConfidenceAccuracy
    };
  }

  // Helper methods
  private startPerformanceMonitoring(): void {
    // Record system metrics every minute
    setInterval(() => {
      const systemMetric: SystemPerformance = {
        timestamp: new Date(),
        activeCalls: this.getActiveCallCount(),
        averageProcessingTime: this.processingTimes.length > 0 
          ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
          : 0,
        memoryUsage: this.getMemoryUsage(),
        cpuUsage: 0, // Would require additional monitoring
        errorRate: this.calculateErrorRate(),
        throughput: this.calculateThroughput(new Date(Date.now() - 60 * 1000))
      };

      this.systemMetrics.push(systemMetric);
      this.trimData('system');

      // Record as metrics
      this.recordMetric('system.active_calls', systemMetric.activeCalls);
      this.recordMetric('system.memory_usage', systemMetric.memoryUsage, 'MB');
      this.recordMetric('system.throughput', systemMetric.throughput, 'ops/min');

    }, 60000); // Every minute
  }

  private trimData(type: 'metrics' | 'accuracy' | 'system'): void {
    if (type === 'metrics' && this.metrics.length > this.maxDataRetention) {
      this.metrics = this.metrics.slice(-this.maxDataRetention);
    } else if (type === 'accuracy' && this.accuracyData.length > this.maxDataRetention) {
      this.accuracyData = this.accuracyData.slice(-this.maxDataRetention);
    } else if (type === 'system' && this.systemMetrics.length > this.maxDataRetention) {
      this.systemMetrics = this.systemMetrics.slice(-this.maxDataRetention);
    }
  }

  private calculateThroughput(since: Date): number {
    const operations = this.metrics.filter(
      m => m.timestamp > since && m.metric.includes('processing')
    ).length;
    
    const minutes = (Date.now() - since.getTime()) / (1000 * 60);
    return minutes > 0 ? operations / minutes : 0;
  }

  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024); // MB
  }

  private getActiveCallCount(): number {
    // This would integrate with the actual call tracking system
    return 0; // Placeholder
  }

  private calculateErrorRate(): number {
    const totalErrors = Object.values(this.errorCounts).reduce((a, b) => a + b, 0);
    const totalOperations = Object.values(this.operationCounts).reduce((a, b) => a + b, 0);
    return totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0;
  }

  private aggregateMetrics(metrics: PerformanceMetric[], period: 'hour' | 'day'): any {
    const aggregated: Record<string, { sum: number; count: number; avg: number; max: number; min: number }> = {};

    for (const metric of metrics) {
      if (!aggregated[metric.metric]) {
        aggregated[metric.metric] = {
          sum: 0,
          count: 0,
          avg: 0,
          max: -Infinity,
          min: Infinity
        };
      }

      const agg = aggregated[metric.metric];
      agg.sum += metric.value;
      agg.count++;
      agg.max = Math.max(agg.max, metric.value);
      agg.min = Math.min(agg.min, metric.value);
    }

    // Calculate averages
    for (const key in aggregated) {
      aggregated[key].avg = aggregated[key].count > 0 
        ? aggregated[key].sum / aggregated[key].count 
        : 0;
    }

    return aggregated;
  }

  private getAccuracyByMethod(accuracyData: AnalysisAccuracy[]): any {
    const byMethod: Record<string, { total: number; correct: number; rate: number }> = {};

    for (const analysis of accuracyData) {
      if (!byMethod[analysis.detectionMethod]) {
        byMethod[analysis.detectionMethod] = { total: 0, correct: 0, rate: 0 };
      }

      byMethod[analysis.detectionMethod].total++;
      if (analysis.wasCorrect) byMethod[analysis.detectionMethod].correct++;
    }

    // Calculate rates
    for (const method in byMethod) {
      const data = byMethod[method];
      data.rate = data.total > 0 ? (data.correct / data.total) * 100 : 0;
    }

    return byMethod;
  }

  private getErrorSummary(): Record<string, number> {
    return { ...this.errorCounts };
  }

  // Public API methods
  public getMetrics(since?: Date): PerformanceMetric[] {
    if (since) {
      return this.metrics.filter(m => m.timestamp >= since);
    }
    return [...this.metrics];
  }

  public getAccuracyData(since?: Date): AnalysisAccuracy[] {
    if (since) {
      return this.accuracyData.filter(a => a.timestamp >= since);
    }
    return [...this.accuracyData];
  }

  public resetCounters(): void {
    this.errorCounts = {};
    this.operationCounts = {};
    this.processingTimes = [];
    console.log('📊 Performance counters reset');
  }

  public exportData(format: 'json' | 'csv' = 'json'): any {
    const data = {
      metrics: this.metrics,
      accuracy: this.accuracyData,
      system: this.systemMetrics,
      summary: this.getPerformanceDashboard()
    };

    if (format === 'json') {
      return data;
    }

    // CSV export would require additional formatting
    return JSON.stringify(data, null, 2);
  }
}

// Singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();
export default performanceMonitoringService;