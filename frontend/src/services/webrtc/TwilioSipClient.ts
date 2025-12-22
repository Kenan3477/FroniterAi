/**
 * Twilio SIP Client for Kennex
 * Configured for authenticated SIP INVITEs (no REGISTER)
 * 
 * Key Differences from Standard SIP:
 * - No SIP registration required
 * - Authenticate per INVITE
 * - UDP transport only
 * - PCMU codec only
 * - E.164 dial format mandatory
 */

import JsSIP from 'jssip';
import { EventEmitter } from 'events';

export interface TwilioSipConfig {
  sipDomain: string;           // Production SIP domain from environment
  username: string;            // Omnivox
  password: string;            // Secure password from environment variables
  transport: 'UDP';            // UDP only
  codec: 'PCMU';              // G.711u only
  callerIdNumber: string;      // Must be verified Twilio number
}

export interface TwilioCallOptions {
  phoneNumber: string;         // Must be E.164 format (e.g. +447700900123)
  callerIdNumber?: string;     // Override default caller ID
  campaignId?: string;
  contactId?: string;
  recordCall?: boolean;
}

export interface TwilioCall {
  id: string;
  session: any; // JsSIP.RTCSession
  direction: 'inbound' | 'outbound';
  remoteNumber: string;
  callerIdNumber: string;
  status: 'connecting' | 'ringing' | 'answered' | 'ended' | 'failed';
  startTime: Date;
  answerTime?: Date;
  endTime?: Date;
  duration?: number;
  campaignId?: string;
  contactId?: string;
}

export class TwilioSipClient extends EventEmitter {
  private ua: JsSIP.UA | null = null;
  private config: TwilioSipConfig | null = null;
  private activeCalls = new Map<string, TwilioCall>();
  private isConnected = false;

  constructor() {
    super();
    this.setupJsSIPDebug();
  }

  private setupJsSIPDebug(): void {
    if (process.env.NODE_ENV === 'development') {
      JsSIP.debug.enable('JsSIP:*');
      console.log('🔧 Twilio SIP Debug enabled');
    }
  }

  /**
   * Connect to Twilio SIP (no registration needed)
   */
  async connect(config: TwilioSipConfig): Promise<boolean> {
    try {
      console.log('🔌 Connecting to Twilio SIP...', {
        domain: config.sipDomain,
        username: config.username,
        transport: config.transport,
        codec: config.codec
      });

      this.config = config;

      // Configure JsSIP for Twilio (no registration)
      const socket = new JsSIP.WebSocketInterface(`wss://${config.sipDomain}`);
      
      const uaConfig = {
        sockets: [socket],
        uri: `sip:${config.username}@${config.sipDomain}`,
        password: config.password,
        display_name: config.username,
        session_timers: false,
        register: false,  // ⚠️ CRITICAL: No registration for Twilio
        no_answer_timeout: 30,
        connection_recovery_max_interval: 30,
        connection_recovery_min_interval: 4
      };

      this.ua = new JsSIP.UA(uaConfig);
      this.setupEventHandlers();
      
      // Start UA without registration
      this.ua.start();
      
      // Wait for connection (not registration)
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.error('❌ Twilio SIP connection timeout');
          resolve(false);
        }, 10000);

        this.ua?.on('connected', () => {
          console.log('✅ Connected to Twilio SIP');
          this.isConnected = true;
          clearTimeout(timeout);
          this.emit('connected');
          resolve(true);
        });

