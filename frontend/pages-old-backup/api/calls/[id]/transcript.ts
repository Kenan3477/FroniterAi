/**
 * API Route: Get Call Transcript
 * Fetches transcript data for a specific call
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { 
    db: { 
      url: process.env.DATABASE_URL || 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
    }
  }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // TODO: Add proper authentication back
  // const authHeader = req.headers.authorization;
  // const token = authHeader?.replace('Bearer ', '');
  // if (!token) {
  //   return res.status(401).json({ error: 'Authentication required' });
  // }

  const { id } = req.query;
  const format = req.query.format as string || 'full';

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Call ID is required' });
  }

  const callId = id;

  try {
    console.log(`📝 Fetching transcript for call: ${callId} (format: ${format})`);
    
    // First check if call exists
    const call = await prisma.callRecord.findUnique({
      where: { id: callId },
      select: {
        id: true,
        phoneNumber: true,
        duration: true,
        outcome: true
      }
    });

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    // Check if we have an enhanced transcript with proper speaker diarization
    const enhancedTranscript = await prisma.callTranscript.findFirst({
      where: {
        callId: callId,
        processingProvider: 'enhanced_whisper_gpt4'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (enhancedTranscript) {
      console.log('✅ Found enhanced transcript with proper speaker diarization');
      const structuredData = typeof enhancedTranscript.structuredJson === 'string' 
        ? JSON.parse(enhancedTranscript.structuredJson) 
        : enhancedTranscript.structuredJson;
      
      const response = {
        callId: callId,
        status: 'completed',
        phone: call.phoneNumber,
        duration: call.duration,
        outcome: call.outcome,
        transcript: {
          id: enhancedTranscript.id,
          text: enhancedTranscript.transcriptText,
          segments: structuredData?.analysis?.speakerSegments || [],
          wordCount: enhancedTranscript.wordCount,
          confidence: enhancedTranscript.confidenceScore,
          processingProvider: 'enhanced_whisper_gpt4'
        },
        analysis: {
          summary: enhancedTranscript.summary,
          sentimentScore: enhancedTranscript.sentimentScore,
          callOutcome: enhancedTranscript.callOutcomeClassification,
          keyObjections: structuredData?.analysis?.keyPoints || [],
          complianceFlags: []
        },
        analytics: {
          agentTalkRatio: enhancedTranscript.agentTalkRatio || 0.5,
          customerTalkRatio: enhancedTranscript.customerTalkRatio || 0.5,
          longestMonologue: structuredData?.analysis?.analytics?.longestMonologue || 0,
          silenceDuration: 0,
          interruptions: structuredData?.analysis?.analytics?.interruptions || 0,
          scriptAdherence: 0
        },
        metadata: {
          processingTime: structuredData?.processing?.timestamp,
          processingCost: 0,
          processingDate: enhancedTranscript.createdAt,
          provider: 'enhanced_whisper_gpt4'
        }
      };
      
      return res.status(200).json(response);
    }

    // Fetch transcript from call_transcripts table using raw SQL (like the whisper script)
    const transcripts = await prisma.$queryRaw`
      SELECT id, "callId", "transcriptText", summary, "sentimentScore", "confidenceScore", 
             "wordCount", "callOutcomeClassification", "processingProvider", "processingTimeMs", 
             "processingCost", "structuredJson", "createdAt", "updatedAt"
      FROM call_transcripts 
      WHERE "callId" = ${callId}
      ORDER BY "createdAt" DESC 
      LIMIT 1
    ` as any[];

    if (!transcripts || transcripts.length === 0) {
      return res.status(404).json({ 
        error: 'No transcript found for this call',
        callId: callId,
        status: 'not_found'
      });
    }

    const transcript = transcripts[0];

    // Parse structured JSON data
    let structuredData;
    try {
      structuredData = typeof transcript.structuredJson === 'string' 
        ? JSON.parse(transcript.structuredJson) 
        : transcript.structuredJson;
    } catch (e) {
      structuredData = {};
    }

    // Process segments for speaker diarization
    const rawSegments = structuredData?.whisperResult?.segments || [];
    let processedSegments = [];
    
    if (rawSegments.length > 0) {
      // Check if enhanced speaker diarization exists
      if (structuredData?.analysis?.speakerSegments) {
        // Use GPT-enhanced speaker segments
        processedSegments = structuredData.analysis.speakerSegments;
        console.log('✅ Using GPT-enhanced speaker diarization');
      } else {
        // Fallback: Apply simple speaker alternation
        processedSegments = rawSegments.map((segment: any, index: number) => ({
          id: segment.id || index,
          start: segment.start,
          end: segment.end,
          text: segment.text.trim(),
          speaker: index % 2 === 0 ? 'agent' : 'customer', // Simple alternation
          confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : 0.9
        }));
        console.log('⚠️ Using fallback speaker alternation');
      }
    } else {
      // If no segments, create a single segment with the full text
      processedSegments = [{
        id: 0,
        start: 0,
        end: call?.duration || 30,
        text: transcript.transcriptText,
        speaker: 'agent', // Default to agent for single segment
        confidence: 0.9
      }];
    }

    // Format response to match frontend expectations
    const response = {
      callId: callId,
      status: 'completed',
      phone: call.phoneNumber,
      duration: call.duration,
      outcome: call.outcome,
      // Main transcript data with segments for speaker diarization
      transcript: {
        id: transcript.id,
        text: transcript.transcriptText,
        segments: processedSegments, // Use processed segments with speaker labels
        wordCount: transcript.wordCount,
        confidence: transcript.confidenceScore,
        processingProvider: transcript.processingProvider || 'openai_whisper_gpt'
      },
      // Analysis data for Summary tab
      analysis: {
        summary: transcript.summary,
        sentimentScore: transcript.sentimentScore,
        callOutcome: transcript.callOutcomeClassification,
        keyObjections: structuredData.analysis?.keyObjections || [],
        complianceFlags: structuredData.analysis?.complianceFlags || []
      },
      // Analytics data for Analytics tab
      analytics: {
        agentTalkRatio: transcript.agentTalkRatio || 0.5,
        customerTalkRatio: transcript.customerTalkRatio || 0.5,
        longestMonologue: transcript.longestMonologueSeconds || 0,
        silenceDuration: transcript.silenceDurationSeconds || 0,
        interruptions: transcript.interruptionsCount || 0,
        scriptAdherence: structuredData.analytics?.scriptAdherence || 0
      },
      // Metadata
      metadata: {
        processingTime: transcript.processingTimeMs,
        processingCost: transcript.processingCost,
        processingDate: transcript.createdAt,
        provider: transcript.processingProvider
      }
    };

    if (format === 'summary') {
      // Return only summary data
      return res.status(200).json({
        ...response,
        transcript: response.transcript,
        analysis: response.analysis
      });
    } else if (format === 'analytics') {
      // Return analytics data
      return res.status(200).json({
        ...response,
        transcript: response.transcript,
        analytics: response.analytics,
        metadata: response.metadata
      });
    }

    // Return full transcript
    console.log('✅ Transcript loaded successfully:', response.status);
    return res.status(200).json(response);

  } catch (error: any) {
    console.error('❌ Error fetching transcript:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch transcript',
      details: error.message,
      callId: callId
    });
  } finally {
    await prisma.$disconnect();
  }
}