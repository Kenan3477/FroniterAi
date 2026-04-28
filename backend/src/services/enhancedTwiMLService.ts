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

    // Use Twilio's built-in AMD without TTS (saves costs)
    // The pause allows AMD to detect human vs machine silently
    twiml.pause({ length: 3 });

    // Based on live analysis, either connect to agent or hang up
    // This would be dynamically controlled by the live analyzer
    twiml.redirect(`${BACKEND_URL}/api/calls/${callId}/next-action`);

    return twiml.toString();
  }

  /**
   * Generate TwiML for call outcome based on live analysis
   * NO TTS - All interactions handled without speech synthesis
   */
  static generateOutcomeBasedTwiML(callId: string, outcome: 'human' | 'machine' | 'unknown'): string {
    const twiml = new twilio.twiml.VoiceResponse();

    switch (outcome) {
      case 'human':
        // Connect to available agent (no TTS greeting)
        twiml.dial({
          record: 'record-from-answer',
          timeout: 20
        }).queue({
          url: `${BACKEND_URL}/api/calls/agent-connect`
        }, 'agent-queue');
        break;

      case 'machine':
        // Just hang up (no voicemail message)
        twiml.hangup();
        break;

      case 'unknown':
        // Try one more time silently
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
   * NO TTS - Uses audio files from inbound number configuration
   */
  static generateInboundCallTwiML(inboundNumber?: any, options?: { 
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

    // ✅ CRITICAL: Use audio file instead of TTS
    if (options?.enableGreeting !== false && inboundNumber?.greetingAudioUrl) {
      console.log('🎵 Playing greeting audio:', inboundNumber.greetingAudioUrl);
      twiml.play(inboundNumber.greetingAudioUrl);
    } else if (options?.enableGreeting !== false) {
      console.error('❌ No greeting audio configured - TTS is disabled');
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

    // ✅ Fallback: Use busyAudioUrl or noAnswerAudioUrl instead of TTS
    if (inboundNumber?.busyAudioUrl) {
      console.log('🎵 Playing busy audio:', inboundNumber.busyAudioUrl);
      twiml.play(inboundNumber.busyAudioUrl);
    } else if (inboundNumber?.noAnswerAudioUrl) {
      console.log('🎵 Playing no answer audio:', inboundNumber.noAnswerAudioUrl);
      twiml.play(inboundNumber.noAnswerAudioUrl);
    } else {
      console.error('❌ No busy/no-answer audio configured - TTS is disabled, hanging up silently');
      twiml.hangup();
    }
    
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
   * NO TTS - Uses transferAudioUrl from configuration
   */
  static generateTransferTwiML(targetNumber: string, callId: string, inboundNumber?: any): string {
    const twiml = new twilio.twiml.VoiceResponse();

    // Continue live analysis during transfer
    const start = twiml.start();
    start.stream({
      name: `transfer-${callId}`,
      url: MEDIA_STREAM_URL,
      track: 'both_tracks'
    });

    // ✅ CRITICAL: Use audio file instead of TTS
    if (inboundNumber?.transferAudioUrl) {
      console.log('🎵 Playing transfer audio:', inboundNumber.transferAudioUrl);
      twiml.play(inboundNumber.transferAudioUrl);
    } else {
      console.error('❌ No transfer audio configured - TTS is disabled');
    }

    twiml.dial({
      record: 'record-from-answer',
      timeout: 30
    }).number(targetNumber);

    // ✅ Transfer failed: Use transferFailedAudioUrl instead of TTS
    if (inboundNumber?.transferFailedAudioUrl) {
      console.log('🎵 Playing transfer failed audio:', inboundNumber.transferFailedAudioUrl);
      twiml.play(inboundNumber.transferFailedAudioUrl);
    } else {
      console.error('❌ No transfer failed audio configured - TTS is disabled, hanging up silently');
      twiml.hangup();
    }

    return twiml.toString();
  }

  /**
   * Generate TwiML for call parking with analysis
   * NO TTS - Uses holdAudioUrl or hold music
   */
  static generateCallParkTwiML(callId: string, inboundNumber?: any): string {
    const twiml = new twilio.twiml.VoiceResponse();

    // Maintain analysis during hold
    const start = twiml.start();
    start.stream({
      name: `park-${callId}`,
      url: MEDIA_STREAM_URL,
      track: 'inbound_track' // Only need to monitor customer
    });

    // ✅ CRITICAL: Use audio file instead of TTS
    if (inboundNumber?.holdAudioUrl) {
      console.log('🎵 Playing hold prompt audio:', inboundNumber.holdAudioUrl);
      twiml.play(inboundNumber.holdAudioUrl);
    } else {
      console.error('❌ No hold audio configured - TTS is disabled, skipping prompt');
    }

    // Play hold music with periodic updates
    const holdMusicUrl = inboundNumber?.queueAudioUrl || 
                         'https://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.wav';
    console.log('🎵 Playing hold music:', holdMusicUrl);
    twiml.play(holdMusicUrl);

    return twiml.toString();
  }

  /**
   * Generate TwiML for voicemail with transcription
   * NO TTS - Uses voicemailAudioUrl from configuration
   */
  static generateVoicemailTwiML(inboundNumber?: any, options?: {
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

    // ✅ CRITICAL: Use audio file instead of TTS
    if (inboundNumber?.voicemailAudioUrl) {
      console.log('🎵 Playing voicemail prompt audio:', inboundNumber.voicemailAudioUrl);
      twiml.play(inboundNumber.voicemailAudioUrl);
    } else {
      console.error('❌ No voicemail prompt audio configured - TTS is disabled');
      console.error('❌ Cannot take voicemail without audio file, hanging up');
      twiml.hangup();
      return twiml.toString();
    }

    twiml.record({
      maxLength: options?.maxLength || 120,
      transcribe: options?.transcribe || true,
      transcribeCallback: `${BACKEND_URL}/api/calls/voicemail-transcription`,
      recordingStatusCallback: `${BACKEND_URL}/api/calls/voicemail-complete`,
      playBeep: true,
      finishOnKey: '#'
    });

    // ✅ Thank you message: Use voicemailThankyouAudioUrl instead of TTS
    if (inboundNumber?.voicemailThankyouAudioUrl) {
      console.log('🎵 Playing voicemail thank you audio:', inboundNumber.voicemailThankyouAudioUrl);
      twiml.play(inboundNumber.voicemailThankyouAudioUrl);
    } else {
      console.error('❌ No voicemail thank you audio configured - TTS is disabled, hanging up silently');
    }

    twiml.hangup();

    return twiml.toString();
  }
}

export default EnhancedTwiMLService;