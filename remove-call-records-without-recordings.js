/**
 * Remove Call Records Without Recordings
 * Safely deletes call records that have no associated recording
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:BaPOsGCMKYiGNOLQUJkWbAIaJcfayoqJ@postgres.railway.internal:5432/railway'
});

async function removeCallRecordsWithoutRecordings() {
  try {
    console.log('🔍 Analyzing Call Records and Recordings...\n');
    console.log('Timestamp:', new Date().toISOString());
    console.log('='.repeat(60) + '\n');

    // Step 1: Get statistics
    const totalCallRecords = await prisma.callRecord.count();
    const totalRecordings = await prisma.recording.count();
    
    console.log('📊 Current Statistics:');
    console.log(`   Total Call Records: ${totalCallRecords}`);
    console.log(`   Total Recordings: ${totalRecordings}`);

    // Step 2: Find call records without recordings
    const callRecordsWithoutRecordings = await prisma.callRecord.findMany({
      where: {
        recordingFile: null
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
      }
    });

    console.log(`\n🔍 Found ${callRecordsWithoutRecordings.length} call records without recordings\n`);

    if (callRecordsWithoutRecordings.length === 0) {
      console.log('✅ No call records to delete - all records have recordings!');
      console.log('='.repeat(60) + '\n');
      return;
    }

    // Step 3: Show sample of what will be deleted
    console.log('📋 Sample of call records to be deleted (first 10):');
    callRecordsWithoutRecordings.slice(0, 10).forEach((record, index) => {
      console.log(`\n${index + 1}. Call ID: ${record.callId}`);
      console.log(`   Phone: ${record.phoneNumber}`);
      console.log(`   Date: ${record.startTime.toISOString()}`);
      console.log(`   Duration: ${record.duration}s`);
      console.log(`   Outcome: ${record.outcome}`);
      console.log(`   Campaign: ${record.campaignId}`);
    });

    if (callRecordsWithoutRecordings.length > 10) {
      console.log(`\n... and ${callRecordsWithoutRecordings.length - 10} more\n`);
    }

    // Step 4: Ask for confirmation (auto-confirm in script mode)
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  DELETION CONFIRMATION');
    console.log('='.repeat(60));
    console.log(`This will permanently delete ${callRecordsWithoutRecordings.length} call records.`);
    console.log('These records have no associated recordings.');
    console.log('\nProceeding with deletion in 3 seconds...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 5: Delete call records without recordings
    console.log('\n🗑️  Deleting call records without recordings...\n');

    const deleteResult = await prisma.callRecord.deleteMany({
      where: {
        recordingFile: null
      }
    });

    console.log(`✅ Successfully deleted ${deleteResult.count} call records\n`);

    // Step 6: Verify deletion and show new statistics
    const remainingCallRecords = await prisma.callRecord.count();
    const callRecordsWithRecordings = await prisma.callRecord.count({
      where: {
        recordingFile: {
          isNot: null
        }
      }
    });

    console.log('='.repeat(60));
    console.log('📊 Updated Statistics:');
    console.log('='.repeat(60));
    console.log(`   Total Call Records (before): ${totalCallRecords}`);
    console.log(`   Total Call Records (after): ${remainingCallRecords}`);
    console.log(`   Call Records Deleted: ${deleteResult.count}`);
    console.log(`   Call Records with Recordings: ${callRecordsWithRecordings}`);
    console.log(`   Total Recordings (unchanged): ${totalRecordings}`);
    console.log('='.repeat(60));

    console.log('\n✅ Cleanup Complete!\n');
    console.log('🎯 All remaining call records now have associated recordings.\n');

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
removeCallRecordsWithoutRecordings()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });
