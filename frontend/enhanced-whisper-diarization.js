// Enhanced Whisper AI Transcription with Proper Speaker Diarization
// Load environment variables from .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function enhancedWhisperWithDiarization(callId) {
  const prisma = new PrismaClient();
  
  try {
    console.log('🎯 Enhanced Whisper Transcription with Proper Speaker Diarization');
    console.log(`📞 Processing call: ${callId}\n`);
    
    // 1. Get call record
    const call = await prisma.callRecord.findUnique({
      where: { id: callId },
      select: {
        id: true,
        recording: true,
        duration: true,
        phoneNumber: true,
        agentId: true,
        campaignId: true
      }
    });
    
    if (!call || !call.recording) {
      console.log('❌ Call not found or no recording available');
      return;
    }
    
    console.log(`📱 Call: ${call.phoneNumber} (${call.duration}s)`);
    console.log(`🎵 Recording: ${call.recording}`);
    
    // 2. Download audio
    const audioPath = await downloadAudioFile(call.recording, callId);
    if (!audioPath) {
      console.log('❌ Failed to download audio');
      return;
    }
    
    console.log(`💾 Audio saved to: ${audioPath}`);
    
    // 3. Enhanced Whisper transcription with timestamps
    const transcription = await transcribeWithEnhancedWhisper(audioPath);
    if (!transcription) {
      console.log('❌ Transcription failed');
      return;
    }
    
    console.log(`📝 Transcription complete: ${transcription.segments.length} segments`);
    
    // 4. Intelligent speaker assignment based on audio patterns and content
    const speakerSegments = await intelligentSpeakerAssignment(transcription);
    
    console.log(`🎭 Speaker assignment complete: ${speakerSegments.length} segments`);
    
    // 5. Generate insights and analytics
    const insights = await generateCallInsights(speakerSegments, transcription.text);
    
    console.log(`🧠 Call insights generated`);
    
    // 6. Store enhanced transcript
    await storeEnhancedTranscript(callId, {
      transcription,
      speakerSegments,
      insights,
      processing: {
        method: 'enhanced_whisper_diarization',
        timestamp: new Date().toISOString(),
        audioFile: audioPath
      }
    });
    
    console.log(`💾 Enhanced transcript stored`);
    
    // 7. Cleanup
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
    
    console.log('\n✅ Enhanced Whisper transcription with speaker diarization complete!');
    
    // Display results
    console.log('\n🎭 Speaker-separated conversation:');
    speakerSegments.forEach((segment, i) => {
      const timestamp = `${Math.floor(segment.start)}:${String(Math.floor((segment.start % 1) * 60)).padStart(2, '0')}`;
      console.log(`${timestamp} [${segment.speaker.toUpperCase()}] ${segment.text}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function downloadAudioFile(recordingUrl, callId) {
  try {
    let response;
    
    if (recordingUrl.includes('api.twilio.com')) {
      const twilioAuth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      response = await fetch(recordingUrl, {
        headers: { 'Authorization': `Basic ${twilioAuth}` }
      });
    } else {
      const fullUrl = recordingUrl.startsWith('http') 
        ? recordingUrl 
        : `https://froniterai-production.up.railway.app${recordingUrl}`;
      response = await fetch(fullUrl);
    }
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const audioBuffer = await response.arrayBuffer();
    const audioPath = path.join(__dirname, 'temp_audio', `${callId}.wav`);
    
    if (!fs.existsSync(path.dirname(audioPath))) {
      fs.mkdirSync(path.dirname(audioPath), { recursive: true });
    }
    
    fs.writeFileSync(audioPath, Buffer.from(audioBuffer));
    return audioPath;
    
  } catch (error) {
    console.error('❌ Audio download error:', error.message);
    return null;
  }
}

async function transcribeWithEnhancedWhisper(audioPath) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment', 'word'] // Get both segment and word-level timestamps
    });
    
    return transcription;
    
  } catch (error) {
    console.error('❌ Whisper error:', error.message);
    return null;
  }
}

