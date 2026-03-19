/**
 * Real-time AI Scoring Engine
 * Provides live conversation analysis and scoring during active calls
 */

import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';

const prisma = new PrismaClient();

export interface CallAnalysisData {
  callId: string;
  agentId: string;
  duration: number;
  transcriptSegment: string;
  speakerType: 'AGENT' | 'CUSTOMER';
  timestamp: Date;
}

export interface LiveScoring {
  leadScore: number;
  sentimentScore: number;
  conversionProbability: number;
  nextBestAction: string;
  coachingTips: string[];
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class RealTimeAIScoringEngine {
  private io: Server;
  private activeCallSessions: Map<string, any> = new Map();
  
  constructor(io: Server) {
    this.io = io;
    this.initializeEngine();
  }

  private initializeEngine() {
    console.log('🤖 Real-time AI Scoring Engine initialized');
    
    // Set up periodic scoring updates
    setInterval(() => {
      this.processActiveCallScoring();
    }, 5000); // Update every 5 seconds
  }

  /**
   * Start tracking a call for real-time analysis
   */
  async startCallTracking(callData: {
    callId: string;
    agentId: string;
    campaignId: string;
    contactId: string;
  }) {
    console.log(`🔄 Starting real-time tracking for call ${callData.callId}`);
    
    const callSession = {
      ...callData,
      startTime: new Date(),
      transcriptSegments: [],
      currentScoring: {
        leadScore: 50, // Default starting score
        sentimentScore: 0,
        conversionProbability: 0,
        confidence: 0.5
      },
      analysisHistory: [],
      coachingAlerts: []
    };
    
    this.activeCallSessions.set(callData.callId, callSession);
    
    // Notify connected clients about call start
    this.io.to(`agent:${callData.agentId}`).emit('call:tracking:started', {
      callId: callData.callId,
      initialScoring: callSession.currentScoring
    });
    
    // Initialize conversation analysis record
    await this.initializeConversationAnalysis(callData);
    
    return callSession;
  }

  /**
   * Process incoming transcript data and update real-time scoring
   */
  async processTranscriptSegment(data: CallAnalysisData): Promise<LiveScoring> {
    const callSession = this.activeCallSessions.get(data.callId);
    
    if (!callSession) {
      throw new Error(`No active session found for call ${data.callId}`);
    }
    
    // Add transcript segment
    callSession.transcriptSegments.push({
      text: data.transcriptSegment,
      speaker: data.speakerType,
      timestamp: data.timestamp,
      duration: data.duration
    });
    
    // Analyze the new segment
    const segmentAnalysis = await this.analyzeTranscriptSegment(data);
    
    // Update cumulative scoring
    const updatedScoring = await this.updateCallScoring(callSession, segmentAnalysis);
    
    // Generate coaching insights
    const coachingInsights = await this.generateCoachingInsights(callSession, segmentAnalysis);
    
    // Check for alerts and interventions
    const alerts = await this.checkForAlerts(callSession, updatedScoring);
    
    // Broadcast updates to connected clients
    this.io.to(`agent:${data.agentId}`).emit('call:scoring:update', {
      callId: data.callId,
      scoring: updatedScoring,
      coaching: coachingInsights,
      alerts,
      timestamp: new Date()
    });
    
    // Update session data
    callSession.currentScoring = updatedScoring;
    callSession.analysisHistory.push(segmentAnalysis);
    
    return {
      leadScore: updatedScoring.leadScore,
      sentimentScore: updatedScoring.sentimentScore,
      conversionProbability: updatedScoring.conversionProbability,
      nextBestAction: coachingInsights.nextBestAction,
      coachingTips: coachingInsights.tips,
      urgencyLevel: alerts.length > 0 ? 'HIGH' : 'LOW'
    };
  }

  /**
   * Analyze individual transcript segment using AI models
   */
  private async analyzeTranscriptSegment(data: CallAnalysisData) {
    const text = data.transcriptSegment.toLowerCase();
    
    // Sentiment Analysis
    const sentimentScore = this.analyzeSentiment(text);
    
    // Intent Detection
    const intent = this.detectIntent(text, data.speakerType);
    
    // Objection Detection
    const objections = this.detectObjections(text);
    
    // Buying Signals
    const buyingSignals = this.detectBuyingSignals(text);
    
    // Speech Pace Analysis
    const speechPace = this.analyzeSpeechPace(data.transcriptSegment, data.duration);
    
    // Keyword Analysis
    const keywords = this.extractKeywords(text);
    
    return {
      timestamp: data.timestamp,
      speaker: data.speakerType,
      sentimentScore,
      intent,
      objections,
      buyingSignals,
      speechPace,
      keywords,
      textLength: text.length,
      confidence: this.calculateConfidence(text.length, data.duration)
    };
  }

  /**
   * Update cumulative call scoring based on new analysis
   */
  private async updateCallScoring(callSession: any, segmentAnalysis: any) {
    const segments = callSession.transcriptSegments;
    const history = callSession.analysisHistory;
    
    // Calculate weighted averages
    const totalSegments = history.length + 1;
    const prevScoring = callSession.currentScoring;
    
    // Lead Scoring Algorithm
    let leadScore = prevScoring.leadScore;
    
    // Positive indicators
    if (segmentAnalysis.buyingSignals.length > 0) {
      leadScore += 10 * segmentAnalysis.buyingSignals.length;
    }
    
    if (segmentAnalysis.intent === 'INTERESTED') {
      leadScore += 5;
    }
    
    // Negative indicators
    if (segmentAnalysis.objections.length > 0) {
      leadScore -= 3 * segmentAnalysis.objections.length;
    }
    
    if (segmentAnalysis.intent === 'REJECTION') {
      leadScore -= 15;
    }
    
    // Sentiment impact on lead score
    leadScore += segmentAnalysis.sentimentScore * 5;
    
    // Normalize lead score (0-100)
    leadScore = Math.max(0, Math.min(100, leadScore));
    
    // Sentiment Scoring (running average)
    const sentimentScore = (prevScoring.sentimentScore * (totalSegments - 1) + segmentAnalysis.sentimentScore) / totalSegments;
    
    // Conversion Probability (ML-based calculation)
    const conversionProbability = this.calculateConversionProbability(
      leadScore,
      sentimentScore,
      segments.length,
      callSession.startTime
    );
    
    return {
      leadScore: Math.round(leadScore),
      sentimentScore: Math.round(sentimentScore * 100) / 100,
      conversionProbability: Math.round(conversionProbability * 100) / 100,
      confidence: segmentAnalysis.confidence,
      lastUpdate: new Date()
    };
  }

  /**
   * Generate real-time coaching insights
   */
  private async generateCoachingInsights(callSession: any, segmentAnalysis: any) {
    const tips = [];
    const segments = callSession.transcriptSegments;
    const agentSegments = segments.filter(s => s.speaker === 'AGENT');
    const customerSegments = segments.filter(s => s.speaker === 'CUSTOMER');
    
    // Talk ratio analysis
    const agentTalkTime = agentSegments.reduce((sum, s) => sum + s.text.length, 0);
    const customerTalkTime = customerSegments.reduce((sum, s) => sum + s.text.length, 0);
    const talkRatio = agentTalkTime / (agentTalkTime + customerTalkTime || 1);
    
    if (talkRatio > 0.7) {
      tips.push("🎯 Try asking open-ended questions to encourage customer participation");
    }
    
    if (talkRatio < 0.3) {
      tips.push("💬 Consider taking more control of the conversation");
    }
    
    // Recent sentiment analysis
    if (segmentAnalysis.sentimentScore < -0.5) {
      tips.push("😔 Customer sentiment is negative - acknowledge their concerns");
    }
    
    // Objection handling
    if (segmentAnalysis.objections.length > 0) {
      tips.push(`🛡️ Objection detected: "${segmentAnalysis.objections[0]}" - Use empathy and provide solutions`);
    }
    
    // Buying signals
    if (segmentAnalysis.buyingSignals.length > 0) {
      tips.push("🎉 Buying signals detected! Move towards closing");
    }
    
    // Speech pace
    if (segmentAnalysis.speechPace === 'VERY_FAST') {
      tips.push("🐌 Consider slowing down your speech pace");
    }
    
    if (segmentAnalysis.speechPace === 'VERY_SLOW') {
      tips.push("⚡ Consider increasing your energy and pace");
    }
    
    // Next best action
    let nextBestAction = "Continue building rapport";
    
    if (callSession.currentScoring.leadScore > 80) {
      nextBestAction = "Move towards closing - strong lead indicators";
    } else if (callSession.currentScoring.leadScore > 60) {
      nextBestAction = "Present value proposition and benefits";
    } else if (callSession.currentScoring.sentimentScore < -0.3) {
      nextBestAction = "Address concerns and rebuild rapport";
    } else if (segmentAnalysis.objections.length > 0) {
      nextBestAction = "Handle objections with empathy and solutions";
    }
    
    return {
      tips,
      nextBestAction,
      priority: tips.length > 2 ? 'HIGH' : 'MEDIUM',
      timestamp: new Date()
    };
  }

  /**
   * Check for alerts that require immediate attention
   */
  private async checkForAlerts(callSession: any, scoring: any) {
    const alerts = [];
    
    // Low conversion probability alert
    if (scoring.conversionProbability < 0.1 && callSession.transcriptSegments.length > 5) {
      alerts.push({
        type: 'LOW_CONVERSION_RISK',
        severity: 'HIGH',
        message: 'Low conversion probability - consider different approach',
        action: 'Review objections and adjust strategy'
      });
    }
    
    // Negative sentiment alert
    if (scoring.sentimentScore < -0.6) {
      alerts.push({
        type: 'NEGATIVE_SENTIMENT',
        severity: 'CRITICAL',
        message: 'Customer sentiment is very negative',
        action: 'Focus on empathy and problem resolution'
      });
    }
    
    // Long call without progress
    const callDuration = Date.now() - callSession.startTime.getTime();
    if (callDuration > 600000 && scoring.leadScore < 30) { // 10 minutes
      alerts.push({
        type: 'LONG_UNPRODUCTIVE_CALL',
        severity: 'MEDIUM',
        message: 'Long call with low lead score',
        action: 'Consider qualifying or politely ending'
      });
    }
    
    return alerts;
  }

  /**
   * End call tracking and finalize analysis
   */
  async endCallTracking(callId: string, outcome: string) {
    const callSession = this.activeCallSessions.get(callId);
    
    if (!callSession) {
      return null;
    }
    
    // Calculate final metrics
    const finalAnalysis = await this.generateFinalAnalysis(callSession, outcome);
    
    // Save to database
    await this.saveConversationAnalysis(callSession, finalAnalysis);
    
    // Notify clients
    this.io.to(`agent:${callSession.agentId}`).emit('call:tracking:ended', {
      callId,
      finalAnalysis,
      outcome
    });
    
    // Clean up session
    this.activeCallSessions.delete(callId);
    
    console.log(`✅ Completed real-time analysis for call ${callId}`);
    
    return finalAnalysis;
  }

  /**
   * Process all active calls for periodic updates
   */
  private async processActiveCallScoring() {
    for (const [callId, session] of this.activeCallSessions) {
      try {
        // Check for stale sessions (calls that should have ended)
        const sessionAge = Date.now() - session.startTime.getTime();
        if (sessionAge > 3600000) { // 1 hour
          console.log(`🕐 Cleaning up stale session for call ${callId}`);
          await this.endCallTracking(callId, 'TIMEOUT');
          continue;
        }
        
        // Send periodic updates if needed
        this.io.to(`agent:${session.agentId}`).emit('call:status:ping', {
          callId,
          sessionAge: Math.round(sessionAge / 1000),
          lastUpdate: session.currentScoring.lastUpdate
        });
        
      } catch (error) {
        console.error(`Error processing call ${callId}:`, error);
      }
    }
  }

  // ==========================================
  // AI ANALYSIS METHODS
  // ==========================================

  private analyzeSentiment(text: string): number {
    // Simple rule-based sentiment analysis (replace with ML model)
    const positiveWords = ['great', 'excellent', 'good', 'perfect', 'yes', 'interested', 'love', 'like'];
    const negativeWords = ['no', 'not', 'bad', 'terrible', 'hate', 'dislike', 'never', 'problem'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });
    
    return Math.max(-1, Math.min(1, score / words.length));
  }

  private detectIntent(text: string, speaker: string): string {
    if (speaker === 'CUSTOMER') {
      if (text.includes('yes') || text.includes('interested') || text.includes('tell me more')) {
        return 'INTERESTED';
      }
      if (text.includes('no') || text.includes('not interested') || text.includes('remove')) {
        return 'REJECTION';
      }
      if (text.includes('maybe') || text.includes('think about') || text.includes('later')) {
        return 'CONSIDERATION';
      }
    }
    
    return 'NEUTRAL';
  }

  private detectObjections(text: string): string[] {
    const objectionPatterns = [
      'too expensive',
      'no budget',
      'not the right time',
      'need to think',
      'already have',
      'not interested',
      'call back later',
      'send email'
    ];
    
    return objectionPatterns.filter(pattern => text.toLowerCase().includes(pattern));
  }

  private detectBuyingSignals(text: string): string[] {
    const buyingSignals = [
      'how much',
      'when can',
      'how soon',
      'sign up',
      'get started',
      'sounds good',
      'let\'s do it',
      'what\'s next'
    ];
    
    return buyingSignals.filter(signal => text.toLowerCase().includes(signal));
  }

  private analyzeSpeechPace(text: string, duration: number): string {
    const wordsPerMinute = (text.split(' ').length / duration) * 60;
    
    if (wordsPerMinute < 100) return 'VERY_SLOW';
    if (wordsPerMinute < 140) return 'SLOW';
    if (wordsPerMinute < 180) return 'NORMAL';
    if (wordsPerMinute < 220) return 'FAST';
    return 'VERY_FAST';
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction (replace with NLP)
    const importantWords = text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !['that', 'this', 'with', 'from'].includes(word))
      .slice(0, 5);
    
