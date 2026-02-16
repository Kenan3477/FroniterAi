#!/usr/bin/env node

/**
 * Minimal Backend for Recording System Testing
 * Starts a simple server with just recording endpoints
 */

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = 3004;

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'omnivox-recording-test' });
});

// Call Records endpoint (simplified)
app.get('/api/call-records', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const records = await prisma.callRecord.findMany({
      take: parseInt(limit),
      orderBy: { startTime: 'desc' },
      include: {
        recordingFile: {
          select: {
            id: true,
            fileName: true,
            uploadStatus: true,
            duration: true,
            filePath: true
          }
        }
      }
    });

    const total = await prisma.callRecord.count();

    res.json({
      success: true,
      records,
      pagination: {
        total,
        limit: parseInt(limit),
        currentPage: 1,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Call records search error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

// Recording metadata endpoint
app.get('/api/recordings/:recordingId/metadata', async (req, res) => {
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
            outcome: true,
            duration: true
          }
        }
      }
    });

    if (!recording) {
      return res.status(404).json({
        success: false,
        error: { message: 'Recording not found' }
      });
    }

    res.json({
      success: true,
      recording
    });

  } catch (error) {
    console.error('Recording metadata error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

// Recording download endpoint
app.get('/api/recordings/:recordingId/download', async (req, res) => {
  try {
    const { recordingId } = req.params;

    const recording = await prisma.recording.findUnique({
      where: { id: recordingId }
    });

    if (!recording) {
      return res.status(404).json({
        success: false,
        error: { message: 'Recording not found' }
      });
    }

    if (!recording.filePath) {
      return res.status(404).json({
        success: false,
        error: { message: 'Recording file not available' }
      });
    }

    // In production, this would stream the actual file
    // For testing, return the file path info
    res.json({
      success: true,
      recording,
      filePath: recording.filePath
    });

  } catch (error) {
    console.error('Recording download error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

// Recording status callback (from Twilio)
app.post('/api/dialer/recording-status', async (req, res) => {
  try {
    const { RecordingSid, CallSid, RecordingStatus, RecordingUrl, RecordingDuration } = req.body;

    console.log('📹 Recording status callback:', {
      RecordingSid,
      CallSid,
      RecordingStatus,
      RecordingUrl,
      RecordingDuration
    });

    if (RecordingStatus === 'completed' && RecordingUrl) {
      // Find the call record
      const callRecord = await prisma.callRecord.findFirst({
        where: { recording: CallSid }
      });

      if (callRecord) {
        // Create or update recording record
        const recording = await prisma.recording.upsert({
          where: { callRecordId: callRecord.id },
          update: {
            uploadStatus: 'completed',
            filePath: RecordingUrl,
            duration: RecordingDuration ? parseInt(RecordingDuration) : null
          },
          create: {
            callRecordId: callRecord.id,
            fileName: `${RecordingSid}_${new Date().toISOString().replace(/[:.]/g, '-')}.mp3`,
            uploadStatus: 'completed',
            filePath: RecordingUrl,
            duration: RecordingDuration ? parseInt(RecordingDuration) : null
          }
        });

        console.log('✅ Recording processed:', recording.fileName);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Recording callback error:', error);
    res.sendStatus(200); // Always respond OK to Twilio
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Omnivox Recording Test Server running on port ${PORT}`);
  console.log(`📊 Call Records: http://localhost:${PORT}/api/call-records`);
  console.log(`🎵 Recording endpoints: http://localhost:${PORT}/api/recordings/*`);
  console.log(`📞 Twilio webhook: http://localhost:${PORT}/api/dialer/recording-status`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});