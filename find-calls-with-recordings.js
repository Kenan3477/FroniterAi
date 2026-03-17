/**
 * Find all calls that have actual recording files
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { 
    db: { 
      url: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
    }
  }
});

async function findCallsWithRecordings() {
  try {
    console.log('🔍 Searching for calls with recordings...');
    
    // Find calls with recording URLs (check all calls)
    const allCalls = await prisma.callRecord.findMany({
      select: { 
        id: true, 
        phoneNumber: true, 
        recording: true,
        recordingFile: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    // Filter for calls with recordings
    const callsWithRecordings = allCalls.filter(call => 
      call.recording || call.recordingFile
    );
    
    console.log(`📞 Found ${callsWithRecordings.length} calls with recordings:`);
    
    callsWithRecordings.forEach((call, index) => {
      console.log(`\n  ${index + 1}. Call ID: ${call.id}`);
      console.log(`     Phone: ${call.phoneNumber}`);
      console.log(`     Recording URL: ${call.recording || 'NONE'}`);
      console.log(`     Recording File: ${call.recordingFile || 'NONE'}`);
      console.log(`     Created: ${call.createdAt}`);
    });
    
    // Also specifically check the call that was trying to be transcribed
    console.log('\n🎯 Checking specific transcription target call...');
    const targetCall = await prisma.callRecord.findFirst({
      where: { id: 'cmlp65bce000amhihg98wkc0e' },
      select: { 
        id: true, 
        phoneNumber: true, 
        recording: true,
        recordingFile: true
      }
    });
    
    if (targetCall) {
      console.log('   Target Call ID:', targetCall.id);
      console.log('   Phone:', targetCall.phoneNumber);
      console.log('   Recording URL:', targetCall.recording || 'NONE');
      console.log('   Recording File:', targetCall.recordingFile || 'NONE');
    } else {
      console.log('   ❌ Target call not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findCallsWithRecordings();