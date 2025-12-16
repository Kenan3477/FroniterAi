/**
 * KENNEX PREDICTIVE DIALING ENGINE
 * Advanced algorithms for predictive and power dialing capabilities
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

    return decision;
  }

  /**
   * Calculate optimal dial ratio using statistical model
   */
  private calculateOptimalDialRatio(
    answerRate: number,
    avgCallDuration: number,
    agentUtilization: number,
    abandonmentRate: number
  ): number {
    // Base ratio calculation using answer rate
    let baseRatio = 1 / answerRate;

    // Adjust for agent utilization - higher utilization allows more aggressive dialing
    const utilizationFactor = Math.max(0.5, Math.min(1.5, agentUtilization * 1.2));
    baseRatio *= utilizationFactor;

    // Adjust for abandonment rate - stay under target threshold
    const abandonmentFactor = this.config.targetAbandonmentRate / Math.max(0.001, abandonmentRate);
    baseRatio *= Math.min(1.2, abandonmentFactor);

    // Adjust for call duration - longer calls need more conservative dialing
    const durationFactor = Math.max(0.8, Math.min(1.3, 120 / avgCallDuration));
    baseRatio *= durationFactor;

    return baseRatio;
  }

  /**
   * Calculate number of calls to place based on current state
   */
  private calculateCallVolume(metrics: PredictiveMetrics, dialRatio: number): number {
    const baseCalls = metrics.availableAgents * dialRatio;
    
    // Adjust for queue depth
    const queueFactor = Math.min(1.5, metrics.queueDepth / Math.max(1, metrics.availableAgents * 10));
    
    // Adjust for current active calls
    const activeFactor = Math.max(0.5, 1 - (metrics.activeCalls / (metrics.availableAgents * 2)));
    
    return Math.floor(baseCalls * queueFactor * activeFactor);
  }

  /**
   * Calculate expected abandonment rate based on agent availability
   */
  private calculateExpectedAbandonmentRate(availableAgents: number, expectedAnswers: number): number {
    if (availableAgents === 0 || expectedAnswers === 0) return 0;
    
    // Simple model: abandonment occurs when answers exceed available agents
    const excessAnswers = Math.max(0, expectedAnswers - availableAgents);
    return excessAnswers / expectedAnswers;
  }

  /**
   * Determine if dialing should proceed based on risk assessment
   */
  private shouldProceedWithDialing(
    metrics: PredictiveMetrics,
    predictedAbandonments: number,
    callsToPlace: number
  ): boolean {
    // Don't dial if no agents available
    if (metrics.availableAgents === 0) return false;
    
    // Don't dial if no contacts in queue
    if (metrics.queueDepth === 0 || callsToPlace === 0) return false;
    
    // Check abandonment rate threshold
    const predictedAbandonmentRate = predictedAbandonments / Math.max(1, callsToPlace);
    if (predictedAbandonmentRate > this.config.targetAbandonmentRate * 1.2) return false;
    
    // Check if current abandonment rate is already too high
    if (metrics.abandonmentRate > this.config.targetAbandonmentRate * 1.5) return false;
    
    return true;
  }

  /**
   * Calculate impact on agent utilization
   */
  private calculateUtilizationImpact(metrics: PredictiveMetrics, callsToPlace: number): number {
    const currentUtilization = metrics.agentUtilization;
    const additionalLoad = callsToPlace / Math.max(1, metrics.availableAgents);
    return Math.min(1.0, currentUtilization + (additionalLoad * 0.1));
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
      if (metrics.availableAgents === 0) return "No agents available for dialing";
      if (metrics.queueDepth === 0) return "No contacts in queue";
      if (metrics.abandonmentRate > this.config.targetAbandonmentRate * 1.5) {
        return "Current abandonment rate too high - reducing dial pace";
      }
      return "Risk assessment indicates dialing should be paused";
    }

    return `Optimal dial ratio: ${dialRatio.toFixed(2)}x (${metrics.availableAgents} agents, ${metrics.queueDepth} queue depth)`;
  }

  /**
   * Calculate weighted average from historical data
   */
  private calculateWeightedAverage(
    historical: PredictiveMetrics[],
    metric: keyof PredictiveMetrics,
    currentValue: number
  ): number {
    if (historical.length === 0) return currentValue;

    // Weight recent data more heavily
    let weightedSum = currentValue * 0.3; // 30% weight for current value
    let totalWeight = 0.3;

    historical.slice(-10).forEach((data, index) => {
      const weight = (index + 1) / 10 * 0.7; // Distribute 70% across historical data
      weightedSum += (data[metric] as number) * weight;
      totalWeight += weight;
    });

    return weightedSum / totalWeight;
  }

  /**
   * Get historical metrics for a campaign
   */
  private getHistoricalMetrics(campaignId: string): PredictiveMetrics[] {
    return this.historicalData.get(campaignId) || [];
  }

  /**
   * Record current metrics for historical analysis
   */
  recordMetrics(campaignId: string, metrics: PredictiveMetrics): void {
    const historical = this.getHistoricalMetrics(campaignId);
    historical.push({
      ...metrics,
      // Add timestamp for analysis
    });

    // Keep only recent data (last 100 data points)
    if (historical.length > 100) {
      historical.splice(0, historical.length - 100);
    }

    this.historicalData.set(campaignId, historical);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PredictiveConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): PredictiveConfig {
    return { ...this.config };
  }

  /**
   * Power Dialing Mode - Aggressive dialing for maximum agent utilization
   */
  calculatePowerDialingDecision(
    campaignId: string,
    currentMetrics: PredictiveMetrics
  ): DialingDecision {
    // Power dialing is more aggressive - minimal delay between calls
    const powerConfig = {
      ...this.config,
      targetAbandonmentRate: this.config.targetAbandonmentRate * 2, // Allow higher abandonment
      maxDialRatio: this.config.maxDialRatio * 1.5, // More aggressive ratio
      safetyBuffer: 0.9 // Reduced safety buffer
    };

    const savedConfig = this.config;
    this.config = powerConfig;
    
    const decision = this.calculateDialingDecision(campaignId, currentMetrics);
    decision.reasoning = `Power Dialing: ${decision.reasoning}`;
    
    this.config = savedConfig;
    return decision;
  }
}

/**
 * Default configuration for predictive dialing
 */
export const DEFAULT_PREDICTIVE_CONFIG: PredictiveConfig = {
  targetAbandonmentRate: 0.05,    // 5% target abandonment rate
  maxDialRatio: 3.0,              // Maximum 3 calls per agent
  minDialRatio: 1.1,              // Minimum 1.1 calls per agent
  pacingInterval: 5000,           // Adjust pacing every 5 seconds
  agentWrapTime: 15,              // 15 seconds average wrap time
  callConnectDelay: 8,            // 8 seconds to connect
  safetyBuffer: 0.85              // 85% safety factor
};

/**
 * Create and export singleton instance
 */
export const predictiveEngine = new PredictiveDialingEngine(DEFAULT_PREDICTIVE_CONFIG);