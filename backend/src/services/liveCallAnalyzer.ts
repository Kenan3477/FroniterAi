/**
 * Live Call Analysis Service
 * Real-time audio stream processing for intelligent call outcome detection
 */

import { Server, Socket } from 'socket.io';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { getWebSocketService } from '../socket';
import { prisma } from '../database';
import sentimentAnalysisService from './sentimentAnalysisService';

interface AudioChunk {
  callId: string;
  sequenceNumber: number;
  timestamp: number;
  media: {
    track: 'inbound' | 'outbound';
    chunk: string; // Base64 encoded audio
    timestamp: number;
    payload: string;
  };
}

interface LiveCallAnalysis {
  callId: string;
  isAnsweringMachine: boolean;
  confidence: number;
  speechPattern: 'human' | 'machine' | 'unknown';
  sentimentScore: number;
  intentClassification: 'interested' | 'not_interested' | 'callback' | 'answering_machine' | 'analyzing';
  keywordDetection: {
    answeringMachineKeywords: string[];
    interestKeywords: string[];
    objectionKeywords: string[];
  };
  lastUpdate: Date;
}

export class LiveCallAnalyzer extends EventEmitter {
  private activeCalls = new Map<string, LiveCallAnalysis>();
  private transcriptBuffer = new Map<string, string>();
  private audioBuffer = new Map<string, Buffer[]>();
  private wsServer?: WebSocket.Server;

  constructor() {
    super();
    this.setupWebSocketServer();
    console.log('🧠 Live Call Analyzer initialized');
  }

  private setupWebSocketServer(): void {
    // Create WebSocket server for Twilio media streams
    this.wsServer = new WebSocket.Server({ 
      port: process.env.MEDIA_STREAM_PORT ? parseInt(process.env.MEDIA_STREAM_PORT) : 8080,
      path: '/media-stream'
    });

    this.wsServer.on('connection', (ws: WebSocket) => {
      console.log('🎵 New media stream connection from Twilio');
      
      ws.on('message', async (data: string) => {
        try {
          const message = JSON.parse(data);
          await this.handleTwilioMessage(message, ws);
        } catch (error) {
          console.error('❌ Error processing Twilio media message:', error);
        }
      });

      ws.on('close', () => {
        console.log('🎵 Twilio media stream connection closed');
      });
    });

    console.log(`🎵 WebSocket server listening on port ${process.env.MEDIA_STREAM_PORT || 8080} for Twilio media streams`);
  }

  private async handleTwilioMessage(message: any, ws: WebSocket): Promise<void> {
    switch (message.event) {
      case 'connected':
        console.log('🎵 Twilio media stream connected');
        break;

      case 'start':
        const callId = message.start.callSid;
        console.log(`🎵 Starting live analysis for call: ${callId}`);
        await this.startCallAnalysis(callId);
        break;

      case 'media':
        await this.processAudioChunk(message);
        break;

      case 'stop':
        const stopCallId = message.stop?.callSid;
        if (stopCallId) {
          await this.endCallAnalysis(stopCallId);
        }
        break;

      default:
        // Ignore unknown events
        break;
    }
  }

  private async startCallAnalysis(callId: string): Promise<void> {
    const analysis: LiveCallAnalysis = {
      callId,
      isAnsweringMachine: false,
      confidence: 0,
      speechPattern: 'unknown',
      sentimentScore: 0.5,
      intentClassification: 'analyzing',
      keywordDetection: {
        answeringMachineKeywords: [],
        interestKeywords: [],
        objectionKeywords: []
      },
      lastUpdate: new Date()
    };

    this.activeCalls.set(callId, analysis);
    this.transcriptBuffer.set(callId, '');
    this.audioBuffer.set(callId, []);

    // Emit to dashboard that analysis has started
    this.broadcastCallUpdate(callId, analysis);

    console.log(`🧠 Started live analysis for call: ${callId}`);
  }

