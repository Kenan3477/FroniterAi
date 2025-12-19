// Comprehensive Call Outcome Tracking System
import { PrismaClient } from '@prisma/client';
import { eventManager } from './eventManager';
import { EventPriority } from '../types/events';

const prisma = new PrismaClient();

// Enhanced outcome classification system
export enum CallOutcomeCategory {
  // Success outcomes
  SALE_CLOSED = 'sale_closed',
  APPOINTMENT_SET = 'appointment_set',
  QUALIFIED_LEAD = 'qualified_lead',
  INTEREST_EXPRESSED = 'interest_expressed',
  INFORMATION_PROVIDED = 'information_provided',
  
  // Follow-up outcomes  
  CALLBACK_REQUESTED = 'callback_requested',
  CALLBACK_SCHEDULED = 'callback_scheduled',
  LITERATURE_REQUESTED = 'literature_requested',
  DEMO_REQUESTED = 'demo_requested',
  
  // Neutral outcomes
  CONTACT_MADE = 'contact_made',
  WRONG_PERSON = 'wrong_person',
  LANGUAGE_BARRIER = 'language_barrier',
  
  // Negative outcomes
  NOT_INTERESTED = 'not_interested',
  DO_NOT_CALL = 'do_not_call',
  COMPETITOR_CUSTOMER = 'competitor_customer',
  
  // Technical outcomes
  NO_ANSWER = 'no_answer',
  BUSY_SIGNAL = 'busy_signal',
  ANSWERING_MACHINE = 'answering_machine',
  INVALID_NUMBER = 'invalid_number',
  TECHNICAL_FAILURE = 'technical_failure',
}

export enum OutcomeImpact {
  HIGHLY_POSITIVE = 'highly_positive',    // Sale, qualified lead
  POSITIVE = 'positive',                  // Appointment, demo request
  NEUTRAL = 'neutral',                    // Contact made, information provided
  NEGATIVE = 'negative',                  // Not interested, language barrier
  HIGHLY_NEGATIVE = 'highly_negative',    // DNC, invalid number
}

export enum OutcomeActionRequired {
  NONE = 'none',
  FOLLOW_UP = 'follow_up',
  ESCALATION = 'escalation',
  COMPLIANCE = 'compliance',
  TECHNICAL = 'technical',
}

// Call outcome details
export interface CallOutcome {
  id: string;
  callId: string;
  campaignId: string;
  agentId: string;
  contactId?: string;
  
  // Outcome classification
  category: CallOutcomeCategory;
  impact: OutcomeImpact;
  actionRequired: OutcomeActionRequired;
  
  // Business metrics
  saleValue?: number;
  leadScore?: number;
  probability?: number; // Conversion probability 0-100
  
  // Timing and effort
  outcomeTimestamp: Date;
  callDuration: number;
  agentEffort: number; // 1-10 scale
  
  // Additional context
  notes?: string;
  tags: string[];
  followUpDate?: Date;
  followUpReason?: string;
  
  // Quality metrics
  customerSatisfaction?: number; // 1-10 scale
  outcomeConfidence: number; // 1-10 scale
  
  // Tracking
  createdAt: Date;
  updatedAt: Date;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
}

// Outcome analytics aggregation
export interface OutcomeAnalytics {
  period: {
    start: Date;
    end: Date;
    label: string;
  };
  
  // Volume metrics
  totalCalls: number;
  totalOutcomes: number;
  outcomeRate: number; // % of calls with outcomes
  
  // Outcome distribution
  outcomes: {
    category: CallOutcomeCategory;
    count: number;
    percentage: number;
    totalValue?: number; // For sales
    avgDuration: number;
  }[];
  
  // Impact analysis
  impactDistribution: {
    impact: OutcomeImpact;
    count: number;
    percentage: number;
    conversionValue: number;
  }[];
  
  // Performance metrics
  successRate: number; // % positive + highly positive
  conversionRate: number; // % sales + qualified leads
  avgSaleValue: number;
  avgCallDuration: number;
  avgLeadScore: number;
  
