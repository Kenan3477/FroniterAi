/**
 * Check the storage type of the problematic recording
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRecordingStorageType() {
  console.log('🔍 Checking Recording Storage Types\n');

  const recordings = await prisma.recording.findMany({
    select: {
      id: true,
      fileName: true,
      filePath: true,
      storageType: true,
      uploadStatus: true,
      callRecordId: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });

  console.log(`📊 Found ${recordings.length} recordings (showing last 10):\n`);

  recordings.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec.id}`);
    console.log(`   File: ${rec.fileName}`);
    console.log(`   Storage Type: ${rec.storageType || '❌ NULL'}`);
    console.log(`   Upload Status: ${rec.uploadStatus}`);
    console.log(`   Path: ${rec.filePath || 'N/A'}`);
    console.log('');
  });

  // Check the specific problematic one
  const problematic = await prisma.recording.findUnique({
    where: { id: 'cmm50qu23000u11nupdevjyvt' }
  });

  if (problematic) {
    console.log('🔍 Problematic Recording Details:');
    console.log(JSON.stringify(problematic, null, 2));
    console.log('');

    if (!problematic.storageType || problematic.storageType !== 'twilio') {
      console.log('⚠️  PROBLEM FOUND: storageType is not "twilio"!');
      console.log('This causes the 501 "Not Implemented" error.\n');

      console.log('🔧 Fixing: Update all recordings to storageType="twilio"...\n');

      const updateResult = await prisma.recording.updateMany({
        where: {
          OR: [
            { storageType: null },
            { storageType: { not: 'twilio' } }
          ]
        },
        data: {
          storageType: 'twilio'
        }
      });

      console.log(`✅ Updated ${updateResult.count} recordings to storageType="twilio"\n`);
    } else {
      console.log('✅ Storage type is correct ("twilio")');
    }
  } else {
    console.log('❌ Recording not found in database');
  }

  await prisma.$disconnect();
}

checkRecordingStorageType().catch(console.error);
