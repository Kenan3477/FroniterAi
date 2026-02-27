/**
 * Omnivox AI Interaction History API Routes
 * Categorized call history endpoints for manual and auto-dial interactions
 */

import express from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  createInteractionRecord,
  updateInteractionOutcome,
  getCategorizedInteractions,
  trackAutoDialInteraction,
  InteractionHistoryFilters
} from '../services/interactionHistoryService';

const router = express.Router();

// Apply authentication to all interaction history routes
router.use(authenticate);

/**
 * GET /api/interaction-history/categorized
 * Get categorized interactions for call history subtabs
 */
router.get('/categorized', async (req, res) => {
  try {
    let agentId = req.query.agentId as string;
    
    // Handle special case where frontend sends "current-agent"
    if (agentId === 'current-agent') {
      console.log('⚠️ Frontend sent "current-agent" - this should be resolved to actual agentId');
      // For now, return empty results rather than error
      agentId = undefined as any;
    }

    const filters: InteractionHistoryFilters = {
      agentId: agentId,
      campaignId: req.query.campaignId as string,
      contactId: req.query.contactId as string,
      channel: req.query.channel as string,
      status: req.query.status as 'queued' | 'allocated' | 'outcomed' | 'unallocated' | 'active',
      outcome: req.query.outcome as string,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    console.log('🔍 Getting categorized interactions with filters:', filters);
    
    try {
      const categorizedInteractions = await getCategorizedInteractions(filters);
      
      res.json({
        success: true,
        data: { categories: categorizedInteractions },
        message: 'Categorized interactions retrieved successfully'
      });
    } catch (serviceError: any) {
      console.error('❌ Service error in getCategorizedInteractions:', serviceError);
      
      // Return empty categories instead of failing completely
      res.json({
        success: true,
        data: { 
          categories: {
            queued: [],
            allocated: [],
            outcomed: [],
            unallocated: [],
            totals: { queued: 0, allocated: 0, outcomed: 0, unallocated: 0 }
          }
        },
        message: 'Error retrieving interactions - returning empty results',
        warning: serviceError.message
      });
    }
  } catch (error) {
    console.error('Error getting categorized interactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categorized interactions',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * POST /api/interaction-history/record
 * Create a new interaction record for manual or auto-dial calls
 */
router.post('/record', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req, res) => {
  try {
    const {
      agentId,
      contactId,
      campaignId,
      channel,
      outcome,
      dialType,
      startedAt,
      endedAt,
      durationSeconds,
      result,
      notes
    } = req.body;

    // Validate required fields
    if (!agentId || !contactId || !campaignId || !dialType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentId, contactId, campaignId, dialType'
      });
    }

    const interactionResult = await createInteractionRecord({
      agentId,
      contactId,
      campaignId,
      channel,
      outcome,
      dialType,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      endedAt: endedAt ? new Date(endedAt) : undefined,
      durationSeconds,
      result,
      notes
    });

    if (interactionResult.success) {
      res.status(201).json(interactionResult);
    } else {
      res.status(400).json(interactionResult);
    }
  } catch (error) {
    console.error('Error creating interaction record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create interaction record',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * PUT /api/interaction-history/:interactionId/outcome
 * Update interaction outcome and handle callback scheduling
 */
router.put('/:interactionId/outcome', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req, res) => {
  try {
    const { interactionId } = req.params;
    const {
      outcome,
      endedAt,
      durationSeconds,
      result,
      notes,
      callbackScheduledFor
    } = req.body;

    if (!outcome) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: outcome'
      });
    }

    const updateResult = await updateInteractionOutcome(
      interactionId,
      outcome,
      endedAt ? new Date(endedAt) : undefined,
      durationSeconds,
      result,
      notes,
      callbackScheduledFor ? new Date(callbackScheduledFor) : undefined
    );

    if (updateResult.success) {
      res.json(updateResult);
    } else {
      res.status(400).json(updateResult);
    }
  } catch (error) {
    console.error('Error updating interaction outcome:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update interaction outcome',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * POST /api/interaction-history/auto-dial
 * Track auto-dial interactions specifically
 */
router.post('/auto-dial', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req, res) => {
  try {
    const {
      agentId,
      contactId,
      campaignId,
      dialType,
      callSid,
      startedAt,
      predictiveScore
    } = req.body;

    // Validate required fields
    if (!agentId || !contactId || !campaignId || !dialType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentId, contactId, campaignId, dialType'
      });
    }

    if (!['auto-dial', 'predictive'].includes(dialType)) {
      return res.status(400).json({
        success: false,
        error: 'dialType must be either "auto-dial" or "predictive"'
      });
    }

    const trackingResult = await trackAutoDialInteraction({
      agentId,
      contactId,
      campaignId,
      dialType,
      callSid,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      predictiveScore
    });

    if (trackingResult.success) {
      res.status(201).json(trackingResult);
    } else {
      res.status(400).json(trackingResult);
    }
  } catch (error) {
    console.error('Error tracking auto-dial interaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track auto-dial interaction',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/interaction-history/:status
 * Get interactions by specific status (for individual subtab loading)
 */
router.get('/:status', async (req, res) => {
  try {
    const { status } = req.params;
    
    if (!['queued', 'allocated', 'outcomed', 'unallocated'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: queued, allocated, outcomed, unallocated'
      });
    }

    const filters: InteractionHistoryFilters = {
      agentId: req.query.agentId as string,
      campaignId: req.query.campaignId as string,
      contactId: req.query.contactId as string,
      channel: req.query.channel as string,
      status: status as 'queued' | 'allocated' | 'outcomed' | 'unallocated',
      outcome: req.query.outcome as string,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    console.log(`🔍 Getting ${status} interactions with filters:`, filters);
    const categorizedInteractions = await getCategorizedInteractions(filters);
    
    // Return the specific category requested
    const statusData = categorizedInteractions[status as keyof typeof categorizedInteractions];
    const total = categorizedInteractions.totals[status as keyof typeof categorizedInteractions.totals];
    
    res.json({
      success: true,
      data: Array.isArray(statusData) ? statusData : [],
      total: total || 0,
      message: `${status} interactions retrieved successfully`
    });
  } catch (error) {
    console.error(`Error getting ${req.params.status} interactions:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to get ${req.params.status} interactions`,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

export default router;