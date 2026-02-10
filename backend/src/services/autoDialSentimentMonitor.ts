/**
 * Auto-Dial Real-Time Sentiment Monitor - Phase 3
 * Integrates sentiment analysis with auto-dial operations
 * Provides real-time coaching alerts and quality monitoring
 */

import { PrismaClient } from '@prisma/client';
import { sentimentAnalysisService } from './sentimentAnalysisService';
import { autoDialEngine } from './autoDialEngine';

const prisma = new PrismaClient();

// Real-time sentiment monitoring for auto-dial calls
interface SentimentAlert {
  callId: string;
  agentId: string;
  alertType: 'negative_sentiment' | 'customer_frustration' | 'escalation_needed' | 'compliance_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  autoActions?: string[];
}

interface CallSentimentMetrics {
  callId: string;
  agentId: string;
  overallSentiment: 'positive' | 'neutral' | 'negative';
  sentimentTrend: 'improving' | 'stable' | 'deteriorating';
  customerSatisfactionScore: number;
  agentPerformanceScore: number;
  alertCount: number;
  recommendations: string[];
}

class AutoDialSentimentMonitor {
  private activeCallMonitoring = new Map<string, CallSentimentMetrics>();
  private sentimentHistory = new Map<string, Array<{ timestamp: Date; sentiment: number; speaker: 'agent' | 'contact' }>>();
  private alertThresholds = {
    negativeSentimentCount: 3,
    sentimentScoreThreshold: -0.7,
    frustrationKeywords: ['terrible', 'awful', 'horrible', 'angry', 'furious', 'upset'],
    escalationKeywords: ['manager', 'supervisor', 'complaint', 'cancel', 'unsubscribe']
  };

  /**
   * Start monitoring a call for sentiment
   */
  async startCallMonitoring(callId: string, agentId: string, campaignId: string): Promise<void> {
    console.log(`🎯 Starting sentiment monitoring for call ${callId} with agent ${agentId}`);
    
    const metrics: CallSentimentMetrics = {
      callId,
      agentId,
      overallSentiment: 'neutral',
      sentimentTrend: 'stable',
      customerSatisfactionScore: 0.5,
      agentPerformanceScore: 0.5,
      alertCount: 0,
      recommendations: []
    };

    this.activeCallMonitoring.set(callId, metrics);
    this.sentimentHistory.set(callId, []);
  }

  /**
   * Process real-time transcript segment for sentiment analysis
   */
  async processTranscriptSegment(
    callId: string,
    speaker: 'agent' | 'contact',
    text: string,
    timestamp: Date = new Date()
  ): Promise<SentimentAlert[]> {
    const alerts: SentimentAlert[] = [];
    
    try {
      // Analyze sentiment of this text segment
      const sentimentResult = await sentimentAnalysisService.analyzeText({
        text,
        callId,
        agentId: this.activeCallMonitoring.get(callId)?.agentId,
        timestamp: timestamp.toISOString()
      });

      // Update call metrics
      await this.updateCallMetrics(callId, speaker, sentimentResult.score, timestamp);

      // Check for alerts
      const generatedAlerts = await this.checkForAlerts(callId, speaker, text, sentimentResult);
      alerts.push(...generatedAlerts);

      // Store sentiment history
      const history = this.sentimentHistory.get(callId) || [];
      history.push({
        timestamp,
        sentiment: sentimentResult.score,
        speaker
      });
      
      // Keep only last 50 entries
      if (history.length > 50) {
        history.shift();
      }
      
      this.sentimentHistory.set(callId, history);

    } catch (error) {
      console.error(`Error processing sentiment for call ${callId}:`, error);
    }

    return alerts;
  }

  /**
   * Update call metrics based on sentiment analysis
   */
  private async updateCallMetrics(
    callId: string,
    speaker: 'agent' | 'contact',
    sentimentScore: number,
    timestamp: Date
  ): Promise<void> {
    const metrics = this.activeCallMonitoring.get(callId);
    if (!metrics) return;

    // Update overall sentiment
    if (sentimentScore > 0.3) {
      metrics.overallSentiment = 'positive';
    } else if (sentimentScore < -0.3) {
      metrics.overallSentiment = 'negative';
    } else {
      metrics.overallSentiment = 'neutral';
    }

    // Update scores based on speaker
    if (speaker === 'contact') {
      // Customer sentiment affects satisfaction score
      metrics.customerSatisfactionScore = (metrics.customerSatisfactionScore + sentimentScore) / 2;
    } else {
      // Agent sentiment affects performance score
      metrics.agentPerformanceScore = (metrics.agentPerformanceScore + sentimentScore) / 2;
    }

    // Determine trend
    const history = this.sentimentHistory.get(callId) || [];
    if (history.length >= 3) {
      const recentScores = history.slice(-3).map(h => h.sentiment);
      const trend = recentScores[2] - recentScores[0];
      
      if (trend > 0.2) {
        metrics.sentimentTrend = 'improving';
      } else if (trend < -0.2) {
        metrics.sentimentTrend = 'deteriorating';
      } else {
        metrics.sentimentTrend = 'stable';
      }
    }

    this.activeCallMonitoring.set(callId, metrics);
  }

  /**
   * Check for sentiment-based alerts
   */
  private async checkForAlerts(
    callId: string,
    speaker: 'agent' | 'contact',
    text: string,
    sentimentResult: any
  ): Promise<SentimentAlert[]> {
    const alerts: SentimentAlert[] = [];
    const metrics = this.activeCallMonitoring.get(callId);
    if (!metrics) return alerts;

    const textLower = text.toLowerCase();

    // Check for negative sentiment threshold
    if (sentimentResult.score < this.alertThresholds.sentimentScoreThreshold && speaker === 'contact') {
      alerts.push({
        callId,
        agentId: metrics.agentId,
        alertType: 'negative_sentiment',
        severity: 'high',
        message: `Customer expressing strong negative sentiment (${sentimentResult.score.toFixed(2)})`,
        timestamp: new Date(),
        autoActions: ['notify_supervisor', 'coaching_suggestion']
      });
    }

    // Check for frustration keywords
    const frustrationFound = this.alertThresholds.frustrationKeywords.some(keyword => 
      textLower.includes(keyword)
    );
    
    if (frustrationFound && speaker === 'contact') {
      alerts.push({
        callId,
        agentId: metrics.agentId,
        alertType: 'customer_frustration',
        severity: 'medium',
        message: `Customer using frustration language: "${text.substring(0, 100)}"`,
        timestamp: new Date(),
        autoActions: ['coaching_prompt']
      });
    }

    // Check for escalation keywords
    const escalationFound = this.alertThresholds.escalationKeywords.some(keyword => 
      textLower.includes(keyword)
    );
    
    if (escalationFound && speaker === 'contact') {
      alerts.push({
        callId,
        agentId: metrics.agentId,
        alertType: 'escalation_needed',
        severity: 'critical',
        message: `Customer requesting escalation: "${text.substring(0, 100)}"`,
        timestamp: new Date(),
        autoActions: ['supervisor_alert', 'escalation_queue']
      });
    }

    // Update alert count
    if (alerts.length > 0) {
      metrics.alertCount += alerts.length;
      this.activeCallMonitoring.set(callId, metrics);
    }

    return alerts;
  }

  /**
   * Get real-time coaching suggestions for agent
   */
  async getCoachingSuggestions(callId: string): Promise<string[]> {
    const metrics = this.activeCallMonitoring.get(callId);
    if (!metrics) return [];

    const suggestions: string[] = [];

    // Sentiment-based suggestions
    if (metrics.overallSentiment === 'negative') {
      suggestions.push('Use empathetic language to acknowledge customer concerns');
      suggestions.push('Lower your speaking pace and tone to create calm atmosphere');
    }

    if (metrics.sentimentTrend === 'deteriorating') {
      suggestions.push('Consider offering solutions or alternatives');
      suggestions.push('Acknowledge the customer\'s frustration explicitly');
    }

    if (metrics.customerSatisfactionScore < 0.3) {
      suggestions.push('Ask open-ended questions to understand concerns better');
      suggestions.push('Summarize what you\'ve heard to show active listening');
    }

    if (metrics.agentPerformanceScore < 0.4) {
      suggestions.push('Maintain positive language and tone');
      suggestions.push('Focus on solution-oriented responses');
    }

    return suggestions;
  }

