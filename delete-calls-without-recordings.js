const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteCallsWithoutRecordings() {
  try {
    console.log('🗑️  DELETING CALL RECORDS WITHOUT RECORDINGS\n');
    console.log('='.repeat(60));
    console.log('Timestamp:', new Date().toISOString());
    console.log('='.repeat(60) + '\n');

    // Step 1: Find all call records without recordings
    const callsWithoutRecordings = await prisma.callRecord.findMany({
      where: {
        recordingFile: null,
        // Also check the recording field (URL)
        recording: null
      },
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        startTime: true,
        duration: true,
        outcome: true,
        agentId: true,
        campaignId: true
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    console.log(`📊 Found ${callsWithoutRecordings.length} call records WITHOUT recordings\n`);

    if (callsWithoutRecordings.length === 0) {
      console.log('✅ No call records to delete - all have recordings!\n');
      return;
    }

    // Step 2: Show sample of what will be deleted
    console.log('📋 Sample of call records to be deleted (first 10):\n');
    callsWithoutRecordings.slice(0, 10).forEach((record, index) => {
      console.log(`${index + 1}. Call ID: ${record.callId}`);
      console.log(`   Phone: ${record.phoneNumber}`);
      console.log(`   Date: ${record.startTime.toISOString()}`);
      console.log(`   Duration: ${record.duration || 0}s`);
      console.log(`   Outcome: ${record.outcome || 'N/A'}`);
      console.log(`   Campaign: ${record.campaignId}`);
      console.log('');
    });

    // Step 3: Get statistics
    const totalCallRecords = await prisma.callRecord.count();
    const callsWithRecordings = await prisma.callRecord.count({
      where: {
        OR: [
          { recordingFile: { isNot: null } },
          { recording: { not: null } }
        ]
      }
    });

    console.log('📈 Statistics BEFORE deletion:');
    console.log(`   Total Call Records: ${totalCallRecords}`);
    console.log(`   With Recordings: ${callsWithRecordings}`);
    console.log(`   Without Recordings: ${callsWithoutRecordings.length}`);
    console.log('');

    // Step 4: DELETE the records
    console.log('🗑️  DELETING...\n');
    
    const deleteResult = await prisma.callRecord.deleteMany({
      where: {
        recordingFile: null,
        recording: null
      }
    });

    console.log(`✅ DELETED ${deleteResult.count} call records without recordings\n`);

    // Step 5: Verify deletion
    const remainingTotal = await prisma.callRecord.count();
    const remainingWithRecordings = await prisma.callRecord.count({
      where: {
        OR: [
          { recordingFile: { isNot: null } },
          { recording: { not: null } }
        ]
      }
    });

    console.log('📈 Statistics AFTER deletion:');
    console.log(`   Total Call Records: ${remainingTotal}`);
    console.log(`   With Recordings: ${remainingWithRecordings}`);
    console.log(`   Without Recordings: ${remainingTotal - remainingWithRecordings}`);
    console.log('');

    console.log('='.repeat(60));
    console.log('✅ CLEANUP COMPLETE!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Summary:');
    console.log(`  - Deleted: ${deleteResult.count} records`);
    console.log(`  - Remaining: ${remainingTotal} records (all with recordings)`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteCallsWithoutRecordings();
