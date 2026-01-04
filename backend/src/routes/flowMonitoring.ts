/**
 * Omnivox AI Flow Monitoring Routes
 * API endpoints for real-time flow monitoring and analytics dashboard
 */

import express from 'express';
import {
  getFlowMetrics,
  getRealTimeStatus,
  getPerformanceMetrics,
  getFlowErrors,
  getMonitoringDashboard,
  getFlowExecutionTimeline,
  exportMonitoringData
} from '../controllers/flowMonitoring';

const router = express.Router();

// Real-time flow monitoring endpoints
router.get('/flows/:flowId/status', getRealTimeStatus);
router.get('/flows/:flowId/metrics', getPerformanceMetrics);
router.get('/flows/:flowId/errors', getFlowErrors);
router.get('/flows/:flowId/timeline', getFlowExecutionTimeline);

// Dashboard and aggregated monitoring endpoints
router.get('/dashboard', getMonitoringDashboard);
router.get('/metrics', getFlowMetrics);
router.post('/export', exportMonitoringData);

export default router;