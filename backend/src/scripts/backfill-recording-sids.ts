/**
 * Backfill Recording SIDs - Fix existing recordings with local paths
 * 
 * Problem: Old recordings have local file paths (recordings/CA...mp3)
 * Solution: Extract Twilio SID from Twilio API and update database
 * 
 * Run: npx tsx src/scripts/backfill-recording-sids.ts
 */

import { PrismaClient } from '@prisma/client';
import { getCallRecordings } from '../services/twilioService';

const prisma = new PrismaClient();

interface TwilioRecording {
  sid: string;
  duration: string | number;
  url: string;
  dateCreated: Date;
}

async function backfillRecordingSids() {
  try {
    console.log('🔧 Backfilling Recording SIDs from Twilio...\n');
    
    // Find recordings with local file paths (not Twilio SIDs)
    const recordingsWithLocalPaths = await prisma.recording.findMany({
      where: {
        AND: [
          { filePath: { not: null } },
          { filePath: { not: '' } },
          // Local paths start with 'recordings/' or are relative paths
          // Twilio SIDs start with 'RE' and are 34 chars
          {
            NOT: {
              filePath: {
                startsWith: 'RE'
              }
            }
          }
        ]
      },
      include: {
        callRecord: {
          select: {
            callId: true
          }
        }
      },
      take: 100 // Process in batches
    });
    
    console.log(`📊 Found ${recordingsWithLocalPaths.length} recordings with local paths\n`);
    
    if (recordingsWithLocalPaths.length === 0) {
      console.log('✅ No recordings to backfill!');
      return;
    }
    
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const recording of recordingsWithLocalPaths) {
      const callId = recording.callRecord.callId;
      
      try {
        console.log(`🔍 Processing recording ${recording.id} for call ${callId}...`);
        
        // Get recordings from Twilio for this call
        const twilioRecordings = await getCallRecordings(callId) as TwilioRecording[];
        
        if (!twilioRecordings || twilioRecordings.length === 0) {
          console.log(`  ⚠️  No Twilio recording found for call ${callId}`);
          skipped++;
          continue;
        }
        
        const twilioRecording = twilioRecordings[0];
        
        // Extract Recording SID from URL
        const recordingSidMatch = twilioRecording.url.match(/\/Recordings\/(RE[a-zA-Z0-9]+)/);
        if (!recordingSidMatch) {
          console.log(`  ❌ Could not extract SID from URL: ${twilioRecording.url}`);
          failed++;
          continue;
        }
        
        const recordingSid = recordingSidMatch[1];
        
        // Update the recording with Twilio SID
        await prisma.recording.update({
          where: { id: recording.id },
          data: {
            filePath: recordingSid,
            uploadStatus: 'completed'
          }
        });
        
        console.log(`  ✅ Updated to Twilio SID: ${recordingSid}`);
        updated++;
        
        // Rate limit: Twilio has API limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        console.error(`  ❌ Error processing recording ${recording.id}:`, error.message);
        failed++;
      }
    }
    
    console.log('\n📊 Backfill Summary:');
    console.log(`  ✅ Updated: ${updated}`);
    console.log(`  ⚠️  Skipped: ${skipped}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  📊 Total: ${recordingsWithLocalPaths.length}`);
    
  } catch (error) {
    console.error('❌ Backfill error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backfillRecordingSids();
