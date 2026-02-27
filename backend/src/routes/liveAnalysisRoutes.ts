/**
 * Live Call Analysis API Routes
 * Real-time call processing and intelligent outcome detection endpoints
 */

import express, { Request, Response } from 'express';
import { liveCallAnalyzer } from '../services/liveCallAnalyzer';
import liveCoachingService from '../services/liveCoachingService';
import performanceMonitoringService from '../services/performanceMonitoringService';
import advancedAMDService from '../services/advancedAMDService';
import EnhancedTwiMLService from '../services/enhancedTwiMLService';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();

// Apply authentication to sensitive routes
router.use('/stats', authenticate);
router.use('/active-calls', authenticate);

/**
 * POST /api/live-analysis/stream-status
 * Handle Twilio stream status callbacks
 */
router.post('/stream-status', (req: Request, res: Response) => {
  try {
    const { StreamSid, StreamName, StreamEvent, CallSid, Timestamp } = req.body;

    console.log(`🎵 Stream ${StreamEvent}: ${StreamName} (${StreamSid}) for call ${CallSid}`);

    // You can add specific handling for stream events here
    switch (StreamEvent) {
      case 'stream-started':
        console.log(`✅ Live analysis stream started for call: ${CallSid}`);
        break;
      case 'stream-stopped':
        console.log(`🛑 Live analysis stream stopped for call: ${CallSid}`);
        break;
      case 'stream-error':
        console.error(`❌ Stream error for call ${CallSid}:`, req.body);
        break;
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error handling stream status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/live-analysis/:callId/next-action
 * Dynamic call routing based on live analysis results
 */
router.get('/:callId/next-action', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    
    // Get current analysis for the call
    const analysis = liveCallAnalyzer.getActiveAnalysis(callId);
    
    if (!analysis) {
      // No analysis available, default to human assumption
      const twiml = EnhancedTwiMLService.generateOutcomeBasedTwiML(callId, 'unknown');
      res.set('Content-Type', 'text/xml');
      return res.send(twiml);
    }

    // Determine action based on analysis
    let outcome: 'human' | 'machine' | 'unknown' = 'unknown';
    
    if (analysis.isAnsweringMachine && analysis.confidence > 0.7) {
      outcome = 'machine';
    } else if (analysis.speechPattern === 'human' || analysis.intentClassification === 'interested') {
      outcome = 'human';
    }

    console.log(`🧠 Next action for call ${callId}: ${outcome} (confidence: ${analysis.confidence})`);

    const twiml = EnhancedTwiMLService.generateOutcomeBasedTwiML(callId, outcome);
    res.set('Content-Type', 'text/xml');
    res.send(twiml);

  } catch (error) {
    console.error(`❌ Error determining next action for call ${req.params.callId}:`, error);
    
    // Fallback TwiML
    const fallbackTwiml = EnhancedTwiMLService.generateOutcomeBasedTwiML(req.params.callId, 'unknown');
    res.set('Content-Type', 'text/xml');
    res.send(fallbackTwiml);
  }
});

/**
 * GET /api/live-analysis/:callId/retry-analysis
 * Retry analysis for uncertain outcomes
 */
router.get('/:callId/retry-analysis', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    
    console.log(`🔄 Retrying analysis for call: ${callId}`);

    // Get updated analysis
    const analysis = liveCallAnalyzer.getActiveAnalysis(callId);
    
    if (analysis && analysis.confidence > 0.5) {
      // Analysis improved, make decision
      const outcome = analysis.isAnsweringMachine ? 'machine' : 'human';
      const twiml = EnhancedTwiMLService.generateOutcomeBasedTwiML(callId, outcome);
      res.set('Content-Type', 'text/xml');
      return res.send(twiml);
    }

    // Still uncertain, try one more interaction
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice" language="en-GB">
          Hello, are you there? Please say something if you can hear me.
        </Say>
        <Pause length="4" />
        <Redirect>${process.env.BACKEND_URL}/api/live-analysis/${callId}/final-decision</Redirect>
      </Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);

  } catch (error) {
    console.error(`❌ Error retrying analysis for call ${req.params.callId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/live-analysis/:callId/final-decision
 * Make final decision after retry attempts
 */
router.get('/:callId/final-decision', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    
    const analysis = liveCallAnalyzer.getActiveAnalysis(callId);
    
    // Make best-guess decision
    const outcome = analysis?.isAnsweringMachine ? 'machine' : 'human';
    
    console.log(`⚖️ Final decision for call ${callId}: ${outcome}`);

    const twiml = EnhancedTwiMLService.generateOutcomeBasedTwiML(callId, outcome);
    res.set('Content-Type', 'text/xml');
    res.send(twiml);

  } catch (error) {
    console.error(`❌ Error making final decision for call ${req.params.callId}:`, error);
    
    // Default to human to avoid hanging up on real people
    const twiml = EnhancedTwiMLService.generateOutcomeBasedTwiML(req.params.callId, 'human');
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  }
});

/**
 * GET /api/live-analysis/stats
 * Get live analysis system statistics
 */
router.get('/stats', requireRole('SUPERVISOR', 'ADMIN'), (req: Request, res: Response) => {
  try {
    const stats = liveCallAnalyzer.getStats();
    
    res.json({
      success: true,
      data: {
        liveAnalysis: stats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error getting live analysis stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get live analysis statistics'
    });
  }
});

/**
 * GET /api/live-analysis/active-calls
 * Get all currently active call analyses
 */
router.get('/active-calls', requireRole('SUPERVISOR', 'ADMIN'), (req: Request, res: Response) => {
  try {
    const activeCalls = Array.from(liveCallAnalyzer.getAllActiveAnalyses().entries()).map(
      ([callId, analysis]) => ({
        callId,
        isAnsweringMachine: analysis.isAnsweringMachine,
        confidence: analysis.confidence,
        speechPattern: analysis.speechPattern,
        sentimentScore: analysis.sentimentScore,
        intentClassification: analysis.intentClassification,
        keywordDetection: analysis.keywordDetection,
        lastUpdate: analysis.lastUpdate.toISOString()
      })
    );

    res.json({
      success: true,
      data: {
        activeCalls,
        count: activeCalls.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error getting active calls:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active call analyses'
    });
  }
});

/**
 * GET /api/live-analysis/:callId
 * Get analysis for a specific call
 */
router.get('/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const analysis = liveCallAnalyzer.getActiveAnalysis(callId);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Call analysis not found or call not active'
      });
    }

    res.json({
      success: true,
      data: {
        callId,
        analysis: {
          ...analysis,
          lastUpdate: analysis.lastUpdate.toISOString()
        }
      }
    });

  } catch (error) {
    console.error(`❌ Error getting analysis for call ${req.params.callId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get call analysis'
    });
  }
});

