import { Router } from 'express';
import {
  getFlowVersion,
  createNode,
  updateNode,
  deleteNode,
  createEdge,
  updateEdge,
  deleteEdge,
} from '../controllers/flowVersions';

const router = Router({ mergeParams: true });

// Flow version routes
router.get('/:versionId', getFlowVersion);

// Node management routes
router.post('/:versionId/nodes', createNode);
router.patch('/:versionId/nodes/:nodeId', updateNode);
router.delete('/:versionId/nodes/:nodeId', deleteNode);

// Edge management routes
router.post('/:versionId/edges', createEdge);
router.patch('/:versionId/edges/:edgeId', updateEdge);
router.delete('/:versionId/edges/:edgeId', deleteEdge);

export default router;