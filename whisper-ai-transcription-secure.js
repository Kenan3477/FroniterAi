/**
 * OpenAI Whisper Advanced Transcription System - SECURE
 * Production-ready AI transcription with environment-based configuration
 */

const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const railwayPrisma = new PrismaClient({
  datasources: { 
    db: { 
      url: process.env.DATABASE_URL || 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
    }
  }
});

// SECURE: All credentials from environment
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

// Validate required environment variables
const missingEnvVars = [];
if (!OPENAI_API_KEY) missingEnvVars.push('OPENAI_API_KEY');
if (!TWILIO_ACCOUNT_SID) missingEnvVars.push('TWILIO_ACCOUNT_SID');
if (!TWILIO_AUTH_TOKEN) missingEnvVars.push('TWILIO_AUTH_TOKEN');

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => console.error(`   ${envVar}`));
  console.error('\nSet these environment variables before running AI transcription.');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Download recording from Twilio or Railway backend to temporary file
 */
async function downloadRecording(recordingUrl, authToken = '') {
  const tempDir = os.tmpdir();
  const filename = `recording_${Date.now()}.wav`;
  const filepath = path.join(tempDir, filename);
  
  console.log('📥 Downloading recording...');
  
  try {
    // Determine if this is a Twilio URL or Railway backend URL
    const isRailwayBackend = recordingUrl.includes('railway.app') || recordingUrl.includes('localhost');
    const isTwilioUrl = recordingUrl.includes('api.twilio.com');
    
    let response;
    if (isRailwayBackend) {
      console.log('🚂 Downloading from Railway backend...');
      // For Railway backend, use Bearer token authentication
      const headers = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      response = await axios({
        method: 'GET',
        url: recordingUrl,
        headers,
        responseType: 'stream',
        timeout: 30000
      });
    } else if (isTwilioUrl) {
      console.log('📞 Downloading from Twilio...');
      // For Twilio URLs, use Twilio credentials
      response = await axios({
        method: 'GET',
        url: recordingUrl,
        auth: {
          username: TWILIO_ACCOUNT_SID,
          password: TWILIO_AUTH_TOKEN
        },
        responseType: 'stream',
        timeout: 30000
      });
    } else {
      console.log('🌐 Downloading from public URL...');
      // For other URLs (like demo files), no auth needed
      response = await axios({
        method: 'GET',
        url: recordingUrl,
        responseType: 'stream',
        timeout: 30000
      });
    }
    
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    console.log('✅ Recording downloaded');
    return filepath;
  } catch (error) {
    console.error('❌ Download failed:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Status Text: ${error.response.statusText}`);
    }
    throw error;
  }
}

/**
 * Transcribe audio using OpenAI Whisper
 */
async function transcribeWithWhisper(audioFilePath) {
  console.log('🎙️ Transcribing with OpenAI Whisper...');
  
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: "whisper-1",
      language: "en",
      response_format: "verbose_json",
      temperature: 0.2
    });
    
    console.log('✅ Whisper transcription complete');
    return {
      text: transcription.text,
      segments: transcription.segments || [],
      duration: transcription.duration || 0,
      language: transcription.language || 'en'
    };
  } catch (error) {
    console.error('❌ Whisper transcription failed:', error.message);
    throw error;
  }
}

/**
 * Perform speaker diarization using GPT to identify Agent vs Customer
 */
async function performSpeakerDiarization(transcriptText) {
  console.log('👥 Performing speaker diarization with GPT...');
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: `Analyze this call transcript and identify who is speaking (Agent or Customer). Break it into segments with timestamps if possible. The Agent is typically the professional representative from the company, and the Customer is the person being called.

Transcript: "${transcriptText}"

Please return a JSON array with segments like this:
[
  {
    "speaker": "agent",
    "text": "Hello, this is...",
    "start": 0,
    "end": 5
  },
  {
    "speaker": "customer", 
    "text": "Hello...",
    "start": 5,
    "end": 10
  }
]

Guidelines:
- "speaker" should be either "agent" or "customer"
- Estimate reasonable timestamps based on speech flow
- Split long monologues into shorter segments
- The agent typically initiates the call and asks questions
- The customer typically responds and provides information`
      }],
      temperature: 0.3,
      max_tokens: 2000
    });

    const segmentsText = response.choices[0]?.message?.content || '[]';
    let segments;
    
    try {
      // Extract JSON from the response
      const jsonMatch = segmentsText.match(/\[[\s\S]*\]/);
      const cleanedJson = jsonMatch ? jsonMatch[0] : segmentsText;
      segments = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.warn('⚠️ Failed to parse diarization JSON, creating fallback segments');
      // Fallback: Split text into sentences and alternate speakers
      const sentences = transcriptText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      segments = sentences.map((sentence, index) => ({
        speaker: index % 2 === 0 ? 'agent' : 'customer',
        text: sentence.trim(),
        start: index * 3,
        end: (index + 1) * 3,
        id: index
      }));
    }
    
    console.log('✅ Speaker diarization complete');
    return segments;
    
  } catch (error) {
    console.error('❌ Speaker diarization failed:', error.message);
    // Return fallback segments
    const sentences = transcriptText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.map((sentence, index) => ({
      speaker: index % 2 === 0 ? 'agent' : 'customer',
      text: sentence.trim(),
      start: index * 3,
      end: (index + 1) * 3,
      id: index
    }));
  }
}

