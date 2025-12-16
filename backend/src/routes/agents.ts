import { Router } from 'express';

const router = Router();

// Simple agents queue endpoint for frontend integration
router.get('/queue', (req, res) => {
  try {
    console.log('📋 Agents queue request received');
    
    // Return basic agents queue structure
    res.json({
      success: true,
      data: {
        queue: {
          waiting: 0,
          active: 1,
          paused: 0,
          total: 1
        },
        agents: [
          {
            id: 'agent-001',
            name: 'Demo Agent',
            status: 'available',
            skills: ['outbound'],
            currentCall: null,
            sessionDuration: 0
          }
        ],
        metrics: {
          averageWaitTime: 0,
          callsInQueue: 0,
          longestWaitTime: 0
        }
      }
    });
  } catch (error) {
    console.error('Agents queue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents queue'
    });
  }
});

// Agent status update endpoint
router.post('/queue/:agentId/status', (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.body;
    
    console.log(`📊 Agent ${agentId} status update: ${status}`);
    
    res.json({
      success: true,
      data: {
        agentId,
        status,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Agent status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent status'
    });
  }
});

// Add missing agent status endpoints that frontend calls
router.get('/status', (req, res) => {
  try {
    const { agentId } = req.query;
    
    console.log(`📊 Agent status request for agentId: ${agentId}`);
    
    // Basic response for frontend compatibility
    res.json({
      success: true,
      data: {
        agentId: agentId || 'unknown',
        status: 'available',
        currentCall: null,
        queuePosition: 0,
        callsToday: 0,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Agent status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent status'
    });
  }
});

router.post('/status', (req, res) => {
  try {
    const { agentId, status } = req.body;
    
    console.log(`📊 Agent status update: ${agentId} -> ${status}`);
    
    res.json({
      success: true,
      data: {
        agentId,
        status,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Agent status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent status'
    });
  }
});

router.get('/status-simple', (req, res) => {
  try {
    const { agentId } = req.query;
    
    console.log(`📊 Simple agent status request for: ${agentId}`);
    
    res.json({
      success: true,
      data: {
        status: 'available',
        callsInQueue: 0
      }
    });
  } catch (error) {
    console.error('Simple agent status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch simple status'
    });
  }
});

export default router;