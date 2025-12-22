/**
 * Omnivox AI Campaign API Routes
 * Production-ready campaign management replacing sample campaign endpoints
 */

import express from 'express';
import { authenticate, requireRole } from '../middleware/auth';
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

// Apply authentication to all campaign routes
router.use(authenticate);

/**
 * POST /api/campaigns
 * Create a new campaign
 * Requires: SUPERVISOR or ADMIN role
 */
router.post('/', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
  try {
    const campaignData: CreateCampaignRequest = req.body;
    
    // Validate required fields
    if (!campaignData.campaignId || !campaignData.name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: campaignId, name'
      });
    }

    const result = await createCampaign(campaignData);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/campaigns
 * Search campaigns with filters
 * Requires: Any authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const filters: CampaignSearchFilters = {
      status: req.query.status as string,
      dialMethod: req.query.dialMethod as string,
      createdById: req.query.createdById ? parseInt(req.query.createdById as string) : undefined,
      nameSearch: req.query.search as string
    };

    const result = await searchCampaigns(filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error searching campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search campaigns',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/campaigns/:campaignId
 * Get campaign by ID
 */
router.get('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const result = await getCampaignById(campaignId);
    
    if (result.success) {
      res.json(result);
    } else if (result.error === 'Campaign not found') {
      res.status(404).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error getting campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * PUT /api/campaigns/:campaignId
 * Update campaign
 * Requires: SUPERVISOR or ADMIN role
 */
router.put('/:campaignId', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
  try {
    const { campaignId } = req.params;
    const updateData: UpdateCampaignRequest = req.body;
    
    const result = await updateCampaign(campaignId, updateData);
    
    if (result.success) {
      res.json(result);
    } else if (result.error === 'Campaign not found') {
      res.status(404).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/campaigns/:campaignId/stats
 * Get campaign statistics
 */
router.get('/:campaignId/stats', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
    
    const result = await getCampaignStats(campaignId, dateFrom, dateTo);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error getting campaign stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign statistics',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/campaigns/stats/overview
 * Get overall campaign statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
    
    const result = await getCampaignStats(undefined, dateFrom, dateTo);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error getting campaign overview stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign overview statistics',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * POST /api/campaigns/:campaignId/agents/:agentId
 * Assign agent to campaign
 * Requires: SUPERVISOR or ADMIN role
 */
router.post('/:campaignId/agents/:agentId', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
  try {
    const { campaignId, agentId } = req.params;
    
    const result = await assignAgentToCampaign(campaignId, agentId);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error assigning agent to campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign agent to campaign',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * DELETE /api/campaigns/:campaignId/agents/:agentId
 * Remove agent from campaign
 * Requires: SUPERVISOR or ADMIN role
 */
router.delete('/:campaignId/agents/:agentId', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
  try {
    const { campaignId, agentId } = req.params;
    
    const result = await removeAgentFromCampaign(campaignId, agentId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error removing agent from campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove agent from campaign',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

export default router;