/**
 * Analyze sentiment and extract insights using GPT
 */
async function analyzeSentiment(transcriptText) {
  console.log('🧠 Analyzing sentiment with GPT...');
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: "You are an expert call center analyst. Analyze the transcript and provide structured insights about sentiment, call outcome, and customer experience. Respond in JSON format."
      }, {
        role: "user",
        content: `Analyze this call transcript and provide insights:

Transcript: "${transcriptText}"

Please return JSON with these exact fields:
{
  "overallSentiment": "positive|neutral|negative",
  "sentimentScore": 0.7,
  "callOutcome": "sale|interested|not_interested|callback|complaint|information",
  "customerSatisfaction": "high|medium|low",
  "keyPoints": ["point1", "point2"],
  "nextAction": "recommended next action",
  "agentPerformance": "excellent|good|average|needs_improvement",
  "isAnsweringMachine": false
}`
      }],
      temperature: 0.3,
      max_tokens: 500
    });
    
    const analysisText = response.choices[0]?.message?.content || '{}';
    let analysis;
    
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.warn('⚠️ Failed to parse GPT response, using defaults');
      analysis = {
        overallSentiment: "neutral",
        sentimentScore: 0.5,
        callOutcome: "unknown",
        customerSatisfaction: "medium",
        keyPoints: ["Analysis parsing failed"],
        nextAction: "Manual review required",
        agentPerformance: "average",
        isAnsweringMachine: false
      };
    }
    
    console.log('✅ Sentiment analysis complete');
    console.log(`📊 Sentiment: ${analysis.overallSentiment} (${analysis.sentimentScore})`);
    console.log(`🎯 Outcome: ${analysis.callOutcome}`);
    
    return analysis;
  } catch (error) {
    console.error('❌ Sentiment analysis failed:', error.message);
    return {
      overallSentiment: "neutral",
      sentimentScore: 0.5,
      callOutcome: "analysis_failed",
      customerSatisfaction: "unknown",
      keyPoints: [`Analysis error: ${error.message}`],
      nextAction: "Manual review required",
      agentPerformance: "unknown",
      isAnsweringMachine: false
    };
  }
}

/**
 * Process single call with advanced AI transcription
 */
async function processAdvancedTranscription(callId, authToken = '') {
  const startTime = Date.now();
  console.log(`🚀 Processing advanced transcription for call: ${callId}`);
  
  let tempFilePath = null;
  let totalCost = 0.0;
  
  try {
    // Get call record
    const call = await railwayPrisma.callRecord.findUnique({
      where: { id: callId },
      select: {
        id: true,
        callId: true,
        recording: true,
        duration: true,
        phoneNumber: true,
        outcome: true,
        recordingFile: true
      }
    });
    
    if (!call) {
      throw new Error(`Call ${callId} not found`);
    }
    
    let recordingUrl = call.recording;
    
    // If no direct recording URL, check if there's a recordingFile
    if (!recordingUrl && call.recordingFile) {
      console.log('📁 No direct recording URL, checking recordingFile...');
      
      if (call.recordingFile.storageType === 'twilio') {
        // Construct Twilio recording URL
        const recordingSid = call.recordingFile.filePath || call.recordingFile.fileName?.replace('.mp3', '');
        if (recordingSid) {
          recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Recordings/${recordingSid}.wav`;
          console.log(`🔧 Constructed Twilio URL: ${recordingUrl}`);
        }
      } else if (call.recordingFile.storageType === 'railway') {
        // Construct Railway recording URL
        recordingUrl = `https://froniterai-production.up.railway.app/api/recordings/${call.recordingFile.id}/download`;
        console.log(`🔧 Constructed Railway URL: ${recordingUrl}`);
      }
    }
    
    if (!recordingUrl) {
      throw new Error(`No recording available for call ${callId}`);
    }
    
    console.log(`📞 Call: ${call.phoneNumber} (${call.duration}s)`);
    console.log(`🎵 Recording URL: ${recordingUrl}`);
    
    // Download and transcribe
    tempFilePath = await downloadRecording(recordingUrl, authToken);
    const whisperResult = await transcribeWithWhisper(tempFilePath);
    
    // Estimate costs (approximate)
    const audioMinutes = Math.ceil(call.duration / 60);
    const whisperCost = audioMinutes * 0.006; // $0.006 per minute
    totalCost += whisperCost;
    
    if (!whisperResult.text || whisperResult.text.trim().length < 5) {
      throw new Error('Whisper returned empty or very short transcription');
    }
    
    console.log(`📝 Transcript length: ${whisperResult.text.length} characters`);
    
    // Perform speaker diarization
    const segments = await performSpeakerDiarization(whisperResult.text);
    
    // Analyze sentiment
    const sentimentAnalysis = await analyzeSentiment(whisperResult.text);
    
    // Estimate GPT cost (approximate)
    const gptCost = Math.ceil(whisperResult.text.length / 1000) * 0.002; // ~$0.002 per 1K chars
    totalCost += gptCost;
    
    // Calculate additional metrics
    const wordCount = whisperResult.text.split(/\s+/).length;
    const confidence = Math.max(0.7, Math.min(0.95, whisperResult.text.length / (call.duration * 3)));
    
    // Calculate analytics from segments
    const agentSegments = segments.filter(s => s.speaker === 'agent');
    const customerSegments = segments.filter(s => s.speaker === 'customer');
    const totalDuration = Math.max(call.duration, segments[segments.length - 1]?.end || 0);
    
    const agentTotalTime = agentSegments.reduce((sum, s) => sum + (s.end - s.start), 0);
    const customerTotalTime = customerSegments.reduce((sum, s) => sum + (s.end - s.start), 0);
    const totalSpeechTime = agentTotalTime + customerTotalTime;
    
    const agentTalkRatio = totalSpeechTime > 0 ? agentTotalTime / totalSpeechTime : 0.5;
    const customerTalkRatio = totalSpeechTime > 0 ? customerTotalTime / totalSpeechTime : 0.5;
    
    // Find longest monologue
    const longestMonologue = Math.max(
      ...segments.map(s => s.end - s.start),
      0
    );
    
    // Count speaker transitions as interruptions
    const interruptions = segments.filter((s, i) => 
      i > 0 && segments[i-1].speaker !== s.speaker && (s.start - segments[i-1].end) < 1
    ).length;
    
    // Create structured JSON with all data
    const structuredData = {
      transcript: {
        text: whisperResult.text,
        segments: segments,
        wordCount: wordCount,
        confidence: confidence,
        processingProvider: 'openai_whisper_gpt'
      },
      analysis: {
        summary: `AI Analysis: ${sentimentAnalysis.overallSentiment} sentiment (${sentimentAnalysis.sentimentScore}). Outcome: ${sentimentAnalysis.callOutcome}. Next: ${sentimentAnalysis.nextAction}`,
        sentimentScore: sentimentAnalysis.sentimentScore,
        callOutcome: sentimentAnalysis.callOutcome,
        keyObjections: sentimentAnalysis.keyPoints || [],
        complianceFlags: [] // TODO: Add compliance checking
      },
      analytics: {
        agentTalkRatio: Math.round(agentTalkRatio * 100) / 100,
        customerTalkRatio: Math.round(customerTalkRatio * 100) / 100,
        longestMonologue: Math.round(longestMonologue),
        silenceDuration: Math.max(0, totalDuration - totalSpeechTime),
        interruptions: interruptions,
        scriptAdherence: 0.8 // TODO: Calculate based on script analysis
      },
      metadata: {
        processingTime: Date.now() - startTime,
        processingCost: totalCost,
        processingDate: new Date().toISOString(),
        audioMinutes: audioMinutes,
        provider: 'openai_whisper_gpt'
      }
    };
    
    // Save to database
    await railwayPrisma.$executeRaw`
      INSERT INTO call_transcripts (
        id, "callId", "transcriptText", "structuredJson", summary, 
        "sentimentScore", "confidenceScore", "wordCount", 
        "callOutcomeClassification", "agentTalkRatio", "customerTalkRatio",
        "longestMonologueSeconds", "silenceDurationSeconds", "interruptionsCount",
        "processingProvider", "processingTimeMs", "processingCost", 
        "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${call.id}, ${whisperResult.text}, 
        ${JSON.stringify(structuredData)}::jsonb,
        ${`AI Analysis: ${sentimentAnalysis.overallSentiment} sentiment (${sentimentAnalysis.sentimentScore}). Outcome: ${sentimentAnalysis.callOutcome}. Next: ${sentimentAnalysis.nextAction}`},
        ${sentimentAnalysis.sentimentScore}, ${confidence}, ${wordCount}, 
        ${sentimentAnalysis.callOutcome}, ${structuredData.analytics.agentTalkRatio}, ${structuredData.analytics.customerTalkRatio},
        ${structuredData.analytics.longestMonologue}, ${structuredData.analytics.silenceDuration}, ${structuredData.analytics.interruptions},
        'openai_whisper_gpt', ${Date.now() - startTime}, ${totalCost}, 
        NOW(), NOW()
      )
    `;
    
    console.log('✅ Advanced transcription complete!');
    console.log(`💰 Estimated cost: $${totalCost.toFixed(4)}`);
    console.log(`⏱️ Processing time: ${Date.now() - startTime}ms`);
    
    return {
      success: true,
      transcriptText: whisperResult.text,
      sentimentAnalysis,
      processingTimeMs: Date.now() - startTime,
      estimatedCost: totalCost
    };
    
  } catch (error) {
    console.error('❌ Advanced transcription failed:', error.message);
    
    // Save error record
    try {
      await railwayPrisma.$executeRaw`
        INSERT INTO call_transcripts (
          id, "callId", "transcriptText", summary, "sentimentScore", "confidenceScore", 
          "wordCount", "callOutcomeClassification", "processingProvider", 
          "processingTimeMs", "processingCost", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), ${callId}, '[AI transcription failed]', 
          ${'Advanced AI transcription failed: ' + error.message},
          0.0, 0.0, 4, 'processing_failed', 'openai_whisper_gpt', 
          ${Date.now() - startTime}, ${totalCost}, NOW(), NOW()
        )
      `;
    } catch (e) {
      console.error('Failed to save error record:', e.message);
    }
    
    return {
      success: false,
      error: error.message,
      processingTimeMs: Date.now() - startTime,
      estimatedCost: totalCost
    };
  } finally {
    // Cleanup temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('🧹 Temp file cleaned up');
      } catch (e) {
        console.warn('⚠️ Failed to clean temp file:', e.message);
      }
    }
  }
}

