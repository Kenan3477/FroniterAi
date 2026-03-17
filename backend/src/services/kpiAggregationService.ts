// KPI Aggregation Service
import { kpiEvents, systemEvents } from '../utils/eventHelpers';
import { EventPriority } from '../types/events';
import { redisClient } from '../config/redis';

// KPI metric types
export enum KPIMetricType {
  // Call volume metrics
  TOTAL_CALLS = 'total_calls',
  ANSWERED_CALLS = 'answered_calls',
  MISSED_CALLS = 'missed_calls',
  ABANDONED_CALLS = 'abandoned_calls',
  
  // Performance metrics
  AVERAGE_CALL_DURATION = 'average_call_duration',
  AVERAGE_WAIT_TIME = 'average_wait_time',
  FIRST_CALL_RESOLUTION = 'first_call_resolution',
  CALL_RESOLUTION_TIME = 'call_resolution_time',
  
  // Agent metrics
  AGENT_UTILIZATION = 'agent_utilization',
  AGENT_AVAILABILITY = 'agent_availability',
  CALLS_PER_AGENT = 'calls_per_agent',
  AGENT_IDLE_TIME = 'agent_idle_time',
  
  // Quality metrics
  AVERAGE_QA_SCORE = 'average_qa_score',
  CUSTOMER_SATISFACTION = 'customer_satisfaction',
  CALL_QUALITY_RATE = 'call_quality_rate',
  
  // Conversion metrics
  CONVERSION_RATE = 'conversion_rate',
  LEAD_CONVERSION = 'lead_conversion',
  SALES_VOLUME = 'sales_volume',
  REVENUE_PER_CALL = 'revenue_per_call',
  
  // System metrics
  SERVICE_LEVEL = 'service_level', // % calls answered within X seconds
  ABANDONMENT_RATE = 'abandonment_rate',
  OCCUPANCY_RATE = 'occupancy_rate',
  CONCURRENCY_RATE = 'concurrency_rate',
}

// KPI aggregation periods
export enum AggregationPeriod {
  REAL_TIME = 'real_time',
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

// KPI threshold configuration
interface KPIThreshold {
  id: string;
  metricType: KPIMetricType;
  warningValue: number;
  criticalValue: number;
  comparisonOperator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  isEnabled: boolean;
  notificationChannels: string[];
  metadata: Record<string, any>;
}

// KPI metric data point
interface KPIDataPoint {
  metricType: KPIMetricType;
  value: number;
  timestamp: Date;
  period: AggregationPeriod;
  dimensions: {
    agentId?: string;
    campaignId?: string;
    departmentId?: string;
    skillId?: string;
  };
  metadata: Record<string, any>;
}

// KPI metric summary
interface KPIMetricSummary {
  metricType: KPIMetricType;
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
  thresholdStatus: 'normal' | 'warning' | 'critical';
  lastUpdated: Date;
}

// Comprehensive KPI dashboard data
interface KPIDashboard {
  overview: {
    totalCalls: number;
    totalAgents: number;
    activeAgents: number;
    queueLength: number;
    serviceLevel: number;
    abandonmentRate: number;
  };
  realTimeMetrics: KPIMetricSummary[];
  trends: {
    hourly: KPIDataPoint[];
    daily: KPIDataPoint[];
    weekly: KPIDataPoint[];
  };
  agentPerformance: {
    agentId: string;
    agentName: string;
    callsHandled: number;
    averageCallDuration: number;
    utilization: number;
    qaScore: number;
  }[];
  campaignPerformance: {
    campaignId: string;
    campaignName: string;
    callsDialed: number;
    contactRate: number;
    conversionRate: number;
    revenue: number;
  }[];
  alerts: {
    id: string;
    metricType: KPIMetricType;
    severity: 'warning' | 'critical';
    message: string;
    timestamp: Date;
  }[];
}

// Default KPI thresholds
const DEFAULT_THRESHOLDS: KPIThreshold[] = [
  {
    id: 'service_level_warning',
    metricType: KPIMetricType.SERVICE_LEVEL,
    warningValue: 80,
    criticalValue: 70,
    comparisonOperator: '<',
    isEnabled: true,
    notificationChannels: ['dashboard', 'email'],
    metadata: { description: 'Service level below target' },
  },
  {
    id: 'abandonment_rate_warning',
    metricType: KPIMetricType.ABANDONMENT_RATE,
    warningValue: 5,
    criticalValue: 10,
    comparisonOperator: '>',
    isEnabled: true,
    notificationChannels: ['dashboard', 'slack'],
    metadata: { description: 'High call abandonment rate' },
  },
  {
    id: 'average_wait_time_warning',
    metricType: KPIMetricType.AVERAGE_WAIT_TIME,
    warningValue: 60,
    criticalValue: 120,
    comparisonOperator: '>',
    isEnabled: true,
    notificationChannels: ['dashboard'],
    metadata: { description: 'Long average wait time' },
  },
  {
    id: 'agent_utilization_low',
    metricType: KPIMetricType.AGENT_UTILIZATION,
    warningValue: 60,
    criticalValue: 40,
    comparisonOperator: '<',
    isEnabled: true,
    notificationChannels: ['dashboard'],
    metadata: { description: 'Low agent utilization' },
  },
  {
    id: 'agent_utilization_high',
    metricType: KPIMetricType.AGENT_UTILIZATION,
    warningValue: 90,
    criticalValue: 95,
    comparisonOperator: '>',
    isEnabled: true,
    notificationChannels: ['dashboard', 'email'],
    metadata: { description: 'Agent overutilization' },
  },
];

class KPIAggregationService {
  private thresholds: Map<string, KPIThreshold> = new Map();
  private metricsCache: Map<string, KPIDataPoint[]> = new Map();
  private lastCalculation: Map<string, Date> = new Map();

