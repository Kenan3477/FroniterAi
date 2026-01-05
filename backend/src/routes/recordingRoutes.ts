/**
 * Recording API Routes
 * Handles recording download, streaming, and metadata endpoints
 */

import express from 'express';
import { 
  getRecordingFilePath, 
  getRecordingMetadata,
  getCallRecordingInfo 
} from '../services/recordingService';
import path from 'path';
import fs from 'fs';

const router = express.Router();

/**
 * Download recording file
 * GET /api/recordings/:recordingId/download
 */
router.get('/:recordingId/download', async (req, res) => {
  try {
    const { recordingId } = req.params;
    
    console.log(`📥 Recording download requested: ${recordingId}`);
    
    // Get recording metadata and file path
    const [metadata, filePath] = await Promise.all([
      getRecordingMetadata(recordingId),
      getRecordingFilePath(recordingId)
    ]);
    
    if (!metadata || !filePath) {
      return res.status(404).json({
        success: false,
        error: 'Recording not found or not available'
      });
    }
    
    if (metadata.uploadStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        error: `Recording not ready: ${metadata.uploadStatus}`
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Recording file not found on disk'
      });
    }
    
    // Set appropriate headers for audio download
    const fileName = metadata.fileName || `recording-${recordingId}.mp3`;
    const fileSize = metadata.fileSize || fs.statSync(filePath).size;
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', fileSize.toString());
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
    
    // Stream the file
    const readStream = fs.createReadStream(filePath);
    
    readStream.on('error', (error) => {
      console.error(`Error streaming recording ${recordingId}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Error streaming recording' });
      }
    });
    
    readStream.pipe(res);
    
    console.log(`✅ Recording download started: ${fileName} (${fileSize} bytes)`);
    
  } catch (error) {
    console.error('Error downloading recording:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Stream recording for playback (supports range requests)
 * GET /api/recordings/:recordingId/stream
 */
router.get('/:recordingId/stream', async (req, res) => {
  try {
    const { recordingId } = req.params;
    
    console.log(`🎵 Recording stream requested: ${recordingId}`);
    
    // Get recording metadata and file path
    const [metadata, filePath] = await Promise.all([
      getRecordingMetadata(recordingId),
      getRecordingFilePath(recordingId)
    ]);
    
    if (!metadata || !filePath) {
      return res.status(404).json({
        success: false,
        error: 'Recording not found'
      });
    }
    
    if (metadata.uploadStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        error: `Recording not ready: ${metadata.uploadStatus}`
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Recording file not found'
      });
    }
    
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      // Handle range requests for audio seeking
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      const readStream = fs.createReadStream(filePath, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, max-age=3600'
      });
      
      readStream.pipe(res);
    } else {
      // Full file stream
      res.writeHead(200, {
        'Content-Length': fileSize.toString(),
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600'
      });
      
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    }
    
    console.log(`✅ Recording stream started: ${metadata.fileName}`);
    
  } catch (error) {
    console.error('Error streaming recording:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get recording metadata
 * GET /api/recordings/:recordingId/info
 */
router.get('/:recordingId/info', async (req, res) => {
  try {
    const { recordingId } = req.params;
    
    const metadata = await getRecordingMetadata(recordingId);
    
    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: 'Recording not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: metadata.id,
        fileName: metadata.fileName,
        fileSize: metadata.fileSize,
        duration: metadata.duration,
        format: metadata.format,
        quality: metadata.quality,
        uploadStatus: metadata.uploadStatus,
        createdAt: metadata.createdAt,
        callRecord: metadata.callRecord ? {
          callId: metadata.callRecord.callId,
          phoneNumber: metadata.callRecord.phoneNumber,
          startTime: metadata.callRecord.startTime,
          callDuration: metadata.callRecord.duration
        } : null,
        downloadUrl: `/api/recordings/${recordingId}/download`,
        streamUrl: `/api/recordings/${recordingId}/stream`
      }
    });
    
  } catch (error) {
    console.error('Error getting recording metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get recording info for a specific call record
 * GET /api/call-records/:callRecordId/recording
 */
router.get('/call/:callRecordId', async (req, res) => {
  try {
    const { callRecordId } = req.params;
    
    const recordingInfo = await getCallRecordingInfo(callRecordId);
    
    if (!recordingInfo) {
      return res.status(404).json({
        success: false,
        error: 'No recording found for this call'
      });
    }
    
    res.json({
      success: true,
      data: {
        ...recordingInfo,
        downloadUrl: `/api/recordings/${recordingInfo.id}/download`,
        streamUrl: `/api/recordings/${recordingInfo.id}/stream`
      }
    });
    
  } catch (error) {
    console.error('Error getting call recording info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;