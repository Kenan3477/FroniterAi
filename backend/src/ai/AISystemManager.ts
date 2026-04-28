/**
 * AI System Integration Manager
 * Orchestrates all AI components for the dialler system
 */

import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import RealTimeAIScoringEngine from './RealTimeAIScoringEngine';
import AutomatedDispositionEngine from './AutomatedDispositionEngine';
import LiveCoachingSystem from './LiveCoachingSystem';
import PredictiveCampaignAdjustmentSystem from './PredictiveCampaignAdjustmentSystem';

export interface AISystemStatus {
  scoring: boolean;
  disposition: boolean;
  coaching: boolean;
  prediction: boolean;
  overall: 'ACTIVE' | 'PARTIAL' | 'INACTIVE';
}

export interface CallAIContext {
  callId: string;
  agentId: string;
  campaignId: string;
  contactId: string;
  startTime: Date;
  aiEnabled: boolean;
}

export class AISystemManager {
  private prisma: PrismaClient;
  private io: Server;
  private scoringEngine: RealTimeAIScoringEngine;
  private dispositionEngine: AutomatedDispositionEngine;
  private coachingSystem: LiveCoachingSystem;
  private predictionSystem: PredictiveCampaignAdjustmentSystem;
  
  private activeCalls: Map<string, CallAIContext> = new Map();
  private systemStatus: AISystemStatus = {
    scoring: false,
    disposition: false,
    coaching: false,
    prediction: false,
    overall: 'INACTIVE'
  };

  constructor(prisma: PrismaClient, io: Server) {
    this.prisma = prisma;
    this.io = io;
    this.initializeAISystems();
  }

  /**
   * Initialize all AI systems
   */
  private async initializeAISystems() {
    console.log('🤖 Initializing AI System Manager...');

    try {
      // Initialize Real-Time AI Scoring Engine
      this.scoringEngine = new RealTimeAIScoringEngine(this.prisma, this.io);
      this.systemStatus.scoring = true;
      console.log('✅ Real-Time AI Scoring Engine initialized');

      // Initialize Automated Disposition Engine
      this.dispositionEngine = new AutomatedDispositionEngine(this.prisma);
      this.systemStatus.disposition = true;
      console.log('✅ Automated Disposition Engine initialized');

      // Initialize Live Coaching System
      this.coachingSystem = new LiveCoachingSystem(this.io, this.scoringEngine);
      this.systemStatus.coaching = true;
      console.log('✅ Live Coaching System initialized');

      // Initialize Predictive Campaign Adjustment System
      this.predictionSystem = new PredictiveCampaignAdjustmentSystem(
        this.prisma, 
        this.io, 
        this.scoringEngine
      );
      this.systemStatus.prediction = true;
      console.log('✅ Predictive Campaign Adjustment System initialized');

      // Update overall status
      this.updateOverallStatus();

      // Setup inter-system communication
      this.setupSystemIntegration();

      console.log('🚀 AI System Manager fully operational');

    } catch (error) {
      console.error('❌ Error initializing AI systems:', error);
      this.updateOverallStatus();
    }
  }

  /**
   * Setup integration between AI systems
   */
  private setupSystemIntegration() {
    console.log('🔗 Setting up AI system integration...');

    // 🚨 TEMPORARY DISABLE: RealTimeAIScoringEngine is not an EventEmitter
    // This causes backend crash: "this.scoringEngine.on is not a function"
    // TODO: Either make RealTimeAIScoringEngine extend EventEmitter or use polling instead
    console.log('⚠️  AI system integration disabled - scoringEngine is not EventEmitter');
    return; // Skip event-based integration

    /* DISABLED - RealTimeAIScoringEngine needs to extend EventEmitter
    // When scoring engine updates, trigger coaching and disposition analysis
    this.scoringEngine.on('analysis:updated', async (data: any) => {
    /* DISABLED - RealTimeAIScoringEngine needs to extend EventEmitter
    // When scoring engine updates, trigger coaching and disposition analysis
    this.scoringEngine.on('analysis:updated', async (data: any) => {
      const { callId, analysis } = data;
      
      try {
        // Update coaching context
        if (this.systemStatus.coaching) {
          await this.coachingSystem.updateCoachingContext(callId, analysis);
        }

        // Check if disposition should be suggested
        if (this.systemStatus.disposition && analysis.callPhase === 'ENDING') {
          const context = this.activeCalls.get(callId);
          if (context) {
            const suggestion = await this.dispositionEngine.suggestDisposition({
              callId: context.callId,
              agentId: context.agentId,
              campaignId: context.campaignId,
              contactId: context.contactId,
              duration: Date.now() - context.startTime.getTime(),
              transcript: analysis.fullTranscript || '',
              sentimentScore: analysis.sentimentScore,
              leadScore: analysis.leadScore,
              objections: analysis.objections,
              buyingSignals: analysis.buyingSignals
            });

            // Send disposition suggestion to agent
            this.io.to(`agent:${context.agentId}`).emit('disposition:suggestion', suggestion);
          }
        }

      } catch (error) {
        console.error('Error in system integration:', error);
      }
    });

    console.log('✅ AI system integration complete');
    */
  }

  /**
   * Start AI processing for a call
   */
  async startCallAI(callData: {
    callId: string;
    agentId: string;
    campaignId: string;
    contactId: string;
    aiEnabled?: boolean;
  }): Promise<CallAIContext> {
    console.log(`🎯 Starting AI processing for call ${callData.callId}`);

    const context: CallAIContext = {
      ...callData,
      startTime: new Date(),
      aiEnabled: callData.aiEnabled !== false // Default to true
    };

    this.activeCalls.set(callData.callId, context);

    if (context.aiEnabled) {
      try {
        // Start real-time scoring
        if (this.systemStatus.scoring) {
          await this.scoringEngine.startCallTracking(callData);
        }

        // Start coaching session
        if (this.systemStatus.coaching) {
          await this.coachingSystem.startCoachingSession(callData);
        }

        // Register campaign for prediction (if not already registered)
        if (this.systemStatus.prediction) {
          await this.predictionSystem.registerCampaign(callData.campaignId);
        }

        console.log(`✅ AI systems activated for call ${callData.callId}`);

      } catch (error) {
        console.error(`❌ Error starting AI for call ${callData.callId}:`, error);
      }
    }

    return context;
  }

  /**
   * Process transcript segment
   */
  async processTranscriptSegment(callId: string, segment: {
    speaker: 'AGENT' | 'CUSTOMER';
    text: string;
    timestamp: Date;
    confidence?: number;
  }) {
    const context = this.activeCalls.get(callId);
    if (!context || !context.aiEnabled) return;

    try {
      // Process with scoring engine
      if (this.systemStatus.scoring) {
        await this.scoringEngine.processTranscriptSegment(callId, segment);
      }

    } catch (error) {
      console.error(`Error processing transcript for call ${callId}:`, error);
    }
  }

  /**
   * End AI processing for a call
   */
  async endCallAI(callId: string, outcome?: string): Promise<any> {
    console.log(`🏁 Ending AI processing for call ${callId}`);

    const context = this.activeCalls.get(callId);
    if (!context) {
      console.warn(`No AI context found for call ${callId}`);
      return null;
    }

    const results: any = {
      callId,
      duration: Date.now() - context.startTime.getTime(),
      outcome
    };

    try {
      // End scoring analysis
      if (this.systemStatus.scoring) {
        const scoringResults = await this.scoringEngine.endCallTracking(callId);
        results.scoring = scoringResults;
      }

      // End coaching session
      if (this.systemStatus.coaching) {
        const coachingResults = await this.coachingSystem.endCoachingSession(callId, outcome);
        results.coaching = coachingResults;
      }

      // Get final disposition if not already set
      if (this.systemStatus.disposition && !outcome) {
        const dispositionSuggestion = await this.dispositionEngine.suggestDisposition({
          callId: context.callId,
          agentId: context.agentId,
          campaignId: context.campaignId,
          contactId: context.contactId,
          duration: results.duration,
          transcript: results.scoring?.finalTranscript || '',
          sentimentScore: results.scoring?.finalSentimentScore || 0,
          leadScore: results.scoring?.finalLeadScore || 0,
          objections: results.scoring?.objections || [],
          buyingSignals: results.scoring?.buyingSignals || []
        });
        
        results.suggestedDisposition = dispositionSuggestion;
      }

      console.log(`✅ AI processing completed for call ${callId}`);

    } catch (error) {
      console.error(`❌ Error ending AI for call ${callId}:`, error);
      results.error = error.message;
    } finally {
      // Clean up
      this.activeCalls.delete(callId);
    }

    return results;
  }

  /**
   * Manual coaching prompt
   */
  async sendManualCoachingPrompt(agentId: string, supervisorId: string, message: string) {
    if (!this.systemStatus.coaching) {
      throw new Error('Coaching system not available');
    }

    return await this.coachingSystem.sendManualCoachingPrompt(agentId, supervisorId, message);
  }

