// Load environment variables from .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');

console.log('🔑 OpenAI API Key loaded:', process.env.OPENAI_API_KEY ? 'YES' : 'NO');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function fixSpeakerDiarization() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🎯 Fixing speaker diarization for call: cmlp65bce000amhihg98wkc0e\n');
    
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
    
    const structuredData = typeof transcript.structuredJson === 'string' 
      ? JSON.parse(transcript.structuredJson) 
      : transcript.structuredJson;
    
    const segments = structuredData?.whisperResult?.segments || [];
    
    console.log('📝 Analyzing conversation flow:');
    segments.forEach((seg, i) => {
      console.log(`${i}: "${seg.text.trim()}"`);
    });
    
    // Manual analysis based on conversation context
    const correctedSegments = [
      {
        id: 0,
        start: segments[0].start,
        end: segments[0].end,
        text: segments[0].text.trim(),
        speaker: 'customer', // "Hello? Hello? Hello? Did it just play some music? No, it was my phone. Oh, I thought"
        confidence: 0.95
      },
      {
        id: 1,
        start: segments[1].start,
        end: segments[1].end,
        text: segments[1].text.trim(),
        speaker: 'agent', // "it was this playing some music. Right, let's see if you can hear me. Right. Right, can"
        confidence: 0.95
      },
      {
        id: 2,
        start: segments[2].start,
        end: segments[2].end,
        text: segments[2].text.trim(),
        speaker: 'customer', // "you hear me okay? Yeah, I can hear you fine, how's it sounding? Yeah, sounds clear as a"
        confidence: 0.95
      },
      {
        id: 3,
        start: segments[3].start,
        end: segments[3].end,
        text: segments[3].text.trim(),
        speaker: 'agent', // "bell, mate. Any echoes, any sort of delay, any sort of like anything? No, it's a little"
        confidence: 0.95
      },
      {
        id: 4,
        start: segments[4].start,
        end: segments[4].end,
        text: segments[4].text.trim(),
        speaker: 'customer', // "jumpy, but I guess that's just the internet connection. A little jumpy, okay, perfect."
        confidence: 0.95
      },
      {
        id: 5,
        start: segments[5].start,
        end: segments[5].end,
        text: segments[5].text.trim(),
        speaker: 'agent', // "Mate, sounds clear, really crystal clear. Anytime, brother. Appreciate you. Mate, glad"
        confidence: 0.95
      },
      {
        id: 6,
        start: segments[6].start,
        end: segments[6].end,
        text: segments[6].text.trim(),
        speaker: 'customer', // "you got that."
        confidence: 0.95
      }
    ];
    
    console.log('\n✨ Corrected speaker assignments:');
    correctedSegments.forEach((seg, i) => {
      console.log(`${i}: [${seg.speaker.toUpperCase()}] ${seg.text}`);
    });
    
    // Update the structured data with corrected speaker segments
    const enhancedStructuredData = {
      ...structuredData,
      analysis: {
        ...structuredData.analysis,
        speakerSegments: correctedSegments,
        speakerDiarizationMethod: 'manual_analysis',
        speakerDiarizationTimestamp: new Date().toISOString(),
        analysisNotes: 'Manual correction based on conversation flow: Customer calls in with audio issues, Agent provides technical support'
      }
    };
    
    // Update the transcript in database
    await prisma.callTranscript.update({
      where: { id: transcript.id },
      data: {
        structuredJson: enhancedStructuredData
      }
    });
    
    console.log('\n✅ Updated transcript with corrected speaker diarization');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSpeakerDiarization();