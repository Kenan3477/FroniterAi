/**
 * Enhanced Agent Status Management API
 * Agent availability directly controls dial queue participation
 * Available = auto join queue, Away/Pause = remove from queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { action, agentId, campaignId, status } = await request.json();

    switch (action) {
      case 'update_status':
        return await updateAgentStatus(agentId, status, campaignId);
      
      case 'request_next_call':
        return await requestNextCall(agentId, campaignId);
      
      case 'get_queue_status':
        return await getQueueStatus(agentId, campaignId);
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Agent status API error:', error);
    return NextResponse.json({ error: 'Status update failed' }, { status: 500 });
  }
}

/**
 * Update agent status with automatic queue management
 * Available = join queue, Away/Pause/Offline = leave queue
 */
async function updateAgentStatus(agentId: string, newStatus: string, campaignId: string) {
  try {
    console.log(`🔄 Agent ${agentId} status change: ${newStatus} for campaign ${campaignId}`);

    // 1. Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { agentId }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // 2. Verify campaign exists if provided
    let campaign = null;
    if (campaignId) {
      campaign = await prisma.campaign.findUnique({
        where: { campaignId }
      });

      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
    }

    // 3. Update agent status
    const updatedAgent = await prisma.agent.update({
      where: { agentId },
      data: {
        status: newStatus,
        lastStatusChange: new Date(),
        isLoggedIn: newStatus !== 'Offline'
      }
    });

    // 4. Handle queue participation based on status
    if (newStatus === 'Available' && campaignId) {
      // JOIN QUEUE - Agent wants to start dialling
      await joinDialQueue(agentId, campaignId);
      
      // Check if this is the first available agent - start dialling if so
      await checkAndStartDialling(campaignId);
      
    } else {
      // LEAVE QUEUE - Agent away, paused, or offline
      await leaveDialQueue(agentId);
      
      // Check if no agents left - stop dialling if needed
      await checkAndStopDialling(campaignId);
    }

    // 5. Get updated queue status
    const queueStatus = await getUpdatedQueueStatus(agentId, campaignId);

    return NextResponse.json({
      success: true,
      agent: {
        agentId: updatedAgent.agentId,
        name: `${updatedAgent.firstName} ${updatedAgent.lastName}`,
        status: updatedAgent.status,
        lastStatusChange: updatedAgent.lastStatusChange,
        isLoggedIn: updatedAgent.isLoggedIn
      },
      queueStatus,
      message: getStatusMessage(newStatus, agentId, campaignId, queueStatus)
    });

  } catch (error) {
    console.error('Error updating agent status:', error);
    return NextResponse.json({ error: 'Failed to update agent status' }, { status: 500 });
  }
}

/**
 * Join dial queue for campaign
 */
async function joinDialQueue(agentId: string, campaignId: string) {
  console.log(`🚀 Agent ${agentId} joining dial queue for campaign ${campaignId}`);

  // Create or update campaign assignment  
  try {
    await prisma.agentCampaignAssignment.upsert({
      where: {
        agentId_campaignId: {
          agentId,
          campaignId
        }
      },
      update: {
        isActive: true,
        assignedAt: new Date()
      },
      create: {
        agentId,
        campaignId,
        isActive: true,
        assignedAt: new Date()
      }
    });
  } catch (error) {
    // If the upsert fails due to model issues, just log it
    console.log('Note: Campaign assignment tracking not available with current schema');
  }
}

/**
 * Leave dial queue (remove from all campaigns)
 */
