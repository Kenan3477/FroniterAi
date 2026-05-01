/**
 * Recording API Routes - Enhanced with Twilio Integration
 * Handles recording download, streaming, and Twilio sync
 */

import express, { Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { prisma } from '../database/index';
import { syncAllRecordings, getRecordingSyncStatus } from '../services/recordingSyncService';
import { twilioClient, getCallRecordingsForCallTree } from '../services/twilioService';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Apply authentication to all recording routes
router.use(authenticate);

const RECORDINGS_DIR = process.env.RECORDINGS_DIR || path.join(process.cwd(), 'recordings');

/** callRecord.agentId is Agent.agentId (e.g. "42"); JWT userId is User.id string — match via Agent.email */
async function userOwnsCallRecording(userIdStr: string, callAgentId: string | null): Promise<boolean> {
  if (!callAgentId) return false;
  if (callAgentId === userIdStr) return true;
  const agent = await prisma.agent.findUnique({
    where: { agentId: callAgentId },
    select: { email: true },
  });
  if (!agent?.email) return false;
  const user = await prisma.user.findUnique({
    where: { email: agent.email },
    select: { id: true },
  });
  return user?.id != null && String(user.id) === userIdStr;
}

/** Twilio Recording SID (RE…) or extract from media URL */
function parseTwilioRecordingSid(raw: string): string | null {
  const s = raw.trim();
  if (/^RE[a-f0-9]{32}$/i.test(s)) return s;
  const m = s.match(/\/Recordings\/(RE[a-f0-9]+)/i);
  return m ? m[1] : null;
}

/** Twilio Call SID (CA…) */
function parseTwilioCallSid(raw: string): string | null {
  const s = raw.trim();
  return /^CA[a-f0-9]{32}$/i.test(s) ? s : null;
}

/**
 * Resolve a Twilio Recording SID for playback.
 * Rows sometimes store the parent Call SID (CA…) instead of RE… — list recordings for that call.
 */
async function resolveTwilioRecordingSidForPlayback(
  filePath: string | null | undefined,
  callRecordCallId: string | null | undefined,
  callRecordRecordingField: string | null | undefined
): Promise<string | null> {
  const candidates = [filePath, callRecordRecordingField, callRecordCallId].filter(Boolean) as string[];

  for (const c of candidates) {
    const re = parseTwilioRecordingSid(c);
    if (re) return re;
  }

  for (const c of candidates) {
    const ca = parseTwilioCallSid(c);
    if (ca && twilioClient) {
      try {
        const list = await getCallRecordingsForCallTree(ca);
        if (!list.length) continue;
        const dual = list.find((r: { channels?: number }) => r.channels === 2);
        const sid = (dual || list[0])?.sid;
        if (sid) {
          console.log(`🔗 Resolved CallSid ${ca} → RecordingSid ${sid} (${list.length} recording(s))`);
          return sid;
        }
      } catch (e) {
        console.warn(`⚠️ Could not list recordings for CallSid ${ca}:`, e);
      }
    }
  }

  return null;
}

/**
 * GET /api/recordings/:id/stream
 * Stream a recording file for playback
 */
router.get('/:id/stream', requireRole('AGENT', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const recordingId = req.params.id;
    
    // Get recording record from database
    const recording = await prisma.recording.findFirst({
      where: { id: recordingId },
      include: {
        callRecord: {
          include: {
            agent: true
          }
        }
      }
    });

    if (!recording) {
      return res.status(404).json({
        success: false,
        error: 'Recording not found'
      });
    }

    if (req.user?.role === 'AGENT') {
      const allowed = await userOwnsCallRecording(req.user.userId, recording.callRecord.agentId);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
    }

    // Twilio: filePath may be RE…, CA…, URL, or empty while callRecord.recording holds CA…
    let filePath = recording.filePath || undefined;
    if (!filePath && recording.callRecord?.recording) {
      filePath = recording.callRecord.recording;
    }

    const recordingSid = await resolveTwilioRecordingSidForPlayback(
      filePath,
      recording.callRecord?.callId,
      recording.callRecord?.recording
    );

    if (recordingSid) {
      console.log(`🎵 Streaming Twilio recording resolved to SID: ${recordingSid}`);
      try {
        const { streamTwilioRecording } = await import('../services/twilioService');
        const media = await streamTwilioRecording(recordingSid);

        if (!media) {
          return res.status(404).json({
            success: false,
            error: 'Twilio recording not found or inaccessible',
          });
        }

        res.setHeader('Content-Type', media.contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', media.buffer.length);
        res.setHeader('Content-Disposition', `inline; filename="${recording.fileName || 'recording'}"`);
        res.send(media.buffer);

        console.log(`✅ Successfully streaming Twilio recording: ${recordingSid}`);
        return;
      } catch (twilioError) {
        console.error(`❌ Error streaming from Twilio: ${twilioError}`);
        return res.status(500).json({
          success: false,
          error: 'Failed to stream from Twilio',
        });
      }
    }

    // Local file path (legacy)
    if (!filePath) {
      return res.status(404).json({
        success: false,
        error: 'No recording file or Twilio reference on this row',
      });
    }

    // Handle local file streaming (legacy)
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error(`❌ Recording file not found: ${filePath}`);
      return res.status(404).json({
        success: false,
        error: 'Recording file not found on disk'
      });
    }

    // Get file stats
    const stats = await fs.stat(filePath);

    // Set headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', stats.size.toString());
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Stream the file
    const stream = require('fs').createReadStream(filePath);
    stream.pipe(res);

  } catch (error) {
    console.error('❌ Error streaming recording:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stream recording'
    });
  }
});

/**
 * GET /api/recordings/:id/download
 * Download a recording file
 */
router.get('/:id/download', requireRole('AGENT', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const recordingId = req.params.id;
    console.log(`📥 Download request for recording: ${recordingId}`);
    
    // Get recording record from database
    const recording = await prisma.recording.findFirst({
      where: { id: recordingId },
      include: {
        callRecord: {
          include: {
            agent: true
          }
        }
      }
    });

    if (!recording) {
      console.error(`❌ Recording not found: ${recordingId}`);
      return res.status(404).json({
        success: false,
        error: 'Recording not found',
        details: `No recording found with ID: ${recordingId}`
      });
    }

    console.log(`📋 Recording found:`, {
      id: recording.id,
      fileName: recording.fileName,
      filePath: recording.filePath,
      fileSize: recording.fileSize,
      storageType: recording.storageType,
      uploadStatus: recording.uploadStatus
    });

    if (req.user?.role === 'AGENT') {
      const allowed = await userOwnsCallRecording(req.user.userId, recording.callRecord.agentId);
      if (!allowed) {
        console.error(
          `🔒 Access denied: User ${req.user.userId} tried to access recording for agent row ${recording.callRecord.agentId}`
        );
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
    }

    // Twilio or local — same resolution as stream
    let filePath = recording.filePath || undefined;
    if (!filePath && recording.callRecord?.recording) {
      filePath = recording.callRecord.recording;
    }

    const recordingSid = await resolveTwilioRecordingSidForPlayback(
      filePath,
      recording.callRecord?.callId,
      recording.callRecord?.recording
    );

    if (recordingSid) {
      console.log(`📥 Download Twilio recording resolved to SID: ${recordingSid}`);
      try {
        const { streamTwilioRecording } = await import('../services/twilioService');
        const media = await streamTwilioRecording(recordingSid);

        if (!media) {
          return res.status(404).json({
            success: false,
            error: 'Twilio recording not found or inaccessible',
            details: `Recording SID: ${recordingSid}. Check Twilio credentials and that the recording exists.`,
          });
        }

        res.setHeader('Content-Type', media.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${recording.fileName || 'recording'}"`);
        res.setHeader('Content-Length', media.buffer.length);
        res.send(media.buffer);
        return;
      } catch (twilioError: any) {
        console.error(`❌ Error downloading from Twilio:`, twilioError);
        return res.status(500).json({
          success: false,
          error: 'Failed to download from Twilio',
          details: twilioError.message || 'Twilio API error. Check credentials and recording availability.',
        });
      }
    }

    if (!filePath) {
      return res.status(404).json({
        success: false,
        error: 'Recording file path not available',
        details: 'This recording does not have a file path or Twilio reference.',
      });
    }

    // Handle local file download (legacy)
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error(`❌ Recording file not found: ${filePath}`);
      return res.status(404).json({
        success: false,
        error: 'Recording file not found on disk'
      });
    }

    // Get file stats
    const stats = await fs.stat(filePath);

    // Set headers for download
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', stats.size.toString());
    res.setHeader('Content-Disposition', `attachment; filename="${recording.fileName}"`);

    // Stream the file for download
    const stream = require('fs').createReadStream(filePath);
    stream.pipe(res);

  } catch (error) {
    console.error('❌ Error downloading recording:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download recording'
    });
  }
});

/**
 * GET /api/recordings
 * List all recordings with metadata
 */
router.get('/', requireRole('SUPERVISOR', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const recordings = await prisma.recording.findMany({
      skip,
      take: limit,
      include: {
        callRecord: {
          include: {
            agent: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            },
            contact: {
              select: {
                firstName: true,
                lastName: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalRecordings = await prisma.recording.count();

    res.json({
      success: true,
      data: recordings,
      pagination: {
        total: totalRecordings,
        page,
        limit,
        totalPages: Math.ceil(totalRecordings / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error listing recordings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list recordings'
    });
  }
});

/**
 * POST /api/recordings/sync
 * Sync recordings from Twilio for all call records
 */
router.post('/sync', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    console.log('🔄 Starting Twilio recording sync from API...');
    
    const result = await syncAllRecordings();
    
    res.json({
      success: true,
      data: result,
      message: `Recording sync completed: ${result.synced} synced, ${result.errors} errors`
    });

  } catch (error) {
    console.error('❌ Error in recording sync API:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync recordings from Twilio'
    });
  }
});

/**
 * GET /api/recordings/sync/status
 * Get recording sync status and statistics
 */
router.get('/sync/status', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const status = await getRecordingSyncStatus();
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('❌ Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status'
    });
  }
});

export default router;