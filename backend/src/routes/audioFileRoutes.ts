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
      'audio/ogg',            // OGG
      'audio/webm',           // WebM audio
      'audio/flac',           // FLAC
      'audio/x-flac'          // FLAC (alternative)
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC, WebM`));
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
    
    res.json({
      success: true,
      audioFiles
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
    
    res.json({
      success: true,
      message: 'Audio file uploaded successfully',
      audioFile: {
        id: audioFile.id,
        displayName: audioFile.displayName,
        filename: audioFile.filename,
        size: audioFile.size,
        type: audioFile.type,
        duration: audioFile.duration
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
