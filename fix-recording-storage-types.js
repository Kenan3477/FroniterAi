/**
 * Fix recording storageType values in Railway database
 * Set all recordings to use 'twilio' storage type
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRecordingStorageTypes() {
  console.log('🔧 Fixing Recording Storage Types in Railway Database\n');

  try {
    // Check current storageType values
    console.log('📊 Checking current storage types...\n');
    
    const allRecordings = await prisma.recording.findMany({
      select: {
        id: true,
        fileName: true,
        storageType: true,
        filePath: true
      }
    });

    console.log(`Total recordings: ${allRecordings.length}\n`);

    // Group by storageType
    const storageTypeCounts = {};
    allRecordings.forEach(r => {
      const type = r.storageType || 'null';
      storageTypeCounts[type] = (storageTypeCounts[type] || 0) + 1;
    });

    console.log('Storage Type Distribution:');
    Object.entries(storageTypeCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    console.log('');

    // Find recordings that need fixing (not set to 'twilio')
    const needsFixing = allRecordings.filter(r => r.storageType !== 'twilio');

    if (needsFixing.length === 0) {
      console.log('✅ All recordings already have storageType="twilio"\n');
      return;
    }

    console.log(`⚠️  Found ${needsFixing.length} recordings that need fixing:\n`);
    needsFixing.forEach((r, i) => {
      console.log(`${i + 1}. ${r.id}`);
      console.log(`   File: ${r.fileName}`);
      console.log(`   Current storageType: ${r.storageType || 'null'}`);
      console.log(`   File Path: ${r.filePath || 'N/A'}`);
      console.log('');
    });

    // Update all recordings to use 'twilio' storage type
    console.log('🔧 Updating all recordings to storageType="twilio"...\n');

    const updateResult = await prisma.recording.updateMany({
      where: {
        storageType: { not: 'twilio' }
      },
      data: {
        storageType: 'twilio'
      }
    });

    console.log(`✅ Updated ${updateResult.count} recordings\n`);

    // Verify the fix
    console.log('🔍 Verifying fix...\n');
    
    const afterUpdate = await prisma.recording.findMany({
      select: {
        storageType: true
      }
    });

    const afterCounts = {};
    afterUpdate.forEach(r => {
      const type = r.storageType || 'null';
      afterCounts[type] = (afterCounts[type] || 0) + 1;
    });

    console.log('Updated Storage Type Distribution:');
    Object.entries(afterCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    console.log('');

    if (afterCounts['twilio'] === afterUpdate.length) {
      console.log('🎉 SUCCESS! All recordings now use storageType="twilio"\n');
      console.log('✅ Recording playback should now work in the frontend.');
    } else {
      console.log('⚠️  Some recordings may still have incorrect storageType.');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ STORAGE TYPE FIX COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixRecordingStorageTypes().catch(console.error);
