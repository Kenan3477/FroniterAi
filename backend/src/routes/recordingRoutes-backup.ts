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

    // Check if file exists
    const filePath = recording.filePath;
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

    // Check if file exists
    const filePath = recording.filePath;
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
      message: `Recording sync completed: ${result.synced} recordings synced, ${result.errors} errors`
    });
  } catch (error) {
    console.error('❌ Error in recording sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync recordings',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/recordings/sync-status
 * Get recording sync status
 */
router.get('/sync-status', requireRole('SUPERVISOR', 'ADMIN'), async (req: Request, res: Response) => {
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