/**
 * Lead Scoring Routes
 * API endpoints for AI-driven lead scoring and prioritization
 */

import { Router } from 'express';
import LeadScoringController from '../controllers/leadScoringController';
import { authenticateToken } from '../middleware/enhancedAuth';
import { requireRole } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Lead scoring endpoints
router.post('/calculate/:contactId',
  requireRole('agent', 'supervisor', 'admin'),
  LeadScoringController.calculateContactScore
);

router.get('/score/:contactId',
  requireRole('agent', 'supervisor', 'admin'),
  LeadScoringController.calculateContactScore
);

router.post('/batch-calculate',
  requireRole('supervisor', 'admin'),
  LeadScoringController.batchCalculateScores
);

// Campaign prioritization endpoints
router.get('/prioritized/:campaignId',
  requireRole('agent', 'supervisor', 'admin'),
  LeadScoringController.getCampaignPrioritizedList
);

router.get('/optimal-timing/:contactId',
  requireRole('agent', 'supervisor', 'admin'),
  LeadScoringController.getNextBestContacts
);

// Analytics and reporting endpoints
router.get('/analytics',
  requireRole('supervisor', 'admin'),
  LeadScoringController.getLeadScoringAnalytics
);

router.get('/performance-metrics',
  requireRole('supervisor', 'admin'),
  LeadScoringController.getLeadScoringAnalytics
);

router.get('/conversion-tracking',
  requireRole('supervisor', 'admin'),
  LeadScoringController.getLeadScoringAnalytics
);

// Configuration endpoints (admin only)
router.put('/config',
  requireRole('admin'),
  LeadScoringController.updateScoreFromInteraction
);

router.get('/scoring-factors',
  requireRole('supervisor', 'admin'),
  LeadScoringController.getLeadScoringAnalytics
);

// Model training and updates
router.post('/retrain-model',
  requireRole('admin'),
  LeadScoringController.batchCalculateScores
);

router.get('/model-status',
  requireRole('admin'),
  LeadScoringController.getScoreTrends
);

export default router;