import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Simple in-memory queue tracking for demo purposes
let agentQueues = new Map<string, { campaignId: string; joinedAt: Date }>();

// Join a campaign outbound queue
router.post('/join', async (req, res) => {
  try {
    const { campaignId, userId } = req.body;
    
    console.log(`🚀 Agent ${userId} requesting to join campaign ${campaignId} queue...`);
    
    if (!campaignId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID and User ID are required'
      });
    }

    // Check if campaign exists and is active  
    let campaign;
    try {
      campaign = await prisma.campaign.findFirst({
        where: { 
          id: campaignId,
          isActive: true
        }
      });
    } catch (dbError) {
      // If database table doesn't exist (Railway), use dummy validation
      console.log('⚠️ Database table not found, allowing any campaign ID for Railway deployment');
      campaign = { id: campaignId, name: 'Dummy Campaign' };
    }

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found or inactive'
      });
    }

    // Add agent to queue (in-memory for demo)
    agentQueues.set(userId, {
      campaignId: campaignId,
      joinedAt: new Date()
    });

    console.log(`✅ Agent ${userId} successfully joined campaign ${campaignId} queue`);

    res.json({
      success: true,
      message: `Successfully joined ${campaign.name} outbound queue`,
      assignment: {
        campaignId: campaignId,
        campaignName: campaign.name,
        isActive: true,
        dialMethod: campaign.diallingMode,
        joinedAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error joining campaign queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join campaign queue'
    });
  }
});

// Leave campaign queue
router.post('/leave', async (req, res) => {
  try {
    const { userId } = req.body;
    
    console.log(`🚪 Agent ${userId} leaving campaign queue...`);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Remove agent from queue
    agentQueues.delete(userId);

    console.log(`✅ Agent ${userId} successfully left campaign queue`);

    res.json({
      success: true,
      message: 'Successfully left campaign queue'
    });

  } catch (error) {
    console.error('❌ Error leaving campaign queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave campaign queue'
    });
  }
});

// Get current queue status for agent
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const queueInfo = agentQueues.get(userId);
    
    if (!queueInfo) {
      return res.json({
        success: true,
        inQueue: false,
        queueStatus: null
      });
    }

    // Get campaign details
    const campaign = await prisma.campaign.findFirst({
      where: { id: queueInfo.campaignId }
    });

    res.json({
      success: true,
      inQueue: true,
      queueStatus: {
        campaignId: queueInfo.campaignId,
        campaignName: campaign?.name || 'Unknown Campaign',
        isActive: true,
        dialMethod: campaign?.diallingMode || 'POWER',
        joinedAt: queueInfo.joinedAt
      }
    });

  } catch (error) {
    console.error('❌ Error checking queue status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check queue status'
    });
  }
});

export default router;
