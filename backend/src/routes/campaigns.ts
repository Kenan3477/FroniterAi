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
        select: {
          id: true,
          name: true,
          dialMethod: true,
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
      // Enhanced error handling with proper logging and user feedback
      console.error('⚠️ Database connection failed:', dbError);
      console.log('🔄 Falling back to demo data due to database unavailability');
      
      // In production, this should trigger alerts and proper error monitoring
      // For now, provide demo data with clear indication of system state
      mappedCampaigns = [
        {
          campaignId: 'demo-camp-1',
          name: 'Lead Generation (Demo Data)',
          status: 'active',
          dialMethod: 'POWER',
          description: 'Generate new leads for sales team - DATABASE NOT AVAILABLE'
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
      
      // Add warning header to indicate demo mode
      res.set('X-System-Status', 'DEMO_MODE_DATABASE_UNAVAILABLE');
    }
    
    res.json({
      success: true,
      campaigns: mappedCampaigns,
      data: mappedCampaigns,
      // Include system status in response for frontend awareness
      systemStatus: mappedCampaigns[0]?.campaignId?.startsWith('demo-') ? 'DEMO_MODE' : 'OPERATIONAL'
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