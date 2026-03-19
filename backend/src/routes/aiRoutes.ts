/**
 * AI System API Routes
 * REST endpoints for AI system integration
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import AISystemManager from '../ai/AISystemManager';
import { Server } from 'socket.io';

export function createAIRoutes(prisma: PrismaClient, aiManager: AISystemManager) {
  const router = Router();

  /**
   * Start AI processing for a call
   */
  router.post('/calls/:callId/ai/start', async (req, res) => {
    try {
      const { callId } = req.params;
      const { agentId, campaignId, contactId, aiEnabled } = req.body;

      if (!agentId || !campaignId || !contactId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: agentId, campaignId, contactId'
        });
      }

      const context = await aiManager.startCallAI({
        callId,
        agentId,
        campaignId,
        contactId,
        aiEnabled
      });

      res.json({
        success: true,
        data: context,
        message: 'AI processing started for call'
      });

    } catch (error) {
      console.error('Error starting call AI:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  /**
   * Process transcript segment
   */
  router.post('/calls/:callId/ai/transcript', async (req, res) => {
    try {
      const { callId } = req.params;
      const { speaker, text, timestamp, confidence } = req.body;

      if (!speaker || !text) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: speaker, text'
        });
      }

      await aiManager.processTranscriptSegment(callId, {
        speaker: speaker.toUpperCase(),
        text,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        confidence
      });

      res.json({
        success: true,
        message: 'Transcript segment processed'
      });

    } catch (error) {
      console.error('Error processing transcript:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  /**
   * End AI processing for a call
   */
  router.post('/calls/:callId/ai/end', async (req, res) => {
    try {
      const { callId } = req.params;
      const { outcome } = req.body;

      const results = await aiManager.endCallAI(callId, outcome);

      res.json({
        success: true,
        data: results,
        message: 'AI processing ended for call'
      });

    } catch (error) {
      console.error('Error ending call AI:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  /**
   * Send manual coaching prompt
   */
  router.post('/coaching/manual-prompt', async (req, res) => {
    try {
      const { agentId, supervisorId, message } = req.body;

      if (!agentId || !supervisorId || !message) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: agentId, supervisorId, message'
        });
      }

      await aiManager.sendManualCoachingPrompt(agentId, supervisorId, message);

      res.json({
        success: true,
        message: 'Manual coaching prompt sent'
      });

    } catch (error) {
      console.error('Error sending coaching prompt:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  /**
   * Get campaign insights and predictions
   */
  router.get('/campaigns/:campaignId/ai/insights', async (req, res) => {
    try {
      const { campaignId } = req.params;

      const insights = await aiManager.getCampaignInsights(campaignId);

      res.json({
        success: true,
        data: insights,
        message: 'Campaign insights retrieved'
      });

    } catch (error) {
      console.error('Error getting campaign insights:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  /**
   * Get real-time AI analytics
   */
  router.get('/ai/analytics', async (req, res) => {
    try {
      const analytics = await aiManager.getAIAnalytics();

      res.json({
        success: true,
        data: analytics,
        message: 'AI analytics retrieved'
      });

    } catch (error) {
      console.error('Error getting AI analytics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  /**
   * AI system health check
   */
  router.get('/ai/health', async (req, res) => {
    try {
      const health = await aiManager.healthCheck();

      res.json({
        success: true,
        data: health,
        message: 'AI system health check completed'
      });

    } catch (error) {
      console.error('Error in AI health check:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  /**
   * Get AI system status
   */
  router.get('/ai/status', async (req, res) => {
    try {
      const activeCalls = aiManager.getActiveCalls();

      res.json({
        success: true,
        data: {
          activeCalls: activeCalls.length,
          calls: activeCalls
        },
        message: 'AI system status retrieved'
      });

    } catch (error) {
      console.error('Error getting AI status:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  /**
   * Configure AI system settings
   */
  router.post('/ai/configure', async (req, res) => {
    try {
      const settings = req.body;

      const newStatus = await aiManager.configureAI(settings);

      res.json({
        success: true,
        data: newStatus,
        message: 'AI system configured successfully'
      });

    } catch (error) {
      console.error('Error configuring AI system:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  /**
   * Get coaching analytics for agent
   */
  router.get('/agents/:agentId/coaching/analytics', async (req, res) => {
    try {
      const { agentId } = req.params;
      const { startDate, endDate } = req.query;

      // This would query coaching analytics from the database
      const analytics = {
        agentId,
        period: { startDate, endDate },
        totalSessions: 0,
        averagePromptsPerCall: 0,
        topCoachingAreas: [],
        improvementTrends: [],
        performanceScore: 0
      };

      res.json({
        success: true,
        data: analytics,
        message: 'Coaching analytics retrieved'
      });

    } catch (error) {
      console.error('Error getting coaching analytics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  /**
   * Get disposition suggestions for call
   */
  router.get('/calls/:callId/ai/disposition-suggestions', async (req, res) => {
    try {
      const { callId } = req.params;

      // Get call data
      const callRecord = await prisma.callRecord.findUnique({
        where: { id: callId },
        include: {
          contact: true,
          conversationAnalysis: true
        }
      });

      if (!callRecord) {
        return res.status(404).json({
          success: false,
          error: 'Call record not found'
        });
      }

      const analysis = callRecord.conversationAnalysis?.[0];

      // Mock disposition suggestions for now
      const suggestions = [
        {
          disposition: 'QUALIFIED_LEAD',
          confidence: 0.85,
          reasoning: 'Strong buying signals detected, positive sentiment',
          nextAction: 'Schedule follow-up demo',
          priority: 'HIGH'
        },
        {
          disposition: 'CALLBACK',
          confidence: 0.65,
          reasoning: 'Interested but needs time to consider',
          nextAction: 'Call back in 2 days',
          priority: 'MEDIUM'
        }
      ];

      res.json({
        success: true,
        data: {
          callId,
          suggestions,
          analysis: analysis ? {
            leadScore: analysis.leadScore,
            sentiment: analysis.overallSentiment,
            keyInsights: analysis.insights
          } : null
        },
        message: 'Disposition suggestions generated'
      });

    } catch (error) {
      console.error('Error getting disposition suggestions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  return router;
}

export default createAIRoutes;