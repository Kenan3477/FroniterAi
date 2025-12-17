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
        isActive: true
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        diallingMode: true,
        description: true
      }
    });

    console.log(`✅ Found ${campaigns.length} active campaigns`);
    
    // Map database fields to frontend expected format
    const mappedCampaigns = campaigns.map(campaign => ({
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.isActive ? 'active' : 'inactive',
      dialMethod: campaign.diallingMode,
      description: campaign.description
    }));
    
    res.json({
      success: true,
      campaigns: mappedCampaigns,
      data: mappedCampaigns
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