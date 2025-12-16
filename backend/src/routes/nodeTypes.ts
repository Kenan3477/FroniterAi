import { Router } from 'express';
import {
  getNodeTypes,
  getNodeType,
} from '../controllers/nodeTypes';

const router = Router();

// Node types routes
router.get('/', getNodeTypes);
router.get('/:type', getNodeType);

export default router;