/**
 * Debug Recording Data
 */

const { PrismaClient } = require('@prisma/client');

async function debugRecording() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:BaPOsGCMKYiGNOLQUJkWbAIaJcfayoqJ@postgres.railway.internal:5432/railway'
  });

  try {
    console.log('🔍 Checking recording data...\n');

    // Get a sample recording
    const recording = await prisma.recording.findFirst({
      where: { id: 'cmm56k0l6000dbxrw0b9k9xa5' },
      include: { callRecord: true }
    });

    if (recording) {
      console.log('Recording details:');
      console.log('  ID:', recording.id);
      console.log('  fileName:', recording.fileName);
      console.log('  filePath:', recording.filePath);
      console.log('  storageType:', recording.storageType);
      console.log('  uploadStatus:', recording.uploadStatus);
      console.log('  duration:', recording.duration);
      console.log('\nCall Record:');
      console.log('  callId:', recording.callRecord.callId);
    } else {
      console.log('Recording not found');
    }

    // Check all recordings
    const allRecordings = await prisma.recording.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n📊 Sample of ${allRecordings.length} recent recordings:`);
    allRecordings.forEach((rec, i) => {
      console.log(`\n${i + 1}. ${rec.id}`);
      console.log(`   fileName: ${rec.fileName}`);
      console.log(`   filePath: ${rec.filePath}`);
      console.log(`   storageType: ${rec.storageType}`);
      console.log(`   uploadStatus: ${rec.uploadStatus}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRecording();
