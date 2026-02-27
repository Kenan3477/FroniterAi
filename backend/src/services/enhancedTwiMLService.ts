/**
 * TwiML Generation Service with Live Audio Streaming
 * Enhanced TwiML generation for intelligent call analysis
 */

import twilio from 'twilio';

const BACKEND_URL = process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';
const MEDIA_STREAM_URL = process.env.MEDIA_STREAM_URL || `wss://${BACKEND_URL.replace('https://', '')}/media-stream`;

export class EnhancedTwiMLService {
  
  /**
   * Generate TwiML for outbound calls with live audio streaming
   */
  static generateOutboundCallTwiML(customerNumber: string, options?: {
    enableRecording?: boolean;
    enableLiveAnalysis?: boolean;
    conferenceId?: string;
  }): string {
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Enable live audio streaming for AI analysis
    if (options?.enableLiveAnalysis !== false) {
      const start = twiml.start();
      start.stream({
        name: `analysis-${Date.now()}`,
        url: MEDIA_STREAM_URL,
        track: 'both_tracks' // Capture both agent and customer audio
      });
    }

    // Dial the customer
    const dial = twiml.dial({
      record: options?.enableRecording ? 'record-from-answer' : 'do-not-record',
      recordingStatusCallback: `${BACKEND_URL}/api/calls/recording-complete`,
      answerOnBridge: true,
      timeout: 30
    });

    if (options?.conferenceId) {
      // Connect to conference for agent
      const conference = dial.conference(options.conferenceId);
      conference.setAttributes({
        startConferenceOnEnter: true,
        endConferenceOnExit: true,
        maxParticipants: 2
      });
    } else {
      // Direct dial to customer
      dial.number(customerNumber);
    }

    return twiml.toString();
  }

  /**
   * Generate TwiML for agent connection with AMD
   */
  static generateAgentConnectTwiML(agentId: string, customerNumber: string, callId: string): string {
    const twiml = new twilio.twiml.VoiceResponse();

    // Start live analysis stream
    const start = twiml.start();
    start.stream({
      name: `agent-analysis-${callId}`,
      url: MEDIA_STREAM_URL,
      track: 'both_tracks',
      statusCallback: `${BACKEND_URL}/api/calls/stream-status`
    });

    // Create conference for agent and customer
    const dial = twiml.dial({
      record: 'record-from-answer',
      recordingStatusCallback: `${BACKEND_URL}/api/calls/recording-complete`,
      answerOnBridge: true
    });
    
    dial.conference({
      startConferenceOnEnter: true,
      endConferenceOnExit: false,
      maxParticipants: 2,
      statusCallback: `${BACKEND_URL}/api/calls/conference-status`,
      statusCallbackEvent: ['start', 'end', 'join', 'leave']
    }, `call-${callId}`);

    return twiml.toString();
  }

  /**
   * Generate TwiML for outbound call with AMD
   */
  static generateOutboundWithAMDTwiML(customerNumber: string, callId: string): string {
    const twiml = new twilio.twiml.VoiceResponse();

    // Enable live streaming for AMD detection
    const start = twiml.start();
    start.stream({
      name: `amd-analysis-${callId}`,
      url: MEDIA_STREAM_URL,
      track: 'inbound_track' // Only need customer audio for AMD
    });

    // Say something to prompt response (helps with AMD)
    twiml.say({
      voice: 'alice',
      language: 'en-GB'
    }, 'Hello, this is a call from your service provider. Please hold while I connect you.');

    // Pause briefly for response analysis
    twiml.pause({ length: 2 });

    // Based on live analysis, either connect to agent or hang up
    // This would be dynamically controlled by the live analyzer
    twiml.redirect(`${BACKEND_URL}/api/calls/${callId}/next-action`);

    return twiml.toString();
  }

  /**
   * Generate TwiML for call outcome based on live analysis
   */
  static generateOutcomeBasedTwiML(callId: string, outcome: 'human' | 'machine' | 'unknown'): string {
    const twiml = new twilio.twiml.VoiceResponse();

    switch (outcome) {
      case 'human':
        // Connect to available agent
        twiml.say('Please hold while I connect you to an agent.');
        twiml.dial({
          record: 'record-from-answer',
          timeout: 20
        }).queue({
          url: `${BACKEND_URL}/api/calls/agent-connect`
        }, 'agent-queue');
        break;

      case 'machine':
        // Leave voicemail or hang up
        twiml.say({
          voice: 'alice',
          language: 'en-GB'
        }, 'Thank you. We will call you back at a more convenient time.');
        twiml.hangup();
        break;

      case 'unknown':
        // Try one more time with different approach
        twiml.say('Hello? Can you hear me?');
        twiml.pause({ length: 3 });
        twiml.redirect(`${BACKEND_URL}/api/calls/${callId}/retry-analysis`);
        break;

      default:
        twiml.hangup();
    }

    return twiml.toString();
  }

