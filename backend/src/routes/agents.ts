import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// Agent status management and auto-dialer integration
interface Agent {
  id: string;
  name: string;
  status: 'OFFLINE' | 'AVAILABLE' | 'ON_CALL' | 'ACW' | 'AWAY' | 'BREAK';
  skills: string[];
  currentCall?: {
    contactId: string;
    campaignId: string;
    startTime: Date;
  };
  assignedCampaigns: string[];
  sessionStartTime?: Date;
  callsToday: number;
  lastStatusChange: Date;
}

// Mock agent data storage (in production this would be database/Redis)
let mockAgents: Agent[] = [
  {
    id: 'agent_001',
    name: 'John Smith',
    status: 'OFFLINE',
    skills: ['outbound', 'sales', 'customer-service'],
    assignedCampaigns: ['campaign_001', 'campaign_test'],
    callsToday: 0,
    lastStatusChange: new Date()
  },
  {
    id: 'agent_002',
    name: 'Emily Davis',
    status: 'OFFLINE', 
    skills: ['outbound', 'surveys', 'support'],
    assignedCampaigns: ['campaign_002'],
    callsToday: 0,
    lastStatusChange: new Date()
  },
  {
    id: 'agent_003',
    name: 'Mike Wilson',
    status: 'OFFLINE',
    skills: ['outbound', 'collections', 'sales'],
    assignedCampaigns: ['campaign_001'],
    callsToday: 0,
    lastStatusChange: new Date()
  }
];

