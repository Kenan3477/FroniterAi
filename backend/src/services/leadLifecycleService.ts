// Lead Lifecycle Management Service
// Comprehensive lead progression tracking with analytics and stage optimization

import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { DispositionEvent } from '../types/events';

const prisma = new PrismaClient();
const eventEmitter = new EventEmitter();

// Lead Lifecycle Stages
export enum LeadLifecycleStage {
  // Initial Contact Stages
  NEW = 'NEW',                           // Fresh lead, no contact yet
  CONTACTED = 'CONTACTED',               // Initial contact made
  ENGAGED = 'ENGAGED',                   // Lead showed interest/responded
  
  // Qualification Stages  
  QUALIFYING = 'QUALIFYING',             // In qualification process
  QUALIFIED = 'QUALIFIED',               // Meets qualification criteria
  DISQUALIFIED = 'DISQUALIFIED',        // Doesn't meet criteria
  
  // Opportunity Stages
  OPPORTUNITY = 'OPPORTUNITY',           // Qualified opportunity created
  PROPOSAL = 'PROPOSAL',                 // Proposal/quote sent
  NEGOTIATION = 'NEGOTIATION',           // In negotiation phase
  
  // Decision Stages
  DECISION_PENDING = 'DECISION_PENDING', // Awaiting decision
  WON = 'WON',                          // Successfully converted
  LOST = 'LOST',                        // Lost to competition/no decision
  
  // Follow-up Stages
  NURTURING = 'NURTURING',              // Long-term nurturing
  REACTIVATED = 'REACTIVATED',          // Re-engaged after dormancy
  
  // Terminal Stages
  CONVERTED = 'CONVERTED',              // Final conversion completed
  CLOSED = 'CLOSED',                    // Closed without conversion
  DO_NOT_CONTACT = 'DO_NOT_CONTACT'     // Opted out/requested no contact
}

// Stage Categories for Analytics
export enum StageCategory {
  PROSPECT = 'PROSPECT',     // NEW, CONTACTED, ENGAGED
  QUALIFICATION = 'QUALIFICATION', // QUALIFYING, QUALIFIED, DISQUALIFIED
  OPPORTUNITY = 'OPPORTUNITY',     // OPPORTUNITY, PROPOSAL, NEGOTIATION
  DECISION = 'DECISION',           // DECISION_PENDING, WON, LOST
  NURTURE = 'NURTURE',            // NURTURING, REACTIVATED
  TERMINAL = 'TERMINAL'            // CONVERTED, CLOSED, DO_NOT_CONTACT
}

// Lead Score Categories
export enum LeadScore {
  HOT = 'HOT',           // 80-100 - High conversion probability
  WARM = 'WARM',         // 60-79 - Good conversion potential  
  COOL = 'COOL',         // 40-59 - Moderate interest
  COLD = 'COLD'          // 0-39 - Low conversion probability
}

// Lifecycle Stage Transition Rules
interface StageTransition {
  fromStage: LeadLifecycleStage;
  toStage: LeadLifecycleStage;
  isAllowed: boolean;
  requiresApproval?: boolean;
  conditions?: {
    minDaysInStage?: number;
    requiredActions?: string[];
    scoreThreshold?: number;
  };
}

// Lead Lifecycle Entry
export interface LeadLifecycleEntry {
  id: string;
  contactId: string;
  campaignId: string;
  agentId?: string;
  
  // Current State
  currentStage: LeadLifecycleStage;
  previousStage?: LeadLifecycleStage;
  stageCategory: StageCategory;
  leadScore: number; // 0-100
  leadScoreCategory: LeadScore;
  
  // Progression Analytics
  daysInCurrentStage: number;
  totalDaysInLifecycle: number;
  stageTransitionCount: number;
  conversionProbability: number; // 0-100%
  
  // Stage History
  stageHistory: StageHistoryEntry[];
  
  // Business Metrics
  estimatedValue: number;
  actualValue?: number;
  costToAcquire: number;
  timeToConvert?: number; // Days from new to converted
  
  // Quality Indicators
  engagementScore: number; // 0-100 based on interactions
  responseRate: number; // % of outreach attempts that got response
  meetingAcceptanceRate: number; // % of meeting requests accepted
  
  // Next Actions
  nextAction?: string;
  nextActionDue?: Date;
  recommendedActions: string[];
  
  // Timestamps
  createdAt: Date;
  lastContactAt?: Date;
  lastStageChangeAt: Date;
  convertedAt?: Date;
  closedAt?: Date;
}

// Stage History Entry
export interface StageHistoryEntry {
  id: string;
  fromStage?: LeadLifecycleStage;
  toStage: LeadLifecycleStage;
  transitionReason: string;
  agentId?: string;
  agentName?: string;
  duration: number; // Days in previous stage
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Lifecycle Analytics
export interface LifecycleAnalytics {
  // Overview Metrics
  totalLeads: number;
  activeLeads: number;
  convertedLeads: number;
  conversionRate: number; // %
  
  // Stage Distribution
  stageDistribution: {
    stage: LeadLifecycleStage;
    count: number;
    percentage: number;
    avgDaysInStage: number;
    conversionRate: number;
  }[];
  