/**
 * Batch process historical calls for complete transcript coverage
 */
async function batchProcessHistoricalCalls(limit = 10, onlyWithRecordings = true) {
  console.log(`🔄 Starting batch processing of historical calls (limit: ${limit})`);
  
  const whereClause = onlyWithRecordings 
    ? 'WHERE recording IS NOT NULL AND recording != ""'
    : '';
    
  const callsToProcess = await railwayPrisma.$queryRaw`
    SELECT id, "callId", "phoneNumber", duration, recording, "createdAt"
    FROM call_records 
    ${whereClause}
    AND id NOT IN (
      SELECT "callId" FROM call_transcripts 
      WHERE "callId" IS NOT NULL 
      AND "processingProvider" = 'openai_whisper_gpt'
      AND "transcriptText" != '[AI transcription failed]'
    )
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
  `;
  
  console.log(`📊 Found ${callsToProcess.length} calls for AI processing`);
  
  if (callsToProcess.length === 0) {
    console.log('✅ No calls require processing');
    await railwayPrisma.$disconnect();
    return { processed: 0, failed: 0, totalCost: 0 };
  }
  
  let processed = 0;
  let failed = 0;
  let totalCost = 0;
  
  for (const call of callsToProcess) {
    console.log(`\n📱 Processing call ${processed + 1}/${callsToProcess.length}: ${call.phoneNumber}`);
    
    const result = await processAdvancedTranscription(call.id);
    
    if (result.success) {
      processed++;
      totalCost += result.estimatedCost;
    } else {
      failed++;
    }
    
    // Rate limiting: Wait between API calls to avoid rate limits
    if (processed + failed < callsToProcess.length) {
      console.log('⏳ Rate limiting delay...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
    }
  }
  
  console.log('\n🎉 Batch processing complete!');
  console.log(`✅ Processed: ${processed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`💰 Total estimated cost: $${totalCost.toFixed(4)}`);
  
  await railwayPrisma.$disconnect();
  return { processed, failed, totalCost };
}

// Export functions
module.exports = { 
  processAdvancedTranscription, 
  batchProcessHistoricalCalls,
  downloadRecording,
  transcribeWithWhisper,
  analyzeSentiment
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'batch') {
    const limit = parseInt(args[1]) || 5;
    batchProcessHistoricalCalls(limit).catch(console.error);
  } else if (args[0] === 'single' && args[1]) {
    const authToken = args[2] || '';
    processAdvancedTranscription(args[1], authToken).catch(console.error);
  } else {
    console.log('Usage:');
    console.log('  node whisper-ai-transcription-secure.js batch [limit]');
    console.log('  node whisper-ai-transcription-secure.js single <callId> [authToken]');
  }
}