    return importantWords;
  }

  private calculateConfidence(textLength: number, duration: number): number {
    // Confidence based on text quality and duration
    const lengthScore = Math.min(1, textLength / 100);
    const durationScore = Math.min(1, duration / 10);
    return (lengthScore + durationScore) / 2;
  }

  private calculateConversionProbability(
    leadScore: number,
    sentimentScore: number,
    segmentCount: number,
    startTime: Date
  ): number {
    // ML-like algorithm for conversion probability
    let probability = 0;
    
    // Lead score impact (0-1)
    probability += (leadScore / 100) * 0.6;
    
    // Sentiment impact (0-0.3)
    probability += Math.max(0, (sentimentScore + 1) / 2) * 0.3;
    
    // Call length impact (longer calls with high scores = higher probability)
    const callLength = Date.now() - startTime.getTime();
    const lengthFactor = Math.min(1, callLength / 600000); // 10 minutes
    if (leadScore > 60) {
      probability += lengthFactor * 0.1;
    }
    
    return Math.max(0, Math.min(1, probability));
  }

  private async initializeConversationAnalysis(callData: any) {
    try {
      await prisma.conversationAnalysis.create({
        data: {
          analysisId: `analysis_${callData.callId}_${Date.now()}`,
          callId: callData.callId,
          sentimentScore: 0,
          talkTime: 0,
          listenTime: 0,
          interruptionCount: 0,
          speechPace: 'NORMAL',
          keyTopics: [],
          objectionTypes: [],
          leadScore: 50,
          conversionProb: 0,
          nextBestAction: 'Build rapport and qualify needs',
          coachingNotes: 'Real-time analysis in progress'
        }
      });
    } catch (error) {
      console.error('Failed to initialize conversation analysis:', error);
    }
  }

  private async generateFinalAnalysis(callSession: any, outcome: string) {
    const segments = callSession.transcriptSegments;
    const agentSegments = segments.filter(s => s.speaker === 'AGENT');
    const customerSegments = segments.filter(s => s.speaker === 'CUSTOMER');
    
    return {
      totalDuration: Date.now() - callSession.startTime.getTime(),
      finalLeadScore: callSession.currentScoring.leadScore,
      finalSentimentScore: callSession.currentScoring.sentimentScore,
      conversionProbability: callSession.currentScoring.conversionProbability,
      talkTime: agentSegments.reduce((sum, s) => sum + s.text.length, 0),
      listenTime: customerSegments.reduce((sum, s) => sum + s.text.length, 0),
      segmentCount: segments.length,
      outcome,
      keyInsights: this.generateKeyInsights(callSession),
      recommendations: this.generateFinalRecommendations(callSession, outcome)
    };
  }

  private generateKeyInsights(callSession: any): string[] {
    const insights = [];
    const scoring = callSession.currentScoring;
    
    if (scoring.leadScore > 80) {
      insights.push('High-quality lead with strong buying indicators');
    }
    
    if (scoring.sentimentScore > 0.5) {
      insights.push('Positive customer sentiment maintained throughout call');
    }
    
    if (scoring.conversionProbability > 0.7) {
      insights.push('High conversion probability - excellent sales opportunity');
    }
    
    return insights;
  }

  private generateFinalRecommendations(callSession: any, outcome: string): string[] {
    const recommendations = [];
    const scoring = callSession.currentScoring;
    
    if (outcome === 'NO_SALE' && scoring.leadScore > 60) {
      recommendations.push('Follow up within 24 hours - good lead quality');
    }
    
    if (scoring.sentimentScore < 0) {
      recommendations.push('Address customer concerns in follow-up communications');
    }
    
    return recommendations;
  }

  private async saveConversationAnalysis(callSession: any, finalAnalysis: any) {
    try {
      await prisma.conversationAnalysis.updateMany({
        where: { callId: callSession.callId },
        data: {
          sentimentScore: finalAnalysis.finalSentimentScore,
          talkTime: finalAnalysis.talkTime,
          listenTime: finalAnalysis.listenTime,
          leadScore: finalAnalysis.finalLeadScore,
          conversionProb: finalAnalysis.conversionProbability,
          nextBestAction: finalAnalysis.recommendations.join('; '),
          coachingNotes: finalAnalysis.keyInsights.join('; ')
        }
      });
    } catch (error) {
      console.error('Failed to save conversation analysis:', error);
    }
  }
}

export default RealTimeAIScoringEngine;