  // Performance Metrics
  avgTimeToConversion: number; // Days
  avgLeadValue: number;
  totalPipelineValue: number;
  predictedMonthlyConversions: number;
  
  // Quality Metrics
  avgLeadScore: number;
  avgEngagementScore: number;
  leadVelocity: number; // Leads moving forward per day
  stagnationRate: number; // % of leads stuck in stage too long
  
  // Conversion Funnel
  conversionFunnel: {
    stage: LeadLifecycleStage;
    leadsEntered: number;
    leadsExited: number;
    conversionToNext: number; // %
    dropOffRate: number; // %
  }[];
  
  // Agent Performance
  agentPerformance: {
    agentId: string;
    agentName: string;
    leadsManaged: number;
    conversionRate: number;
    avgTimeToConversion: number;
    avgLeadScore: number;
    totalValue: number;
  }[];
}

// Campaign Lifecycle Analysis
export interface CampaignLifecycleAnalysis {
  campaignId: string;
  campaignName: string;
  
  // Lifecycle Metrics
  totalLeads: number;
  activeLeads: number;
  conversionRate: number;
  avgTimeToConversion: number;
  
  // Financial Metrics
  totalValue: number;
  avgDealSize: number;
  costPerLead: number;
  costPerConversion: number;
  roi: number; // Return on investment %
  
  // Stage Performance
  stagePerformance: {
    stage: LeadLifecycleStage;
    conversionRate: number;
    avgDuration: number;
    stagnationRate: number;
    recommendations: string[];
  }[];
  
  // Optimization Opportunities
  optimizationOpportunities: {
    opportunity: string;
    potentialImpact: string;
    recommendedActions: string[];
    estimatedValue: number;
  }[];
}

class LeadLifecycleService {
  // Stage Transition Rules
  private stageTransitions: StageTransition[] = [
    // From NEW
    { fromStage: LeadLifecycleStage.NEW, toStage: LeadLifecycleStage.CONTACTED, isAllowed: true },
    { fromStage: LeadLifecycleStage.NEW, toStage: LeadLifecycleStage.DO_NOT_CONTACT, isAllowed: true },
    
    // From CONTACTED
    { fromStage: LeadLifecycleStage.CONTACTED, toStage: LeadLifecycleStage.ENGAGED, isAllowed: true },
    { fromStage: LeadLifecycleStage.CONTACTED, toStage: LeadLifecycleStage.CLOSED, isAllowed: true },
    { fromStage: LeadLifecycleStage.CONTACTED, toStage: LeadLifecycleStage.DO_NOT_CONTACT, isAllowed: true },
    
    // From ENGAGED
    { fromStage: LeadLifecycleStage.ENGAGED, toStage: LeadLifecycleStage.QUALIFYING, isAllowed: true },
    { fromStage: LeadLifecycleStage.ENGAGED, toStage: LeadLifecycleStage.NURTURING, isAllowed: true },
    
    // From QUALIFYING
    { fromStage: LeadLifecycleStage.QUALIFYING, toStage: LeadLifecycleStage.QUALIFIED, isAllowed: true },
    { fromStage: LeadLifecycleStage.QUALIFYING, toStage: LeadLifecycleStage.DISQUALIFIED, isAllowed: true },
    
    // From QUALIFIED
    { fromStage: LeadLifecycleStage.QUALIFIED, toStage: LeadLifecycleStage.OPPORTUNITY, isAllowed: true },
    { fromStage: LeadLifecycleStage.QUALIFIED, toStage: LeadLifecycleStage.NURTURING, isAllowed: true },
    
    // From OPPORTUNITY
    { fromStage: LeadLifecycleStage.OPPORTUNITY, toStage: LeadLifecycleStage.PROPOSAL, isAllowed: true },
    { fromStage: LeadLifecycleStage.OPPORTUNITY, toStage: LeadLifecycleStage.LOST, isAllowed: true },
    
    // From PROPOSAL
    { fromStage: LeadLifecycleStage.PROPOSAL, toStage: LeadLifecycleStage.NEGOTIATION, isAllowed: true },
    { fromStage: LeadLifecycleStage.PROPOSAL, toStage: LeadLifecycleStage.DECISION_PENDING, isAllowed: true },
    { fromStage: LeadLifecycleStage.PROPOSAL, toStage: LeadLifecycleStage.LOST, isAllowed: true },
    
    // From NEGOTIATION
    { fromStage: LeadLifecycleStage.NEGOTIATION, toStage: LeadLifecycleStage.DECISION_PENDING, isAllowed: true },
    { fromStage: LeadLifecycleStage.NEGOTIATION, toStage: LeadLifecycleStage.WON, isAllowed: true },
    { fromStage: LeadLifecycleStage.NEGOTIATION, toStage: LeadLifecycleStage.LOST, isAllowed: true },
    
    // From DECISION_PENDING
    { fromStage: LeadLifecycleStage.DECISION_PENDING, toStage: LeadLifecycleStage.WON, isAllowed: true },
    { fromStage: LeadLifecycleStage.DECISION_PENDING, toStage: LeadLifecycleStage.LOST, isAllowed: true },
    
    // From WON
    { fromStage: LeadLifecycleStage.WON, toStage: LeadLifecycleStage.CONVERTED, isAllowed: true },
    
    // From NURTURING
    { fromStage: LeadLifecycleStage.NURTURING, toStage: LeadLifecycleStage.REACTIVATED, isAllowed: true },
    { fromStage: LeadLifecycleStage.NURTURING, toStage: LeadLifecycleStage.CLOSED, isAllowed: true },
    
    // From REACTIVATED
    { fromStage: LeadLifecycleStage.REACTIVATED, toStage: LeadLifecycleStage.ENGAGED, isAllowed: true },
    { fromStage: LeadLifecycleStage.REACTIVATED, toStage: LeadLifecycleStage.QUALIFYING, isAllowed: true },
  ];

