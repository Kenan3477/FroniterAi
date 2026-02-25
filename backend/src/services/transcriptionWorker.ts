/**
 * Omnivox AI Transcription Queue Worker
 * Production-ready background job processor for call transcription pipeline
 */

import Queue from 'bull';
import { createClient } from 'redis';
import { prisma } from '../database/index';
import { createTranscriptionService } from './transcriptionService';

// Job interfaces
interface TranscriptionJobData {
  callId: string;
  recordingUrl: string;
  priority: number;
  jobType: 'transcription' | 'backfill' | 'reprocess';
  provider?: string;
}

interface JobProgress {
  stage: string;
  progress: number;
  details?: string;
}

// Queue configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0')
};

// Create Redis connection
const redisClient = createClient(redisConfig);

// Create Bull queue
const transcriptionQueue = new Queue('transcription', {
  redis: redisConfig
} as any);

// Performance monitoring
const queueMetrics = {
  processed: 0,
  failed: 0,
  totalProcessingTime: 0,
  averageProcessingTime: 0,
  costTotal: 0
};

export class TranscriptionWorker {
  private transcriptionService = createTranscriptionService();
  private isProcessing = false;
  private concurrencyLimit: number;
  
  constructor(concurrency = parseInt(process.env.TRANSCRIPTION_CONCURRENCY || '5')) {
    this.concurrencyLimit = concurrency;
    this.setupQueueProcessors();
    this.setupQueueEvents();
    this.startPeriodicTasks();
  }

  /**
   * Setup queue processors with concurrency control
   */
  private setupQueueProcessors(): void {
    // Main transcription processor
    transcriptionQueue.process('transcription', this.concurrencyLimit, async (job) => {
      return this.processTranscriptionJob(job);
    });

    // Historical backfill processor (lower priority)
    transcriptionQueue.process('backfill', Math.max(1, Math.floor(this.concurrencyLimit / 2)), async (job) => {
      return this.processTranscriptionJob(job);
    });

    // Reprocessing for failed jobs
    transcriptionQueue.process('reprocess', 2, async (job) => {
      return this.processTranscriptionJob(job);
    });
  }

  /**
   * Setup queue event handlers
   */
  private setupQueueEvents(): void {
    transcriptionQueue.on('completed', (job, result) => {
      console.log(`✅ Transcription job ${job.id} completed for call ${job.data.callId}`);
      queueMetrics.processed++;
      queueMetrics.totalProcessingTime += result.processingTime || 0;
      queueMetrics.averageProcessingTime = queueMetrics.totalProcessingTime / queueMetrics.processed;
      queueMetrics.costTotal += result.cost || 0;
    });

    transcriptionQueue.on('failed', (job, error) => {
      console.error(`❌ Transcription job ${job.id} failed for call ${job.data.callId}:`, error.message);
      queueMetrics.failed++;
      this.handleJobFailure(job, error);
    });

    transcriptionQueue.on('progress', (job, progress) => {
      console.log(`⏳ Transcription job ${job.id} progress: ${progress.stage} (${progress.progress}%)`);
    });

    transcriptionQueue.on('stalled', (job) => {
      console.warn(`⚠️ Transcription job ${job.id} stalled, will be retried`);
    });
  }