  private async processAudioChunk(mediaMessage: any): Promise<void> {
    const callId = mediaMessage.callSid || mediaMessage.streamSid;
    if (!callId || !this.activeCalls.has(callId)) {
      return;
    }

    try {
      // Decode audio data
      const audioData = Buffer.from(mediaMessage.media.payload, 'base64');
      
      // Add to buffer
      const buffer = this.audioBuffer.get(callId) || [];
      buffer.push(audioData);
      this.audioBuffer.set(callId, buffer);

      // Process in chunks for real-time analysis
      if (buffer.length >= 10) { // Process every 10 chunks (~1 second of audio)
        await this.analyzeAudioBuffer(callId, buffer);
        this.audioBuffer.set(callId, []); // Clear buffer
      }

    } catch (error) {
      console.error(`❌ Error processing audio chunk for call ${callId}:`, error);
    }
  }

  private async analyzeAudioBuffer(callId: string, audioChunks: Buffer[]): Promise<void> {
    try {
      // Combine audio chunks
      const combinedAudio = Buffer.concat(audioChunks);
      
      // Convert to text using speech recognition
      const transcript = await this.speechToText(combinedAudio);
      
      if (transcript && transcript.length > 5) {
        // Add to transcript buffer
        const currentTranscript = this.transcriptBuffer.get(callId) || '';
        const updatedTranscript = currentTranscript + ' ' + transcript;
        this.transcriptBuffer.set(callId, updatedTranscript);

        // Analyze the transcript segment
        await this.analyzeTranscriptSegment(callId, transcript, updatedTranscript);
      }

    } catch (error) {
      console.error(`❌ Error analyzing audio buffer for call ${callId}:`, error);
    }
  }

  private async speechToText(audioBuffer: Buffer): Promise<string> {
    try {
      // This would integrate with OpenAI Whisper or Google Speech-to-Text
      // For now, return a mock result for testing
      
      // In real implementation:
      // const transcription = await whisperAPI.transcribe(audioBuffer);
      // return transcription.text;
      
      return ''; // Placeholder - implement actual speech recognition
      
    } catch (error) {
      console.error('❌ Speech-to-text error:', error);
      return '';
    }
  }

  private async analyzeTranscriptSegment(
    callId: string, 
    newSegment: string, 
    fullTranscript: string
  ): Promise<void> {
    const analysis = this.activeCalls.get(callId);
    if (!analysis) return;

    try {
      // 1. Answering Machine Detection
      const answeringMachineResult = this.detectAnsweringMachine(fullTranscript);
      
      // 2. Sentiment Analysis
      const sentimentResult = await sentimentAnalysisService.analyzeText({
        text: newSegment,
        callId
      });

      // 3. Intent Classification
      const intentResult = this.classifyIntent(newSegment, fullTranscript);

      // 4. Keyword Detection
      const keywordResult = this.detectKeywords(newSegment);

      // Update analysis
      analysis.isAnsweringMachine = answeringMachineResult.isAnsweringMachine;
      analysis.confidence = answeringMachineResult.confidence;
      analysis.speechPattern = answeringMachineResult.pattern;
      analysis.sentimentScore = sentimentResult.score;
      analysis.intentClassification = intentResult;
      analysis.keywordDetection = keywordResult;
      analysis.lastUpdate = new Date();

      // Update in memory
      this.activeCalls.set(callId, analysis);

      // Save to database
      await this.updateCallRecord(callId, analysis);

      // Broadcast update
      this.broadcastCallUpdate(callId, analysis);

      console.log(`🧠 Updated analysis for call ${callId}: ${analysis.intentClassification} (${analysis.confidence})`);

    } catch (error) {
      console.error(`❌ Error analyzing transcript segment for call ${callId}:`, error);
    }
  }

  private detectAnsweringMachine(transcript: string): {
    isAnsweringMachine: boolean;
    confidence: number;
    pattern: 'human' | 'machine' | 'unknown';
  } {
    const text = transcript.toLowerCase();
    
    // Answering machine keywords
    const machineKeywords = [
      'please leave a message',
      'at the beep',
      'after the tone',
      'not available right now',
      'leave your name and number',
      'thank you for calling',
      'cannot come to the phone',
      'voice mail',
      'voicemail'
    ];

    // Human conversation indicators
    const humanIndicators = [
      'hello?',
      'who is this?',
      'yes',
      'no',
      'okay',
      'what?',
      'sorry',
      'pardon',
      'excuse me'
    ];

    const machineScore = machineKeywords.filter(keyword => text.includes(keyword)).length;
    const humanScore = humanIndicators.filter(indicator => text.includes(indicator)).length;

    // Pattern analysis
    const wordCount = text.split(' ').length;
    const isLongMonologue = wordCount > 20 && humanScore === 0;
    const hasInteraction = humanScore > 0;

    let confidence = 0;
    let pattern: 'human' | 'machine' | 'unknown' = 'unknown';
    let isAnsweringMachine = false;

    if (machineScore > 0 || isLongMonologue) {
      isAnsweringMachine = true;
      pattern = 'machine';
      confidence = Math.min(0.9, 0.5 + (machineScore * 0.2) + (isLongMonologue ? 0.3 : 0));
    } else if (hasInteraction) {
      isAnsweringMachine = false;
      pattern = 'human';
      confidence = Math.min(0.9, 0.5 + (humanScore * 0.15));
    }

    return { isAnsweringMachine, confidence, pattern };
  }

  private classifyIntent(
    newSegment: string, 
    fullTranscript: string
  ): 'interested' | 'not_interested' | 'callback' | 'answering_machine' | 'analyzing' {
    const text = newSegment.toLowerCase();

    // Check for answering machine first
    if (this.activeCalls.get(text)?.isAnsweringMachine) {
      return 'answering_machine';
    }

    // Interest indicators
    const interestKeywords = [
      'yes', 'interested', 'sounds good', 'tell me more',
      'how much', 'when can we', 'schedule', 'sign up',
      'what do you need', 'okay sure'
    ];

    // Negative indicators  
    const negativeKeywords = [
      'not interested', 'no thanks', 'remove me',
      'don\'t call', 'stop calling', 'not now',
      'busy', 'wrong number'
    ];

    // Callback indicators
    const callbackKeywords = [
      'call back later', 'busy right now', 'better time',
      'call me back', 'not a good time'
    ];

    if (callbackKeywords.some(keyword => text.includes(keyword))) {
      return 'callback';
    }

    if (interestKeywords.some(keyword => text.includes(keyword))) {
      return 'interested';
    }

    if (negativeKeywords.some(keyword => text.includes(keyword))) {
      return 'not_interested';
    }

    return 'analyzing';
  }

  private detectKeywords(text: string): {
    answeringMachineKeywords: string[];
    interestKeywords: string[];
    objectionKeywords: string[];
  } {
    const lowerText = text.toLowerCase();

    const answeringMachineKeywords = [
      'leave a message', 'at the beep', 'after the tone'
    ].filter(keyword => lowerText.includes(keyword));

    const interestKeywords = [
      'interested', 'yes', 'sounds good', 'tell me more'
    ].filter(keyword => lowerText.includes(keyword));

    const objectionKeywords = [
      'not interested', 'no thanks', 'busy', 'wrong number'
    ].filter(keyword => lowerText.includes(keyword));

    return {
      answeringMachineKeywords,
      interestKeywords, 
      objectionKeywords
    };
  }

  private async updateCallRecord(callId: string, analysis: LiveCallAnalysis): Promise<void> {
    try {
      // Determine smart outcome based on analysis
      let outcome: string;

      if (analysis.isAnsweringMachine && analysis.confidence > 0.7) {
        outcome = 'answering_machine';
      } else if (analysis.intentClassification === 'interested') {
        outcome = 'interested';
      } else if (analysis.intentClassification === 'not_interested') {
        outcome = 'not_interested';
      } else if (analysis.intentClassification === 'callback') {
        outcome = 'callback';
      } else {
        outcome = 'analyzing';
      }

      // Update call record with AI analysis (only core fields that exist in schema)
      await prisma.callRecord.update({
        where: { callId },
        data: {
          outcome,
          notes: `AI Analysis: ${analysis.intentClassification} (confidence: ${analysis.confidence.toFixed(2)})`
        }
      });

    } catch (error) {
      console.error(`❌ Error updating call record for ${callId}:`, error);
    }
  }

