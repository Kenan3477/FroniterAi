/**
 * Omnivox AI Interaction API Routes
 * Production-ready interaction management replacing simulated interaction endpoints
 */

import express from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  createInteraction,
  updateInteraction,
  getInteractionById,
  searchInteractions,
  getInteractionStats,
  getDailyInteractionVolume,
  CreateInteractionRequest,
  UpdateInteractionRequest,
  InteractionSearchFilters
} from '../services/interactionService';

const router = express.Router();

// Apply authentication to all interaction routes
router.use(authenticate);

/**
 * POST /api/interactions
 * Create a new interaction
 * Requires: AGENT, SUPERVISOR, or ADMIN role
 */
router.post('/', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req, res) => {
  try {
    const interactionData: CreateInteractionRequest = req.body;
    
    // Validate required fields
    if (!interactionData.agentId || !interactionData.contactId || !interactionData.campaignId || !interactionData.outcome) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentId, contactId, campaignId, outcome'
      });
    }

    const result = await createInteraction(interactionData);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error creating interaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create interaction',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/interactions
 * Search interactions with filters
 */
router.get('/', async (req, res) => {
  try {
    const filters: InteractionSearchFilters = {
      agentId: req.query.agentId as string,
      campaignId: req.query.campaignId as string,
      contactId: req.query.contactId as string,
      channel: req.query.channel as string,
      outcome: req.query.outcome as string,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
    };

    const result = await searchInteractions(filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error searching interactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search interactions',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/interactions/:interactionId
 * Get interaction by ID
 */
router.get('/:interactionId', async (req, res) => {
  try {
    const { interactionId } = req.params;
    
    const result = await getInteractionById(interactionId);
    
    if (result.success) {
      res.json(result);
    } else if (result.error === 'Interaction not found') {
      res.status(404).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error getting interaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get interaction',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * PUT /api/interactions/:interactionId
 * Update interaction
 */
router.put('/:interactionId', async (req, res) => {
  try {
    const { interactionId } = req.params;
    const updateData: UpdateInteractionRequest = req.body;
    
    const result = await updateInteraction(interactionId, updateData);
    
    if (result.success) {
      res.json(result);
    } else if (result.error === 'Interaction not found') {
      res.status(404).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error updating interaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update interaction',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/interactions/stats
 * Get interaction statistics
 * Requires: SUPERVISOR or ADMIN role
 */
router.get('/stats/overview', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
  try {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
    
    const result = await getInteractionStats(dateFrom, dateTo);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error getting interaction stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get interaction statistics',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/interactions/daily-volume
 * Get daily interaction volume for reporting
 * Requires: SUPERVISOR or ADMIN role
 */
router.get('/daily-volume', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    
    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: 'Days parameter must be between 1 and 365'
      });
    }
    
    const result = await getDailyInteractionVolume(days);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error getting daily interaction volume:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get daily interaction volume',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

export default router;