/**
 * Live Coaching Service
 * Real-time agent coaching and suggestions based on conversation analysis
 */

import { EventEmitter } from 'events';
import { getWebSocketService } from '../socket';
import sentimentAnalysisService from './sentimentAnalysisService';

interface CoachingRecommendation {
  id: string;
  callId: string;
  agentId: string;
  type: 'suggestion' | 'warning' | 'opportunity' | 'compliance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  action?: string;
  timing: 'immediate' | 'next_pause' | 'call_end';
  confidence: number;
  triggers: string[];
  expiresAt: Date;
  acknowledged?: boolean;
}

interface ConversationContext {
  callId: string;
  agentId: string;
  transcript: string;
  sentimentScore: number;
  customerMood: 'positive' | 'neutral' | 'negative' | 'frustrated';
  callDuration: number;
  objections: string[];
  interests: string[];
  callStage: 'opening' | 'discovery' | 'presentation' | 'handling_objections' | 'closing' | 'wrap_up';
}

export class LiveCoachingService extends EventEmitter {
  private activeRecommendations = new Map<string, CoachingRecommendation[]>();
  private conversationContexts = new Map<string, ConversationContext>();
  private coachingRules = this.initializeCoachingRules();

  constructor() {
    super();
    console.log('🎯 Live Coaching Service initialized');
  }

  /**
   * Analyze conversation and generate coaching recommendations
   */
  async generateCoaching(
    callId: string,
    agentId: string,
    transcript: string,
    sentimentScore: number,
    intentClassification: string
  ): Promise<CoachingRecommendation[]> {
    try {
      // Update conversation context
      const context = this.updateConversationContext(callId, agentId, transcript, sentimentScore);
      
      // Generate recommendations based on current context
      const recommendations = await this.analyzeConversationForCoaching(context, intentClassification);
      
      // Store recommendations
      this.activeRecommendations.set(callId, recommendations);
      
      // Send to agent in real-time
      if (recommendations.length > 0) {
        await this.broadcastCoachingToAgent(agentId, recommendations);
      }

      return recommendations;

    } catch (error) {
      console.error(`❌ Error generating coaching for call ${callId}:`, error);
      return [];
    }
  }

  private updateConversationContext(
    callId: string,
    agentId: string,
    transcript: string,
    sentimentScore: number
  ): ConversationContext {
    const existingContext = this.conversationContexts.get(callId);
    
    const context: ConversationContext = {
      callId,
      agentId,
      transcript: existingContext ? existingContext.transcript + ' ' + transcript : transcript,
      sentimentScore,
      customerMood: this.determineMood(sentimentScore),
      callDuration: existingContext ? existingContext.callDuration + 5 : 5, // Approximate
      objections: this.extractObjections(transcript),
      interests: this.extractInterests(transcript),
      callStage: this.determineCallStage(transcript, existingContext?.callStage)
    };

    this.conversationContexts.set(callId, context);
    return context;
  }

