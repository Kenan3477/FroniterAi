// Outcome Mapping and Business Intelligence Service
import { PrismaClient } from '@prisma/client';
import { callOutcomeTrackingService, CallOutcomeCategory, OutcomeImpact, OutcomeActionRequired } from './callOutcomeTrackingService';
import { dispositionService, DispositionOutcome } from './dispositionService';
import { eventManager } from './eventManager';
import { EventPriority } from '../types/events';

const prisma = new PrismaClient();

// Outcome mapping configuration
export interface OutcomeMappingRule {
  id: string;
  name: string;
  dispositionId: string;
  
  // Mapping definition
  outcomeCategory: CallOutcomeCategory;
  outcomeImpact: OutcomeImpact;
  actionRequired: OutcomeActionRequired;
  
  // Business value
  baseValue: number; // Base point value for this outcome
  saleProbability: number; // 0-100% chance this leads to sale
  timeToConversion: number; // Days until likely conversion
  
  // Conditions for mapping
  conditions: {
    minCallDuration?: number;
    maxCallDuration?: number;
    requiresSaleAmount?: boolean;
    requiresFollowUp?: boolean;
    requiresNotes?: boolean;
    leadScoreThreshold?: number;
  };
  
  // Campaign specific overrides
  campaignOverrides: {
    [campaignId: string]: Partial<OutcomeMappingRule>;
  };
  
  isActive: boolean;
  priority: number;
}

// Business outcome metrics
export interface BusinessOutcome {
  id: string;
  campaignId: string;
  period: {
    start: Date;
    end: Date;
  };
  
  // Revenue metrics
  totalRevenue: number;
  projectedRevenue: number; // Based on pipeline
  avgDealSize: number;
  revenuePerCall: number;
  revenuePerHour: number;
  
  // Conversion metrics  
  leadConversionRate: number;
  appointmentShowRate: number;
  closeRate: number;
  pipelineValue: number;
  
  // Efficiency metrics
  costPerLead: number;
  costPerSale: number;
  costPerContact: number;
  roi: number; // Return on investment
  
  // Quality metrics
  leadQualityScore: number; // Average lead score
  customerSatisfactionScore: number;
  outcomeAccuracy: number; // How often predicted outcomes match reality
  
  // Volume metrics
  totalContacts: number;
  qualifiedLeads: number;
  salesMade: number;
  appointmentsSet: number;
}

// Outcome prediction model
export interface OutcomePrediction {
  callId: string;
  predictedOutcome: CallOutcomeCategory;
  confidence: number; // 0-100
  factors: {
    factor: string;
    weight: number;
    value: any;
  }[];
  suggestedActions: string[];
  expectedValue: number; // Monetary value
  timeToRealization: number; // Days
}

class OutcomeMappingService {
  private mappingRules: Map<string, OutcomeMappingRule> = new Map();

  constructor() {
    this.loadOutcomeMappingRules();
  }

