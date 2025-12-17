import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all available campaigns for a user
router.get('/', async (req, res) => {
  try {
    console.log('📋 Fetching campaigns...');
    
    // For now, get all active campaigns
    // TODO: In production, filter by user permissions/assignments
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'active'
      },
      select: {
        campaignId: true,
        name: true,
        status: true,
        dialMethod: true,
        description: true
      }
    });

    console.log(`✅ Found ${campaigns.length} active campaigns`);
    
    res.json({
      success: true,
      campaigns: campaigns,
      data: campaigns
    });
  } catch (error) {
    console.error('❌ Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns',
      campaigns: [],
      data: []
    });
  }
});

export default router;