  private async analyzeConversationForCoaching(
    context: ConversationContext,
    intentClassification: string
  ): Promise<CoachingRecommendation[]> {
    const recommendations: CoachingRecommendation[] = [];

    // Sentiment-based coaching
    if (context.customerMood === 'negative' || context.sentimentScore < 0.3) {
      recommendations.push({
        id: `sentiment_${Date.now()}`,
        callId: context.callId,
        agentId: context.agentId,
        type: 'warning',
        priority: 'high',
        title: 'Customer Sentiment Alert',
        message: 'Customer seems frustrated or negative. Consider acknowledging their concerns and showing empathy.',
        action: 'Use phrases like "I understand your frustration" or "Let me help you with that"',
        timing: 'immediate',
        confidence: 0.85,
        triggers: ['negative_sentiment'],
        expiresAt: new Date(Date.now() + 30000) // 30 seconds
      });
    }

    // Objection handling coaching
    if (context.objections.length > 0) {
      const latestObjection = context.objections[context.objections.length - 1];
      recommendations.push({
        id: `objection_${Date.now()}`,
        callId: context.callId,
        agentId: context.agentId,
        type: 'suggestion',
        priority: 'medium',
        title: 'Objection Detected',
        message: `Customer expressed: "${latestObjection}". Address this concern directly.`,
        action: this.getObjectionResponse(latestObjection),
        timing: 'immediate',
        confidence: 0.75,
        triggers: ['objection_detected'],
        expiresAt: new Date(Date.now() + 45000) // 45 seconds
      });
    }

    // Interest signals coaching
    if (context.interests.length > 0 && intentClassification === 'interested') {
      recommendations.push({
        id: `interest_${Date.now()}`,
        callId: context.callId,
        agentId: context.agentId,
        type: 'opportunity',
        priority: 'high',
        title: 'Interest Opportunity',
        message: 'Customer showing strong interest signals. This is a good time to present benefits or ask for commitment.',
        action: 'Try closing questions like "Would this solution work for you?" or "Shall we move forward with this?"',
        timing: 'immediate',
        confidence: 0.9,
        triggers: ['interest_signals'],
        expiresAt: new Date(Date.now() + 60000) // 1 minute
      });
    }

    // Call duration coaching
    if (context.callDuration > 300 && context.callStage === 'discovery') { // 5+ minutes
      recommendations.push({
        id: `duration_${Date.now()}`,
        callId: context.callId,
        agentId: context.agentId,
        type: 'suggestion',
        priority: 'medium',
        title: 'Call Progress',
        message: 'Call has been in discovery phase for 5+ minutes. Consider moving to presentation.',
        action: 'Summarize what you\'ve learned and transition to presenting solutions',
        timing: 'next_pause',
        confidence: 0.7,
        triggers: ['long_discovery'],
        expiresAt: new Date(Date.now() + 120000) // 2 minutes
      });
    }

    // Compliance coaching
    if (this.hasComplianceRisks(context.transcript)) {
      recommendations.push({
        id: `compliance_${Date.now()}`,
        callId: context.callId,
        agentId: context.agentId,
        type: 'compliance',
        priority: 'critical',
        title: 'Compliance Alert',
        message: 'Potential compliance issue detected. Ensure all disclosures are made.',
        action: 'Review required disclosures and ensure customer consent is obtained',
        timing: 'immediate',
        confidence: 0.95,
        triggers: ['compliance_risk'],
        expiresAt: new Date(Date.now() + 180000) // 3 minutes
      });
    }

    return recommendations;
  }

  private determineMood(sentimentScore: number): 'positive' | 'neutral' | 'negative' | 'frustrated' {
    if (sentimentScore > 0.7) return 'positive';
    if (sentimentScore > 0.4) return 'neutral';
    if (sentimentScore > 0.2) return 'negative';
    return 'frustrated';
  }

  private extractObjections(transcript: string): string[] {
    const objectionPatterns = [
      /not interested/i,
      /too expensive/i,
      /can't afford/i,
      /think about it/i,
      /not right time/i,
      /need to discuss/i,
      /already have/i,
      /not convinced/i,
      /sounds too good/i
    ];

    const objections: string[] = [];
    const sentences = transcript.split(/[.!?]+/);

    for (const sentence of sentences) {
      for (const pattern of objectionPatterns) {
        if (pattern.test(sentence)) {
          objections.push(sentence.trim());
          break;
        }
      }
    }

    return objections.slice(-3); // Keep last 3 objections
  }

  private extractInterests(transcript: string): string[] {
    const interestPatterns = [
      /sounds good/i,
      /interested/i,
      /tell me more/i,
      /how much/i,
      /what's included/i,
      /when can we start/i,
      /that works/i,
      /perfect/i,
      /exactly what I need/i
    ];

    const interests: string[] = [];
    const sentences = transcript.split(/[.!?]+/);

    for (const sentence of sentences) {
      for (const pattern of interestPatterns) {
        if (pattern.test(sentence)) {
          interests.push(sentence.trim());
          break;
        }
      }
    }

    return interests.slice(-3); // Keep last 3 interest signals
  }