/**
 * GET /api/live-analysis/coaching/:callId
 * Get active coaching recommendations for a call
 */
router.get('/coaching/:callId', authenticate, async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const recommendations = liveCoachingService.getActiveRecommendations(callId);
    
    res.json({
      success: true,
      data: {
        callId,
        recommendations,
        count: recommendations.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting coaching recommendations:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

/**
 * POST /api/live-analysis/acknowledge-coaching
 * Acknowledge a coaching recommendation
 */
router.post('/acknowledge-coaching', async (req: Request, res: Response) => {
  try {
    const { callId, recommendationId } = req.body;

    if (!callId || !recommendationId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing callId or recommendationId' 
      });
    }

    liveCoachingService.acknowledgeRecommendation(callId, recommendationId);

    res.json({
      success: true,
      message: 'Recommendation acknowledged'
    });
  } catch (error) {
    console.error('❌ Error acknowledging coaching recommendation:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

/**
 * GET /api/live-analysis/performance/dashboard
 * Get real-time performance dashboard
 */
router.get('/performance/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const dashboard = performanceMonitoringService.getPerformanceDashboard();
    
    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('❌ Error getting performance dashboard:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

/**
 * GET /api/live-analysis/performance/accuracy-report
 * Generate accuracy report for specified period
 */
router.get('/performance/accuracy-report', authenticate, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, days = 7 } = req.query;
    
    let start: Date, end: Date;
    
    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else {
      end = new Date();
      start = new Date(end.getTime() - Number(days) * 24 * 60 * 60 * 1000);
    }
    
    const report = performanceMonitoringService.generateAccuracyReport(start, end);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('❌ Error generating accuracy report:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

/**
 * GET /api/live-analysis/amd/stats
 * Get Advanced AMD system statistics
 */
router.get('/amd/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = advancedAMDService.getSystemStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error getting AMD stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

/**
 * POST /api/live-analysis/performance/record-accuracy
 * Record actual call outcome for accuracy measurement
 */
router.post('/performance/record-accuracy', authenticate, async (req: Request, res: Response) => {
  try {
    const { callId, actualResult, predictedResult, confidence, detectionMethod, timeToDetection } = req.body;

    if (!callId || !actualResult || !predictedResult) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: callId, actualResult, predictedResult' 
      });
    }

    performanceMonitoringService.recordAnalysisAccuracy({
      callId,
      actualResult,
      predictedResult,
      confidence: confidence || 0,
      detectionMethod: detectionMethod || 'unknown',
      timeToDetection: timeToDetection || 0
    });

    res.json({
      success: true,
      message: 'Accuracy data recorded'
    });
  } catch (error) {
    console.error('❌ Error recording accuracy data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

/**
 * POST /api/live-analysis/amd/update-thresholds
 * Update AMD detection thresholds
 */
router.post('/amd/update-thresholds', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { thresholds } = req.body;

    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid thresholds object' 
      });
    }

    advancedAMDService.updateThresholds(thresholds);

    res.json({
      success: true,
      message: 'AMD thresholds updated',
      data: { updatedThresholds: thresholds }
    });
  } catch (error) {
    console.error('❌ Error updating AMD thresholds:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

export default router;