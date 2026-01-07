/**
 * Auto-Disposition Service with AI-Driven Recommendations
 * Phase 3: Advanced AI Dialler Implementation
 */

import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { sentimentAnalysisService } from '../services/sentimentAnalysisService';

const prisma = new PrismaClient();

export interface DispositionRecommendation {
  disposition: string;
  confidence: number;
  reasoning: string[];
  suggestedActions: string[];
  nextBestAction?: string;
  estimatedRevenue?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface CallContext {
  callId: string;
  agentId: string;
  contactId: string;
  campaignId: string;
  callDuration: number;
  sentimentData: Array<{
    sentiment: string;
    confidence: number;
    timestamp: Date;
  }>;
  transcript?: string;
  previousDispositions?: string[];
  contactHistory?: any[];
}

export class AutoDispositionService {
  
  /**
   * Generate AI-powered disposition recommendation
   */
  async generateRecommendation(callContext: CallContext): Promise<DispositionRecommendation> {
    try {
      // Analyze call patterns and sentiment
      const analysis = await this.analyzeCallPatterns(callContext);
      
      // Get contact history context
      const historicalContext = await this.getContactHistory(callContext.contactId);
      
      // Apply ML-based disposition logic
      const recommendation = await this.applyDispositionLogic(analysis, historicalContext, callContext);
      
      // Calculate confidence score
      const confidence = this.calculateConfidenceScore(recommendation, callContext);
      
      return {
        disposition: recommendation.disposition || 'UNKNOWN',
        confidence: confidence,
        reasoning: recommendation.reasoning || [],
        suggestedActions: recommendation.suggestedActions || [],
        nextBestAction: recommendation.nextBestAction,
        estimatedRevenue: recommendation.estimatedRevenue,
        priority: recommendation.priority || 'medium'
      };
      
    } catch (error) {
      console.error('Auto-disposition generation error:', error);
      
      // Fallback to rule-based disposition
      return this.getFallbackRecommendation(callContext);
    }
  }
  
  /**
   * Analyze call patterns for disposition insights
   */
  private async analyzeCallPatterns(callContext: CallContext): Promise<any> {
    const { sentimentData, callDuration, transcript } = callContext;
    
    // Sentiment trend analysis
    const sentimentTrend = this.analyzeSentimentTrend(sentimentData);
    
    // Call duration analysis
    const durationInsight = this.analyzeDuration(callDuration);
    
    // Keyword and intent analysis from transcript
    const intentAnalysis = transcript ? await this.analyzeIntent(transcript) : null;
    
    return {
      sentimentTrend,
      durationInsight,
      intentAnalysis,
      engagementLevel: this.calculateEngagementLevel(sentimentData, callDuration),
      objectionPattern: this.detectObjectionPatterns(transcript || ''),
      closingSignals: this.detectClosingSignals(transcript || ''),
      complianceIssues: this.detectComplianceIssues(transcript || '')
    };
  }
  
