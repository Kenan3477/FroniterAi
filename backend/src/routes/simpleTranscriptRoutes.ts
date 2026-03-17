/**
 * Simple working transcript route for testing
 */

import { Router } from 'express';
import { prisma } from '../database/index';
import { authenticateToken } from '../middleware/enhancedAuth';

const router = Router();

/**
 * GET /calls/:id/transcript - Simple version without audit logging
 */
router.get('/calls/:id/transcript', authenticateToken, async (req: any, res: any) => {
  try {
    const { id: callId } = req.params;
    const { format = 'full' } = req.query;

    console.log(`🔍 Simple transcript request: ${callId}, format: ${format}`);
    console.log(`👤 User object:`, req.user);
    console.log(`👤 User type:`, typeof req.user);
    console.log(`👤 User keys:`, req.user ? Object.keys(req.user) : 'NO USER');

    // Get call record with detailed logging
    console.log(`📞 Looking for call: ${callId}`);
    const callRecord = await prisma.callRecord.findUnique({
      where: { id: callId },
      include: {
        agent: {
          select: { agentId: true, firstName: true, lastName: true }
        },
        contact: {
          select: { firstName: true, lastName: true, phone: true, company: true }
        },
        campaign: {
          select: { name: true }
        }
      }
    });

    if (!callRecord) {
      console.log(`❌ Call not found: ${callId}`);
      return res.status(404).json({
        error: 'Call record not found'
      });
    }

    console.log(`✅ Call found: ${callRecord.id}, agent: ${callRecord.agentId}`);

    // Get transcript data (no audit logging to avoid errors)
    console.log(`📋 Looking for transcript for call: ${callId}`);
    const transcript = await (prisma as any).callTranscript.findFirst({
      where: { callId },
      orderBy: { createdAt: 'desc' }
    });

    if (!transcript) {
      console.log(`❌ No transcript found for call: ${callId}`);
      return res.status(200).json({
        callId,
        status: 'not_started',
        message: 'Transcript not available'
      });
    }

    console.log(`✅ Found transcript: ${transcript.wordCount} words`);

    // Return full transcript data
    console.log(`📤 Returning transcript data for call: ${callId}`);
    return res.json({
      callId,
      status: 'completed',
      call: {
        id: callRecord.id,
        phoneNumber: callRecord.phoneNumber,
        startTime: callRecord.startTime,
        duration: callRecord.duration,
        outcome: callRecord.outcome,
        agent: callRecord.agent,
        contact: callRecord.contact,
        campaign: callRecord.campaign
      },
      transcript: {
        text: transcript.transcriptText || '',
        confidence: transcript.confidenceScore || 0.9,
        wordCount: transcript.wordCount || 0,
        processingProvider: transcript.processingProvider || 'railway_analysis'
      },
      analysis: {
        summary: transcript.summary || '',
        sentimentScore: transcript.sentimentScore || 0.5,
        callOutcome: transcript.callOutcomeClassification || 'unknown'
      },
      analytics: {
        agentTalkRatio: transcript.agentTalkRatio || 0.5,
        customerTalkRatio: transcript.customerTalkRatio || 0.5,
        longestMonologue: transcript.longestMonologueSeconds || 0,
        silenceDuration: transcript.silenceDurationSeconds || 0,
        interruptions: transcript.interruptionsCount || 0
      },
      metadata: {
        processingTime: transcript.processingTimeMs || 2000,
        processingCost: transcript.processingCost || 0.01,
        processingDate: transcript.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Simple transcript error details:');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('Error type:', typeof error);
    
    res.status(500).json({
      error: 'Failed to fetch transcript',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;