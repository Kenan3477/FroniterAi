import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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
    
    // CRITICAL FIX: Actually update the database
    console.log('💾 Updating agent status in database...');
    
    // Find agent by agentId or email
    let agent;
    try {
      // First try to find by agentId or email
      agent = await prisma.agent.findFirst({
        where: {
          OR: [
            { agentId: agentId },
            { agentId: agentId.toString() },
            { email: `${agentId.toLowerCase()}@icloud.com` }
          ]
        }
      });
      
      if (!agent) {
        console.log('🔍 Agent not found, checking user records...');
        
        // Try to find user record to get proper details
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: agentId },
              { email: `${agentId.toLowerCase()}@icloud.com` },
              { id: parseInt(agentId) || 0 }
            ]
          }
        });
        
        if (user) {
          // Create agent record from user
          agent = await prisma.agent.create({
            data: {
              agentId: user.id.toString(),
              email: user.email,
              firstName: user.firstName || 'Agent',
              lastName: user.lastName || 'User',
              status: status,
              isLoggedIn: status !== 'Offline'
            }
          });
          console.log('✅ Created new agent record:', agent.id);
        } else {
          return res.status(404).json({
            success: false,
            error: `Agent ${agentId} not found in system`
          });
        }
      } else {
        // Update existing agent
        agent = await prisma.agent.update({
          where: { id: agent.id },
          data: {
            status: status,
            isLoggedIn: status !== 'Offline',
            lastStatusChange: new Date()
          }
        });
        console.log('✅ Updated existing agent record:', agent.id);
      }
      
    } catch (dbError: any) {
      console.error('❌ Database error updating agent:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database error updating agent status',
        details: dbError.message
      });
    }
    
    console.log('✅ Agent status updated successfully in database:', { 
      agentId: agent.agentId, 
      email: agent.email,
      status: agent.status, 
      isLoggedIn: agent.isLoggedIn,
      campaignId 
    });
    
    // Return success response
    res.json({
      success: true,
      data: {
        agentId: agent.agentId,
        email: agent.email,
        status: agent.status,
        isLoggedIn: agent.isLoggedIn,
        campaignId,
        timestamp: new Date().toISOString(),
        message: `Agent ${agent.email} status updated to ${status} in database`
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