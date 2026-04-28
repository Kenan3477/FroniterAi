/**
 * Recording API Routes - Enhanced with Twilio Integration
 * Handles recording download, streaming, and Twilio sync
 */

import express, { Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { prisma } from '../database/index';
import { syncAllRecordings, getRecordingSyncStatus } from '../services/recordingSyncService';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Apply authentication to all recording routes
router.use(authenticate);

const RECORDINGS_DIR = process.env.RECORDINGS_DIR || path.join(process.cwd(), 'recordings');

/**
 * GET /api/recordings/:id/stream
 * Stream a recording file for playback
 */
router.get('/:id/stream', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req: Request, res: Response) => {
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

    // Security: Agents can only access their own recordings
    if (req.user?.role === 'AGENT' && recording.callRecord.agentId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if this is a Twilio recording URL or SID
    const filePath = recording.filePath;
    
    // Handle Twilio recordings in different formats:
    // 1. Full URL: https://api.twilio.com/.../Recordings/RExxxxx.mp3
    // 2. Recording SID directly: RExxxxx
    const isTwilioUrl = filePath && filePath.includes('api.twilio.com');
    const isTwilioSid = filePath && /^RE[a-zA-Z0-9]{32}$/.test(filePath);
    
    if (isTwilioUrl || isTwilioSid) {
      let recordingSid: string;
      
      if (isTwilioUrl) {
        // Extract SID from URL
        const recordingSidMatch = filePath.match(/\/Recordings\/(RE[a-zA-Z0-9]+)/);
        if (!recordingSidMatch) {
          return res.status(400).json({
            success: false,
            error: 'Invalid Twilio recording URL format'
          });
        }
        recordingSid = recordingSidMatch[1];
      } else {
        // Use the SID directly
        recordingSid = filePath;
      }
      
      console.log(`🎵 Streaming Twilio recording: ${recordingSid} (from ${isTwilioUrl ? 'URL' : 'SID'})`);
      
      try {
        // Import Twilio service
        const { streamTwilioRecording } = await import('../services/twilioService');
        
        // Stream the recording with authentication
        const audioBuffer = await streamTwilioRecording(recordingSid);
        
        if (!audioBuffer) {
          return res.status(404).json({
            success: false,
            error: 'Twilio recording not found or inaccessible'
          });
        }
        
        // Set headers for audio streaming
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', audioBuffer.length);
        res.setHeader('Content-Disposition', `inline; filename="${recording.fileName}"`);
        
        // Stream the audio buffer to client
        res.send(audioBuffer);
        
        console.log(`✅ Successfully streaming Twilio recording: ${recordingSid}`);
        return;
        
      } catch (twilioError) {
        console.error(`❌ Error streaming from Twilio: ${twilioError}`);
        return res.status(500).json({
          success: false,
          error: 'Failed to stream from Twilio'
        });
      }
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
router.get('/:id/download', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req: Request, res: Response) => {
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

    // Security: Agents can only access their own recordings
    if (req.user?.role === 'AGENT' && recording.callRecord.agentId !== req.user.userId) {
      console.error(`🔒 Access denied: User ${req.user.userId} tried to access recording from agent ${recording.callRecord.agentId}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if this is a Twilio recording URL or SID for download
    const filePath = recording.filePath;
    
    if (!filePath) {
      console.error(`❌ No file path stored for recording: ${recordingId}`);
      return res.status(404).json({
        success: false,
        error: 'Recording file path not available',
        details: 'This recording does not have a file path stored. It may still be processing or failed to upload.'
      });
    }
    
    // Handle Twilio recordings in different formats:
    // 1. Full URL: https://api.twilio.com/.../Recordings/RExxxxx.mp3
    // 2. Recording SID directly: RExxxxx
    const isTwilioUrl = filePath && filePath.includes('api.twilio.com');
    const isTwilioSid = filePath && /^RE[a-zA-Z0-9]{32}$/.test(filePath);
    
    if (isTwilioUrl || isTwilioSid) {
      let recordingSid: string;
      
      if (isTwilioUrl) {
        // Extract SID from URL
        const recordingSidMatch = filePath.match(/\/Recordings\/(RE[a-zA-Z0-9]+)/);
        if (!recordingSidMatch) {
          console.error(`❌ Invalid Twilio URL format: ${filePath}`);
          return res.status(400).json({
            success: false,
            error: 'Invalid Twilio recording URL format',
            details: filePath
          });
        }
        recordingSid = recordingSidMatch[1];
      } else {
        // Use the SID directly
        recordingSid = filePath;
      }
      
      console.log(`📥 Downloading Twilio recording: ${recordingSid} (from ${isTwilioUrl ? 'URL' : 'SID'})`);
      
      try {
        // Import Twilio service
        const { streamTwilioRecording } = await import('../services/twilioService');
        
        // Download the recording with authentication
        const audioBuffer = await streamTwilioRecording(recordingSid);
        
        if (!audioBuffer) {
          console.error(`❌ Twilio returned empty buffer for: ${recordingSid}`);
          return res.status(404).json({
            success: false,
            error: 'Twilio recording not found or inaccessible',
            details: `Recording SID: ${recordingSid}. Check Twilio credentials and that the recording exists.`
          });
        }
        
        console.log(`✅ Successfully downloaded ${audioBuffer.length} bytes from Twilio`);
        
        // Set headers for audio download
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${recording.fileName}"`);
        res.setHeader('Content-Length', audioBuffer.length);
        
        // Send the audio buffer for download
        res.send(audioBuffer);
        
        console.log(`✅ Successfully sent Twilio recording to client: ${recordingSid}`);
        return;
        
      } catch (twilioError: any) {
        console.error(`❌ Error downloading from Twilio:`, twilioError);
        return res.status(500).json({
          success: false,
          error: 'Failed to download from Twilio',
          details: twilioError.message || 'Twilio API error. Check credentials and recording availability.'
        });
      }
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