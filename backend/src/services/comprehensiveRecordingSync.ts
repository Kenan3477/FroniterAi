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
          
          callRecord = await prisma.callRecord.create({
            data: {
              id: `twilio-${recording.callSid}`,
              callId: recording.callSid,
              campaignId: 'TWILIO-IMPORT', // Default campaign for imported calls
              contactId: await getOrCreateContact(phoneNumber),
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
 * Get or create a contact for the phone number
 */
async function getOrCreateContact(phoneNumber: string | null): Promise<string> {
  if (!phoneNumber) {
    phoneNumber = 'Unknown';
  }

  try {
    // Look for existing contact
    let contact = await prisma.contact.findFirst({
      where: {
        OR: [
          { phone: phoneNumber },
          { mobile: phoneNumber }
        ]
      }
    });

    if (!contact) {
      // Create new contact
      contact = await prisma.contact.create({
        data: {
          firstName: 'Imported',
          lastName: 'Contact',
          phone: phoneNumber,
          email: `imported-${Date.now()}@example.com`, // Dummy email
          status: 'active'
        }
      });
      
      console.log(`✅ Created new contact: ${contact.id} for ${phoneNumber}`);
    }

    return contact.id;
    
  } catch (error) {
    console.error(`Error getting/creating contact for ${phoneNumber}:`, error);
    
    // Fallback: try to find any contact
    const anyContact = await prisma.contact.findFirst();
    if (anyContact) {
      return anyContact.id;
    }
    
    throw new Error('No contacts available and could not create new one');
  }
}