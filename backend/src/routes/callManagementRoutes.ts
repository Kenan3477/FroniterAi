/**
 * Call Management Routes
 * 
 * API endpoints for managing calls through the finite-state machine
 * Provides comprehensive call lifecycle management with proper state transitions
 */

import { Router } from 'express';
import { callStateMachine, CallState, CallOutcome, CallOwnership } from '../services/callStateMachine';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /api/call-management/create
 * Create a new call in the state machine
 */
router.post('/create',
  validateRequest([
    body('contactId').isString().notEmpty(),
    body('campaignId').isString().notEmpty(),
    body('phoneNumber').isMobilePhone('any'),
    body('priority').optional().isInt({ min: 1, max: 10 }),
    body('scheduledCallback').optional().isISO8601(),
  ]),
  async (req, res) => {
    try {
      const { contactId, campaignId, phoneNumber, priority, scheduledCallback } = req.body;
      
      const callId = await callStateMachine.createCall({
        contactId,
        campaignId,
        phoneNumber,
        priority,
        scheduledCallback: scheduledCallback ? new Date(scheduledCallback) : undefined
      });

      res.json({
        success: true,
        data: { callId },
        message: 'Call created successfully'
      });
    } catch (error) {
      console.error('Error creating call:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create call'
      });
    }
  }
);

/**
 * POST /api/call-management/:callId/transition
 * Transition call to new state
 */
router.post('/:callId/transition',
  validateRequest([
    param('callId').isString().notEmpty(),
    body('newState').isIn(Object.values(CallState)),
    body('ownerId').optional().isString(),
    body('ownership').optional().isIn(Object.values(CallOwnership)),
    body('sipCallId').optional().isString(),
    body('reason').optional().isString(),
    body('amdResult').optional().isIn(['human', 'machine', 'unknown'])
  ]),
  async (req, res) => {
    try {
      const { callId } = req.params;
      const { newState, ownerId, ownership, sipCallId, reason, amdResult } = req.body;
      
      const success = await callStateMachine.transitionState(callId, newState, {
        ownerId,
        ownership,
        sipCallId,
        reason,
        amdResult
      });

      if (success) {
        res.json({
          success: true,
          message: `Call transitioned to ${newState}`
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid state transition'
        });
      }
    } catch (error) {
      console.error('Error transitioning call state:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transition call state'
      });
    }
  }
);

/**
 * POST /api/call-management/:callId/complete
 * Complete call with outcome and disposition
 */
router.post('/:callId/complete',
  validateRequest([
    param('callId').isString().notEmpty(),
    body('outcome').isIn(Object.values(CallOutcome)),
    body('dispositionId').optional().isString(),
    body('subDisposition').optional().isString(),
    body('notes').optional().isString()
  ]),
  async (req, res) => {
    try {
      const { callId } = req.params;
      const { outcome, dispositionId, subDisposition, notes } = req.body;
      
      const success = await callStateMachine.completeCall(
        callId,
        outcome,
        dispositionId,
        subDisposition,
        notes
      );

      if (success) {
        res.json({
          success: true,
          message: `Call completed with outcome: ${outcome}`
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to complete call'
        });
      }
    } catch (error) {
      console.error('Error completing call:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete call'
      });
    }
  }
);

/**
 * POST /api/call-management/:callId/assign
 * Assign call to specific agent
 */
router.post('/:callId/assign',
  validateRequest([
    param('callId').isString().notEmpty(),
    body('agentId').isString().notEmpty()
  ]),
  async (req, res) => {
    try {
      const { callId } = req.params;
      const { agentId } = req.body;
      
      const success = await callStateMachine.assignToAgent(callId, agentId);

      if (success) {
        res.json({
          success: true,
          message: `Call assigned to agent ${agentId}`
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to assign call'
        });
      }
    } catch (error) {
      console.error('Error assigning call:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign call'
      });
    }
  }
);

/**
 * POST /api/call-management/:callId/fail
 * Mark call as failed with reason
 */
router.post('/:callId/fail',
  validateRequest([
    param('callId').isString().notEmpty(),
    body('reason').isString().notEmpty(),
    body('finalState').optional().isIn(Object.values(CallState))
  ]),
  async (req, res) => {
    try {
      const { callId } = req.params;
      const { reason, finalState } = req.body;
      
      const success = await callStateMachine.failCall(
        callId,
        reason,
        finalState || CallState.FAILED
      );

      if (success) {
        res.json({
          success: true,
          message: `Call failed: ${reason}`
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to fail call'
        });
      }
    } catch (error) {
      console.error('Error failing call:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fail call'
      });
    }
  }
);

/**
 * GET /api/call-management/:callId
 * Get current state of a specific call
 */
router.get('/:callId',
  validateRequest([
    param('callId').isString().notEmpty()
  ]),
  async (req, res) => {
    try {
      const { callId } = req.params;
      
      const callState = callStateMachine.getCallState(callId);

      if (callState) {
        res.json({
          success: true,
          data: callState
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Call not found'
        });
      }
    } catch (error) {
      console.error('Error getting call state:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get call state'
      });
    }
  }
);

/**
 * GET /api/call-management/active
 * Get all active calls
 */
router.get('/active', async (req, res) => {
  try {
    const activeCalls = callStateMachine.getActiveCalls();
    const callsArray = Array.from(activeCalls.values());

    res.json({
      success: true,
      data: {
        totalCalls: callsArray.length,
        calls: callsArray
      }
    });
  } catch (error) {
    console.error('Error getting active calls:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get active calls'
    });
  }
});

/**
 * GET /api/call-management/by-state/:state
 * Get calls by specific state
 */
router.get('/by-state/:state',
  validateRequest([
    param('state').isIn(Object.values(CallState))
  ]),
  async (req, res) => {
    try {
      const { state } = req.params;
      
      const calls = callStateMachine.getCallsByState(state as CallState);

      res.json({
        success: true,
        data: {
          state,
          count: calls.length,
          calls
        }
      });
    } catch (error) {
      console.error('Error getting calls by state:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get calls by state'
      });
    }
  }
);

/**
 * GET /api/call-management/by-owner/:ownership
 * Get calls by ownership type
 */
router.get('/by-owner/:ownership',
  validateRequest([
    param('ownership').isIn(Object.values(CallOwnership)),
    query('ownerId').optional().isString()
  ]),
  async (req, res) => {
    try {
      const { ownership } = req.params;
      const { ownerId } = req.query;
      
      const calls = callStateMachine.getCallsByOwner(
        ownership as CallOwnership,
        ownerId as string
      );

      res.json({
        success: true,
        data: {
          ownership,
          ownerId,
          count: calls.length,
          calls
        }
      });
    } catch (error) {
      console.error('Error getting calls by owner:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get calls by owner'
      });
    }
  }
);

/**
 * GET /api/call-management/statistics
 * Get comprehensive call statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const statistics = callStateMachine.getStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error getting call statistics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get call statistics'
    });
  }
});

/**
 * GET /api/call-management/states
 * Get all available call states and outcomes
 */
router.get('/states', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        callStates: Object.values(CallState),
        callOutcomes: Object.values(CallOutcome),
        callOwnership: Object.values(CallOwnership)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get states'
    });
  }
});

export default router;