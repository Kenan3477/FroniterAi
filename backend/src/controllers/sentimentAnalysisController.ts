/**
 * Sentiment Analysis Controller
 * RESTful API endpoints for real-time sentiment analysis features
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import SentimentAnalysisService from '../services/sentimentAnalysisService';
import { authenticate } from '../middleware/auth';

// Input validation schemas
const AnalyzeTextSchema = z.object({
  text: z.string().min(1).max(5000),
  callId: z.string().optional(),
  agentId: z.string().optional(),
  contactId: z.string().optional()
});

const AnalyzeCallTranscriptSchema = z.object({
  callId: z.string().min(1),
  transcript: z.array(z.object({
    speaker: z.enum(['agent', 'contact']),
    text: z.string(),
    timestamp: z.number(),
    confidence: z.number().min(0).max(1).optional()
  })),
  realTime: z.boolean().optional().default(true)
});

const GetAnalyticsSchema = z.object({
  organizationId: z.string().optional(),
  agentId: z.string().optional(),
  campaignId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(1000).optional().default(100)
});

export class SentimentAnalysisController {
  
  /**
   * Analyze text for sentiment and emotions
   * POST /api/sentiment/analyze-text
   */
  static async analyzeText(req: Request, res: Response) {
    try {
      const validatedData = AnalyzeTextSchema.parse(req.body);
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'Organization ID required'
        });
      }

      const result = await SentimentAnalysisService.analyzeText({
        ...validatedData,
        organizationId
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error analyzing text:', error);
      res.status(500).json({
        success: false,
        error: error instanceof z.ZodError ? 'Invalid input data' : 'Failed to analyze text'
      });
    }
  }

  /**
   * Analyze full call transcript 
   * POST /api/sentiment/analyze-call
   */
  static async analyzeCallTranscript(req: Request, res: Response) {
    try {
      const validatedData = AnalyzeCallTranscriptSchema.parse(req.body);
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'Organization ID required'
        });
      }

      const result = await SentimentAnalysisService.analyzeCallTranscript({
        ...validatedData,
        organizationId
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error analyzing call transcript:', error);
      res.status(500).json({
        success: false,
        error: error instanceof z.ZodError ? 'Invalid input data' : 'Failed to analyze call transcript'
      });
    }
  }

  /**
   * Get real-time sentiment for active call
   * GET /api/sentiment/real-time/:callId
   */
  static async getRealTimeSentiment(req: Request, res: Response) {
    try {
      const { callId } = req.params;
      const organizationId = req.user?.organizationId;

      if (!callId || !organizationId) {
        return res.status(400).json({
          success: false,
          error: 'Call ID and organization ID required'
        });
      }

      const sentiment = await SentimentAnalysisService.getRealTimeSentiment(callId, organizationId);

      res.json({
        success: true,
        data: sentiment
      });

    } catch (error) {
      console.error('Error getting real-time sentiment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get real-time sentiment'
      });
    }
  }

  /**
   * Get sentiment analytics and trends
   * GET /api/sentiment/analytics
   */
  static async getSentimentAnalytics(req: Request, res: Response) {
    try {
      const validatedQuery = GetAnalyticsSchema.parse(req.query);
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'Organization ID required'
        });
      }

      const analytics = await SentimentAnalysisService.getSentimentAnalytics({
        ...validatedQuery,
        organizationId
      });

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Error getting sentiment analytics:', error);
      res.status(500).json({
        success: false,
        error: error instanceof z.ZodError ? 'Invalid query parameters' : 'Failed to get analytics'
      });
    }
  }

  /**
   * Get coaching suggestions for agent
   * GET /api/sentiment/coaching/:agentId
   */
  static async getCoachingSuggestions(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const organizationId = req.user?.organizationId;

      if (!agentId || !organizationId) {
        return res.status(400).json({
          success: false,
          error: 'Agent ID and organization ID required'
        });
      }

      const suggestions = await SentimentAnalysisService.getCoachingSuggestions(agentId, organizationId);

      res.json({
        success: true,
        data: suggestions
      });

    } catch (error) {
      console.error('Error getting coaching suggestions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get coaching suggestions'
      });
    }
  }

  /**
   * Update sentiment analysis configuration
   * PUT /api/sentiment/config
   */
  static async updateConfiguration(req: Request, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      const role = req.user?.role;

      if (!organizationId || role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const config = await SentimentAnalysisService.updateConfiguration(organizationId, req.body);

      res.json({
        success: true,
        data: config
      });

    } catch (error) {
      console.error('Error updating configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration'
      });
    }
  }

  /**
   * Get sentiment analysis history for call
   * GET /api/sentiment/history/:callId
   */
  static async getSentimentHistory(req: Request, res: Response) {
    try {
      const { callId } = req.params;
      const organizationId = req.user?.organizationId;

      if (!callId || !organizationId) {
        return res.status(400).json({
          success: false,
          error: 'Call ID and organization ID required'
        });
      }

      const history = await SentimentAnalysisService.getSentimentHistory(callId, organizationId);

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      console.error('Error getting sentiment history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sentiment history'
      });
    }
  }

  /**
   * Export sentiment data for reporting
   * GET /api/sentiment/export
   */
  static async exportSentimentData(req: Request, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      const role = req.user?.role;

      if (!organizationId || !['admin', 'supervisor'].includes(role)) {
        return res.status(403).json({
          success: false,
          error: 'Supervisor or admin access required'
        });
      }

      const exportData = await SentimentAnalysisService.exportSentimentData(
        organizationId, 
        req.query as any
      );

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=sentiment-data.json');
      res.json({
        success: true,
        data: exportData
      });

    } catch (error) {
      console.error('Error exporting sentiment data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export sentiment data'
      });
    }
  }
}

export default SentimentAnalysisController;