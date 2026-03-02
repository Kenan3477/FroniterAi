/**
 * Database migration script to fix recording storage types on Railway
 * This should be run ON Railway to fix the storageType field
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateRecordingStorageTypes() {
  console.log('🔧 RAILWAY DATABASE MIGRATION: Fix Recording Storage Types\n');
  console.log('This script will update all recordings to storageType = "twilio"');
  console.log('to enable proper recording streaming.\n');

  try {
    // Step 1: Check current state
    console.log('1️⃣ Checking current storage type distribution...\n');
    
    const allRecordings = await prisma.recording.findMany({
      select: {
        id: true,
        storageType: true
      }
    });

    const counts = {};
    allRecordings.forEach(r => {
      const type = r.storageType || 'NULL';
      counts[type] = (counts[type] || 0) + 1;
    });

    console.log('📊 Current Storage Types:');
    Object.entries(counts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} recordings`);
    });
    console.log(`   Total: ${allRecordings.length} recordings\n`);

    // Step 2: Update all recordings to storageType = 'twilio'
    console.log('2️⃣ Updating all recordings to storageType = "twilio"...\n');
    
    const updateResult = await prisma.recording.updateMany({
      data: {
        storageType: 'twilio'
      }
    });

    console.log(`✅ Updated ${updateResult.count} recordings\n`);

    // Step 3: Verify the migration
    console.log('3️⃣ Verifying migration...\n');
    
    const verifyRecordings = await prisma.recording.findMany({
      select: {
        storageType: true
      }
    });

    const verifiedCounts = {};
    verifyRecordings.forEach(r => {
      const type = r.storageType || 'NULL';
      verifiedCounts[type] = (verifiedCounts[type] || 0) + 1;
    });

    console.log('📊 Updated Storage Types:');
    Object.entries(verifiedCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} recordings`);
    });

    const twilioCount = verifiedCounts['twilio'] || 0;
    const totalCount = verifyRecordings.length;

    if (twilioCount === totalCount) {
      console.log('\n🎉 MIGRATION SUCCESSFUL!');
      console.log('✅ All recordings now have storageType = "twilio"');
      console.log('✅ Recording streaming should now work properly');
    } else {
      console.log('\n⚠️  Migration incomplete');
      console.log(`   ${twilioCount}/${totalCount} recordings have correct storageType`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log('\nRecording playback should now work in the frontend!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nPlease check database connection and try again.');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute migration
if (require.main === module) {
  migrateRecordingStorageTypes().catch(process.exit);
}

module.exports = { migrateRecordingStorageTypes };