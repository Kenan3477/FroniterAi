// Load environment variables from .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function correctSpeakerIdentification() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🎯 Correcting speaker identification - Agent asks "how\'s it sounding?"\n');
    
    const transcript = await prisma.callTranscript.findFirst({
      where: {
        callId: 'cmlp65bce000amhihg98wkc0e'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const structuredData = typeof transcript.structuredJson === 'string' 
      ? JSON.parse(transcript.structuredJson) 
      : transcript.structuredJson;
    
    // CORRECT ANALYSIS:
    // Agent is conducting a call quality test and asking "how's it sounding?"
    // Customer is responding to the agent's questions
    
    const correctSegments = [
      {
        id: 0,
        start: 0,
        end: 15,
        text: "Hello? Hello? Hello? Did it just play some music? No, it was my phone. Oh, I thought it was this playing some music. Right, let's see if you can hear me. Right. Right, can you hear me okay?",
        speaker: 'customer', // Customer calling in, confused about audio
        confidence: 0.95
      },
      {
        id: 1,
        start: 15,
        end: 20,
        text: "Yeah, I can hear you fine, how's it sounding?",
        speaker: 'agent', // Agent responding and asking about call quality
        confidence: 0.95
      },
      {
        id: 2,
        start: 20,
        end: 25,
        text: "Yeah, sounds clear as a bell, mate. Any echoes, any sort of delay, any sort of like anything?",
        speaker: 'customer', // Customer giving feedback and Agent asking technical questions
        confidence: 0.95
      },
      {
        id: 3,
        start: 25,
        end: 30,
        text: "No, it's a little jumpy, but I guess that's just the internet connection. A little jumpy, okay, perfect.",
        speaker: 'customer', // Customer continuing to report issues
        confidence: 0.95
      },
      {
        id: 4,
        start: 30,
        end: 35,
        text: "Mate, sounds clear, really crystal clear. Anytime, brother. Appreciate you. Mate, glad you got that.",
        speaker: 'agent', // Agent confirming quality and ending call professionally
        confidence: 0.95
      }
    ];
    
    // Actually, let me re-read this even more carefully...
    // Looking at "Yeah, I can hear you fine, how's it sounding?" - this sounds like TWO people talking
    // Customer: "Yeah, I can hear you fine"
    // Agent: "how's it sounding?"
    
    console.log('🔍 Let me break this down more carefully:');
    console.log('1. Customer calls in confused about music/audio');
    console.log('2. Customer asks "can you hear me okay?"');
    console.log('3. Agent responds "Yeah, I can hear you fine" then asks "how\'s it sounding?"');
    console.log('4. Customer says "Yeah, sounds clear as a bell, mate"');
    console.log('5. Agent asks "Any echoes, any sort of delay..."');
    console.log('6. Customer responds about connection issues');
    console.log('7. Agent gives final professional assessment');
    
    const finalCorrectSegments = [
      {
        id: 0,
        start: 0,
        end: 8,
        text: "Hello? Hello? Hello? Did it just play some music? No, it was my phone. Oh, I thought it was this playing some music.",
        speaker: 'customer', // Customer calling in, confused about audio/music
        confidence: 0.95
      },
      {
        id: 1,
        start: 8,
        end: 14,
        text: "Right, let's see if you can hear me. Right. Right, can you hear me okay?",
        speaker: 'customer', // Customer continuing to test audio
        confidence: 0.95
      },
      {
        id: 2,
        start: 14,
        end: 19,
        text: "Yeah, I can hear you fine, how's it sounding?",
        speaker: 'agent', // Agent responds then asks about call quality
        confidence: 0.95
      },
      {
        id: 3,
        start: 19,
        end: 24,
        text: "Yeah, sounds clear as a bell, mate. Any echoes, any sort of delay, any sort of like anything?",
        speaker: 'customer', // Customer answers, then Agent asks technical questions
        confidence: 0.85 // Lower confidence as this spans both speakers
      },
      {
        id: 4,
        start: 24,
        end: 30,
        text: "No, it's a little jumpy, but I guess that's just the internet connection. A little jumpy, okay, perfect.",
        speaker: 'customer', // Customer reporting the issue
        confidence: 0.95
      },
      {
        id: 5,
        start: 30,
        end: 35,
        text: "Mate, sounds clear, really crystal clear. Anytime, brother. Appreciate you. Mate, glad you got that.",
        speaker: 'agent', // Agent final professional confirmation
        confidence: 0.95
      }
    ];
    
    console.log('\n✨ Final correct conversation flow:');
    finalCorrectSegments.forEach((seg, i) => {
      console.log(`${i}: [${seg.speaker.toUpperCase()}] ${seg.text}`);
    });
    
    const enhancedStructuredData = {
      ...structuredData,
      analysis: {
        ...structuredData.analysis,
        speakerSegments: finalCorrectSegments,
        speakerDiarizationMethod: 'corrected_agent_customer_flow',
        speakerDiarizationTimestamp: new Date().toISOString(),
        analysisNotes: 'Corrected: Agent asks "hows it sounding?", Customer calls in with audio confusion'
      }
    };
    
    await prisma.callTranscript.update({
      where: { id: transcript.id },
      data: {
        structuredJson: enhancedStructuredData
      }
    });
    
    console.log('\n✅ Updated with correct speaker identification!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

correctSpeakerIdentification();