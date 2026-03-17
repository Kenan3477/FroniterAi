const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

async function checkCallRecordingTypes() {
  try {
    console.log('🔍 Checking call recording types...');
    
    // Check all call records with recording info
    const callRecords = await prisma.callRecord.findMany({
      where: {
        agentId: '509' // Kenan's calls
      },
      include: {
        agent: true,
        contact: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${callRecords.length} call records for agent 509:`);
    
    callRecords.forEach((call, index) => {
      console.log(`\n${index + 1}. Call ID: ${call.callId}`);
      console.log(`   Phone: ${call.phoneNumber} -> ${call.dialedNumber}`);
      console.log(`   Call Type: ${call.callType}`);
      console.log(`   Duration: ${call.duration || 'N/A'} seconds`);
      console.log(`   Recording: ${call.recording || 'NULL'}`);
      console.log(`   Created: ${call.createdAt}`);
      console.log(`   Notes: ${call.notes?.substring(0, 50) || 'None'}...`);
      
      // Check if this looks like a real Twilio call
      const hasCallSid = call.callId?.includes('CA') || call.recording?.includes('CA');
      const isTestCall = call.notes?.includes('save-call-data') || call.callId?.includes('call-');
      
      if (hasCallSid) {
        console.log(`   🎯 TYPE: Real Twilio Call (should have recording)`);
      } else if (isTestCall) {
        console.log(`   🧪 TYPE: Test/Manual Call (no recording expected)`);
      } else {
        console.log(`   ❓ TYPE: Unknown`);
      }
    });

    // Also check if there are any RecordingFile entries
    const recordingFiles = await prisma.recordingFile.findMany({
      include: {
        callRecord: true
      }
    });

    console.log(`\n🎵 RecordingFile entries: ${recordingFiles.length}`);
    recordingFiles.forEach((recording, index) => {
      console.log(`${index + 1}. Recording ID: ${recording.id}`);
      console.log(`   Call ID: ${recording.callRecord?.callId || 'N/A'}`);
      console.log(`   File Path: ${recording.filePath}`);
      console.log(`   Duration: ${recording.duration} seconds`);
      console.log(`   Size: ${recording.fileSize} bytes`);
    });

  } catch (error) {
    console.error('Error checking call recordings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCallRecordingTypes();