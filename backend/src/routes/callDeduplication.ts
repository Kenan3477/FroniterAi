/**
 * Call Deduplication API Routes
 * Provides endpoints for managing call record deduplication
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  deduplicateCallRecords,
  getDeduplicationStats,
  deduplicateRecentCall
} from '../services/callDeduplicationService';

const router = Router();

/**
 * POST /api/call-deduplication/run
 * Run deduplication on call records
 * Admin only
 */
router.post('/run', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const {
      timeWindowMinutes = 15,
      batchSize = 100,
      dryRun = false
    } = req.body;

    console.log(`🔄 Manual deduplication triggered by ${(req as any).user?.email}`);
    console.log(`   Time window: ${timeWindowMinutes} minutes`);
    console.log(`   Batch size: ${batchSize}`);
    console.log(`   Dry run: ${dryRun}`);

    const result = await deduplicateCallRecords({
      timeWindowMinutes,
      batchSize,
      dryRun
    });

    res.json({
      success: true,
      message: dryRun 
        ? 'Deduplication analysis complete (dry run - no changes made)' 
        : 'Deduplication complete',
      data: result
    });

  } catch (error: any) {
    console.error('❌ Error running deduplication:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run deduplication',
      message: error.message
    });
  }
});

/**
 * GET /api/call-deduplication/stats
 * Get deduplication statistics
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = await getDeduplicationStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('❌ Error getting deduplication stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get deduplication stats',
      message: error.message
    });
  }
});

/**
 * POST /api/call-deduplication/check/:callId
 * Check a specific call for duplicates
 */
router.post('/check/:callId', authenticate, async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    console.log(`🔍 Manual duplicate check for call: ${callId}`);
    
    await deduplicateRecentCall(callId);

    res.json({
      success: true,
      message: `Deduplication check complete for ${callId}`
    });

  } catch (error: any) {
    console.error(`❌ Error checking call ${req.params.callId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to check call for duplicates',
      message: error.message
    });
  }
});

export default router;