  // Create new lead lifecycle entry
  async createLeadLifecycle(data: {
    contactId: string;
    campaignId: string;
    agentId?: string;
    initialStage?: LeadLifecycleStage;
    estimatedValue?: number;
  }): Promise<LeadLifecycleEntry> {
    const initialStage = data.initialStage || LeadLifecycleStage.NEW;
    
    const lifecycle: LeadLifecycleEntry = {
      id: `lifecycle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contactId: data.contactId,
      campaignId: data.campaignId,
      agentId: data.agentId,
      currentStage: initialStage,
      stageCategory: this.getStageCategory(initialStage),
      leadScore: 0,
      leadScoreCategory: LeadScore.COLD,
      daysInCurrentStage: 0,
      totalDaysInLifecycle: 0,
      stageTransitionCount: 0,
      conversionProbability: 0,
      stageHistory: [{
        id: `history_${Date.now()}`,
        toStage: initialStage,
        transitionReason: 'Initial stage assignment',
        agentId: data.agentId,
        duration: 0,
        timestamp: new Date()
      }],
      estimatedValue: data.estimatedValue || 0,
      costToAcquire: 0,
      engagementScore: 0,
      responseRate: 0,
      meetingAcceptanceRate: 0,
      recommendedActions: this.getRecommendedActions(initialStage),
      createdAt: new Date(),
      lastStageChangeAt: new Date()
    };

    // Emit lifecycle created event
    this.emitLifecycleEvent('lifecycle.created', lifecycle);

    return lifecycle;
  }

  // Transition lead to new stage
  async transitionStage(
    lifecycleId: string, 
    newStage: LeadLifecycleStage, 
    reason: string,
    agentId?: string,
    metadata?: Record<string, any>
  ): Promise<LeadLifecycleEntry> {
    const lifecycle = await this.getLifecycleById(lifecycleId);
    if (!lifecycle) {
      throw new Error('Lead lifecycle not found');
    }

    // Validate transition
    const isValidTransition = this.validateStageTransition(lifecycle.currentStage, newStage);
    if (!isValidTransition) {
      throw new Error(`Invalid stage transition from ${lifecycle.currentStage} to ${newStage}`);
    }

    // Calculate days in current stage
    const daysInStage = Math.floor(
      (new Date().getTime() - lifecycle.lastStageChangeAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Create stage history entry
    const historyEntry: StageHistoryEntry = {
      id: `history_${Date.now()}`,
      fromStage: lifecycle.currentStage,
      toStage: newStage,
      transitionReason: reason,
      agentId,
      duration: daysInStage,
      timestamp: new Date(),
      metadata
    };

    // Update lifecycle
    const updatedLifecycle: LeadLifecycleEntry = {
      ...lifecycle,
      previousStage: lifecycle.currentStage,
      currentStage: newStage,
      stageCategory: this.getStageCategory(newStage),
      daysInCurrentStage: 0,
      totalDaysInLifecycle: lifecycle.totalDaysInLifecycle + daysInStage,
      stageTransitionCount: lifecycle.stageTransitionCount + 1,
      stageHistory: [...lifecycle.stageHistory, historyEntry],
      lastStageChangeAt: new Date(),
      recommendedActions: this.getRecommendedActions(newStage),
      convertedAt: newStage === LeadLifecycleStage.CONVERTED ? new Date() : lifecycle.convertedAt,
      closedAt: this.isTerminalStage(newStage) ? new Date() : lifecycle.closedAt
    };

    // Update conversion probability
    updatedLifecycle.conversionProbability = this.calculateConversionProbability(updatedLifecycle);

    // Update lead score
    updatedLifecycle.leadScore = this.calculateLeadScore(updatedLifecycle);
    updatedLifecycle.leadScoreCategory = this.getLeadScoreCategory(updatedLifecycle.leadScore);

    // Emit stage transition event
    this.emitLifecycleEvent('lifecycle.stage_transition', updatedLifecycle, {
      previousStage: lifecycle.currentStage,
      newStage,
      reason,
      agentId
    });

    return updatedLifecycle;
  }

  // Update lead score and engagement metrics
  async updateEngagementMetrics(
    lifecycleId: string,
    metrics: {
      responseRate?: number;
      meetingAcceptanceRate?: number;
      lastContactAt?: Date;
      estimatedValue?: number;
      actualValue?: number;
    }
  ): Promise<LeadLifecycleEntry> {
    const lifecycle = await this.getLifecycleById(lifecycleId);
    if (!lifecycle) {
      throw new Error('Lead lifecycle not found');
    }

    const updatedLifecycle: LeadLifecycleEntry = {
      ...lifecycle,
      responseRate: metrics.responseRate ?? lifecycle.responseRate,
      meetingAcceptanceRate: metrics.meetingAcceptanceRate ?? lifecycle.meetingAcceptanceRate,
      lastContactAt: metrics.lastContactAt ?? lifecycle.lastContactAt,
      estimatedValue: metrics.estimatedValue ?? lifecycle.estimatedValue,
      actualValue: metrics.actualValue ?? lifecycle.actualValue
    };

    // Recalculate engagement score
    updatedLifecycle.engagementScore = this.calculateEngagementScore(updatedLifecycle);

    // Recalculate lead score
    updatedLifecycle.leadScore = this.calculateLeadScore(updatedLifecycle);
    updatedLifecycle.leadScoreCategory = this.getLeadScoreCategory(updatedLifecycle.leadScore);

    // Recalculate conversion probability
    updatedLifecycle.conversionProbability = this.calculateConversionProbability(updatedLifecycle);

    return updatedLifecycle;
  }

  // Get lifecycle analytics for campaign
  async getCampaignLifecycleAnalytics(campaignId: string): Promise<LifecycleAnalytics> {
    // This would query actual database in production
    const mockLifecycles = await this.getLifecyclesByCampaign(campaignId);

    const totalLeads = mockLifecycles.length;
    const activeLeads = mockLifecycles.filter(l => !this.isTerminalStage(l.currentStage)).length;
    const convertedLeads = mockLifecycles.filter(l => 
      l.currentStage === LeadLifecycleStage.CONVERTED
    ).length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Stage distribution
    const stageDistribution = Object.values(LeadLifecycleStage).map(stage => {
      const stageLeads = mockLifecycles.filter(l => l.currentStage === stage);
      const stageConverted = stageLeads.filter(l => 
        l.stageHistory.some(h => h.toStage === LeadLifecycleStage.CONVERTED)
      );
      
      return {
        stage,
        count: stageLeads.length,
        percentage: totalLeads > 0 ? (stageLeads.length / totalLeads) * 100 : 0,
        avgDaysInStage: stageLeads.length > 0 
          ? stageLeads.reduce((sum, l) => sum + l.daysInCurrentStage, 0) / stageLeads.length 
          : 0,
        conversionRate: stageLeads.length > 0 ? (stageConverted.length / stageLeads.length) * 100 : 0
      };
    });

    // Performance metrics
    const convertedWithTime = mockLifecycles.filter(l => l.timeToConvert);
    const avgTimeToConversion = convertedWithTime.length > 0
      ? convertedWithTime.reduce((sum, l) => sum + (l.timeToConvert || 0), 0) / convertedWithTime.length
      : 0;

    const avgLeadValue = mockLifecycles.length > 0
      ? mockLifecycles.reduce((sum, l) => sum + l.estimatedValue, 0) / mockLifecycles.length
      : 0;

    const totalPipelineValue = mockLifecycles
      .filter(l => !this.isTerminalStage(l.currentStage))
      .reduce((sum, l) => sum + l.estimatedValue, 0);

    return {
      totalLeads,
      activeLeads,
      convertedLeads,
      conversionRate,
      stageDistribution,
      avgTimeToConversion,
      avgLeadValue,
      totalPipelineValue,
      predictedMonthlyConversions: this.calculatePredictedConversions(mockLifecycles),
      avgLeadScore: mockLifecycles.length > 0 
        ? mockLifecycles.reduce((sum, l) => sum + l.leadScore, 0) / mockLifecycles.length 
        : 0,
      avgEngagementScore: mockLifecycles.length > 0
        ? mockLifecycles.reduce((sum, l) => sum + l.engagementScore, 0) / mockLifecycles.length
        : 0,
      leadVelocity: this.calculateLeadVelocity(mockLifecycles),
      stagnationRate: this.calculateStagnationRate(mockLifecycles),
      conversionFunnel: this.generateConversionFunnel(mockLifecycles),
      agentPerformance: this.calculateAgentPerformance(mockLifecycles)
    };
  }

  // Get campaign lifecycle analysis with optimization recommendations
  async getCampaignLifecycleAnalysis(campaignId: string): Promise<CampaignLifecycleAnalysis> {
    const analytics = await this.getCampaignLifecycleAnalytics(campaignId);
    const campaign = await this.getCampaignDetails(campaignId);

    // Calculate financial metrics
    const totalValue = analytics.convertedLeads * analytics.avgLeadValue;
    const campaignCost = this.calculateCampaignCost(campaignId);
    const costPerLead = analytics.totalLeads > 0 ? campaignCost / analytics.totalLeads : 0;
    const costPerConversion = analytics.convertedLeads > 0 ? campaignCost / analytics.convertedLeads : 0;
    const roi = campaignCost > 0 ? ((totalValue - campaignCost) / campaignCost) * 100 : 0;

    // Stage performance analysis
    const stagePerformance = analytics.stageDistribution.map(stage => ({
      stage: stage.stage,
      conversionRate: stage.conversionRate,
      avgDuration: stage.avgDaysInStage,
      stagnationRate: stage.avgDaysInStage > this.getOptimalStageDuration(stage.stage) ? 
        ((stage.avgDaysInStage - this.getOptimalStageDuration(stage.stage)) / stage.avgDaysInStage) * 100 : 0,
      recommendations: this.getStageOptimizationRecommendations(stage.stage, stage)
    }));

    // Optimization opportunities
    const optimizationOpportunities = this.identifyOptimizationOpportunities(analytics, stagePerformance);

    return {
      campaignId,
      campaignName: campaign?.name || 'Unknown Campaign',
      totalLeads: analytics.totalLeads,
      activeLeads: analytics.activeLeads,
      conversionRate: analytics.conversionRate,
      avgTimeToConversion: analytics.avgTimeToConversion,
      totalValue,
      avgDealSize: analytics.avgLeadValue,
      costPerLead,
      costPerConversion,
      roi,
      stagePerformance,
      optimizationOpportunities
    };
  }

  // Private helper methods
  private validateStageTransition(fromStage: LeadLifecycleStage, toStage: LeadLifecycleStage): boolean {
    return this.stageTransitions.some(t => 
      t.fromStage === fromStage && t.toStage === toStage && t.isAllowed
    );
  }

  private calculateConversionProbability(lifecycle: LeadLifecycleEntry): number {
    // Base probability by stage
    const stageProbability: Record<LeadLifecycleStage, number> = {
      [LeadLifecycleStage.NEW]: 5,
      [LeadLifecycleStage.CONTACTED]: 10,
      [LeadLifecycleStage.ENGAGED]: 20,
      [LeadLifecycleStage.QUALIFYING]: 35,
      [LeadLifecycleStage.QUALIFIED]: 50,
      [LeadLifecycleStage.OPPORTUNITY]: 65,
      [LeadLifecycleStage.PROPOSAL]: 75,
      [LeadLifecycleStage.NEGOTIATION]: 85,
      [LeadLifecycleStage.DECISION_PENDING]: 70,
      [LeadLifecycleStage.WON]: 95,
      [LeadLifecycleStage.NURTURING]: 15,
      [LeadLifecycleStage.REACTIVATED]: 25,
      [LeadLifecycleStage.CONVERTED]: 100,
      [LeadLifecycleStage.DISQUALIFIED]: 0,
      [LeadLifecycleStage.LOST]: 0,
      [LeadLifecycleStage.CLOSED]: 0,
      [LeadLifecycleStage.DO_NOT_CONTACT]: 0
    };

    let probability = stageProbability[lifecycle.currentStage];

    // Adjust for engagement score
    const engagementBonus = (lifecycle.engagementScore - 50) * 0.3;
    probability += engagementBonus;

    // Adjust for response rate
    const responseBonus = (lifecycle.responseRate - 50) * 0.2;
    probability += responseBonus;

    // Adjust for time in stage (too long reduces probability)
    const optimalDays = this.getOptimalStageDuration(lifecycle.currentStage);
    if (lifecycle.daysInCurrentStage > optimalDays) {
      const stagnationPenalty = Math.min(20, (lifecycle.daysInCurrentStage - optimalDays) * 2);
      probability -= stagnationPenalty;
    }

    return Math.max(0, Math.min(100, probability));
  }

  private calculateLeadScore(lifecycle: LeadLifecycleEntry): number {
    let score = 0;

    // Stage progression score (40% weight)
    const stageScore = this.getStageScore(lifecycle.currentStage);
    score += stageScore * 0.4;

    // Engagement score (30% weight)
    score += lifecycle.engagementScore * 0.3;

    // Response rate (20% weight)
    score += lifecycle.responseRate * 0.2;

    // Progression velocity (10% weight)
    const velocityScore = this.calculateProgressionVelocity(lifecycle);
    score += velocityScore * 0.1;

    return Math.max(0, Math.min(100, score));
  }

  private calculateEngagementScore(lifecycle: LeadLifecycleEntry): number {
    let score = 50; // Base score

    // Response rate factor
    score += (lifecycle.responseRate - 50) * 0.5;

    // Meeting acceptance rate factor
    score += (lifecycle.meetingAcceptanceRate - 50) * 0.3;

    // Recent contact bonus
    if (lifecycle.lastContactAt) {
      const daysSinceContact = Math.floor(
        (new Date().getTime() - lifecycle.lastContactAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceContact <= 7) score += 10;
      else if (daysSinceContact <= 14) score += 5;
      else if (daysSinceContact > 30) score -= 15;
    }

    // Stage progression bonus
    if (lifecycle.stageTransitionCount >= 3) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private getLeadScoreCategory(score: number): LeadScore {
    if (score >= 80) return LeadScore.HOT;
    if (score >= 60) return LeadScore.WARM;
    if (score >= 40) return LeadScore.COOL;
    return LeadScore.COLD;
  }

  private getStageScore(stage: LeadLifecycleStage): number {
    const stageScores: Record<LeadLifecycleStage, number> = {
      [LeadLifecycleStage.NEW]: 10,
      [LeadLifecycleStage.CONTACTED]: 20,
      [LeadLifecycleStage.ENGAGED]: 35,
      [LeadLifecycleStage.QUALIFYING]: 45,
      [LeadLifecycleStage.QUALIFIED]: 60,
      [LeadLifecycleStage.OPPORTUNITY]: 70,
      [LeadLifecycleStage.PROPOSAL]: 80,
      [LeadLifecycleStage.NEGOTIATION]: 90,
      [LeadLifecycleStage.DECISION_PENDING]: 75,
      [LeadLifecycleStage.WON]: 95,
      [LeadLifecycleStage.NURTURING]: 30,
      [LeadLifecycleStage.REACTIVATED]: 40,
      [LeadLifecycleStage.CONVERTED]: 100,
      [LeadLifecycleStage.DISQUALIFIED]: 0,
      [LeadLifecycleStage.LOST]: 0,
      [LeadLifecycleStage.CLOSED]: 0,
      [LeadLifecycleStage.DO_NOT_CONTACT]: 0
    };
    return stageScores[stage];
  }

  private calculateProgressionVelocity(lifecycle: LeadLifecycleEntry): number {
    if (lifecycle.totalDaysInLifecycle === 0) return 50;
    
    const expectedTransitions = Math.floor(lifecycle.totalDaysInLifecycle / 14); // Expected 1 transition per 2 weeks
    const actualTransitions = lifecycle.stageTransitionCount;
    
    if (expectedTransitions === 0) return 50;
    
    const velocity = (actualTransitions / expectedTransitions) * 50;
    return Math.max(0, Math.min(100, velocity));
  }

  // Mock data methods (would be replaced with actual database queries)
  async getLifecycleById(id: string): Promise<LeadLifecycleEntry | null> {
    // Mock implementation
    return null;
  }

  async getLifecyclesByCampaign(campaignId: string): Promise<LeadLifecycleEntry[]> {
    // Mock implementation
    return [];
  }

  // Public query methods
  async getLeadsByStage(stage: LeadLifecycleStage, filters: {
    campaignId?: string;
    agentId?: string;
    scoreRange?: string;
    limit?: number;
  }): Promise<LeadLifecycleEntry[]> {
    // Mock implementation - would query database in production
    return [];
  }

  async getStagnantLeads(campaignId: string, options: {
    daysThreshold?: number;
    limit?: number;
  }): Promise<LeadLifecycleEntry[]> {
    // Mock implementation - would query database in production
    return [];
  }

  async getHighValueProspects(campaignId: string, options: {
    valueThreshold?: number;
    scoreThreshold?: number;
    limit?: number;
  }): Promise<LeadLifecycleEntry[]> {
    // Mock implementation - would query database in production
    return [];
  }

  // Public helper methods
  getStageCategory(stage: LeadLifecycleStage): StageCategory {
    const categoryMap: Record<LeadLifecycleStage, StageCategory> = {
      [LeadLifecycleStage.NEW]: StageCategory.PROSPECT,
      [LeadLifecycleStage.CONTACTED]: StageCategory.PROSPECT,
      [LeadLifecycleStage.ENGAGED]: StageCategory.PROSPECT,
      [LeadLifecycleStage.QUALIFYING]: StageCategory.QUALIFICATION,
      [LeadLifecycleStage.QUALIFIED]: StageCategory.QUALIFICATION,
      [LeadLifecycleStage.DISQUALIFIED]: StageCategory.TERMINAL,
      [LeadLifecycleStage.OPPORTUNITY]: StageCategory.OPPORTUNITY,
      [LeadLifecycleStage.PROPOSAL]: StageCategory.OPPORTUNITY,
      [LeadLifecycleStage.NEGOTIATION]: StageCategory.OPPORTUNITY,
      [LeadLifecycleStage.DECISION_PENDING]: StageCategory.DECISION,
      [LeadLifecycleStage.WON]: StageCategory.DECISION,
      [LeadLifecycleStage.LOST]: StageCategory.TERMINAL,
      [LeadLifecycleStage.NURTURING]: StageCategory.NURTURE,
      [LeadLifecycleStage.REACTIVATED]: StageCategory.NURTURE,
      [LeadLifecycleStage.CONVERTED]: StageCategory.TERMINAL,
      [LeadLifecycleStage.CLOSED]: StageCategory.TERMINAL,
      [LeadLifecycleStage.DO_NOT_CONTACT]: StageCategory.TERMINAL
    };
    return categoryMap[stage];
  }

  isTerminalStage(stage: LeadLifecycleStage): boolean {
    return this.getStageCategory(stage) === StageCategory.TERMINAL;
  }

  getOptimalStageDuration(stage: LeadLifecycleStage): number {
    // Optimal days in each stage
    const optimalDuration: Record<LeadLifecycleStage, number> = {
      [LeadLifecycleStage.NEW]: 1,
      [LeadLifecycleStage.CONTACTED]: 3,
      [LeadLifecycleStage.ENGAGED]: 7,
      [LeadLifecycleStage.QUALIFYING]: 14,
      [LeadLifecycleStage.QUALIFIED]: 7,
      [LeadLifecycleStage.OPPORTUNITY]: 21,
      [LeadLifecycleStage.PROPOSAL]: 14,
      [LeadLifecycleStage.NEGOTIATION]: 7,
      [LeadLifecycleStage.DECISION_PENDING]: 10,
      [LeadLifecycleStage.WON]: 3,
      [LeadLifecycleStage.NURTURING]: 60,
      [LeadLifecycleStage.REACTIVATED]: 7,
      [LeadLifecycleStage.CONVERTED]: 0,
      [LeadLifecycleStage.DISQUALIFIED]: 0,
      [LeadLifecycleStage.LOST]: 0,
      [LeadLifecycleStage.CLOSED]: 0,
      [LeadLifecycleStage.DO_NOT_CONTACT]: 0
    };
    return optimalDuration[stage];
  }

  getRecommendedActions(stage: LeadLifecycleStage): string[] {
    const actionMap: Record<LeadLifecycleStage, string[]> = {
      [LeadLifecycleStage.NEW]: [
        'Make initial contact within 24 hours',
        'Research contact background',
        'Prepare personalized opening'
      ],
      [LeadLifecycleStage.CONTACTED]: [
        'Follow up within 48 hours',
        'Send relevant information',
        'Schedule discovery call'
      ],
      [LeadLifecycleStage.ENGAGED]: [
        'Assess qualification criteria',
        'Understand pain points',
        'Build rapport and trust'
      ],
      [LeadLifecycleStage.QUALIFYING]: [
        'Complete qualification framework',
        'Identify decision makers',
        'Understand budget and timeline'
      ],
      [LeadLifecycleStage.QUALIFIED]: [
        'Create opportunity record',
        'Prepare value proposition',
        'Schedule demo/presentation'
      ],
      [LeadLifecycleStage.OPPORTUNITY]: [
        'Develop proposal',
        'Address objections',
        'Create timeline for decision'
      ],
      [LeadLifecycleStage.PROPOSAL]: [
        'Follow up on proposal',
        'Address questions/concerns',
        'Schedule decision meeting'
      ],
      [LeadLifecycleStage.NEGOTIATION]: [
        'Focus on value over price',
        'Find win-win solutions',
        'Prepare final offer'
      ],
      [LeadLifecycleStage.DECISION_PENDING]: [
        'Maintain regular contact',
        'Provide additional information',
        'Create urgency if appropriate'
      ],
      [LeadLifecycleStage.NURTURING]: [
        'Provide valuable content',
        'Maintain periodic contact',
        'Monitor for buying signals'
      ],
      [LeadLifecycleStage.WON]: [
        'Prepare onboarding process',
        'Set implementation timeline',
        'Ensure smooth transition'
      ],
      [LeadLifecycleStage.LOST]: [
        'Conduct loss analysis',
        'Maintain relationship',
        'Set follow-up schedule'
      ],
      [LeadLifecycleStage.REACTIVATED]: [
        'Reassess current situation',
        'Update qualification',
        'Re-engage with new approach'
      ],
      [LeadLifecycleStage.CONVERTED]: [
        'Complete onboarding',
        'Request testimonial',
        'Identify upsell opportunities'
      ],
      [LeadLifecycleStage.CLOSED]: [
        'Document closure reason',
        'Archive lead data',
        'Update contact preferences'
      ],
      [LeadLifecycleStage.DISQUALIFIED]: [
        'Document disqualification reason',
        'Refer to appropriate resource',
        'Add to nurture campaign if appropriate'
      ],
      [LeadLifecycleStage.DO_NOT_CONTACT]: [
        'Remove from all campaigns',
        'Update contact preferences',
        'Ensure compliance with request'
      ]
    };
    return actionMap[stage] || [];
  }

  getStageTransitions(): StageTransition[] {
    return this.stageTransitions;
  }

  private async getCampaignDetails(campaignId: string): Promise<any> {
    // Mock implementation
    return { name: 'Test Campaign' };
  }

  private calculateCampaignCost(campaignId: string): number {
    // Mock implementation
    return 10000;
  }

  private calculatePredictedConversions(lifecycles: LeadLifecycleEntry[]): number {
    const activeLeads = lifecycles.filter(l => !this.isTerminalStage(l.currentStage));
    return activeLeads.reduce((sum, lead) => sum + (lead.conversionProbability / 100), 0);
  }

  private calculateLeadVelocity(lifecycles: LeadLifecycleEntry[]): number {
    const recentTransitions = lifecycles.filter(l => 
      l.stageHistory.some(h => 
        (new Date().getTime() - h.timestamp.getTime()) / (1000 * 60 * 60 * 24) <= 30
      )
    );
    return recentTransitions.length / 30; // Transitions per day
  }

  private calculateStagnationRate(lifecycles: LeadLifecycleEntry[]): number {
    const activeLeads = lifecycles.filter(l => !this.isTerminalStage(l.currentStage));
    const stagnantLeads = activeLeads.filter(l => 
      l.daysInCurrentStage > this.getOptimalStageDuration(l.currentStage) * 1.5
    );
    return activeLeads.length > 0 ? (stagnantLeads.length / activeLeads.length) * 100 : 0;
  }

  private generateConversionFunnel(lifecycles: LeadLifecycleEntry[]): LifecycleAnalytics['conversionFunnel'] {
    return Object.values(LeadLifecycleStage).map(stage => {
      const stageLeads = lifecycles.filter(l => 
        l.stageHistory.some(h => h.toStage === stage)
      );
      const nextStageLeads = stageLeads.filter(l => 
        l.stageHistory.findIndex(h => h.toStage === stage) < l.stageHistory.length - 1
      );
      
      return {
        stage,
        leadsEntered: stageLeads.length,
        leadsExited: nextStageLeads.length,
        conversionToNext: stageLeads.length > 0 ? (nextStageLeads.length / stageLeads.length) * 100 : 0,
        dropOffRate: stageLeads.length > 0 ? ((stageLeads.length - nextStageLeads.length) / stageLeads.length) * 100 : 0
      };
    });
  }

  private calculateAgentPerformance(lifecycles: LeadLifecycleEntry[]): LifecycleAnalytics['agentPerformance'] {
    const agentMap = new Map();
    
    lifecycles.forEach(l => {
      if (!l.agentId) return;
      
      if (!agentMap.has(l.agentId)) {
        agentMap.set(l.agentId, {
          agentId: l.agentId,
          agentName: `Agent ${l.agentId}`,
          leadsManaged: 0,
          conversions: 0,
          totalTime: 0,
          totalScore: 0,
          totalValue: 0
        });
      }
      
      const agent = agentMap.get(l.agentId);
      agent.leadsManaged++;
      agent.totalScore += l.leadScore;
      agent.totalValue += l.actualValue || 0;
      
      if (l.currentStage === LeadLifecycleStage.CONVERTED) {
        agent.conversions++;
        agent.totalTime += l.timeToConvert || 0;
      }
    });

    return Array.from(agentMap.values()).map(agent => ({
      agentId: agent.agentId,
      agentName: agent.agentName,
      leadsManaged: agent.leadsManaged,
      conversionRate: agent.leadsManaged > 0 ? (agent.conversions / agent.leadsManaged) * 100 : 0,
      avgTimeToConversion: agent.conversions > 0 ? agent.totalTime / agent.conversions : 0,
      avgLeadScore: agent.leadsManaged > 0 ? agent.totalScore / agent.leadsManaged : 0,
      totalValue: agent.totalValue
    }));
  }

  private getStageOptimizationRecommendations(stage: LeadLifecycleStage, stageData: any): string[] {
    const recommendations = [];
    
    if (stageData.avgDuration > this.getOptimalStageDuration(stage) * 1.5) {
      recommendations.push('Reduce time in stage with automated follow-ups');
      recommendations.push('Implement stage-specific coaching for agents');
    }
    
    if (stageData.conversionRate < 50) {
      recommendations.push('Review qualification criteria');
      recommendations.push('Enhance value proposition for this stage');
    }
    
    return recommendations;
  }

  private identifyOptimizationOpportunities(analytics: LifecycleAnalytics, stagePerformance: any[]): CampaignLifecycleAnalysis['optimizationOpportunities'] {
    const opportunities = [];
    
    // Low conversion rate opportunity
    if (analytics.conversionRate < 20) {
      opportunities.push({
        opportunity: 'Improve Lead Qualification',
        potentialImpact: 'Increase conversion rate by 5-10%',
        recommendedActions: [
          'Implement BANT qualification framework',
          'Enhance lead scoring criteria',
          'Improve initial contact strategy'
        ],
        estimatedValue: analytics.avgLeadValue * analytics.totalLeads * 0.1
      });
    }
    
    // High stagnation opportunity
    if (analytics.stagnationRate > 30) {
      opportunities.push({
        opportunity: 'Reduce Lead Stagnation',
        potentialImpact: 'Accelerate conversion by 20%',
        recommendedActions: [
          'Implement automated follow-up sequences',
          'Create stage-specific content',
          'Set up progression alerts'
        ],
        estimatedValue: analytics.totalPipelineValue * 0.15
      });
    }
    
    return opportunities;
  }

  private emitLifecycleEvent(eventType: string, lifecycle: LeadLifecycleEntry, metadata?: any) {
    const event = {
      id: `event_${Date.now()}`,
      type: eventType,
      timestamp: new Date(),
      lifecycleId: lifecycle.id,
      contactId: lifecycle.contactId,
      campaignId: lifecycle.campaignId,
      agentId: lifecycle.agentId,
      currentStage: lifecycle.currentStage,
      conversionProbability: lifecycle.conversionProbability,
      leadScore: lifecycle.leadScore,
      metadata
    };

    eventEmitter.emit('lifecycle.event', event);
  }
}

export { LeadLifecycleService };
export default new LeadLifecycleService();