  /**
   * Apply ML-based disposition logic
   */
  private async applyDispositionLogic(
    analysis: any, 
    historicalContext: any, 
    callContext: CallContext
  ): Promise<Partial<DispositionRecommendation>> {
    
    const reasoning: string[] = [];
    const suggestedActions: string[] = [];
    let disposition = 'UNKNOWN';
    let nextBestAction = '';
    let estimatedRevenue = 0;
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    
    // Sale indicators
    if (analysis.closingSignals.length > 0 && analysis.sentimentTrend.overall === 'positive') {
      disposition = 'SALE';
      reasoning.push('Strong closing signals detected with positive sentiment');
      reasoning.push(`Identified ${analysis.closingSignals.length} purchase indicators`);
      suggestedActions.push('Proceed with order processing');
      suggestedActions.push('Confirm payment details');
      nextBestAction = 'schedule_followup_delivery';
      estimatedRevenue = this.estimateRevenueFromCall(callContext, analysis);
      priority = 'high';
    }
    
    // Lead quality assessment
    else if (analysis.engagementLevel > 0.7 && analysis.sentimentTrend.trajectory === 'improving') {
      disposition = 'HOT_LEAD';
      reasoning.push('High engagement with improving sentiment trajectory');
      reasoning.push(`Engagement score: ${Math.round(analysis.engagementLevel * 100)}%`);
      suggestedActions.push('Schedule follow-up within 24 hours');
      suggestedActions.push('Send personalized information packet');
      nextBestAction = 'schedule_demo';
      priority = 'high';
    }
    
    // Objection handling
    else if (analysis.objectionPattern.length > 0) {
      if (analysis.sentimentTrend.overall === 'negative') {
        disposition = 'OBJECTION_NOT_OVERCOME';
        reasoning.push('Multiple objections detected without resolution');
        reasoning.push(`Primary objections: ${analysis.objectionPattern.slice(0, 2).join(', ')}`);
        suggestedActions.push('Review objection handling techniques');
        suggestedActions.push('Provide additional training materials');
        nextBestAction = 'schedule_manager_followup';
        priority = 'medium';
      } else {
        disposition = 'OBJECTION_OVERCOME';
        reasoning.push('Objections successfully addressed');
        reasoning.push('Customer sentiment improved after objection handling');
        suggestedActions.push('Continue nurturing with educational content');
        nextBestAction = 'schedule_product_demo';
        priority = 'medium';
      }
    }
    
    // Not interested indicators
    else if (analysis.sentimentTrend.overall === 'negative' && analysis.engagementLevel < 0.3) {
      disposition = 'NOT_INTERESTED';
      reasoning.push('Consistently negative sentiment with low engagement');
      reasoning.push(`Engagement level: ${Math.round(analysis.engagementLevel * 100)}%`);
      suggestedActions.push('Add to long-term nurture campaign');
      suggestedActions.push('Remove from immediate follow-up queue');
      nextBestAction = 'add_to_nurture_sequence';
      priority = 'low';
    }
    
    // Callback requests
    else if (this.detectCallbackRequest(analysis.intentAnalysis)) {
      disposition = 'CALLBACK_REQUESTED';
      reasoning.push('Explicit callback request detected');
      suggestedActions.push('Schedule callback at requested time');
      suggestedActions.push('Send confirmation with callback details');
      nextBestAction = 'schedule_callback';
      priority = 'medium';
    }
    
    // Compliance issues
    if (analysis.complianceIssues.length > 0) {
      disposition = 'COMPLIANCE_ISSUE';
      reasoning.push('Compliance concerns detected in call');
      reasoning.push(`Issues: ${analysis.complianceIssues.join(', ')}`);
      suggestedActions.push('Flag for quality review');
      suggestedActions.push('Provide compliance training');
      priority = 'urgent';
    }
    
    // Consider historical context
    if (historicalContext.previousAttempts > 3) {
      reasoning.push(`Contact has ${historicalContext.previousAttempts} previous attempts`);
      if (disposition === 'NOT_INTERESTED') {
        disposition = 'DO_NOT_CALL';
        suggestedActions.push('Add to suppression list');
        nextBestAction = 'suppress_contact';
      }
    }
    
    return {
      disposition,
      reasoning,
      suggestedActions,
      nextBestAction,
      estimatedRevenue,
      priority
    };
  }
  
  /**
   * Calculate confidence score based on multiple factors
   */
  private calculateConfidenceScore(
    recommendation: Partial<DispositionRecommendation>, 
    callContext: CallContext
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Factor 1: Call duration appropriateness
    if (callContext.callDuration > 120) { // 2+ minutes
      confidence += 0.1;
    }
    if (callContext.callDuration > 300) { // 5+ minutes
      confidence += 0.1;
    }
    
    // Factor 2: Sentiment data quality
    if (callContext.sentimentData.length > 5) {
      confidence += 0.1;
    }
    if (callContext.sentimentData.length > 10) {
      confidence += 0.1;
    }
    
    // Factor 3: Reasoning strength
    if (recommendation.reasoning && recommendation.reasoning.length > 2) {
      confidence += 0.1;
    }
    
    // Factor 4: Historical context
    if (callContext.previousDispositions && callContext.previousDispositions.length > 0) {
      confidence += 0.05;
    }
    
    // Factor 5: Transcript availability
    if (callContext.transcript && callContext.transcript.length > 100) {
      confidence += 0.15;
    }
    
    return Math.min(0.95, Math.max(0.1, confidence));
  }
  
  /**
   * Get contact interaction history
   */
  private async getContactHistory(contactId: string): Promise<any> {
    try {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        include: {
          callRecords: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });
      
      if (!contact) {
        return { previousAttempts: 0, lastDisposition: null };
      }
      
      return {
        previousAttempts: contact.callRecords.length,
        lastDisposition: contact.callRecords[0]?.dispositionId,
        averageCallDuration: this.calculateAverageCallDuration(contact.callRecords),
        historicalSentiment: await this.getHistoricalSentiment(contactId)
      };
    } catch (error) {
      console.error('Error fetching contact history:', error);
      return { previousAttempts: 0, lastDisposition: null };
    }
  }
  
