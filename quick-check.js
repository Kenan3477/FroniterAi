const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickCheck() {
  try {
    const transcriptCount = await prisma.callTranscript.count();
    console.log('Total transcripts:', transcriptCount);
    
    const completedCount = await prisma.callRecord.count({
      where: { transcriptionStatus: 'completed' }
    });
    console.log('Completed calls:', completedCount);
    
    if (transcriptCount > 0) {
      const sample = await prisma.callTranscript.findFirst();
      console.log('Sample transcript callId:', sample.callId);
      
      const matchingCall = await prisma.callRecord.findFirst({
        where: { id: sample.callId }
      });
      console.log('Matching call found:', !!matchingCall);
      if (matchingCall) {
        console.log('Call status:', matchingCall.transcriptionStatus);
      }
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

quickCheck();