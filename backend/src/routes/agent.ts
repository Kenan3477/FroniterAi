import { Router } from 'express';

const router = Router();

// Simple agent status endpoint for frontend integration
router.get('/status', (req, res) => {
  try {
    console.log('📊 Agent status request received');
    
    // Return basic agent status structure
    res.json({
      success: true,
      data: {
        agentId: 'agent-001',
        status: 'available',
        campaign: null,
        callsToday: 0,
        availableTime: Date.now(),
        skills: ['outbound', 'customer-service'],
        queue: {
          position: 0,
          waiting: 0
        }
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

export default router;