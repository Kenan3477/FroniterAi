/**
 * Omnivox AI Flow Optimization Routes
 * API endpoints for AI-powered flow optimization and performance analysis
 */

import express from 'express';
import {
  analyzeFlow,
  optimizeFlow,
  getFlowInsights,
  setupABTest,
  getOptimizationDashboard,
  getFlowPredictions,
  getABTestResults,
  getOptimizationHistory
} from '../controllers/flowOptimization';

const router = express.Router();

// Flow analysis and optimization endpoints
router.post('/flows/:flowId/analyze', analyzeFlow);
router.post('/flows/:flowId/optimize', optimizeFlow);
router.get('/flows/:flowId/insights', getFlowInsights);
router.get('/flows/:flowId/predictions', getFlowPredictions);

// A/B testing endpoints
router.post('/flows/:flowId/ab-test', setupABTest);
router.get('/ab-tests/:testId/results', getABTestResults);

// Dashboard and reporting endpoints
router.get('/dashboard', getOptimizationDashboard);
router.get('/history', getOptimizationHistory);

export default router;