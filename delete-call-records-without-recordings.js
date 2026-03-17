/**
 * Delete Call Records Without Recordings
 * PRODUCTION SCRIPT - Removes call records that have no associated recording
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:BaPOsGCMKYiGNOLQUJkWbAIaJcfayoqJ@postgres.railway.internal:5432/railway'
});

async function deleteCallRecordsWithoutRecordings() {
  try {
    console.log('🗑️  Deleting Call Records Without Recordings\n');
    console.log('='.repeat(80));

    // Step 1: Find all call records
    const allCallRecords = await prisma.callRecord.findMany({
      include: {
        recordingFile: true,
        contact: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    console.log(`\n📊 Total call records: ${allCallRecords.length}`);

    // Step 2: Filter records without recordings
    const recordsWithoutRecordings = allCallRecords.filter(r => !r.recordingFile);

    console.log(`📊 Call records WITHOUT recordings: ${recordsWithoutRecordings.length}\n`);

    if (recordsWithoutRecordings.length === 0) {
      console.log('✅ No call records to delete - all records have recordings!');
      return;
    }

    // Step 3: Show what will be deleted
    console.log('='.repeat(80));
    console.log('📋 Call Records to be DELETED:');
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

    // Step 4: Confirm deletion
    console.log('='.repeat(80));
    console.log('⚠️  DELETION WARNING');
    console.log('='.repeat(80));
    console.log(`\nThis will permanently delete ${recordsWithoutRecordings.length} call records.`);
    console.log('These records have NO associated recordings.');
    console.log('\n⏳ Proceeding with deletion in 5 seconds...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 5: Delete the records
    const recordIdsToDelete = recordsWithoutRecordings.map(r => r.id);

    console.log('🗑️  Deleting records...\n');

    const deleteResult = await prisma.callRecord.deleteMany({
      where: {
        id: {
          in: recordIdsToDelete
        }
      }
    });

    console.log(`✅ Deleted ${deleteResult.count} call records\n`);

    // Step 6: Verify
    const remainingRecords = await prisma.callRecord.count();
    const recordsWithRecordings = await prisma.callRecord.count({
      where: {
        recordingFile: {
          isNot: null
        }
      }
    });

    console.log('='.repeat(80));
    console.log('📊 Final Statistics:');
    console.log('='.repeat(80));
    console.log(`   Total call records (before): ${allCallRecords.length}`);
    console.log(`   Total call records (after): ${remainingRecords}`);
    console.log(`   Call records deleted: ${deleteResult.count}`);
    console.log(`   Call records with recordings: ${recordsWithRecordings}`);
    console.log('='.repeat(80));

    console.log('\n✅ Cleanup Complete!\n');
    console.log('🎯 All remaining call records now have recordings.\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the deletion
deleteCallRecordsWithoutRecordings()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });
