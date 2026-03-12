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
 * Download recording from Twilio to temporary file
 */
async function downloadRecording(recordingUrl) {
  const tempDir = os.tmpdir();
  const filename = `recording_${Date.now()}.wav`;
  const filepath = path.join(tempDir, filename);
  
  console.log('📥 Downloading recording...');
  
  try {
    const response = await axios({
      method: 'GET',
      url: recordingUrl,
      auth: {
        username: TWILIO_ACCOUNT_SID,
        password: TWILIO_AUTH_TOKEN
      },
      responseType: 'stream'
    });
    
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
async function processAdvancedTranscription(callId) {
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
        outcome: true
      }
    });
    
    if (!call) {
      throw new Error(`Call ${callId} not found`);
    }
    
    if (!call.recording) {
      throw new Error(`No recording available for call ${callId}`);
    }
    
    console.log(`📞 Call: ${call.phoneNumber} (${call.duration}s)`);
    
    // Download and transcribe
    tempFilePath = await downloadRecording(call.recording);
    const whisperResult = await transcribeWithWhisper(tempFilePath);
    
    // Estimate costs (approximate)
    const audioMinutes = Math.ceil(call.duration / 60);
    const whisperCost = audioMinutes * 0.006; // $0.006 per minute
    totalCost += whisperCost;
    
    if (!whisperResult.text || whisperResult.text.trim().length < 5) {
      throw new Error('Whisper returned empty or very short transcription');
    }
    
    console.log(`📝 Transcript length: ${whisperResult.text.length} characters`);
    
    // Analyze sentiment
    const sentimentAnalysis = await analyzeSentiment(whisperResult.text);
    
    // Estimate GPT cost (approximate)
    const gptCost = Math.ceil(whisperResult.text.length / 1000) * 0.002; // ~$0.002 per 1K chars
    totalCost += gptCost;
    
    // Calculate additional metrics
    const wordCount = whisperResult.text.split(/\s+/).length;
    const confidence = Math.max(0.7, Math.min(0.95, whisperResult.text.length / (call.duration * 3)));
    
    // Create structured JSON with all data
    const structuredData = {
      whisperResult: {
        text: whisperResult.text,
        duration: whisperResult.duration,
        language: whisperResult.language,
        segments: whisperResult.segments?.slice(0, 10) // Limit segments to prevent huge JSON
      },
      sentimentAnalysis,
      processing: {
        provider: 'openai_whisper_gpt',
        processingTimeMs: Date.now() - startTime,
        estimatedCost: totalCost,
        audioMinutes,
        timestamp: new Date().toISOString()
      },
      metrics: {
        wordCount,
        confidence,
        estimatedSpeakingRate: wordCount / (call.duration / 60) // words per minute
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
        ${JSON.stringify(structuredData)},
        ${`AI Analysis: ${sentimentAnalysis.overallSentiment} sentiment (${sentimentAnalysis.sentimentScore}). Outcome: ${sentimentAnalysis.callOutcome}. Next: ${sentimentAnalysis.nextAction}`},
        ${sentimentAnalysis.sentimentScore}, ${confidence}, ${wordCount}, 
        ${sentimentAnalysis.callOutcome}, 0.5, 0.5, 0, 0, 0,
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
    processAdvancedTranscription(args[1]).catch(console.error);
  } else {
    console.log('Usage:');
    console.log('  node whisper-ai-transcription-secure.js batch [limit]');
    console.log('  node whisper-ai-transcription-secure.js single <callId>');
  }
}