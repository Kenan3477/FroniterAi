/**
 * Fix the recording URL for the correct call ID that has actual recordings
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { 
    db: { 
      url: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
    }
  }
});

async function fixRecordingUrlForCorrectCall() {
  try {
    console.log('🔧 Checking the call that actually has a recording...');
    
    // First check what recording the working call ID has
    const workingCall = await prisma.callRecord.findFirst({
      where: { id: 'cmlp67yhn000cmhih4hmhzm8r' },
      select: { 
        id: true, 
        phoneNumber: true, 
        recording: true,
        recordingFile: true
      }
    });
    
    if (workingCall) {
      console.log('✅ Working call found:');
      console.log('   ID:', workingCall.id);
      console.log('   Phone:', workingCall.phoneNumber);
      console.log('   Recording URL:', workingCall.recording);
      console.log('   Recording File:', workingCall.recordingFile);
      
      // Now check the transcription target call
      const transcriptCall = await prisma.callRecord.findFirst({
        where: { id: 'cmlp65bce000amhihg98wkc0e' },
        select: { 
          id: true, 
          phoneNumber: true, 
          recording: true,
          recordingFile: true
        }
      });
      
      console.log('\n❌ Transcription target call:');
      console.log('   ID:', transcriptCall?.id || 'NOT FOUND');
      console.log('   Phone:', transcriptCall?.phoneNumber || 'N/A');
      console.log('   Recording URL:', transcriptCall?.recording || 'NONE');
      console.log('   Recording File:', transcriptCall?.recordingFile || 'NONE');
      
      // If the working call has a recording URL, copy it to the transcript call
      if (workingCall.recording && transcriptCall) {
        const updatedCall = await prisma.callRecord.update({
          where: { id: 'cmlp65bce000amhihg98wkc0e' },
          data: { 
            recording: workingCall.recording,
            recordingFile: workingCall.recordingFile
          }
        });
        console.log('\n✅ Recording URL copied to transcription target call!');
      }
    } else {
      console.log('❌ Working call not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixRecordingUrlForCorrectCall();