#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findTwilioRecording() {
  try {
    console.log('🔍 Looking for Twilio recording information...');

    // Get the call record
    const callRecord = await prisma.callRecord.findFirst({
      where: {
        callId: 'conf-1771246019036-mjjrdktwy'
      },
      include: {
        recordingFile: true
      }
    });

    if (callRecord) {
      console.log('📞 Call Record Details:');
      console.log(`Call ID: ${callRecord.callId}`);
      console.log(`Phone: ${callRecord.phoneNumber}`);
      console.log(`Start Time: ${callRecord.startTime}`);
      console.log(`Duration: ${callRecord.duration}s`);
      console.log(`Recording field (legacy): ${callRecord.recording || 'None'}`);
      
      // The file path had the Twilio SID in it originally
      const originalPath = callRecord.recordingFile?.filePath;
      if (originalPath && originalPath.includes('CA223b31bd3d82b81f2869e724936e2ad1')) {
        const twilioSid = 'CA223b31bd3d82b81f2869e724936e2ad1';
        console.log(`🎵 Found Twilio Recording SID: ${twilioSid}`);
        
        // Update the recording to use the Twilio SID and proper filename
        await prisma.recording.update({
          where: { id: callRecord.recordingFile.id },
          data: {
            filePath: twilioSid, // Use Twilio SID for API calls
            fileName: `${twilioSid}.mp3` // Proper filename
          }
        });
        
        console.log('✅ Updated recording to use Twilio SID');
        console.log(`New file path: ${twilioSid}`);
        console.log(`New file name: ${twilioSid}.mp3`);
        
        return twilioSid;
      } else {
        console.log('❌ Could not extract Twilio SID from file path');
        console.log(`File path: ${originalPath}`);
      }
    }

  } catch (error) {
    console.error('❌ Error finding Twilio recording:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findTwilioRecording();