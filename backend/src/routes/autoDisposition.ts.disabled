/**
 * Auto-Disposition Routes
 * Phase 3: Advanced AI Dialler Implementation
 */

import express from 'express';
import { AutoDispositionController } from '../controllers/autoDispositionController';
import { authenticate, requirePermission } from '../middleware/enhancedAuth';

const router = express.Router();

// Generate AI-powered disposition recommendation
router.get(
  '/recommendation/:callId',
  authenticate,
  requirePermission('disposition.generate'),
  AutoDispositionController.generateRecommendation
);

// Apply disposition recommendation
router.post(
  '/apply/:callId',
  authenticate,
  requirePermission('disposition.apply'),
  AutoDispositionController.applyRecommendation
);

// Get disposition analytics
router.get(
  '/analytics',
  authenticate,
  requirePermission('disposition.analytics'),
  AutoDispositionController.getDispositionAnalytics
);

// Submit disposition feedback for accuracy tracking
router.post(
  '/feedback/:callId',
  authenticate,
  requirePermission('disposition.feedback'),
  AutoDispositionController.updateDispositionFeedback
);

export default router;