  constructor() {
    this.loadDefaultThresholds();
    this.startRealTimeAggregation();
  }

  /**
   * Load default KPI thresholds
   */
  private loadDefaultThresholds(): void {
    DEFAULT_THRESHOLDS.forEach(threshold => {
      this.thresholds.set(threshold.id, threshold);
    });
    console.log(`📊 Loaded ${DEFAULT_THRESHOLDS.length} default KPI thresholds`);
  }

  /**
   * Record a metric data point
   */
  async recordMetric(params: {
    metricType: KPIMetricType;
    value: number;
    agentId?: string;
    campaignId?: string;
    departmentId?: string;
    skillId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const { metricType, value, agentId, campaignId, departmentId, skillId, metadata = {} } = params;

    try {
      const dataPoint: KPIDataPoint = {
        metricType,
        value,
        timestamp: new Date(),
        period: AggregationPeriod.REAL_TIME,
        dimensions: {
          agentId,
          campaignId,
          departmentId,
          skillId,
        },
        metadata,
      };

      // Store in Redis for persistence
      await this.persistMetric(dataPoint);

      // Add to cache
      const cacheKey = `${metricType}_real_time`;
      const cached = this.metricsCache.get(cacheKey) || [];
      cached.push(dataPoint);
      
      // Keep only last 1000 data points in memory
      if (cached.length > 1000) {
        cached.shift();
      }
      
      this.metricsCache.set(cacheKey, cached);

      // Check thresholds
      await this.checkThresholds(metricType, value, dataPoint.dimensions);

      console.log(`📊 Recorded metric: ${metricType} = ${value}`);

    } catch (error) {
      console.error('Error recording metric:', error);
      throw error;
    }
  }

  /**
   * Calculate aggregated metrics for a period
   */
  async calculateAggregatedMetrics(params: {
    metricTypes: KPIMetricType[];
    period: AggregationPeriod;
    startDate: Date;
    endDate: Date;
    agentId?: string;
    campaignId?: string;
    departmentId?: string;
  }): Promise<KPIDataPoint[]> {
    const { metricTypes, period, startDate, endDate, agentId, campaignId, departmentId } = params;

    try {
      const aggregatedMetrics: KPIDataPoint[] = [];

      for (const metricType of metricTypes) {
        // Get raw data points
        const rawData = await this.getRawMetrics({
          metricType,
          startDate,
          endDate,
          agentId,
          campaignId,
          departmentId,
        });

        // Aggregate by period
        const aggregated = this.aggregateDataByPeriod(rawData, period);
        aggregatedMetrics.push(...aggregated);
      }

      return aggregatedMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    } catch (error) {
      console.error('Error calculating aggregated metrics:', error);
      throw error;
    }
  }

  /**
   * Get current KPI dashboard data
   */
  async getDashboardData(params: {
    agentId?: string;
    campaignId?: string;
    departmentId?: string;
    timeRange?: { start: Date; end: Date };
  } = {}): Promise<KPIDashboard> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { agentId, campaignId, departmentId, timeRange } = params;

      // Calculate overview metrics
      const overview = await this.calculateOverviewMetrics({ agentId, campaignId, departmentId });

      // Get real-time metrics
      const realTimeMetrics = await this.getRealTimeMetricSummaries({ agentId, campaignId, departmentId });

      // Get trend data
      const [hourlyTrends, dailyTrends, weeklyTrends] = await Promise.all([
        this.calculateAggregatedMetrics({
          metricTypes: [
            KPIMetricType.TOTAL_CALLS,
            KPIMetricType.AVERAGE_WAIT_TIME,
            KPIMetricType.ABANDONMENT_RATE,
            KPIMetricType.SERVICE_LEVEL,
          ],
          period: AggregationPeriod.HOUR,
          startDate: oneDayAgo,
          endDate: now,
          agentId,
          campaignId,
          departmentId,
        }),
        this.calculateAggregatedMetrics({
          metricTypes: [
            KPIMetricType.TOTAL_CALLS,
            KPIMetricType.CONVERSION_RATE,
            KPIMetricType.AGENT_UTILIZATION,
          ],
          period: AggregationPeriod.DAY,
          startDate: oneWeekAgo,
          endDate: now,
          agentId,
          campaignId,
          departmentId,
        }),
        this.calculateAggregatedMetrics({
          metricTypes: [
            KPIMetricType.TOTAL_CALLS,
            KPIMetricType.REVENUE_PER_CALL,
            KPIMetricType.CUSTOMER_SATISFACTION,
          ],
          period: AggregationPeriod.WEEK,
          startDate: new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000), // 12 weeks
          endDate: now,
          agentId,
          campaignId,
          departmentId,
        }),
      ]);

