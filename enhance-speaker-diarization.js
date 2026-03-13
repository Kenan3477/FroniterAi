// Load environment variables from .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');

console.log('🔑 OpenAI API Key loaded:', process.env.OPENAI_API_KEY ? 'YES' : 'NO');
console.log('🔑 Key prefix:', process.env.OPENAI_API_KEY?.substring(0, 10) || 'MISSING');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function enhanceSpeakerDiarization() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🎯 Enhancing speaker diarization for existing transcripts...\n');
    
    // Get transcripts that need speaker diarization
    const transcripts = await prisma.callTranscript.findMany({
      where: {
        callId: 'cmlp65bce000amhihg98wkc0e'
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    
    for (const transcript of transcripts) {
      if (!transcript.structuredJson) continue;
      
      const structuredData = typeof transcript.structuredJson === 'string' 
        ? JSON.parse(transcript.structuredJson) 
        : transcript.structuredJson;
      
      const segments = structuredData?.whisperResult?.segments || [];
      if (segments.length === 0) continue;
      
      console.log(`🔄 Processing transcript: ${transcript.id}`);
      console.log(`📝 Original segments: ${segments.length}`);
      
      // Use GPT to identify speakers
      const fullText = segments.map(s => s.text).join(' ');
      
      const speakerPrompt = `
You are analyzing a business phone call transcript between an AGENT (company representative) and a CUSTOMER.

Context: This appears to be a call quality test or technical support call where someone is checking audio quality.

Full transcript: "${fullText}"

Segments to analyze:
${segments.map((seg, i) => `${i}: "${seg.text.trim()}"`).join('\n')}

Rules for identification:
- The person asking "Hello? Hello?" and checking if music is playing is likely the CUSTOMER
- The person asking "can you hear me?" and "how's it sounding?" could be either, but context matters
- Professional responses like "sounds clear as a bell, mate" suggest AGENT
- Technical troubleshooting language often comes from AGENT
- Casual responses like "yeah" and "okay" could be either

Looking at this conversation flow:
- Someone is calling and hearing music/confusion = CUSTOMER
- Someone is testing audio quality professionally = AGENT  
- The conversation seems to be: Customer calls → Agent responds → back and forth testing

For each segment number, respond with only "agent" or "customer":
0: customer
1: agent
etc.
`;

      try {
        const gptResponse = await openai.chat.completions.create({
          model: 'gpt-4', // Using GPT-4 for better analysis
          messages: [{
            role: 'user',
            content: speakerPrompt
          }],
          temperature: 0.1,
          max_tokens: 200
        });
        
        const speakerAssignments = gptResponse.choices[0].message.content;
        console.log('🤖 GPT Speaker Analysis:');
        console.log(speakerAssignments);
        
        // Parse GPT response to extract speaker assignments
        const speakerMap = {};
        const lines = speakerAssignments.split('\n');
        for (const line of lines) {
          const match = line.match(/(\d+):\s*(agent|customer)/i);
          if (match) {
            speakerMap[parseInt(match[1])] = match[2].toLowerCase();
          }
        }
        
        // Create enhanced segments with speaker identification
        const enhancedSegments = segments.map((segment, index) => ({
          id: segment.id || index,
          start: segment.start,
          end: segment.end,
          text: segment.text.trim(),
          speaker: speakerMap[index] || (index % 2 === 0 ? 'agent' : 'customer'),
          confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : 0.9
        }));
        
        console.log('✨ Enhanced segments:');
        enhancedSegments.forEach((seg, i) => {
          console.log(`${i}: [${seg.speaker.toUpperCase()}] ${seg.text}`);
        });
        
        // Update the structured data with speaker segments
        const enhancedStructuredData = {
          ...structuredData,
          analysis: {
            ...structuredData.analysis,
            speakerSegments: enhancedSegments,
            speakerDiarizationMethod: 'gpt_analysis',
            speakerDiarizationTimestamp: new Date().toISOString()
          }
        };
        
        // Update the transcript in database
        await prisma.callTranscript.update({
          where: { id: transcript.id },
          data: {
            structuredJson: enhancedStructuredData
          }
        });
        
        console.log('✅ Updated transcript with speaker diarization');
        
      } catch (error) {
        console.error('❌ GPT speaker analysis failed:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enhanceSpeakerDiarization();