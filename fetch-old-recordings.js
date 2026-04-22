const { PrismaClient } = require('@prisma/client');
const twilio = require('twilio');

const prisma = new PrismaClient();

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

async function fetchOldRecordings() {
  console.log('\n🔍 SEARCHING FOR OLD RECORDINGS IN TWILIO...\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Get all old calls without recordings (focusing on completed calls with duration)
    const oldCallsWithoutRecordings = await prisma.callRecord.findMany({
      where: {
        recording: null,
        duration: { gt: 5 },
        phoneNumber: { not: { startsWith: 'client:' } },
        startTime: { lt: new Date('2026-04-22T17:31:00+01:00') } // Before the fix
      },
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        duration: true,
        startTime: true,
        outcome: true
      }
    });

    console.log(`📊 Found ${oldCallsWithoutRecordings.length} old calls without recordings\n`);
    
    if (oldCallsWithoutRecordings.length === 0) {
      console.log('✅ All old calls already have recordings linked!\n');
      await prisma.$disconnect();
      return;
    }

    let found = 0;
    let notFound = 0;
    let errors = 0;

    console.log('🔎 Searching Twilio for recordings...\n');

    for (let i = 0; i < oldCallsWithoutRecordings.length; i++) {
      const call = oldCallsWithoutRecordings[i];
      
      // Progress indicator
      if (i > 0 && i % 10 === 0) {
        console.log(`\n⏸️  Processed ${i}/${oldCallsWithoutRecordings.length} - Pausing 1 second...\n`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      try {
        console.log(`[${i + 1}/${oldCallsWithoutRecordings.length}] 📞 ${call.phoneNumber} (${call.duration}s) - ${call.startTime.toLocaleDateString()}...`);
        
        // Search for recordings by Call SID
        const recordings = await twilioClient.recordings.list({
          callSid: call.callId,
          limit: 1
        });

        if (recordings.length > 0) {
          const recording = recordings[0];
          
          // Update database with recording SID
          await prisma.callRecord.update({
            where: { id: call.id },
            data: {
              recording: recording.sid
            }
          });

          console.log(`   ✅ FOUND & LINKED: ${recording.sid} (${recording.duration}s)\n`);
          found++;
        } else {
          console.log(`   ❌ No recording in Twilio\n`);
          notFound++;
        }
      } catch (error) {
        console.error(`   ⚠️  Error: ${error.message}\n`);
        errors++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════\n');
    console.log('📊 SUMMARY:\n');
    console.log(`✅ Recordings found and linked: ${found}`);
    console.log(`❌ No recordings found:         ${notFound}`);
    console.log(`⚠️  Errors:                     ${errors}`);
    console.log(`📊 Total processed:             ${oldCallsWithoutRecordings.length}`);
    console.log('\n═══════════════════════════════════════════════════════════════\n');

    if (found > 0) {
      console.log('🎉 Success! Found recordings from old calls.');
      console.log('💡 These recordings were stored in Twilio but not linked to your database.\n');
    }

    if (notFound > 0) {
      console.log(`\n⚠️  ${notFound} calls have no recordings in Twilio.`);
      console.log('This could mean:');
      console.log('  1. Recording was not enabled when those calls were made');
      console.log('  2. Recordings have expired (Twilio retention policy)');
      console.log('  3. Calls were too short or failed before recording started\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fetchOldRecordings().catch(console.error);
