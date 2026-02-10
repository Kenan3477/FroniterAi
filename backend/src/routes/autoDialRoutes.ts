/**
 * Auto-Dial Routes - Phase 3 Enhanced
 * API endpoints for managing auto-dialling functionality with advanced features
 */

import express from 'express';
import { autoDialEngine } from '../services/autoDialEngine';
import { autoDialSentimentMonitor } from '../services/autoDialSentimentMonitor';

const router = express.Router();

/**
 * POST /api/auto-dial/start
 * Start auto-dialling for an agent in a campaign with optional predictive mode
 */
router.post('/start', async (req, res) => {
  try {
    const { agentId, campaignId, enablePredictive } = req.body;

    if (!agentId || !campaignId) {
      return res.status(400).json({
        success: false,
        error: 'agentId and campaignId are required'
      });
    }

    const result = await autoDialEngine.startAutoDialer(
      agentId, 
      campaignId, 
      enablePredictive || false
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        autoDialStatus: await autoDialEngine.getAutoDialStatus(agentId)
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('Error starting auto-dial:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/auto-dial/pause
 * Pause auto-dialling for an agent
 */
router.post('/pause', async (req, res) => {
  try {
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'agentId is required'
      });
    }

    const result = await autoDialEngine.pauseAutoDialer(agentId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        autoDialStatus: await autoDialEngine.getAutoDialStatus(agentId)
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('Error pausing auto-dial:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/auto-dial/resume
 * Resume auto-dialling for an agent
 */
router.post('/resume', async (req, res) => {
  try {
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'agentId is required'
      });
    }

    const result = await autoDialEngine.resumeAutoDialer(agentId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        autoDialStatus: await autoDialEngine.getAutoDialStatus(agentId)
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('Error resuming auto-dial:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/auto-dial/stop
 * Stop auto-dialling for an agent
 */
router.post('/stop', async (req, res) => {
  try {
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'agentId is required'
      });
    }

    const result = await autoDialEngine.stopAutoDialer(agentId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        autoDialStatus: await autoDialEngine.getAutoDialStatus(agentId)
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('Error stopping auto-dial:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/auto-dial/status/:agentId
 * Get auto-dial status for an agent
 */
router.get('/status/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;

    const status = await autoDialEngine.getAutoDialStatus(agentId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting auto-dial status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/auto-dial/active-sessions
 * Get all active auto-dial sessions (for monitoring)
 */
router.get('/active-sessions', async (req, res) => {
  try {
    const activeSessions = autoDialEngine.getActiveAutoDialSessions();

    res.json({
      success: true,
      data: {
        activeSessions: activeSessions.length,
        sessions: activeSessions.map(session => ({
          agentId: session.agentId,
          campaignId: session.campaignId,
          isActive: session.isActive,
          isPaused: session.isPaused,
          dialCount: session.dialCount,
          sessionStartTime: session.sessionStartTime,
          lastDialAttempt: session.lastDialAttempt
        }))
      }
    });
  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/auto-dial/predictive-stats/:campaignId
 * Get predictive dialing performance statistics for a campaign
 */
router.get('/predictive-stats/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const stats = await autoDialEngine.getPredictiveStats(campaignId);

    res.json({
      success: true,
      data: {
        campaignId,
        stats: stats || {
          averageAnswerRate: 0,
          averageAbandonmentRate: 0,
          averageUtilization: 0,
          dataPoints: 0,
          timeSpan: 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting predictive stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/auto-dial/enhanced-active-sessions
 * Get all active auto-dial sessions with predictive information
 */
router.get('/enhanced-active-sessions', async (req, res) => {
  try {
    const activeSessions = autoDialEngine.getActiveAutoDialSessions();

    const enhancedSessions = await Promise.all(
      activeSessions.map(async (session) => {
        const status = await autoDialEngine.getAutoDialStatus(session.agentId);
        return {
          agentId: session.agentId,
          campaignId: session.campaignId,
          isActive: session.isActive,
          isPaused: session.isPaused,
          dialCount: session.dialCount,
          sessionStartTime: session.sessionStartTime,
          lastDialAttempt: session.lastDialAttempt,
          predictiveMode: status.predictiveMode,
          dialRatio: status.dialRatio,
          queueDepth: status.queueDepth,
          lastPredictiveDecision: status.lastPredictiveDecision
        };
      })
    );

    res.json({
      success: true,
      data: {
        activeSessions: enhancedSessions.length,
        sessions: enhancedSessions
      }
    });
  } catch (error) {
    console.error('Error getting enhanced active sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/auto-dial/amd-webhook
 * Handle AMD (Answering Machine Detection) webhooks from Twilio
 */
router.post('/amd-webhook', async (req, res) => {
  try {
    const { 
      CallSid, 
      MachineDetectionResult, 
      MachineDetectionDuration,
      // Extract additional parameters from query string if available
    } = req.body;

    // Get call context from query parameters
    const { agentId, contactId, campaignId } = req.query;

    const amdData = {
      CallSid,
      MachineDetectionResult,
      MachineDetectionDuration: parseInt(MachineDetectionDuration || '0'),
      agentId: agentId as string,
      contactId: contactId as string,
      campaignId: campaignId as string
    };

    await autoDialEngine.handleAMDWebhook(amdData);

    // Respond to Twilio
    res.status(200).send('OK');

  } catch (error) {
    console.error('Error handling AMD webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * POST /api/auto-dial/call-status-webhook
 * Handle call status webhooks from Twilio
 */
router.post('/call-status-webhook', async (req, res) => {
  try {
    const { 
      CallSid, 
      CallStatus, 
      CallDuration,
    } = req.body;

    // Get call context from query parameters  
    const { agentId, contactId, campaignId } = req.query;

    const statusData = {
      CallSid,
      CallStatus,
      Duration: CallDuration ? parseInt(CallDuration) : undefined,
      agentId: agentId as string,
      contactId: contactId as string,
      campaignId: campaignId as string
    };

    await autoDialEngine.handleCallStatusWebhook(statusData);

    // Respond to Twilio
    res.status(200).send('OK');

  } catch (error) {
    console.error('Error handling call status webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * POST /api/auto-dial/transcript-segment
 * Process real-time transcript segment for sentiment analysis
 */
router.post('/transcript-segment', async (req, res) => {
  try {
    const { callId, speaker, text, timestamp } = req.body;

    if (!callId || !speaker || !text) {
      return res.status(400).json({
        success: false,
        error: 'callId, speaker, and text are required'
      });
    }

    const alerts = await autoDialSentimentMonitor.processTranscriptSegment(
      callId,
      speaker,
      text,
      timestamp ? new Date(timestamp) : new Date()
    );

    res.json({
      success: true,
      data: {
        alertsGenerated: alerts.length,
        alerts: alerts
      }
    });

  } catch (error) {
    console.error('Error processing transcript segment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/auto-dial/sentiment-status/:callId
 * Get real-time sentiment monitoring status for a call
 */
router.get('/sentiment-status/:callId', async (req, res) => {
  try {
    const { callId } = req.params;

    const monitoringStatus = autoDialSentimentMonitor.getActiveMonitoringStatus();
    const callStatus = monitoringStatus.get(callId);

    if (!callStatus) {
      return res.status(404).json({
        success: false,
        error: 'Call not found in active monitoring'
      });
    }

    const coachingSuggestions = await autoDialSentimentMonitor.getCoachingSuggestions(callId);

    res.json({
      success: true,
      data: {
        callMetrics: callStatus,
        coachingSuggestions: coachingSuggestions
      }
    });

  } catch (error) {
    console.error('Error getting sentiment status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/auto-dial/agent-performance/:agentId
 * Get agent performance summary from sentiment analysis
 */
router.get('/agent-performance/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;

    const performance = autoDialSentimentMonitor.getAgentPerformanceSummary(agentId);

    res.json({
      success: true,
      data: {
        agentId,
        performance
      }
    });

  } catch (error) {
    console.error('Error getting agent performance:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/auto-dial/active-monitoring
 * Get all active sentiment monitoring sessions
 */
router.get('/active-monitoring', async (req, res) => {
  try {
    const monitoringStatus = autoDialSentimentMonitor.getActiveMonitoringStatus();
    
    const activeSessions = Array.from(monitoringStatus.entries()).map(([callId, metrics]) => ({
      ...metrics,
      callId // This will override the callId from metrics spread
    }));

    res.json({
      success: true,
      data: {
        activeSessions: activeSessions.length,
        sessions: activeSessions
      }
    });

  } catch (error) {
    console.error('Error getting active monitoring:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;