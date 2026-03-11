const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function testTranscriptEndpoint() {
  try {
    console.log('🧪 Testing transcript API endpoint...\n');
    
    // Get a call with completed transcription
    const callWithTranscript = await prisma.callRecord.findFirst({
      where: { transcriptionStatus: 'completed' },
      select: { id: true, callId: true }
    });
    
    if (!callWithTranscript) {
      console.log('❌ No calls with completed transcription found');
      return;
    }
    
    console.log('📞 Testing with call database ID:', callWithTranscript.id);
    console.log('📞 Twilio Call ID:', callWithTranscript.callId);
    
    // Check if transcript exists for this call ID
    const transcript = await prisma.callTranscript.findFirst({
      where: { callId: callWithTranscript.id }
    });
    
    if (transcript) {
      console.log('✅ Transcript found in database');
      console.log('   Status:', transcript.processingStatus);
      console.log('   Text preview:', transcript.transcriptText.substring(0, 100) + '...');
      
      // Simulate the API endpoint response
      const apiResponse = {
        callId: callWithTranscript.id,
        status: 'completed',
        transcript: {
          text: transcript.transcriptText,
          summary: transcript.summary,
          segments: [], // Would be populated in full system
          analysis: {
            sentiment: transcript.sentimentScore,
            confidence: transcript.confidenceScore,
            wordCount: transcript.wordCount,
            agentTalkRatio: transcript.agentTalkRatio,
            customerTalkRatio: transcript.customerTalkRatio
          }
        },
        metadata: {
          processingTime: transcript.processingTimeMs,
          processingCost: transcript.processingCost,
          processingDate: transcript.createdAt
        }
      };
      
      console.log('\n📋 Expected API Response:');
      console.log('   Status:', apiResponse.status);
      console.log('   Has transcript text:', !!apiResponse.transcript.text);
      console.log('   Sentiment score:', apiResponse.transcript.analysis.sentiment);
      console.log('   Word count:', apiResponse.transcript.analysis.wordCount);
      
    } else {
      console.log('❌ No transcript found for call ID:', callWithTranscript.id);
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTranscriptEndpoint();