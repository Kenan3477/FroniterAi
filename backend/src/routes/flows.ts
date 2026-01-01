import { Router } from 'express';
import {
  getFlows,
  getFlow,
  createFlow,
  updateFlow,
  deployFlow,
  archiveFlow,
  executeFlow,
} from '../controllers/flows';

const router = Router();

// Flow management routes
router.get('/', getFlows);
router.post('/', createFlow);
router.get('/:flowId', getFlow);
router.put('/:flowId', updateFlow);
router.post('/:flowId/deploy', deployFlow);
router.post('/:flowId/execute', executeFlow);
router.delete('/:flowId', archiveFlow);

export default router;