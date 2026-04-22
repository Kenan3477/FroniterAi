/**
 * Audio File Storage Controller
 * 
 * Handles upload, storage, and streaming of audio files for:
 * - Greeting messages
 * - Hold music
 * - IVR prompts
 * - Voicemail greetings
 * - Out-of-hours messages
 * - Announcements
 */

import { Request, Response } from 'express';
import { prisma } from '../database';
import multer from 'multer';
import { Readable } from 'stream';

// Configure multer for memory storage (we'll store in database)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files only
    const allowedMimes = [
      'audio/mpeg',      // MP3
      'audio/mp3',       // MP3 (alternative)
      'audio/wav',       // WAV
      'audio/wave',      // WAV (alternative)
      'audio/x-wav',     // WAV (alternative)
      'audio/mp4',       // M4A
      'audio/x-m4a',     // M4A (alternative)
      'audio/aac',       // AAC
      'audio/ogg',       // OGG
      'audio/flac',      // FLAC
      'audio/webm',      // WebM
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only audio files are allowed.`));
    }
  }
});

export const audioUploadMiddleware = upload.single('audio');

/**
 * POST /api/audio/upload
 * Upload a new audio file to the system
 */
export const uploadAudioFile = async (req: Request, res: Response) => {
  try {
    console.log('📤 Audio file upload request received');

    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided',
        message: 'Please provide an audio file to upload'
      });
    }

    const { 
      displayName, 
      type = 'other', 
      description = '', 
      tags = '[]',
      duration 
    } = req.body;

    const file = req.file;
    
    console.log('📁 File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      displayName,
      type
    });

    // Validate required fields
    if (!displayName) {
      return res.status(400).json({
        error: 'Display name is required',
        message: 'Please provide a display name for the audio file'
      });
    }

    // Get user ID from session/token (assuming auth middleware sets req.user)
    const uploadedBy = (req as any).user?.id || 'system';

    // Store audio file in database
    const audioFile = await prisma.audioFile.create({
      data: {
        filename: file.originalname,
        displayName,
        mimeType: file.mimetype,
        size: file.size,
        duration: duration ? parseFloat(duration) : null,
        type,
        description,
        tags,
        fileData: file.buffer, // Store binary data directly in database
        uploadedBy
      }
    });

    console.log('✅ Audio file stored in database:', audioFile.id);

    // Return file metadata (not the binary data)
    res.status(201).json({
      success: true,
      message: 'Audio file uploaded successfully',
      audioFile: {
        id: audioFile.id,
        filename: audioFile.filename,
        displayName: audioFile.displayName,
        mimeType: audioFile.mimeType,
        size: audioFile.size,
        duration: audioFile.duration,
        type: audioFile.type,
        description: audioFile.description,
        tags: audioFile.tags,
        uploadedBy: audioFile.uploadedBy,
        uploadedAt: audioFile.uploadedAt,
        // Generate URL for accessing this file
        url: `/api/audio/${audioFile.id}`,
        streamUrl: `/api/audio/stream/${audioFile.id}`
      }
    });

  } catch (error: any) {
    console.error('❌ Error uploading audio file:', error);
    res.status(500).json({
      error: 'Failed to upload audio file',
      message: error.message
    });
  }
};

/**
 * GET /api/audio/:id
 * Download an audio file
 */
export const downloadAudioFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('⬇️  Audio file download request:', id);

    const audioFile = await prisma.audioFile.findUnique({
      where: { id }
    });

    if (!audioFile) {
      return res.status(404).json({
        error: 'Audio file not found',
        message: `Audio file with ID ${id} does not exist`
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', audioFile.mimeType);
    res.setHeader('Content-Length', audioFile.size.toString());
    res.setHeader('Content-Disposition', `attachment; filename="${audioFile.filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Send binary data
    res.send(audioFile.fileData);

    console.log('✅ Audio file downloaded:', audioFile.filename);

  } catch (error: any) {
    console.error('❌ Error downloading audio file:', error);
    res.status(500).json({
      error: 'Failed to download audio file',
      message: error.message
    });
  }
};

/**
 * GET /api/audio/stream/:id
 * Stream an audio file for playback
 */
export const streamAudioFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('🎵 Audio file stream request:', id);

    const audioFile = await prisma.audioFile.findUnique({
      where: { id }
    });

    if (!audioFile) {
      return res.status(404).json({
        error: 'Audio file not found',
        message: `Audio file with ID ${id} does not exist`
      });
    }

    // Handle range requests for seeking in audio player
    const range = req.headers.range;
    const fileSize = audioFile.size;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': audioFile.mimeType,
        'Cache-Control': 'public, max-age=31536000'
      });

      // Send partial content
      res.end(audioFile.fileData.slice(start, end + 1));
    } else {
      // Send full file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': audioFile.mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000'
      });

      res.end(audioFile.fileData);
    }

    console.log('✅ Audio file streamed:', audioFile.filename);

  } catch (error: any) {
    console.error('❌ Error streaming audio file:', error);
    res.status(500).json({
      error: 'Failed to stream audio file',
      message: error.message
    });
  }
};

