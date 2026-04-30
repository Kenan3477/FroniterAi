/**
 * Recording Service - Handle call recording storage, retrieval, and playback
 * Integrates with Twilio recordings and local file storage
 */

import { prisma } from '../database/index';
import { getCallRecordings } from './twilioService';
import { onNewCallRecording } from './transcriptionWorker';
import path from 'path';
import fs from 'fs/promises';
import fetch from 'node-fetch';

// Recording storage configuration
const RECORDINGS_DIR = process.env.RECORDINGS_DIR || path.join(process.cwd(), 'recordings');
const BASE_RECORDING_URL = process.env.BASE_RECORDING_URL || 'https://froniterai-production.up.railway.app/api/recordings';

interface TwilioRecording {
  sid: string;
  duration: string | number; // Can be string or number from Twilio
  url: string;
  dateCreated: Date;
}

/**
 * Download recording from Twilio and store locally
 */
export async function downloadAndStoreRecording(callSid: string, callRecordId: string): Promise<string | null> {
  try {
    console.log(`📼 Downloading recording for call ${callSid}...`);
    
    // Get recordings from Twilio
    const twilioRecordings = await getCallRecordings(callSid) as TwilioRecording[];
    
    if (!twilioRecordings || twilioRecordings.length === 0) {
      console.log(`⚠️ No recordings found for call ${callSid}`);
      return null;
    }

    const recording = (() => {
      const dual = twilioRecordings.find((r: any) => Number((r as any).channels) === 2);
      if (dual) return dual;
      return [...twilioRecordings].sort((a, b) => {
        const da = parseInt(String(a.duration || '0'), 10) || 0;
        const db = parseInt(String(b.duration || '0'), 10) || 0;
        return db - da;
      })[0];
    })();
    
    // Extract Twilio Recording SID from URL
    // URL format: https://api.twilio.com/2010-04-01/Accounts/AC.../Recordings/RExxxxx.mp3
    const recordingSidMatch = recording.url.match(/\/Recordings\/(RE[a-zA-Z0-9]+)/);
    if (!recordingSidMatch) {
      throw new Error(`Could not extract Recording SID from URL: ${recording.url}`);
    }
    const recordingSid = recordingSidMatch[1];
    
    // Generate filename: callId_timestamp.mp3
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${callSid}_${timestamp}.mp3`;
    
    // Store the Twilio Recording SID (the file is hosted on Twilio, not local disk).
    // The /api/recordings/:id/stream endpoint extracts this SID from `filePath` and
    // proxies the audio from Twilio's REST API with the account's Basic auth.
    //
    // ⚠️ IMPORTANT: storageType MUST be 'twilio' here. With 'local', the streaming
    // route falls through to a 501 "Local file streaming not implemented" branch
    // (Railway has ephemeral storage; nothing is actually written to disk), and the
    // browser <audio> element reports MEDIA_ERR_SRC_NOT_SUPPORTED, surfacing in the
    // UI as "Recording file not found or format not supported".
    const filePath = recordingSid;

    console.log(`💾 Recording SID: ${recordingSid} (will stream from Twilio on playback)`);

    const fileSizeBytes = null;

    console.log(`💾 Recording saved: ${fileName}`);

    // UPSERT: handle races where multiple processes try to create the same recording.
    const recordingRecord = await prisma.recording.upsert({
      where: { callRecordId: callRecordId },
      update: {
        fileName: fileName,
        filePath: filePath,
        fileSize: fileSizeBytes,
        duration: recording.duration ? parseInt(recording.duration.toString()) : null,
        format: 'mp3',
        quality: 'standard',
        storageType: 'twilio',
        uploadStatus: 'completed',
        updatedAt: new Date()
      },
      create: {
        callRecordId: callRecordId,
        fileName: fileName,
        filePath: filePath,
        fileSize: fileSizeBytes,
        duration: recording.duration ? parseInt(recording.duration.toString()) : null,
        format: 'mp3',
        quality: 'standard',
        storageType: 'twilio',
        uploadStatus: 'completed',
      }
    });
    
    console.log(`✅ Recording record ${recordingRecord.id} saved (upsert)`);
    
    // Update the call record with the recording reference
    await prisma.callRecord.update({
      where: { id: callRecordId },
      data: {
        recording: `${BASE_RECORDING_URL}/${recordingRecord.id}/download`
      }
    });
    
    // 🎯 AUTO-TRANSCRIPTION: Queue transcription job for new recording
    try {
      const recordingUrl = `${BASE_RECORDING_URL}/${recordingRecord.id}/download`;
      await onNewCallRecording(callRecordId, recordingUrl);
      console.log(`📝 Transcription queued for call ${callRecordId}`);
    } catch (transcriptionError) {
      console.error(`⚠️ Failed to queue transcription for call ${callRecordId}:`, transcriptionError);
      // Don't fail the recording process if transcription queueing fails
    }
    
    return recordingRecord.id;
    
  } catch (error) {
    console.error(`❌ Error downloading recording for call ${callSid}:`, error);
    
    // 🆕 UPSERT: Update existing failed record or create new one
    try {
      await prisma.recording.upsert({
        where: { callRecordId: callRecordId },
        update: {
          uploadStatus: 'failed',
          updatedAt: new Date()
        },
        create: {
          callRecordId: callRecordId,
          fileName: `failed_${callSid}.mp3`,
          filePath: '',
          fileSize: 0,
          duration: null,
          format: 'mp3',
          uploadStatus: 'failed',
        }
      });
    } catch (dbError) {
      console.error('Failed to create failed recording record:', dbError);
    }
    
    return null;
  }
}

/**
 * Process all pending recordings (called after call ends)
 */
export async function processCallRecordings(callSid: string, callRecordId: string): Promise<void> {
  try {
    console.log(`🔄 Processing recordings for call ${callSid}...`);
    
    // Wait a bit for Twilio to process the recording
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
    
    // Download and store the recording
    const recordingId = await downloadAndStoreRecording(callSid, callRecordId);
    
    if (recordingId) {
      console.log(`✅ Recording processing completed for call ${callSid}`);
    } else {
      console.log(`⚠️ No recording available for call ${callSid}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing recordings for call ${callSid}:`, error);
  }
}

/**
 * Get recording file path for streaming/download
 */
export async function getRecordingFilePath(recordingId: string): Promise<string | null> {
  try {
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      select: { filePath: true, uploadStatus: true }
    });
    
    if (!recording || recording.uploadStatus !== 'completed') {
      return null;
    }
    
    // Check if file exists
    try {
      await fs.access(recording.filePath);
      return recording.filePath;
    } catch (error) {
      console.error(`Recording file not found: ${recording.filePath}`);
      return null;
    }
    
  } catch (error) {
    console.error('Error getting recording file path:', error);
    return null;
  }
}

/**
 * Get recording metadata
 */
export async function getRecordingMetadata(recordingId: string) {
  try {
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        callRecord: {
          select: {
            callId: true,
            phoneNumber: true,
            startTime: true,
            duration: true
          }
        }
      }
    });
    
    return recording;
    
  } catch (error) {
    console.error('Error getting recording metadata:', error);
    return null;
  }
}

/**
 * Clean up old recordings (optional - for storage management)
 */
export async function cleanupOldRecordings(daysOld: number = 90): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const oldRecordings = await prisma.recording.findMany({
      where: {
        createdAt: {
          lt: cutoffDate
        },
        uploadStatus: 'completed'
      }
    });
    
    console.log(`🧹 Found ${oldRecordings.length} old recordings to clean up`);
    
    for (const recording of oldRecordings) {
      try {
        // Delete file from filesystem
        await fs.unlink(recording.filePath);
        
        // Delete from database
        await prisma.recording.delete({
          where: { id: recording.id }
        });
        
        console.log(`🗑️ Deleted old recording: ${recording.fileName}`);
      } catch (error) {
        console.error(`Failed to delete recording ${recording.id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Error cleaning up old recordings:', error);
  }
}

/**
 * Get recordings for a specific call record
 */
export async function getCallRecordingInfo(callRecordId: string) {
  try {
    const recording = await prisma.recording.findFirst({
      where: { callRecordId: callRecordId },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        duration: true,
        format: true,
        uploadStatus: true,
        createdAt: true
      }
    });
    
    return recording;
    
  } catch (error) {
    console.error('Error getting call recording info:', error);
    return null;
  }
}

export {
  TwilioRecording,
  RECORDINGS_DIR,
  BASE_RECORDING_URL
};