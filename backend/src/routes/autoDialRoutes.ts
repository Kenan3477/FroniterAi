/**
 * Auto-Dial Routes
 * API endpoints for managing auto-dialling functionality
 */

import express from 'express';
import { autoDialEngine } from '../services/autoDialEngine';

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

export default router;