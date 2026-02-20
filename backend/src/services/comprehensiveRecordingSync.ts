/**
 * Comprehensive Twilio Recording Sync Service
 * Fetches ALL recordings from Twilio and creates database entries
 */

import { prisma } from '../database/index';
import { getAllRecordings } from './twilioService';
import path from 'path';

/**
 * Comprehensive sync that fetches ALL recordings from Twilio
 * and creates database entries for them
 */
export async function syncAllTwilioRecordings(): Promise<{
  totalTwilioRecordings: number;
  newCallRecords: number;
  newRecordingFiles: number;
  linkedExisting: number;
  errors: number;
}> {
  console.log('🚀 Starting comprehensive Twilio recording sync...');
  
  const stats = {
    totalTwilioRecordings: 0,
    newCallRecords: 0,
    newRecordingFiles: 0,
    linkedExisting: 0,
    errors: 0
  };

  try {
    // Get ALL recordings from Twilio
    const twilioRecordings = await getAllRecordings(200, 60); // Last 60 days, up to 200 recordings
    stats.totalTwilioRecordings = twilioRecordings.length;
    
    console.log(`📊 Found ${twilioRecordings.length} recordings in Twilio`);

    for (const recording of twilioRecordings) {
      try {
        console.log(`🎵 Processing recording: ${recording.sid} for call ${recording.callSid}`);

        // Check if we already have this recording in database
        const existingRecording = await prisma.recording.findFirst({
          where: {
            fileName: {
              contains: recording.sid
            }
          }
        });

        if (existingRecording) {
          console.log(`⚠️ Recording ${recording.sid} already exists in database`);
          continue;
        }

        // Check if we have a CallRecord for this call
        let callRecord = await prisma.callRecord.findFirst({
          where: {
            OR: [
              { callId: recording.callSid },
              { callId: { contains: recording.callSid } }
            ]
          }
        });

        // If no CallRecord exists, create one
        if (!callRecord) {
          console.log(`📝 Creating new CallRecord for Twilio call: ${recording.callSid}`);
          
          const phoneNumber = await extractPhoneFromTwilioCall(recording.callSid);
          
          // Ensure TWILIO-IMPORT campaign exists
          let campaign = await prisma.campaign.findUnique({
            where: { campaignId: 'TWILIO-IMPORT' }
          });
          
          if (!campaign) {
            campaign = await prisma.campaign.create({
              data: {
                campaignId: 'TWILIO-IMPORT',
                name: 'Twilio Imported Calls',
                dialMethod: 'manual',
                status: 'ACTIVE',
                isActive: true
              }
            });
            console.log('✅ Created TWILIO-IMPORT campaign');
          }
          
          callRecord = await prisma.callRecord.create({
            data: {
              id: `twilio-${recording.callSid}`,
              callId: recording.callSid,
              campaignId: 'TWILIO-IMPORT', // Default campaign for imported calls
              contactId: await getExistingContact(phoneNumber), // Allow null for recordings without real contacts
              phoneNumber: phoneNumber || 'Unknown',
              callType: 'outbound', // Default to outbound
              startTime: recording.dateCreated,
              duration: recording.duration ? parseInt(recording.duration.toString()) : null,
              outcome: 'COMPLETED', // Assume completed if recording exists
            }
          });
          
          stats.newCallRecords++;
          console.log(`✅ Created CallRecord: ${callRecord.id}`);
        } else {
          stats.linkedExisting++;
          console.log(`✅ Linked to existing CallRecord: ${callRecord.id}`);
        }

        // Create Recording entry
        const fileName = `${recording.sid}_${recording.dateCreated.toISOString().replace(/[:.]/g, '-')}.mp3`;
        const filePath = path.join(process.env.RECORDINGS_DIR || './recordings', fileName);

        const recordingFile = await prisma.recording.create({
          data: {
            callRecordId: callRecord.id,
            fileName: fileName,
            filePath: filePath,
            fileSize: null, // Will be populated when file is downloaded
            duration: recording.duration ? parseInt(recording.duration.toString()) : null,
            format: 'mp3',
            quality: 'standard',
            storageType: 'local',
            uploadStatus: 'pending', // Will download file later
          }
        });

        stats.newRecordingFiles++;
        console.log(`✅ Created Recording: ${recordingFile.id} for ${recording.sid}`);

        // TODO: Download the actual recording file
        // await downloadRecordingFromUrl(recording.url, filePath);

      } catch (recordingError) {
        console.error(`❌ Error processing recording ${recording.sid}:`, recordingError);
        stats.errors++;
      }
    }

    console.log('📊 Comprehensive sync completed:', stats);
    return stats;

  } catch (error) {
    console.error('❌ Error during comprehensive sync:', error);
    stats.errors++;
    return stats;
  }
}

/**
 * Extract phone number from Twilio call (this is a simplified version)
 */
async function extractPhoneFromTwilioCall(callSid: string): Promise<string | null> {
  try {
    // In a real implementation, you'd call Twilio API to get call details
    // For now, return null and we'll use "Unknown"
    return null;
  } catch (error) {
    console.error(`Error extracting phone from call ${callSid}:`, error);
    return null;
  }
}

/**
 * Get existing contact for phone number or return null
 * DO NOT create fake contacts for imported recordings
 */
async function getExistingContact(phoneNumber: string | null): Promise<string | null> {
  if (!phoneNumber || phoneNumber === 'Unknown') {
    return null;
  }

  try {
    // Look for existing REAL contact (exclude fake imported contacts)
    const contact = await prisma.contact.findFirst({
      where: {
        AND: [
          {
            OR: [
              { phone: phoneNumber },
              { mobile: phoneNumber }
            ]
          },
          // Exclude fake imported contacts
          {
            NOT: {
              OR: [
                { firstName: 'Imported' },
                { listId: 'TWILIO-IMPORT' },
                { listId: 'IMPORTED-CONTACTS' }
              ]
            }
          }
        ]
      }
    });

    if (contact) {
      console.log(`✅ Found existing real contact: ${contact.contactId} for ${phoneNumber}`);
      return contact.id;
    }

    console.log(`ℹ️  No existing real contact found for ${phoneNumber} - will create call record without contact`);
    return null;
    
  } catch (error) {
    console.error(`Error finding contact for ${phoneNumber}:`, error);
    return null;
  }
}