/**
 * Audio File Management Routes
 * Handles upload, retrieval, and management of audio files for IVR, hold music, voicemail, etc.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { AudioFileService } from '../services/audioFileService';
import { isTwilioPlayCompatibleMime } from '../utils/twilioPlayMime';

const router = Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/audio');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-uuid.ext
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept all common audio formats including Apple M4A
    const allowedMimes = [
      'audio/mpeg',           // MP3
      'audio/mp3',            // MP3 (alternative)
      'audio/wav',            // WAV
      'audio/wave',           // WAV (alternative)
      'audio/x-wav',          // WAV (alternative)
      'audio/mp4',            // M4A (Apple audio)
      'audio/x-m4a',          // M4A (alternative)
      'audio/aac',            // AAC
      'audio/ogg',            // OGG (may not work on all Twilio paths — prefer MP3/WAV)
      'audio/flac',           // FLAC
      'audio/x-flac'          // FLAC (alternative)
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Use MP3, WAV, or M4A (AAC) for phone prompts.`));
    }
  }
});

/**
 * GET /api/voice/audio-files
 * Retrieve all uploaded audio files
 */
router.get('/audio-files', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('📁 Fetching all audio files...');
    
    const audioFiles = await AudioFileService.getAllAudioFiles();
    
    // Transform database fields to match frontend expectations
    const transformedFiles = audioFiles.map(file => {
      // Parse tags from JSON string
      let tags: string[] = [];
      if (file.tags) {
        try {
          tags = JSON.parse(file.tags);
        } catch (e) {
          console.warn(`Failed to parse tags for file ${file.id}:`, file.tags);
          tags = [];
        }
      }
      
      // Extract format from mimeType (e.g., "audio/mpeg" -> "mpeg" or "mp3")
      const format = file.mimeType?.split('/')[1] || 'unknown';
      
      return {
        id: file.id,
        name: file.displayName,
        filename: file.filename,
        format: format,
        mimeType: file.mimeType,
        size: file.size,
        duration: file.duration || 0,
        type: file.type,
        description: file.description || '',
        tags: tags,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.uploadedAt
      };
    });
    
    res.json({
      success: true,
      audioFiles: transformedFiles
    });
  } catch (error: any) {
    console.error('❌ Error fetching audio files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audio files',
      error: error.message
    });
  }
});

/**
 * GET /api/voice/audio-files/:id
 * Retrieve a specific audio file by ID
 */
router.get('/audio-files/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const audioFile = await AudioFileService.getAudioFileById(id);
    
    if (!audioFile) {
      return res.status(404).json({
        success: false,
        message: 'Audio file not found'
      });
    }
    
    res.json({
      success: true,
      audioFile
    });
  } catch (error: any) {
    console.error('❌ Error fetching audio file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audio file',
      error: error.message
    });
  }
});

/**
 * GET /api/voice/audio-files/:id/stream
 * Stream audio file for playback (returns audio binary data)
 */
router.get('/audio-files/:id/stream', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log(`🎵 Streaming audio file: ${id}`);
    
    const audioFile = await AudioFileService.getAudioFileById(id);
    
    if (!audioFile) {
      console.error(`❌ Audio file not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Audio file not found'
      });
    }
    
    if (!audioFile.fileData) {
      console.error(`❌ No file data for audio file: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Audio file data not found'
      });
    }

    const buf = Buffer.isBuffer(audioFile.fileData as any)
      ? (audioFile.fileData as Buffer)
      : Buffer.from(audioFile.fileData as any);
    const safeName = (audioFile.displayName || audioFile.filename || 'prompt')
      .replace(/[^\w.\-]+/g, '_')
      .slice(0, 80);

    const mime = audioFile.mimeType || 'audio/mpeg';
    if (!isTwilioPlayCompatibleMime(mime)) {
      console.warn(
        `⚠️ Audio file ${id} has mime "${mime}" — Twilio <Play> cannot reliably decode this (causes static). Re-upload as MP3 or WAV.`,
      );
      return res.status(415).type('text/plain').send(
        'This audio format is not supported for phone playback. Re-upload as MP3 or WAV in Omnivox.',
      );
    }

    // Set appropriate headers for audio streaming (Twilio <Play> fetches as GET)
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);

    res.send(buf);
    
    console.log(`✅ Audio file streamed successfully: ${id} (${audioFile.displayName})`);
  } catch (error: any) {
    console.error('❌ Error streaming audio file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stream audio file',
      error: error.message
    });
  }
});

