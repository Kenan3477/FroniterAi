/**
 * Check ALL Call Records in Database
 * Shows what's actually in the database to understand the structure
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllCallRecords() {
  console.log('\n🔍 COMPLETE DATABASE CALL RECORDS ANALYSIS');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Get ALL call records
    const allCalls = await prisma.callRecord.findMany({
      orderBy: { startTime: 'desc' },
      take: 100,
      include: {
        recordingFile: true,
        agent: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    console.log(`📊 Total Call Records in Database: ${allCalls.length}\n`);

    // Analyze call IDs
    const callIdPatterns = {
      twilioFormat: 0,  // Starts with CA
      confFormat: 0,    // Starts with conf-
      callFormat: 0,    // Starts with call-
      other: 0
    };

    const withRecording = allCalls.filter(c => c.recording).length;
    const withRecordingFile = allCalls.filter(c => c.recordingFile).length;

    allCalls.forEach(call => {
      if (call.callId.startsWith('CA')) callIdPatterns.twilioFormat++;
      else if (call.callId.startsWith('conf-')) callIdPatterns.confFormat++;
      else if (call.callId.startsWith('call-')) callIdPatterns.callFormat++;
      else callIdPatterns.other++;
    });

    console.log('📋 CALL ID PATTERNS:');
    console.log('─────────────────────────────────────────────────');
    console.log(`Twilio Format (CA...):    ${callIdPatterns.twilioFormat}`);
    console.log(`Conference (conf-...):    ${callIdPatterns.confFormat}`);
    console.log(`Test Data (call-...):     ${callIdPatterns.callFormat}`);
    console.log(`Other formats:            ${callIdPatterns.other}`);
    console.log('');
    console.log(`With recording field:     ${withRecording}`);
    console.log(`With recordingFile:       ${withRecordingFile}`);
    console.log('');

    // Show sample of each type
    console.log('📋 SAMPLE CALL RECORDS:\n');

    const sampleCA = allCalls.find(c => c.callId.startsWith('CA'));
    const sampleConf = allCalls.find(c => c.callId.startsWith('conf-'));
    const sampleCall = allCalls.find(c => c.callId.startsWith('call-'));

    if (sampleCA) {
      console.log('TWILIO FORMAT CALL (CA...):');
      console.log(`  ID:         ${sampleCA.id}`);
      console.log(`  Call ID:    ${sampleCA.callId}`);
      console.log(`  Recording:  ${sampleCA.recording || 'NULL'}`);
      console.log(`  RecordFile: ${sampleCA.recordingFile ? 'EXISTS' : 'NULL'}`);
      console.log(`  Duration:   ${sampleCA.duration}s`);
      console.log(`  Outcome:    ${sampleCA.outcome}`);
      console.log(`  Agent:      ${sampleCA.agent ? `${sampleCA.agent.firstName} ${sampleCA.agent.lastName}` : 'N/A'}`);
      console.log('');
    }

    if (sampleConf) {
      console.log('CONFERENCE FORMAT CALL (conf-...):');
      console.log(`  ID:         ${sampleConf.id}`);
      console.log(`  Call ID:    ${sampleConf.callId}`);
      console.log(`  Recording:  ${sampleConf.recording || 'NULL'}`);
      console.log(`  RecordFile: ${sampleConf.recordingFile ? 'EXISTS' : 'NULL'}`);
      console.log(`  Duration:   ${sampleConf.duration}s`);
      console.log(`  Outcome:    ${sampleConf.outcome}`);
      console.log(`  Agent:      ${sampleConf.agent ? `${sampleConf.agent.firstName} ${sampleConf.agent.lastName}` : 'N/A'}`);
      console.log('');
    }

    if (sampleCall) {
      console.log('TEST DATA CALL (call-...):');
      console.log(`  ID:         ${sampleCall.id}`);
      console.log(`  Call ID:    ${sampleCall.callId}`);
      console.log(`  Recording:  ${sampleCall.recording || 'NULL'}`);
      console.log(`  RecordFile: ${sampleCall.recordingFile ? 'EXISTS' : 'NULL'}`);
      console.log(`  Duration:   ${sampleCall.duration}s`);
      console.log(`  Outcome:    ${sampleCall.outcome}`);
      console.log(`  Agent:      ${sampleCall.agent ? `${sampleCall.agent.firstName} ${sampleCall.agent.lastName}` : 'N/A'}`);
      console.log('');
    }

    // Show most recent 10 calls
    console.log('═══════════════════════════════════════════════════');
    console.log('📞 LAST 10 CALLS MADE:\n');

    allCalls.slice(0, 10).forEach((call, idx) => {
      console.log(`Call #${idx + 1}:`);
      console.log(`  Date:       ${call.startTime.toISOString()}`);
      console.log(`  Call ID:    ${call.callId}`);
      console.log(`  Duration:   ${call.duration || 0}s`);
      console.log(`  Outcome:    ${call.outcome || 'N/A'}`);
      console.log(`  Recording:  ${call.recording ? '✅ HAS URL' : '❌ NULL'}`);
      console.log(`  RecFile:    ${call.recordingFile ? '✅ EXISTS' : '❌ NULL'}`);
      if (call.recordingFile) {
        console.log(`    File Path: ${call.recordingFile.filePath}`);
      }
      console.log('');
    });

    // Check Recording table separately
    const recordingCount = await prisma.recording.count();
    console.log('═══════════════════════════════════════════════════');
    console.log(`📼 RECORDING TABLE COUNT: ${recordingCount}\n`);

    if (recordingCount > 0) {
      const sampleRecordings = await prisma.recording.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          callRecord: {
            select: { callId: true }
          }
        }
      });

      console.log('Sample recordings in Recording table:\n');
      sampleRecordings.forEach((rec, idx) => {
        console.log(`Recording #${idx + 1}:`);
        console.log(`  ID:           ${rec.id}`);
        console.log(`  Call Record:  ${rec.callRecordId}`);
        console.log(`  Call ID:      ${rec.callRecord?.callId}`);
        console.log(`  File Path:    ${rec.filePath}`);
        console.log(`  Duration:     ${rec.duration}s`);
        console.log(`  Status:       ${rec.uploadStatus}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllCallRecords();