// Helper function to trigger auto-dial when agent becomes available
async function triggerAutoDialer(agentId: string): Promise<void> {
  try {
    const agent = mockAgents.find(a => a.id === agentId);
    if (!agent || agent.status !== 'AVAILABLE') {
      return;
    }

    console.log(`🎯 Triggering auto-dialer for agent ${agentId}`);

    // For each assigned campaign, check if there are queued contacts
    for (const campaignId of agent.assignedCampaigns) {
      try {
        // TODO: Import and call dial queue service directly instead of HTTP call
        // This is a simplified simulation of auto-dial logic
        console.log(`🔍 Checking dial queue for campaign ${campaignId}`);
        
        // Simulate finding a contact to dial
        // In production, this would call the actual dial queue service
        const hasContactsToDial = Math.random() > 0.3; // 70% chance of having contacts
        
        if (hasContactsToDial) {
          console.log(`📞 Auto-dial initiated: Agent ${agentId} dialing campaign ${campaignId}`);
          
          // Update agent status to ON_CALL
          agent.status = 'ON_CALL';
          agent.currentCall = {
            contactId: `contact_${Date.now()}`,
            campaignId,
            startTime: new Date()
          };
          agent.lastStatusChange = new Date();
          
          // TODO: Integrate with actual Twilio calling here
          // TODO: Integrate with actual dial queue service
          break; // Only dial one contact at a time per agent
        }
      } catch (error) {
        console.error(`Error checking dial queue for campaign ${campaignId}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error in triggerAutoDialer for agent ${agentId}:`, error);
  }
}

// Simple agents queue endpoint for frontend integration
router.get('/queue', (req: Request, res: Response) => {
  try {
    console.log('📋 Agents queue request received');
    
    const queueMetrics = {
      waiting: mockAgents.filter(a => a.status === 'AVAILABLE').length,
      active: mockAgents.filter(a => a.status === 'ON_CALL').length,
      paused: mockAgents.filter(a => ['AWAY', 'BREAK'].includes(a.status)).length,
      total: mockAgents.length
    };
    
    // Return agents queue with real data
    res.json({
      success: true,
      data: {
        queue: queueMetrics,
        agents: mockAgents.map(agent => ({
          id: agent.id,
          name: agent.name,
          status: agent.status.toLowerCase(),
          skills: agent.skills,
          currentCall: agent.currentCall || null,
          sessionDuration: agent.sessionStartTime ? 
            Math.floor((Date.now() - agent.sessionStartTime.getTime()) / 1000) : 0,
          callsToday: agent.callsToday
        })),
        metrics: {
          averageWaitTime: 45, // Mock metric
          callsInQueue: 0, // TODO: Get from dial queue API
          longestWaitTime: 120 // Mock metric
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

// Agent status update endpoint with auto-dialer integration
router.post('/queue/:agentId/status', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { status } = req.body;
    
    console.log(`📊 Agent ${agentId} status update: ${status}`);
    
    const agent = mockAgents.find(a => a.id === agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { message: 'Agent not found' }
      });
    }

    const oldStatus = agent.status;
    agent.status = status.toUpperCase();
    agent.lastStatusChange = new Date();

    // If agent becomes AVAILABLE, start session and trigger auto-dialer
    if (agent.status === 'AVAILABLE' && oldStatus !== 'AVAILABLE') {
      agent.sessionStartTime = new Date();
      
      // Trigger auto-dialer asynchronously (don't block response)
      setImmediate(() => triggerAutoDialer(agentId));
    }

    // If agent goes offline, clear session
    if (agent.status === 'OFFLINE') {
      agent.sessionStartTime = undefined;
      agent.currentCall = undefined;
    }
    
    res.json({
      success: true,
      data: {
        agentId,
        status: agent.status,
        oldStatus,
        updatedAt: agent.lastStatusChange.toISOString(),
        autoDialerTriggered: agent.status === 'AVAILABLE' && oldStatus !== 'AVAILABLE'
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

// Get agent status
router.get('/status', (req: Request, res: Response) => {
  try {
    const { agentId } = req.query;
    
    console.log(`📊 Agent status request for agentId: ${agentId}`);
    
    if (agentId) {
      const agent = mockAgents.find(a => a.id === agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: { message: 'Agent not found' }
        });
      }

      res.json({
        success: true,
        data: {
          agentId: agent.id,
          name: agent.name,
          status: agent.status.toLowerCase(),
          currentCall: agent.currentCall,
          queuePosition: agent.status === 'AVAILABLE' ? 0 : -1,
          callsToday: agent.callsToday,
          assignedCampaigns: agent.assignedCampaigns,
          sessionStartTime: agent.sessionStartTime?.toISOString(),
          lastStatusChange: agent.lastStatusChange.toISOString()
        }
      });
    } else {
      // Return all agents status
      res.json({
        success: true,
        data: mockAgents.map(agent => ({
          agentId: agent.id,
          name: agent.name,
          status: agent.status.toLowerCase(),
          callsToday: agent.callsToday,
          lastStatusChange: agent.lastStatusChange.toISOString()
        }))
      });
    }
  } catch (error) {
    console.error('Agent status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent status'
    });
  }
});

// Update agent status (alternative endpoint)
router.post('/status', async (req: Request, res: Response) => {
  try {
    const { agentId, status } = req.body;
    
    console.log(`📊 Agent status update via POST: ${agentId} -> ${status}`);
    
    const agent = mockAgents.find(a => a.id === agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { message: 'Agent not found' }
      });
    }

    const oldStatus = agent.status;
    agent.status = status.toUpperCase();
    agent.lastStatusChange = new Date();

    // Trigger auto-dialer if becoming available
    if (agent.status === 'AVAILABLE' && oldStatus !== 'AVAILABLE') {
      agent.sessionStartTime = new Date();
      setImmediate(() => triggerAutoDialer(agentId));
    }
    
    res.json({
      success: true,
      data: {
        agentId,
        status: agent.status,
        updatedAt: agent.lastStatusChange.toISOString(),
        autoDialerTriggered: agent.status === 'AVAILABLE' && oldStatus !== 'AVAILABLE'
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

// Simple status for compatibility
router.get('/status-simple', (req: Request, res: Response) => {
  try {
    const { agentId } = req.query;
    
    console.log(`📊 Simple agent status request for: ${agentId}`);
    
    const agent = mockAgents.find(a => a.id === agentId);
    
    res.json({
      success: true,
      data: {
        status: agent?.status.toLowerCase() || 'offline',
        callsInQueue: mockAgents.filter(a => a.status === 'AVAILABLE').length
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

// End call and update agent status
router.post('/:agentId/end-call', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { outcome, notes, duration } = req.body;
    
    const agent = mockAgents.find(a => a.id === agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { message: 'Agent not found' }
      });
    }

    const currentCall = agent.currentCall;
    if (!currentCall) {
      return res.status(400).json({
        success: false,
        error: { message: 'Agent is not on a call' }
      });
    }

    // Update call outcome in dial queue
    // TODO: Make API call to update queue entry status

    // Update agent
    agent.status = 'ACW'; // After Call Work
    agent.currentCall = undefined;
    agent.callsToday += 1;
    agent.lastStatusChange = new Date();

    console.log(`📞 Call ended: Agent ${agentId}, Outcome: ${outcome}`);

    res.json({
      success: true,
      data: {
        agentId,
        status: 'acw',
        callOutcome: outcome,
        updatedAt: agent.lastStatusChange.toISOString()
      }
    });

    // Auto-trigger available status after ACW period (simulate)
    setTimeout(() => {
      agent.status = 'AVAILABLE';
      agent.lastStatusChange = new Date();
      setImmediate(() => triggerAutoDialer(agentId));
    }, 5000); // 5 second ACW period

  } catch (error) {
    console.error('End call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end call'
    });
  }
});

export default router;