/**
 * Simplified Agent Status API
 * Agent availability directly controls dial queue participation
 * Available = auto join queue, Away/Pause = remove from queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { agentId, status, campaignId } = await request.json();

    console.log(`🔄 Agent ${agentId} status update: ${status}`);

    // 1. Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { agentId }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // 2. Update agent status
    const updatedAgent = await prisma.agent.update({
      where: { agentId },
      data: {
        status: status,
        lastStatusChange: new Date(),
        isLoggedIn: status !== 'Offline'
      }
    });

    // 3. Handle queue participation
    let queueStatus = null;
    if (status === 'Available' && campaignId) {
      // Agent wants to start dialling - join queue
      queueStatus = await joinDialQueue(agentId, campaignId);
      await checkAndStartDialling(campaignId);
    } else if (status === 'Away' || status === 'Break' || status === 'Offline') {
      // Agent leaving queue
      await leaveDialQueue(agentId);
      if (campaignId) {
        await checkAndStopDialling(campaignId);
      }
    }

    // 4. Get available agents count
    const availableAgents = await prisma.agent.count({
      where: {
        status: 'Available',
        isLoggedIn: true
      }
    });

    return NextResponse.json({
      success: true,
      agent: {
        agentId: updatedAgent.agentId,
        name: `${updatedAgent.firstName} ${updatedAgent.lastName}`,
        status: updatedAgent.status,
        isLoggedIn: updatedAgent.isLoggedIn
      },
      queueStatus: queueStatus || {
        campaignId,
        availableAgents,
        isDiallingActive: availableAgents > 0
      },
      message: getStatusMessage(status, agentId, availableAgents)
    });

  } catch (error) {
    console.error('Agent status API error:', error);
    return NextResponse.json({ error: 'Status update failed' }, { status: 500 });
  }
}

/**
 * Agent joins dial queue for campaign
 */
async function joinDialQueue(agentId: string, campaignId: string) {
  console.log(`🚀 Agent ${agentId} joining dial queue for campaign ${campaignId}`);
  
  try {
    // Get queue depth for this campaign
    const queueDepth = await prisma.dialQueueEntry.count({
      where: {
        campaignId: campaignId,
        status: { in: ['queued', 'dialing'] }
      }
    });

    console.log(`📊 Campaign ${campaignId} has ${queueDepth} contacts in queue`);

    return {
      campaignId,
      queueDepth,
      joinedAt: new Date(),
      message: `Joined queue with ${queueDepth} contacts waiting`
    };

  } catch (error) {
    console.error('Error joining queue:', error);
    return {
      campaignId,
      queueDepth: 0,
      joinedAt: new Date(),
      message: 'Joined queue (queue status unavailable)'
    };
  }
}

/**
 * Agent leaves dial queue
 */
async function leaveDialQueue(agentId: string) {
  console.log(`📤 Agent ${agentId} leaving dial queue`);
  
  try {
    // Release any assigned queue entries back to pool
    const releasedEntries = await prisma.dialQueueEntry.updateMany({
      where: {
        assignedAgentId: agentId,
        status: 'dialing'
      },
      data: {
        assignedAgentId: null,
        status: 'queued',
        dialedAt: null
      }
    });

    console.log(`📋 Released ${releasedEntries.count} calls back to queue`);
    return releasedEntries.count;

  } catch (error) {
    console.error('Error leaving queue:', error);
    return 0;
  }
}

/**
 * Check if dialling should start (first available agent)
 */
async function checkAndStartDialling(campaignId: string) {
  try {
    const availableAgents = await prisma.agent.count({
      where: {
        status: 'Available',
        isLoggedIn: true
      }
    });

    if (availableAgents === 1) {
      console.log(`🎯 First agent available - dialling can now start for campaign ${campaignId}`);
      // Here you would trigger your dialling engine
    } else {
      console.log(`👥 ${availableAgents} agents now available for dialling`);
    }

    return availableAgents;
  } catch (error) {
    console.error('Error checking dial start:', error);
    return 0;
  }
}

/**
 * Check if dialling should stop (no available agents)
 */
async function checkAndStopDialling(campaignId: string) {
  try {
    const availableAgents = await prisma.agent.count({
      where: {
        status: 'Available',
        isLoggedIn: true
      }
    });

    if (availableAgents === 0) {
      console.log(`⏹️ No agents available - stopping all dialling for campaign ${campaignId}`);
      // Here you would stop your dialling engine
    } else {
      console.log(`👥 ${availableAgents} agents still available for dialling`);
    }

    return availableAgents;
  } catch (error) {
    console.error('Error checking dial stop:', error);
    return 0;
  }
}

/**
 * Get status message
 */
function getStatusMessage(status: string, agentId: string, availableAgents: number): string {
  switch (status) {
    case 'Available':
      const dialMessage = availableAgents === 1 ? 
        'Dialling is now active!' : 
        `${availableAgents} agents ready for dialling.`;
      return `Agent ${agentId} is Available and in dial queue. ${dialMessage}`;
    
    case 'Away':
      const awayMessage = availableAgents === 0 ? 
        'All dialling stopped!' : 
        `${availableAgents} agents still available.`;
      return `Agent ${agentId} is Away and removed from dial queue. ${awayMessage}`;
    
    case 'Break':
      const breakMessage = availableAgents === 0 ? 
        'All dialling stopped!' : 
        `${availableAgents} agents still available.`;
      return `Agent ${agentId} is on Break and removed from dial queue. ${breakMessage}`;
    
    case 'Offline':
      const offlineMessage = availableAgents === 0 ? 
        'All dialling stopped!' : 
        `${availableAgents} agents still available.`;
      return `Agent ${agentId} is Offline and removed from all queues. ${offlineMessage}`;
    
    default:
      return `Agent ${agentId} status updated to ${status}.`;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const campaignId = searchParams.get('campaignId');

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({
      where: { agentId }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    let queueDepth = 0;
    if (campaignId) {
      try {
        queueDepth = await prisma.dialQueueEntry.count({
          where: {
            campaignId,
            status: { in: ['queued', 'dialing'] }
          }
        });
      } catch (error) {
        console.log('Queue depth unavailable');
      }
    }

    const availableAgents = await prisma.agent.count({
      where: {
        status: 'Available',
        isLoggedIn: true
      }
    });

    return NextResponse.json({
      success: true,
      agent: {
        agentId: agent.agentId,
        status: agent.status,
        isLoggedIn: agent.isLoggedIn,
        currentCall: agent.currentCall
      },
      queueStatus: {
        campaignId,
        queueDepth,
        availableAgents,
        isDiallingActive: availableAgents > 0
      }
    });

  } catch (error) {
    console.error('Error getting agent status:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}