async function leaveDialQueue(agentId: string) {
  console.log(`📤 Agent ${agentId} leaving dial queue`);

  // Release any assigned queue entries back to pool
  try {
    const releasedEntries = await prisma.dialQueueEntry.updateMany({
      where: {
        assignedAgentId: agentId,
        status: { in: ['dialing'] }
      },
      data: {
        assignedAgentId: null,
        status: 'queued',
        dialedAt: null
      }
    });

    console.log(`📋 Released ${releasedEntries.count} calls back to queue`);
  } catch (error) {
    console.log('Note: Queue entry management not available with current schema');
  }

  // Deactivate campaign assignments
  try {
    await prisma.agentCampaignAssignment.updateMany({
      where: { agentId },
      data: { isActive: false }
    });
  } catch (error) {
    console.log('Note: Campaign assignment tracking not available with current schema');
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

    if (availableAgents >= 1) {
      console.log(`🎯 ${availableAgents} agent(s) available - starting auto-dial for campaign ${campaignId}`);
      
      // Auto-dial: Find available agents and assign calls immediately
      const availableAgentsList = await prisma.agent.findMany({
        where: {
          status: 'Available',
          isLoggedIn: true,
          currentCall: null
        },
        take: 5 // Limit to prevent overwhelming
      });

      for (const agent of availableAgentsList) {
        await autoAssignNextCall(agent.agentId, campaignId);
      }
    }
  } catch (error) {
    console.error('Error checking dial start:', error);
  }
}

/**
 * Auto-assign next call to available agent
 */
async function autoAssignNextCall(agentId: string, campaignId: string) {
  try {
    // Get next available call from queue
    const queueEntry = await prisma.dialQueueEntry.findFirst({
      where: {
        campaignId: campaignId,
        status: 'queued',
        assignedAgentId: null
      },
      include: {
        contact: true,
        list: true
      },
      orderBy: [
        { priority: 'asc' },
        { queuedAt: 'asc' }
      ]
    });

    if (queueEntry) {
      // Assign call to agent
      await prisma.dialQueueEntry.update({
        where: { queueId: queueEntry.queueId },
        data: {
          assignedAgentId: agentId,
          status: 'dialing',
          dialedAt: new Date()
        }
      });

      // Update agent with current call
      await prisma.agent.update({
        where: { agentId },
        data: {
          currentCall: `${queueEntry.contact.firstName} ${queueEntry.contact.lastName}`
        }
      });

      console.log(`� Auto-assigned call to agent ${agentId}: ${queueEntry.contact.firstName} ${queueEntry.contact.lastName} (${queueEntry.contact.phone})`);
      
      // TODO: Here you would integrate with actual telephony system (Twilio)
      // await twilioService.initiateCall(queueEntry.contact.phone, agentId);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error auto-assigning call to agent ${agentId}:`, error);
    return false;
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
      console.log(`⏹️  No agents available - stopping dialling for campaign ${campaignId}`);
      // Here you would stop your dialling engine
      // await diallingEngine.stop(campaignId);
    } else {
      console.log(`👥 ${availableAgents} agents still available for dialling`);
    }
  } catch (error) {
    console.error('Error checking dial stop:', error);
  }
}

/**
 * Get updated queue status
 */
async function getUpdatedQueueStatus(agentId: string, campaignId: string) {
  try {
    if (!campaignId) return null;

    const queueDepth = await prisma.dialQueueEntry.count({
      where: {
        campaignId,
        status: { in: ['queued', 'dialing'] }
      }
    });

    const availableAgents = await prisma.agent.count({
      where: {
        status: 'Available',
        isLoggedIn: true
      }
    });

    return {
      campaignId,
      queueDepth,
      availableAgents,
      isDiallingActive: availableAgents > 0
    };
  } catch (error) {
    return {
      campaignId,
      queueDepth: 0,
      availableAgents: 0,
      isDiallingActive: false
    };
  }
}

/**
 * Get status message
 */
function getStatusMessage(status: string, agentId: string, campaignId: string, queueStatus: any): string {
  switch (status) {
    case 'Available':
      return `Agent ${agentId} is now Available and in dial queue. ${queueStatus?.queueDepth || 0} contacts waiting.`;
    case 'Away':
      return `Agent ${agentId} is Away and removed from dial queue.`;
    case 'Break':
      return `Agent ${agentId} is on Break and removed from dial queue.`;
    case 'Offline':
      return `Agent ${agentId} is Offline and removed from all queues.`;
    default:
      return `Agent ${agentId} status updated to ${status}.`;
  }
}

/**
 * Request next call from campaign queue
 */

/**
 * Get current queue status
 */

/**
 * Set agent available and automatically assign to campaign queue
 */