  private determineCallStage(transcript: string, previousStage?: ConversationContext['callStage']): ConversationContext['callStage'] {
    const lowerTranscript = transcript.toLowerCase();

    // Opening indicators
    if (lowerTranscript.includes('thank you for calling') || lowerTranscript.includes('how are you today')) {
      return 'opening';
    }

    // Discovery indicators
    if (lowerTranscript.includes('tell me about') || lowerTranscript.includes('what do you') || lowerTranscript.includes('how do you currently')) {
      return 'discovery';
    }

    // Presentation indicators
    if (lowerTranscript.includes('let me explain') || lowerTranscript.includes('our solution') || lowerTranscript.includes('what this means')) {
      return 'presentation';
    }

    // Objection handling indicators
    if (lowerTranscript.includes('i understand') || lowerTranscript.includes('let me address')) {
      return 'handling_objections';
    }

    // Closing indicators
    if (lowerTranscript.includes('shall we') || lowerTranscript.includes('would you like to') || lowerTranscript.includes('move forward')) {
      return 'closing';
    }

    return previousStage || 'discovery'; // Default to discovery
  }

  private getObjectionResponse(objection: string): string {
    const objectionResponses: Record<string, string> = {
      'not interested': 'Ask what specifically they\'re not interested in and address those concerns',
      'too expensive': 'Focus on value and ROI. Ask about their current costs or what budget range works for them',
      'think about it': 'Ask what specific information they need to make a decision today',
      'not right time': 'Explore what would make it the right time and if you can address those timing concerns',
      'already have': 'Ask about their current solution and what improvements they\'d like to see'
    };

    for (const [key, response] of Object.entries(objectionResponses)) {
      if (objection.toLowerCase().includes(key)) {
        return response;
      }
    }

    return 'Acknowledge the concern and ask open-ended questions to understand their perspective better';
  }

  private hasComplianceRisks(transcript: string): boolean {
    const complianceFlags = [
      /guarantee/i,
      /100% success/i,
      /risk-free/i,
      /get rich quick/i,
      /no way to lose/i
    ];

    return complianceFlags.some(flag => flag.test(transcript));
  }

  private async broadcastCoachingToAgent(agentId: string, recommendations: CoachingRecommendation[]): Promise<void> {
    try {
      const webSocketService = getWebSocketService();
      
      // Send to specific agent
      webSocketService.sendToAgent(agentId, 'live_coaching', {
        recommendations: recommendations.filter(r => r.timing === 'immediate'),
        timestamp: new Date().toISOString()
      });

      // Emit event for logging/monitoring
      this.emit('coaching_sent', { agentId, recommendationCount: recommendations.length });

    } catch (error) {
      console.error(`❌ Error broadcasting coaching to agent ${agentId}:`, error);
    }
  }

  private initializeCoachingRules(): any {
    // Placeholder for future rule engine
    return {
      sentimentThresholds: {
        negative: 0.3,
        positive: 0.7
      },
      callDurationLimits: {
        discovery: 300, // 5 minutes
        presentation: 600, // 10 minutes
      }
    };
  }

  // Public methods for external access
  public getActiveRecommendations(callId: string): CoachingRecommendation[] {
    return this.activeRecommendations.get(callId) || [];
  }

  public acknowledgeRecommendation(callId: string, recommendationId: string): void {
    const recommendations = this.activeRecommendations.get(callId);
    if (recommendations) {
      const recommendation = recommendations.find(r => r.id === recommendationId);
      if (recommendation) {
        recommendation.acknowledged = true;
        this.emit('recommendation_acknowledged', { callId, recommendationId });
      }
    }
  }

  public clearExpiredRecommendations(): void {
    const now = new Date();
    for (const [callId, recommendations] of this.activeRecommendations.entries()) {
      const activeRecs = recommendations.filter(r => r.expiresAt > now);
      if (activeRecs.length === 0) {
        this.activeRecommendations.delete(callId);
      } else {
        this.activeRecommendations.set(callId, activeRecs);
      }
    }
  }

  public endCallCoaching(callId: string): void {
    // Cleanup when call ends
    this.activeRecommendations.delete(callId);
    this.conversationContexts.delete(callId);
    console.log(`🎯 Coaching session ended for call: ${callId}`);
  }
}

// Singleton instance
export const liveCoachingService = new LiveCoachingService();

// Cleanup expired recommendations every 30 seconds
setInterval(() => {
  liveCoachingService.clearExpiredRecommendations();
}, 30000);

export default liveCoachingService;