/**
 * Check and fix recording storage types in Railway database
 * This should resolve the 503/501 streaming errors
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRecordingStorageTypes() {
  console.log('🔍 Checking Recording Storage Types in Railway Database\n');

  try {
    // Get all recordings and their storage types
    const recordings = await prisma.recording.findMany({
      select: {
        id: true,
        fileName: true,
        filePath: true,
        storageType: true,
        callRecordId: true,
        duration: true,
        uploadStatus: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Total recordings found: ${recordings.length}\n`);

    if (recordings.length === 0) {
      console.log('❌ No recordings found in database');
      return;
    }

    // Analyze storage types
    const storageTypeCounts = {};
    recordings.forEach(r => {
      const type = r.storageType || 'NULL';
      storageTypeCounts[type] = (storageTypeCounts[type] || 0) + 1;
    });

    console.log('📊 Storage Type Distribution:');
    Object.entries(storageTypeCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} recordings`);
    });
    console.log('');

    // Show problematic recordings
    const problematicRecordings = recordings.filter(r => r.storageType !== 'twilio');
    
    if (problematicRecordings.length > 0) {
      console.log(`⚠️  Found ${problematicRecordings.length} recordings with incorrect storage type:\n`);
      
      problematicRecordings.slice(0, 10).forEach((r, i) => {
        console.log(`${i + 1}. ${r.id}`);
        console.log(`   File: ${r.fileName}`);
        console.log(`   Path: ${r.filePath}`);
        console.log(`   Storage Type: ${r.storageType || 'NULL'}`);
        console.log(`   Upload Status: ${r.uploadStatus}`);
        console.log('');
      });

      if (problematicRecordings.length > 10) {
        console.log(`   ... and ${problematicRecordings.length - 10} more\n`);
      }

      // Fix storage types
      console.log('🔧 Fixing storage types to "twilio"...\n');
      
      const updateResult = await prisma.recording.updateMany({
        where: {
          storageType: {
            not: 'twilio'
          }
        },
        data: {
          storageType: 'twilio'
        }
      });

      console.log(`✅ Updated ${updateResult.count} recordings to storageType = 'twilio'\n`);
    } else {
      console.log('✅ All recordings already have correct storageType = "twilio"\n');
    }

    // Verify the fix
    console.log('🔍 Verifying fix...\n');
    
    const updatedRecordings = await prisma.recording.findMany({
      select: {
        storageType: true
      }
    });

    const updatedCounts = {};
    updatedRecordings.forEach(r => {
      const type = r.storageType || 'NULL';
      updatedCounts[type] = (updatedCounts[type] || 0) + 1;
    });

    console.log('📊 Updated Storage Type Distribution:');
    Object.entries(updatedCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} recordings`);
    });
    console.log('');

    const twilioCount = updatedCounts['twilio'] || 0;
    const totalCount = updatedRecordings.length;

    if (twilioCount === totalCount) {
      console.log('🎉 SUCCESS! All recordings now have storageType = "twilio"');
      console.log('✅ Recording streaming should now work properly\n');
    } else {
      console.log('⚠️  Some recordings still have incorrect storage types');
    }

    console.log('='.repeat(60));
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