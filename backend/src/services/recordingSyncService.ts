/**
 * Twilio Recording Sync Service
 * Automatically fetches and stores call recordings from Twilio
 */

import { prisma } from '../database/index';
import { getCallRecordings } from './twilioService';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs/promises';

const RECORDINGS_DIR = process.env.RECORDINGS_DIR || path.join(process.cwd(), 'recordings');
const BASE_RECORDING_URL = process.env.BASE_RECORDING_URL || 'https://froniterai-production.up.railway.app/api/recordings';

interface TwilioRecording {
  sid: string;
  duration: string | number;
  url: string;
  dateCreated: Date;
}

/**
 * Sync recordings for all call records that don't have recordings yet
 */
export async function syncAllRecordings(): Promise<{ synced: number; errors: number }> {
  console.log('🔄 Starting recording sync for all call records...');
  
  try {
    // Get all call records that don't have recordings yet
    const callRecordsWithoutRecordings = await prisma.callRecord.findMany({
      where: {
        recordingFile: null, // No recording file linked
        // Only sync calls from last 30 days to avoid too much processing
        startTime: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      select: {
        id: true,
        callId: true,
        startTime: true
      }
    });

    console.log(`📊 Found ${callRecordsWithoutRecordings.length} call records without recordings`);

    let syncedCount = 0;
    let errorCount = 0;

    // Process in batches to avoid overwhelming Twilio API
    const batchSize = 5;
    for (let i = 0; i < callRecordsWithoutRecordings.length; i += batchSize) {
      const batch = callRecordsWithoutRecordings.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (callRecord) => {
        try {
          const success = await syncRecordingForCall(callRecord.callId, callRecord.id);
          if (success) {
            syncedCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`❌ Error syncing recording for call ${callRecord.callId}:`, error);
          errorCount++;
        }
      }));

      // Add delay between batches to respect rate limits
      if (i + batchSize < callRecordsWithoutRecordings.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Recording sync completed: ${syncedCount} synced, ${errorCount} errors`);
    return { synced: syncedCount, errors: errorCount };

  } catch (error) {
    console.error('❌ Error during recording sync:', error);
    throw error;
  }
}

/**
 * Sync recording for a specific call
 */
export async function syncRecordingForCall(callSid: string, callRecordId: string): Promise<boolean> {
  try {
    console.log(`🎵 Syncing recording for call ${callSid}...`);

    // Check if recording already exists
    const existingRecording = await prisma.recording.findFirst({
      where: { callRecordId }
    });

    if (existingRecording) {
      console.log(`⚠️ Recording already exists for call ${callSid}`);
      return true;
    }

    // Get recordings from Twilio
    const twilioRecordings = await getCallRecordings(callSid) as TwilioRecording[];
    
    if (!twilioRecordings || twilioRecordings.length === 0) {
      console.log(`📭 No recordings found in Twilio for call ${callSid}`);
      return false;
    }

    const recording = twilioRecordings[0]; // Use the first recording
    
    // Download and store the recording
    const recordingFileId = await downloadAndStoreRecording(recording, callSid, callRecordId);
    
    if (recordingFileId) {
      console.log(`✅ Successfully synced recording ${recordingFileId} for call ${callSid}`);
      return true;
    }

    return false;

  } catch (error: any) {
    if (error.message?.includes('not initialized')) {
      console.log(`⚠️ Twilio not configured - skipping recording sync for call ${callSid}`);
      return false;
    }
    
    console.error(`❌ Error syncing recording for call ${callSid}:`, error);
    throw error;
  }
}

/**
 * Download recording from Twilio and store locally
 */
async function downloadAndStoreRecording(
  recording: TwilioRecording, 
  callSid: string, 
  callRecordId: string
): Promise<string | null> {
  try {
    // Ensure recordings directory exists
    await fs.mkdir(RECORDINGS_DIR, { recursive: true });
    
    // Generate filename: callId_timestamp.mp3
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${callSid}_${timestamp}.mp3`;
    const filePath = path.join(RECORDINGS_DIR, fileName);
    
    // Download the recording from Twilio
    console.log(`📥 Downloading recording from Twilio: ${recording.url}`);
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
    console.error(`❌ Error downloading recording:`, error);
    throw error;
  }
}

/**
 * Get recording sync status
 */
export async function getRecordingSyncStatus() {
  try {
    const totalCalls = await prisma.callRecord.count({
      where: {
        startTime: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    const callsWithRecordings = await prisma.callRecord.count({
      where: {
        recordingFile: {
          isNot: null
        },
        startTime: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    const syncPercentage = totalCalls > 0 ? Math.round((callsWithRecordings / totalCalls) * 100) : 0;

    return {
      totalCalls,
      callsWithRecordings,
      callsWithoutRecordings: totalCalls - callsWithRecordings,
      syncPercentage
    };

  } catch (error) {
    console.error('❌ Error getting recording sync status:', error);
    throw error;
  }
}

export default {
  syncAllRecordings,
  syncRecordingForCall,
  getRecordingSyncStatus
};