      // Get performance data
      const [agentPerformance, campaignPerformance] = await Promise.all([
        this.getAgentPerformanceData({ campaignId, departmentId }),
        this.getCampaignPerformanceData({ agentId, departmentId }),
      ]);

      // Get active alerts
      const alerts = await this.getActiveAlerts();

      return {
        overview,
        realTimeMetrics,
        trends: {
          hourly: hourlyTrends,
          daily: dailyTrends,
          weekly: weeklyTrends,
        },
        agentPerformance,
        campaignPerformance,
        alerts,
      };

    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Update KPI threshold configuration
   */
  async updateThreshold(thresholdId: string, updates: Partial<KPIThreshold>): Promise<void> {
    try {
      const existing = this.thresholds.get(thresholdId);
      if (!existing) {
        throw new Error(`Threshold not found: ${thresholdId}`);
      }

      const updated = { ...existing, ...updates };
      this.thresholds.set(thresholdId, updated);

      // Persist to Redis
      await this.persistThreshold(updated);

      console.log(`📊 Updated KPI threshold: ${thresholdId}`);

    } catch (error) {
      console.error('Error updating threshold:', error);
      throw error;
    }
  }

  /**
   * Get KPI metric trends and analysis
   */
  async getMetricTrends(params: {
    metricType: KPIMetricType;
    period: AggregationPeriod;
    startDate: Date;
    endDate: Date;
    agentId?: string;
    campaignId?: string;
  }): Promise<{
    data: KPIDataPoint[];
    analysis: {
      trend: 'up' | 'down' | 'stable';
      volatility: 'low' | 'medium' | 'high';
      correlation: number;
      forecast?: number[];
    };
  }> {
    const { metricType, period, startDate, endDate, agentId, campaignId } = params;

    try {
      // Get aggregated data
      const data = await this.calculateAggregatedMetrics({
        metricTypes: [metricType],
        period,
        startDate,
        endDate,
        agentId,
        campaignId,
      });

      // Analyze trends
      const analysis = this.analyzeTrends(data);

      return { data, analysis };

    } catch (error) {
      console.error('Error getting metric trends:', error);
      throw error;
    }
  }

  // Private helper methods

  private async persistMetric(dataPoint: KPIDataPoint): Promise<void> {
    try {
      const key = `metric:${dataPoint.metricType}:${dataPoint.timestamp.toISOString()}`;
      const data = JSON.stringify({
        ...dataPoint,
        timestamp: dataPoint.timestamp.toISOString(),
      });
      
      await redisClient.setEx(key, 7 * 24 * 60 * 60, data); // 7 days TTL
      
      // Add to time series index
      const indexKey = `metrics:${dataPoint.metricType}:${dataPoint.period}`;
      await redisClient.zAdd(indexKey, {
        score: dataPoint.timestamp.getTime(),
        value: key,
      });
      
    } catch (error) {
      console.warn('⚠️ Failed to persist metric to Redis:', error);
    }
  }

