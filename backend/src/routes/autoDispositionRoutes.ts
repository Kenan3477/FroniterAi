/**
 * Auto-Disposition Routes
 * API endpoints for AI-powered disposition recommendations
 */

import { Router } from 'express';
import AutoDispositionController from '../controllers/autoDispositionController';
import { authenticateToken } from '../middleware/enhancedAuth';
import { requireRole } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Disposition recommendation endpoints
router.post('/recommend/:callId',
  requireRole('agent', 'supervisor', 'admin'),
  AutoDispositionController.generateRecommendation
);

router.post('/apply/:callId',
  requireRole('agent', 'supervisor', 'admin'),
  AutoDispositionController.applyRecommendation
);

// Feedback and learning endpoints
router.post('/feedback/:recommendationId',
  requireRole('agent', 'supervisor', 'admin'),
  AutoDispositionController.updateDispositionFeedback
);

// Analytics and reporting endpoints
router.get('/analytics',
  requireRole('supervisor', 'admin'),
  AutoDispositionController.getDispositionAnalytics
);

router.get('/accuracy',
  requireRole('supervisor', 'admin'),
  AutoDispositionController.getAccuracyMetrics
);

// Configuration endpoints (admin only)
router.put('/config',
  requireRole('admin'),
  AutoDispositionController.updateConfiguration
);

router.get('/available-dispositions/:campaignId',
  requireRole('agent', 'supervisor', 'admin'),
  AutoDispositionController.getAvailableDispositions
);

// Model performance endpoints
router.get('/model-performance',
  requireRole('admin'),
  AutoDispositionController.getModelPerformance
);

export default router;