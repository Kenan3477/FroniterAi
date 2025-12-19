// Inbound Call Routing API Routes
import express from 'express';
import { inboundRoutingService, AgentStatus, CallPriority } from '../services/inboundRoutingService';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /api/routing/agents/:agentId/availability
 * Update agent availability status
 */
router.post('/agents/:agentId/availability',
  validateRequest([
    param('agentId').isString().notEmpty(),
    body('status').isIn(['available', 'busy', 'on_break', 'in_meeting', 'offline', 'away']),
    body('agentName').optional().isString(),
    body('maxConcurrentCalls').optional().isInt({ min: 1, max: 10 }),
    body('currentCalls').optional().isInt({ min: 0 }),
    body('skills').optional().isArray(),
    body('skills.*.skillId').optional().isString(),
    body('skills.*.skillName').optional().isString(),
    body('skills.*.proficiencyLevel').optional().isInt({ min: 1, max: 10 }),
    body('skills.*.certified').optional().isBoolean(),
    body('priority').optional().isInt({ min: 1, max: 10 }),
    body('metadata').optional().isObject(),
  ]),
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const updateData = req.body;

      await inboundRoutingService.updateAgentAvailability(agentId, updateData);

      res.json({
        success: true,
        message: 'Agent availability updated successfully'
      });
    } catch (error) {
      console.error('Error updating agent availability:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/routing/agents/:agentId/availability
 * Get agent availability status
 */
router.get('/agents/:agentId/availability',
  validateRequest([
    param('agentId').isString().notEmpty(),
  ]),
  async (req, res) => {
    try {
      const { agentId } = req.params;
      
      const availability = inboundRoutingService.getAgentAvailability(agentId);

      if (!availability) {
        return res.status(404).json({
          success: false,
          error: 'Agent availability not found'
        });
      }

      res.json({
        success: true,
        data: availability
      });
    } catch (error) {
      console.error('Error getting agent availability:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/routing/agents/available
 * Get all available agents
 */
router.get('/agents/available', async (req, res) => {
  try {
    const availableAgents = inboundRoutingService.getAvailableAgents();

    res.json({
      success: true,
      data: availableAgents
    });
  } catch (error) {
    console.error('Error getting available agents:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/routing/calls/inbound
 * Route an inbound call
 */
router.post('/calls/inbound',
  validateRequest([
    body('callId').isString().notEmpty(),
    body('sipCallId').isString().notEmpty(),
    body('fromNumber').isString().notEmpty(),
    body('toNumber').isString().notEmpty(),
    body('callerName').optional().isString(),
    body('campaignId').optional().isString(),
    body('metadata').optional().isObject(),
  ]),
  async (req, res) => {
    try {
      const { callId, sipCallId, fromNumber, toNumber, callerName, campaignId, metadata } = req.body;

      const result = await inboundRoutingService.routeInboundCall({
        callId,
        sipCallId,
        fromNumber,
        toNumber,
        callerName,
        campaignId,
        metadata,
      });

      if (result.success) {
        res.json({
          success: true,
          data: {
            agentId: result.agentId,
            queuePosition: result.queuePosition,
            estimatedWaitTime: result.estimatedWaitTime,
          },
          message: result.agentId ? 'Call routed to agent' : 'Call added to queue'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to route call'
        });
      }
    } catch (error) {
      console.error('Error routing inbound call:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * DELETE /api/routing/calls/:callId/queue
 * Remove call from queue
 */
router.delete('/calls/:callId/queue',
  validateRequest([
    param('callId').isString().notEmpty(),
    body('reason').isIn(['answered', 'abandoned', 'timeout']),
  ]),
  async (req, res) => {
    try {
      const { callId } = req.params;
      const { reason } = req.body;

      await inboundRoutingService.removeCallFromQueue(callId, reason);

      res.json({
        success: true,
        message: 'Call removed from queue successfully'
      });
    } catch (error) {
      console.error('Error removing call from queue:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/routing/queue/status
 * Get current queue status
 */
router.get('/queue/status', async (req, res) => {
  try {
    const queueStatus = inboundRoutingService.getQueueStatus();

    res.json({
      success: true,
      data: queueStatus
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/routing/statistics
 * Get routing statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = inboundRoutingService.getRoutingStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting routing statistics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/routing/agents/bulk-update
 * Bulk update agent availability (for admin)
 */
router.post('/agents/bulk-update',
  validateRequest([
    body('updates').isArray(),
    body('updates.*.agentId').isString(),
    body('updates.*.status').isIn(['available', 'busy', 'on_break', 'in_meeting', 'offline', 'away']),
    body('updates.*.maxConcurrentCalls').optional().isInt({ min: 1, max: 10 }),
    body('updates.*.priority').optional().isInt({ min: 1, max: 10 }),
  ]),
  async (req, res) => {
    try {
      const { updates } = req.body;
      const results = [];

      for (const update of updates) {
        try {
          await inboundRoutingService.updateAgentAvailability(update.agentId, update);
          results.push({ agentId: update.agentId, success: true });
        } catch (error) {
          results.push({ 
            agentId: update.agentId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      res.json({
        success: true,
        data: results,
        message: 'Bulk agent update completed'
      });
    } catch (error) {
      console.error('Error in bulk agent update:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/routing/skills
 * Get available skills for routing
 */
router.get('/skills', async (req, res) => {
  try {
    // TODO: Implement skill management system
    // For now, return predefined skills
    const skills = [
      { id: 'general_support', name: 'General Support', description: 'Basic customer support skills' },
      { id: 'technical_support', name: 'Technical Support', description: 'Technical problem resolution' },
      { id: 'sales', name: 'Sales', description: 'Sales and lead conversion' },
      { id: 'vip_support', name: 'VIP Support', description: 'Premium customer support' },
      { id: 'senior_support', name: 'Senior Support', description: 'Advanced customer support' },
      { id: 'emergency_support', name: 'Emergency Support', description: 'Emergency and critical issue handling' },
      { id: 'billing_support', name: 'Billing Support', description: 'Billing and payment assistance' },
      { id: 'retention', name: 'Customer Retention', description: 'Customer retention and winback' },
    ];

    res.json({
      success: true,
      data: skills
    });
  } catch (error) {
    console.error('Error getting skills:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/routing/dashboard
 * Get comprehensive routing dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [availableAgents, queueStatus, stats] = await Promise.all([
      inboundRoutingService.getAvailableAgents(),
      inboundRoutingService.getQueueStatus(),
      inboundRoutingService.getRoutingStatistics(),
    ]);

    const dashboard = {
      agents: {
        available: availableAgents,
        summary: (stats as any).agentSummary,
      },
      queue: queueStatus,
      statistics: stats,
      realTime: {
        timestamp: new Date().toISOString(),
        activeRoutes: availableAgents.length,
        queueLength: queueStatus.totalCalls,
      },
    };

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Error getting routing dashboard:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * WebSocket endpoint for real-time routing updates
 * This would be handled by the WebSocket service
 */

export default router;