  private async checkThresholds(
    metricType: KPIMetricType, 
    value: number, 
    dimensions: any
  ): Promise<void> {
    const relevantThresholds = Array.from(this.thresholds.values())
      .filter(t => t.metricType === metricType && t.isEnabled);

    for (const threshold of relevantThresholds) {
      const { comparisonOperator, warningValue, criticalValue } = threshold;
      
      let triggered = false;
      let severity: 'warning' | 'critical' = 'warning';

      // Check critical threshold first
      if (this.compareValues(value, criticalValue, comparisonOperator)) {
        triggered = true;
        severity = 'critical';
      } else if (this.compareValues(value, warningValue, comparisonOperator)) {
        triggered = true;
        severity = 'warning';
      }

      if (triggered) {
        // Emit KPI threshold exceeded event
        await kpiEvents.thresholdExceeded({
          metric: metricType,
          value,
          threshold: severity === 'critical' ? criticalValue : warningValue,
          agentId: dimensions.agentId,
          campaignId: dimensions.campaignId,
          metadata: {
            thresholdId: threshold.id,
            comparisonOperator,
            severity,
            dimensions,
          },
        });

        console.warn(`⚠️ KPI threshold exceeded: ${metricType} ${comparisonOperator} ${severity === 'critical' ? criticalValue : warningValue} (actual: ${value})`);
      }
    }
  }

  private compareValues(actual: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case '>': return actual > threshold;
      case '<': return actual < threshold;
      case '>=': return actual >= threshold;
      case '<=': return actual <= threshold;
      case '==': return actual === threshold;
      case '!=': return actual !== threshold;
      default: return false;
    }
  }

  private async getRawMetrics(params: {
    metricType: KPIMetricType;
    startDate: Date;
    endDate: Date;
    agentId?: string;
    campaignId?: string;
    departmentId?: string;
  }): Promise<KPIDataPoint[]> {
    // Simplified implementation - in production, this would query Redis or database
    const cached = this.metricsCache.get(`${params.metricType}_real_time`) || [];
    
    return cached.filter(point => 
      point.timestamp >= params.startDate &&
      point.timestamp <= params.endDate &&
      (!params.agentId || point.dimensions.agentId === params.agentId) &&
      (!params.campaignId || point.dimensions.campaignId === params.campaignId) &&
      (!params.departmentId || point.dimensions.departmentId === params.departmentId)
    );
  }

  private aggregateDataByPeriod(data: KPIDataPoint[], period: AggregationPeriod): KPIDataPoint[] {
    if (data.length === 0) return [];

    // Group data by time buckets based on period
    const buckets = new Map<string, KPIDataPoint[]>();

    data.forEach(point => {
      const bucketKey = this.getBucketKey(point.timestamp, period);
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(point);
    });

    // Aggregate each bucket
    return Array.from(buckets.entries()).map(([bucketKey, points]) => {
      const timestamp = this.getBucketTimestamp(bucketKey, period);
      const value = this.aggregateValues(points);
      
      return {
        metricType: points[0].metricType,
        value,
        timestamp,
        period,
        dimensions: points[0].dimensions,
        metadata: { aggregatedFrom: points.length },
      };
    });
  }

  private getBucketKey(timestamp: Date, period: AggregationPeriod): string {
    switch (period) {
      case AggregationPeriod.MINUTE:
        return timestamp.toISOString().substr(0, 16); // YYYY-MM-DDTHH:MM
      case AggregationPeriod.HOUR:
        return timestamp.toISOString().substr(0, 13); // YYYY-MM-DDTHH
      case AggregationPeriod.DAY:
        return timestamp.toISOString().substr(0, 10); // YYYY-MM-DD
      case AggregationPeriod.WEEK:
        const weekStart = new Date(timestamp);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return weekStart.toISOString().substr(0, 10);
      case AggregationPeriod.MONTH:
        return timestamp.toISOString().substr(0, 7); // YYYY-MM
      default:
        return timestamp.toISOString();
    }
  }

