const { PrismaClient } = require('@prisma/client');
const twilio = require('twilio');

const prisma = new PrismaClient();
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function backfillRecordingsFromTwilio() {
  console.log('🎙️ Starting comprehensive recording backfill from Twilio...\n');

  try {
    // Get all call records that might have recordings
    console.log('📊 Fetching all call records from database...');
    const allCalls = await prisma.callRecord.findMany({
      where: {
        duration: { gt: 0 }
      },
      select: {
        id: true,
        callId: true,
        recording: true,
        phoneNumber: true,
        outcome: true,
        duration: true,
        startTime: true,
        dispositionId: true
      },
      orderBy: { startTime: 'desc' }
    });

    console.log(`✅ Found ${allCalls.length} call records to check\n`);

    // Separate calls by priority - SALES FIRST
    const saleCalls = allCalls.filter(c => 
      c.outcome?.toLowerCase().includes('sale') || 
      c.dispositionId?.toLowerCase().includes('sale')
    );
    const otherCalls = allCalls.filter(c => 
      !c.outcome?.toLowerCase().includes('sale') && 
      !c.dispositionId?.toLowerCase().includes('sale')
    );

    console.log(`🎯 Priority breakdown:`);
    console.log(`   - Sale calls: ${saleCalls.length} (will process FIRST) 💰`);
    console.log(`   - Other calls: ${otherCalls.length}\n`);

    // Process sales first, then others
    const prioritizedCalls = [...saleCalls, ...otherCalls];

    let foundCount = 0;
    let updatedCount = 0;
    let alreadyHasRecording = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    console.log('🔍 Searching Twilio for recordings...\n');

    for (let i = 0; i < prioritizedCalls.length; i++) {
      const call = prioritizedCalls[i];
      const isSale = saleCalls.includes(call);
      
      try {
        process.stdout.write(`[${i + 1}/${prioritizedCalls.length}] ${isSale ? '💰 SALE' : '📞'} ${call.phoneNumber || 'Unknown'}...`);

        // Skip if already has a valid recording URL
        if (call.recording && call.recording.startsWith('RE')) {
          alreadyHasRecording++;
          console.log(` ✓ Already has recording`);
          continue;
        }

        // Try multiple possible call SIDs
        const possibleSids = [
          call.recording, // Might be the Twilio call SID
          call.callId,    // Conference ID or direct call ID
        ].filter(Boolean);

        let foundRecording = null;

        for (const sid of possibleSids) {
          try {
            // Search for recordings by call SID
            const recordings = await twilioClient.recordings.list({
              callSid: sid,
              limit: 1
            });

            if (recordings.length > 0) {
              foundRecording = recordings[0];
              break;
            }
          } catch (err) {
            // Try next SID
            continue;
          }
        }

        if (foundRecording) {
          foundCount++;
          
          // Update call record with recording SID
          await prisma.callRecord.update({
            where: { id: call.id },
            data: {
              recording: foundRecording.sid // Store Twilio recording SID (RExxxxx)
            }
          });
          
          updatedCount++;
          console.log(` ✅ FOUND & LINKED (${foundRecording.duration}s, ${foundRecording.sid})`);
        } else {
          notFoundCount++;
          console.log(` ❌ No recording in Twilio`);
        }

      } catch (error) {
        errorCount++;
        console.log(` ⚠️ Error: ${error.message}`);
      }

      // Rate limiting - don't overwhelm Twilio API
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second pause every 10 calls
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 BACKFILL SUMMARY:');
    console.log('='.repeat(80));
    console.log(`✅ Found recordings:         ${foundCount}`);
    console.log(`📝 Updated database:         ${updatedCount}`);
    console.log(`✓  Already had recording:    ${alreadyHasRecording}`);
    console.log(`❌ Not found in Twilio:      ${notFoundCount}`);
    console.log(`⚠️  Errors:                   ${errorCount}`);
    console.log('='.repeat(80));

    if (updatedCount > 0) {
      console.log('\n🎉 SUCCESS! Your call records now have recordings linked.');
      console.log('   💰 Sale calls were processed FIRST to ensure critical recordings are captured.');
      console.log('   📊 Refresh your Reports page to see them!');
    } else if (alreadyHasRecording === prioritizedCalls.length) {
      console.log('\n✅ All calls already have recordings linked!');
      console.log('   No updates needed - your database is up to date.');
    } else {
      console.log('\n⚠️  No new recordings were linked.');
      console.log('   This could mean:');
      console.log('   1. Recordings already linked (check "Already had recording" count)');
      console.log('   2. Recordings don\'t exist in Twilio for these calls');
      console.log('   3. Call SIDs don\'t match Twilio\'s recording database');
      console.log('\n   💡 TIP: Make a NEW call now to verify recording is working going forward.');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillRecordingsFromTwilio()
  .then(() => {
    console.log('\n✅ Backfill process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill process failed:', error);
    process.exit(1);
  });
