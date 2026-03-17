/**
 * OMNIVOX PREDICTIVE DIALING ENGINE - Backend Service
 * Advanced algorithms for predictive and power dialing capabilities
 * Integrated with AutoDialEngine for intelligent pacing
 */

export interface PredictiveMetrics {
  answerRate: number;          // Percentage of calls answered
  averageCallDuration: number; // Average call duration in seconds  
  agentUtilization: number;    // Percentage of time agents are busy
  abandonmentRate: number;     // Percentage of answered calls abandoned
  availableAgents: number;     // Current available agents
  activeCalls: number;         // Current active calls
  queueDepth: number;         // Contacts waiting to be dialed
}

export interface PredictiveConfig {
  targetAbandonmentRate: number;    // Target abandonment rate (e.g., 0.05 = 5%)
  maxDialRatio: number;            // Maximum calls per agent ratio
  minDialRatio: number;            // Minimum calls per agent ratio
  pacingInterval: number;          // Pacing adjustment interval in milliseconds
  agentWrapTime: number;          // Average after-call work time in seconds
  callConnectDelay: number;       // Average time for call to connect
  safetyBuffer: number;           // Safety factor for avoiding over-dialing
}

export interface DialingDecision {
  shouldDial: boolean;
  dialRatio: number;
  callsToPlace: number;
  reasoning: string;
  predictedOutcome: {
    expectedAnswers: number;
    expectedAbandonments: number;
    agentUtilizationImpact: number;
  };
}

export class PredictiveDialingEngine {
  private config: PredictiveConfig;
  private historicalData: Map<string, PredictiveMetrics[]> = new Map();

  constructor(config: PredictiveConfig) {
    this.config = config;
  }

  /**
   * Main predictive algorithm - determines if and how many calls to place
   */
  calculateDialingDecision(
    campaignId: string, 
    currentMetrics: PredictiveMetrics
  ): DialingDecision {
    // Get historical performance for this campaign
    const historical = this.getHistoricalMetrics(campaignId);
    
    // Calculate weighted averages from historical data
    const avgAnswerRate = this.calculateWeightedAverage(historical, 'answerRate', currentMetrics.answerRate);
    const avgCallDuration = this.calculateWeightedAverage(historical, 'averageCallDuration', currentMetrics.averageCallDuration);
    const avgAbandonmentRate = this.calculateWeightedAverage(historical, 'abandonmentRate', currentMetrics.abandonmentRate);

    // Calculate optimal dial ratio using statistical model
    const optimalDialRatio = this.calculateOptimalDialRatio(
      avgAnswerRate,
      avgCallDuration,
      currentMetrics.agentUtilization,
      avgAbandonmentRate
    );

    // Apply safety constraints
    const constrainedDialRatio = Math.max(
      this.config.minDialRatio,
      Math.min(this.config.maxDialRatio, optimalDialRatio * this.config.safetyBuffer)
    );

    // Calculate number of calls to place
    const callsToPlace = this.calculateCallVolume(currentMetrics, constrainedDialRatio);

    // Predict outcomes
    const predictedAnswers = callsToPlace * avgAnswerRate;
    const predictedAbandonments = predictedAnswers * this.calculateExpectedAbandonmentRate(
      currentMetrics.availableAgents,
      predictedAnswers
    );

    // Make dialing decision
    const shouldDial = this.shouldProceedWithDialing(
      currentMetrics,
      predictedAbandonments,
      callsToPlace
    );

    const decision: DialingDecision = {
      shouldDial,
      dialRatio: constrainedDialRatio,
      callsToPlace: shouldDial ? callsToPlace : 0,
      reasoning: this.generateReasoningText(currentMetrics, constrainedDialRatio, shouldDial),
      predictedOutcome: {
        expectedAnswers: predictedAnswers,
        expectedAbandonments: predictedAbandonments,
        agentUtilizationImpact: this.calculateUtilizationImpact(currentMetrics, callsToPlace)
      }
    };

    // Store metrics for historical analysis
    this.updateHistoricalData(campaignId, currentMetrics);

    return decision;
  }

  /**
   * Calculate optimal dial ratio using Erlang-based statistical model
   */
  private calculateOptimalDialRatio(
    answerRate: number,
    avgCallDuration: number,
    currentUtilization: number,
    abandonmentRate: number
  ): number {
    // Base ratio starts at 1:1
    let dialRatio = 1.0;

    // Adjust for answer rate - if low answer rate, we can dial more aggressively
    if (answerRate > 0) {
      dialRatio = dialRatio / answerRate;
    }

    // Adjust for agent utilization - if agents are idle, dial more aggressively
    const utilizationFactor = Math.max(0.5, 1.0 - (currentUtilization * 0.5));
    dialRatio *= utilizationFactor;

    // Adjust for abandonment rate - if abandonment is high, dial more conservatively
    const abandonmentPenalty = Math.max(0.7, 1.0 - (abandonmentRate * 2));
    dialRatio *= abandonmentPenalty;

    // Account for call duration - longer calls require more conservative dialing
    const durationFactor = Math.max(0.8, 1.0 - (avgCallDuration / 1800)); // 30 minutes max
    dialRatio *= durationFactor;

    return Math.max(1.0, dialRatio);
  }