  /**
   * Process individual transcription job
   */
  private async processTranscriptionJob(job: any): Promise<any> {
    const { callId, recordingUrl, priority, jobType } = job.data as TranscriptionJobData;
    const startTime = Date.now();

    try {
      // Update job progress
      await job.progress({
        stage: 'started',
        progress: 0,
        details: 'Initializing transcription process'
      } as JobProgress);

      // Validate job data
      if (!callId || !recordingUrl) {
        throw new Error('Invalid job data: missing callId or recordingUrl');
      }

      // Check if call still exists
      const callRecord = await prisma.callRecord.findUnique({
        where: { id: callId },
        select: { id: true, duration: true, transcriptionStatus: true }
      });

      if (!callRecord) {
        throw new Error(`Call record not found: ${callId}`);
      }

      // Skip if already completed (idempotency check)
      if (callRecord.transcriptionStatus === 'completed') {
        console.log(`ℹ️ Call ${callId} already transcribed, skipping`);
        return { skipped: true, callId };
      }

      await job.progress({
        stage: 'downloading',
        progress: 20,
        details: 'Downloading audio file'
      } as JobProgress);

      // Process transcription
      await this.transcriptionService.processCall(callId, recordingUrl);

      await job.progress({
        stage: 'completed',
        progress: 100,
        details: 'Transcription completed successfully'
      } as JobProgress);

      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        callId,
        processingTime,
        cost: this.calculateJobCost(callRecord.duration || 0)
      };

    } catch (error) {
      console.error(`❌ Transcription job failed for call ${callId}:`, error);
      
      // Log error in database
      await this.logJobError(callId, error as Error);
      
      throw error;
    }
  }

  /**
   * Add new transcription job to queue
   */
  async addTranscriptionJob(
    callId: string, 
    recordingUrl: string, 
    options: {
      priority?: number;
      jobType?: 'transcription' | 'backfill' | 'reprocess';
      delay?: number;
    } = {}
  ): Promise<void> {
    const { priority = 100, jobType = 'transcription', delay = 0 } = options;

    try {
      // Check if job already exists
      const existingJob = await (prisma as any).transcriptionJob.findFirst({
        where: { 
          callId,
          status: { in: ['pending', 'processing', 'retrying'] }
        }
      });

      if (existingJob) {
        console.log(`ℹ️ Transcription job already exists for call ${callId}`);
        return;
      }

      // Create database record
      await (prisma as any).transcriptionJob.create({
        data: {
          callId,
          recordingUrl,
          status: 'pending',
          priority,
          jobType,
          provider: process.env.TRANSCRIPTION_PROVIDER || 'openai',
          scheduledAt: delay > 0 ? new Date(Date.now() + delay) : new Date()
        }
      });

      // Add to queue
      const jobOptions: any = {
        priority,
        delay
      };

      await transcriptionQueue.add(jobType, {
        callId,
        recordingUrl,
        priority,
        jobType
      }, jobOptions);

      console.log(`📥 Transcription job queued for call ${callId} (priority: ${priority})`);

    } catch (error) {
      console.error(`❌ Failed to queue transcription job for call ${callId}:`, error);
      throw error;
    }
  }

  /**
   * Start historical backfill process
   */
  async startHistoricalBackfill(options: {
    batchSize?: number;
    concurrency?: number;
    skipRecentHours?: number;
  } = {}): Promise<void> {
    const { batchSize = 100, skipRecentHours = 1 } = options;

    console.log('🔄 Starting historical backfill process...');

    try {
      // Find calls that need transcription
      const cutoffTime = new Date(Date.now() - skipRecentHours * 60 * 60 * 1000);
      
      const callsToProcess = await prisma.callRecord.findMany({
        where: {
          transcriptionStatus: { in: ['queued', 'failed'] } as any,
          duration: { gt: 5 }, // Only calls longer than 5 seconds
          createdAt: { lt: cutoffTime },
          OR: [
            { recording: { not: null } },
            { recordingFile: { isNot: null } }
          ]
        },
        include: {
          recordingFile: {
            select: { filePath: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: batchSize
      });

      console.log(`📊 Found ${callsToProcess.length} calls requiring transcription`);

      for (const call of callsToProcess) {
        const recordingUrl = call.recording;
        
        if (recordingUrl) {
          await this.addTranscriptionJob(call.id, recordingUrl, {
            priority: 200, // Lower priority for backfill
            jobType: 'backfill'
          });

          // Update status in database
          await prisma.callRecord.update({
            where: { id: call.id },
            data: { transcriptionStatus: 'queued' }
          });
        }

        // Small delay to prevent overwhelming the queue
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Historical backfill queued ${callsToProcess.length} jobs`);

    } catch (error) {
      console.error('❌ Historical backfill failed:', error);
      throw error;
    }
  }

  /**
   * Handle job failures
   */
  private async handleJobFailure(job: any, error: Error): Promise<void> {
    const { callId } = job.data as TranscriptionJobData;
    
    try {
      await this.logJobError(callId, error);
      
      // Update call record status if all attempts exhausted
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        await prisma.callRecord.update({
          where: { id: callId },
          data: { transcriptionStatus: 'failed' }
        });
      }
    } catch (logError) {
      console.error('❌ Failed to log job failure:', logError);
    }
  }

  /**
   * Log job error in database
   */
  private async logJobError(callId: string, error: Error): Promise<void> {
    try {
      await (prisma as any).transcriptionAudit.create({
        data: {
          callId,
          action: 'JOB_ERROR',
          details: {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (auditError) {
      console.error('❌ Failed to log audit entry:', auditError);
    }
  }

  /**
   * Calculate job processing cost
   */
  private calculateJobCost(durationSeconds: number): number {
    const provider = process.env.TRANSCRIPTION_PROVIDER || 'openai';
    
    if (provider === 'openai') {
      const minutes = Math.ceil(durationSeconds / 60);
      return minutes * 0.006; // $0.006 per minute
    }
    
    return 0; // Self-hosted is free
  }

  /**
   * Start periodic maintenance tasks
   */
  private startPeriodicTasks(): void {
    // Queue health monitoring every 5 minutes
    setInterval(async () => {
      await this.monitorQueueHealth();
    }, 5 * 60 * 1000);

    // Retry failed jobs every hour
    setInterval(async () => {
      await this.retryFailedJobs();
    }, 60 * 60 * 1000);

    // Cleanup old completed jobs daily
    setInterval(async () => {
      await this.cleanupOldJobs();
    }, 24 * 60 * 60 * 1000);

    // GDPR cleanup weekly
    setInterval(async () => {
      await this.cleanupExpiredTranscripts();
    }, 7 * 24 * 60 * 60 * 1000);
  }

  /**
   * Monitor queue health and report metrics
   */
  private async monitorQueueHealth(): Promise<void> {
    try {
      const waiting = await transcriptionQueue.getWaiting();
      const active = await transcriptionQueue.getActive();
      const completed = await transcriptionQueue.getCompleted();
      const failed = await transcriptionQueue.getFailed();

      console.log('📊 Queue Health Report:');
      console.log(`   Waiting: ${waiting.length}`);
      console.log(`   Active: ${active.length}`);
      console.log(`   Completed: ${completed.length}`);
      console.log(`   Failed: ${failed.length}`);
      console.log(`   Total Processed: ${queueMetrics.processed}`);
      console.log(`   Average Processing Time: ${Math.round(queueMetrics.averageProcessingTime)}ms`);
      console.log(`   Total Cost: $${queueMetrics.costTotal.toFixed(4)}`);

      // Alert if queue is backing up
      if (waiting.length > 1000) {
        console.warn(`⚠️ Queue backup detected: ${waiting.length} jobs waiting`);
      }

      // Alert if too many failures
      const failureRate = queueMetrics.failed / Math.max(1, queueMetrics.processed + queueMetrics.failed);
      if (failureRate > 0.1) {
        console.warn(`⚠️ High failure rate: ${Math.round(failureRate * 100)}%`);
      }

    } catch (error) {
      console.error('❌ Queue health monitoring failed:', error);
    }
  }

  /**
   * Retry failed jobs that might succeed now
   */
  private async retryFailedJobs(): Promise<void> {
    try {
      const failedJobs = await (prisma as any).transcriptionJob.findMany({
        where: {
          status: 'failed',
          attempts: { lt: 3 },
          lastErrorAt: {
            lt: new Date(Date.now() - 60 * 60 * 1000) // Failed more than 1 hour ago
          }
        },
        take: 10 // Limit retries
      });

      for (const job of failedJobs) {
        await this.addTranscriptionJob(job.callId, job.recordingUrl, {
          priority: job.priority,
          jobType: 'reprocess'
        });
        
        console.log(`🔄 Retrying failed job for call ${job.callId}`);
      }

    } catch (error) {
      console.error('❌ Failed job retry process failed:', error);
    }
  }

  /**
   * Cleanup old completed jobs
   */
  private async cleanupOldJobs(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      const deletedCount = await (prisma as any).transcriptionJob.deleteMany({
        where: {
          status: { in: ['completed', 'failed'] },
          updatedAt: { lt: cutoffDate }
        }
      });

      if (deletedCount.count > 0) {
        console.log(`🧹 Cleaned up ${deletedCount.count} old transcription jobs`);
      }

    } catch (error) {
      console.error('❌ Job cleanup failed:', error);
    }
  }

  /**
   * GDPR compliance: cleanup expired transcripts
   */
  private async cleanupExpiredTranscripts(): Promise<void> {
    try {
      const expiredTranscripts = await (prisma as any).callTranscript.findMany({
        where: {
          retentionExpiresAt: { lt: new Date() }
        },
        select: { id: true, callId: true }
      });

      for (const transcript of expiredTranscripts) {
        // Log deletion for audit
        await (prisma as any).transcriptionAudit.create({
          data: {
            callId: transcript.callId,
            action: 'TRANSCRIPT_DELETED_RETENTION',
            details: {
              transcriptId: transcript.id,
              deletedAt: new Date().toISOString(),
              reason: 'Retention period expired'
            }
          }
        });

        // Delete transcript
        await (prisma as any).callTranscript.delete({
          where: { id: transcript.id }
        });
      }

      if (expiredTranscripts.length > 0) {
        console.log(`🗑️ Deleted ${expiredTranscripts.length} expired transcripts (GDPR compliance)`);
      }

    } catch (error) {
      console.error('❌ GDPR cleanup failed:', error);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<any> {
    const waiting = await transcriptionQueue.getWaiting();
    const active = await transcriptionQueue.getActive();
    const completed = await transcriptionQueue.getCompleted();
    const failed = await transcriptionQueue.getFailed();

    return {
      queue: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      },
      metrics: queueMetrics,
      concurrency: this.concurrencyLimit
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down transcription worker...');
    
    await transcriptionQueue.close();
    await redisClient.quit();
    
    console.log('✅ Transcription worker shutdown complete');
  }
}

// Create and export worker instance
export const transcriptionWorker = new TranscriptionWorker();

// Hook for new call recordings
export async function onNewCallRecording(callId: string, recordingUrl: string): Promise<void> {
  await transcriptionWorker.addTranscriptionJob(callId, recordingUrl, {
    priority: 50, // High priority for new calls
    jobType: 'transcription'
  });
  
  // Update call record status
  await prisma.callRecord.update({
    where: { id: callId },
    data: { transcriptionStatus: 'queued' }
  });
}

// Export for use in other services
export { transcriptionQueue };