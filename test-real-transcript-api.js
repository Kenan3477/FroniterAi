const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './backend/.env' });

const prisma = new PrismaClient();

async function testRealTranscriptAPI() {
  try {
    console.log('🧪 Testing Real Transcript API Flow...\n');
    
    // Get a call with completed transcription
    const callWithTranscript = await prisma.callRecord.findFirst({
      where: { transcriptionStatus: 'completed' },
      include: {
        agent: { select: { agentId: true, firstName: true, lastName: true } },
        contact: { select: { firstName: true, lastName: true, phone: true, company: true } },
        campaign: { select: { name: true } }
      }
    });
    
    if (!callWithTranscript) {
      console.log('❌ No calls with completed transcription found');
      return;
    }
    
    console.log('📞 Found call record:');
    console.log('   ID:', callWithTranscript.id);
    console.log('   Call ID:', callWithTranscript.callId);
    console.log('   Phone:', callWithTranscript.phoneNumber);
    console.log('   Transcription Status:', callWithTranscript.transcriptionStatus);
    
    // Get the transcript data (same query as API)
    const transcript = await prisma.callTranscript.findFirst({
      where: { callId: callWithTranscript.id },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!transcript) {
      console.log('❌ No transcript found for call ID:', callWithTranscript.id);
      
      // Debug: show all transcripts
      const allTranscripts = await prisma.callTranscript.findMany({
        select: { id: true, callId: true, processingStatus: true }
      });
      console.log('\n🔍 All transcripts in database:');
      allTranscripts.forEach(t => {
        console.log('   Transcript for callId:', t.callId, 'Status:', t.processingStatus);
      });
      
      return;
    }
    
    console.log('\n✅ Real transcript found!');
    console.log('   Status:', transcript.processingStatus);
    console.log('   Text preview:', transcript.transcriptText.substring(0, 100) + '...');
    console.log('   Summary:', transcript.summary);
    console.log('   Confidence:', transcript.confidenceScore);
    console.log('   Word count:', transcript.wordCount);
    console.log('   Processing provider:', transcript.processingProvider);
    
    // Simulate complete API response
    const apiResponse = {
      callId: callWithTranscript.id,
      status: 'completed',
      call: {
        id: callWithTranscript.id,
        phoneNumber: callWithTranscript.phoneNumber,
        startTime: callWithTranscript.startTime,
        duration: callWithTranscript.duration,
        outcome: callWithTranscript.outcome,
        agent: callWithTranscript.agent,
        contact: callWithTranscript.contact,
        campaign: callWithTranscript.campaign
      },
      transcript: {
        text: transcript.transcriptText,
        segments: [],
        confidence: transcript.confidenceScore,
        language: 'en',
        wordCount: transcript.wordCount,
        processingProvider: transcript.processingProvider
      },
      analysis: {
        summary: transcript.summary,
        sentimentScore: transcript.sentimentScore,
        complianceFlags: transcript.complianceFlags,
        keyObjections: transcript.keyObjections,
        callOutcome: transcript.callOutcomeClassification
      },
      analytics: {
        agentTalkRatio: transcript.agentTalkRatio,
        customerTalkRatio: transcript.customerTalkRatio,
        longestMonologue: transcript.longestMonologueSeconds,
        silenceDuration: transcript.silenceDurationSeconds,
        interruptions: transcript.interruptionsCount,
        scriptAdherence: transcript.scriptAdherenceScore
      }
    };
    
    console.log('\n📋 API Response Structure:');
    console.log('   Status:', apiResponse.status);
    console.log('   Has call info:', !!apiResponse.call);
    console.log('   Has transcript text:', !!apiResponse.transcript.text);
    console.log('   Has analysis:', !!apiResponse.analysis);
    console.log('   Has analytics:', !!apiResponse.analytics);
    
    console.log('\n🎉 REAL TRANSCRIPT API FLOW COMPLETE!');
    console.log('\nTest call ID for manual testing:', callWithTranscript.id);
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

testRealTranscriptAPI();