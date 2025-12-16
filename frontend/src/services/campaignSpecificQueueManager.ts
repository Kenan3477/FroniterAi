/**
 * Campaign-Specific Queue Management Service
 * Automatically starts/stops dialling based on agent availability PER CAMPAIGN
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Check and manage dialling status for a specific campaign
 * Only considers agents assigned to this campaign
 */
export async function manageCampaignDialling(campaignId: string) {
  try {
    console.log(`🔍 Checking dialling status for campaign: ${campaignId}`);

    // Get available agents assigned to THIS SPECIFIC CAMPAIGN ONLY
    const availableAgentsForCampaign = await prisma.agent.count({
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

    console.log(`👥 Campaign ${campaignId} has ${availableAgentsForCampaign} available agents assigned`);

    // Check if there are contacts in queue for this campaign
    const queueDepth = await prisma.dialQueueEntry.count({
      where: {
        campaignId,
        status: 'queued'
      }
    });

    console.log(`📋 Campaign ${campaignId} has ${queueDepth} contacts in queue`);

    if (availableAgentsForCampaign === 0) {
      // NO AGENTS AVAILABLE - STOP DIALLING FOR THIS CAMPAIGN ONLY
      console.log(`🛑 NO agents available for campaign ${campaignId} - STOPPING dialling for this campaign only`);
      await stopDiallingForCampaign(campaignId);
      
    } else if (queueDepth === 0) {
      // NO CONTACTS TO DIAL - STOP DIALLING FOR THIS CAMPAIGN
      console.log(`📭 NO contacts in queue for campaign ${campaignId} - stopping dialling`);
      await stopDiallingForCampaign(campaignId);
      
    } else {
      // AGENTS AVAILABLE AND CONTACTS IN QUEUE - START/CONTINUE DIALLING
      console.log(`✅ Campaign ${campaignId}: ${availableAgentsForCampaign} agents available, ${queueDepth} contacts queued - dialling active`);
      await startDiallingForCampaign(campaignId, availableAgentsForCampaign);
    }

    return {
      campaignId,
      availableAgents: availableAgentsForCampaign,
      queueDepth,
      status: availableAgentsForCampaign > 0 && queueDepth > 0 ? 'dialling' : 'stopped'
    };

  } catch (error) {
    console.error(`❌ Error managing campaign ${campaignId} dialling:`, error);
    throw error;
  }
}

/**
 * Start dialling for a specific campaign
 */
async function startDiallingForCampaign(campaignId: string, agentCount: number) {
  console.log(`🎯 STARTING dialling for campaign ${campaignId} with ${agentCount} agents`);
  
  try {
    // Get campaign details
    const campaign = await prisma.campaign.findUnique({
      where: { campaignId }
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // Log the dialling strategy
    const dialMethod = campaign.dialMethod || 'Progressive';
    console.log(`📞 Campaign ${campaignId} using ${dialMethod} dialling mode`);

    // Here you would integrate with your actual dialling engine
    // For now, just log the action
    console.log(`✅ DIALLING ACTIVE for campaign ${campaignId}`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error starting dialling for campaign ${campaignId}:`, error);
    return false;
  }
}

/**
 * Stop dialling for a specific campaign
 */
async function stopDiallingForCampaign(campaignId: string) {
  console.log(`🛑 STOPPING dialling for campaign ${campaignId}`);
  
  try {
    // Release any calls currently being dialed for this campaign
    const releasedEntries = await prisma.dialQueueEntry.updateMany({
      where: {
        campaignId,
        status: 'dialing'
      },
      data: {
        status: 'queued',
        assignedAgentId: null
      }
    });

    console.log(`📋 Released ${releasedEntries.count} calls back to queue for campaign ${campaignId}`);
    
    // Here you would integrate with your actual dialling engine to stop dialling
    console.log(`⏹️ DIALLING STOPPED for campaign ${campaignId}`);
    
    return releasedEntries.count;
    
  } catch (error) {
    console.error(`❌ Error stopping dialling for campaign ${campaignId}:`, error);
    return 0;
  }
}

/**
 * Get all campaigns that should have dialling managed
 */
export async function getAllActiveCampaigns() {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: { not: 'Inactive' }
      },
      select: {
        campaignId: true,
        name: true,
        status: true
      }
    });

    return campaigns;
  } catch (error) {
    console.error('❌ Error getting active campaigns:', error);
    return [];
  }
}

/**
 * Manage dialling for all active campaigns
 * This ensures campaign isolation - each campaign operates independently
 */
export async function manageAllCampaignDialling() {
  try {
    const activeCampaigns = await getAllActiveCampaigns();
    
    console.log(`🎯 Managing dialling for ${activeCampaigns.length} active campaigns`);
    
    const results = await Promise.all(
      activeCampaigns.map(campaign => manageCampaignDialling(campaign.campaignId))
    );
    
    return results;
  } catch (error) {
    console.error('❌ Error managing all campaign dialling:', error);
    throw error;
  }
}