  /**
   * Analyze sentiment trend
   */
  private analyzeSentimentTrend(sentimentData: Array<{sentiment: string; confidence: number; timestamp: Date}>): any {
    if (sentimentData.length === 0) {
      return { overall: 'neutral', trajectory: 'stable', volatility: 0 };
    }
    
    const sentimentScores = sentimentData.map(data => {
      const score = data.sentiment === 'positive' ? data.confidence :
                   data.sentiment === 'negative' ? -data.confidence : 0;
      return score;
    });
    
    const overall = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
    
    // Calculate trajectory (improving/declining)
    const firstHalf = sentimentScores.slice(0, Math.floor(sentimentScores.length / 2));
    const secondHalf = sentimentScores.slice(Math.floor(sentimentScores.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length || 0;
    const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length || 0;
    
    const trajectory = secondAvg > firstAvg + 0.1 ? 'improving' :
                      secondAvg < firstAvg - 0.1 ? 'declining' : 'stable';
    
    // Calculate volatility
    const variance = sentimentScores.reduce((sum, score) => sum + Math.pow(score - overall, 2), 0) / sentimentScores.length;
    const volatility = Math.sqrt(variance);
    
    return {
      overall: overall > 0.1 ? 'positive' : overall < -0.1 ? 'negative' : 'neutral',
      trajectory,
      volatility,
      score: overall
    };
  }
  
  /**
   * Analyze call duration appropriateness
   */
  private analyzeDuration(duration: number): any {
    return {
      category: duration < 60 ? 'very_short' :
               duration < 180 ? 'short' :
               duration < 600 ? 'medium' :
               duration < 1200 ? 'long' : 'very_long',
      adequateForSale: duration > 120,
      adequateForLead: duration > 60
    };
  }
  
  /**
   * Analyze customer intent from transcript
   */
  private async analyzeIntent(transcript: string): Promise<any> {
    // Intent keywords and patterns
    const buyingSignals = ['interested', 'price', 'cost', 'buy', 'purchase', 'order', 'sign up', 'proceed'];
    const objectionKeywords = ['expensive', 'think about', 'not sure', 'maybe later', 'not interested'];
    const questionKeywords = ['how', 'what', 'when', 'where', 'why', 'can you'];
    
    const words = transcript.toLowerCase().split(/\s+/);
    
    const buyingScore = buyingSignals.reduce((score, signal) => 
      score + (words.filter(word => word.includes(signal)).length), 0);
    
    const objectionScore = objectionKeywords.reduce((score, objection) => 
      score + (words.filter(word => word.includes(objection)).length), 0);
    
    const questionScore = questionKeywords.reduce((score, question) => 
      score + (words.filter(word => word.includes(question)).length), 0);
    
    return {
      buyingIntent: buyingScore,
      objectionLevel: objectionScore,
      engagementLevel: questionScore,
      dominantIntent: buyingScore > objectionScore && buyingScore > 0 ? 'buying' :
                     objectionScore > 0 ? 'objecting' :
                     questionScore > 2 ? 'exploring' : 'neutral'
    };
  }
  
  /**
   * Calculate engagement level
   */
  private calculateEngagementLevel(sentimentData: any[], duration: number): number {
    if (sentimentData.length === 0 || duration < 30) return 0;
    
    // Base engagement from sentiment frequency
    const baseEngagement = Math.min(1, sentimentData.length / 10);
    
    // Duration factor
    const durationFactor = duration > 120 ? 1 : duration / 120;
    
    // Sentiment variance (indicates active conversation)
    const sentimentVariance = this.calculateSentimentVariance(sentimentData);
    const varianceFactor = Math.min(1, sentimentVariance * 2);
    
    return (baseEngagement * 0.4 + durationFactor * 0.4 + varianceFactor * 0.2);
  }
  
  /**
   * Detect objection patterns
   */
  private detectObjectionPatterns(transcript: string): string[] {
    const objectionPatterns = [
      { pattern: /too expensive|costs? too much|can't afford/i, type: 'price' },
      { pattern: /think about it|need to consider|not sure/i, type: 'decision' },
      { pattern: /not interested|not for me|not what I need/i, type: 'interest' },
      { pattern: /bad time|busy|call back/i, type: 'timing' },
      { pattern: /already have|current provider|satisfied with/i, type: 'competition' }
    ];
    
    return objectionPatterns
      .filter(({ pattern }) => pattern.test(transcript))
      .map(({ type }) => type);
  }
  
  /**
   * Detect closing signals
   */
  private detectClosingSignals(transcript: string): string[] {
    const closingSignals = [
      { pattern: /sounds good|I'm interested|let's do it/i, type: 'agreement' },
      { pattern: /when can we start|how do I sign up|what's the next step/i, type: 'progression' },
      { pattern: /price is good|fair price|reasonable cost/i, type: 'price_acceptance' },
      { pattern: /yes|okay|sure|absolutely/i, type: 'affirmation' }
    ];
    
    return closingSignals
      .filter(({ pattern }) => pattern.test(transcript))
      .map(({ type }) => type);
  }
  
  /**
   * Detect compliance issues
   */
  private detectComplianceIssues(transcript: string): string[] {
    const compliancePatterns = [
      { pattern: /guarantee|promise|100% sure/i, type: 'unauthorized_guarantees' },
      { pattern: /must buy now|limited time|expires today/i, type: 'high_pressure' },
      { pattern: /everyone's doing it|most people choose/i, type: 'misleading_claims' }
    ];
    
    return compliancePatterns
      .filter(({ pattern }) => pattern.test(transcript))
      .map(({ type }) => type);
  }
  
  /**
   * Detect callback requests
   */
  private detectCallbackRequest(intentAnalysis: any): boolean {
    return intentAnalysis?.dominantIntent === 'exploring' && 
           intentAnalysis?.engagementLevel > 2;
  }
  
  /**
   * Estimate potential revenue from call indicators
   */
  private estimateRevenueFromCall(callContext: CallContext, analysis: any): number {
    // This would integrate with product/pricing data
    const baseRevenue = 500; // Example base value
    
    let multiplier = 1;
    if (analysis.closingSignals.includes('price_acceptance')) multiplier += 0.5;
    if (analysis.engagementLevel > 0.8) multiplier += 0.3;
    if (callContext.callDuration > 300) multiplier += 0.2;
    
    return Math.round(baseRevenue * multiplier);
  }
  
  /**
   * Calculate average call duration from records
   */
  private calculateAverageCallDuration(callRecords: any[]): number {
    if (callRecords.length === 0) return 0;
    
    const totalDuration = callRecords.reduce((sum, record) => {
      return sum + (record.duration || 0);
    }, 0);
    
    return totalDuration / callRecords.length;
  }
  
  /**
   * Get historical sentiment for contact
   */
  private async getHistoricalSentiment(contactId: string): Promise<any> {
    try {
      // For now, use placeholder logic until SentimentAnalysis model is confirmed
      // const sentimentRecords = await prisma.sentimentAnalysis.findMany({
      //   where: {
      //     callRecord: {
      //       contactId: contactId
      //     }
      //   },
      //   orderBy: { timestamp: 'desc' },
      //   take: 20
      // });
      
      // Placeholder return for now
      const sentimentRecords: any[] = [];
      
      if (sentimentRecords.length === 0) return null;
      
      const avgSentiment = sentimentRecords.reduce((sum: number, record: any) => {
        const score = record.sentiment === 'positive' ? record.confidence :
                     record.sentiment === 'negative' ? -record.confidence : 0;
        return sum + score;
      }, 0) / sentimentRecords.length;
      
      return {
        average: avgSentiment,
        trend: this.analyzeSentimentTrend(sentimentRecords),
        consistency: this.calculateSentimentConsistency(sentimentRecords)
      };
    } catch (error) {
      console.error('Error fetching historical sentiment:', error);
      return null;
    }
  }
  
  /**
   * Calculate sentiment variance for engagement measurement
   */
  private calculateSentimentVariance(sentimentData: any[]): number {
    if (sentimentData.length < 2) return 0;
    
    const scores = sentimentData.map(data => {
      return data.sentiment === 'positive' ? data.confidence :
             data.sentiment === 'negative' ? -data.confidence : 0;
    });
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    
    return Math.sqrt(variance);
  }
  
  /**
   * Calculate sentiment consistency
   */
  private calculateSentimentConsistency(sentimentData: any[]): number {
    if (sentimentData.length < 2) return 1;
    
    const variance = this.calculateSentimentVariance(sentimentData);
    return Math.max(0, 1 - variance); // Lower variance = higher consistency
  }
  
  /**
   * Fallback recommendation when ML analysis fails
   */
  private getFallbackRecommendation(callContext: CallContext): DispositionRecommendation {
    return {
      disposition: 'NEEDS_REVIEW',
      confidence: 0.1,
      reasoning: ['Automatic analysis failed', 'Manual disposition required'],
      suggestedActions: ['Review call manually', 'Apply appropriate disposition'],
      priority: 'medium'
    };
  }
}

export default AutoDispositionService;