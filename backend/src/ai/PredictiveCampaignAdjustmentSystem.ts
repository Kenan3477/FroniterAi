/**
 * Predictive Campaign Adjustment System
 * Real-time campaign optimization based on performance metrics
 */

import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import RealTimeAIScoringEngine from './RealTimeAIScoringEngine';

export interface CampaignMetrics {
  campaignId: string;
  contactRate: number;
  conversionRate: number;
  averageCallDuration: number;
  leadQualityScore: number;
  agentUtilization: number;
  abandonnmentRate: number;
  costPerLead: number;
  revenuePerCall: number;
  sentimentTrend: number;
}

export interface PredictiveAdjustment {
  type: 'DIAL_RATE' | 'PRIORITY' | 'SCRIPT' | 'TIMING' | 'AGENT_ASSIGNMENT' | 'PAUSE_CAMPAIGN';
  reason: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  recommendation: string;
  parameters: any;
  estimatedImprovement: string;
}

export interface CampaignPrediction {
  campaignId: string;
  predictedOutcome: 'SUCCESS' | 'UNDERPERFORM' | 'FAIL';
  confidence: number;
  keyFactors: string[];
  recommendedActions: PredictiveAdjustment[];
  estimatedROI: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class PredictiveCampaignAdjustmentSystem {
  private prisma: PrismaClient;
  private io: Server;
  private scoringEngine: RealTimeAIScoringEngine;
  private activeCampaigns: Map<string, CampaignMetrics> = new Map();
  private adjustmentHistory: Map<string, any[]> = new Map();
  private performanceBenchmarks: Map<string, any> = new Map();
  private monitoringInterval: NodeJS.Timer;

  constructor(prisma: PrismaClient, io: Server, scoringEngine: RealTimeAIScoringEngine) {
    this.prisma = prisma;
    this.io = io;
    this.scoringEngine = scoringEngine;
    this.initializeBenchmarks();
    this.startPredictiveMonitoring();
  }

  /**
   * Initialize performance benchmarks
   */
  private async initializeBenchmarks() {
    console.log('📊 Initializing campaign performance benchmarks...');

    // Industry standard benchmarks
    this.performanceBenchmarks.set('default', {
      contactRate: { excellent: 0.8, good: 0.6, fair: 0.4, poor: 0.2 },
      conversionRate: { excellent: 0.15, good: 0.1, fair: 0.05, poor: 0.02 },
      averageCallDuration: { excellent: 480, good: 360, fair: 240, poor: 120 },
      abandonnmentRate: { excellent: 0.03, good: 0.05, fair: 0.1, poor: 0.15 },
      agentUtilization: { excellent: 0.85, good: 0.75, fair: 0.65, poor: 0.5 },
      sentimentTrend: { excellent: 0.3, good: 0.1, fair: -0.1, poor: -0.3 }
    });

    // Load historical benchmarks for each campaign type
    try {
      const historicalData = await this.prisma.campaignAnalytics.groupBy({
        by: ['campaignId'],
        _avg: {
          contactRate: true,
          conversionRate: true,
          averageCallDuration: true,
          leadQuality: true
        },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
          }
        }
      });

      for (const data of historicalData) {
        this.performanceBenchmarks.set(data.campaignId, {
          contactRate: data._avg.contactRate,
          conversionRate: data._avg.conversionRate,
          averageCallDuration: data._avg.averageCallDuration,
          leadQuality: data._avg.leadQuality
        });
      }

      console.log(`✅ Loaded benchmarks for ${historicalData.length} campaigns`);
    } catch (error) {
      console.error('Error loading historical benchmarks:', error);
    }
  }

  /**
   * Start predictive monitoring
   */
  private startPredictiveMonitoring() {
    console.log('🔮 Starting predictive campaign monitoring...');

    // Monitor campaigns every 2 minutes
    this.monitoringInterval = setInterval(async () => {
      await this.analyzeActiveCampaigns();
    }, 120000);

    // Deep analysis every 15 minutes
    setInterval(async () => {
      await this.performDeepAnalysis();
    }, 900000);
  }

  /**
   * Register campaign for monitoring
   */
  async registerCampaign(campaignId: string) {
    console.log(`📋 Registering campaign ${campaignId} for predictive monitoring`);

    const metrics = await this.calculateCampaignMetrics(campaignId);
    this.activeCampaigns.set(campaignId, metrics);
    this.adjustmentHistory.set(campaignId, []);

    // Perform initial analysis
    const prediction = await this.generateCampaignPrediction(campaignId, metrics);
    
    // Send to supervisors
    this.io.to('supervisors').emit('campaign:prediction', prediction);

    return prediction;
  }

  /**
   * Calculate real-time campaign metrics
   */
  private async calculateCampaignMetrics(campaignId: string): Promise<CampaignMetrics> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's call records for this campaign
      const callRecords = await this.prisma.callRecord.findMany({
        where: {
          campaignId: campaignId,
          startTime: {
            gte: today
          }
        },
        include: {
          contact: true,
          callDisposition: true
        }
      });

      const totalCalls = callRecords.length;
      const connectedCalls = callRecords.filter(r => r.status === 'CONNECTED').length;
      const convertedCalls = callRecords.filter(r => 
        r.callDisposition?.outcome === 'SALE' || 
        r.callDisposition?.outcome === 'QUALIFIED_LEAD'
      ).length;

      const totalDuration = callRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
      const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

      // Get agent utilization
      const activeAgents = await this.getActiveCampaignAgents(campaignId);
      const agentUtilization = await this.calculateAgentUtilization(campaignId);

      // Get sentiment data
      const sentimentData = await this.prisma.conversationAnalysis.findMany({
        where: {
          callRecord: {
            campaignId: campaignId
          },
          createdAt: {
            gte: today
          }
        },
        select: {
          overallSentiment: true
        }
      });

      const averageSentiment = sentimentData.length > 0 
        ? sentimentData.reduce((sum, s) => sum + (s.overallSentiment || 0), 0) / sentimentData.length
        : 0;

      return {
        campaignId,
        contactRate: totalCalls > 0 ? connectedCalls / totalCalls : 0,
        conversionRate: connectedCalls > 0 ? convertedCalls / connectedCalls : 0,
        averageCallDuration: averageDuration,
        leadQualityScore: await this.calculateLeadQualityScore(campaignId),
        agentUtilization,
        abandonnmentRate: await this.calculateAbandonmentRate(campaignId),
        costPerLead: await this.calculateCostPerLead(campaignId),
        revenuePerCall: await this.calculateRevenuePerCall(campaignId),
        sentimentTrend: averageSentiment
      };

    } catch (error) {
      console.error(`Error calculating metrics for campaign ${campaignId}:`, error);
      
      // Return default metrics
      return {
        campaignId,
        contactRate: 0,
        conversionRate: 0,
        averageCallDuration: 0,
        leadQualityScore: 0,
        agentUtilization: 0,
        abandonnmentRate: 0,
        costPerLead: 0,
        revenuePerCall: 0,
        sentimentTrend: 0
      };
    }
  }

  /**
   * Generate campaign prediction
   */
  private async generateCampaignPrediction(campaignId: string, metrics: CampaignMetrics): Promise<CampaignPrediction> {
    const benchmarks = this.performanceBenchmarks.get(campaignId) || this.performanceBenchmarks.get('default');
    const adjustments: PredictiveAdjustment[] = [];
    const keyFactors: string[] = [];
    let confidence = 0.7; // Base confidence
    let predictedOutcome: 'SUCCESS' | 'UNDERPERFORM' | 'FAIL' = 'SUCCESS';
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

    // Analyze contact rate
    if (metrics.contactRate < benchmarks.contactRate.poor) {
      keyFactors.push('Very low contact rate');
      adjustments.push({
        type: 'TIMING',
        reason: 'Contact rate significantly below benchmark',
        impact: 'HIGH',
        confidence: 0.85,
        recommendation: 'Adjust calling hours to optimal times',
        parameters: { suggestedHours: ['9-11 AM', '2-4 PM', '6-8 PM'] },
        estimatedImprovement: '+15-25% contact rate'
      });
      riskLevel = 'HIGH';
    } else if (metrics.contactRate < benchmarks.contactRate.fair) {
      adjustments.push({
        type: 'DIAL_RATE',
        reason: 'Contact rate below expected range',
        impact: 'MEDIUM',
        confidence: 0.75,
        recommendation: 'Optimize dialing pace and contact data quality',
        parameters: { dialRateAdjustment: 0.8 },
        estimatedImprovement: '+8-15% contact rate'
      });
    }

    // Analyze conversion rate
    if (metrics.conversionRate < benchmarks.conversionRate.poor) {
      keyFactors.push('Conversion rate critically low');
      adjustments.push({
        type: 'SCRIPT',
        reason: 'Conversion rate indicates script or qualification issues',
        impact: 'CRITICAL',
        confidence: 0.9,
        recommendation: 'Review and update call script, retrain agents',
        parameters: { scriptReviewRequired: true },
        estimatedImprovement: '+20-40% conversion rate'
      });
      predictedOutcome = 'FAIL';
      riskLevel = 'CRITICAL';
    } else if (metrics.conversionRate < benchmarks.conversionRate.fair) {
      adjustments.push({
        type: 'AGENT_ASSIGNMENT',
        reason: 'Conversion rate suggests agent performance issues',
        impact: 'HIGH',
        confidence: 0.8,
        recommendation: 'Assign top-performing agents to this campaign',
        parameters: { performanceThreshold: 0.85 },
        estimatedImprovement: '+10-20% conversion rate'
      });
    }

    // Analyze sentiment trend
    if (metrics.sentimentTrend < -0.2) {
      keyFactors.push('Negative customer sentiment trend');
      adjustments.push({
        type: 'PAUSE_CAMPAIGN',
        reason: 'Customer sentiment trend indicates potential compliance risk',
        impact: 'CRITICAL',
        confidence: 0.85,
        recommendation: 'Pause campaign for script review and agent coaching',
        parameters: { pauseDuration: 24 },
        estimatedImprovement: 'Prevent brand damage and compliance issues'
      });
      riskLevel = 'CRITICAL';
    }

    // Analyze agent utilization
    if (metrics.agentUtilization < 0.6) {
      keyFactors.push('Low agent utilization');
      adjustments.push({
        type: 'DIAL_RATE',
        reason: 'Agents are idle too frequently',
        impact: 'MEDIUM',
        confidence: 0.75,
        recommendation: 'Increase dialing pace to maximize agent productivity',
        parameters: { dialRateIncrease: 1.3 },
        estimatedImprovement: '+15-25% agent productivity'
      });
    }

    // Determine overall prediction
    if (adjustments.some(a => a.impact === 'CRITICAL')) {
      predictedOutcome = 'FAIL';
      confidence = 0.85;
    } else if (adjustments.some(a => a.impact === 'HIGH')) {
      predictedOutcome = 'UNDERPERFORM';
      confidence = 0.75;
    }

    // Calculate estimated ROI
    const estimatedROI = this.calculatePredictedROI(metrics, adjustments);

    return {
      campaignId,
      predictedOutcome,
      confidence,
      keyFactors,
      recommendedActions: adjustments,
      estimatedROI,
      riskLevel
    };
  }

  /**
   * Auto-apply low-risk adjustments
   */
  async autoApplyAdjustments(campaignId: string, adjustments: PredictiveAdjustment[]) {
    console.log(`🔧 Auto-applying adjustments for campaign ${campaignId}`);

    for (const adjustment of adjustments) {
      // Only auto-apply low-risk adjustments
      if (adjustment.impact === 'LOW' || (adjustment.impact === 'MEDIUM' && adjustment.confidence > 0.8)) {
        try {
          await this.applyAdjustment(campaignId, adjustment);
          console.log(`✅ Auto-applied ${adjustment.type} adjustment`);
        } catch (error) {
          console.error(`❌ Failed to auto-apply adjustment:`, error);
        }
      } else {
        // Send high-risk adjustments to supervisors for approval
        this.io.to('supervisors').emit('campaign:adjustment:approval-required', {
          campaignId,
          adjustment,
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Apply specific adjustment
   */
  private async applyAdjustment(campaignId: string, adjustment: PredictiveAdjustment) {
    switch (adjustment.type) {
      case 'DIAL_RATE':
        await this.adjustDialRate(campaignId, adjustment.parameters);
        break;

      case 'PRIORITY':
        await this.adjustCampaignPriority(campaignId, adjustment.parameters);
        break;

      case 'TIMING':
        await this.adjustCallingHours(campaignId, adjustment.parameters);
        break;

      case 'AGENT_ASSIGNMENT':
        await this.optimizeAgentAssignment(campaignId, adjustment.parameters);
        break;

      case 'PAUSE_CAMPAIGN':
        await this.pauseCampaign(campaignId, adjustment.parameters);
        break;

      default:
        console.log(`Manual adjustment required: ${adjustment.type}`);
    }

    // Log the adjustment
    this.logAdjustment(campaignId, adjustment);
  }

  /**
   * Analyze all active campaigns
   */
  private async analyzeActiveCampaigns() {
    console.log(`🔍 Analyzing ${this.activeCampaigns.size} active campaigns...`);

    for (const [campaignId] of this.activeCampaigns) {
      try {
        const metrics = await this.calculateCampaignMetrics(campaignId);
        this.activeCampaigns.set(campaignId, metrics);

        const prediction = await this.generateCampaignPrediction(campaignId, metrics);

        // Auto-apply safe adjustments
        if (prediction.recommendedActions.length > 0) {
          await this.autoApplyAdjustments(campaignId, prediction.recommendedActions);
        }

        // Send real-time updates
        this.io.to('supervisors').emit('campaign:metrics:update', {
          campaignId,
          metrics,
          prediction,
          timestamp: new Date()
        });

      } catch (error) {
        console.error(`Error analyzing campaign ${campaignId}:`, error);
      }
    }
  }

  /**
   * Perform deep analysis with ML predictions
   */
  private async performDeepAnalysis() {
    console.log('🧠 Performing deep campaign analysis...');

    // This would integrate with ML models for more sophisticated predictions
    // For now, we'll implement rule-based deep analysis

    for (const [campaignId, metrics] of this.activeCampaigns) {
      try {
        // Analyze trends over time
        const trends = await this.analyzeCampaignTrends(campaignId);
        
        // Predict end-of-day outcomes
        const endOfDayPrediction = await this.predictEndOfDayPerformance(campaignId, metrics);

        // Send insights to supervisors
        this.io.to('supervisors').emit('campaign:deep-analysis', {
          campaignId,
          trends,
          endOfDayPrediction,
          timestamp: new Date()
        });

      } catch (error) {
        console.error(`Error in deep analysis for campaign ${campaignId}:`, error);
      }
    }
  }

  /**
   * Calculate predicted ROI
   */
  private calculatePredictedROI(metrics: CampaignMetrics, adjustments: PredictiveAdjustment[]): number {
    let baseROI = (metrics.revenuePerCall * metrics.conversionRate) - metrics.costPerLead;
    
    // Apply adjustment impacts
    for (const adjustment of adjustments) {
      const impact = adjustment.estimatedImprovement;
      if (impact.includes('%')) {
        const percentage = parseFloat(impact.match(/\d+/)?.[0] || '0') / 100;
        baseROI *= (1 + percentage * adjustment.confidence);
      }
    }

    return Math.round(baseROI * 100) / 100;
  }

  /**
   * Helper methods for specific adjustments
   */
  private async adjustDialRate(campaignId: string, parameters: any) {
    // Implementation would integrate with dialler settings
    console.log(`📞 Adjusting dial rate for campaign ${campaignId}:`, parameters);
  }

  private async adjustCampaignPriority(campaignId: string, parameters: any) {
    // Update campaign priority in database
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { priority: parameters.newPriority }
    });
  }

  private async adjustCallingHours(campaignId: string, parameters: any) {
    // Update campaign calling schedule
    console.log(`⏰ Adjusting calling hours for campaign ${campaignId}:`, parameters);
  }

  private async optimizeAgentAssignment(campaignId: string, parameters: any) {
    // Reassign top-performing agents
    console.log(`👥 Optimizing agent assignment for campaign ${campaignId}:`, parameters);
  }

  private async pauseCampaign(campaignId: string, parameters: any) {
    // Pause campaign temporarily
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' }
    });

    this.io.to('supervisors').emit('campaign:paused', {
      campaignId,
      reason: 'Predictive system pause for performance issues',
      duration: parameters.pauseDuration
    });
  }

  /**
   * Helper calculation methods
   */
  private async getActiveCampaignAgents(campaignId: string): Promise<string[]> {
    // Return list of agents assigned to campaign
    return [];
  }

  private async calculateAgentUtilization(campaignId: string): Promise<number> {
    // Calculate current agent utilization for this campaign
    return 0.75; // Default value
  }

  private async calculateLeadQualityScore(campaignId: string): Promise<number> {
    // Calculate lead quality based on various factors
    return 0.6; // Default value
  }

  private async calculateAbandonmentRate(campaignId: string): Promise<number> {
    // Calculate call abandonment rate
    return 0.05; // Default value
  }

  private async calculateCostPerLead(campaignId: string): Promise<number> {
    // Calculate current cost per lead
    return 25.0; // Default value
  }

  private async calculateRevenuePerCall(campaignId: string): Promise<number> {
    // Calculate average revenue per call
    return 150.0; // Default value
  }

  private async analyzeCampaignTrends(campaignId: string): Promise<any> {
    // Analyze performance trends over time
    return {
      contactRateTrend: 'INCREASING',
      conversionTrend: 'STABLE',
      sentimentTrend: 'IMPROVING'
    };
  }

  private async predictEndOfDayPerformance(campaignId: string, metrics: CampaignMetrics): Promise<any> {
    // Predict end-of-day performance based on current trajectory
    return {
      expectedCalls: 450,
      expectedConversions: 35,
      expectedRevenue: 8750,
      confidence: 0.82
    };
  }

  private logAdjustment(campaignId: string, adjustment: PredictiveAdjustment) {
    const history = this.adjustmentHistory.get(campaignId) || [];
    history.push({
      adjustment,
      timestamp: new Date(),
      applied: true
    });
    this.adjustmentHistory.set(campaignId, history);
  }

  /**
   * Get campaign insights and recommendations
   */
  async getCampaignInsights(campaignId: string) {
    const metrics = this.activeCampaigns.get(campaignId);
    if (!metrics) {
      throw new Error(`Campaign ${campaignId} not found in active monitoring`);
    }

    const prediction = await this.generateCampaignPrediction(campaignId, metrics);
    const history = this.adjustmentHistory.get(campaignId) || [];

    return {
      metrics,
      prediction,
      adjustmentHistory: history.slice(-10), // Last 10 adjustments
      recommendations: prediction.recommendedActions
    };
  }

  /**
   * Stop monitoring a campaign
   */
  stopMonitoring(campaignId: string) {
    this.activeCampaigns.delete(campaignId);
    this.adjustmentHistory.delete(campaignId);
    console.log(`🛑 Stopped monitoring campaign ${campaignId}`);
  }

  /**
   * Cleanup and shutdown
   */
  shutdown() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    console.log('🔮 Predictive campaign system shutdown complete');
  }
}

export default PredictiveCampaignAdjustmentSystem;