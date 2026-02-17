#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncTwilioRecording() {
  try {
    console.log('🔄 Syncing real Twilio recordings...');

    // Get the call record that has the recording
    const callRecord = await prisma.callRecord.findFirst({
      where: {
        callId: 'conf-1771246019036-mjjrdktwy'
      },
      include: {
        recordingFile: true
      }
    });

    if (callRecord) {
      console.log('📞 Found call record:');
      console.log(`Call ID: ${callRecord.callId}`);
      console.log(`Phone: ${callRecord.phoneNumber}`);
      console.log(`Recording field: ${callRecord.recording || 'None'}`);
      
      if (callRecord.recordingFile) {
        console.log(`Recording File ID: ${callRecord.recordingFile.id}`);
        console.log(`Recording File Path: ${callRecord.recordingFile.filePath}`);
        console.log(`Recording File Name: ${callRecord.recordingFile.fileName}`);
        
        // The fileName contains the Twilio recording SID
        const fileName = callRecord.recordingFile.fileName;
        if (fileName && fileName.startsWith('CA')) {
          const twilioRecordingSid = fileName.split('_')[0]; // Extract CA223b31bd3d82b81f2869e724936e2ad1
          console.log(`🎵 Twilio Recording SID: ${twilioRecordingSid}`);
          
          // Update the recording to use the Twilio SID directly
          await prisma.recording.update({
            where: { id: callRecord.recordingFile.id },
            data: {
              filePath: twilioRecordingSid, // Use the Twilio SID as the file path
            }
          });
          
          console.log('✅ Updated recording to use Twilio SID for streaming');
        }
      }
    } else {
      console.log('⚠️ Call record not found');
    }

  } catch (error) {
    console.error('❌ Error syncing Twilio recording:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncTwilioRecording();