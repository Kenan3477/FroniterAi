/**
 * Enhanced Recording Routes - Stream recordings from database with proper URL handling
 */

import express from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/recordings/:recordingId/stream
 * Stream a recording file (works with both Twilio URLs and local files)
 */
router.get('/:recordingId/stream', async (req: Request, res: Response) => {
  try {
    const { recordingId } = req.params;
    console.log(`🎵 Streaming recording: ${recordingId}`);

    // First try to find recording by ID
    let recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        callRecord: {
          select: {
            id: true,
            callId: true,
            phoneNumber: true
          }
        }
      }
    });

    // If not found by recordingId, try to find by callRecordId  
    if (!recording) {
      console.log(`🔍 Recording not found by ID, trying callRecordId: ${recordingId}`);
      recording = await prisma.recording.findFirst({
        where: { callRecordId: recordingId },
        include: {
          callRecord: {
            select: {
              id: true,
              callId: true,
              phoneNumber: true
            }
          }
        }
      });
    }

    if (!recording) {
      console.log(`❌ Recording not found: ${recordingId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Recording not found' 
      });
    }

    console.log(`✅ Found recording: ${recording.fileName} (${recording.uploadStatus})`);

    // If recording is not completed, return error
    if (recording.uploadStatus !== 'completed') {
      console.log(`⚠️ Recording not ready: ${recording.uploadStatus}`);
      return res.status(503).json({
        success: false,
        error: 'Recording not ready',
        status: recording.uploadStatus
      });
    }

    // Handle Twilio URLs (stored as filePath)
    if (recording.storageType === 'twilio' || recording.filePath.startsWith('https://')) {
      console.log(`📡 Proxying Twilio recording: ${recording.filePath}`);
      
      try {
        // Set up Twilio authentication
        const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        
        // Fetch from Twilio
        const twilioResponse = await fetch(recording.filePath, {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        });

        if (!twilioResponse.ok) {
          throw new Error(`Twilio API error: ${twilioResponse.status} ${twilioResponse.statusText}`);
        }

        // Set appropriate headers
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `inline; filename="${recording.fileName}"`);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        
        // Stream the response
        const stream = twilioResponse.body;
        if (stream) {
          stream.pipe(res);
        } else {
          throw new Error('No stream available from Twilio');
        }

        console.log(`✅ Successfully streamed Twilio recording`);
        
      } catch (twilioError: any) {
        console.error(`❌ Error streaming from Twilio:`, twilioError.message);
        return res.status(502).json({
          success: false,
          error: 'Failed to retrieve recording from Twilio',
          message: twilioError.message
        });
      }
      
    } else {
      // Handle local files
      console.log(`📁 Streaming local file: ${recording.filePath}`);
      
      try {
        const fs = await import('fs');
        const path = await import('path');
        
        // Check if file exists
        if (!fs.existsSync(recording.filePath)) {
          console.log(`❌ Local file not found: ${recording.filePath}`);
          return res.status(404).json({
            success: false,
            error: 'Recording file not found on disk'
          });
        }

        // Set headers
        const fileExtension = path.extname(recording.fileName).toLowerCase();
        const mimeType = fileExtension === '.wav' ? 'audio/wav' : 'audio/mpeg';
        
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${recording.fileName}"`);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        
        // Stream the local file
        const fileStream = fs.createReadStream(recording.filePath);
        fileStream.pipe(res);
        
        console.log(`✅ Successfully streamed local recording`);
        
      } catch (fileError: any) {
        console.error(`❌ Error streaming local file:`, fileError.message);
        return res.status(500).json({
          success: false,
          error: 'Failed to stream local recording file',
          message: fileError.message
        });
      }
    }

  } catch (error: any) {
    console.error('❌ Error in recording stream:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stream recording',
      message: error.message
    });
  }
});

/**
 * GET /api/recordings/:recordingId/download
 * Download a recording file (force download instead of stream)
 */
router.get('/:recordingId/download', async (req: Request, res: Response) => {
  try {
    const { recordingId } = req.params;
    console.log(`⬇️ Downloading recording: ${recordingId}`);

    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        callRecord: {
          select: {
            callId: true,
            phoneNumber: true,
            startTime: true
          }
        }
      }
    });

    if (!recording || recording.uploadStatus !== 'completed') {
      return res.status(404).json({ 
        success: false, 
        error: 'Recording not available for download' 
      });
    }

    // Create a descriptive filename for download
    const date = recording.callRecord.startTime.toISOString().split('T')[0];
    const phone = recording.callRecord.phoneNumber.replace(/\D/g, ''); // Remove non-digits
    const downloadFileName = `call_${phone}_${date}_${recording.callRecord.callId}.${recording.format}`;

    // Set download headers
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
    
    // Redirect to stream endpoint with download headers set
    const streamUrl = `/api/recordings/${recordingId}/stream`;
    return res.redirect(302, streamUrl);

  } catch (error: any) {
    console.error('❌ Error in recording download:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download recording',
      message: error.message
    });
  }
});

/**
 * GET /api/recordings/:recordingId
 * Get recording metadata
 */
router.get('/:recordingId', async (req: Request, res: Response) => {
  try {
    const { recordingId } = req.params;
    
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        callRecord: {
          select: {
            callId: true,
            phoneNumber: true,
            startTime: true,
            endTime: true,
            duration: true,
            campaign: {
              select: { name: true }
            },
            agent: {
              select: { firstName: true, lastName: true }
            },
            contact: {
              select: { firstName: true, lastName: true }
            }
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

    return res.json({
      success: true,
      data: {
        id: recording.id,
        fileName: recording.fileName,
        duration: recording.duration,
        format: recording.format,
        quality: recording.quality,
        uploadStatus: recording.uploadStatus,
        createdAt: recording.createdAt,
        streamUrl: `https://froniterai-production.up.railway.app/api/recordings/${recording.id}/stream`,
        downloadUrl: `https://froniterai-production.up.railway.app/api/recordings/${recording.id}/download`,
        call: {
          callId: recording.callRecord.callId,
          phoneNumber: recording.callRecord.phoneNumber,
          startTime: recording.callRecord.startTime,
          endTime: recording.callRecord.endTime,
          duration: recording.callRecord.duration,
          campaign: recording.callRecord.campaign?.name,
          agent: recording.callRecord.agent 
            ? `${recording.callRecord.agent.firstName} ${recording.callRecord.agent.lastName}` 
            : null,
          contact: recording.callRecord.contact 
            ? `${recording.callRecord.contact.firstName} ${recording.callRecord.contact.lastName}` 
            : null
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error getting recording metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recording information',
      message: error.message
    });
  }
});

export default router;