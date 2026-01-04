/**
 * Flow Versioning Routes
 * Advanced version control and rollback endpoints
 * Part of Phase 3: Advanced Features (Enhancement)
 */

import { Router } from 'express';
import {
  getVersionHistory,
  createNewVersion,
  compareVersions,
  rollbackToVersion,
  getRollbackHistory,
  archiveOldVersions
} from '../controllers/flowVersioning';

const router = Router({ mergeParams: true });

// Version history and management
router.get('/:flowId/versions/history', getVersionHistory);
router.post('/:flowId/versions/create', createNewVersion);
router.post('/:flowId/versions/compare', compareVersions);

// Rollback operations
router.post('/:flowId/versions/rollback', rollbackToVersion);
router.get('/:flowId/versions/rollbacks', getRollbackHistory);

// Version lifecycle management
router.delete('/:flowId/versions/archive', archiveOldVersions);

export default router;