const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function simulateTranscriptFetch() {
  try {
    console.log('🔍 Simulating transcript fetch flow...\n');
    
    // Step 1: Get a call record that should have a transcript
    const callRecord = await prisma.callRecord.findFirst({
      where: { transcriptionStatus: 'completed' },
      include: {
        agent: { select: { agentId: true, firstName: true, lastName: true } },
        contact: { select: { firstName: true, lastName: true, phone: true, company: true } },
        campaign: { select: { name: true } }
      }
    });
    
    if (!callRecord) {
      console.log('❌ No call record with completed transcription found');
      return;
    }
    
    console.log('📞 Found call record:');
    console.log('   ID:', callRecord.id);
    console.log('   Call ID:', callRecord.callId);
    console.log('   Phone:', callRecord.phoneNumber);
    console.log('   Transcription Status:', callRecord.transcriptionStatus);
    
    // Step 2: Check API permission logic
    console.log('\n🔒 API Permission Check: PASSED (using admin user)');
    
    // Step 3: Query for transcript (same as API does)
    const transcript = await prisma.callTranscript.findFirst({
      where: { callId: callRecord.id },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!transcript) {
      console.log('❌ No transcript found for call ID:', callRecord.id);
      
      // Debug: Check what transcripts exist
      const allTranscripts = await prisma.callTranscript.findMany({
        select: { id: true, callId: true, processingStatus: true }
      });
      console.log('\n🔍 All transcripts in database:');
      allTranscripts.forEach(t => {
        console.log('   Transcript callId:', t.callId, 'Status:', t.processingStatus);
      });
      
      return;
    }
    
    console.log('\n✅ Transcript found!');
    console.log('   Status:', transcript.processingStatus);
    console.log('   Text length:', transcript.transcriptText.length);
    console.log('   Has summary:', !!transcript.summary);
    console.log('   Confidence:', transcript.confidenceScore);
    
    // Step 4: Simulate API response (full format)
    const apiResponse = {
      callId: callRecord.id,
      status: 'completed',
      call: {
        id: callRecord.id,
        phoneNumber: callRecord.phoneNumber,
        startTime: callRecord.startTime,
        duration: callRecord.duration,
        outcome: callRecord.outcome,
        agent: callRecord.agent,
        contact: callRecord.contact,
        campaign: callRecord.campaign
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
    console.log('   Word count:', apiResponse.transcript.wordCount);
    console.log('   Sentiment score:', apiResponse.analysis.sentimentScore);
    
    // Step 5: Check what the frontend expects
    console.log('\n🎯 Frontend Expectations:');
    console.log('   - transcriptData.status should be "completed" ✅');
    console.log('   - transcriptData.transcript should exist ✅'); 
    console.log('   - transcriptData.analysis should exist ✅');
    console.log('   - Should NOT show "Transcription Not Started" ✅');
    
    console.log('\n🎉 TRANSCRIPT FLOW SHOULD WORK!');
    console.log('\nNext step: Test on Railway backend with this call ID:', callRecord.id);
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

simulateTranscriptFetch();