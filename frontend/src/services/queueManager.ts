/**
 * Queue Management Service
 * Automatically starts/stops dialling based on agent availability
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface QueueManager {
  campaignId: string;
  isActive: boolean;
  availableAgents: number;
  lastUpdate: Date;
}

// In-memory queue state tracking
const queueManagers = new Map<string, QueueManager>();

/**
 * Check and manage dialling status for a campaign
 */
export async function manageDiallingForCampaign(campaignId: string) {
  try {
    // Get current available agents count FOR THIS SPECIFIC CAMPAIGN
    const availableAgents = await prisma.agent.count({
      where: {
        status: 'Available',
        isLoggedIn: true,
        campaignAssignments: {
          some: {
            campaignId: campaignId,
            isActive: true
          }
        }
      }
    });

    // Get current queue manager state
    const currentState = queueManagers.get(campaignId) || {
      campaignId,
      isActive: false,
      availableAgents: 0,
      lastUpdate: new Date()
    };

    const wasActive = currentState.isActive;
    const shouldBeActive = availableAgents > 0;

    // Update state
    const newState: QueueManager = {
      campaignId,
      isActive: shouldBeActive,
      availableAgents,
      lastUpdate: new Date()
    };

    queueManagers.set(campaignId, newState);

    // Handle state changes
    if (!wasActive && shouldBeActive) {
      // START DIALLING
      await startDiallingForCampaign(campaignId, availableAgents);
      
    } else if (wasActive && !shouldBeActive) {
      // STOP DIALLING
      await stopDiallingForCampaign(campaignId);
      
    } else if (shouldBeActive && availableAgents !== currentState.availableAgents) {
      // ADJUST DIALLING PACE
      await adjustDiallingPaceForCampaign(campaignId, availableAgents);
    }

    return newState;

  } catch (error) {
    console.error(`Error managing dialling for campaign ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Start dialling for campaign (first agent available)
 */
async function startDiallingForCampaign(campaignId: string, agentCount: number) {
  console.log(`🎯 STARTING DIALLING for campaign ${campaignId} - ${agentCount} agents available`);
  
  try {
    // Get campaign details
    const campaign = await prisma.campaign.findUnique({
      where: { campaignId }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Check if there are contacts in queue
    const queueDepth = await prisma.dialQueueEntry.count({
      where: {
        campaignId,
        status: 'queued'
      }
    });

    if (queueDepth === 0) {
      console.log(`📭 No contacts in queue for campaign ${campaignId} - dialling not started`);
      return;
    }

    // TODO: Start actual dialling engine based on campaign dial method
    switch (campaign.dialMethod) {
      case 'Progressive':
        await startProgressiveDialling(campaignId, agentCount, queueDepth);
        break;
      case 'Predictive':
        await startPredictiveDialling(campaignId, agentCount, queueDepth);
        break;
      case 'Power':
        await startPowerDialling(campaignId, agentCount, queueDepth);
        break;
      default:
        await startProgressiveDialling(campaignId, agentCount, queueDepth);
    }

    console.log(`✅ DIALLING STARTED for campaign ${campaignId} (${campaign.dialMethod})`);

  } catch (error) {
    console.error(`Error starting dialling for campaign ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Stop dialling for campaign (no agents available)
 */
async function stopDiallingForCampaign(campaignId: string) {
  console.log(`⏹️  STOPPING DIALLING for campaign ${campaignId} - no agents available`);
  
  try {
    // Release any assigned calls back to queue
    const releasedCalls = await prisma.dialQueueEntry.updateMany({
      where: {
        campaignId,
        status: 'dialing',
        assignedAgentId: { not: null }
      },
      data: {
        status: 'queued',
        assignedAgentId: null,
        dialedAt: null
      }
    });

    console.log(`📋 Released ${releasedCalls.count} calls back to queue`);

    // TODO: Stop actual dialling engine
    // await diallingEngine.stop(campaignId);

    console.log(`✅ DIALLING STOPPED for campaign ${campaignId}`);

  } catch (error) {
    console.error(`Error stopping dialling for campaign ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Adjust dialling pace for campaign (agent count changed)
 */
async function adjustDiallingPaceForCampaign(campaignId: string, newAgentCount: number) {
  console.log(`📊 ADJUSTING DIALLING PACE for campaign ${campaignId} - ${newAgentCount} agents`);
  
  try {
    // TODO: Adjust dialling engine pace based on agent count
    // await diallingEngine.adjustPace(campaignId, newAgentCount);

    console.log(`✅ DIALLING PACE ADJUSTED for campaign ${campaignId}`);

  } catch (error) {
    console.error(`Error adjusting dialling pace for campaign ${campaignId}:`, error);
  }
}

/**
 * Progressive dialling: One call per agent
 */
async function startProgressiveDialling(campaignId: string, agentCount: number, queueDepth: number) {
  console.log(`📞 Starting Progressive dialling: ${agentCount} agents, ${queueDepth} contacts`);
  
  // Progressive dialling places one call per available agent
  // The actual dialing would be handled by your WebRTC/SIP client
  
  // For now, just log the intent
  console.log(`🎯 Progressive dialling mode: Ready to assign ${Math.min(agentCount, queueDepth)} calls`);
}

/**
 * Predictive dialling: Multiple calls per agent based on prediction
 */
async function startPredictiveDialling(campaignId: string, agentCount: number, queueDepth: number) {
  console.log(`🤖 Starting Predictive dialling: ${agentCount} agents, ${queueDepth} contacts`);
  
  // Predictive dialling uses algorithms to predict agent availability
  const campaign = await prisma.campaign.findUnique({ 
    where: { campaignId } 
  });
  const dialRatio = campaign?.dialRatio || 1.2; // Default 1.2:1 ratio
  
  const callsToPlace = Math.floor(agentCount * dialRatio);
  const actualCalls = Math.min(callsToPlace, queueDepth);
  
  console.log(`🎯 Predictive dialling mode: Placing ${actualCalls} calls for ${agentCount} agents (${dialRatio}:1 ratio)`);
}

/**
 * Power dialling: Rapid sequential calling
 */
async function startPowerDialling(campaignId: string, agentCount: number, queueDepth: number) {
  console.log(`⚡ Starting Power dialling: ${agentCount} agents, ${queueDepth} contacts`);
  
  // Power dialling places calls rapidly as agents become available
  console.log(`🎯 Power dialling mode: Rapid call placement for ${agentCount} agents`);
}

/**
 * Get current queue management status
 */
export function getQueueManagerStatus(campaignId?: string) {
  if (campaignId) {
    return queueManagers.get(campaignId) || null;
  }
  
  // Return all queue managers
  return Array.from(queueManagers.values());
}

/**
 * Get overall dialling system status
 */
export async function getDiallingSystemStatus() {
  try {
    const totalAvailableAgents = await prisma.agent.count({
      where: {
        status: 'Available',
        isLoggedIn: true
      }
    });

    const activeCampaigns = Array.from(queueManagers.values()).filter(manager => manager.isActive);

    const totalQueuedCalls = await prisma.dialQueueEntry.count({
      where: {
        status: 'queued'
      }
    });

    const totalActiveDialling = await prisma.dialQueueEntry.count({
      where: {
        status: 'dialing'
      }
    });

    return {
      totalAvailableAgents,
      activeCampaigns: activeCampaigns.length,
      totalQueuedCalls,
      totalActiveDialling,
      isSystemActive: totalAvailableAgents > 0,
      campaigns: Array.from(queueManagers.values())
    };

  } catch (error) {
    console.error('Error getting dialling system status:', error);
    throw error;
  }
}