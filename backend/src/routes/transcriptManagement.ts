/**
 * Omnivox AI Transcription Management API
 * Administrative endpoints for managing transcription system
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/enhancedAuth';
import { configurationService } from '../services/configurationService';
import { audioFileService } from '../services/audioFileService';
import { transcriptionWorker, transcriptionQueue } from '../services/transcriptionWorker';
import { prisma } from '../database/index';

const router = Router();

/**
 * GET /transcripts/system/status
 * Get complete system status and health check
 */
router.get('/system/status', authenticateToken, async (req: any, res: any) => {
  try {
    // Validate configuration
    const configValidation = await configurationService.validateConfiguration();
    
    // Get queue statistics
    const queueStats = {
      waiting: await transcriptionQueue.getWaiting().then(jobs => jobs.length),
      active: await transcriptionQueue.getActive().then(jobs => jobs.length),
      completed: await transcriptionQueue.getCompleted().then(jobs => jobs.length),
      failed: await transcriptionQueue.getFailed().then(jobs => jobs.length),
    };

    // Get storage statistics
    const storageStats = audioFileService.getStorageStats();

    // Get database statistics
    const dbStats = await Promise.all([
      (prisma as any).callTranscript.count(),
      (prisma as any).transcriptionJob.count({ where: { status: 'pending' } }),
      (prisma as any).transcriptionJob.count({ where: { status: 'completed' } }),
      (prisma as any).transcriptionJob.count({ where: { status: 'failed' } }),
    ]);

    // Calculate cost estimates
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayCosts = await (prisma as any).callTranscript.aggregate({
      where: { createdAt: { gte: todayStart } },
      _sum: { processingCost: true }
    });

    const systemStatus = {
      timestamp: new Date().toISOString(),
      configuration: configValidation,
      queue: {
        ...queueStats,
        total: queueStats.waiting + queueStats.active + queueStats.completed + queueStats.failed
      },
      storage: storageStats,
      database: {
        totalTranscripts: dbStats[0],
        pendingJobs: dbStats[1],
        completedJobs: dbStats[2],
        failedJobs: dbStats[3]
      },
      costs: {
        todayTotal: todayCosts._sum.processingCost || 0,
        dailyLimit: configurationService.getConfig().dailyCostLimit,
        utilizationPercent: ((todayCosts._sum.processingCost || 0) / configurationService.getConfig().dailyCostLimit) * 100
      },
      health: {
        overall: configValidation.isValid && queueStats.failed < 10 ? 'healthy' : 'degraded',
        audioStorage: configValidation.summary.audioStorage,
        openaiConnection: configValidation.summary.openaiIntegration,
        transcriptionEnabled: configValidation.summary.transcriptionEnabled,
        realTimeProcessing: configValidation.summary.realTimeProcessing
      }
    };

    res.json({
      success: true,
      data: systemStatus
    });

  } catch (error) {
    console.error('❌ Error getting system status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status'
    });
  }
});

/**
 * GET /transcripts/system/config
 * Get current system configuration
 */
