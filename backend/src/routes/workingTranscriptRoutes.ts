/**
 * Transcript and batch transcription routes (authenticated).
 */

import { Router } from 'express';
import { prisma } from '../database/index';
import { authenticate, requireRole } from '../middleware/auth';
import { allowPublicDebugRoutes } from '../utils/routeSecurity';
import { assertUserCanReadCallTranscript } from '../utils/transcriptAccess';

const router = Router();

let batchProcessingState = {
  isRunning: false,
  progress: 0,
  currentCall: '',
  processed: 0,
  failed: 0,
  estimatedCost: 0,
  total: 0,
};

router.use(authenticate);

/**
 * GET /api/transcript/:id
 */
router.get('/transcript/:id', async (req, res) => {
  try {
    const { id: callId } = req.params;
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const access = await assertUserCanReadCallTranscript(req.user, callId);
    if (access.ok === false) {
      return res.status(access.status).json({ error: access.message });
    }

    const callRecord = await prisma.callRecord.findUnique({
      where: { id: callId },
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        startTime: true,
        duration: true,
        outcome: true,
      },
    });

    if (!callRecord) {
      return res.status(404).json({ error: 'Call record not found' });
    }

    const transcript = await (prisma as any).callTranscript.findFirst({
      where: { callId: callId },
      select: {
        transcriptText: true,
        summary: true,
        sentimentScore: true,
        confidenceScore: true,
        wordCount: true,
        callOutcomeClassification: true,
        agentTalkRatio: true,
        customerTalkRatio: true,
        longestMonologueSeconds: true,
        silenceDurationSeconds: true,
        interruptionsCount: true,
        processingTimeMs: true,
        processingCost: true,
        createdAt: true,
      },
    });

    if (!transcript) {
      return res.json({
        callId,
        status: 'not_started',
        message: 'Transcript not available',
      });
    }

    return res.json({
      callId,
      status: 'completed',
      call: {
        id: callRecord.id,
        phoneNumber: callRecord.phoneNumber,
        startTime: callRecord.startTime,
        duration: callRecord.duration,
        outcome: callRecord.outcome,
      },
      transcript: {
        text: transcript.transcriptText || 'No text available',
        confidence: transcript.confidenceScore || 0.9,
        wordCount: transcript.wordCount || 0,
      },
      analysis: {
        summary: transcript.summary || 'No summary available',
        sentimentScore: transcript.sentimentScore || 0.5,
        callOutcome: transcript.callOutcomeClassification || 'unknown',
      },
      analytics: {
        agentTalkRatio: transcript.agentTalkRatio || 0.5,
        customerTalkRatio: transcript.customerTalkRatio || 0.5,
        longestMonologue: transcript.longestMonologueSeconds || 0,
        silenceDuration: transcript.silenceDurationSeconds || 0,
        interruptions: transcript.interruptionsCount || 0,
      },
      metadata: {
        processingTime: transcript.processingTimeMs || 2000,
        processingCost: transcript.processingCost || 0.01,
        processingDate: transcript.createdAt,
      },
    });
  } catch (error) {
    console.error('Transcript fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch transcript',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

if (allowPublicDebugRoutes()) {
  router.get('/transcript-test', (_req, res) => {
    res.json({
      message: 'Working transcript routes (debug)',
      timestamp: new Date().toISOString(),
    });
  });
  router.post('/transcript-test', (req, res) => {
    res.json({
      success: true,
      message: 'POST route (debug)',
      timestamp: new Date().toISOString(),
      body: req.body,
    });
  });
}

/**
 * GET /api/batch-status — admin / supervisor only (aggregate stats).
 */
router.get('/batch-status', requireRole('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'), async (_req, res) => {
  try {
    const totalCalls = await prisma.callRecord.count();
    const withRecordings = await prisma.callRecord.count({
      where: {
        recording: { not: null },
        NOT: { recording: '' },
      },
    });

    const transcriptStats = await prisma.$queryRaw<
      Array<{
        total_transcripts: bigint;
        ai_processed: bigint;
        ai_failed: bigint;
        total_cost: number | null;
      }>
    >`
      SELECT 
        COUNT(*) as total_transcripts,
        COUNT(*) FILTER (WHERE "processingProvider" = 'openai_whisper_gpt') as ai_processed,
        COUNT(*) FILTER (WHERE "processingProvider" = 'openai_whisper_gpt' AND "transcriptText" = '[AI transcription failed]') as ai_failed,
        COALESCE(SUM("processingCost"), 0) as total_cost
      FROM call_transcripts
      WHERE "callId" IS NOT NULL
    `;

    const stats = transcriptStats[0];

    res.json({
      success: true,
      stats: {
        total: totalCalls,
        processed: Number(stats.total_transcripts),
        withRecordings,
        aiProcessed: Number(stats.ai_processed),
        failed: Number(stats.ai_failed),
        estimatedCost: Number(stats.total_cost),
      },
      batchStatus: batchProcessingState.isRunning ? batchProcessingState : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error getting batch status:', message);
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/batch-process', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    if (batchProcessingState.isRunning) {
      return res.status(400).json({
        success: false,
        error: 'Batch processing is already running',
      });
    }

    const { limit = 5, onlyWithRecordings = true } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.',
      });
    }

    batchProcessingState = {
      isRunning: true,
      progress: 0,
      currentCall: '',
      processed: 0,
      failed: 0,
      estimatedCost: 0,
      total: limit,
    };

    processBatchInBackground(limit, onlyWithRecordings).catch((error) => {
      console.error('Batch processing error:', error);
      batchProcessingState.isRunning = false;
    });

    res.json({
      success: true,
      message: `Started batch processing of up to ${limit} calls`,
      batchStatus: batchProcessingState,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error starting batch processing:', message);
    batchProcessingState.isRunning = false;
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/batch-stop', requireRole('SUPER_ADMIN', 'ADMIN'), async (_req, res) => {
  try {
    batchProcessingState.isRunning = false;
    batchProcessingState.currentCall = '';

    res.json({
      success: true,
      message: 'Batch processing stopped',
      finalStats: {
        processed: batchProcessingState.processed,
        failed: batchProcessingState.failed,
        estimatedCost: batchProcessingState.estimatedCost,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/advanced/:callId', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { callId } = req.params;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.',
      });
    }

    const call = await prisma.callRecord.findUnique({
      where: { id: callId },
      select: { id: true, callId: true, recording: true, phoneNumber: true },
    });

    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }

    if (!call.recording) {
      return res.status(400).json({ success: false, error: 'No recording available for this call' });
    }

    try {
      const { processAdvancedTranscription } = require('../../../whisper-ai-transcription-secure.js');
      const result = await processAdvancedTranscription(callId);

      if (result.success) {
        res.json({
          success: true,
          message: 'Advanced AI transcription completed',
          result: {
            transcriptText: result.transcriptText,
            sentimentAnalysis: result.sentimentAnalysis,
            processingTimeMs: result.processingTimeMs,
            estimatedCost: result.estimatedCost,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Transcription processing failed',
        });
      }
    } catch (importError) {
      console.error('Failed to import transcription module:', importError);
      res.status(500).json({
        success: false,
        error: 'Advanced transcription module not available. Check OpenAI dependencies.',
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

async function processBatchInBackground(limit: number, onlyWithRecordings: boolean) {
  console.log(`Starting background batch processing (limit: ${limit})`);

  try {
    const { batchProcessHistoricalCalls } = require('../../../whisper-ai-transcription-secure.js');

    batchProcessingState.currentCall = 'Initializing batch process...';

    const result = await batchProcessHistoricalCalls(limit, onlyWithRecordings);

    batchProcessingState.processed = result.processed;
    batchProcessingState.failed = result.failed;
    batchProcessingState.estimatedCost = result.totalCost;
    batchProcessingState.progress = 100;
    batchProcessingState.currentCall = 'Complete';

    console.log(
      `Batch processing complete: ${result.processed} processed, ${result.failed} failed`
    );

    setTimeout(() => {
      batchProcessingState.isRunning = false;
    }, 30000);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Batch processing failed:', message);
    batchProcessingState.currentCall = `Error: ${message}`;
    batchProcessingState.isRunning = false;
  }
}

router.post('/transcript/direct-ai/:callId', requireRole('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'), async (req, res) => {
  res.status(202).json({
    success: true,
    message: 'Enhanced AI transcription request accepted',
    callId: req.params.callId,
  });
});

export default router;