  /**
   * Load outcome mapping rules configuration
   */
  private async loadOutcomeMappingRules(): Promise<void> {
    const defaultRules: OutcomeMappingRule[] = [
      {
        id: 'sale_closed_mapping',
        name: 'Sale Closed - High Value',
        dispositionId: 'sale_closed',
        outcomeCategory: CallOutcomeCategory.SALE_CLOSED,
        outcomeImpact: OutcomeImpact.HIGHLY_POSITIVE,
        actionRequired: OutcomeActionRequired.NONE,
        baseValue: 1000,
        saleProbability: 100,
        timeToConversion: 0,
        conditions: {
          requiresSaleAmount: true,
          minCallDuration: 120, // 2 minutes minimum
        },
        campaignOverrides: {},
        isActive: true,
        priority: 1,
      },
      {
        id: 'qualified_lead_mapping',
        name: 'Qualified Lead - High Potential',
        dispositionId: 'qualified_lead',
        outcomeCategory: CallOutcomeCategory.QUALIFIED_LEAD,
        outcomeImpact: OutcomeImpact.POSITIVE,
        actionRequired: OutcomeActionRequired.FOLLOW_UP,
        baseValue: 200,
        saleProbability: 75,
        timeToConversion: 14,
        conditions: {
          leadScoreThreshold: 7,
          requiresFollowUp: true,
          minCallDuration: 180, // 3 minutes minimum
        },
        campaignOverrides: {},
        isActive: true,
        priority: 2,
      },
      {
        id: 'appointment_set_mapping',
        name: 'Appointment Scheduled',
        dispositionId: 'appointment_set',
        outcomeCategory: CallOutcomeCategory.APPOINTMENT_SET,
        outcomeImpact: OutcomeImpact.POSITIVE,
        actionRequired: OutcomeActionRequired.FOLLOW_UP,
        baseValue: 150,
        saleProbability: 60,
        timeToConversion: 7,
        conditions: {
          requiresFollowUp: true,
          minCallDuration: 120,
        },
        campaignOverrides: {},
        isActive: true,
        priority: 2,
      },
      {
        id: 'callback_requested_mapping',
        name: 'Callback Requested - Interest',
        dispositionId: 'callback_requested',
        outcomeCategory: CallOutcomeCategory.CALLBACK_REQUESTED,
        outcomeImpact: OutcomeImpact.NEUTRAL,
        actionRequired: OutcomeActionRequired.FOLLOW_UP,
        baseValue: 50,
        saleProbability: 35,
        timeToConversion: 7,
        conditions: {
          requiresFollowUp: true,
        },
        campaignOverrides: {},
        isActive: true,
        priority: 3,
      },
      {
        id: 'not_interested_mapping',
        name: 'Not Interested - Clear Rejection',
        dispositionId: 'not_interested',
        outcomeCategory: CallOutcomeCategory.NOT_INTERESTED,
        outcomeImpact: OutcomeImpact.NEGATIVE,
        actionRequired: OutcomeActionRequired.NONE,
        baseValue: 0,
        saleProbability: 0,
        timeToConversion: 0,
        conditions: {},
        campaignOverrides: {},
        isActive: true,
        priority: 4,
      },
      {
        id: 'do_not_call_mapping',
        name: 'Do Not Call - Compliance',
        dispositionId: 'do_not_call',
        outcomeCategory: CallOutcomeCategory.DO_NOT_CALL,
        outcomeImpact: OutcomeImpact.HIGHLY_NEGATIVE,
        actionRequired: OutcomeActionRequired.COMPLIANCE,
        baseValue: -10, // Negative value for compliance cost
        saleProbability: 0,
        timeToConversion: 0,
        conditions: {},
        campaignOverrides: {},
        isActive: true,
        priority: 1,
      },
      {
        id: 'no_answer_mapping',
        name: 'No Answer - Technical',
        dispositionId: 'no_answer',
        outcomeCategory: CallOutcomeCategory.NO_ANSWER,
        outcomeImpact: OutcomeImpact.NEUTRAL,
        actionRequired: OutcomeActionRequired.NONE,
        baseValue: 0,
        saleProbability: 0,
        timeToConversion: 0,
        conditions: {
          maxCallDuration: 30, // Less than 30 seconds
        },
        campaignOverrides: {},
        isActive: true,
        priority: 5,
      },
    ];

    // Store rules in map for quick lookup
    defaultRules.forEach(rule => {
      this.mappingRules.set(rule.dispositionId, rule);
    });

    console.log(`🗺️  Loaded ${defaultRules.length} outcome mapping rules`);
  }

