import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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
    const campaign = await prisma.campaign.findFirst({
      where: { 
        campaignId: campaignId,
        status: 'active'
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found or inactive'
      });
    }

    // Create or update campaign assignment
    const assignment = await prisma.campaignAssignment.upsert({
      where: {
        campaignId_userId: {
          campaignId: campaignId,
          userId: userId
        }
      },
      update: {
        isActive: true
      },
      create: {
        userId: userId,
        campaignId: campaignId,
        role: 'AGENT',
        assignmentType: 'FULL',
        isActive: true
      }
    });

    console.log(`✅ Agent ${userId} successfully joined campaign ${campaignId} queue`);

    res.json({
      success: true,
      message: `Successfully joined ${campaign.name} outbound queue`,
      assignment: {
        campaignId: campaignId,
        campaignName: campaign.name,
        isActive: assignment.isActive,
        dialMethod: campaign.dialMethod,
        joinedAt: assignment.assignedAt
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
    const { campaignId, userId } = req.body;
    
    console.log(`🚪 Agent ${userId} leaving campaign ${campaignId} queue...`);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Deactivate agent campaign assignment
    if (campaignId) {
      await prisma.campaignAssignment.updateMany({
        where: { 
          userId: userId,
          campaignId: campaignId 
        },
        data: { isActive: false }
      });
    } else {
      // Deactivate all assignments for the agent
      await prisma.campaignAssignment.updateMany({
        where: { userId: userId },
        data: { isActive: false }
      });
    }

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
    
    // For simplicity, let's just return that user is not in queue for now
    // We can enhance this later when we have proper ManagementCampaign data
    res.json({
      success: true,
      inQueue: false,
      queueStatus: null
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