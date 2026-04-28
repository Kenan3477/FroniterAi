/**
 * Live Coaching System
 * Real-time coaching prompts and whisper suggestions during calls
 */

import { Server } from 'socket.io';
import RealTimeAIScoringEngine from './RealTimeAIScoringEngine';

export interface CoachingPrompt {
  type: 'WHISPER' | 'VISUAL' | 'ALERT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  action: string;
  timing: 'IMMEDIATE' | 'PAUSE' | 'END_OF_CALL';
  duration: number; // seconds to display
}

export interface CoachingContext {
  callId: string;
  agentId: string;
  currentPhase: 'OPENING' | 'DISCOVERY' | 'PRESENTATION' | 'OBJECTION_HANDLING' | 'CLOSING';
  callDuration: number;
  lastPromptTime: Date;
  agentPerformanceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  customerSentiment: number;
  leadScore: number;
}

export class LiveCoachingSystem {
  private io: Server;
  private scoringEngine: RealTimeAIScoringEngine;
  private activeCoachingSessions: Map<string, CoachingContext> = new Map();
  private coachingRules: Map<string, any> = new Map();
  private promptHistory: Map<string, any[]> = new Map();

  constructor(io: Server, scoringEngine: RealTimeAIScoringEngine) {
    this.io = io;
    this.scoringEngine = scoringEngine;
    this.initializeCoachingRules();
    this.startCoachingEngine();
  }

  /**
   * Initialize coaching rules and triggers
   */
  private initializeCoachingRules() {
    console.log('🎯 Initializing live coaching rules...');

    // Opening Phase Coaching
    this.coachingRules.set('opening_too_fast', {
      trigger: (context: CoachingContext, analysis: any) => 
        context.currentPhase === 'OPENING' && analysis.speechPace === 'VERY_FAST',
      prompt: {
        type: 'VISUAL',
        priority: 'MEDIUM',
        message: 'Slow down your pace - customer needs time to process',
        action: 'Take a breath and speak more slowly',
        timing: 'IMMEDIATE',
        duration: 8
      }
    });

    this.coachingRules.set('opening_no_rapport', {
      trigger: (context: CoachingContext, analysis: any) => 
        context.currentPhase === 'OPENING' && context.callDuration > 30 && analysis.sentimentScore < 0,
      prompt: {
        type: 'WHISPER',
        priority: 'HIGH',
        message: 'Build rapport first - ask about their day or business',
        action: 'Use empathy and show genuine interest',
        timing: 'PAUSE',
        duration: 10
      }
    });

    // Discovery Phase Coaching
    this.coachingRules.set('discovery_no_questions', {
      trigger: (context: CoachingContext, analysis: any) => 
        context.currentPhase === 'DISCOVERY' && analysis.questionCount < 2 && context.callDuration > 60,
      prompt: {
        type: 'VISUAL',
        priority: 'HIGH',
        message: 'Ask more discovery questions to understand their needs',
        action: 'Use open-ended questions like "What challenges are you facing?"',
        timing: 'IMMEDIATE',
        duration: 12
      }
    });

    this.coachingRules.set('discovery_too_much_talking', {
      trigger: (context: CoachingContext, analysis: any) => 
        context.currentPhase === 'DISCOVERY' && analysis.agentTalkRatio > 0.7,
      prompt: {
        type: 'ALERT',
        priority: 'CRITICAL',
        message: 'STOP - You\'re talking too much! Let the customer speak',
        action: 'Ask a question and listen actively',
        timing: 'IMMEDIATE',
        duration: 10
      }
    });

    // Presentation Phase Coaching
    this.coachingRules.set('presentation_feature_dumping', {
      trigger: (context: CoachingContext, analysis: any) => 
        context.currentPhase === 'PRESENTATION' && analysis.featureCount > 5 && analysis.benefitCount < 2,
      prompt: {
        type: 'VISUAL',
        priority: 'HIGH',
        message: 'Focus on benefits, not features - connect to their specific needs',
        action: 'Explain "What this means for you is..."',
        timing: 'PAUSE',
        duration: 15
      }
    });

    // Objection Handling Coaching
    this.coachingRules.set('objection_detected', {
      trigger: (context: CoachingContext, analysis: any) => 
        analysis.objections && analysis.objections.length > 0,
      prompt: {
        type: 'WHISPER',
        priority: 'HIGH',
        message: 'Objection detected - Acknowledge, clarify, respond',
        action: 'Use the 3-step objection handling process',
        timing: 'IMMEDIATE',
        duration: 12
      }
    });

    this.coachingRules.set('negative_sentiment_spike', {
      trigger: (context: CoachingContext, analysis: any) => 
        analysis.sentimentScore < -0.5 && context.customerSentiment > -0.2,
      prompt: {
        type: 'ALERT',
        priority: 'CRITICAL',
        message: 'Customer sentiment dropped significantly!',
        action: 'Acknowledge their concern and show empathy',
        timing: 'IMMEDIATE',
        duration: 10
      }
    });

    // Closing Phase Coaching
    this.coachingRules.set('closing_opportunity', {
      trigger: (context: CoachingContext, analysis: any) => 
        context.leadScore > 75 && analysis.buyingSignals && analysis.buyingSignals.length > 0,
      prompt: {
        type: 'WHISPER',
        priority: 'HIGH',
        message: 'Strong buying signals detected - attempt to close!',
        action: 'Ask for the sale or next step',
        timing: 'IMMEDIATE',
        duration: 15
      }
    });

    this.coachingRules.set('long_call_no_progress', {
      trigger: (context: CoachingContext, analysis: any) => 
        context.callDuration > 600 && context.leadScore < 40,
      prompt: {
        type: 'VISUAL',
        priority: 'MEDIUM',
        message: 'Long call with low engagement - consider qualifying out',
        action: 'Politely determine if this is a good fit',
        timing: 'PAUSE',
        duration: 12
      }
    });

    // General Coaching Rules
    this.coachingRules.set('interruption_warning', {
      trigger: (context: CoachingContext, analysis: any) => 
        analysis.interruptionCount > 3,
      prompt: {
        type: 'VISUAL',
        priority: 'MEDIUM',
        message: 'You\'re interrupting frequently - practice active listening',
        action: 'Let customer finish their thoughts completely',
        timing: 'IMMEDIATE',
        duration: 8
      }
    });

    this.coachingRules.set('energy_level_low', {
      trigger: (context: CoachingContext, analysis: any) => 
        analysis.speechPace === 'VERY_SLOW' && analysis.energyLevel < 0.3,
      prompt: {
        type: 'VISUAL',
        priority: 'LOW',
        message: 'Increase your energy and enthusiasm',
        action: 'Smile and speak with more passion',
        timing: 'PAUSE',
        duration: 6
      }
    });

    console.log(`✅ Loaded ${this.coachingRules.size} coaching rules`);
  }

