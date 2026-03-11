/**
 * Find and Delete Call Records Without Recordings (Direct Query)
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:BaPOsGCMKYiGNOLQUJkWbAIaJcfayoqJ@postgres.railway.internal:5432/railway'
});

async function findAndDeleteRecordsWithoutRecordings() {
  try {
    console.log('🔍 Finding Call Records Without Recordings...\n');

    // Get all call record IDs
    const allCallRecords = await prisma.callRecord.findMany({
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        startTime: true,
        duration: true,
        outcome: true,
        callType: true,
        contact: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    console.log(`📊 Total call records: ${allCallRecords.length}`);

    // Get all recording callRecordIds
    const allRecordings = await prisma.recording.findMany({
      select: {
        callRecordId: true
      }
    });

    const recordingCallRecordIds = new Set(allRecordings.map(r => r.callRecordId));

    console.log(`📊 Total recordings: ${allRecordings.length}\n`);

    // Find call records without recordings
    const recordsWithoutRecordings = allCallRecords.filter(
      record => !recordingCallRecordIds.has(record.id)
    );

    console.log(`📊 Call records WITHOUT recordings: ${recordsWithoutRecordings.length}\n`);

    if (recordsWithoutRecordings.length === 0) {
      console.log('✅ All call records have recordings!');
      return;
    }

    // Show what will be deleted
    console.log('='.repeat(80));
    console.log('📋 Call Records WITHOUT Recordings (will be deleted):');
    console.log('='.repeat(80) + '\n');

    recordsWithoutRecordings.forEach((record, index) => {
      const contactName = record.contact 
        ? `${record.contact.firstName || ''} ${record.contact.lastName || ''}`.trim()
        : 'Unknown';

      console.log(`${index + 1}. ${record.phoneNumber} - ${contactName}`);
      console.log(`   Call ID: ${record.callId}`);
      console.log(`   Internal ID: ${record.id}`);
      console.log(`   Date: ${record.startTime.toLocaleString()}`);
      console.log(`   Duration: ${record.duration}s`);
      console.log(`   Outcome: ${record.outcome || 'N/A'}`);
      console.log(`   Type: ${record.callType}`);
      console.log('');
    });

    // Confirm deletion
    console.log('='.repeat(80));
    console.log('⚠️  DELETION CONFIRMATION');
    console.log('='.repeat(80));
    console.log(`\nWill permanently delete ${recordsWithoutRecordings.length} call records.`);
    console.log('⏳ Proceeding in 5 seconds...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete
    const idsToDelete = recordsWithoutRecordings.map(r => r.id);

    console.log('🗑️  Deleting records...\n');

    const deleteResult = await prisma.callRecord.deleteMany({
      where: {
        id: {
          in: idsToDelete
        }
      }
    });

    console.log(`✅ Deleted ${deleteResult.count} call records\n`);

    // Verify
    const remainingRecords = await prisma.callRecord.count();
    const remainingRecordings = await prisma.recording.count();

    console.log('='.repeat(80));
    console.log('📊 Final Statistics:');
    console.log('='.repeat(80));
    console.log(`   Call records (before): ${allCallRecords.length}`);
    console.log(`   Call records (after): ${remainingRecords}`);
    console.log(`   Records deleted: ${deleteResult.count}`);
    console.log(`   Recordings: ${remainingRecordings}`);
    console.log(`   Match: ${remainingRecords === remainingRecordings ? '✅ YES' : '❌ NO'}`);
    console.log('='.repeat(80));

    console.log('\n✅ Cleanup Complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

findAndDeleteRecordsWithoutRecordings();
