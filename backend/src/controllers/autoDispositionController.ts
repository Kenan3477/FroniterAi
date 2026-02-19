/**
 * Auto-Disposition Controller
 * Phase 3: Advanced AI Dialler Implementation
 */

import { Request, Response } from 'express';
import { AutoDispositionService, CallContext, DispositionRecommendation } from '../services/autoDispositionService';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const autoDispositionService = new AutoDispositionService();

export class AutoDispositionController {
  
  /**
   * Generate AI-powered disposition recommendation for a call
   */
  static async generateRecommendation(req: Request, res: Response): Promise<Response> {
    try {
      const { callId } = req.params;
      
      if (!callId) {
        return res.status(400).json({
          success: false,
          error: 'Call ID is required'
        });
      }
      
      // Get call record and context
      const callRecord = await prisma.callRecord.findUnique({
        where: { callId },
        include: {
          contact: true,
          campaign: true
        }
      });
      
      if (!callRecord) {
        return res.status(404).json({
          success: false,
          error: 'Call record not found'
        });
      }
      
      // Build call context for analysis
      const callContext: CallContext = {
        callId: callRecord.callId,
        agentId: callRecord.agentId || '',
        contactId: callRecord.contactId,
        campaignId: callRecord.campaignId,
        callDuration: callRecord.duration || 0,
        sentimentData: [], // Will be populated from sentiment analysis
        transcript: callRecord.notes || undefined
      };
      
      // Get sentiment data for this call
      // Note: This will be enabled once SentimentAnalysis model is confirmed
      // const sentimentData = await prisma.sentimentAnalysis.findMany({
      //   where: { callId },
      //   orderBy: { timestamp: 'asc' }
      // });
      // callContext.sentimentData = sentimentData;
      
      // Get previous dispositions for contact
      const previousCalls = await prisma.callRecord.findMany({
        where: { contactId: callRecord.contactId },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      
      callContext.previousDispositions = previousCalls
        .filter(call => call.dispositionId)
        .map(call => call.dispositionId!);
      
      // Generate AI recommendation
      const recommendation = await autoDispositionService.generateRecommendation(callContext);
      
      // Store recommendation for tracking
      const recommendationRecord = await prisma.ai_recommendations.create({
        data: {
          id: crypto.randomUUID(),
          callId: callRecord.callId,
          agentId: callRecord.agentId || '',
          type: 'DISPOSITION',
          recommendation: JSON.stringify(recommendation),
          confidence: recommendation.confidence,
          updatedAt: new Date(),
          status: 'PENDING',
          createdAt: new Date()
        }
      });
      
      return res.status(200).json({
        success: true,
        data: {
          recommendationId: recommendationRecord.id,
          ...recommendation
        }
      });
      
    } catch (error) {
      console.error('Auto-disposition generation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate disposition recommendation'
      });
    }
  }
  
  /**
   * Apply disposition recommendation to call
   */
  static async applyRecommendation(req: Request, res: Response): Promise<Response> {
    try {
      const { callId } = req.params;
      const { recommendationId, disposition, notes, agentOverride } = req.body;
      const agentId = req.user?.userId;
      
      if (!callId || !disposition) {
        return res.status(400).json({
          success: false,
          error: 'Call ID and disposition are required'
        });
      }
      
      // Get and validate recommendation
      let confidence = 0.5;
      if (recommendationId) {
        const recommendation = await prisma.ai_recommendations.findUnique({
          where: { id: recommendationId }
        });
        
        if (recommendation) {
          confidence = recommendation.confidence;
          
          // Update recommendation status
          await prisma.ai_recommendations.update({
            where: { id: recommendationId },
            data: {
              status: agentOverride ? 'OVERRIDDEN' : 'ACCEPTED',
              appliedAt: new Date(),
              appliedBy: agentId
            }
          });
        }
      }
      
      // Find or create disposition
      let dispositionRecord = await prisma.disposition.findFirst({
        where: { name: disposition }
      });
      
      if (!dispositionRecord) {
        dispositionRecord = await prisma.disposition.create({
          data: {
            name: disposition,
            description: `Auto-generated disposition: ${disposition}`,
            category: this.getDispositionCategory(disposition),
            isActive: true
          }
        });
      }
      
      // Update call record
      const updatedCall = await prisma.callRecord.update({
        where: { callId },
        data: {
          dispositionId: dispositionRecord.id,
          notes: notes || null
        }
      });
      
      // Create disposition tracking
      await prisma.disposition_tracking.create({
        data: {
          id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
          callId: callId,
          dispositionId: dispositionRecord.id,
          agentId: agentId || '',
          timestamp: new Date(),
          method: agentOverride ? 'AGENT_MANUAL' : 'AI_ASSISTED',
          confidence: confidence,
          notes: notes || null
        }
      });
      
      // Trigger next-best-action if applicable
      if (req.body.nextBestAction) {
        await this.triggerNextBestAction(callId, req.body.nextBestAction, agentId);
      }
      
      return res.status(200).json({
        success: true,
        data: {
          callId: updatedCall.callId,
          disposition: dispositionRecord.name,
          confidence: confidence,
          appliedAt: new Date(),
          method: agentOverride ? 'manual' : 'ai_assisted'
        }
      });
      
    } catch (error) {
      console.error('Apply disposition error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to apply disposition'
      });
    }
  }
  