  /**
   * Start the coaching engine
   */
  private startCoachingEngine() {
    console.log('🚀 Live coaching engine started');
    
    // Monitor coaching sessions every 3 seconds
    setInterval(() => {
      this.processCoachingSessions();
    }, 3000);
  }

  /**
   * Start coaching session for a call
   */
  async startCoachingSession(callData: {
    callId: string;
    agentId: string;
    agentLevel?: string;
  }) {
    console.log(`🎓 Starting coaching session for call ${callData.callId}`);

    // Get agent performance level
    const agentLevel = await this.getAgentPerformanceLevel(callData.agentId);

    const context: CoachingContext = {
      callId: callData.callId,
      agentId: callData.agentId,
      currentPhase: 'OPENING',
      callDuration: 0,
      lastPromptTime: new Date(),
      agentPerformanceLevel: agentLevel,
      customerSentiment: 0,
      leadScore: 50
    };

    this.activeCoachingSessions.set(callData.callId, context);
    this.promptHistory.set(callData.callId, []);

    // Send welcome coaching message
    this.sendCoachingPrompt(callData.agentId, {
      type: 'VISUAL',
      priority: 'LOW',
      message: '🎯 Live coaching active - I\'ll help guide you through this call',
      action: 'Start with a warm greeting and rapport building',
      timing: 'IMMEDIATE',
      duration: 5
    });

    return context;
  }

  /**
   * Update coaching context with real-time analysis
   */
  async updateCoachingContext(callId: string, analysis: any) {
    const context = this.activeCoachingSessions.get(callId);
    if (!context) return;

    // Update context
    context.callDuration = Date.now() - new Date(context.lastPromptTime).getTime() + context.callDuration;
    context.customerSentiment = analysis.sentimentScore || 0;
    context.leadScore = analysis.leadScore || context.leadScore;
    context.currentPhase = this.determineCallPhase(context, analysis);

    // Evaluate coaching rules
    await this.evaluateCoachingRules(context, analysis);

    // Update the session
    this.activeCoachingSessions.set(callId, context);
  }