  /**
   * Map disposition to call outcome
   */
  async mapDispositionToOutcome(
    callId: string,
    dispositionId: string,
    dispositionData: any
  ): Promise<{
    mapped: boolean;
    outcome?: any;
    reason: string;
  }> {
    try {
      const mappingRule = this.mappingRules.get(dispositionId);
      if (!mappingRule || !mappingRule.isActive) {
        return {
          mapped: false,
          reason: `No active mapping rule found for disposition: ${dispositionId}`,
        };
      }

      // Get call details for validation
      const call = await prisma.call.findUnique({
        where: { id: callId },
        include: {
          campaign: true,
          legs: { where: { legType: 'AGENT' } },
        },
      });

      if (!call) {
        return {
          mapped: false,
          reason: `Call not found: ${callId}`,
        };
      }

      // Check campaign-specific overrides
      const effectiveRule = this.applyMappingOverrides(mappingRule, call.campaignId);

      // Validate conditions
      const conditionCheck = await this.validateMappingConditions(effectiveRule, call, dispositionData);
      if (!conditionCheck.valid) {
        return {
          mapped: false,
          reason: `Mapping conditions not met: ${conditionCheck.reason}`,
        };
      }

      // Create call outcome
      const agentLeg = call.legs[0];
      const outcome = {
        callId,
        campaignId: call.campaignId,
        agentId: agentLeg?.agentId || 'system',
        contactId: call.recordId || undefined,
        
        category: effectiveRule.outcomeCategory,
        impact: effectiveRule.outcomeImpact,
        actionRequired: effectiveRule.actionRequired,
        
        saleValue: dispositionData.saleAmount,
        leadScore: dispositionData.leadScore,
        probability: effectiveRule.saleProbability,
        
        outcomeTimestamp: new Date(),
        callDuration: call.duration || 0,
        agentEffort: this.calculateAgentEffort(call),
        
        notes: dispositionData.notes,
        tags: this.generateOutcomeTags(effectiveRule, dispositionData),
        followUpDate: dispositionData.followUpDate,
        followUpReason: effectiveRule.actionRequired === OutcomeActionRequired.FOLLOW_UP ? 'Scheduled follow-up' : undefined,
        
        customerSatisfaction: dispositionData.customerSatisfaction,
        outcomeConfidence: this.calculateOutcomeConfidence(effectiveRule, dispositionData),
        
        isVerified: false,
      };

      // Record the outcome
      await callOutcomeTrackingService.recordCallOutcome(outcome);

      // Emit mapping event
      await eventManager.emitEvent({
        type: 'call.ended', // Using existing event type
        callId,
        agentId: agentLeg?.agentId || 'system',
        campaignId: call.campaignId,
        metadata: {
          outcomeMapped: true,
          mappingRule: effectiveRule.name,
          outcomeCategory: effectiveRule.outcomeCategory,
          outcomeImpact: effectiveRule.outcomeImpact,
          baseValue: effectiveRule.baseValue,
          saleProbability: effectiveRule.saleProbability,
        },
      } as any, `campaign:${call.campaignId}`, EventPriority.MEDIUM);

      console.log(`🎯 Mapped disposition ${dispositionId} to outcome ${effectiveRule.outcomeCategory} for call ${callId}`);

      return {
        mapped: true,
        outcome,
        reason: `Successfully mapped using rule: ${effectiveRule.name}`,
      };

    } catch (error) {
      console.error('Error mapping disposition to outcome:', error);
      return {
        mapped: false,
        reason: `Mapping error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Generate business outcome metrics for a campaign and period
   */
  async generateBusinessOutcomes(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BusinessOutcome> {
    try {
      // Get all calls for the period
      const calls = await prisma.call.findMany({
        where: {
          campaignId,
          startTime: { gte: startDate, lte: endDate },
        },
        include: {
          dispositions: true,
          legs: { where: { legType: 'AGENT' } },
        },
      });

      // Get campaign cost data
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      // Calculate revenue metrics
      const totalRevenue = this.calculateTotalRevenue(calls);
      const projectedRevenue = await this.calculateProjectedRevenue(calls);
      const avgDealSize = this.calculateAverageDealSize(calls);
      const revenuePerCall = calls.length > 0 ? totalRevenue / calls.length : 0;
      const totalCallTime = calls.reduce((sum: any, call: any) => sum + (call.duration || 0), 0);
      const revenuePerHour = totalCallTime > 0 ? totalRevenue / (totalCallTime / 3600) : 0;

      // Calculate conversion metrics
      const leadConversionRate = this.calculateLeadConversionRate(calls);
      const appointmentShowRate = this.calculateAppointmentShowRate(calls);
      const closeRate = this.calculateCloseRate(calls);
      const pipelineValue = await this.calculatePipelineValue(calls);

      // Calculate efficiency metrics
      const totalCost = this.calculateTotalCampaignCost(campaign, calls);
      const costPerLead = this.calculateCostPerLead(totalCost, calls);
      const costPerSale = this.calculateCostPerSale(totalCost, calls);
      const costPerContact = calls.length > 0 ? totalCost / calls.length : 0;
      const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

      // Calculate quality metrics
      const leadQualityScore = this.calculateAverageLeadQuality(calls);
      const customerSatisfactionScore = this.calculateCustomerSatisfactionScore(calls);
      const outcomeAccuracy = await this.calculateOutcomeAccuracy(campaignId, startDate, endDate);

      // Calculate volume metrics
      const totalContacts = calls.length;
      const qualifiedLeads = this.countQualifiedLeads(calls);
      const salesMade = this.countSalesMade(calls);
      const appointmentsSet = this.countAppointmentsSet(calls);

      const businessOutcome: BusinessOutcome = {
        id: `business_outcome_${campaignId}_${Date.now()}`,
        campaignId,
        period: { start: startDate, end: endDate },
        
        // Revenue metrics
        totalRevenue,
        projectedRevenue,
        avgDealSize,
        revenuePerCall,
        revenuePerHour,
        
        // Conversion metrics
        leadConversionRate,
        appointmentShowRate,
        closeRate,
        pipelineValue,
        
        // Efficiency metrics
        costPerLead,
        costPerSale,
        costPerContact,
        roi,
        
        // Quality metrics
        leadQualityScore,
        customerSatisfactionScore,
        outcomeAccuracy,
        
        // Volume metrics
        totalContacts,
        qualifiedLeads,
        salesMade,
        appointmentsSet,
      };

      console.log(`💼 Generated business outcomes for campaign ${campaignId}: £${totalRevenue.toFixed(2)} revenue, ${roi.toFixed(1)}% ROI`);
      return businessOutcome;

    } catch (error) {
      console.error('Error generating business outcomes:', error);
      throw error;
    }
  }

  /**
   * Predict outcome for an ongoing or future call
   */
  async predictCallOutcome(
    campaignId: string,
    contactData: any,
    historicalContext?: any
  ): Promise<OutcomePrediction> {
    try {
      // Analyze historical data for similar contacts
      const historicalOutcomes = await this.getHistoricalOutcomesForPrediction(campaignId, contactData);
      
      // Calculate prediction factors
      const factors = [
        {
          factor: 'Historical Success Rate',
          weight: 0.3,
          value: this.calculateHistoricalSuccessRate(historicalOutcomes),
        },
        {
          factor: 'Contact Quality Score',
          weight: 0.25,
          value: this.calculateContactQualityScore(contactData),
        },
        {
          factor: 'Campaign Performance',
          weight: 0.2,
          value: await this.getCampaignPerformanceScore(campaignId),
        },
        {
          factor: 'Time of Contact',
          weight: 0.15,
          value: this.calculateTimeFactorScore(new Date()),
        },
        {
          factor: 'Previous Contact History',
          weight: 0.1,
          value: this.calculateContactHistoryScore(contactData),
        },
      ];

      // Calculate overall confidence
      const confidence = factors.reduce((sum, factor) => sum + (factor.weight * factor.value), 0);
      
      // Predict most likely outcome
      const predictedOutcome = this.selectMostLikelyOutcome(confidence, historicalOutcomes);
      
      // Generate suggested actions
      const suggestedActions = this.generateSuggestedActions(predictedOutcome, confidence);
      
      // Calculate expected value
      const expectedValue = this.calculateExpectedValue(predictedOutcome, confidence);
      
      // Estimate time to realization
      const timeToRealization = this.estimateTimeToRealization(predictedOutcome);

      const prediction: OutcomePrediction = {
        callId: `predicted_${Date.now()}`,
        predictedOutcome,
        confidence: Math.round(confidence * 100),
        factors,
        suggestedActions,
        expectedValue,
        timeToRealization,
      };

      console.log(`🔮 Predicted outcome: ${predictedOutcome} with ${Math.round(confidence * 100)}% confidence`);
      return prediction;

    } catch (error) {
      console.error('Error predicting call outcome:', error);
      throw error;
    }
  }

  // Private helper methods for mapping and calculations

  private applyMappingOverrides(rule: OutcomeMappingRule, campaignId: string): OutcomeMappingRule {
    const override = rule.campaignOverrides[campaignId];
    if (!override) return rule;
    
    return { ...rule, ...override };
  }

  private async validateMappingConditions(
    rule: OutcomeMappingRule,
    call: any,
    dispositionData: any
  ): Promise<{ valid: boolean; reason: string }> {
    const conditions = rule.conditions;
    
    if (conditions.minCallDuration && (call.duration || 0) < conditions.minCallDuration) {
      return { valid: false, reason: `Call duration ${call.duration}s below minimum ${conditions.minCallDuration}s` };
    }
    
    if (conditions.maxCallDuration && (call.duration || 0) > conditions.maxCallDuration) {
      return { valid: false, reason: `Call duration ${call.duration}s above maximum ${conditions.maxCallDuration}s` };
    }
    
    if (conditions.requiresSaleAmount && (!dispositionData.saleAmount || dispositionData.saleAmount <= 0)) {
      return { valid: false, reason: 'Sale amount is required but not provided' };
    }
    
    if (conditions.requiresFollowUp && !dispositionData.followUpDate) {
      return { valid: false, reason: 'Follow-up date is required but not provided' };
    }
    
    if (conditions.requiresNotes && (!dispositionData.notes || dispositionData.notes.trim() === '')) {
      return { valid: false, reason: 'Notes are required but not provided' };
    }
    
    if (conditions.leadScoreThreshold && (!dispositionData.leadScore || dispositionData.leadScore < conditions.leadScoreThreshold)) {
      return { valid: false, reason: `Lead score ${dispositionData.leadScore} below threshold ${conditions.leadScoreThreshold}` };
    }
    
    return { valid: true, reason: 'All conditions met' };
  }

  private calculateAgentEffort(call: any): number {
    // Calculate agent effort based on call duration and complexity
    const baseDuration = call.duration || 0;
    if (baseDuration < 60) return 1; // Very low effort
    if (baseDuration < 300) return 3; // Low effort 
    if (baseDuration < 900) return 5; // Medium effort
    if (baseDuration < 1800) return 7; // High effort
    return 9; // Very high effort
  }

  private generateOutcomeTags(rule: OutcomeMappingRule, dispositionData: any): string[] {
    const tags: string[] = [rule.outcomeCategory];
    
    if (dispositionData.saleAmount > 0) tags.push('revenue');
    if (dispositionData.leadScore >= 8) tags.push('high-quality');
    if (dispositionData.followUpDate) tags.push('follow-up');
    if (rule.saleProbability > 70) tags.push('high-probability');
    
    return tags;
  }

  private calculateOutcomeConfidence(rule: OutcomeMappingRule, dispositionData: any): number {
    let confidence = 7; // Base confidence
    
    if (dispositionData.saleAmount > 0) confidence += 2;
    if (dispositionData.leadScore >= 8) confidence += 1;
    if (dispositionData.notes && dispositionData.notes.length > 50) confidence += 1;
    
    return Math.min(10, confidence);
  }

  // Business calculation methods

  private calculateTotalRevenue(calls: any[]): number {
    return calls.reduce((total, call) => {
      const saleDisposition = call.dispositions.find((d: any) => d.dispositionId === 'sale_closed');
      return total + (saleDisposition?.saleAmount || 0);
    }, 0);
  }

  private async calculateProjectedRevenue(calls: any[]): Promise<number> {
    // Calculate projected revenue based on pipeline and probabilities
    let projected = 0;
    
    for (const call of calls) {
      for (const disposition of call.dispositions) {
        const rule = this.mappingRules.get(disposition.dispositionId);
        if (rule && rule.saleProbability > 0) {
          const potential = disposition.saleAmount || rule.baseValue;
          projected += potential * (rule.saleProbability / 100);
        }
      }
    }
    
    return projected;
  }

  private calculateAverageDealSize(calls: any[]): number {
    const salesCalls = calls.filter(call => 
      call.dispositions.some((d: any) => d.dispositionId === 'sale_closed' && d.saleAmount > 0)
    );
    
    if (salesCalls.length === 0) return 0;
    
    const totalSales = salesCalls.reduce((total, call) => {
      const saleDisposition = call.dispositions.find((d: any) => d.dispositionId === 'sale_closed');
      return total + (saleDisposition?.saleAmount || 0);
    }, 0);
    
    return totalSales / salesCalls.length;
  }

  private calculateLeadConversionRate(calls: any[]): number {
    const qualifiedLeads = calls.filter(call =>
      call.dispositions.some((d: any) => d.dispositionId === 'qualified_lead')
    ).length;
    
    const conversions = calls.filter(call =>
      call.dispositions.some((d: any) => d.dispositionId === 'sale_closed')
    ).length;
    
    return qualifiedLeads > 0 ? (conversions / qualifiedLeads) * 100 : 0;
  }

  private calculateAppointmentShowRate(calls: any[]): number {
    const appointments = calls.filter(call =>
      call.dispositions.some((d: any) => d.dispositionId === 'appointment_set')
    ).length;
    
    // This would require tracking actual appointment attendance
    // For now, assume 80% show rate
    return appointments > 0 ? 80 : 0;
  }

  private calculateCloseRate(calls: any[]): number {
    const totalContacts = calls.length;
    const sales = calls.filter(call =>
      call.dispositions.some((d: any) => d.dispositionId === 'sale_closed')
    ).length;
    
    return totalContacts > 0 ? (sales / totalContacts) * 100 : 0;
  }

  private async calculatePipelineValue(calls: any[]): Promise<number> {
    // Calculate total value in sales pipeline
    let pipelineValue = 0;
    
    for (const call of calls) {
      for (const disposition of call.dispositions) {
        const rule = this.mappingRules.get(disposition.dispositionId);
        if (rule && rule.saleProbability > 0 && disposition.dispositionId !== 'sale_closed') {
          const potential = disposition.saleAmount || rule.baseValue;
          pipelineValue += potential;
        }
      }
    }
    
    return pipelineValue;
  }

  private calculateTotalCampaignCost(campaign: any, calls: any[]): number {
    // Estimate campaign costs based on call volume and duration
    const totalCallTime = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
    const agentCostPerHour = 15; // £15/hour average
    const systemCostPerCall = 0.05; // £0.05 per call
    
    const agentCosts = (totalCallTime / 3600) * agentCostPerHour;
    const systemCosts = calls.length * systemCostPerCall;
    
    return agentCosts + systemCosts;
  }

  private calculateCostPerLead(totalCost: number, calls: any[]): number {
    const leads = calls.filter(call =>
      call.dispositions.some((d: any) => 
        ['qualified_lead', 'appointment_set', 'sale_closed'].includes(d.dispositionId)
      )
    ).length;
    
    return leads > 0 ? totalCost / leads : 0;
  }

  private calculateCostPerSale(totalCost: number, calls: any[]): number {
    const sales = calls.filter(call =>
      call.dispositions.some((d: any) => d.dispositionId === 'sale_closed')
    ).length;
    
    return sales > 0 ? totalCost / sales : 0;
  }

  private calculateAverageLeadQuality(calls: any[]): number {
    const scoredCalls = calls.filter(call =>
      call.dispositions.some((d: any) => d.leadScore && d.leadScore > 0)
    );
    
    if (scoredCalls.length === 0) return 0;
    
    const totalScore = scoredCalls.reduce((sum, call) => {
      const disposition = call.dispositions.find((d: any) => d.leadScore && d.leadScore > 0);
      return sum + (disposition?.leadScore || 0);
    }, 0);
    
    return totalScore / scoredCalls.length;
  }

  private calculateCustomerSatisfactionScore(calls: any[]): number {
    // Would come from actual customer feedback - for now return average
    return 7.5;
  }

  private async calculateOutcomeAccuracy(campaignId: string, startDate: Date, endDate: Date): Promise<number> {
    // Would compare predicted vs actual outcomes - for now return placeholder
    return 85;
  }

  private countQualifiedLeads(calls: any[]): number {
    return calls.filter(call =>
      call.dispositions.some((d: any) => d.dispositionId === 'qualified_lead')
    ).length;
  }

  private countSalesMade(calls: any[]): number {
    return calls.filter(call =>
      call.dispositions.some((d: any) => d.dispositionId === 'sale_closed')
    ).length;
  }

  private countAppointmentsSet(calls: any[]): number {
    return calls.filter(call =>
      call.dispositions.some((d: any) => d.dispositionId === 'appointment_set')
    ).length;
  }

  // Prediction helper methods

  private async getHistoricalOutcomesForPrediction(campaignId: string, contactData: any): Promise<any[]> {
    // Would analyze similar contacts and their outcomes
    return [];
  }

  private calculateHistoricalSuccessRate(outcomes: any[]): number {
    // Calculate success rate from historical data
    return 0.6; // 60% placeholder
  }

  private calculateContactQualityScore(contactData: any): number {
    // Score contact quality based on available data
    let score = 0.5; // Base score
    
    if (contactData.company) score += 0.2;
    if (contactData.email) score += 0.1;
    if (contactData.firstName && contactData.lastName) score += 0.1;
    if (contactData.address) score += 0.1;
    
    return Math.min(1, score);
  }

  private async getCampaignPerformanceScore(campaignId: string): Promise<number> {
    // Get campaign historical performance
    return 0.7; // 70% placeholder
  }

  private calculateTimeFactorScore(date: Date): number {
    const hour = date.getHours();
    // Best calling hours are 9-11 AM and 2-4 PM
    if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16)) {
      return 1.0;
    } else if (hour >= 8 && hour <= 18) {
      return 0.8;
    } else {
      return 0.4;
    }
  }

  private calculateContactHistoryScore(contactData: any): number {
    // Score based on previous contact attempts
    const attempts = contactData.attemptCount || 0;
    if (attempts === 0) return 1.0; // First attempt
    if (attempts === 1) return 0.8;
    if (attempts === 2) return 0.6;
    return 0.3; // Multiple attempts
  }

  private selectMostLikelyOutcome(confidence: number, historicalOutcomes: any[]): CallOutcomeCategory {
    if (confidence > 0.8) return CallOutcomeCategory.SALE_CLOSED;
    if (confidence > 0.7) return CallOutcomeCategory.QUALIFIED_LEAD;
    if (confidence > 0.6) return CallOutcomeCategory.APPOINTMENT_SET;
    if (confidence > 0.5) return CallOutcomeCategory.INTEREST_EXPRESSED;
    if (confidence > 0.4) return CallOutcomeCategory.CONTACT_MADE;
    return CallOutcomeCategory.NO_ANSWER;
  }

  private generateSuggestedActions(outcome: CallOutcomeCategory, confidence: number): string[] {
    const actions = [];
    
    if (confidence < 0.5) {
      actions.push('Consider warming up the contact with email first');
    }
    
    if (outcome === CallOutcomeCategory.QUALIFIED_LEAD) {
      actions.push('Prepare detailed product information');
      actions.push('Schedule follow-up within 24 hours');
    }
    
    if (outcome === CallOutcomeCategory.APPOINTMENT_SET) {
      actions.push('Prepare demonstration materials');
      actions.push('Send calendar invitation immediately');
    }
    
    return actions;
  }

  private calculateExpectedValue(outcome: CallOutcomeCategory, confidence: number): number {
    const rule = Array.from(this.mappingRules.values()).find(r => r.outcomeCategory === outcome);
    if (!rule) return 0;
    
    return rule.baseValue * confidence;
  }

  private estimateTimeToRealization(outcome: CallOutcomeCategory): number {
    const rule = Array.from(this.mappingRules.values()).find(r => r.outcomeCategory === outcome);
    return rule ? rule.timeToConversion : 0;
  }

  /**
   * Get mapping rule for a disposition
   */
  getMappingRule(dispositionId: string): OutcomeMappingRule | null {
    return this.mappingRules.get(dispositionId) || null;
  }

  /**
   * Update mapping rule
   */
  async updateMappingRule(rule: OutcomeMappingRule): Promise<void> {
    this.mappingRules.set(rule.dispositionId, rule);
    console.log(`📝 Updated outcome mapping rule for disposition ${rule.dispositionId}`);
  }
}

// Create and export singleton instance
export const outcomeMappingService = new OutcomeMappingService();
export default outcomeMappingService;