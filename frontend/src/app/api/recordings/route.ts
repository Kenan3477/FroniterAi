import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/recordings - List call recordings
export const GET = requireAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const callRecordId = searchParams.get('callRecordId');
    const status = searchParams.get('status');
    
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];
    if (callRecordId) whereConditions.push(`r.callRecordId = '${callRecordId}'`);
    if (status) whereConditions.push(`r.uploadStatus = '${status}'`);
    
    // For agents, only show their own recordings
    if (user.role === 'AGENT') {
      whereConditions.push(`cr.agentId = '${user.userId}'`);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get recordings with call details
    const recordings = await prisma.$queryRaw`
      SELECT r.id, r.callRecordId, r.fileName, r.filePath, r.fileSize,
             r.duration, r.format, r.quality, r.uploadStatus, r.createdAt,
             cr.callId, cr.phoneNumber, cr.outcome, cr.startTime, cr.endTime,
             c.firstName, c.lastName, c.company,
             t.id as transcriptionId, t.status as transcriptionStatus,
             t.text as transcriptionText, t.confidence as transcriptionConfidence
      FROM recordings r
      INNER JOIN call_records cr ON r.callRecordId = cr.id
      LEFT JOIN contacts c ON cr.contactId = c.contactId
      LEFT JOIN transcriptions t ON r.id = t.recordingId
      ${whereClause}
      ORDER BY r.createdAt DESC
      LIMIT ${limit} OFFSET ${offset}
    ` as any[];

    // Get total count
    const countQuery = await prisma.$queryRaw`
      SELECT COUNT(*) as total 
      FROM recordings r
      INNER JOIN call_records cr ON r.callRecordId = cr.id
      ${whereClause}
    ` as any[];
    
    const total = countQuery[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: {
        recordings,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching recordings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch recordings' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});

// POST /api/recordings - Create recording record
export const POST = requireAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { 
      callRecordId, 
      fileName, 
      filePath, 
      fileSize, 
      duration, 
      format = 'wav' 
    } = body;

    // Validate required fields
    if (!callRecordId || !fileName || !filePath) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if recording already exists for this call
    const existingRecording = await prisma.$queryRaw`
      SELECT id FROM recordings WHERE callRecordId = ${callRecordId} LIMIT 1
    ` as any[];

    if (existingRecording.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Recording already exists for this call' },
        { status: 409 }
      );
    }

    // Create recording record
    const recordingId = `rec_${Math.random().toString(36).substring(2, 15)}`;
    
    await prisma.$executeRaw`
      INSERT INTO recordings (
        id, callRecordId, fileName, filePath, fileSize, duration, format,
        uploadStatus, createdAt, updatedAt
      ) VALUES (
        ${recordingId},
        ${callRecordId},
        ${fileName},
        ${filePath},
        ${fileSize || null},
        ${duration || null},
        ${format},
        'completed',
        datetime('now'),
        datetime('now')
      )
    `;

    // Get the created recording
    const newRecording = await prisma.$queryRaw`
      SELECT * FROM recordings WHERE id = ${recordingId} LIMIT 1
    ` as any[];

    return NextResponse.json({
      success: true,
      message: 'Recording created successfully',
      data: newRecording[0]
    });

  } catch (error) {
    console.error('Error creating recording:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create recording' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});

// POST /api/recordings/[id]/transcribe - Request transcription
export const PUT = requireAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { recordingId, provider = 'openai', language = 'en' } = body;

    if (!recordingId) {
      return NextResponse.json(
        { success: false, message: 'Recording ID is required' },
        { status: 400 }
      );
    }

    // Check if recording exists
    const recording = await prisma.$queryRaw`
      SELECT id FROM recordings WHERE id = ${recordingId} LIMIT 1
    ` as any[];

    if (recording.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Recording not found' },
        { status: 404 }
      );
    }

    // Check if transcription already exists
    const existingTranscription = await prisma.$queryRaw`
      SELECT id FROM transcriptions WHERE recordingId = ${recordingId} LIMIT 1
    ` as any[];

    if (existingTranscription.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Transcription already exists for this recording' },
        { status: 409 }
      );
    }

    // Create transcription record
    const transcriptionId = `trans_${Math.random().toString(36).substring(2, 15)}`;
    
    await prisma.$executeRaw`
      INSERT INTO transcriptions (
        id, recordingId, provider, language, status, createdAt, updatedAt
      ) VALUES (
        ${transcriptionId},
        ${recordingId},
        ${provider},
        ${language},
        'pending',
        datetime('now'),
        datetime('now')
      )
    `;

    // Here you would typically queue the transcription job
    // For now, we'll just create the record

    return NextResponse.json({
      success: true,
      message: 'Transcription requested successfully',
      data: { transcriptionId }
    });

  } catch (error) {
    console.error('Error requesting transcription:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to request transcription' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});