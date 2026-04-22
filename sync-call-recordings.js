/**
 * Sync Missing Call Recordings from Twilio
 * 
 * This script fetches call recordings from Twilio and syncs them to the database.
 * Use this when recordings exist on Twilio but are missing from the database.
 * 
 * Fixes the "No recording" issue by:
 * 1. Fetching recent calls from database
 * 2. Checking Twilio API for recordings for each call
 * 3. Creating Recording records in database
 * 4. Updating CallRecord with recording URL
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

async function syncCallRecordings() {
  console.log('\n🔄 SYNC CALL RECORDINGS FROM TWILIO');
  console.log('═══════════════════════════════════════════════════\n');

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error('❌ Missing Twilio credentials');
    console.error('   Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables\n');
    process.exit(1);
  }

  try {
    // Step 1: Get recent calls without recordings
    console.log('Step 1: Finding calls without recordings...\n');
    
    const callsWithoutRecordings = await prisma.callRecord.findMany({
      where: {
        OR: [
          { recording: null },
          { recording: '' }
        ],
        duration: {
          gt: 0 // Only completed calls
        }
      },
      orderBy: { startTime: 'desc' },
      take: 50
    });

    console.log(`📊 Found ${callsWithoutRecordings.length} calls without recordings\n`);

    if (callsWithoutRecordings.length === 0) {
      console.log('✅ All calls have recordings. Nothing to sync.\n');
      return;
    }

    // Step 2: Fetch recordings from Twilio
    console.log('Step 2: Fetching recordings from Twilio...\n');
    
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    let recordingsFound = 0;
    let recordingsCreated = 0;
    let errors = 0;

    // Fetch recent recordings from Twilio
    const recordingsResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Recordings.json?PageSize=100`,
      {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      }
    );

    if (!recordingsResponse.ok) {
      throw new Error(`Failed to fetch Twilio recordings: ${recordingsResponse.status}`);
    }

    const recordingsData = await recordingsResponse.json();
    console.log(`📼 Found ${recordingsData.recordings.length} recordings on Twilio\n`);

    // Create a map of CallSid to Recording for faster lookup
    const twilioRecordingsMap = new Map();
    recordingsData.recordings.forEach(rec => {
      twilioRecordingsMap.set(rec.call_sid, rec);
    });

    // Step 3: Match and sync recordings
    console.log('Step 3: Matching and syncing recordings...\n');

    for (const call of callsWithoutRecordings) {
      try {
        // Try to match by callId (which might contain the Twilio SID)
        const callSid = call.callId.startsWith('CA') ? call.callId : null;
        
        if (!callSid) {
          console.log(`⏭️  Skipping ${call.callId} - not a Twilio call`);
          continue;
        }

        const twilioRecording = twilioRecordingsMap.get(callSid);
        
        if (twilioRecording) {
          recordingsFound++;
          console.log(`✅ Found recording for call ${call.callId}:`);
          console.log(`   Recording SID: ${twilioRecording.sid}`);
          console.log(`   Duration: ${twilioRecording.duration}s`);
          console.log(`   Status: ${twilioRecording.status}`);

          // Check if recording already exists
          const existingRecording = await prisma.recording.findFirst({
            where: { callRecordId: call.id }
          });

          if (!existingRecording) {
            // Create Recording record
            const recordingUrl = `https://api.twilio.com${twilioRecording.uri.replace('.json', '')}`;
            
            await prisma.recording.create({
              data: {
                callRecordId: call.id,
                fileName: `${twilioRecording.sid}.mp3`,
                filePath: recordingUrl,
                fileSize: null,
                duration: parseInt(twilioRecording.duration),
                format: 'mp3',
                quality: 'standard',
                storageType: 'twilio',
                uploadStatus: 'completed'
              }
            });

            // Update CallRecord with streaming URL
            await prisma.callRecord.update({
              where: { id: call.id },
              data: {
                recording: `${BACKEND_URL}/api/recordings/${call.id}/stream`
              }
            });

            recordingsCreated++;
            console.log(`   ✅ Recording synced to database\n`);
          } else {
            console.log(`   ℹ️  Recording already in database\n`);
          }
        } else {
          console.log(`⚠️  No recording found on Twilio for call ${call.callId}`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error processing call ${call.callId}:`, error.message);
      }
    }

    // Step 4: Summary
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 SYNC SUMMARY:');
    console.log('─────────────────────────────────────────────────');
    console.log(`Calls checked:        ${callsWithoutRecordings.length}`);
    console.log(`Recordings found:     ${recordingsFound}`);
    console.log(`Recordings created:   ${recordingsCreated}`);
    console.log(`Errors:               ${errors}`);
    console.log('');

    if (recordingsCreated > 0) {
      console.log('✅ SUCCESS: Recordings synced!');
      console.log('   Refresh your call history page to see the recordings.\n');
    } else if (recordingsFound === 0) {
      console.log('⚠️  WARNING: No recordings found on Twilio');
      console.log('   This means:');
      console.log('   1. Calls were not recorded (check TwiML <Record> instruction)');
      console.log('   2. Recordings are older than available on Twilio API');
      console.log('   3. Calls are conference calls (stored differently)');
      console.log('\n   Solution: Make new calls to test recording system\n');
    }

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

syncCallRecordings();
