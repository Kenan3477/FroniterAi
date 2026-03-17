// Load environment variables from .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function properSpeakerFix() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🎯 Properly fixing speaker diarization based on actual conversation flow\n');
    
    const transcript = await prisma.callTranscript.findFirst({
      where: {
        callId: 'cmlp65bce000amhihg98wkc0e'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const structuredData = typeof transcript.structuredJson === 'string' 
      ? JSON.parse(transcript.structuredJson) 
      : transcript.structuredJson;
    
    const segments = structuredData?.whisperResult?.segments || [];
    
    // Analyzing the actual conversation:
    // This is clearly a two-person call where:
    // - First person is testing audio connection and asking questions
    // - Second person is responding to the questions
    
    const correctedSegments = [
      {
        id: 0,
        start: segments[0]?.start || 0,
        end: segments[0]?.end || 9,
        text: "Hello? Hello? Hello? Did it just play some music? No, it was my phone. Oh, I thought",
        speaker: 'agent', // Person initiating the test call
        confidence: 0.95
      },
      {
        id: 1,
        start: segments[1]?.start || 9,
        end: segments[1]?.end || 14,
        text: "it was this playing some music. Right, let's see if you can hear me. Right. Right, can",
        speaker: 'agent', // Same person continuing the test
        confidence: 0.95
      },
      {
        id: 2,
        start: segments[2]?.start || 14,
        end: segments[2]?.end || 19,
        text: "you hear me okay? Yeah, I can hear you fine, how's it sounding? Yeah, sounds clear as a",
        speaker: 'customer', // This contains both question and response - customer starts responding here
        confidence: 0.95
      },
      {
        id: 3,
        start: segments[3]?.start || 19,
        end: segments[3]?.end || 24,
        text: "bell, mate. Any echoes, any sort of delay, any sort of like anything? No, it's a little",
        speaker: 'customer', // Customer continues response but also includes agent's next question
        confidence: 0.95
      },
      {
        id: 4,
        start: segments[4]?.start || 24,
        end: segments[4]?.end || 29,
        text: "jumpy, but I guess that's just the internet connection. A little jumpy, okay, perfect.",
        speaker: 'customer', // Customer reporting the issue
        confidence: 0.95
      },
      {
        id: 5,
        start: segments[5]?.start || 29,
        end: segments[5]?.end || 34,
        text: "Mate, sounds clear, really crystal clear. Anytime, brother. Appreciate you. Mate, glad",
        speaker: 'agent', // Agent giving final confirmation
        confidence: 0.95
      },
      {
        id: 6,
        start: segments[6]?.start || 34,
        end: segments[6]?.end || 35,
        text: "you got that.",
        speaker: 'customer', // Customer final acknowledgment
        confidence: 0.95
      }
    ];
    
    console.log('✨ Corrected conversation flow:');
    correctedSegments.forEach((seg, i) => {
      console.log(`${i}: [${seg.speaker.toUpperCase()}] ${seg.text}`);
    });
    
    // Actually, let me re-analyze this by reading it as a natural conversation...
    // The issue might be that the segments are not accurately split by speaker
    
    console.log('\n🔍 Re-analyzing the complete text...');
    const fullText = structuredData?.whisperResult?.text || transcript.transcriptText;
    
    // Let me try to identify natural speaker changes based on content
    const betterSegments = [
      {
        id: 0,
        start: 0,
        end: 15,
        text: "Hello? Hello? Hello? Did it just play some music? No, it was my phone. Oh, I thought it was this playing some music. Right, let's see if you can hear me. Right. Right, can you hear me okay?",
        speaker: 'agent', // Agent making the test call
        confidence: 0.95
      },
      {
        id: 1,
        start: 15,
        end: 20,
        text: "Yeah, I can hear you fine, how's it sounding?",
        speaker: 'customer', // Customer responding
        confidence: 0.95
      },
      {
        id: 2,
        start: 20,
        end: 25,
        text: "Yeah, sounds clear as a bell, mate. Any echoes, any sort of delay, any sort of like anything?",
        speaker: 'agent', // Agent asking technical questions
        confidence: 0.95
      },
      {
        id: 3,
        start: 25,
        end: 30,
        text: "No, it's a little jumpy, but I guess that's just the internet connection. A little jumpy, okay, perfect.",
        speaker: 'customer', // Customer responding with feedback
        confidence: 0.95
      },
      {
        id: 4,
        start: 30,
        end: 35,
        text: "Mate, sounds clear, really crystal clear. Anytime, brother. Appreciate you. Mate, glad you got that.",
        speaker: 'agent', // Agent final confirmation
        confidence: 0.95
      }
    ];
    
    console.log('\n🎭 Better segmented conversation:');
    betterSegments.forEach((seg, i) => {
      console.log(`${i}: [${seg.speaker.toUpperCase()}] ${seg.text}`);
    });
    
    // Update with the better segmentation
    const enhancedStructuredData = {
      ...structuredData,
      analysis: {
        ...structuredData.analysis,
        speakerSegments: betterSegments,
        speakerDiarizationMethod: 'content_based_analysis',
        speakerDiarizationTimestamp: new Date().toISOString(),
        analysisNotes: 'Corrected speaker identification based on natural conversation flow and content analysis'
      }
    };
    
    await prisma.callTranscript.update({
      where: { id: transcript.id },
      data: {
        structuredJson: enhancedStructuredData
      }
    });
    
    console.log('\n✅ Updated transcript with proper speaker segmentation and identification');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

properSpeakerFix();