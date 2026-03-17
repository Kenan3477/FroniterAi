/**
 * Analyze Call Records and Recording Status
 * Check why some records show "No recording" in the UI
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:BaPOsGCMKYiGNOLQUJkWbAIaJcfayoqJ@postgres.railway.internal:5432/railway'
});

async function analyzeRecordingStatus() {
  try {
    console.log('🔍 Analyzing Call Records and Recording Status...\n');

    // Get all call records with their recordings
    const callRecords = await prisma.callRecord.findMany({
      include: {
        recordingFile: true,
        contact: {
          select: {
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 20
    });

    console.log(`📊 Found ${callRecords.length} recent call records\n`);

    // Categorize records
    const withRecording = callRecords.filter(r => r.recordingFile !== null);
    const withoutRecording = callRecords.filter(r => r.recordingFile === null);
    const recordingPending = callRecords.filter(r => r.recordingFile && r.recordingFile.uploadStatus !== 'completed');
    const recordingCompleted = callRecords.filter(r => r.recordingFile && r.recordingFile.uploadStatus === 'completed');

    console.log('📈 Summary:');
    console.log(`   Records with recordings: ${withRecording.length}`);
    console.log(`   Records without recordings: ${withoutRecording.length}`);
    console.log(`   Recordings completed: ${recordingCompleted.length}`);
    console.log(`   Recordings pending: ${recordingPending.length}`);

    console.log('\n' + '='.repeat(80));
    console.log('📋 Detailed Analysis (Last 20 records)');
    console.log('='.repeat(80) + '\n');

    callRecords.forEach((record, index) => {
      const contactName = record.contact 
        ? `${record.contact.firstName} ${record.contact.lastName}`.trim()
        : 'Unknown';
      
      console.log(`${index + 1}. ${record.callId.substring(0, 20)}...`);
      console.log(`   Contact: ${contactName} (${record.phoneNumber})`);
      console.log(`   Date: ${record.startTime.toISOString()}`);
      console.log(`   Duration: ${record.duration}s`);
      console.log(`   Outcome: ${record.outcome || 'N/A'}`);
      
      if (record.recordingFile) {
        console.log(`   ✅ Recording: ${record.recordingFile.fileName}`);
        console.log(`      Status: ${record.recordingFile.uploadStatus}`);
        console.log(`      Storage: ${record.recordingFile.storageType}`);
        console.log(`      Path: ${record.recordingFile.filePath.substring(0, 60)}...`);
      } else {
        console.log(`   ❌ No Recording`);
      }
      console.log('');
    });

    // Check for any records with invalid recording data
    console.log('='.repeat(80));
    console.log('🔍 Checking for Invalid Recording Data');
    console.log('='.repeat(80) + '\n');

    const recordingsWithIssues = await prisma.recording.findMany({
      where: {
        OR: [
          { uploadStatus: { not: 'completed' } },
          { filePath: null },
          { fileName: null }
        ]
      },
      include: {
        callRecord: {
          select: {
            callId: true,
            startTime: true
          }
        }
      }
    });

    if (recordingsWithIssues.length > 0) {
      console.log(`⚠️  Found ${recordingsWithIssues.length} recordings with issues:\n`);
      recordingsWithIssues.forEach((rec, index) => {
        console.log(`${index + 1}. Recording ID: ${rec.id}`);
        console.log(`   Call ID: ${rec.callRecord.callId}`);
        console.log(`   Status: ${rec.uploadStatus}`);
        console.log(`   FilePath: ${rec.filePath || 'NULL'}`);
        console.log(`   FileName: ${rec.fileName || 'NULL'}`);
        console.log('');
      });
    } else {
      console.log('✅ All recordings have valid data\n');
    }

    console.log('='.repeat(80));
    console.log('✅ Analysis Complete');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

analyzeRecordingStatus();
