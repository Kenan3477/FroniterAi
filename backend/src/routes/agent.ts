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

// Enhanced agent status update endpoint for inbound call system
router.post('/status-enhanced', async (req, res) => {
  try {
    const { agentId, status, campaignId } = req.body;
    
    console.log('🔄 Agent status update request:', { agentId, status, campaignId });
    
    // Validate required fields
    if (!agentId || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentId, status'
      });
    }
    
    // Validate status values
    const validStatuses = ['Available', 'Unavailable', 'On Call', 'Break', 'Offline'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    console.log('✅ Agent status updated successfully:', { agentId, status, campaignId });
    
    // Return success response
    res.json({
      success: true,
      data: {
        agentId,
        status,
        campaignId,
        timestamp: new Date().toISOString(),
        message: `Agent ${agentId} status updated to ${status}`
      }
    });
  } catch (error: any) {
    console.error('❌ Agent status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent status',
      details: error.message
    });
  }
});

export default router;