/**
 * GET /api/audio
 * List all audio files
 */
export const listAudioFiles = async (req: Request, res: Response) => {
  try {
    const { type, search } = req.query;

    console.log('📋 Listing audio files:', { type, search });

    const where: any = {};

    if (type && type !== 'all') {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { displayName: { contains: search as string, mode: 'insensitive' } },
        { filename: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const audioFiles = await prisma.audioFile.findMany({
      where,
      select: {
        id: true,
        filename: true,
        displayName: true,
        mimeType: true,
        size: true,
        duration: true,
        type: true,
        description: true,
        tags: true,
        uploadedBy: true,
        uploadedAt: true,
        updatedAt: true,
        // Don't return fileData in list (too large)
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    });

    // Add URLs to each file
    const audioFilesWithUrls = audioFiles.map(file => ({
      ...file,
      url: `/api/audio/${file.id}`,
      streamUrl: `/api/audio/stream/${file.id}`
    }));

    res.json({
      success: true,
      count: audioFiles.length,
      audioFiles: audioFilesWithUrls
    });

    console.log(`✅ Listed ${audioFiles.length} audio files`);

  } catch (error: any) {
    console.error('❌ Error listing audio files:', error);
    res.status(500).json({
      error: 'Failed to list audio files',
      message: error.message
    });
  }
};

/**
 * GET /api/audio/:id/metadata
 * Get audio file metadata only (no binary data)
 */
export const getAudioFileMetadata = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const audioFile = await prisma.audioFile.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        displayName: true,
        mimeType: true,
        size: true,
        duration: true,
        type: true,
        description: true,
        tags: true,
        uploadedBy: true,
        uploadedAt: true,
        updatedAt: true
      }
    });

    if (!audioFile) {
      return res.status(404).json({
        error: 'Audio file not found',
        message: `Audio file with ID ${id} does not exist`
      });
    }

    res.json({
      success: true,
      audioFile: {
        ...audioFile,
        url: `/api/audio/${audioFile.id}`,
        streamUrl: `/api/audio/stream/${audioFile.id}`
      }
    });

  } catch (error: any) {
    console.error('❌ Error getting audio file metadata:', error);
    res.status(500).json({
      error: 'Failed to get audio file metadata',
      message: error.message
    });
  }
};

/**
 * PATCH /api/audio/:id
 * Update audio file metadata
 */
export const updateAudioFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { displayName, type, description, tags } = req.body;

    console.log('📝 Updating audio file metadata:', id);

    const audioFile = await prisma.audioFile.update({
      where: { id },
      data: {
        displayName,
        type,
        description,
        tags
      },
      select: {
        id: true,
        filename: true,
        displayName: true,
        mimeType: true,
        size: true,
        duration: true,
        type: true,
        description: true,
        tags: true,
        uploadedBy: true,
        uploadedAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'Audio file updated successfully',
      audioFile: {
        ...audioFile,
        url: `/api/audio/${audioFile.id}`,
        streamUrl: `/api/audio/stream/${audioFile.id}`
      }
    });

    console.log('✅ Audio file updated:', audioFile.displayName);

  } catch (error: any) {
    console.error('❌ Error updating audio file:', error);
    res.status(500).json({
      error: 'Failed to update audio file',
      message: error.message
    });
  }
};

/**
 * DELETE /api/audio/:id
 * Delete an audio file
 */
export const deleteAudioFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('🗑️  Deleting audio file:', id);

    // Check if file is being used in any inbound numbers
    const inboundNumbers = await prisma.inboundNumber.findMany({
      where: {
        OR: [
          { greetingAudioUrl: { contains: id } },
          { outOfHoursAudioUrl: { contains: id } },
          { voicemailAudioUrl: { contains: id } }
        ]
      },
      select: {
        phoneNumber: true,
        displayName: true
      }
    });

    if (inboundNumbers.length > 0) {
      return res.status(400).json({
        error: 'Audio file is in use',
        message: `This audio file is being used by ${inboundNumbers.length} inbound number(s)`,
        inboundNumbers: inboundNumbers.map(n => `${n.displayName} (${n.phoneNumber})`)
      });
    }

    await prisma.audioFile.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Audio file deleted successfully'
    });

    console.log('✅ Audio file deleted');

  } catch (error: any) {
    console.error('❌ Error deleting audio file:', error);
    res.status(500).json({
      error: 'Failed to delete audio file',
      message: error.message
    });
  }
};