  /**
   * Evaluate all coaching rules for current context
   */
  private async evaluateCoachingRules(context: CoachingContext, analysis: any) {
    const now = new Date();
    const timeSinceLastPrompt = now.getTime() - context.lastPromptTime.getTime();

    // Don't overwhelm agent with too many prompts
    if (timeSinceLastPrompt < 10000) return; // 10 second cooldown

    for (const [ruleName, rule] of this.coachingRules) {
      try {
        if (rule.trigger(context, analysis)) {
          // Check if we've already shown this type of prompt recently
          const recentPrompts = this.getRecentPrompts(context.callId);
          const duplicateRecent = recentPrompts.some(p => 
            p.ruleName === ruleName && (now.getTime() - p.timestamp.getTime()) < 30000
          );

          if (!duplicateRecent) {
            await this.triggerCoachingPrompt(context, rule.prompt, ruleName);
            break; // Only trigger one prompt at a time
          }
        }
      } catch (error) {
        console.error(`Error evaluating coaching rule ${ruleName}:`, error);
      }
    }
  }

  /**
   * Trigger a coaching prompt
   */
  private async triggerCoachingPrompt(context: CoachingContext, prompt: CoachingPrompt, ruleName: string) {
    console.log(`💡 Coaching prompt triggered for ${context.callId}: ${ruleName}`);

    // Customize prompt based on agent level
    const customizedPrompt = this.customizePromptForAgent(prompt, context.agentPerformanceLevel);

    // Send the prompt
    await this.sendCoachingPrompt(context.agentId, customizedPrompt);

    // Log the prompt
    this.logCoachingPrompt(context.callId, ruleName, customizedPrompt);

    // Update last prompt time
    context.lastPromptTime = new Date();
  }