router.get('/system/config', authenticateToken, async (req: any, res: any) => {
  try {
    const config = configurationService.getConfig();
    const report = configurationService.generateConfigReport();

    // Mask sensitive information
    const safeConfig = {
      ...config,
      openaiApiKey: config.openaiApiKey ? '***masked***' : 'not_set'
    };

    res.json({
      success: true,
      data: {
        configuration: safeConfig,
        report,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error getting configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration'
    });
  }
});

/**
 * POST /transcripts/system/validate
 * Validate system configuration and connectivity
 */
router.post('/system/validate', authenticateToken, async (req: any, res: any) => {
  try {
    console.log('🔍 Running comprehensive system validation...');
    
    const validation = await configurationService.validateConfiguration();
    
    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('❌ Error during validation:', error);
    res.status(500).json({
      success: false,
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /transcripts/queue/retry-failed
 * Retry failed transcription jobs
 */
router.post('/queue/retry-failed', authenticateToken, async (req: any, res: any) => {
  try {
    const { limit = 10 } = req.body;

    // Get failed jobs
    const failedJobs = await transcriptionQueue.getFailed();
    const jobsToRetry = failedJobs.slice(0, limit);

    let retriedCount = 0;
    for (const job of jobsToRetry) {
      try {
        await job.retry();
        retriedCount++;
      } catch (error) {
        console.error(`Failed to retry job ${job.id}:`, error);
      }
    }

    res.json({
      success: true,
      data: {
        totalFailed: failedJobs.length,
        retried: retriedCount,
        remaining: failedJobs.length - retriedCount
      }
    });

  } catch (error) {
    console.error('❌ Error retrying failed jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry jobs'
    });
  }
});

/**
 * POST /transcripts/storage/cleanup
 * Clean up old audio files and expired transcripts
 */
router.post('/storage/cleanup', authenticateToken, async (req: any, res: any) => {
  try {
    console.log('🧹 Starting storage cleanup...');

    // Clean up old audio files
    const audioCleanup = await audioFileService.cleanupOldFiles();

    // Clean up expired transcripts (based on retention policy)
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - configurationService.getConfig().retentionDays);

    const transcriptCleanup = await (prisma as any).callTranscript.deleteMany({
      where: {
        retentionExpiresAt: {
          lt: new Date()
        }
      }
    });

    // Clean up old failed jobs
    const oldFailedJobs = await transcriptionQueue.getFailed();
    let cleanedJobs = 0;
    
    for (const job of oldFailedJobs) {
      if (job.finishedOn && (Date.now() - job.finishedOn) > 7 * 24 * 60 * 60 * 1000) { // 7 days old
        await job.remove();
        cleanedJobs++;
      }
    }

    res.json({
      success: true,
      data: {
        audioFiles: {
          deleted: audioCleanup.deletedCount,
          freedBytes: audioCleanup.freedBytes
        },
        transcripts: {
          deleted: transcriptCleanup.count
        },
        failedJobs: {
          cleaned: cleanedJobs
        }
      }
    });

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed'
    });
  }
});

/**
 * GET /transcripts/queue/stats
 * Get detailed queue statistics
 */
router.get('/queue/stats', authenticateToken, async (req: any, res: any) => {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      transcriptionQueue.getWaiting(),
      transcriptionQueue.getActive(),
      transcriptionQueue.getCompleted(),
      transcriptionQueue.getFailed()
    ]);

    // Calculate processing times
    const completedWithTimes = completed.filter(job => job.finishedOn && job.processedOn);
    const averageProcessingTime = completedWithTimes.length > 0 
      ? completedWithTimes.reduce((sum, job) => sum + (job.finishedOn! - job.processedOn!), 0) / completedWithTimes.length
      : 0;

    // Get recent activity (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentCompleted = completed.filter(job => job.finishedOn && job.finishedOn > oneDayAgo);
    const recentFailed = failed.filter(job => job.finishedOn && job.finishedOn > oneDayAgo);

    const stats = {
      current: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      },
      performance: {
        averageProcessingTimeMs: Math.round(averageProcessingTime),
        successRate: completed.length > 0 ? (completed.length / (completed.length + failed.length)) * 100 : 0,
        throughputLast24h: recentCompleted.length
      },
      recent: {
        completedLast24h: recentCompleted.length,
        failedLast24h: recentFailed.length,
        errorRate: recentCompleted.length + recentFailed.length > 0 
          ? (recentFailed.length / (recentCompleted.length + recentFailed.length)) * 100 
          : 0
      },
      activeJobs: active.map(job => ({
        id: job.id,
        callId: job.data.callId,
        startedAt: job.processedOn,
        progress: job.progress(),
        priority: job.opts.priority
      }))
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error getting queue stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue statistics'
    });
  }
});

/**
 * POST /transcripts/test/dummy
 * Create a test transcription job (for testing purposes)
 */
router.post('/test/dummy', authenticateToken, async (req: any, res: any) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Test endpoints disabled in production'
    });
  }

  try {
    const { callId = 'test-call-' + Date.now(), recordingUrl = 'https://example.com/test.wav' } = req.body;

    // Queue a dummy transcription job
    const job = await transcriptionQueue.add('transcription', {
      callId,
      recordingUrl,
      priority: 100,
      jobType: 'test'
    }, {
      priority: 100,
      removeOnComplete: 20,
      removeOnFail: 10
    });

    res.json({
      success: true,
      data: {
        jobId: job.id,
        callId,
        message: 'Test transcription job queued'
      }
    });

  } catch (error) {
    console.error('❌ Error creating test job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test job'
    });
  }
});

export default router;