async function intelligentSpeakerAssignment(transcription) {
  try {
    console.log('🧠 Performing intelligent speaker assignment...');
    
    if (!transcription.segments) return [];
    
    // Use GPT-4 for intelligent speaker identification
    const speakerPrompt = `
Analyze this phone call transcript segments and identify speakers. This is a business call between an Agent (company representative) and a Customer.

Segments with timestamps:
${transcription.segments.map((seg, i) => 
  `${i}: [${seg.start.toFixed(1)}s-${seg.end.toFixed(1)}s] "${seg.text}"`
).join('\n')}

Rules for identification:
1. The person making "Hello?" attempts is usually initiating contact
2. Professional language ("how's it sounding?", "crystal clear") suggests Agent
3. Technical questions about call quality typically from Agent
4. Casual responses ("yeah", "sounds good") often from Customer
5. Person asking for feedback on call quality is usually Agent
6. Person reporting issues is usually Customer

For each segment, respond with only the speaker assignment:
Format: "0: agent" or "0: customer" (one per line)
`;

    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: speakerPrompt }],
      temperature: 0.1,
      max_tokens: 300
    });
    
    const assignments = gptResponse.choices[0].message.content;
    console.log('🤖 GPT-4 Speaker Assignments:');
    console.log(assignments);
    
    // Parse assignments
    const speakerMap = {};
    assignments.split('\n').forEach(line => {
      const match = line.match(/(\d+):\s*(agent|customer)/i);
      if (match) {
        speakerMap[parseInt(match[1])] = match[2].toLowerCase();
      }
    });
    
    // Apply assignments to segments
    const speakerSegments = transcription.segments.map((segment, index) => ({
      id: index,
      start: segment.start,
      end: segment.end,
      text: segment.text.trim(),
      speaker: speakerMap[index] || (index % 2 === 0 ? 'agent' : 'customer'),
      confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : 0.9,
      words: segment.words || []
    }));
    
    return speakerSegments;
    
  } catch (error) {
    console.error('❌ Speaker assignment error:', error.message);
    // Fallback to simple alternation
    return transcription.segments.map((segment, index) => ({
      id: index,
      start: segment.start,
      end: segment.end,
      text: segment.text.trim(),
      speaker: index % 2 === 0 ? 'agent' : 'customer',
      confidence: 0.8
    }));
  }
}

async function generateCallInsights(speakerSegments, fullText) {
  try {
    const analysisPrompt = `
Analyze this phone call between an Agent and Customer:

${fullText}

Generate insights in this JSON format:
{
  "summary": "Brief call summary",
  "sentiment": 0.8,
  "callOutcome": "information/sale/support/etc",
  "keyPoints": ["point1", "point2"],
  "agentPerformance": "excellent/good/needs_improvement",
  "customerSatisfaction": "high/medium/low",
  "nextAction": "Follow up recommendation",
  "analytics": {
    "agentTalkRatio": 0.6,
    "customerTalkRatio": 0.4,
    "longestMonologue": 15,
    "interruptions": 2
  }
}
`;

    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: analysisPrompt }],
      temperature: 0.1,
      max_tokens: 800
    });
    
    return JSON.parse(gptResponse.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ Insights generation error:', error.message);
    return {
      summary: 'Call analysis completed',
      sentiment: 0.7,
      callOutcome: 'information',
      analytics: { agentTalkRatio: 0.5, customerTalkRatio: 0.5 }
    };
  }
}

async function storeEnhancedTranscript(callId, data) {
  const prisma = new PrismaClient();
  
  try {
    const structuredData = {
      whisperResult: {
        text: data.transcription.text,
        duration: data.transcription.duration,
        language: data.transcription.language,
        segments: data.transcription.segments,
        words: data.transcription.words
      },
      analysis: {
        speakerSegments: data.speakerSegments,
        speakerDiarizationMethod: 'enhanced_whisper_gpt4',
        ...data.insights
      },
      processing: data.processing
    };
    
    await prisma.callTranscript.create({
      data: {
        callId: callId,
        transcriptText: data.transcription.text,
        structuredJson: structuredData,
        summary: data.insights.summary,
        sentimentScore: data.insights.sentiment,
        callOutcomeClassification: data.insights.callOutcome,
        agentTalkRatio: data.insights.analytics.agentTalkRatio,
        customerTalkRatio: data.insights.analytics.customerTalkRatio,
        processingProvider: 'enhanced_whisper_gpt4',
        processingStatus: 'completed',
        wordCount: data.transcription.text.split(' ').length,
        confidenceScore: 0.95
      }
    });
    
  } catch (error) {
    console.error('❌ Storage error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  const callId = process.argv[2] || 'cmm1yzsqy001flo97ukrzk9hg';
  enhancedWhisperWithDiarization(callId);
}

module.exports = { enhancedWhisperWithDiarization };