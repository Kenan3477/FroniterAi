/**
 * Automated Disposition Engine
 * AI-powered call outcome prediction and auto-disposition suggestions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CallOutcomeData {
  callId: string;
  agentId: string;
  duration: number;
  transcriptFull: string;
  leadScore: number;
  sentimentScore: number;
  conversationFlow: any[];
}

export interface DispositionSuggestion {
  suggestedDisposition: string;
  confidence: number;
  reasoning: string[];
  alternativeOptions: string[];
  requiresReview: boolean;
  autoApproved: boolean;
}

export class AutomatedDispositionEngine {
  private dispositionRules: Map<string, any> = new Map();
  private mlModel: any = null; // Placeholder for ML model
  
  constructor() {
    this.initializeDispositionRules();
    this.loadMLModel();
  }

  /**
   * Initialize rule-based disposition logic
   */
  private initializeDispositionRules() {
    console.log('📋 Initializing automated disposition rules...');
    
    // Define disposition rules based on conversation analysis
    this.dispositionRules.set('SALE', {
      leadScoreMin: 80,
      sentimentMin: 0.3,
      buyingSignals: ['sign up', 'get started', 'how much', 'when can'],
      confidence: 0.9,
      autoApprove: false // Sales always need human confirmation
    });

    this.dispositionRules.set('APPOINTMENT', {
      leadScoreMin: 70,
      sentimentMin: 0.1,
      appointmentSignals: ['call back', 'schedule', 'meet', 'discuss further'],
      confidence: 0.85,
      autoApprove: true
    });

    this.dispositionRules.set('CALLBACK', {
      leadScoreMin: 40,
      sentimentMin: -0.2,
      callbackSignals: ['think about', 'later', 'busy now', 'call back'],
      confidence: 0.8,
      autoApprove: true
    });

    this.dispositionRules.set('NOT_INTERESTED', {
      leadScoreMax: 30,
      sentimentMax: -0.3,
      rejectionSignals: ['not interested', 'no thanks', 'remove me', 'stop calling'],
      confidence: 0.9,
      autoApprove: true
    });

    this.dispositionRules.set('WRONG_NUMBER', {
      wrongNumberSignals: ['wrong number', 'who is this', 'never heard of'],
      confidence: 0.95,
      autoApprove: true
    });

    this.dispositionRules.set('BUSY', {
      busySignals: ['busy', 'in a meeting', 'driving', 'can\'t talk'],
      minDuration: 5, // seconds
      maxDuration: 30,
      confidence: 0.85,
      autoApprove: true
    });

    this.dispositionRules.set('NO_ANSWER', {
      duration: 0,
      confidence: 1.0,
      autoApprove: true
    });

    this.dispositionRules.set('VOICEMAIL', {
      voicemailSignals: ['voicemail', 'leave a message', 'after the beep'],
      confidence: 0.95,
      autoApprove: true
    });

    this.dispositionRules.set('DNC', {
      dncSignals: ['do not call', 'take me off', 'stop calling', 'remove from list'],
      confidence: 1.0,
      autoApprove: true,
      compliance: true
    });

    console.log('✅ Disposition rules initialized');
  }

  /**
   * Load ML model for advanced disposition prediction
   */
  private async loadMLModel() {
    // Placeholder for ML model loading
    console.log('🤖 ML disposition model ready (simulated)');
    this.mlModel = {
      predict: (features: any) => {
        // Simulated ML prediction
        return {
          disposition: 'CALLBACK',
          confidence: 0.75,
          features: features
        };
      }
    };
  }

  /**
   * Analyze call and suggest disposition
   */
  async suggestDisposition(callData: CallOutcomeData): Promise<DispositionSuggestion> {
    console.log(`🔍 Analyzing call ${callData.callId} for disposition suggestion...`);
    
    try {
      // Rule-based analysis
      const ruleBasedSuggestion = await this.analyzeWithRules(callData);
      
      // ML-based analysis
      const mlSuggestion = await this.analyzeWithML(callData);
      
      // Combine both approaches
      const finalSuggestion = await this.combineAnalyses(ruleBasedSuggestion, mlSuggestion, callData);
      
      // Validate and enhance suggestion
      const validatedSuggestion = await this.validateSuggestion(finalSuggestion, callData);
      
      // Log the suggestion
      await this.logDispositionSuggestion(callData.callId, validatedSuggestion);
      
      return validatedSuggestion;
      
    } catch (error) {
      console.error('Error in disposition analysis:', error);
      return this.getDefaultDisposition(callData);
    }
  }

  /**
   * Rule-based disposition analysis
   */
  private async analyzeWithRules(callData: CallOutcomeData): Promise<any> {
    const transcript = callData.transcriptFull.toLowerCase();
    const suggestions = [];
    
    // Check each disposition rule
    for (const [disposition, rule] of this.dispositionRules) {
      let score = 0;
      let matchedSignals = [];
      
      // Check lead score criteria
      if (rule.leadScoreMin && callData.leadScore >= rule.leadScoreMin) {
        score += 0.3;
      }
      if (rule.leadScoreMax && callData.leadScore <= rule.leadScoreMax) {
        score += 0.3;
      }
      
      // Check sentiment criteria
      if (rule.sentimentMin && callData.sentimentScore >= rule.sentimentMin) {
        score += 0.2;
      }
      if (rule.sentimentMax && callData.sentimentScore <= rule.sentimentMax) {
        score += 0.2;
      }
      
      // Check duration criteria
      if (rule.minDuration && callData.duration >= rule.minDuration) {
        score += 0.1;
      }
      if (rule.maxDuration && callData.duration <= rule.maxDuration) {
        score += 0.1;
      }
      
      // Check signal patterns
      const signalFields = [
        'buyingSignals', 'appointmentSignals', 'callbackSignals',
        'rejectionSignals', 'wrongNumberSignals', 'busySignals',
        'voicemailSignals', 'dncSignals'
      ];
      
      for (const field of signalFields) {
        if (rule[field]) {
          for (const signal of rule[field]) {
            if (transcript.includes(signal)) {
              score += 0.4;
              matchedSignals.push(signal);
            }
          }
        }
      }
      
      // Special case for no answer
      if (disposition === 'NO_ANSWER' && callData.duration === 0) {
        score = 1.0;
      }
      
      if (score > 0.5) {
        suggestions.push({
          disposition,
          score,
          confidence: rule.confidence * score,
          autoApprove: rule.autoApprove,
          matchedSignals,
          compliance: rule.compliance || false
        });
      }
    }
    
    // Sort by score
    suggestions.sort((a, b) => b.score - a.score);
    
    return suggestions.length > 0 ? suggestions[0] : null;
  }

  /**
   * ML-based disposition analysis
   */
  private async analyzeWithML(callData: CallOutcomeData): Promise<any> {
    if (!this.mlModel) {
      return null;
    }
    
    // Prepare features for ML model
    const features = {
      duration: callData.duration,
      leadScore: callData.leadScore,
      sentimentScore: callData.sentimentScore,
      wordCount: callData.transcriptFull.split(' ').length,
      agentTalkRatio: this.calculateAgentTalkRatio(callData.conversationFlow),
      interruptionCount: this.calculateInterruptions(callData.conversationFlow),
      questionCount: this.countQuestions(callData.transcriptFull),
      negativeWords: this.countNegativeWords(callData.transcriptFull),
      positiveWords: this.countPositiveWords(callData.transcriptFull)
    };
    
    // Get ML prediction
    const prediction = this.mlModel.predict(features);
    
    return {
      disposition: prediction.disposition,
      confidence: prediction.confidence,
      source: 'ML',
      features
    };
  }

  /**
   * Combine rule-based and ML analyses
   */
  private async combineAnalyses(ruleBased: any, mlBased: any, callData: CallOutcomeData): Promise<any> {
    // If only one analysis available
    if (!ruleBased && !mlBased) {
      return this.getDefaultDisposition(callData);
    }
    
    if (!mlBased) {
      return ruleBased;
    }
    
    if (!ruleBased) {
      return mlBased;
    }
    
    // Both available - combine intelligently
    const ruleConfidence = ruleBased.confidence;
    const mlConfidence = mlBased.confidence;
    
    // If rule-based is high confidence and compliance-related, prefer it
    if (ruleBased.compliance && ruleConfidence > 0.8) {
      return ruleBased;
    }
    
    // If both agree, use the higher confidence
    if (ruleBased.disposition === mlBased.disposition) {
      return {
        ...ruleBased,
        confidence: Math.max(ruleConfidence, mlConfidence),
        source: 'COMBINED'
      };
    }
    
    // If they disagree, use the higher confidence
    return ruleConfidence > mlConfidence ? ruleBased : mlBased;
  }

  /**
   * Validate and enhance suggestion
   */
  private async validateSuggestion(suggestion: any, callData: CallOutcomeData): Promise<DispositionSuggestion> {
    if (!suggestion) {
      return this.getDefaultDisposition(callData);
    }
    
    const reasoning = [];
    const alternatives = [];
    
    // Build reasoning
    if (suggestion.matchedSignals?.length > 0) {
      reasoning.push(`Detected signals: ${suggestion.matchedSignals.join(', ')}`);
    }
    
    if (callData.leadScore > 70) {
      reasoning.push(`High lead score (${callData.leadScore})`);
    }
    
    if (callData.sentimentScore > 0.3) {
      reasoning.push('Positive customer sentiment');
    } else if (callData.sentimentScore < -0.3) {
      reasoning.push('Negative customer sentiment');
    }
    
    if (callData.duration < 30) {
      reasoning.push('Short call duration');
    } else if (callData.duration > 300) {
      reasoning.push('Extended conversation');
    }
    
    // Generate alternatives
    const allDispositions = Array.from(this.dispositionRules.keys());
    alternatives.push(...allDispositions.filter(d => d !== suggestion.disposition).slice(0, 3));
    
    // Determine if review is required
    const requiresReview = (
      suggestion.disposition === 'SALE' ||
      suggestion.confidence < 0.7 ||
      (callData.leadScore > 60 && suggestion.disposition === 'NOT_INTERESTED')
    );
    
    // Determine auto-approval
    const autoApproved = (
      suggestion.autoApprove &&
      suggestion.confidence > 0.8 &&
      !requiresReview
    );
    
    return {
      suggestedDisposition: suggestion.disposition,
      confidence: Math.round(suggestion.confidence * 100) / 100,
      reasoning,
      alternativeOptions: alternatives,
      requiresReview,
      autoApproved
    };
  }

  /**
   * Get default disposition when analysis fails
   */
  private getDefaultDisposition(callData: CallOutcomeData): DispositionSuggestion {
    return {
      suggestedDisposition: 'NO_SALE',
      confidence: 0.5,
      reasoning: ['Default disposition due to analysis failure'],
      alternativeOptions: ['CALLBACK', 'NOT_INTERESTED', 'APPOINTMENT'],
      requiresReview: true,
      autoApproved: false
    };
  }

  /**
   * Auto-apply disposition if approved
   */
  async autoApplyDisposition(callId: string, suggestion: DispositionSuggestion, agentId: string): Promise<boolean> {
    if (!suggestion.autoApproved) {
      return false;
    }
    
    try {
      // Create disposition record
      await prisma.callDisposition.create({
        data: {
          dispositionId: `auto_${callId}_${Date.now()}`,
          callId,
          disposition: suggestion.suggestedDisposition as any,
          notes: `Auto-applied: ${suggestion.reasoning.join('; ')}`,
          confidenceScore: suggestion.confidence,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      // Log auto-disposition event
      await this.logAutoDisposition(callId, suggestion, agentId);
      
      console.log(`✅ Auto-applied disposition ${suggestion.suggestedDisposition} for call ${callId}`);
      return true;
      
    } catch (error) {
      console.error('Failed to auto-apply disposition:', error);
      return false;
    }
  }

  /**
   * Get disposition suggestions for agent review
   */
  async getDispositionOptions(callId: string): Promise<any[]> {
    const dispositions = Array.from(this.dispositionRules.keys());
    
    return dispositions.map(disposition => ({
      value: disposition,
      label: this.formatDispositionLabel(disposition),
      description: this.getDispositionDescription(disposition)
    }));
  }

  /**
   * Train disposition model with feedback
   */
  async trainWithFeedback(callId: string, suggestedDisposition: string, actualDisposition: string, agentId: string) {
    try {
      // Log training data
      await this.logDispositionFeedback(callId, suggestedDisposition, actualDisposition, agentId);
      
      // Update model performance metrics
      await this.updateModelMetrics(suggestedDisposition, actualDisposition);
      
      console.log(`📚 Training data logged: ${callId} - suggested: ${suggestedDisposition}, actual: ${actualDisposition}`);
      
    } catch (error) {
      console.error('Failed to log training feedback:', error);
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  private calculateAgentTalkRatio(conversationFlow: any[]): number {
    if (!conversationFlow || conversationFlow.length === 0) return 0.5;
    
    const agentWords = conversationFlow
      .filter(segment => segment.speaker === 'AGENT')
      .reduce((sum, segment) => sum + segment.text.split(' ').length, 0);
    
    const totalWords = conversationFlow
      .reduce((sum, segment) => sum + segment.text.split(' ').length, 0);
    
    return totalWords > 0 ? agentWords / totalWords : 0.5;
  }

  private calculateInterruptions(conversationFlow: any[]): number {
    if (!conversationFlow || conversationFlow.length < 2) return 0;
    
    let interruptions = 0;
    let lastSpeaker = null;
    
    for (const segment of conversationFlow) {
      if (lastSpeaker && segment.speaker !== lastSpeaker && segment.duration < 2) {
        interruptions++;
      }
      lastSpeaker = segment.speaker;
    }
    
    return interruptions;
  }

  private countQuestions(text: string): number {
    return (text.match(/\?/g) || []).length;
  }

  private countNegativeWords(text: string): number {
    const negativeWords = ['no', 'not', 'never', 'bad', 'terrible', 'hate', 'dislike', 'wrong', 'problem'];
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(word => negativeWords.includes(word)).length;
  }

  private countPositiveWords(text: string): number {
    const positiveWords = ['yes', 'good', 'great', 'excellent', 'love', 'like', 'perfect', 'interested'];
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(word => positiveWords.includes(word)).length;
  }

  private formatDispositionLabel(disposition: string): string {
    return disposition.replace(/_/g, ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getDispositionDescription(disposition: string): string {
    const descriptions: { [key: string]: string } = {
      'SALE': 'Customer agreed to purchase or sign up',
      'APPOINTMENT': 'Scheduled follow-up meeting or call',
      'CALLBACK': 'Customer requested to be called back later',
      'NOT_INTERESTED': 'Customer expressed no interest in the offer',
      'WRONG_NUMBER': 'Incorrect or invalid phone number',
      'BUSY': 'Customer was busy and could not talk',
      'NO_ANSWER': 'No one answered the call',
      'VOICEMAIL': 'Call went to voicemail',
      'DNC': 'Customer requested to be added to Do Not Call list'
    };
    
    return descriptions[disposition] || 'No description available';
  }

  // ==========================================
  // LOGGING METHODS
  // ==========================================

  private async logDispositionSuggestion(callId: string, suggestion: DispositionSuggestion) {
    try {
      // Log to analytics for model improvement
      console.log(`📊 Disposition suggestion for ${callId}: ${suggestion.suggestedDisposition} (${suggestion.confidence})`);
    } catch (error) {
      console.error('Failed to log disposition suggestion:', error);
    }
  }

  private async logAutoDisposition(callId: string, suggestion: DispositionSuggestion, agentId: string) {
    try {
      // Log auto-disposition event for audit
      console.log(`🤖 Auto-disposition applied: ${callId} -> ${suggestion.suggestedDisposition} by agent ${agentId}`);
    } catch (error) {
      console.error('Failed to log auto-disposition:', error);
    }
  }

  private async logDispositionFeedback(callId: string, suggested: string, actual: string, agentId: string) {
    try {
      // Log training feedback for model improvement
      console.log(`🎯 Disposition feedback: ${callId} - suggested: ${suggested}, actual: ${actual}, agent: ${agentId}`);
    } catch (error) {
      console.error('Failed to log disposition feedback:', error);
    }
  }

  private async updateModelMetrics(suggested: string, actual: string) {
    try {
      const isCorrect = suggested === actual;
      console.log(`📈 Model accuracy update: ${suggested} -> ${actual} (${isCorrect ? 'correct' : 'incorrect'})`);
    } catch (error) {
      console.error('Failed to update model metrics:', error);
    }
  }
}

export default AutomatedDispositionEngine;