/**
 * Sentiment Analysis Routes
 * API endpoints for real-time sentiment analysis and emotion detection
 */

import { Router } from 'express';
import SentimentAnalysisController from '../controllers/sentimentAnalysisController';
import { authenticateToken } from '../middleware/enhancedAuth';
import { requireRole } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Text analysis endpoints
router.post('/analyze-text', 
  requireRole('agent', 'supervisor', 'admin'),
  SentimentAnalysisController.analyzeText
);

router.post('/analyze-call',
  requireRole('agent', 'supervisor', 'admin'),
  SentimentAnalysisController.analyzeCallTranscript
);

// Real-time sentiment endpoints
router.get('/real-time/:callId',
  requireRole('agent', 'supervisor', 'admin'),
  SentimentAnalysisController.getRealTimeSentiment
);

router.get('/history/:callId',
  requireRole('agent', 'supervisor', 'admin'),
  SentimentAnalysisController.getSentimentHistory
);

// Analytics and reporting endpoints
router.get('/analytics',
  requireRole('supervisor', 'admin'),
  SentimentAnalysisController.getSentimentAnalytics
);

router.get('/coaching/:agentId',
  requireRole('supervisor', 'admin'),
  SentimentAnalysisController.getCoachingSuggestions
);

// Configuration endpoints (admin only)
router.put('/config',
  requireRole('admin'),
  SentimentAnalysisController.updateConfiguration
);

// Export endpoints (supervisor/admin only)
router.get('/export',
  requireRole('supervisor', 'admin'),
  SentimentAnalysisController.exportSentimentData
);

export default router;