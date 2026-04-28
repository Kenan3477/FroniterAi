const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:zqIXCUKCmWMRaYpMrPsOvvLgRbvEzYRx@junction.proxy.rlwy.net:20738/railway'
    }
  }
});

async function checkRecordingsDebug() {
  try {
    console.log('🔍 Checking recording data for download issues...\n');
    
    // Get recent call records with recordings
    const callsWithRecordings = await prisma.callRecord.findMany({
      where: {
        recordingFile: {
          isNot: null
        }
      },
      include: {
        recordingFile: true
      },
      orderBy: { startTime: 'desc' },
      take: 5
    });
    
    console.log(`📊 Found ${callsWithRecordings.length} calls with recordings:\n`);
    
    callsWithRecordings.forEach((call, idx) => {
      console.log(`${idx + 1}. Call ID: ${call.callId}`);
      console.log(`   Phone: ${call.phoneNumber}`);
      console.log(`   Recording ID: ${call.recordingFile?.id}`);
      console.log(`   File Name: ${call.recordingFile?.fileName}`);
      console.log(`   File Path: ${call.recordingFile?.filePath}`);
      console.log(`   Upload Status: ${call.recordingFile?.uploadStatus}`);
      console.log(`   Storage Type: ${call.recordingFile?.storageType}`);
      console.log(`   File Size: ${call.recordingFile?.fileSize}`);
      console.log('');
    });
    
    // Check if any recordings have NULL filePath
    const recordingsWithoutPath = await prisma.recording.count({
      where: {
        OR: [
          { filePath: null },
          { filePath: '' }
        ]
      }
    });
    
    console.log(`⚠️  Recordings without file path: ${recordingsWithoutPath}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecordingsDebug();
