/**
 * Sentiment Analysis API Routes
 * Real-time sentiment analysis and coaching endpoints
 */

import { Router } from 'express';
import * as sentimentController from '../controllers/sentimentAnalysis';
import { authenticateToken, requirePermission } from '../middleware/enhancedAuth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * POST /api/sentiment/analyze-text
 * Analyze sentiment of a single text snippet
 * Required permission: calls:monitor
 */
router.post('/analyze-text', 
  requirePermission('calls:monitor'),
  sentimentController.analyzeText
);

/**
 * POST /api/sentiment/analyze-call
 * Analyze complete call transcript for comprehensive insights
 * Required permission: calls:monitor
 */
router.post('/analyze-call',
  requirePermission('calls:monitor'),
  sentimentController.analyzeCall
);

/**
 * GET /api/sentiment/coaching/:callId
 * Get real-time coaching recommendations for active call
 * Required permission: agents:coach
 */
router.get('/coaching/:callId',
  requirePermission('agents:coach'),
  sentimentController.getCoachingRecommendations
);

/**
 * GET /api/sentiment/compliance/:callId
 * Monitor call quality and compliance in real-time
 * Required permission: calls:monitor
 */
router.get('/compliance/:callId',
  requirePermission('calls:monitor'),
  sentimentController.getComplianceMonitoring
);

/**
 * POST /api/sentiment/live-analysis
 * Real-time analysis endpoint for live calls
 * Required permission: calls:monitor
 */
router.post('/live-analysis',
  requirePermission('calls:monitor'),
  sentimentController.liveAnalysis
);

/**
 * GET /api/sentiment/dashboard/:agentId
 * Get sentiment analysis dashboard data for supervisor
 * Required permission: reports:read
 */
router.get('/dashboard/:agentId',
  requirePermission('reports:read'),
  sentimentController.getDashboardData
);

export default router;