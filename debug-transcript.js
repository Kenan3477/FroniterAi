// Load environment variables from .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function debugTranscript() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Debugging transcript for call: cmlp65bce000amhihg98wkc0e\n');
    
    // Get the most recent transcript
    const transcript = await prisma.callTranscript.findFirst({
      where: {
        callId: 'cmlp65bce000amhihg98wkc0e'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!transcript) {
      console.log('❌ No transcript found');
      return;
    }
    
    console.log('📝 Full transcript text:');
    console.log('"' + transcript.transcriptText + '"');
    console.log('\n');
    
    const structuredData = typeof transcript.structuredJson === 'string' 
      ? JSON.parse(transcript.structuredJson) 
      : transcript.structuredJson;
    
    console.log('🎵 Whisper raw result:');
    if (structuredData?.whisperResult) {
      console.log('Duration:', structuredData.whisperResult.duration);
      console.log('Language:', structuredData.whisperResult.language);
      console.log('Full text:', structuredData.whisperResult.text);
      console.log('\n');
    }
    
    const segments = structuredData?.whisperResult?.segments || [];
    console.log(`📊 Total segments: ${segments.length}`);
    
    console.log('\n🎭 Current segments with timing:');
    segments.forEach((seg, i) => {
      const startTime = Math.floor(seg.start);
      const endTime = Math.floor(seg.end);
      console.log(`${i}: [${startTime}s-${endTime}s] "${seg.text.trim()}"`);
    });
    
    console.log('\n💭 Let me analyze this conversation manually...');
    console.log('This appears to be a call quality test between two people.');
    console.log('Let me read the full conversation flow:');
    
    const fullText = structuredData?.whisperResult?.text || transcript.transcriptText;
    console.log('\n📖 Complete conversation:');
    console.log(fullText);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTranscript();