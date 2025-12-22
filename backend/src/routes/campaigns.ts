/**
 * Omnivox AI Campaign API Routes
 * Production-ready campaign management replacing sample campaign endpoints
 */

import express from 'express';
import {
  createCampaign,
  updateCampaign,
  getCampaignById,
  searchCampaigns,
  getCampaignStats,
  assignAgentToCampaign,
  removeAgentFromCampaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignSearchFilters
} from '../services/campaignService';

const router = express.Router();

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
      console.log('🔄 Database unavailable - returning empty campaigns array');
      
      // In production, this should trigger alerts and proper error monitoring
      // Return empty array instead of demo data - forces proper error handling in UI
      mappedCampaigns = [];
      
      // Set error header to indicate database issue
      res.set('X-System-Status', 'DATABASE_UNAVAILABLE');
    }
    
    res.json({
      success: true,
      campaigns: mappedCampaigns,
      data: mappedCampaigns,
      // Include system status in response for frontend awareness
      systemStatus: mappedCampaigns.length > 0 ? 'OPERATIONAL' : 'DATABASE_ISSUE'
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