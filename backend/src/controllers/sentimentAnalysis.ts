/**
 * Sentiment Analysis API Controller
 * Real-time sentiment analysis endpoints for live call monitoring and coaching
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import sentimentAnalysisService from '../services/sentimentAnalysisService';

// Input validation schemas
const analyzeTextSchema = z.object({
  text: z.string().min(1).max(5000),
  callId: z.string().optional(),
  agentId: z.string().optional(),
  contactId: z.string().optional(),
  timestamp: z.string().optional()
});

const analyzeCallTranscriptSchema = z.object({
  callId: z.string().min(1),
  transcript: z.array(z.object({
    speaker: z.enum(['agent', 'contact']),
    text: z.string(),
    timestamp: z.number(),
    confidence: z.number().min(0).max(1).optional()
  })),
  realTime: z.boolean().optional().default(true)
});

/**
 * POST /api/sentiment/analyze-text
 * Analyze sentiment of a single text snippet
 */
export async function analyzeText(req: Request, res: Response) {
  try {
    const data = analyzeTextSchema.parse(req.body);
    
    const result = await sentimentAnalysisService.analyzeText(data);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing text:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to analyze text sentiment'
    });
  }
}

/**
 * POST /api/sentiment/analyze-call
 * Analyze complete call transcript for comprehensive insights
 */
export async function analyzeCall(req: Request, res: Response) {
  try {
    const data = analyzeCallTranscriptSchema.parse(req.body);
    
    const analysis = await sentimentAnalysisService.analyzeCallTranscript(data);
    
    res.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing call:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid call transcript data',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to analyze call transcript'
    });
  }
}

/**
 * GET /api/sentiment/coaching/:callId
 * Get real-time coaching recommendations for active call
 */
export async function getCoachingRecommendations(req: Request, res: Response) {
  try {
    const { callId } = req.params;
    
    if (!callId) {
      return res.status(400).json({
        success: false,
        error: 'Call ID is required'
      });
    }
    
    const recommendations = await sentimentAnalysisService.getCoachingRecommendations(callId);
    
    res.json({
      success: true,
      data: {
        callId,
        recommendations,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting coaching recommendations:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get coaching recommendations'
    });
  }
}

/**
 * GET /api/sentiment/compliance/:callId
 * Monitor call quality and compliance in real-time
 */
export async function getComplianceMonitoring(req: Request, res: Response) {
  try {
    const { callId } = req.params;
    
    if (!callId) {
      return res.status(400).json({
        success: false,
        error: 'Call ID is required'
      });
    }
    
    const complianceFlags = await sentimentAnalysisService.monitorCallCompliance(callId);
    
    res.json({
      success: true,
      data: {
        callId,
        complianceFlags,
        checkedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error monitoring compliance:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to monitor call compliance'
    });
  }
}

/**
 * POST /api/sentiment/live-analysis
 * Real-time analysis endpoint for live calls (WebSocket alternative)
 */
export async function liveAnalysis(req: Request, res: Response) {
  try {
    const data = z.object({
      callId: z.string().min(1),
      text: z.string().min(1),
      speaker: z.enum(['agent', 'contact']),
      timestamp: z.number()
    }).parse(req.body);
    
    // Analyze text sentiment
    const sentimentResult = await sentimentAnalysisService.analyzeText({
      text: data.text,
      callId: data.callId
    });
    
    // Get coaching recommendations
    const recommendations = await sentimentAnalysisService.getCoachingRecommendations(data.callId);
    
    // Check compliance
    const complianceFlags = await sentimentAnalysisService.monitorCallCompliance(data.callId);
    
    res.json({
      success: true,
      data: {
        callId: data.callId,
        sentiment: sentimentResult,
        recommendations: recommendations.filter(r => r.timing === 'immediate'),
        complianceFlags: complianceFlags.filter(f => f.requiresAction),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in live analysis:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid live analysis data',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to perform live analysis'
    });
  }
}

/**
 * GET /api/sentiment/dashboard/:agentId
 * Get sentiment analysis dashboard data for supervisor
 */
export async function getDashboardData(req: Request, res: Response) {
  try {
    const { agentId } = req.params;
    const { timeframe = '24h' } = req.query;
    
    // This would typically query the database for recent analysis data
    // For now, returning a structured response
    
    res.json({
      success: true,
      data: {
        agentId,
        timeframe,
        summary: {
          totalCalls: 0,
          averageSentiment: 0,
          qualityScore: 0,
          complianceScore: 100
        },
        trends: {
          sentiment: [],
          quality: [],
          compliance: []
        },
        alerts: {
          critical: 0,
          high: 0,
          medium: 0,
          total: 0
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting dashboard data:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data'
    });
  }
}