  /**
   * End call monitoring and generate final report
   */
  async endCallMonitoring(callId: string): Promise<CallSentimentMetrics | null> {
    const metrics = this.activeCallMonitoring.get(callId);
    if (!metrics) return null;

    console.log(`📊 Ending sentiment monitoring for call ${callId}`);

    // Generate final recommendations
    if (metrics.overallSentiment === 'positive') {
      metrics.recommendations.push('Excellent customer interaction - use as coaching example');
    }

    if (metrics.alertCount > 3) {
      metrics.recommendations.push('Consider additional coaching on difficult customer scenarios');
    }

    if (metrics.sentimentTrend === 'improving') {
      metrics.recommendations.push('Good recovery skills demonstrated');
    }

    // Store final metrics in database
    try {
      await prisma.sentimentAnalysis.create({
        data: {
          callId,
          agentId: metrics.agentId,
          overallSentiment: metrics.overallSentiment,
          customerSentimentScore: metrics.customerSatisfactionScore,
          agentToneScore: metrics.agentPerformanceScore,
          alertsGenerated: metrics.alertCount,
          callQualityScore: (metrics.customerSatisfactionScore + metrics.agentPerformanceScore) / 2,
          sentimentTrend: metrics.sentimentTrend,
          recommendations: JSON.stringify(metrics.recommendations),
          analysisTimestamp: new Date()
        }
      });
    } catch (error) {
      console.error(`Error storing sentiment analysis for call ${callId}:`, error);
    }

    // Clean up monitoring data
    this.activeCallMonitoring.delete(callId);
    this.sentimentHistory.delete(callId);

    return metrics;
  }

  /**
   * Get current monitoring status for all active calls
   */
  getActiveMonitoringStatus(): Map<string, CallSentimentMetrics> {
    return new Map(this.activeCallMonitoring);
  }

  /**
   * Get agent performance summary across all monitored calls
   */
  getAgentPerformanceSummary(agentId: string): {
    totalCalls: number;
    averageSentiment: number;
    alertCount: number;
    improvementAreas: string[];
    strengths: string[];
  } {
    const agentCalls = Array.from(this.activeCallMonitoring.values()).filter(m => m.agentId === agentId);
    
    if (agentCalls.length === 0) {
      return {
        totalCalls: 0,
        averageSentiment: 0,
        alertCount: 0,
        improvementAreas: [],
        strengths: []
      };
    }

    const totalAlerts = agentCalls.reduce((sum, call) => sum + call.alertCount, 0);
    const avgSentiment = agentCalls.reduce((sum, call) => sum + call.agentPerformanceScore, 0) / agentCalls.length;

    const improvementAreas: string[] = [];
    const strengths: string[] = [];

    if (avgSentiment < 0.4) {
      improvementAreas.push('Tone and language optimization');
    }

    if (totalAlerts > agentCalls.length) {
      improvementAreas.push('Difficult customer handling');
    }

    if (avgSentiment > 0.7) {
      strengths.push('Excellent communication skills');
    }

    const positiveCallsRatio = agentCalls.filter(c => c.overallSentiment === 'positive').length / agentCalls.length;
    if (positiveCallsRatio > 0.6) {
      strengths.push('High customer satisfaction rate');
    }

    return {
      totalCalls: agentCalls.length,
      averageSentiment: avgSentiment,
      alertCount: totalAlerts,
      improvementAreas,
      strengths
    };
  }
}

export const autoDialSentimentMonitor = new AutoDialSentimentMonitor();
export default autoDialSentimentMonitor;