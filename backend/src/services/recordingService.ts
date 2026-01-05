/**
 * Recording Service - Handle call recording storage, retrieval, and playback
 * Integrates with Twilio recordings and local file storage
 */

import { prisma } from '../database/index';
import { getCallRecordings } from './twilioService';
import path from 'path';
import fs from 'fs/promises';
import fetch from 'node-fetch';

// Recording storage configuration
const RECORDINGS_DIR = process.env.RECORDINGS_DIR || path.join(process.cwd(), 'recordings');
const BASE_RECORDING_URL = process.env.BASE_RECORDING_URL || 'http://localhost:3004/api/recordings';

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

    const recording = twilioRecordings[0]; // Use the first recording
    
    // Ensure recordings directory exists
    await fs.mkdir(RECORDINGS_DIR, { recursive: true });
    
    // Generate filename: callId_timestamp.mp3
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${callSid}_${timestamp}.mp3`;
    const filePath = path.join(RECORDINGS_DIR, fileName);
    
    // Download the recording from Twilio
    console.log(`📥 Downloading from Twilio: ${recording.url}`);
    const response = await fetch(recording.url, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download recording: ${response.statusText}`);
    }
    
    // Save to local file
    const buffer = await response.buffer();
    await fs.writeFile(filePath, buffer);
    
    // Get file size
    const stats = await fs.stat(filePath);
    const fileSizeBytes = stats.size;
    
    console.log(`💾 Recording saved: ${fileName} (${fileSizeBytes} bytes)`);
    
    // Create recording record in database
    const recordingRecord = await prisma.recording.create({
      data: {
        callRecordId: callRecordId,
        fileName: fileName,
        filePath: filePath,
        fileSize: fileSizeBytes,
        duration: recording.duration ? parseInt(recording.duration.toString()) : null,
        format: 'mp3',
        quality: 'standard',
        storageType: 'local',
        uploadStatus: 'completed',
      }
    });
    
    console.log(`✅ Recording record created: ${recordingRecord.id}`);
    
    // Update the call record with the recording reference
    await prisma.callRecord.update({
      where: { id: callRecordId },
      data: {
        recording: `${BASE_RECORDING_URL}/${recordingRecord.id}/download`
      }
    });
    
    return recordingRecord.id;
    
  } catch (error) {
    console.error(`❌ Error downloading recording for call ${callSid}:`, error);
    
    // Update recording status as failed
    try {
      await prisma.recording.create({
        data: {
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