  /**
   * Get disposition analytics for agent/campaign
   */
  static async getDispositionAnalytics(req: Request, res: Response): Promise<Response> {
    try {
      const { agentId, campaignId, dateFrom, dateTo } = req.query;
      
      const whereClause: any = {};
      
      if (agentId) whereClause.agentId = agentId as string;
      if (campaignId) whereClause.campaignId = campaignId as string;
      
      if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom as string);
        if (dateTo) whereClause.createdAt.lte = new Date(dateTo as string);
      }
      
      // Get disposition distribution
      const dispositionStats = await prisma.callRecord.groupBy({
        by: ['dispositionId'],
        where: whereClause,
        _count: {
          dispositionId: true
        }
      });
      
      // Get AI vs manual disposition breakdown
      const methodStats = await prisma.disposition_tracking.groupBy({
        by: ['method'],
        where: {
          call_records: whereClause
        },
        _count: {
          method: true
        },
        _avg: {
          confidence: true
        }
      });
      
      // Get disposition accuracy (if feedback is available)
      const accuracyStats = await this.calculateDispositionAccuracy(whereClause);
      
      // Get most common next-best-actions
      const nextActionStats = await this.getNextActionAnalytics(whereClause);
      
      return res.status(200).json({
        success: true,
        data: {
          dispositionDistribution: dispositionStats,
          methodBreakdown: methodStats,
          accuracy: accuracyStats,
          nextActions: nextActionStats,
          period: {
            from: dateFrom,
            to: dateTo
          }
        }
      });
      
    } catch (error) {
      console.error('Disposition analytics error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get disposition analytics'
      });
    }
  }
  
  /**
   * Update disposition feedback for accuracy tracking
   */
  static async updateDispositionFeedback(req: Request, res: Response): Promise<Response> {
    try {
      const { callId } = req.params;
      const { correct, actualDisposition, feedback } = req.body;
      const agentId = req.user?.userId;
      
      // Find the AI recommendation for this call
      const recommendation = await prisma.ai_recommendations.findFirst({
        where: { 
          callId,
          type: 'DISPOSITION'
        }
      });
      
      if (!recommendation) {
        return res.status(404).json({
          success: false,
          error: 'AI recommendation not found for this call'
        });
      }
      
      // Create feedback record
      await prisma.ai_feedback.create({
        data: {
          id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
          recommendationId: recommendation.id,
          agentId: agentId || '',
          correct: correct,
          actualOutcome: actualDisposition || null,
          feedback: feedback || null,
          createdAt: new Date()
        }
      });
      
      // Update recommendation with feedback
      await prisma.ai_recommendations.update({
        where: { id: recommendation.id },
        data: {
          feedbackReceived: true,
          feedbackScore: correct ? 1.0 : 0.0
        }
      });
      
      return res.status(200).json({
        success: true,
        message: 'Disposition feedback recorded'
      });
      
    } catch (error) {
      console.error('Disposition feedback error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to record feedback'
      });
    }
  }
  
  /**
   * Get disposition category based on disposition name
   */
  private static getDispositionCategory(disposition: string): string {
    const categoryMap: { [key: string]: string } = {
      'SALE': 'POSITIVE',
      'HOT_LEAD': 'POSITIVE',
      'WARM_LEAD': 'POSITIVE',
      'CALLBACK_REQUESTED': 'FOLLOW_UP',
      'NOT_INTERESTED': 'NEGATIVE',
      'DO_NOT_CALL': 'NEGATIVE',
      'OBJECTION_NOT_OVERCOME': 'NEGATIVE',
      'OBJECTION_OVERCOME': 'NEUTRAL',
      'COMPLIANCE_ISSUE': 'ISSUE',
      'NEEDS_REVIEW': 'ISSUE'
    };
    
    return categoryMap[disposition] || 'NEUTRAL';
  }
  
  /**
   * Trigger next-best-action automation
   */
  private static async triggerNextBestAction(
    callId: string, 
    action: string, 
    agentId: string | undefined
  ): Promise<void> {
    try {
      const actionMap: { [key: string]: any } = {
        'schedule_followup': { type: 'SCHEDULE', data: { hours: 24 } },
        'schedule_demo': { type: 'SCHEDULE', data: { hours: 48, type: 'demo' } },
        'schedule_callback': { type: 'SCHEDULE', data: { hours: 168 } },
        'add_to_nurture_sequence': { type: 'CAMPAIGN', data: { campaignType: 'nurture' } },
        'suppress_contact': { type: 'SUPPRESSION', data: { reason: 'do_not_call' } },
        'schedule_manager_followup': { type: 'ESCALATION', data: { level: 'manager' } }
      };
      
      const actionConfig = actionMap[action];
      if (!actionConfig) return;
      
      await prisma.automation_triggers.create({
        data: {
          id: `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
          callId: callId,
          triggerType: actionConfig.type,
          triggerData: JSON.stringify(actionConfig.data),
          status: 'PENDING',
          scheduledFor: new Date(),
          createdBy: agentId || 'system',
          updatedAt: new Date()
        }
      });
      
    } catch (error) {
      console.error('Next-best-action trigger error:', error);
    }
  }
  
  /**
   * Calculate disposition accuracy based on feedback
   */
  private static async calculateDispositionAccuracy(whereClause: any): Promise<any> {
    try {
      const feedbackData = await prisma.ai_feedback.findMany({
        where: {
          ai_recommendations: {
            type: 'DISPOSITION',
            callRecord: whereClause
          }
        }
      });
      
      if (feedbackData.length === 0) {
        return { accuracy: null, sampleSize: 0 };
      }
      
      const correctCount = feedbackData.filter(f => f.correct).length;
      const accuracy = correctCount / feedbackData.length;
      
      return {
        accuracy: Math.round(accuracy * 100) / 100,
        sampleSize: feedbackData.length,
        correctPredictions: correctCount
      };
      
    } catch (error) {
      console.error('Accuracy calculation error:', error);
      return { accuracy: null, sampleSize: 0 };
    }
  }
  
  /**
   * Get next-action analytics
   */
  private static async getNextActionAnalytics(whereClause: any): Promise<any> {
    try {
      const triggers = await prisma.automation_triggers.findMany({
        where: {
          call_records: whereClause
        }
      });
      
      const actionCounts = triggers.reduce((acc: any, trigger: any) => {
        acc[trigger.triggerType] = (acc[trigger.triggerType] || 0) + 1;
        return acc;
      }, {});
      
      return {
        totalActions: triggers.length,
        actionBreakdown: actionCounts,
        successRate: triggers.filter(t => t.status === 'COMPLETED').length / triggers.length
      };
      
    } catch (error) {
      console.error('Next-action analytics error:', error);
      return { totalActions: 0, actionBreakdown: {}, successRate: 0 };
    }
  }
}

export default AutoDispositionController;