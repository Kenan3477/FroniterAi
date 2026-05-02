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
import twilio from 'twilio';

const router = express.Router();

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

router.use(authenticate);

/**
 * GET /api/recordings/test — smoke check (authenticated staff only).
 */
router.get('/test', requireRole('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'), async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Recordings route is working!' });
});

/**
 * GET /api/recordings/:id/stream
 * Stream recording audio from Twilio
 */
router.get('/:id/stream', requireRole('AGENT', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log(`🎵 Streaming request for recording ID: ${id}`);

    // Find the recording in our database
    const recording = await prisma.recording.findUnique({
      where: { id },
      include: { callRecord: true }
    });

    if (!recording) {
      console.log(`❌ Recording not found: ${id}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Recording not found' 
      });
    }

    console.log(`✅ Recording found: ${recording.fileName} (storageType=${recording.storageType})`);
    console.log(`📁 File path: ${recording.filePath}`);

    // Try to extract a Twilio SID from filePath / fileName. In our schema:
    //   - filePath holds either a full Twilio URL or just the SID (e.g. "REe1fb...")
    //   - fileName looks like "<CallSid>_<timestamp>.mp3" or "RE...wav"
    const recordingSid = extractTwilioSid(recording.filePath, recording.fileName);

    // We can stream from Twilio whenever:
    //   (a) storageType is 'twilio', or
    //   (b) we successfully extracted an RE/CA SID — older code paths set
    //       storageType='local' even though the file lives on Twilio.
    const isTwilioHosted = recording.storageType === 'twilio' || !!recordingSid;

    if (!isTwilioHosted) {
      console.warn(`⚠️ Recording ${id} is not Twilio-hosted and no local-file streaming is implemented`);
      return res.status(501).json({
        success: false,
        error: 'Recording storage not supported',
        details: `storageType=${recording.storageType}, filePath=${recording.filePath}`,
      });
    }

    if (!recordingSid) {
      console.error(`❌ Could not extract Twilio SID from recording ${id}`, {
        fileName: recording.fileName,
        filePath: recording.filePath,
      });
      return res.status(500).json({
        success: false,
        error: 'Could not extract Twilio recording SID',
        details: `fileName=${recording.fileName}, filePath=${recording.filePath}`,
      });
    }

    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not configured');
      }

      const auth = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
      const fetch = (await import('node-fetch')).default;

      let mediaUrl: string;

      if (recordingSid.startsWith('CA')) {
        // Call SID → look up recordings for that call, then stream the first one.
        const recordingsListUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${recordingSid}/Recordings.json`;
        console.log(`📡 Fetching call recordings list: ${recordingsListUrl}`);

        const listResponse = await fetch(recordingsListUrl, { headers: { Authorization: auth } });
        if (!listResponse.ok) {
          throw new Error(`Twilio Calls API error: ${listResponse.status} ${listResponse.statusText}`);
        }

        const recordingsList: any = await listResponse.json();
        if (!recordingsList?.recordings?.length) {
          return res.status(404).json({
            success: false,
            error: 'No Twilio recordings found for this call',
            callSid: recordingSid,
          });
        }

        const actualRecordingSid = recordingsList.recordings[0].sid;
        mediaUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${actualRecordingSid}.mp3`;
        console.log(`📡 Resolved Call SID ${recordingSid} → Recording SID ${actualRecordingSid}`);
      } else {
        // Recording SID (RE...) → direct access. Use .mp3 (smaller, also what we stored).
        mediaUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`;
      }

      console.log(`📡 Streaming from Twilio: ${mediaUrl}`);
      const twilioResponse = await fetch(mediaUrl, { headers: { Authorization: auth } });

      if (!twilioResponse.ok) {
        // Recording probably hasn't finished uploading yet on Twilio's side.
        console.error(`❌ Twilio media error: ${twilioResponse.status} ${twilioResponse.statusText}`);
        return res.status(twilioResponse.status === 404 ? 404 : 502).json({
          success: false,
          error: 'Recording not yet available on Twilio',
          details: `${twilioResponse.status} ${twilioResponse.statusText}`,
          recordingSid,
        });
      }

      const contentType = twilioResponse.headers.get('content-type') || 'audio/mpeg';
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${recording.fileName}"`,
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes',
      });

      console.log(`🎵 Streaming audio: ${recording.fileName} (${contentType})`);
      twilioResponse.body.pipe(res);
    } catch (twilioError: any) {
      console.error('❌ Twilio streaming error:', twilioError);
      return res.status(502).json({
        success: false,
        error: 'Failed to stream recording from Twilio',
        details: twilioError?.message || String(twilioError),
      });
    }

  } catch (error) {
    console.error('❌ Recording streaming error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stream recording',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/recordings/:id
 * Get recording metadata
 */
router.get('/:id', requireRole('AGENT', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
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