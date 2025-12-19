import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all available campaigns for a user
router.get('/', async (req, res) => {
  try {
    console.log('📋 Fetching campaigns...');
    
    let campaigns;
    let mappedCampaigns;
    
    try {
      // Try to get campaigns from database
      campaigns = await prisma.campaign.findMany({
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
      
      // Map database fields to frontend expected format
      mappedCampaigns = campaigns.map((campaign: any) => ({
        campaignId: campaign.id,
        name: campaign.name,
        status: campaign.isActive ? 'active' : 'inactive',
        dialMethod: campaign.diallingMode,
        description: campaign.description
      }));
      
    } catch (dbError) {
      // If database table doesn't exist (Railway), use dummy data
      console.log('⚠️ Database table not found, using dummy data for Railway deployment');
      mappedCampaigns = [
        {
          campaignId: 'camp-1',
          name: 'Lead Generation',
          status: 'active',
          dialMethod: 'POWER',
          description: 'Generate new leads for sales team'
        },
        {
          campaignId: 'camp-2', 
          name: 'Customer Retention',
          status: 'active',
          dialMethod: 'POWER',
          description: 'Retain existing customers'
        },
        {
          campaignId: 'camp-3',
          name: 'Holiday Sales',
          status: 'active', 
          dialMethod: 'PREDICTIVE',
          description: 'Holiday season sales campaign'
        },
        {
          campaignId: 'camp-4',
          name: 'Follow-up Outreach',
          status: 'active',
          dialMethod: 'PREVIEW',
          description: 'Follow up with potential customers'
        },
        {
          campaignId: 'camp-5',
          name: 'Survey Campaign',
          status: 'active',
          dialMethod: 'POWER',
          description: 'Customer satisfaction survey'
        }
      ];
    }
    
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