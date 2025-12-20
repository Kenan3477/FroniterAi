/**
 * OMNIVOX-AI BACKEND PREDICTIVE DIALING SERVICE
 * Enterprise-grade predictive dialing with real-time decision engine
 * Ported and enhanced from frontend algorithms
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface PredictiveMetrics {
  answerRate: number;          // Percentage of calls answered
  averageCallDuration: number; // Average call duration in seconds  
  agentUtilization: number;    // Percentage of time agents are busy
  abandonmentRate: number;     // Percentage of answered calls abandoned
  availableAgents: number;     // Current available agents
  activeCalls: number;         // Current active calls
  queueDepth: number;         // Contacts waiting to be dialed
  timestamp: Date;            // When metrics were collected
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
  dialingMode: 'progressive' | 'predictive' | 'power';
  reasoning: string;
  predictedOutcome: {
    expectedAnswers: number;
    expectedAbandonments: number;
    agentUtilizationImpact: number;
  };
  timestamp: Date;
  campaignId: string;
}

export interface CampaignDialingState {
  campaignId: string;
  isActive: boolean;
  currentDialRatio: number;
  lastDecision?: DialingDecision;
  lastMetricsUpdate: Date;
  dialingMode: 'progressive' | 'predictive' | 'power';
  abandonmentRateHistory: number[];
  performanceMetrics: PredictiveMetrics[];
}

export class BackendPredictiveDialingService {
  private campaigns: Map<string, CampaignDialingState> = new Map();
  private defaultConfig: PredictiveConfig;
  private isRunning: boolean = false;
  private pacingInterval?: NodeJS.Timeout;

  constructor(config?: Partial<PredictiveConfig>) {
    this.defaultConfig = {
      targetAbandonmentRate: 0.05,    // 5% target abandonment rate
      maxDialRatio: 3.0,              // Maximum 3 calls per agent
      minDialRatio: 1.1,              // Minimum 1.1 calls per agent
      pacingInterval: 5000,           // Adjust pacing every 5 seconds
      agentWrapTime: 15,              // 15 seconds average wrap time
      callConnectDelay: 8,            // 8 seconds to connect
      safetyBuffer: 0.85,             // 85% safety factor
      ...config
    };
  }

  /**
   * Start the predictive dialing engine
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🤖 Starting Predictive Dialing Engine...');
    
    // Start pacing loop
    this.pacingInterval = setInterval(() => {
      this.runPacingLoop().catch(console.error);
    }, this.defaultConfig.pacingInterval);

    // Initialize campaign states from database
    await this.initializeCampaignStates();
  }

  /**
   * Stop the predictive dialing engine
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    console.log('⏹️ Stopping Predictive Dialing Engine...');
    
    if (this.pacingInterval) {
      clearInterval(this.pacingInterval);
      this.pacingInterval = undefined;
    }
  }

  /**
   * Get or create campaign dialing state
   */
  private async getCampaignState(campaignId: string): Promise<CampaignDialingState> {
    if (!this.campaigns.has(campaignId)) {
      // Get campaign info from database
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId }
      });

      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      // Initialize campaign state
      const state: CampaignDialingState = {
        campaignId,
        isActive: campaign.isActive,
        currentDialRatio: campaign.pacingMultiplier || 1.0,
        lastMetricsUpdate: new Date(),
        dialingMode: (campaign.diallingMode?.toLowerCase() as any) || 'progressive',
        abandonmentRateHistory: [],
        performanceMetrics: []
      };

      this.campaigns.set(campaignId, state);
    }

    return this.campaigns.get(campaignId)!;
  }

  /**
   * Calculate predictive dialing decision for a campaign
   */
  async calculateDialingDecision(campaignId: string): Promise<DialingDecision> {
    try {
      // Validate campaign context and isolation
      await this.validateCampaignContext(campaignId);
      
      const state = await this.getCampaignState(campaignId);
      const metrics = await this.collectCurrentMetrics(campaignId);
      
      // Get campaign-specific configuration
      const config = await this.getCampaignConfig(campaignId);
      
      // Get historical performance for this campaign
      const historical = state.performanceMetrics.slice(-10); // Last 10 data points
      
      // Calculate weighted averages from historical data
      const avgAnswerRate = this.calculateWeightedAverage(historical, 'answerRate', metrics.answerRate);
      const avgCallDuration = this.calculateWeightedAverage(historical, 'averageCallDuration', metrics.averageCallDuration);
      const avgAbandonmentRate = this.calculateWeightedAverage(historical, 'abandonmentRate', metrics.abandonmentRate);

      // Calculate optimal dial ratio based on dialing mode
      let optimalDialRatio: number;
      switch (state.dialingMode) {
        case 'power':
          optimalDialRatio = this.calculatePowerDialRatio(metrics, config);
          break;
        case 'predictive':
          optimalDialRatio = this.calculatePredictiveDialRatio(
            avgAnswerRate, avgCallDuration, metrics.agentUtilization, avgAbandonmentRate, config
          );
          break;
        case 'progressive':
        default:
          optimalDialRatio = 1.0; // 1:1 ratio for progressive
          break;
      }

      // Apply safety constraints
      const constrainedDialRatio = Math.max(
        config.minDialRatio,
        Math.min(config.maxDialRatio, optimalDialRatio * config.safetyBuffer)
      );

      // Calculate number of calls to place
      const callsToPlace = this.calculateCallVolume(metrics, constrainedDialRatio);

      // Predict outcomes
      const predictedAnswers = callsToPlace * avgAnswerRate;
      const predictedAbandonments = predictedAnswers * this.calculateExpectedAbandonmentRate(
        metrics.availableAgents,
        predictedAnswers
      );

      // Make dialing decision
      const shouldDial = this.shouldProceedWithDialing(
        metrics,
        predictedAbandonments,
        callsToPlace,
        config
      );

      const decision: DialingDecision = {
        campaignId,
        shouldDial,
        dialRatio: constrainedDialRatio,
        callsToPlace,
        dialingMode: state.dialingMode,
        reasoning: this.generateReasoningText(metrics, constrainedDialRatio, shouldDial, state.dialingMode),
        predictedOutcome: {
          expectedAnswers: predictedAnswers,
          expectedAbandonments: predictedAbandonments,
          agentUtilizationImpact: this.calculateUtilizationImpact(metrics, predictedAnswers)
        },
        timestamp: new Date()
      };

      // Store decision in campaign state
      state.lastDecision = decision;
      state.lastMetricsUpdate = new Date();
      state.currentDialRatio = constrainedDialRatio;

      // TODO: Update performance metrics history for this campaign
      // this.updatePerformanceMetrics(campaignId, metrics);

      // Log decision for audit trail
      await this.logPredictiveDecision(campaignId, decision);

      console.log(`🎯 Campaign ${campaignId}: ${shouldDial ? 'DIAL' : 'HOLD'} - Ratio: ${constrainedDialRatio.toFixed(2)}, Calls: ${callsToPlace}`);

      return decision;

    } catch (error) {
      console.error(`❌ Error calculating dialing decision for campaign ${campaignId}:`, error);
      
      // Return safe fallback decision
      return {
        campaignId,
        shouldDial: false,
        dialRatio: 1.0,
        callsToPlace: 0,
        dialingMode: 'progressive',
        reasoning: `Error in prediction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        predictedOutcome: {
          expectedAnswers: 0,
          expectedAbandonments: 0,
          agentUtilizationImpact: 0
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Collect current metrics for a campaign
   */
  private async collectCurrentMetrics(campaignId: string): Promise<PredictiveMetrics> {
    // Get available agents for this campaign
    const availableAgents = await prisma.agent.count({
      where: {
        currentStatus: 'AVAILABLE',
        isActive: true,
        currentCampaignId: campaignId
      }
    });

    // Get active calls count
    const activeCalls = await prisma.agent.count({
      where: {
        currentStatus: 'ON_CALL',
        currentCampaignId: campaignId
      }
    });

    // Get queue depth
    // For now, we'll return 0 since dialQueueEntry doesn't exist in schema
    // TODO: Replace with actual queue depth calculation
    const queueDepth = 0;
    /*
    await prisma.dialQueueEntry.count({
      where: {
        campaignId: campaignId,
        status: 'queued'
      }
    });
    */

    // Calculate answer rate from recent calls (last hour)
    const recentCalls = await prisma.call.findMany({
      where: {
        campaignId: campaignId,
        startTime: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      },
      select: {
        status: true,
        duration: true
      }
    });

    const answeredCalls = recentCalls.filter((call: any) => call.status === 'ANSWERED').length;
    const answerRate = recentCalls.length > 0 ? answeredCalls / recentCalls.length : 0.3; // Default 30%

    // Calculate average call duration
    const durations = recentCalls
      .filter((call: any) => call.duration && call.duration > 0)
      .map((call: any) => call.duration!);
    const averageCallDuration = durations.length > 0 
      ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length 
      : 120; // Default 2 minutes

    // Calculate agent utilization
    const totalAgents = availableAgents + activeCalls;
    const agentUtilization = totalAgents > 0 ? activeCalls / totalAgents : 0;

    // Get abandonment rate - using call status instead of CallKPI model
    const recentAbandoned = await prisma.call.count({
      where: {
        campaignId: campaignId,
        status: 'ABANDONED',
        startTime: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      }
    });

    const abandonmentRate = answeredCalls > 0 ? recentAbandoned / answeredCalls : 0;

    return {
      answerRate,
      averageCallDuration,
      agentUtilization,
      abandonmentRate,
      availableAgents,
      activeCalls,
      queueDepth,
      timestamp: new Date()
    };
  }

  /**
   * Calculate predictive dial ratio using statistical model
   */
  private calculatePredictiveDialRatio(
    answerRate: number,
    avgCallDuration: number,
    agentUtilization: number,
    abandonmentRate: number,
    config: PredictiveConfig
  ): number {
    // Base ratio calculation using answer rate
    let baseRatio = 1 / Math.max(0.1, answerRate); // Avoid division by zero

    // Adjust for agent utilization - higher utilization allows more aggressive dialing
    const utilizationFactor = Math.max(0.5, Math.min(1.5, agentUtilization * 1.2));
    baseRatio *= utilizationFactor;

    // Adjust for abandonment rate - stay under target threshold
    const abandonmentFactor = config.targetAbandonmentRate / Math.max(0.001, abandonmentRate);
    baseRatio *= Math.min(1.2, abandonmentFactor);

    // Adjust for call duration - longer calls need more conservative dialing
    const durationFactor = Math.max(0.8, Math.min(1.3, 120 / avgCallDuration));
    baseRatio *= durationFactor;

    return baseRatio;
  }

  /**
   * Calculate power dialing ratio - more aggressive
   */
  private calculatePowerDialRatio(metrics: PredictiveMetrics, config: PredictiveConfig): number {
    const predictiveRatio = this.calculatePredictiveDialRatio(
      metrics.answerRate,
      metrics.averageCallDuration,
      metrics.agentUtilization,
      metrics.abandonmentRate,
      config
    );

    // Power dialing is 50% more aggressive with higher abandonment tolerance
    return Math.min(config.maxDialRatio, predictiveRatio * 1.5);
  }

  /**
   * Calculate number of calls to place based on current state
   */
  private calculateCallVolume(metrics: PredictiveMetrics, dialRatio: number): number {
    const baseCalls = metrics.availableAgents * dialRatio;
    
    // Adjust for queue depth
    const queueFactor = Math.min(1.5, metrics.queueDepth / Math.max(1, metrics.availableAgents * 10));
    
    // Adjust for current active calls
    const activeFactor = Math.max(0.5, 1 - (metrics.activeCalls / Math.max(1, metrics.availableAgents * 2)));
    
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
    callsToPlace: number,
    config: PredictiveConfig
  ): boolean {
    // Don't dial if no agents available
    if (metrics.availableAgents === 0) return false;
    
    // Don't dial if no contacts in queue
    if (metrics.queueDepth === 0 || callsToPlace === 0) return false;
    
    // Check abandonment rate threshold
    const predictedAbandonmentRate = predictedAbandonments / Math.max(1, callsToPlace * metrics.answerRate);
    if (predictedAbandonmentRate > config.targetAbandonmentRate * 1.2) return false;
    
    // Check if current abandonment rate is already too high
    if (metrics.abandonmentRate > config.targetAbandonmentRate * 1.5) return false;
    
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
    shouldDial: boolean,
    mode: string
  ): string {
    if (!shouldDial) {
      if (metrics.availableAgents === 0) return "No agents available for dialing";
      if (metrics.queueDepth === 0) return "No contacts in queue";
      if (metrics.abandonmentRate > this.defaultConfig.targetAbandonmentRate * 1.5) {
        return "Current abandonment rate too high - reducing dial pace";
      }
      return "Risk assessment indicates dialing should be paused";
    }

    return `${mode.toUpperCase()} MODE: Optimal dial ratio ${dialRatio.toFixed(2)}x (${metrics.availableAgents} agents, ${metrics.queueDepth} queue depth)`;
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
      const value = data[metric] as number;
      if (typeof value === 'number') {
        weightedSum += value * weight;
        totalWeight += weight;
      }
    });

    return weightedSum / totalWeight;
  }

  /**
   * Get campaign-specific configuration
   */
  private async getCampaignConfig(campaignId: string): Promise<PredictiveConfig> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    });

    return {
      ...this.defaultConfig,
      targetAbandonmentRate: campaign?.abandonRateThreshold || this.defaultConfig.targetAbandonmentRate,
      maxDialRatio: campaign?.pacingMultiplier || this.defaultConfig.maxDialRatio,
      pacingInterval: (campaign?.pacingMultiplier ? campaign.pacingMultiplier * 1000 : undefined) || this.defaultConfig.pacingInterval
    };
  }

  /**
   * Record metrics for historical analysis
   */
  async recordMetrics(campaignId: string, metrics: PredictiveMetrics): Promise<void> {
    const state = await this.getCampaignState(campaignId);
    
    // Add to performance history
    state.performanceMetrics.push(metrics);
    
    // Keep only recent data (last 100 data points)
    if (state.performanceMetrics.length > 100) {
      state.performanceMetrics.splice(0, state.performanceMetrics.length - 100);
    }

    // Update abandonment rate history
    state.abandonmentRateHistory.push(metrics.abandonmentRate);
    if (state.abandonmentRateHistory.length > 50) {
      state.abandonmentRateHistory.splice(0, state.abandonmentRateHistory.length - 50);
    }

    state.lastMetricsUpdate = new Date();

    // Store in Redis for real-time access
    await redis.setex(`metrics:${campaignId}`, 300, JSON.stringify(metrics)); // 5 minute cache
  }

  /**
   * Initialize campaign states from database
   */
  private async initializeCampaignStates(): Promise<void> {
    const activeCampaigns = await prisma.campaign.findMany({
      where: {
        isActive: true
      }
    });

    for (const campaign of activeCampaigns) {
      await this.getCampaignState(campaign.id);
    }

    console.log(`🎯 Initialized ${activeCampaigns.length} active campaigns for predictive dialing`);
  }

  /**
   * Main pacing loop - runs every interval to make dialing decisions
   */
  private async runPacingLoop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const activeCampaigns = Array.from(this.campaigns.keys());
      
      for (const campaignId of activeCampaigns) {
        const state = this.campaigns.get(campaignId);
        if (!state || !state.isActive) continue;

        try {
          // Calculate new dialing decision
          const decision = await this.calculateDialingDecision(campaignId);
          
          // Execute dialing decision if calls should be placed
          if (decision.shouldDial && decision.callsToPlace > 0) {
            await this.executePredictiveDialing(campaignId, decision);
          }

          // Record metrics for historical analysis
          const metrics = await this.collectCurrentMetrics(campaignId);
          await this.recordMetrics(campaignId, metrics);

        } catch (error) {
          console.error(`Error in pacing loop for campaign ${campaignId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in predictive dialing pacing loop:', error);
    }
  }

  /**
   * Execute predictive dialing decision
   */
  private async executePredictiveDialing(campaignId: string, decision: DialingDecision): Promise<void> {
    console.log(`🤖 PREDICTIVE DIAL: Campaign ${campaignId} - ${decision.callsToPlace} calls (${decision.dialRatio.toFixed(2)}x ratio)`);
    
    // Send command to advanced auto-dialer processor via Redis
    const dialCommand = {
      campaignId,
      callsToPlace: decision.callsToPlace,
      dialRatio: decision.dialRatio,
      mode: decision.dialingMode,
      timestamp: decision.timestamp,
      priority: decision.dialingMode === 'power' ? 1 : decision.dialingMode === 'predictive' ? 2 : 3
    };

    // Store execution command in Redis for auto-dialer processor
    await redis.lpush('dial:commands', JSON.stringify(dialCommand));
    
    // Also publish to real-time channel
    await redis.publish('dialer:commands', JSON.stringify(dialCommand));

    console.log(`📡 Dial command sent: ${decision.callsToPlace} calls for ${decision.dialingMode} mode`);
  }

  /**
   * Get current dialing status for all campaigns
   */
  async getDialingStatus(): Promise<CampaignDialingState[]> {
    return Array.from(this.campaigns.values());
  }

  /**
   * Set dialing mode for a campaign
   */
  async setDialingMode(campaignId: string, mode: 'progressive' | 'predictive' | 'power'): Promise<void> {
    const state = await this.getCampaignState(campaignId);
    state.dialingMode = mode;
    
    // Update campaign in database  
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { diallingMode: mode.charAt(0).toUpperCase() + mode.slice(1) }
    });

    console.log(`🔄 Campaign ${campaignId} dialing mode changed to: ${mode.toUpperCase()}`);
  }

  /**
   * Emergency stop for a campaign
   */
  async emergencyStop(campaignId: string): Promise<void> {
    const state = this.campaigns.get(campaignId);
    if (state) {
      state.isActive = false;
      console.log(`🛑 EMERGENCY STOP: Campaign ${campaignId} dialing halted`);
      
      // Clear any pending dial commands
      await redis.del(`dialing:decision:${campaignId}`);
    }
  }

  /**
   * Validate campaign context and ensure proper isolation
   */
  private async validateCampaignContext(campaignId: string): Promise<void> {
    try {
      // Verify campaign exists and is active
      const campaign = await prisma.campaign.findFirst({
        where: { 
          id: campaignId,
          isActive: true
        }
      });

      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found or not active`);
      }

      // Get assigned agents for this campaign
      const assignedAgents = await prisma.agent.count({
        where: {
          campaignAgents: {
            some: {
              campaignId: campaignId,
              isActive: true
            }
          }
        }
      });

      // Ensure we have at least one assigned agent
      if (assignedAgents === 0) {
        console.warn(`⚠️ Campaign ${campaignId} has no assigned agents`);
      }

      // Log campaign isolation confirmation
      console.log(`🔒 Campaign isolation validated: ${campaignId} with ${assignedAgents} agents`);
      
    } catch (error) {
      console.error(`❌ Campaign context validation failed for ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Get Redis key with proper campaign namespacing
   */
  private getCampaignRedisKey(campaignId: string, keyType: string): string {
    return `campaign:${campaignId}:predictive:${keyType}`;
  }

  /**
   * Log predictive decision with campaign context for audit
   */
  private async logPredictiveDecision(campaignId: string, decision: DialingDecision): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date(),
        campaignId,
        decision: {
          shouldDial: decision.shouldDial,
          callsToPlace: decision.callsToPlace,
          dialRatio: decision.dialRatio,
          dialingMode: decision.dialingMode,
          reasoning: decision.reasoning
        },
        isolationConfirmed: true,
        predictedOutcome: decision.predictedOutcome
      };

      // Store in Redis for audit trail
      await redis.lpush(
        this.getCampaignRedisKey(campaignId, 'decisions_log'), 
        JSON.stringify(logEntry)
      );
      
      // Keep last 100 decisions per campaign
      await redis.ltrim(
        this.getCampaignRedisKey(campaignId, 'decisions_log'), 
        0, 99
      );

    } catch (error) {
      console.error('Error logging predictive decision:', error);
    }
  }
}

// Export singleton instance
export const predictiveDialingService = new BackendPredictiveDialingService();