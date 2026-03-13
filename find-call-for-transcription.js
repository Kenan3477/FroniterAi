/**
 * Find Call and Test AI Transcription
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { 
    db: { 
      url: process.env.DATABASE_URL || 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
    }
  }
});

async function findCall() {
  console.log('🔍 Searching for call: conf-1771246019036-mjjrdktwy');
  
  try {
    // First, search for the exact callId
    let call = await prisma.callRecord.findFirst({
      where: { callId: 'conf-1771246019036-mjjrdktwy' },
      include: { recordingFile: true }
    });
    
    if (!call) {
      console.log('❌ Exact callId not found, searching for partial matches...');
      
      // Search for partial matches
      const partialMatches = await prisma.callRecord.findMany({
        where: {
          OR: [
            { callId: { contains: 'conf-1771246019036' } },
            { callId: { contains: 'mjjrdktwy' } },
            { id: { contains: 'conf-1771246019036' } },
            { id: { contains: 'mjjrdktwy' } }
          ]
        },
        include: { recordingFile: true },
        take: 10
      });
      
      if (partialMatches.length > 0) {
        console.log('✅ Found partial matches:');
        partialMatches.forEach((c, i) => {
          console.log(`  ${i+1}. ID: ${c.id}`);
          console.log(`     CallID: ${c.callId}`);
          console.log(`     Phone: ${c.phoneNumber}`);
          console.log(`     Duration: ${c.duration}s`);
          console.log(`     Recording: ${c.recording ? 'Yes' : 'No'}`);
          console.log('     ---');
        });
        
        call = partialMatches[0]; // Use first match
      }
    }
    
    if (!call) {
      console.log('❌ Call not found. Let me show recent calls with recordings:');
      
      const recentCalls = await prisma.callRecord.findMany({
        where: {
          recording: { not: null }
        },
        include: { recordingFile: true },
        orderBy: { startTime: 'desc' },
        take: 5
      });
      
      console.log('📞 Recent calls with recordings:');
      recentCalls.forEach((c, i) => {
        console.log(`  ${i+1}. ID: ${c.id}`);
        console.log(`     CallID: ${c.callId}`);
        console.log(`     Phone: ${c.phoneNumber}`);
        console.log(`     Duration: ${c.duration}s`);
        console.log(`     Recording: ${c.recording ? 'Yes' : 'No'}`);
        console.log('     ---');
      });
      
      if (recentCalls.length > 0) {
        console.log('\\n💡 You can test AI transcription with any of these call IDs');
        console.log('   Example: node whisper-ai-transcription-secure.js single', recentCalls[0].id);
      }
      
      return;
    }
    
    console.log('✅ Call found:', {
      id: call.id,
      callId: call.callId,
      phoneNumber: call.phoneNumber,
      duration: call.duration,
      recording: !!call.recording
    });
    
    // Check for existing transcript
    const existingTranscript = await prisma.callTranscript.findFirst({
      where: { callId: call.id }
    });
    
    if (existingTranscript) {
      console.log('📝 Existing transcript found:');
      console.log('   Provider:', existingTranscript.processingProvider);
      console.log('   Preview:', existingTranscript.transcriptText?.substring(0, 100) + '...');
      console.log('   Sentiment Score:', existingTranscript.sentimentScore);
      console.log('   Classification:', existingTranscript.callOutcomeClassification);
      
      if (existingTranscript.processingProvider === 'openai_whisper_gpt') {
        console.log('\\n✅ This call already has Advanced AI Transcription!');
      } else {
        console.log('\\n🔄 This call has basic transcription. You can upgrade it to AI transcription.');
        console.log('   Run: node whisper-ai-transcription-secure.js single', call.id);
      }
    } else {
      console.log('\\n📝 No transcript found - ready for AI processing');
      
      if (!call.recording) {
        console.log('❌ No recording available for transcription');
      } else {
        console.log('✅ Recording available - can process with AI');
        console.log('   Run: node whisper-ai-transcription-secure.js single', call.id);
      }
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findCall();