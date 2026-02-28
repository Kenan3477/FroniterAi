/**
 * Recording Streaming Routes
 * Handles audio playback from Twilio recordings
 */

import express, { Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { prisma } from '../database/index';
import twilio from 'twilio';

const router = express.Router();

/**
 * GET /api/recordings/test
 * Test endpoint to verify route registration - NO AUTH for testing
 */
router.get('/test', async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Recordings route is working!' });
});

// Apply authentication to all other routes  
router.use(authenticate);

/**
 * GET /api/recordings/:id/stream
 * Stream recording audio from Twilio
 */
router.get('/:id/stream', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req: Request, res: Response) => {
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

    console.log(`✅ Recording found: ${recording.fileName}`);
    console.log(`📁 File path: ${recording.filePath}`);

    // If the recording is stored in Twilio, stream from there
    if (recording.storageType === 'twilio') {
      try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        
        if (!accountSid || !authToken) {
          throw new Error('Twilio credentials not configured');
        }

        const client = twilio(accountSid, authToken);
        
        // Extract recording SID from filename or filePath
        let recordingSid = '';
        if (recording.fileName.includes('_')) {
          recordingSid = recording.fileName.split('_')[1]?.replace('.wav', '');
        }
        
        if (!recordingSid && recording.filePath) {
          // Extract SID from filePath like: /2010-04-01/Accounts/.../Recordings/RE123...
          const pathParts = recording.filePath.split('/');
          recordingSid = pathParts[pathParts.length - 1];
        }

        if (!recordingSid) {
          throw new Error('Could not extract recording SID');
        }

        console.log(`🔍 Extracting recording SID: ${recordingSid}`);

        // Get the recording from Twilio
        const twilioRecording = await client.recordings(recordingSid).fetch();
        
        // Build the media URL for the recording
        const mediaUrl = `https://api.twilio.com${twilioRecording.uri.replace('.json', '.wav')}`;
        
        console.log(`📡 Fetching audio from Twilio: ${mediaUrl}`);

        // Fetch the audio file from Twilio
        const fetch = (await import('node-fetch')).default;
        const twilioResponse = await fetch(mediaUrl, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
          }
        });

        if (!twilioResponse.ok) {
          throw new Error(`Twilio API error: ${twilioResponse.status} ${twilioResponse.statusText}`);
        }

        // Set proper headers for audio streaming
        res.set({
          'Content-Type': 'audio/wav',
          'Content-Disposition': `inline; filename="${recording.fileName}"`,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*'
        });

        console.log(`🎵 Streaming audio for recording: ${recording.fileName}`);

        // Stream the audio data
        twilioResponse.body.pipe(res);

      } catch (twilioError) {
        console.error('❌ Twilio streaming error:', twilioError);
        return res.status(500).json({
          success: false,
          error: 'Failed to stream recording from Twilio',
          details: twilioError instanceof Error ? twilioError.message : String(twilioError)
        });
      }
    } else {
      // Handle local file streaming (if we ever store files locally)
      return res.status(501).json({
        success: false,
        error: 'Local file streaming not implemented'
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
router.get('/:id', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req: Request, res: Response) => {
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