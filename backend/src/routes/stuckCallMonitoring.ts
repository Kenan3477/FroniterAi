/**
 * Stuck Call Monitoring Routes
 * 
 * Admin endpoints to monitor and manage stuck call prevention
 */

import express from 'express';
import {
  findStuckCalls,
  cleanStuckCalls,
  syncWithTwilio,
  cleanAgentStuckCalls,
  getMonitoringStatus
} from '../services/stuckCallPrevention';
import { authenticateToken } from '../middleware/enhancedAuth';

const router = express.Router();

/**
 * GET /api/stuck-calls/status
 * Get stuck call monitoring status
 */
router.get('/status', authenticateToken, async (req: any, res: any) => {
  try {
    const status = getMonitoringStatus();
    const stuckCalls = await findStuckCalls();

    res.json({
      success: true,
      monitoring: status,
      currentStuckCalls: stuckCalls.length,
      stuckCalls: stuckCalls.map(call => ({
        callId: call.callId,
        agentId: call.agentId,
        phoneNumber: call.phoneNumber,
        startTime: call.startTime,
        ageMinutes: Math.floor((Date.now() - new Date(call.startTime).getTime()) / 60000)
      }))
    });
  } catch (error: any) {
    console.error('❌ Error getting stuck call status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/stuck-calls/cleanup
 * Manually trigger stuck call cleanup
 */
router.post('/cleanup', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await cleanStuckCalls();

    res.json({
      success: true,
      cleaned: result.cleaned,
      errors: result.errors,
      message: `Cleaned ${result.cleaned} stuck calls`
    });
  } catch (error: any) {
    console.error('❌ Error cleaning stuck calls:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/stuck-calls/sync-twilio
 * Manually trigger Twilio sync
 */
router.post('/sync-twilio', authenticate, async (req: any, res: any) => {
  try {
    const result = await syncWithTwilio();

    res.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
      message: `Synced ${result.synced} calls with Twilio`
    });
  } catch (error: any) {
    console.error('❌ Error syncing with Twilio:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/stuck-calls/clean-agent/:agentId
 * Clean stuck calls for specific agent
 */
router.post('/clean-agent/:agentId', authenticate, async (req: any, res: any) => {
  try {
    const { agentId } = req.params;
    const cleaned = await cleanAgentStuckCalls(agentId);

    res.json({
      success: true,
      cleaned,
      message: `Cleaned ${cleaned} stuck calls for agent ${agentId}`
    });
  } catch (error: any) {
    console.error('❌ Error cleaning agent stuck calls:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
