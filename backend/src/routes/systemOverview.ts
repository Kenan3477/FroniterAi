import { Router } from 'express';
import {
  getSystemOverview,
  getSystemHealth,
} from '../controllers/systemOverview';

const router = Router();

/**
 * System Overview Routes
 * Provides basic system statistics and health information
 */

// GET /api/admin/system/overview
router.get('/overview', getSystemOverview);

// GET /api/admin/system/health
router.get('/health', getSystemHealth);

export default router;