  /**
   * Get campaign insights
   */
  async getCampaignInsights(campaignId: string) {
    if (!this.systemStatus.prediction) {
      throw new Error('Prediction system not available');
    }

    return await this.predictionSystem.getCampaignInsights(campaignId);
  }

  /**
   * Get real-time AI analytics
   */
  async getAIAnalytics() {
    const analytics = {
      activeCalls: this.activeCalls.size,
      systemStatus: this.systemStatus,
      callsToday: 0,
      averageAIScore: 0,
      coachingPromptsToday: 0,
      dispositionAccuracy: 0,
      campaignAdjustmentsToday: 0
    };

    try {
      // Get today's statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calls today with AI
      const callsToday = await this.prisma.callRecord.count({
        where: {
          startTime: { gte: today }
        }
      });

      // Average AI scores
      const conversationAnalytics = await this.prisma.conversationAnalysis.findMany({
        where: {
          createdAt: { gte: today }
        },
        select: {
          leadScore: true,
          overallSentiment: true
        }
      });

      if (conversationAnalytics.length > 0) {
        analytics.averageAIScore = conversationAnalytics.reduce((sum, ca) => 
          sum + (ca.leadScore || 0), 0) / conversationAnalytics.length;
      }

      analytics.callsToday = callsToday;

    } catch (error) {
      console.error('Error calculating AI analytics:', error);
    }

    return analytics;
  }

  /**
   * Update system status
   */
  private updateOverallStatus() {
    const activeCount = Object.values(this.systemStatus).filter(status => 
      typeof status === 'boolean' && status
    ).length;

    if (activeCount === 4) {
      this.systemStatus.overall = 'ACTIVE';
    } else if (activeCount > 0) {
      this.systemStatus.overall = 'PARTIAL';
    } else {
      this.systemStatus.overall = 'INACTIVE';
    }

    // Broadcast status update
    this.io.emit('ai:system:status', this.systemStatus);
  }

  /**
   * Health check for all AI systems
   */
  async healthCheck(): Promise<any> {
    const health = {
      timestamp: new Date(),
      overall: 'HEALTHY',
      systems: {
        scoring: { status: 'HEALTHY', details: {} },
        disposition: { status: 'HEALTHY', details: {} },
        coaching: { status: 'HEALTHY', details: {} },
        prediction: { status: 'HEALTHY', details: {} }
      },
      activeCalls: this.activeCalls.size,
      memoryUsage: process.memoryUsage()
    };

    try {
      // Test each system
      if (this.systemStatus.scoring) {
        health.systems.scoring.details = await this.scoringEngine.getStatus();
      }

      // Additional health checks would go here

    } catch (error) {
      health.overall = 'DEGRADED';
      console.error('AI health check failed:', error);
    }

    return health;
  }

  /**
   * Configure AI settings
   */
  async configureAI(settings: {
    enableScoring?: boolean;
    enableDisposition?: boolean;
    enableCoaching?: boolean;
    enablePrediction?: boolean;
    coachingLevel?: 'MINIMAL' | 'NORMAL' | 'AGGRESSIVE';
    dispositionThreshold?: number;
  }) {
    console.log('⚙️ Configuring AI systems:', settings);

    // Update system enables/disables
    if (typeof settings.enableScoring === 'boolean') {
      this.systemStatus.scoring = settings.enableScoring;
    }
    if (typeof settings.enableDisposition === 'boolean') {
      this.systemStatus.disposition = settings.enableDisposition;
    }
    if (typeof settings.enableCoaching === 'boolean') {
      this.systemStatus.coaching = settings.enableCoaching;
    }
    if (typeof settings.enablePrediction === 'boolean') {
      this.systemStatus.prediction = settings.enablePrediction;
    }

    this.updateOverallStatus();

    return this.systemStatus;
  }

  /**
   * Get active calls with AI context
   */
  getActiveCalls(): CallAIContext[] {
    return Array.from(this.activeCalls.values());
  }

  /**
   * Shutdown all AI systems
   */
  async shutdown() {
    console.log('🛑 Shutting down AI System Manager...');

    try {
      // End all active calls
      for (const callId of this.activeCalls.keys()) {
        await this.endCallAI(callId, 'SYSTEM_SHUTDOWN');
      }

      // Shutdown prediction system
      if (this.predictionSystem) {
        this.predictionSystem.shutdown();
      }

      console.log('✅ AI System Manager shutdown complete');

    } catch (error) {
      console.error('❌ Error during AI system shutdown:', error);
    }
  }
}

export default AISystemManager;