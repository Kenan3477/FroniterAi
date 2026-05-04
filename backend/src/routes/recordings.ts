/**
 * Recording Streaming Routes
 *
 * Handles audio playback for call recordings. The recording binary always lives
 * on Twilio's CDN (Railway has ephemeral storage); we proxy from Twilio with the
 * account's Basic auth so the browser never sees Twilio credentials.
 *
 * The `Recording` row's `storageType` field may be 'twilio' (correct for newly
 * recorded calls) or legacy 'local' (older code wrote this even though no file
 * exists on disk). We detect Twilio-hosted rows by also checking whether
 * `filePath` / `fileName` looks like a Twilio SID (`RE...` or `CA...`).
 */

import express, { Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { prisma } from '../database/index';
import { streamTwilioRecording } from '../services/twilioService';

const router = express.Router();

/** callRecord.agentId is Agent.agentId; JWT userId is User.id — match via Agent.email ↔ User */
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

/**
 * Extract a Twilio SID (RE... for a Recording, CA... for a Call) from the
 * `filePath` and/or `fileName` columns of our `Recording` row.
 *
 * Historically these have been written in different formats by different code
 * paths:
 *   - filePath = "RExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"   (preferred — just the SID)
 *   - filePath = "https://api.twilio.com/.../Recordings/RExxxxx.mp3"
 *   - filePath = "/2010-04-01/Accounts/AC.../Recordings/RExxxxx"
 *   - fileName = "CAxxxxx_2026-04-28T19-21-42-432Z.mp3"
 *   - fileName = "REyyy.wav"
 * Returns the SID if found, otherwise null.
 */
function extractTwilioSid(filePath: string | null, fileName: string | null): string | null {
  const candidates: string[] = [];

  if (filePath) {
    // Match against any RE/CA SID inside a URL or path.
    const m = filePath.match(/\b(RE[a-f0-9]{32}|CA[a-f0-9]{32})\b/i);
    if (m) candidates.push(m[1]);

    // If filePath is just the SID itself.
    if (/^(RE|CA)[a-f0-9]{32}$/i.test(filePath)) candidates.push(filePath);
  }

  if (fileName) {
    // fileName like "CAxxx_timestamp.mp3" → take everything before the first '_'.
    const beforeUnderscore = fileName.split('_')[0]?.replace(/\.(mp3|wav)$/i, '');
    if (beforeUnderscore && /^(RE|CA)[a-f0-9]{32}$/i.test(beforeUnderscore)) {
      candidates.push(beforeUnderscore);
    }
    // fileName like "RExxx.wav".
    const stripped = fileName.replace(/\.(mp3|wav)$/i, '');
    if (/^(RE|CA)[a-f0-9]{32}$/i.test(stripped)) candidates.push(stripped);
  }

  // Prefer Recording SIDs (RE) over Call SIDs (CA) when both are available, since
  // RE SIDs go directly to the audio file (no extra REST round-trip).
  const re = candidates.find(c => /^RE/i.test(c));
  if (re) return re;
  const ca = candidates.find(c => /^CA/i.test(c));
  return ca || null;
}

/** Resolve Twilio Recording SID (RE…) for a row; may fall back to CallRecord.recording / callId (CA…). */
async function resolveToRecordingSid(
  recording: { filePath: string | null; fileName: string | null },
  callRecord: { recording: string | null; callId: string } | null
): Promise<string | null> {
  let sid =
    extractTwilioSid(recording.filePath, recording.fileName) ||
    extractTwilioSid(callRecord?.recording ?? null, null) ||
    extractTwilioSid(callRecord?.callId ?? null, null);
  if (!sid) return null;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;

  if (sid.startsWith('RE')) return sid;

  if (sid.startsWith('CA')) {
    const auth = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
    const fetch = (await import('node-fetch')).default;
    const recordingsListUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${sid}/Recordings.json`;
    const listResponse = await fetch(recordingsListUrl, { headers: { Authorization: auth } });
    if (!listResponse.ok) return null;
    const recordingsList: any = await listResponse.json();
    const recs = recordingsList?.recordings;
    if (!recs?.length) return null;
    const dual = recs.find((r: { channels?: number }) => r.channels === 2);
    return (dual || recs[0])?.sid || null;
  }

  return null;
}

router.use(authenticate);

/**
 * GET /api/recordings/test — smoke check (authenticated staff only).
 */
router.get('/test', requireRole('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'), async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Recordings route is working!' });
});

/**
 * GET /api/recordings/:id/stream
 * Stream recording audio from Twilio (buffered for reliable Range/pause in browsers)
 */
router.get('/:id/stream', requireRole('AGENT', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const recording = await prisma.recording.findUnique({
      where: { id },
      include: {
        callRecord: {
          select: { agentId: true, recording: true, callId: true },
        },
      },
    });

    if (!recording) {
      return res.status(404).json({
        success: false,
        error: 'Recording not found',
      });
    }

    if (req.user?.role === 'AGENT') {
      const allowed = await userOwnsCallRecording(req.user.userId, recording.callRecord?.agentId ?? null);
      if (!allowed) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const sid = await resolveToRecordingSid(
      { filePath: recording.filePath, fileName: recording.fileName },
      recording.callRecord
    );

    const isTwilioHosted = recording.storageType === 'twilio' || !!sid;
    if (!isTwilioHosted) {
      return res.status(501).json({
        success: false,
        error: 'Recording storage not supported',
        details: `storageType=${recording.storageType}, filePath=${recording.filePath}`,
      });
    }

    if (!sid) {
      return res.status(500).json({
        success: false,
        error: 'Could not resolve Twilio recording SID',
        details: `fileName=${recording.fileName}, filePath=${recording.filePath}`,
      });
    }

    const media = await streamTwilioRecording(sid);
    if (!media) {
      return res.status(502).json({
        success: false,
        error: 'Recording not yet available on Twilio',
        recordingSid: sid,
      });
    }

    res.set({
      'Content-Type': media.contentType,
      'Content-Disposition': `inline; filename="${recording.fileName || 'recording'}"`,
      'Content-Length': String(media.buffer.length),
      'Cache-Control': 'public, max-age=3600',
      'Accept-Ranges': 'bytes',
    });

    return res.send(media.buffer);
  } catch (error) {
    console.error('❌ Recording streaming error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to stream recording',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    });
  }
});

/**
 * GET /api/recordings/:id/download
 * Download full recording bytes (same Twilio resolution as stream)
 */
router.get('/:id/download', requireRole('AGENT', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const recording = await prisma.recording.findUnique({
      where: { id },
      include: {
        callRecord: {
          select: { agentId: true, recording: true, callId: true },
        },
      },
    });

    if (!recording) {
      return res.status(404).json({ success: false, error: 'Recording not found' });
    }

    if (req.user?.role === 'AGENT') {
      const allowed = await userOwnsCallRecording(req.user.userId, recording.callRecord?.agentId ?? null);
      if (!allowed) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const sid = await resolveToRecordingSid(
      { filePath: recording.filePath, fileName: recording.fileName },
      recording.callRecord
    );

    if (!sid) {
      return res.status(500).json({
        success: false,
        error: 'Could not resolve Twilio recording SID',
      });
    }

    const media = await streamTwilioRecording(sid);
    if (!media) {
      return res.status(502).json({
        success: false,
        error: 'Recording not yet available on Twilio',
      });
    }

    const baseName = (recording.fileName || `recording-${id}`).replace(/[^\w.\-]+/g, '_');
    const hasExt = /\.(mp3|wav)$/i.test(baseName);
    const downloadName = hasExt ? baseName : baseName + (media.contentType.includes('wav') ? '.wav' : '.mp3');

    res.set({
      'Content-Type': media.contentType,
      'Content-Disposition': `attachment; filename="${downloadName}"`,
      'Content-Length': String(media.buffer.length),
    });

    return res.send(media.buffer);
  } catch (error) {
    console.error('❌ Recording download error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to download recording',
    });
  }
});

/**
 * GET /api/recordings/:id
 * Get recording metadata
 */
router.get('/:id', requireRole('AGENT', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const recording = await prisma.recording.findUnique({
      where: { id },
      include: { callRecord: true }
    });

    if (!recording) {
      return res.status(404).json({ 
        success: false, 
        error: 'Recording not found' 
      });
    }

    res.json({
      success: true,
      recording
    });

  } catch (error) {
    console.error('❌ Recording fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recording',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

export default router;