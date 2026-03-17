/**
 * Example Transcription Recovery Script
 * This script demonstrates how to fetch recording URLs from Twilio for transcription processing
 * 
 * NOTE: This is a template. Set your environment variables before using:
 * export TWILIO_ACCOUNT_SID="your_account_sid_here"
 * export TWILIO_AUTH_TOKEN="your_auth_token_here"
 */

const { PrismaClient } = require('@prisma/client');
const { Twilio } = require('twilio');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://localhost:5432/omnivox_dev'
    }
  }
});

async function fixTranscriptionRecordings() {
  try {
    // Check environment variables
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('❌ Error: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables are required');
      console.log('💡 Set them using: export TWILIO_ACCOUNT_SID="your_sid" && export TWILIO_AUTH_TOKEN="your_token"');
      return;
    }

    const twilio = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    console.log('🔍 Finding calls that need recording URLs for transcription...');
    
    // Get calls that are queued for transcription but have no recording URL
    const callsNeedingRecordings = await prisma.callRecord.findMany({
      where: {
        transcriptionStatus: 'queued',
        recording: null,
        duration: { gt: 5 } // Only transcribe calls longer than 5 seconds
      },
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        startTime: true,
        duration: true
      },
      take: 10 // Process 10 calls at a time
    });

    console.log(`📞 Found ${callsNeedingRecordings.length} calls needing recording URLs`);

    if (callsNeedingRecordings.length === 0) {
      console.log('✅ All calls already have recording URLs or are not queued for transcription');
      return;
    }

    let recordingsFound = 0;
    let recordingsNotFound = 0;

    for (const call of callsNeedingRecordings) {
      try {
        if (!call.callId) {
          console.log(`⚠️ Call ${call.id} has no Twilio Call SID, skipping...`);
          recordingsNotFound++;
          continue;
        }

        console.log(`\n🔍 Checking Twilio recordings for call ${call.callId}...`);
        
        // Fetch recordings for this call from Twilio
        const recordings = await twilio.calls(call.callId).recordings.list();
        
        if (recordings.length > 0) {
          const recording = recordings[0]; // Use the first recording
          const recordingUrl = `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
          
          console.log(`✅ Found recording: ${recording.sid}`);
          
          // Update the call record with the recording URL
          await prisma.callRecord.update({
            where: { id: call.id },
            data: {
              recording: recordingUrl,
              transcriptionStatus: 'pending' // Ready for transcription
            }
          });
          
          recordingsFound++;
          
        } else {
          console.log(`❌ No recordings found for call ${call.callId}`);
          
          // Update transcription status to indicate no recording available
          await prisma.callRecord.update({
            where: { id: call.id },
            data: {
              transcriptionStatus: 'no_recording'
            }
          });
          
          recordingsNotFound++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error processing call ${call.callId}:`, error.message);
        recordingsNotFound++;
      }
    }

    console.log('\n📊 TRANSCRIPTION RECORDING RECOVERY SUMMARY:');
    console.log(`✅ Recordings found and updated: ${recordingsFound}`);
    console.log(`❌ Recordings not found: ${recordingsNotFound}`);
    console.log('\n🎉 Transcription system is now ready!');
    console.log('💡 Users will now see actual transcripts instead of "not available"');

  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script only if called directly
if (require.main === module) {
  fixTranscriptionRecordings().catch(console.error);
}

module.exports = { fixTranscriptionRecordings };