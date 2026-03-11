/**
 * Trigger FREE Local Whisper Transcription for Recovered Calls
 * This script manually triggers transcription for calls that now have recording URLs
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
    }
  }
});

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function triggerTranscriptions() {
  try {
    console.log('🎯 Triggering FREE Local Whisper transcriptions for recovered calls...');
    
    // Get calls that have recording URLs but haven't started transcription
    const callsReady = await prisma.callRecord.findMany({
      where: {
        recording: { not: null },
        transcriptionStatus: 'not_started'
      },
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        recording: true,
        duration: true
      },
      take: 5 // Process 5 calls at a time to avoid overwhelming the system
    });

    console.log(`📞 Found ${callsReady.length} calls ready for transcription`);

    if (callsReady.length === 0) {
      console.log('✅ No calls need transcription triggering');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const call of callsReady) {
      try {
        console.log(`\n🎯 Triggering transcription for call ${call.id}...`);
        console.log(`📞 Phone: ${call.phoneNumber}, Duration: ${call.duration}s`);
        console.log(`🎵 Recording: ${call.recording?.substring(0, 80)}...`);
        
        // Call the backend webhook to trigger FREE Local Whisper transcription
        const response = await fetch(`${BACKEND_URL}/api/recordings/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            callId: call.id,
            recordingUrl: call.recording,
            source: 'manual_trigger'
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Successfully queued for FREE transcription');
          console.log('📊 Response:', result.message || 'Transcription queued');
          
          // Update status to indicate transcription is processing
          await prisma.callRecord.update({
            where: { id: call.id },
            data: { transcriptionStatus: 'processing' }
          });
          
          successCount++;
        } else {
          const errorText = await response.text();
          console.log('❌ Failed to trigger transcription');
          console.log('📊 Response:', response.status, errorText);
          errorCount++;
        }
        
        // Small delay to avoid overwhelming the transcription system
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error triggering transcription for call ${call.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 FREE TRANSCRIPTION TRIGGER SUMMARY:');
    console.log(`✅ Successfully triggered: ${successCount}`);
    console.log(`❌ Failed to trigger: ${errorCount}`);
    console.log('\n🎉 Transcription jobs are now running!');
    console.log('💡 Check call records in a few minutes to see completed transcripts');
    console.log('🆓 All transcriptions are FREE using Local Whisper - no API costs!');

  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
triggerTranscriptions().catch(console.error);