  /**
   * Calculate number of calls to place based on current metrics and dial ratio
   */
  private calculateCallVolume(
    metrics: PredictiveMetrics,
    dialRatio: number
  ): number {
    // Base calculation: available agents * dial ratio
    let callsToPlace = Math.floor(metrics.availableAgents * dialRatio);

    // Adjust for queue depth - don't over-dial if queue is small
    if (metrics.queueDepth < callsToPlace) {
      callsToPlace = metrics.queueDepth;
    }

    // Ensure we don't place more calls than we have contacts
    callsToPlace = Math.max(0, callsToPlace);

    return callsToPlace;
  }

  /**
   * Calculate expected abandonment rate based on agent availability
   */
  private calculateExpectedAbandonmentRate(
    availableAgents: number,
    expectedAnswers: number
  ): number {
    if (expectedAnswers <= availableAgents) {
      return 0; // No abandonment if we have enough agents
    }

    // Simple abandonment model - more answers than agents = abandonment
    const overflow = expectedAnswers - availableAgents;
    return Math.min(1.0, overflow / expectedAnswers);
  }

  /**
   * Determine if we should proceed with dialing based on safety constraints
   */
  private shouldProceedWithDialing(
    metrics: PredictiveMetrics,
    predictedAbandonments: number,
    callsToPlace: number
  ): boolean {
    // Don't dial if no agents available
    if (metrics.availableAgents === 0) {
      return false;
    }

    // Don't dial if no contacts in queue
    if (metrics.queueDepth === 0) {
      return false;
    }

    // Don't dial if predicted abandonment exceeds target
    if (callsToPlace > 0) {
      const predictedAbandonmentRate = predictedAbandonments / callsToPlace;
      if (predictedAbandonmentRate > this.config.targetAbandonmentRate) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate impact on agent utilization
   */
  private calculateUtilizationImpact(
    metrics: PredictiveMetrics,
    callsToPlace: number
  ): number {
    if (metrics.availableAgents === 0) return 0;
    
    const expectedAnswers = callsToPlace * 0.3; // Assume 30% answer rate
    return expectedAnswers / metrics.availableAgents;
  }

  /**
   * Generate human-readable reasoning for the dialing decision
   */
  private generateReasoningText(
    metrics: PredictiveMetrics,
    dialRatio: number,
    shouldDial: boolean
  ): string {
    if (!shouldDial) {
      if (metrics.availableAgents === 0) {
        return 'No agents available for dialing';
      }
      if (metrics.queueDepth === 0) {
        return 'No contacts in queue to dial';
      }
      return 'Predicted abandonment rate exceeds safety threshold';
    }

    return `Predictive algorithm recommends dial ratio ${dialRatio.toFixed(2)}:1 based on current metrics`;
  }

  /**
   * Get historical metrics for a campaign
   */
  private getHistoricalMetrics(campaignId: string): PredictiveMetrics[] {
    return this.historicalData.get(campaignId) || [];
  }

  /**
   * Calculate weighted average for historical data
   */
  private calculateWeightedAverage(
    historical: PredictiveMetrics[],
    metric: keyof PredictiveMetrics,
    currentValue: number
  ): number {
    if (historical.length === 0) {
      return currentValue;
    }

    // Use exponential weighting - more recent data has higher weight
    let weightedSum = currentValue * 0.4; // Current value gets 40% weight
    let totalWeight = 0.4;

    for (let i = historical.length - 1; i >= 0 && i > historical.length - 10; i--) {
      const weight = Math.pow(0.8, historical.length - 1 - i);
      weightedSum += (historical[i][metric] as number) * weight;
      totalWeight += weight;
    }

    return weightedSum / totalWeight;
  }

  /**
   * Update historical data with current metrics
   */
  private updateHistoricalData(campaignId: string, metrics: PredictiveMetrics): void {
    if (!this.historicalData.has(campaignId)) {
      this.historicalData.set(campaignId, []);
    }

    const history = this.historicalData.get(campaignId)!;
    history.push({ ...metrics });

    // Keep only last 100 data points
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get campaign performance statistics
   */
  getPerformanceStats(campaignId: string) {
    const history = this.getHistoricalMetrics(campaignId);
    
    if (history.length === 0) {
      return null;
    }

    const recent = history.slice(-10); // Last 10 data points
    
    return {
      averageAnswerRate: recent.reduce((sum, h) => sum + h.answerRate, 0) / recent.length,
      averageAbandonmentRate: recent.reduce((sum, h) => sum + h.abandonmentRate, 0) / recent.length,
      averageUtilization: recent.reduce((sum, h) => sum + h.agentUtilization, 0) / recent.length,
      dataPoints: recent.length,
      timeSpan: recent.length * this.config.pacingInterval
    };
  }
}

// Default configuration for production use
export const DEFAULT_PREDICTIVE_CONFIG: PredictiveConfig = {
  targetAbandonmentRate: 0.03,    // 3% target abandonment
  maxDialRatio: 3.0,              // Maximum 3:1 dial ratio
  minDialRatio: 1.0,              // Minimum 1:1 dial ratio
  pacingInterval: 30000,          // Adjust every 30 seconds
  agentWrapTime: 45,              // 45 seconds average wrap time
  callConnectDelay: 8,            // 8 seconds average connect time
  safetyBuffer: 0.9               // 10% safety buffer
};

// Export singleton instance
export const predictiveDialingEngine = new PredictiveDialingEngine(DEFAULT_PREDICTIVE_CONFIG);