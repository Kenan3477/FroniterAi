/**
 * Delete the 7 broken call records without recordings from Railway database
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BROKEN_RECORD_IDS = [
  'cmm56k3d4000lbxrwfr9cvohy', // CAf95c0be87d977aeed7b25b22bb74e972
  'cmm50rdh4001311nuj1vpupkr', // CAd5fb2d515bd15dab3801f66c7f02acd1
  'cmm4nbteb000mzxo1z4yir43w', // CAa28e29c70600ff2cedd8e38fb5a9d7c7
  'cmm3vcwah000zho1r6i24vxnx', // CAtest-prioritization-1772134889157
  'cmm3odp85000br88qhp3lqe0h', // CAtest123
  'cmm3beu8d000jntct3d2oo6yt', // call-1772101388167-7cudihld1
  'cmm3bcsr7000fntctfb9hda1l'  // call-1772101292937-wqgemqoh2
];

async function deleteBrokenRecords() {
  console.log('🗑️  Deleting 7 Broken Call Records Without Recordings\n');
  console.log('Target Record IDs:');
  BROKEN_RECORD_IDS.forEach((id, i) => {
    console.log(`   ${i + 1}. ${id}`);
  });
  console.log('');

  try {
    // First, verify these records exist and have no recordings
    console.log('🔍 Verifying records before deletion...\n');
    
    const recordsToDelete = await prisma.callRecord.findMany({
      where: {
        id: { in: BROKEN_RECORD_IDS }
      },
      include: {
        recordingFile: true
      }
    });

    console.log(`Found ${recordsToDelete.length} records in database\n`);

    // Show what we're about to delete
    recordsToDelete.forEach((record, i) => {
      console.log(`${i + 1}. ${record.id}`);
      console.log(`   Call ID: ${record.callId}`);
      console.log(`   Phone: ${record.phoneNumber}`);
      console.log(`   Outcome: ${record.outcome || 'N/A'}`);
      console.log(`   Duration: ${record.duration}s`);
      console.log(`   Has Recording: ${record.recordingFile ? '✅ YES' : '❌ NO'}`);
      
      if (record.recordingFile) {
        console.log(`   ⚠️  WARNING: This record HAS a recording! Skipping...`);
      }
      console.log('');
    });

    // Filter to only delete records WITHOUT recordings
    const recordsWithoutRecordings = recordsToDelete.filter(r => !r.recordingFile);
    const idsToDelete = recordsWithoutRecordings.map(r => r.id);

    if (idsToDelete.length === 0) {
      console.log('✅ No records to delete (all have recordings or don\'t exist)');
      return;
    }

    console.log(`🗑️  Proceeding to delete ${idsToDelete.length} records...\n`);

    // Delete the records
    const deleteResult = await prisma.callRecord.deleteMany({
      where: {
        id: { in: idsToDelete }
      }
    });

    console.log(`✅ Successfully deleted ${deleteResult.count} call records\n`);

    // Verify deletion
    console.log('🔍 Verifying deletion...');
    const remainingRecords = await prisma.callRecord.findMany({
      where: {
        id: { in: idsToDelete }
      }
    });

    if (remainingRecords.length === 0) {
      console.log('✅ All records successfully removed from database\n');
    } else {
      console.log(`⚠️  Warning: ${remainingRecords.length} records still exist`);
    }

    // Show updated totals
    const totalRecords = await prisma.callRecord.count();
    const recordsWithRecordings = await prisma.callRecord.count({
      where: {
        recordingFile: { isNot: null }
      }
    });

    console.log('📊 Updated Database Stats:');
    console.log(`   Total call records: ${totalRecords}`);
    console.log(`   Records with recordings: ${recordsWithRecordings}`);
    console.log(`   Records without recordings: ${totalRecords - recordsWithRecordings}`);
    console.log('');

    if (totalRecords === recordsWithRecordings) {
      console.log('🎉 SUCCESS! All remaining call records have recordings!\n');
    }

    console.log('='.repeat(60));
    console.log('✅ CLEANUP COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the deletion
deleteBrokenRecords().catch(console.error);