  private broadcastCallUpdate(callId: string, analysis: LiveCallAnalysis): void {
    try {
      const webSocketService = getWebSocketService();
      
      // Broadcast to all admin users 
      webSocketService.sendToUser('admin', 'live_call_analysis', {
        callId,
        analysis,
        timestamp: new Date().toISOString()
      });

      // Emit event for other systems
      this.emit('call_analysis_update', { callId, analysis });

    } catch (error) {
      console.error(`❌ Error broadcasting call update for ${callId}:`, error);
    }
  }

  private async endCallAnalysis(callId: string): Promise<void> {
    const analysis = this.activeCalls.get(callId);
    if (!analysis) return;

    console.log(`🧠 Ending live analysis for call: ${callId}`);

    // Final analysis with full transcript
    const fullTranscript = this.transcriptBuffer.get(callId) || '';
    
    if (fullTranscript.length > 10) {
      // Final comprehensive analysis
      await this.performFinalAnalysis(callId, fullTranscript, analysis);
    }

    // Cleanup
    this.activeCalls.delete(callId);
    this.transcriptBuffer.delete(callId);
    this.audioBuffer.delete(callId);

    // Broadcast final update
    this.broadcastCallUpdate(callId, analysis);

    console.log(`✅ Completed live analysis for call: ${callId} - Final: ${analysis.intentClassification}`);
  }

  private async performFinalAnalysis(
    callId: string, 
    fullTranscript: string, 
    analysis: LiveCallAnalysis
  ): Promise<void> {
    try {
      // Comprehensive sentiment analysis
      const sentimentResult = await sentimentAnalysisService.analyzeText({
        text: fullTranscript,
        callId
      });

      // Final intent classification with full context
      const finalIntent = this.classifyIntent(fullTranscript, fullTranscript);
      
      // Final answering machine detection
      const finalMachineDetection = this.detectAnsweringMachine(fullTranscript);

      // Update analysis with final results
      analysis.sentimentScore = sentimentResult.score;
      analysis.intentClassification = finalIntent;
      analysis.isAnsweringMachine = finalMachineDetection.isAnsweringMachine;
      analysis.confidence = Math.max(analysis.confidence, finalMachineDetection.confidence);
      analysis.speechPattern = finalMachineDetection.pattern;
      analysis.lastUpdate = new Date();

      // Save final analysis to database
      await this.updateCallRecord(callId, analysis);

    } catch (error) {
      console.error(`❌ Error in final analysis for call ${callId}:`, error);
    }
  }

  // Public methods for external access
  public getActiveAnalysis(callId: string): LiveCallAnalysis | undefined {
    return this.activeCalls.get(callId);
  }

  public getAllActiveAnalyses(): Map<string, LiveCallAnalysis> {
    return new Map(this.activeCalls);
  }

  public getStats(): {
    activeCalls: number;
    totalProcessed: number;
    answeringMachinesDetected: number;
    successfulInteractions: number;
  } {
    const active = this.activeCalls.size;
    const answeringMachines = Array.from(this.activeCalls.values())
      .filter(analysis => analysis.isAnsweringMachine).length;
    const successful = Array.from(this.activeCalls.values())
      .filter(analysis => ['interested', 'callback'].includes(analysis.intentClassification)).length;

    return {
      activeCalls: active,
      totalProcessed: active,
      answeringMachinesDetected: answeringMachines,
      successfulInteractions: successful
    };
  }
}

// Singleton instance
export const liveCallAnalyzer = new LiveCallAnalyzer();
export default liveCallAnalyzer;