/**
 * Test transcript access without authentication
 */

import { Router } from 'express';
import { prisma } from '../database/index';

const router = Router();

/**
 * GET /test-transcript/:id - Test transcript access without auth
 */
router.get('/test-transcript/:id', async (req: any, res: any) => {
  try {
    const { id: callId } = req.params;

    console.log(`🧪 Test transcript request: ${callId}`);

    // Get call record
    const callRecord = await prisma.callRecord.findUnique({
      where: { id: callId },
      select: { id: true, callId: true, transcriptionStatus: true }
    });

    if (!callRecord) {
      return res.json({
        success: false,
        error: 'Call not found',
        callId
      });
    }

    // Get transcript data
    const transcript = await (prisma as any).callTranscript.findFirst({
      where: { callId },
      select: {
        transcriptText: true,
        wordCount: true,
        summary: true,
        sentimentScore: true
      }
    });

    return res.json({
      success: true,
      callId,
      call: {
        id: callRecord.id,
        callId: callRecord.callId,
        status: callRecord.transcriptionStatus
      },
      transcript: transcript ? {
        text: transcript.transcriptText?.substring(0, 100) + '...',
        wordCount: transcript.wordCount,
        summary: transcript.summary
      } : null
    });

  } catch (error) {
    console.error('❌ Test transcript error:', error);
    res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;