/**
 * POST /api/voice/audio-files/upload
 * Upload a new audio file
 */
router.post('/audio-files/upload', authenticate, upload.single('audio'), async (req: Request, res: Response) => {
  try {
    console.log('📤 Audio file upload request received');
    console.log('📤 User:', (req as any).user);
    console.log('📤 File:', req.file);
    console.log('📤 Body:', req.body);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided'
      });
    }
    
    const { name, type, description, tags } = req.body;
    
    if (!name || !type) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Name and type are required'
      });
    }
    
    // Read file data as Buffer for database storage
    const fileData = await fs.readFile(req.file.path);
    
    // Get audio duration (would need a library like 'music-metadata' for this)
    // For now, we'll estimate based on file size
    const estimatedDuration = Math.round(req.file.size / 16000); // Rough estimate
    
    // Parse tags
    const tagArray = tags ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [];
    
    // Determine MIME type from file extension
    const ext = path.extname(req.file.originalname).toLowerCase();
    const mimeTypeMap: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
      '.webm': 'audio/webm'
    };
    const format = ext.substring(1); // Remove the dot
    
    // Create audio file record
    const audioFile = await AudioFileService.createAudioFile({
      name,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      format,
      type,
      description: description || '',
      tags: tagArray,
      duration: estimatedDuration,
      uploadedBy: (req as any).user.id.toString(),
      fileData
    });
    
    // Clean up temp file after storing in database
    await fs.unlink(req.file.path);
    
    console.log('✅ Audio file uploaded successfully:', audioFile.id);
    
    // Parse tags from JSON string for response
    let parsedTags: string[] = [];
    if (audioFile.tags) {
      try {
        parsedTags = JSON.parse(audioFile.tags);
      } catch (e) {
        console.warn(`Failed to parse tags for uploaded file ${audioFile.id}`);
        parsedTags = [];
      }
    }
    
    // Extract format from mimeType
    const formatFromMime = audioFile.mimeType?.split('/')[1] || 'unknown';
    
    res.json({
      success: true,
      message: 'Audio file uploaded successfully',
      audioFile: {
        id: audioFile.id,
        name: audioFile.displayName,
        displayName: audioFile.displayName,
        filename: audioFile.filename,
        format: formatFromMime,
        mimeType: audioFile.mimeType,
        size: audioFile.size,
        type: audioFile.type,
        duration: audioFile.duration || 0,
        description: audioFile.description || '',
        tags: parsedTags,
        uploadedAt: audioFile.uploadedAt
      }
    });
  } catch (error: any) {
    console.error('❌ Error uploading audio file:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('❌ Error cleaning up file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload audio file',
      error: error.message
    });
  }
});

/**
 * DELETE /api/voice/audio-files/:id
 * Delete an audio file
 */
router.delete('/audio-files/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Deleting audio file:', id);
    
    // Get file info before deleting
    const audioFile = await AudioFileService.getAudioFileById(id);
    
    if (!audioFile) {
      return res.status(404).json({
        success: false,
        message: 'Audio file not found'
      });
    }
    
    // Delete from database
    await AudioFileService.deleteAudioFile(id);
    
    // Delete physical file
    const filePath = path.join(__dirname, '../../public/audio', audioFile.filename);
    try {
      await fs.unlink(filePath);
      console.log('✅ Physical file deleted:', filePath);
    } catch (error) {
      console.error('⚠️  Could not delete physical file (may already be deleted):', error);
    }
    
    res.json({
      success: true,
      message: 'Audio file deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ Error deleting audio file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete audio file',
      error: error.message
    });
  }
});

/**
 * PATCH /api/voice/audio-files/:id
 * Update audio file metadata
 */
router.patch('/audio-files/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, description, tags } = req.body;
    
    console.log('✏️ Updating audio file metadata:', id);
    
    const audioFile = await AudioFileService.updateAudioFile(id, {
      name,
      type,
      description,
      tags: tags ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : undefined
    });
    
    if (!audioFile) {
      return res.status(404).json({
        success: false,
        message: 'Audio file not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Audio file updated successfully',
      audioFile
    });
  } catch (error: any) {
    console.error('❌ Error updating audio file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update audio file',
      error: error.message
    });
  }
});

export default router;