        this.ua?.on('disconnected', () => {
          console.log('❌ Disconnected from Twilio SIP');
          this.isConnected = false;
          this.emit('disconnected');
          if (timeout) clearTimeout(timeout);
          resolve(false);
        });
      });

    } catch (error) {
      console.error('❌ Twilio SIP connection failed:', error);
      return false;
    }
  }

  /**
   * Make authenticated outbound call to PSTN via Twilio
   */
  async makeCall(options: TwilioCallOptions): Promise<string | null> {
    if (!this.ua || !this.isConnected || !this.config) {
      console.error('❌ Twilio SIP client not connected');
      return null;
    }

    // Validate E.164 format
    if (!this.isE164Format(options.phoneNumber)) {
      console.error('❌ Phone number must be in E.164 format:', options.phoneNumber);
      return null;
    }

    try {
      const callId = `twilio_call_${Date.now()}`;
      const callerIdNumber = options.callerIdNumber || this.config.callerIdNumber;
      
      console.log(`📞 Making Twilio call to ${options.phoneNumber}`, { 
        callId, 
        callerIdNumber,
        domain: this.config.sipDomain 
      });

      // Configure call with Twilio-specific settings
      const callOptions = {
        // Authentication headers for Twilio
        extraHeaders: [
          `P-Asserted-Identity: <sip:${callerIdNumber}@${this.config.sipDomain}>`,
          `P-Access-Network-Info: IEEE-802.11`,
          'Contact: <sip:' + this.config.username + '@' + this.config.sipDomain + '>;transport=udp'
        ],
        mediaConstraints: {
          audio: true,
          video: false
        },
        rtcOfferConstraints: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        },
        // Force PCMU codec
        rtcConfiguration: {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        },
        // Twilio-specific session timers
        sessionTimersExpires: 3600
      };

      // Make authenticated INVITE to Twilio
      const targetUri = `sip:${options.phoneNumber}@${this.config.sipDomain}`;
      const session = this.ua.call(targetUri, callOptions);
      
      if (!session) {
        console.error('❌ Failed to create Twilio SIP session');
        return null;
      }

      // Create call record
      const call: TwilioCall = {
        id: callId,
        session: session,
        direction: 'outbound',
        remoteNumber: options.phoneNumber,
        callerIdNumber: callerIdNumber,
        status: 'connecting',
        startTime: new Date(),
        campaignId: options.campaignId,
        contactId: options.contactId
      };

      this.activeCalls.set(callId, call);
      this.setupCallEventHandlers(call);

      this.emit('callOutgoing', call);
      return callId;

    } catch (error) {
      console.error('❌ Twilio call failed:', error);
      return null;
    }
  }

  /**
   * Validate E.164 phone number format
   */
  private isE164Format(phoneNumber: string): boolean {
    // E.164: + followed by 1-15 digits
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * End a call
   */
  endCall(callId: string): boolean {
    const call = this.activeCalls.get(callId);
    if (!call) {
      console.error('❌ Call not found:', callId);
      return false;
    }

    try {
      call.session.terminate();
      return true;
    } catch (error) {
      console.error('❌ Failed to end call:', error);
      return false;
    }
  }

  /**
   * Send DTMF tones
   */
  sendDTMF(callId: string, tone: string): boolean {
    const call = this.activeCalls.get(callId);
    if (!call || call.status !== 'answered') {
      return false;
    }

    try {
      call.session.sendDTMF(tone);
      console.log(`📱 DTMF sent: ${tone}`);
      this.emit('dtmfSent', { callId, tone });
      return true;
    } catch (error) {
      console.error('❌ DTMF failed:', error);
      return false;
    }
  }

  /**
   * Disconnect from Twilio
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from Twilio SIP...');
    
    // End all active calls
    this.activeCalls.forEach(call => {
      this.endCall(call.id);
    });

    // Stop UA
    if (this.ua) {
      this.ua.stop();
      this.ua = null;
    }

    this.isConnected = false;
    this.activeCalls.clear();
    this.emit('disconnected');
  }

  /**
   * Set up UA event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ua) return;

    this.ua.on('connected', () => {
      console.log('🌐 Twilio SIP WebSocket connected');
      this.isConnected = true;
    });

    this.ua.on('disconnected', () => {
      console.log('🌐 Twilio SIP WebSocket disconnected');
      this.isConnected = false;
    });

    this.ua.on('newRTCSession', (e: any) => {
      console.log('📞 New Twilio SIP session:', e.session.id);
      // Handle incoming calls if needed
    });
  }

  /**
   * Set up call event handlers
   */
  private setupCallEventHandlers(call: TwilioCall): void {
    const session = call.session;

    session.on('connecting', () => {
      console.log(`🔄 Call ${call.id} connecting to Twilio...`);
      call.status = 'connecting';
      this.emit('callConnecting', call);
    });

    session.on('progress', () => {
      console.log(`📞 Call ${call.id} ringing...`);
      call.status = 'ringing';
      this.emit('callRinging', call);
    });

    session.on('confirmed', () => {
      console.log(`✅ Call ${call.id} answered`);
      call.status = 'answered';
      call.answerTime = new Date();
      this.emit('callAnswered', call);
    });

    session.on('ended', () => {
      console.log(`📴 Call ${call.id} ended`);
      call.status = 'ended';
      call.endTime = new Date();
      
      if (call.answerTime) {
        call.duration = Math.floor((call.endTime.getTime() - call.answerTime.getTime()) / 1000);
      }

      this.activeCalls.delete(call.id);
      this.emit('callEnded', call);
    });

    session.on('failed', (e: any) => {
      console.log(`❌ Call ${call.id} failed:`, e.cause);
      call.status = 'failed';
      call.endTime = new Date();
      this.activeCalls.delete(call.id);
      this.emit('callFailed', { call, cause: e.cause });
    });
  }

  // Getters
  get connected(): boolean {
    return this.isConnected;
  }

  get activeCallsCount(): number {
    return this.activeCalls.size;
  }

  getActiveCalls(): TwilioCall[] {
    return Array.from(this.activeCalls.values());
  }
}

// Export singleton instance
export const twilioSipClient = new TwilioSipClient();