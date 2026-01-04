import { Router } from 'express';
import {
  getFlows,
  getFlow,
  createFlow,
  updateFlow,
  deployFlow,
  archiveFlow,
  executeFlow,
  updateFlowNode,
  validateFlow,
  simulateFlow,
} from '../controllers/flows';
import {
  getVersionHistory,
  createNewVersion,
  compareVersions,
  rollbackToVersion,
  getRollbackHistory,
  archiveOldVersions
} from '../controllers/flowVersioning';
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

const router = Router();

// Flow management routes
router.get('/', getFlows);
router.post('/', createFlow);
router.get('/:flowId', getFlow);
router.put('/:flowId', updateFlow);
router.post('/:flowId/deploy', deployFlow);
router.post('/:flowId/execute', executeFlow);
router.post('/:flowId/validate', validateFlow);
router.post('/:flowId/simulate', simulateFlow);
router.delete('/:flowId', archiveFlow);

// Flow node management routes
router.put('/:flowId/nodes/:nodeId', updateFlowNode);

// Flow versioning and rollback routes (Phase 3: Advanced Features)
router.get('/:flowId/versions/history', getVersionHistory);
router.post('/:flowId/versions/create', createNewVersion);
router.post('/:flowId/versions/compare', compareVersions);
router.post('/:flowId/versions/rollback', rollbackToVersion);
router.get('/:flowId/versions/rollbacks', getRollbackHistory);
router.delete('/:flowId/versions/archive', archiveOldVersions);

// AI-powered optimization routes (Phase 3: Advanced Features)
router.get('/optimization/dashboard', getOptimizationDashboard);
router.get('/:flowId/analyze', analyzeFlow);
router.post('/:flowId/optimize', optimizeFlow);
router.get('/:flowId/insights', getFlowInsights);
router.get('/:flowId/predictions', getFlowPredictions);
router.get('/:flowId/optimization/history', getOptimizationHistory);

// A/B testing routes (Phase 3: Advanced Features)
router.post('/:flowId/ab-test', setupABTest);
router.get('/ab-test/:testId/results', getABTestResults);

export default router;