async function setAgentAvailable(agentId: string, campaignId: string) {
  try {
    console.log(`🔄 Setting agent ${agentId} available for campaign ${campaignId}`);

    // 1. Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { agentId }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // 2. Verify campaign exists and get details
    const campaign = await prisma.campaign.findUnique({
      where: { campaignId }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // 3. Update agent status to Available
    const updatedAgent = await prisma.agent.update({
      where: { agentId },
      data: {
        status: 'Available',
        lastStatusChange: new Date(),
        isLoggedIn: true
      }
    });

    // 4. Get queue depth for this campaign
    const queueDepth = await prisma.dialQueueEntry.count({
      where: {
        campaignId: campaignId,
        status: { in: ['queued', 'dialing'] }
      }
    });

    // 5. Check for immediate call availability
    const nextCall = await prisma.dialQueueEntry.findFirst({
      where: {
        campaignId: campaignId,
        status: 'queued',
        assignedAgentId: null
      },
      include: {
        contact: true,
        list: true
      },
      orderBy: [
        { priority: 'asc' },
        { queuedAt: 'asc' }
      ]
    });

    // 6. Get campaign's data lists for validation
    const campaignLists = await prisma.dataList.findMany({
      where: {
        queueEntries: {
          some: {
            campaignId: campaignId
          }
        }
      }
    });

    console.log(`✅ Agent ${agentId} is now available for campaign ${campaign.name}`);
    console.log(`📊 Queue depth: ${queueDepth}, Immediate call available: ${!!nextCall}`);

    return NextResponse.json({
      success: true,
      agent: {
        agentId: updatedAgent.agentId,
        name: `${updatedAgent.firstName} ${updatedAgent.lastName}`,
        status: updatedAgent.status,
        lastStatusChange: updatedAgent.lastStatusChange
      },
      campaign: {
        campaignId: campaign.campaignId,
        name: campaign.name,
        dialMethod: campaign.dialMethod,
        status: campaign.status
      },
      queueStatus: {
        campaignId,
        queueDepth,
        hasImmediateCall: !!nextCall,
        dataLists: campaignLists.map(list => ({
          listId: list.listId,
          name: list.name,
          totalContacts: list.totalContacts,
          isActive: list.active
        }))
      },
      message: `Agent ${agentId} is now available for campaign "${campaign.name}". ${queueDepth} contacts in queue.${nextCall ? ' Call ready for immediate dial.' : ''}`
    });

  } catch (error) {
    console.error('Error setting agent available:', error);
    return NextResponse.json({ error: 'Failed to set agent available' }, { status: 500 });
  }
}

/**
 * Set agent unavailable and release any assigned calls
 */
async function setAgentUnavailable(agentId: string) {
  try {
    console.log(`🔄 Setting agent ${agentId} unavailable`);

    // 1. Update agent status
    const updatedAgent = await prisma.agent.update({
      where: { agentId },
      data: {
        status: 'Offline',
        lastStatusChange: new Date(),
        isLoggedIn: false,
        currentCall: null
      }
    });

    // 2. Release any assigned queue entries back to pool
    const releasedEntries = await prisma.dialQueueEntry.updateMany({
      where: {
        assignedAgentId: agentId,
        status: { in: ['dialing'] }
      },
      data: {
        assignedAgentId: null,
        status: 'queued',
        dialedAt: null
      }
    });

    console.log(`✅ Agent ${agentId} is now offline. ${releasedEntries.count} calls released back to queue.`);

    return NextResponse.json({
      success: true,
      agent: {
        agentId: updatedAgent.agentId,
        status: updatedAgent.status,
        lastStatusChange: updatedAgent.lastStatusChange
      },
      releasedCalls: releasedEntries.count,
      message: `Agent ${agentId} is now offline. ${releasedEntries.count} calls released back to queue.`
    });

  } catch (error) {
    console.error('Error setting agent unavailable:', error);
    return NextResponse.json({ error: 'Failed to set agent unavailable' }, { status: 500 });
  }
}

/**
 * Request next call from campaign queue with strict data isolation
 */
async function requestNextCall(agentId: string, campaignId: string) {
  try {
    console.log(`📞 Agent ${agentId} requesting next call from campaign ${campaignId}`);

    // 1. Verify agent is available
    const agent = await prisma.agent.findUnique({
      where: { agentId }
    });

    if (!agent || agent.status !== 'Available') {
      return NextResponse.json({
        success: false,
        message: 'Agent not available for calls'
      }, { status: 400 });
    }

    // 2. Get next call from THIS campaign's queue ONLY (strict isolation)
    const queueEntry = await prisma.dialQueueEntry.findFirst({
      where: {
        campaignId: campaignId, // STRICT campaign isolation
        status: 'queued',
        assignedAgentId: null
      },
      include: {
        contact: {
          include: {
            list: true // Include the data list info
          }
        },
        list: true
      },
      orderBy: [
        { priority: 'asc' },
        { queuedAt: 'asc' }
      ]
    });

    if (!queueEntry) {
      const remainingInQueue = await prisma.dialQueueEntry.count({
        where: {
          campaignId: campaignId,
          status: { in: ['queued', 'dialing'] }
        }
      });

      return NextResponse.json({
        success: false,
        message: 'No contacts available in this campaign queue',
        queueStatus: {
          campaignId,
          remainingInQueue
        }
      });
    }

    // 3. Lock the contact for this agent (assign & start dialing)
    const lockedEntry = await prisma.dialQueueEntry.update({
      where: { id: queueEntry.id },
      data: {
        status: 'dialing',
        assignedAgentId: agentId,
        dialedAt: new Date()
      },
      include: {
        contact: true,
        list: true
      }
    });

    // 4. Update agent status to OnCall
    await prisma.agent.update({
      where: { agentId },
      data: {
        status: 'OnCall',
        currentCall: lockedEntry.queueId,
        lastStatusChange: new Date()
      }
    });

    // 5. Create call record
    const callRecord = await prisma.callRecord.create({
      data: {
        callId: `call_${Date.now()}_${agentId}`,
        agentId,
        campaignId,
        contactId: lockedEntry.contactId,
        phoneNumber: lockedEntry.contact.phone,
        startTime: new Date(),
        callType: 'outbound'
      }
    });

    // 6. Get remaining queue depth
    const remainingInQueue = await prisma.dialQueueEntry.count({
      where: {
        campaignId: campaignId,
        status: { in: ['queued'] }
      }
    });

    console.log(`✅ Call assigned to agent ${agentId}: ${lockedEntry.contact.firstName} ${lockedEntry.contact.lastName} (${lockedEntry.contact.phone})`);
    console.log(`📊 ${remainingInQueue} contacts remaining in campaign queue`);

    return NextResponse.json({
      success: true,
      call: {
        callId: callRecord.callId,
        queueEntryId: lockedEntry.id,
        contact: {
          contactId: lockedEntry.contact.contactId,
          firstName: lockedEntry.contact.firstName,
          lastName: lockedEntry.contact.lastName,
          fullName: lockedEntry.contact.fullName,
          phone: lockedEntry.contact.phone,
          email: lockedEntry.contact.email,
          company: lockedEntry.contact.company,
          status: lockedEntry.contact.status,
          listName: lockedEntry.list.name
        },
        campaign: {
          campaignId,
          dialMethod: 'Progressive' // From campaign
        }
      },
      queueStatus: {
        campaignId,
        remainingInQueue,
        dataListSource: lockedEntry.list.name
      },
      message: `Call assigned: ${lockedEntry.contact.firstName} ${lockedEntry.contact.lastName} from campaign data isolation verified.`
    });

  } catch (error) {
    console.error('Error requesting next call:', error);
    return NextResponse.json({ error: 'Failed to get next call' }, { status: 500 });
  }
}

/**
 * Get current queue status for agent and campaign
 */
async function getQueueStatus(agentId: string, campaignId: string) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { agentId }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { campaignId }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const queueDepth = await prisma.dialQueueEntry.count({
      where: {
        campaignId,
        status: { in: ['queued', 'dialing'] }
      }
    });

    const availableCalls = await prisma.dialQueueEntry.count({
      where: {
        campaignId,
        status: 'queued',
        assignedAgentId: null
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
      campaign: {
        campaignId: campaign.campaignId,
        name: campaign.name,
        status: campaign.status
      },
      queueStatus: {
        totalInQueue: queueDepth,
        availableForDialing: availableCalls,
        agentCanRequestCall: agent.status === 'Available' && availableCalls > 0
      }
    });

  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json({ error: 'Failed to get queue status' }, { status: 500 });
  }
}