  private getBucketTimestamp(bucketKey: string, period: AggregationPeriod): Date {
    switch (period) {
      case AggregationPeriod.MINUTE:
        return new Date(bucketKey + ':00.000Z');
      case AggregationPeriod.HOUR:
        return new Date(bucketKey + ':00:00.000Z');
      case AggregationPeriod.DAY:
      case AggregationPeriod.WEEK:
        return new Date(bucketKey + 'T00:00:00.000Z');
      case AggregationPeriod.MONTH:
        return new Date(bucketKey + '-01T00:00:00.000Z');
      default:
        return new Date(bucketKey);
    }
  }

  private aggregateValues(points: KPIDataPoint[]): number {
    if (points.length === 0) return 0;
    
    const sum = points.reduce((acc, point) => acc + point.value, 0);
    return sum / points.length; // Average aggregation - could be configurable
  }

  private analyzeTrends(data: KPIDataPoint[]): any {
    if (data.length < 2) {
      return {
        trend: 'stable',
        volatility: 'low',
        correlation: 0,
      };
    }

    // Simple trend analysis
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const change = lastValue - firstValue;
    const changePercentage = Math.abs(change) / firstValue;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (changePercentage > 0.05) { // 5% threshold
      trend = change > 0 ? 'up' : 'down';
    }

    // Calculate volatility
    const values = data.map(d => d.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const volatilityRatio = stdDev / mean;

    let volatility: 'low' | 'medium' | 'high' = 'low';
    if (volatilityRatio > 0.2) volatility = 'high';
    else if (volatilityRatio > 0.1) volatility = 'medium';

    return {
      trend,
      volatility,
      correlation: 0.5, // Placeholder - would implement proper correlation analysis
    };
  }

  private async calculateOverviewMetrics(filters: any): Promise<any> {
    // Placeholder implementation - would calculate from actual data
    return {
      totalCalls: 1250,
      totalAgents: 15,
      activeAgents: 12,
      queueLength: 8,
      serviceLevel: 87.5,
      abandonmentRate: 3.2,
    };
  }

  private async getRealTimeMetricSummaries(filters: any): Promise<KPIMetricSummary[]> {
    // Placeholder implementation
    return [
      {
        metricType: KPIMetricType.TOTAL_CALLS,
        current: 1250,
        previous: 1180,
        change: 70,
        changePercentage: 5.9,
        trend: 'up',
        thresholdStatus: 'normal',
        lastUpdated: new Date(),
      },
      {
        metricType: KPIMetricType.SERVICE_LEVEL,
        current: 87.5,
        previous: 91.2,
        change: -3.7,
        changePercentage: -4.1,
        trend: 'down',
        thresholdStatus: 'warning',
        lastUpdated: new Date(),
      },
    ];
  }

  private async getAgentPerformanceData(filters: any): Promise<any[]> {
    // Placeholder implementation
    return [
      {
        agentId: 'agent_1',
        agentName: 'John Smith',
        callsHandled: 45,
        averageCallDuration: 285,
        utilization: 78.5,
        qaScore: 8.7,
      },
    ];
  }

  private async getCampaignPerformanceData(filters: any): Promise<any[]> {
    // Placeholder implementation
    return [
      {
        campaignId: 'campaign_1',
        campaignName: 'Spring Promotion',
        callsDialed: 500,
        contactRate: 65.8,
        conversionRate: 12.4,
        revenue: 15750,
      },
    ];
  }

  private async getActiveAlerts(): Promise<any[]> {
    // Placeholder implementation
    return [
      {
        id: 'alert_1',
        metricType: KPIMetricType.SERVICE_LEVEL,
        severity: 'warning',
        message: 'Service level below 90% threshold',
        timestamp: new Date(),
      },
    ];
  }

  private async persistThreshold(threshold: KPIThreshold): Promise<void> {
    try {
      const key = `threshold:${threshold.id}`;
      await redisClient.set(key, JSON.stringify(threshold));
    } catch (error) {
      console.warn('⚠️ Failed to persist threshold to Redis:', error);
    }
  }

  private startRealTimeAggregation(): void {
    // Start background aggregation processes
    setInterval(() => {
      this.performRealTimeCalculations();
    }, 30000); // Every 30 seconds

    console.log('📊 KPI real-time aggregation started');
  }

  private async performRealTimeCalculations(): Promise<void> {
    try {
      // Perform background KPI calculations
      // This would aggregate metrics, calculate trends, check thresholds, etc.
      console.log('📊 Performing real-time KPI calculations');
    } catch (error) {
      console.error('Error in real-time KPI calculations:', error);
    }
  }
}

// Create and export singleton instance
export const kpiAggregationService = new KPIAggregationService();
export default kpiAggregationService;