  /**
   * Generate TwiML for inbound calls with live analysis
   */
  static generateInboundCallTwiML(options?: { 
    enableGreeting?: boolean;
    queueName?: string;
  }): string {
    const twiml = new twilio.twiml.VoiceResponse();

    // Start live analysis for inbound calls too
    const start = twiml.start();
    start.stream({
      name: `inbound-analysis-${Date.now()}`,
      url: MEDIA_STREAM_URL,
      track: 'both_tracks'
    });

    if (options?.enableGreeting !== false) {
      twiml.say({
        voice: 'alice',
        language: 'en-GB'
      }, 'Thank you for calling. Please hold while I connect you to an available agent.');
    }

    // Route to agent queue
    const dial = twiml.dial({
      record: 'record-from-answer',
      timeout: 30
    });

    if (options?.queueName) {
      dial.queue(options.queueName);
    } else {
      dial.queue('default-queue');
    }

    // Fallback if no agents available
    twiml.say('All our agents are currently busy. Please call back later or leave a voicemail.');
    
    return twiml.toString();
  }

  /**
   * Generate TwiML for conference bridge with live analysis
   */
  static generateConferenceTwiML(conferenceId: string, participantType: 'agent' | 'customer'): string {
    const twiml = new twilio.twiml.VoiceResponse();

    // Enable live analysis on conference
    if (participantType === 'agent') {
      const start = twiml.start();
      start.stream({
        name: `conference-${conferenceId}`,
        url: MEDIA_STREAM_URL,
        track: 'both_tracks'
      });
    }

    // Join conference
    const dial = twiml.dial();
    dial.conference({
      startConferenceOnEnter: participantType === 'agent',
      endConferenceOnExit: participantType === 'agent',
      muted: false,
      record: 'record-from-start',
      statusCallback: `${BACKEND_URL}/api/calls/conference-status`,
      statusCallbackEvent: ['start', 'end', 'join', 'leave', 'mute', 'hold']
    }, conferenceId);

    return twiml.toString();
  }

  /**
   * Generate TwiML for call transfer with analysis continuation
   */
  static generateTransferTwiML(targetNumber: string, callId: string): string {
    const twiml = new twilio.twiml.VoiceResponse();

    // Continue live analysis during transfer
    const start = twiml.start();
    start.stream({
      name: `transfer-${callId}`,
      url: MEDIA_STREAM_URL,
      track: 'both_tracks'
    });

    twiml.say('Transferring your call, please hold.');

    twiml.dial({
      record: 'record-from-answer',
      timeout: 30
    }).number(targetNumber);

    twiml.say('The transfer was unsuccessful. Returning to original call.');

    return twiml.toString();
  }

  /**
   * Generate TwiML for call parking with analysis
   */
  static generateCallParkTwiML(callId: string): string {
    const twiml = new twilio.twiml.VoiceResponse();

    // Maintain analysis during hold
    const start = twiml.start();
    start.stream({
      name: `park-${callId}`,
      url: MEDIA_STREAM_URL,
      track: 'inbound_track' // Only need to monitor customer
    });

    twiml.say('Your call is being placed on hold. Please wait for an available agent.');

    // Play hold music with periodic updates
    twiml.play('https://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.wav');

    return twiml.toString();
  }

  /**
   * Generate TwiML for voicemail with transcription
   */
  static generateVoicemailTwiML(options?: {
    maxLength?: number;
    transcribe?: boolean;
  }): string {
    const twiml = new twilio.twiml.VoiceResponse();

    // Enable streaming for voicemail analysis
    const start = twiml.start();
    start.stream({
      name: `voicemail-${Date.now()}`,
      url: MEDIA_STREAM_URL,
      track: 'inbound_track'
    });

    twiml.say({
      voice: 'alice',
      language: 'en-GB'
    }, 'Please leave your message after the beep. Press any key when finished.');

    twiml.record({
      maxLength: options?.maxLength || 120,
      transcribe: options?.transcribe || true,
      transcribeCallback: `${BACKEND_URL}/api/calls/voicemail-transcription`,
      recordingStatusCallback: `${BACKEND_URL}/api/calls/voicemail-complete`,
      playBeep: true,
      finishOnKey: '#'
    });

    twiml.say('Thank you for your message. Goodbye.');

    return twiml.toString();
  }
}

export default EnhancedTwiMLService;