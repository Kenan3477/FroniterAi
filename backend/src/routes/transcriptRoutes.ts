/**
 * Omnivox AI Call Transcripts API
 * Production-ready endpoints for transcript access and management
 */

import { Router } from 'express';
import { prisma } from '../database/index';
import { authenticateToken } from '../middleware/enhancedAuth';
import { transcriptionWorker, onNewCallRecording } from '../services/transcriptionWorker';

const router = Router();

/**
 * GET /calls/:id/transcript
 * Get complete transcript data for a specific call
 */
router.get('/calls/:id/transcript', authenticateToken, async (req: any, res: any) => {
  try {
    const { id: callId } = req.params;
    const { format = 'full' } = req.query;

    // Verify call access permissions
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
      return res.status(404).json({
        error: 'Call record not found'
      });
    }

    // Check permissions - agents can only see their own calls unless supervisor/admin
    if (req.user.role === 'AGENT' && callRecord.agentId !== req.user.agentId) {
      return res.status(403).json({
        error: 'Insufficient permissions to access this transcript'
      });
    }

    // Get transcript data
    const transcript = await (prisma as any).callTranscript.findFirst({
      where: { callId },
      orderBy: { createdAt: 'desc' }
    });

    if (!transcript) {
      // Check if transcription is in progress
      const job = await (prisma as any).transcriptionJob.findFirst({
        where: { callId },
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json({
        callId,
        status: job?.status || 'not_started',
        message: job?.status === 'processing' ? 'Transcription in progress' : 'Transcript not available',
        estimatedCompletion: job?.status === 'processing' ? '2-5 minutes' : null
      });
    }

    // Log access for audit trail
    await (prisma as any).transcriptionAudit.create({
      data: {
        callId,
        action: 'TRANSCRIPT_ACCESSED',
        details: {
          userId: req.user.id,
          userRole: req.user.role,
          accessFormat: format,
          accessedAt: new Date().toISOString()
        },
        userId: req.user.id.toString()
      }
    });

    // Return transcript based on requested format
    if (format === 'summary') {
      return res.json({
        callId,
        status: 'completed',
        summary: transcript.summary,
        sentimentScore: transcript.sentimentScore,
        callOutcome: transcript.callOutcomeClassification,
        complianceFlags: transcript.complianceFlags,
        confidence: transcript.confidenceScore,
        wordCount: transcript.wordCount,
        processingDate: transcript.createdAt
      });
    }

    if (format === 'analytics') {
      return res.json({
        callId,
        status: 'completed',
        analytics: {
          agentTalkRatio: transcript.agentTalkRatio,
          customerTalkRatio: transcript.customerTalkRatio,
          longestMonologue: transcript.longestMonologueSeconds,
          silenceDuration: transcript.silenceDurationSeconds,
          interruptions: transcript.interruptionsCount,
          scriptAdherence: transcript.scriptAdherenceScore
        },
        sentiment: {
          score: transcript.sentimentScore,
          classification: (transcript.sentimentScore ?? 0) > 0.7 ? 'Positive' :
                         (transcript.sentimentScore ?? 0) > 0.3 ? 'Neutral' : 'Negative'
        },
        keyObjections: transcript.keyObjections,
        callOutcome: transcript.callOutcomeClassification,
        complianceFlags: transcript.complianceFlags
      });
    }

    // Full format (default)
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
        text: transcript.transcriptText,
        segments: (transcript.structuredJson as any)?.segments || [],
        confidence: transcript.confidenceScore,
        language: (transcript.structuredJson as any)?.language || 'en',
        wordCount: transcript.wordCount,
        processingProvider: transcript.processingProvider
      },
      analysis: {
        summary: transcript.summary,
        sentimentScore: transcript.sentimentScore,
        complianceFlags: transcript.complianceFlags,
        keyObjections: transcript.keyObjections,
        callOutcome: transcript.callOutcomeClassification
      },
      analytics: {
        agentTalkRatio: transcript.agentTalkRatio,
        customerTalkRatio: transcript.customerTalkRatio,
        longestMonologue: transcript.longestMonologueSeconds,
        silenceDuration: transcript.silenceDurationSeconds,
        interruptions: transcript.interruptionsCount,
        scriptAdherence: transcript.scriptAdherenceScore
      },
      metadata: {
        processingTime: transcript.processingTimeMs,
        processingCost: transcript.processingCost,
        processingDate: transcript.createdAt,
        retentionExpires: transcript.retentionExpiresAt,
        dataRegion: transcript.dataRegion
      }
    });

  } catch (error) {
    console.error('❌ Error fetching transcript:', error);
    res.status(500).json({
      error: 'Failed to fetch transcript',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /calls/:id/transcript/segments
 * Get timestamped segments for transcript playback
 */
router.get('/calls/:id/transcript/segments', authenticateToken, async (req: any, res: any) => {
  try {
    const { id: callId } = req.params;
    const { startTime, endTime } = req.query;

    const transcript = await (prisma as any).callTranscript.findFirst({
      where: { callId },
      select: { structuredJson: true, callId: true }
    });

    if (!transcript) {
      return res.status(404).json({
        error: 'Transcript not found'
      });
    }

    let segments = (transcript.structuredJson as any)?.segments || [];

    // Filter by time range if provided
    if (startTime || endTime) {
      segments = segments.filter((segment: any) => {
        if (startTime && segment.start < parseFloat(startTime)) return false;
        if (endTime && segment.end > parseFloat(endTime)) return false;
        return true;
      });
    }

    res.json({
      callId,
      segments,
      totalSegments: segments.length
    });

  } catch (error) {
    console.error('❌ Error fetching transcript segments:', error);
    res.status(500).json({
      error: 'Failed to fetch transcript segments'
    });
  }
});

/**
 * POST /calls/:id/transcript/reprocess
 * Trigger reprocessing of a call transcript
 */
router.post('/calls/:id/transcript/reprocess', authenticateToken, async (req: any, res: any) => {
  try {
    const { id: callId } = req.params;

    // Check permissions (supervisor/admin only)
    if (!['SUPERVISOR', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions to reprocess transcripts'
      });
    }

    // Verify call exists
    const callRecord = await prisma.callRecord.findUnique({
      where: { id: callId },
      include: {
        recordingFile: {
          select: { filePath: true }
        }
      }
    });

    if (!callRecord) {
      return res.status(404).json({
        error: 'Call record not found'
      });
    }

    const recordingUrl = callRecord.recordingFile?.filePath || callRecord.recording;
    if (!recordingUrl) {
      return res.status(400).json({
        error: 'No recording available for transcription'
      });
    }

    // Delete existing transcript if any
    await (prisma as any).callTranscript.deleteMany({
      where: { callId }
    });

    // Queue reprocessing job
    await transcriptionWorker.addTranscriptionJob(callId, recordingUrl, {
      priority: 50,
      jobType: 'reprocess'
    });

    // Update call status
    await prisma.callRecord.update({
      where: { id: callId },
      data: { transcriptionStatus: 'queued' }
    });

    // Log reprocess action
    await (prisma as any).transcriptionAudit.create({
      data: {
        callId,
        action: 'TRANSCRIPT_REPROCESS_TRIGGERED',
        details: {
          triggeredBy: req.user.id,
          userRole: req.user.role,
          triggeredAt: new Date().toISOString()
        },
        userId: req.user.id.toString()
      }
    });

    res.json({
      success: true,
      message: 'Transcript reprocessing queued',
      callId,
      estimatedCompletion: '2-5 minutes'
    });

  } catch (error) {
    console.error('❌ Error reprocessing transcript:', error);
    res.status(500).json({
      error: 'Failed to queue transcript reprocessing'
    });
  }
});

/**
 * GET /transcripts/search
 * Search transcripts with filters and pagination
 */
router.get('/transcripts/search', authenticateToken, async (req: any, res: any) => {
  try {
    const {
      query,
      sentiment,
      complianceFlags,
      outcome,
      dateFrom,
      dateTo,
      agentId,
      campaignId,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    const whereConditions: any = {};
    
    if (query) {
      whereConditions.transcriptText = {
        contains: query,
        mode: 'insensitive'
      };
    }

    if (sentiment) {
      if (sentiment === 'positive') {
        whereConditions.sentimentScore = { gte: 0.7 };
      } else if (sentiment === 'negative') {
        whereConditions.sentimentScore = { lt: 0.3 };
      } else if (sentiment === 'neutral') {
        whereConditions.sentimentScore = { gte: 0.3, lt: 0.7 };
      }
    }

    if (outcome) {
      whereConditions.callOutcomeClassification = outcome;
    }

    if (dateFrom || dateTo) {
      whereConditions.createdAt = {};
      if (dateFrom) whereConditions.createdAt.gte = new Date(dateFrom);
      if (dateTo) whereConditions.createdAt.lte = new Date(dateTo);
    }

    // Add call record filters
    const callWhereConditions: any = {};
    
    if (agentId) {
      callWhereConditions.agentId = agentId;
    }
    
    if (campaignId) {
      callWhereConditions.campaignId = campaignId;
    }

    // For agents, restrict to their own calls
    if (req.user.role === 'AGENT') {
      callWhereConditions.agentId = req.user.agentId;
    }

    if (Object.keys(callWhereConditions).length > 0) {
      whereConditions.callRecord = callWhereConditions;
    }

    const [transcripts, total] = await Promise.all([
      (prisma as any).callTranscript.findMany({
        where: whereConditions,
        include: {
          callRecord: {
            select: {
              callId: true,
              phoneNumber: true,
              startTime: true,
              duration: true,
              outcome: true,
              agent: {
                select: { firstName: true, lastName: true }
              },
              contact: {
                select: { firstName: true, lastName: true, company: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      (prisma as any).callTranscript.count({ where: whereConditions })
    ]);

    res.json({
      transcripts: transcripts.map((t: any) => ({
        id: t.id,
        callId: t.callId,
        summary: t.summary,
        sentimentScore: t.sentimentScore,
        complianceFlags: t.complianceFlags,
        keyObjections: t.keyObjections,
        callOutcome: t.callOutcomeClassification,
        confidence: t.confidenceScore,
        wordCount: t.wordCount,
        processingDate: t.createdAt,
        call: t.callRecord
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Error searching transcripts:', error);
    res.status(500).json({
      error: 'Failed to search transcripts'
    });
  }
});

/**
 * GET /transcripts/analytics
 * Get transcript analytics and insights
 */
router.get('/transcripts/analytics', authenticateToken, async (req: any, res: any) => {
  try {
    const { dateFrom, dateTo, agentId, campaignId } = req.query;

    // Build filters
    const whereConditions: any = {};
    
    if (dateFrom || dateTo) {
      whereConditions.createdAt = {};
      if (dateFrom) whereConditions.createdAt.gte = new Date(dateFrom);
      if (dateTo) whereConditions.createdAt.lte = new Date(dateTo);
    }

    const callWhereConditions: any = {};
    if (agentId) callWhereConditions.agentId = agentId;
    if (campaignId) callWhereConditions.campaignId = campaignId;

    // For agents, restrict to their own calls
    if (req.user.role === 'AGENT') {
      callWhereConditions.agentId = req.user.agentId;
    }

    if (Object.keys(callWhereConditions).length > 0) {
      whereConditions.callRecord = callWhereConditions;
    }

    // Get aggregate analytics
    const analytics = await (prisma as any).callTranscript.aggregate({
      where: whereConditions,
      _count: { id: true },
      _avg: {
        sentimentScore: true,
        confidenceScore: true,
        agentTalkRatio: true,
        customerTalkRatio: true,
        scriptAdherenceScore: true
      },
      _sum: {
        wordCount: true,
        processingCost: true
      }
    });

    // Get compliance flags summary
    const complianceData = await (prisma as any).callTranscript.findMany({
      where: whereConditions,
      select: { complianceFlags: true }
    });

    const complianceStats = complianceData.reduce((acc: any, transcript: any) => {
      const flags = transcript.complianceFlags as any[] || [];
      flags.forEach(flag => {
        const key = `${flag.type}_${flag.severity}`;
        acc[key] = (acc[key] || 0) + 1;
      });
      return acc;
    }, {});

    // Get outcome distribution
    const outcomeData = await (prisma as any).callTranscript.groupBy({
      by: ['callOutcomeClassification'],
      where: whereConditions,
      _count: { id: true }
    });

    res.json({
      summary: {
        totalTranscripts: analytics._count.id,
        averageSentiment: analytics._avg.sentimentScore,
        averageConfidence: analytics._avg.confidenceScore,
        totalWords: analytics._sum.wordCount,
        totalCost: analytics._sum.processingCost,
        avgAgentTalkRatio: analytics._avg.agentTalkRatio,
        avgCustomerTalkRatio: analytics._avg.customerTalkRatio,
        avgScriptAdherence: analytics._avg.scriptAdherenceScore
      },
      complianceFlags: complianceStats,
      outcomes: outcomeData.reduce((acc: any, item: any) => {
        acc[item.callOutcomeClassification || 'UNKNOWN'] = item._count.id;
        return acc;
      }, {}),
      sentimentDistribution: {
        positive: (analytics._avg.sentimentScore ?? 0) > 0.7 ? 'High' : 'Normal',
        negative: (analytics._avg.sentimentScore ?? 0) < 0.3 ? 'High' : 'Normal'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching transcript analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch transcript analytics'
    });
  }
});

/**
 * GET /transcripts/queue/stats
 * Get transcription queue statistics (admin only)
 */
router.get('/transcripts/queue/stats', authenticateToken, async (req: any, res: any) => {
  try {
    // Admin only
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Admin access required'
      });
    }

    const queueStats = await transcriptionWorker.getQueueStats();
    
    // Get database statistics
    const dbStats = await Promise.all([
      (prisma as any).transcriptionJob.count(),
      (prisma as any).transcriptionJob.count({ where: { status: 'pending' } }),
      (prisma as any).transcriptionJob.count({ where: { status: 'processing' } }),
      (prisma as any).transcriptionJob.count({ where: { status: 'completed' } }),
      (prisma as any).transcriptionJob.count({ where: { status: 'failed' } }),
      (prisma as any).callTranscript.count(),
      prisma.callRecord.count({ where: { transcriptionStatus: null } })
    ]);

    res.json({
      queue: queueStats,
      database: {
        totalJobs: dbStats[0],
        pendingJobs: dbStats[1],
        processingJobs: dbStats[2],
        completedJobs: dbStats[3],
        failedJobs: dbStats[4],
        totalTranscripts: dbStats[5],
        callsNeedingTranscription: dbStats[6]
      }
    });

  } catch (error) {
    console.error('❌ Error fetching queue stats:', error);
    res.status(500).json({
      error: 'Failed to fetch queue statistics'
    });
  }
});

/**
 * POST /recordings/webhook
 * Webhook to automatically queue transcription for new recordings
 */
router.post('/recordings/webhook', async (req: any, res: any) => {
  try {
    const { callId, recordingUrl, source = 'system' } = req.body;

    if (!callId || !recordingUrl) {
      return res.status(400).json({
        error: 'Missing required fields: callId, recordingUrl'
      });
    }

    // Trigger transcription
    await onNewCallRecording(callId, recordingUrl);

    console.log(`📥 New recording webhook processed for call ${callId}`);

    res.json({
      success: true,
      message: 'Transcription queued',
      callId
    });

  } catch (error) {
    console.error('❌ Recording webhook error:', error);
    res.status(500).json({
      error: 'Failed to process recording webhook'
    });
  }
});

export default router;