  /**
   * Send coaching prompt to agent
   */
  private async sendCoachingPrompt(agentId: string, prompt: CoachingPrompt) {
    try {
      // Send to agent's socket
      this.io.to(`agent:${agentId}`).emit('coaching:prompt', {
        ...prompt,
        timestamp: new Date(),
        id: `prompt_${Date.now()}`
      });

      // If it's a whisper prompt, also send to supervisor
      if (prompt.type === 'WHISPER') {
        this.io.to(`supervisor:all`).emit('coaching:whisper', {
          agentId,
          prompt,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('Failed to send coaching prompt:', error);
    }
  }

  /**
   * Customize prompt based on agent experience level
   */
  private customizePromptForAgent(prompt: CoachingPrompt, level: string): CoachingPrompt {
    const customized = { ...prompt };

    switch (level) {
      case 'BEGINNER':
        customized.duration += 5; // Show longer for beginners
        customized.action = `[BEGINNER TIP] ${customized.action}`;
        break;

      case 'INTERMEDIATE':
        // Standard prompts
        break;

      case 'ADVANCED':
        customized.duration -= 2; // Show shorter for advanced
        customized.message = customized.message.replace('🎯 ', '💡 ');
        break;

      case 'EXPERT':
        customized.duration -= 3; // Minimal prompts for experts
        customized.priority = customized.priority === 'LOW' ? 'LOW' : 'MEDIUM';
        break;
    }

    return customized;
  }

  /**
   * Determine current call phase based on analysis
   */
  private determineCallPhase(context: CoachingContext, analysis: any): CoachingContext['currentPhase'] {
    // Simple rule-based phase detection
    if (context.callDuration < 30) {
      return 'OPENING';
    }

    if (analysis.questionCount > 2 && context.callDuration < 120) {
      return 'DISCOVERY';
    }

    if (analysis.featureCount > 0 || analysis.benefitCount > 0) {
      return 'PRESENTATION';
    }

    if (analysis.objections && analysis.objections.length > 0) {
      return 'OBJECTION_HANDLING';
    }

    if (analysis.buyingSignals && analysis.buyingSignals.length > 0) {
      return 'CLOSING';
    }

    return context.currentPhase; // Keep current phase
  }

  /**
   * Get agent performance level
   */
  private async getAgentPerformanceLevel(agentId: string): Promise<CoachingContext['agentPerformanceLevel']> {
    try {
      // Query recent performance data
      // For now, return a default level
      return 'INTERMEDIATE';
    } catch (error) {
      console.error('Error getting agent performance level:', error);
      return 'INTERMEDIATE';
    }
  }

  /**
   * Get recent prompts for a call
   */
  private getRecentPrompts(callId: string): any[] {
    const prompts = this.promptHistory.get(callId) || [];
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    return prompts.filter(p => p.timestamp > thirtySecondsAgo);
  }

  /**
   * Log coaching prompt for analytics
   */
  private logCoachingPrompt(callId: string, ruleName: string, prompt: CoachingPrompt) {
    const history = this.promptHistory.get(callId) || [];
    history.push({
      ruleName,
      prompt,
      timestamp: new Date()
    });
    this.promptHistory.set(callId, history);
  }

  /**
   * Process all active coaching sessions
   */
  private async processCoachingSessions() {
    for (const [callId, context] of this.activeCoachingSessions) {
      try {
        // Check for stale sessions
        const sessionAge = Date.now() - context.lastPromptTime.getTime();
        if (sessionAge > 3600000) { // 1 hour
          console.log(`🕐 Cleaning up stale coaching session for call ${callId}`);
          await this.endCoachingSession(callId);
          continue;
        }

        // Send periodic updates
        this.io.to(`agent:${context.agentId}`).emit('coaching:status', {
          callId,
          phase: context.currentPhase,
          duration: context.callDuration,
          leadScore: context.leadScore,
          sentiment: context.customerSentiment
        });

      } catch (error) {
        console.error(`Error processing coaching session ${callId}:`, error);
      }
    }
  }

  /**
   * End coaching session
   */
  async endCoachingSession(callId: string, callOutcome?: string) {
    const context = this.activeCoachingSessions.get(callId);
    if (!context) return;

    console.log(`🏁 Ending coaching session for call ${callId}`);

    // Generate session summary
    const summary = await this.generateCoachingSessionSummary(context, callOutcome);

    // Send summary to agent
    this.io.to(`agent:${context.agentId}`).emit('coaching:session:ended', {
      callId,
      summary,
      outcome: callOutcome
    });

    // Clean up
    this.activeCoachingSessions.delete(callId);
    this.promptHistory.delete(callId);

    return summary;
  }

  /**
   * Generate coaching session summary
   */
  private async generateCoachingSessionSummary(context: CoachingContext, outcome?: string) {
    const prompts = this.promptHistory.get(context.callId) || [];
    
    const summary = {
      callDuration: context.callDuration,
      finalPhase: context.currentPhase,
      finalLeadScore: context.leadScore,
      finalSentiment: context.customerSentiment,
      totalPrompts: prompts.length,
      promptsByPriority: {
        critical: prompts.filter(p => p.prompt.priority === 'CRITICAL').length,
        high: prompts.filter(p => p.prompt.priority === 'HIGH').length,
        medium: prompts.filter(p => p.prompt.priority === 'MEDIUM').length,
        low: prompts.filter(p => p.prompt.priority === 'LOW').length
      },
      topCoachingAreas: this.identifyTopCoachingAreas(prompts),
      recommendedTraining: this.generateTrainingRecommendations(prompts, context),
      outcome
    };

    return summary;
  }

  /**
   * Identify top coaching areas from session
   */
  private identifyTopCoachingAreas(prompts: any[]): string[] {
    const ruleFrequency: { [key: string]: number } = {};
    
    prompts.forEach(p => {
      ruleFrequency[p.ruleName] = (ruleFrequency[p.ruleName] || 0) + 1;
    });

    return Object.entries(ruleFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([rule]) => rule.replace(/_/g, ' '));
  }

  /**
   * Generate training recommendations
   */
  private generateTrainingRecommendations(prompts: any[], context: CoachingContext): string[] {
    const recommendations = [];

    if (prompts.some(p => p.ruleName.includes('discovery'))) {
      recommendations.push('Practice discovery questioning techniques');
    }

    if (prompts.some(p => p.ruleName.includes('objection'))) {
      recommendations.push('Review objection handling strategies');
    }

    if (prompts.some(p => p.ruleName.includes('closing'))) {
      recommendations.push('Work on closing techniques and timing');
    }

    if (context.agentPerformanceLevel === 'BEGINNER') {
      recommendations.push('Complete basic sales skills training');
    }

    return recommendations.slice(0, 3);
  }

  /**
   * Manual coaching prompt (supervisor triggered)
   */
  async sendManualCoachingPrompt(agentId: string, supervisorId: string, message: string) {
    const prompt: CoachingPrompt = {
      type: 'WHISPER',
      priority: 'HIGH',
      message: `👥 [Supervisor]: ${message}`,
      action: 'Follow supervisor guidance',
      timing: 'IMMEDIATE',
      duration: 15
    };

    await this.sendCoachingPrompt(agentId, prompt);

    console.log(`👥 Manual coaching prompt sent to agent ${agentId} from supervisor ${supervisorId}`);
  }

  /**
   * Get coaching analytics
   */
  async getCoachingAnalytics(agentId?: string, dateRange?: { start: Date; end: Date }) {
    // This would query historical coaching data
    return {
      totalSessions: 0,
      averagePromptsPerCall: 0,
      topCoachingAreas: [],
      improvementTrends: [],
      agentPerformance: {}
    };
  }
}

export default LiveCoachingSystem;