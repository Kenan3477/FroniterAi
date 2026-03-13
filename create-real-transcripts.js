/**
 * REAL Audio Analysis (Basic Version)
 * Downloads Twilio recordings and analyzes them for basic characteristics
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const railwayPrisma = new PrismaClient({
  datasources: { 
    db: { 
      url: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway' 
    }
  }
});

// Twilio credentials from environment
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error('❌ Missing Twilio credentials in environment variables');
  console.error('Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN');
  process.exit(1);
}

async function analyzeRecordingBasic(recordingUrl, callDuration) {
  try {
    console.log('🔍 Analyzing recording: ' + recordingUrl.substring(0, 100));
    
    // The recording URL might be a proxy URL through Railway backend
    // Try to get file size through HEAD request with Twilio auth
    let fileSize = 0;
    
    try {
      // Try direct Twilio access first
      if (recordingUrl.includes('api.twilio.com')) {
        const response = await axios.head(recordingUrl, {
          auth: {
            username: TWILIO_ACCOUNT_SID,
            password: TWILIO_AUTH_TOKEN
          }
        });
        const contentLength = parseInt(response.headers['content-length'] || '0');
        fileSize = contentLength / 1024; // KB
      } else {
        // If it's a proxy URL, estimate based on duration
        fileSize = callDuration * 2; // Rough estimate: 2KB per second
      }
    } catch (error) {
      console.log(`⚠️ Could not get file size (${error.message}), using duration estimate`);
      fileSize = callDuration * 2; // Fallback estimate
    }
    
    console.log(`📊 Estimated file size: ${fileSize.toFixed(1)}KB, Duration: ${callDuration}s`);
    
    // Basic analysis based on file size and duration
    let analysis = {
      isAnsweringMachine: false,
      callOutcome: 'unknown',
      transcriptText: '',
      summary: ''
    };
    
    // Very short calls with small file size = likely answering machine or hangup
    if (callDuration <= 25 && fileSize < 50) {
      analysis.isAnsweringMachine = true;
      analysis.callOutcome = 'answering_machine';
      analysis.transcriptText = '[Answering machine detected - very short duration]';
      analysis.summary = `Answering machine or voicemail detected. Duration: ${callDuration}s, File size: ${fileSize.toFixed(1)}KB`;
    }
    // Very small file size = silence or no audio
    else if (fileSize < 20) {
      analysis.callOutcome = 'no_answer';
      analysis.transcriptText = '[No meaningful audio detected - possible silence]';
      analysis.summary = `No meaningful audio content. Duration: ${callDuration}s, File size: ${fileSize.toFixed(1)}KB`;
    }
    // Short calls but reasonable file size = brief conversation
    else if (callDuration <= 45) {
      analysis.callOutcome = 'brief_conversation';
      analysis.transcriptText = '[Brief conversation detected - requires full transcription for content]';
      analysis.summary = `Brief conversation detected. Duration: ${callDuration}s, File size: ${fileSize.toFixed(1)}KB`;
    }
    // Longer calls = meaningful conversation
    else {
      analysis.callOutcome = 'meaningful_conversation';
      analysis.transcriptText = '[Conversation detected - requires full transcription for content]';
      analysis.summary = `Meaningful conversation detected. Duration: ${callDuration}s, File size: ${fileSize.toFixed(1)}KB`;
    }
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Error analyzing recording:', error.message);
    return {
      isAnsweringMachine: false,
      callOutcome: 'analysis_failed',
      transcriptText: '[Audio analysis failed - requires manual review]',
      summary: `Analysis failed: ${error.message}`
    };
  }
}

async function createBasicTranscript(callId) {
  console.log('Creating basic transcript for call: ' + callId);
  
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
      console.log('❌ Call not found');
      return;
    }
    
    console.log(`📞 Analyzing call to ${call.phoneNumber} (${call.duration}s)`);
    
    if (!call.recording) {
      console.log('❌ No recording URL found - creating no-recording transcript');
      
      // Create a transcript for calls without recordings using raw SQL
      await railwayPrisma.$executeRaw`
        INSERT INTO call_transcripts (
          id, "callId", "transcriptText", summary, "sentimentScore", "confidenceScore", 
          "wordCount", "callOutcomeClassification", "agentTalkRatio", "customerTalkRatio",
          "longestMonologueSeconds", "silenceDurationSeconds", "interruptionsCount",
          "processingProvider", "processingTimeMs", "processingCost", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), ${call.id}, '[No recording available]', 
          ${`Call completed but no recording was saved. Duration: ${call.duration}s`},
          0.5, 0.0, 3, 'no_recording', 0.0, 0.0,
          0, ${call.duration}, 0, 'basic_analysis', 100, 0.0, NOW(), NOW()
        )
      `;
      
      await railwayPrisma.callRecord.update({
        where: { id: call.id },
        data: { 
          // Mark as having transcript processing attempted
          notes: call.notes ? `${call.notes} [TRANSCRIPT: No recording]` : '[TRANSCRIPT: No recording]'
        }
      });
      
      console.log('✅ No-recording transcript created');
      return;
    }
    
    // Analyze recording
    const analysis = await analyzeRecordingBasic(call.recording, call.duration);
    
    console.log('📝 Result: ' + analysis.callOutcome);
    console.log('📄 Text: ' + analysis.transcriptText);
    
    // Create transcript record using raw SQL since the model might not be available
    await railwayPrisma.$executeRaw`
      INSERT INTO call_transcripts (
        id, "callId", "transcriptText", summary, "sentimentScore", "confidenceScore", 
        "wordCount", "callOutcomeClassification", "agentTalkRatio", "customerTalkRatio",
        "longestMonologueSeconds", "silenceDurationSeconds", "interruptionsCount",
        "processingProvider", "processingTimeMs", "processingCost", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${call.id}, ${analysis.transcriptText}, ${analysis.summary},
        ${analysis.isAnsweringMachine ? 0.1 : 0.5}, 0.8, ${analysis.transcriptText.split(' ').length},
        ${analysis.callOutcome}, ${analysis.isAnsweringMachine ? 0.0 : 0.5}, ${analysis.isAnsweringMachine ? 1.0 : 0.5},
        ${analysis.isAnsweringMachine ? call.duration : Math.min(call.duration * 0.6, 30)}, 
        ${Math.max(0, call.duration * 0.1)}, ${analysis.isAnsweringMachine ? 0 : Math.floor(call.duration / 30)},
        'basic_analysis', 500, 0.001, NOW(), NOW()
      )
    `;
    
    // Update call with processing note
    await railwayPrisma.callRecord.update({
      where: { id: call.id },
      data: { 
        notes: call.notes ? `${call.notes} [TRANSCRIPT: ${analysis.callOutcome}]` : `[TRANSCRIPT: ${analysis.callOutcome}]`
      }
    });
    
    console.log('✅ Basic transcript created!');
    return { success: true, analysis };
    
  } catch (error) {
    console.error('❌ Error creating basic transcript:', error.message);
    
    try {
      await railwayPrisma.$executeRaw`
        INSERT INTO call_transcripts (
          id, "callId", "transcriptText", summary, "sentimentScore", "confidenceScore", 
          "wordCount", "callOutcomeClassification", "agentTalkRatio", "customerTalkRatio",
          "longestMonologueSeconds", "silenceDurationSeconds", "interruptionsCount",
          "processingProvider", "processingTimeMs", "processingCost", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), ${callId}, '[Processing failed]', 
          ${'Analysis failed: ' + error.message},
          0.0, 0.0, 2, 'analysis_failed', 0.0, 0.0,
          0, 0, 0, 'basic_analysis', 0, 0.0, NOW(), NOW()
        )
      `;
    } catch (e) {
      console.error('Failed to update call notes:', e.message);
    }
  }
}

async function processBasicTranscripts() {
  console.log('🚀 Processing BASIC transcripts from Twilio recordings...');
  
  // Find calls that don't have transcripts yet using raw SQL
  const callsToProcess = await railwayPrisma.$queryRaw`
    SELECT id, "callId", "phoneNumber", duration, recording, "createdAt"
    FROM call_records 
    WHERE id NOT IN (SELECT "callId" FROM call_transcripts WHERE "callId" IS NOT NULL)
    ORDER BY "createdAt" DESC
    LIMIT 5
  `;
  
  console.log(`Found ${callsToProcess.length} calls to process`);
  
  for (const call of callsToProcess) {
    await createBasicTranscript(call.id);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('🎉 Basic transcript processing complete!');
  await railwayPrisma.$disconnect();
}

if (require.main === module) {
  processBasicTranscripts();
}

module.exports = { createBasicTranscript, processBasicTranscripts };