  // Quality metrics
  avgCustomerSatisfaction: number;
  avgOutcomeConfidence: number;
  verificationRate: number;
  
  // Trends
  trends: {
    metric: string;
    change: number; // % change from previous period
    direction: 'up' | 'down' | 'stable';
  }[];
}

class CallOutcomeTrackingService {
  /**
   * Record a call outcome
   */
  async recordCallOutcome(outcome: Omit<CallOutcome, 'id' | 'createdAt' | 'updatedAt'>): Promise<CallOutcome> {
    try {
      // Validate call exists
      const call = await prisma.call.findUnique({
        where: { id: outcome.callId },
        include: { campaign: true, record: true },
      });

      if (!call) {
        throw new Error(`Call ${outcome.callId} not found`);
      }

      // Check for existing outcome
      const existingOutcome = await this.getCallOutcome(outcome.callId);
      if (existingOutcome) {
        // Update existing outcome
        return await this.updateCallOutcome(existingOutcome.id, outcome);
      }

      // Create new outcome record
      const outcomeRecord: CallOutcome = {
        id: this.generateOutcomeId(),
        ...outcome,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in database (assuming we'll add to schema)
      await this.persistOutcome(outcomeRecord);

      // Update call record with outcome summary
      await prisma.call.update({
        where: { id: outcome.callId },
        data: {
          // We'll need to add these fields to the Call model
          // outcomeCategory: outcome.category,
          // outcomeImpact: outcome.impact,
          // lastOutcomeAt: new Date(),
        },
      });

      // Emit outcome recorded event
      await eventManager.emitEvent({
        type: 'call.ended', // Using existing event type for now
        callId: outcome.callId,
        agentId: outcome.agentId,
        campaignId: outcome.campaignId,
        metadata: {
          outcome: {
            category: outcome.category,
            impact: outcome.impact,
            saleValue: outcome.saleValue,
            leadScore: outcome.leadScore,
          },
          outcomeTracked: true,
        },
      } as any, `campaign:${outcome.campaignId}`, EventPriority.MEDIUM);

      console.log(`📊 Call outcome recorded: ${outcome.category} for call ${outcome.callId}`);
      return outcomeRecord;

    } catch (error) {
      console.error('Error recording call outcome:', error);
      throw error;
    }
  }

  /**
   * Get call outcome by call ID
   */
  async getCallOutcome(callId: string): Promise<CallOutcome | null> {
    try {
      // For now, we'll simulate this with a simple lookup
      // In production, this would query the database
      const outcome = await this.findOutcomeByCallId(callId);
      return outcome;
    } catch (error) {
      console.error('Error getting call outcome:', error);
      return null;
    }
  }

  /**
   * Update existing call outcome
   */
  async updateCallOutcome(outcomeId: string, updates: Partial<CallOutcome>): Promise<CallOutcome> {
    try {
      const existingOutcome = await this.findOutcomeById(outcomeId);
      if (!existingOutcome) {
        throw new Error(`Outcome ${outcomeId} not found`);
      }

      const updatedOutcome: CallOutcome = {
        ...existingOutcome,
        ...updates,
        updatedAt: new Date(),
      };

      await this.persistOutcome(updatedOutcome);

      // Emit outcome updated event
      await eventManager.emitEvent({
        type: 'call.ended', // Using existing event type
        callId: updatedOutcome.callId,
        agentId: updatedOutcome.agentId,
        campaignId: updatedOutcome.campaignId,
        metadata: {
          outcomeUpdated: true,
          changes: Object.keys(updates),
        },
      } as any, `campaign:${updatedOutcome.campaignId}`, EventPriority.LOW);

      console.log(`📝 Call outcome updated: ${outcomeId}`);
      return updatedOutcome;

    } catch (error) {
      console.error('Error updating call outcome:', error);
      throw error;
    }
  }

  /**
   * Generate outcome analytics for a campaign and time period
   */
  async generateOutcomeAnalytics(
    campaignId: string,
    startDate: Date,
    endDate: Date,
    agentId?: string
  ): Promise<OutcomeAnalytics> {
    try {
      // Get calls and outcomes for the period
      const calls = await prisma.call.findMany({
        where: {
          campaignId,
          startTime: {
            gte: startDate,
            lte: endDate,
          },
          ...(agentId && {
            legs: {
              some: {
                agentId,
                legType: 'AGENT',
              },
            },
          }),
        },
        include: {
          legs: {
            where: { legType: 'AGENT' },
          },
          dispositions: true,
        },
      });

      const outcomes = await this.getOutcomesForPeriod(campaignId, startDate, endDate, agentId);

      // Calculate metrics
      const totalCalls = calls.length;
      const totalOutcomes = outcomes.length;
      const outcomeRate = totalCalls > 0 ? (totalOutcomes / totalCalls) * 100 : 0;

      // Analyze outcome distribution
      const outcomeDistribution = this.calculateOutcomeDistribution(outcomes);
      const impactDistribution = this.calculateImpactDistribution(outcomes);
      
      // Performance metrics
      const successRate = this.calculateSuccessRate(outcomes);
      const conversionRate = this.calculateConversionRate(outcomes);
      const avgSaleValue = this.calculateAverageSaleValue(outcomes);
      const avgCallDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0) / (calls.length || 1);
      const avgLeadScore = this.calculateAverageLeadScore(outcomes);
      
      // Quality metrics
      const avgCustomerSatisfaction = this.calculateAverageCustomerSatisfaction(outcomes);
      const avgOutcomeConfidence = this.calculateAverageOutcomeConfidence(outcomes);
      const verificationRate = this.calculateVerificationRate(outcomes);
      
      // Trends (simplified - would compare with previous period)
      const trends = await this.calculateTrends(campaignId, startDate, endDate, agentId);

      const analytics: OutcomeAnalytics = {
        period: {
          start: startDate,
          end: endDate,
          label: this.formatPeriodLabel(startDate, endDate),
        },
        totalCalls,
        totalOutcomes,
        outcomeRate,
        outcomes: outcomeDistribution,
        impactDistribution,
        successRate,
        conversionRate,
        avgSaleValue,
        avgCallDuration,
        avgLeadScore,
        avgCustomerSatisfaction,
        avgOutcomeConfidence,
        verificationRate,
        trends,
      };

      console.log(`📈 Generated outcome analytics for campaign ${campaignId}: ${totalCalls} calls, ${totalOutcomes} outcomes`);
      return analytics;

    } catch (error) {
      console.error('Error generating outcome analytics:', error);
      throw error;
    }
  }

  /**
   * Get outcomes by impact level for prioritization
   */
  async getOutcomesByImpact(campaignId: string, impact: OutcomeImpact, limit: number = 50): Promise<CallOutcome[]> {
    try {
      const outcomes = await this.findOutcomesByCampaign(campaignId);
      return outcomes
        .filter(outcome => outcome.impact === impact)
        .sort((a, b) => b.outcomeTimestamp.getTime() - a.outcomeTimestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting outcomes by impact:', error);
      return [];
    }
  }

  /**
   * Generate agent performance report
   */
  async generateAgentOutcomeReport(
    agentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    agent: any;
    analytics: OutcomeAnalytics;
    topOutcomes: CallOutcome[];
    improvementAreas: string[];
  }> {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { id: true, firstName: true, lastName: true, email: true },
      });

      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Get analytics for all campaigns this agent worked on
      const agentCampaigns = await prisma.call.findMany({
        where: {
          startTime: { gte: startDate, lte: endDate },
          legs: {
            some: { agentId, legType: 'AGENT' },
          },
        },
        select: { campaignId: true },
        distinct: ['campaignId'],
      });

      let combinedAnalytics: OutcomeAnalytics | null = null;
      
      // For now, analyze first campaign (would need to aggregate across campaigns)
      if (agentCampaigns.length > 0) {
        combinedAnalytics = await this.generateOutcomeAnalytics(
          agentCampaigns[0].campaignId,
          startDate,
          endDate,
          agentId
        );
      }

      // Get top outcomes for this agent
      const topOutcomes = await this.getTopOutcomesForAgent(agentId, startDate, endDate);
      
      // Identify improvement areas
      const improvementAreas = this.identifyImprovementAreas(combinedAnalytics);

      return {
        agent,
        analytics: combinedAnalytics || this.getEmptyAnalytics(startDate, endDate),
        topOutcomes,
        improvementAreas,
      };

    } catch (error) {
      console.error('Error generating agent outcome report:', error);
      throw error;
    }
  }

  // Private helper methods

  private generateOutcomeId(): string {
    return `outcome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async persistOutcome(outcome: CallOutcome): Promise<void> {
    // For now, store in memory/cache
    // In production, this would insert into database
    console.log(`💾 Persisting outcome: ${outcome.id}`);
  }

  private async findOutcomeByCallId(callId: string): Promise<CallOutcome | null> {
    // Simulate database lookup
    return null;
  }

  private async findOutcomeById(outcomeId: string): Promise<CallOutcome | null> {
    // Simulate database lookup
    return null;
  }

  private async findOutcomesByCampaign(campaignId: string): Promise<CallOutcome[]> {
    // Simulate database lookup
    return [];
  }

  private async getOutcomesForPeriod(
    campaignId: string,
    startDate: Date,
    endDate: Date,
    agentId?: string
  ): Promise<CallOutcome[]> {
    // Simulate fetching outcomes for period
    return [];
  }

  private calculateOutcomeDistribution(outcomes: CallOutcome[]) {
    const distribution = new Map<CallOutcomeCategory, { count: number; totalValue: number; totalDuration: number }>();
    
    outcomes.forEach(outcome => {
      const current = distribution.get(outcome.category) || { count: 0, totalValue: 0, totalDuration: 0 };
      distribution.set(outcome.category, {
        count: current.count + 1,
        totalValue: current.totalValue + (outcome.saleValue || 0),
        totalDuration: current.totalDuration + outcome.callDuration,
      });
    });

    return Array.from(distribution.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      percentage: outcomes.length > 0 ? (data.count / outcomes.length) * 100 : 0,
      totalValue: data.totalValue > 0 ? data.totalValue : undefined,
      avgDuration: data.count > 0 ? data.totalDuration / data.count : 0,
    }));
  }

  private calculateImpactDistribution(outcomes: CallOutcome[]) {
    const distribution = new Map<OutcomeImpact, { count: number; conversionValue: number }>();
    
    outcomes.forEach(outcome => {
      const current = distribution.get(outcome.impact) || { count: 0, conversionValue: 0 };
      distribution.set(outcome.impact, {
        count: current.count + 1,
        conversionValue: current.conversionValue + (outcome.saleValue || 0),
      });
    });

    return Array.from(distribution.entries()).map(([impact, data]) => ({
      impact,
      count: data.count,
      percentage: outcomes.length > 0 ? (data.count / outcomes.length) * 100 : 0,
      conversionValue: data.conversionValue,
    }));
  }

  private calculateSuccessRate(outcomes: CallOutcome[]): number {
    const successfulOutcomes = outcomes.filter(
      outcome => outcome.impact === OutcomeImpact.POSITIVE || outcome.impact === OutcomeImpact.HIGHLY_POSITIVE
    );
    return outcomes.length > 0 ? (successfulOutcomes.length / outcomes.length) * 100 : 0;
  }

  private calculateConversionRate(outcomes: CallOutcome[]): number {
    const conversions = outcomes.filter(
      outcome => outcome.category === CallOutcomeCategory.SALE_CLOSED || 
                 outcome.category === CallOutcomeCategory.QUALIFIED_LEAD
    );
    return outcomes.length > 0 ? (conversions.length / outcomes.length) * 100 : 0;
  }

  private calculateAverageSaleValue(outcomes: CallOutcome[]): number {
    const salesOutcomes = outcomes.filter(outcome => outcome.saleValue && outcome.saleValue > 0);
    if (salesOutcomes.length === 0) return 0;
    return salesOutcomes.reduce((sum, outcome) => sum + (outcome.saleValue || 0), 0) / salesOutcomes.length;
  }

  private calculateAverageLeadScore(outcomes: CallOutcome[]): number {
    const scoredOutcomes = outcomes.filter(outcome => outcome.leadScore);
    if (scoredOutcomes.length === 0) return 0;
    return scoredOutcomes.reduce((sum, outcome) => sum + (outcome.leadScore || 0), 0) / scoredOutcomes.length;
  }

  private calculateAverageCustomerSatisfaction(outcomes: CallOutcome[]): number {
    const ratedOutcomes = outcomes.filter(outcome => outcome.customerSatisfaction);
    if (ratedOutcomes.length === 0) return 0;
    return ratedOutcomes.reduce((sum, outcome) => sum + (outcome.customerSatisfaction || 0), 0) / ratedOutcomes.length;
  }

  private calculateAverageOutcomeConfidence(outcomes: CallOutcome[]): number {
    if (outcomes.length === 0) return 0;
    return outcomes.reduce((sum, outcome) => sum + outcome.outcomeConfidence, 0) / outcomes.length;
  }

  private calculateVerificationRate(outcomes: CallOutcome[]): number {
    const verifiedOutcomes = outcomes.filter(outcome => outcome.isVerified);
    return outcomes.length > 0 ? (verifiedOutcomes.length / outcomes.length) * 100 : 0;
  }

  private async calculateTrends(campaignId: string, startDate: Date, endDate: Date, agentId?: string) {
    // Simplified trend calculation - would compare with previous period
    return [
      { metric: 'Success Rate', change: 0, direction: 'stable' as const },
      { metric: 'Conversion Rate', change: 0, direction: 'stable' as const },
      { metric: 'Average Sale Value', change: 0, direction: 'stable' as const },
    ];
  }

  private formatPeriodLabel(startDate: Date, endDate: Date): string {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return `${start} to ${end}`;
  }

  private async getTopOutcomesForAgent(agentId: string, startDate: Date, endDate: Date): Promise<CallOutcome[]> {
    // Get best outcomes for agent in period
    return [];
  }

  private identifyImprovementAreas(analytics: OutcomeAnalytics | null): string[] {
    if (!analytics) return [];
    
    const areas = [];
    
    if (analytics.successRate < 50) {
      areas.push('Success rate below target - focus on qualification techniques');
    }
    
    if (analytics.conversionRate < 20) {
      areas.push('Low conversion rate - improve closing techniques');
    }
    
    if (analytics.avgCustomerSatisfaction < 7) {
      areas.push('Customer satisfaction needs improvement - enhance communication skills');
    }
    
    if (analytics.verificationRate < 80) {
      areas.push('Outcome verification rate low - improve data quality habits');
    }

    return areas;
  }

  private getEmptyAnalytics(startDate: Date, endDate: Date): OutcomeAnalytics {
    return {
      period: {
        start: startDate,
        end: endDate,
        label: this.formatPeriodLabel(startDate, endDate),
      },
      totalCalls: 0,
      totalOutcomes: 0,
      outcomeRate: 0,
      outcomes: [],
      impactDistribution: [],
      successRate: 0,
      conversionRate: 0,
      avgSaleValue: 0,
      avgCallDuration: 0,
      avgLeadScore: 0,
      avgCustomerSatisfaction: 0,
      avgOutcomeConfidence: 0,
      verificationRate: 0,
      trends: [],
    };
  }
}

// Create and export singleton instance
export const callOutcomeTrackingService = new CallOutcomeTrackingService();
export default callOutcomeTrackingService;