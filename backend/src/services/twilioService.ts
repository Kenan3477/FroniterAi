/**
 * Twilio Service - Backend Twilio Call Handling
 * Handles all Twilio API interactions from backend
 */

import twilio from 'twilio';
import https from 'https';
import { resolveConferenceWaitUrl } from '../config/voiceMedia';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;
// Twilio configuration - require environment variables for production
const TWILIO_SIP_DOMAIN = process.env.TWILIO_SIP_DOMAIN;
if (!TWILIO_SIP_DOMAIN) {
  console.warn(
    '⚠️  TWILIO_SIP_DOMAIN is not set — SIP/WebRTC may be limited. Set it in Railway (or your host) for full voice.'
  );
}

// Validate environment variables
const hasValidCredentials = TWILIO_ACCOUNT_SID && 
  TWILIO_ACCOUNT_SID.startsWith('AC') && 
  TWILIO_AUTH_TOKEN &&
  TWILIO_AUTH_TOKEN.length > 10;

if (!hasValidCredentials) {
  console.warn('⚠️  Twilio credentials not configured - dialer will not work until credentials are added to .env');
}

// Initialize Twilio client only if we have valid credentials
const twilioClient = hasValidCredentials 
  ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null;

/** REST API client for call control; null when credentials missing */
export { twilioClient };

interface CallEndParams {
  callSid: string;
  duration: number;
  status: string;
  disposition?: string;
}

/**
 * Generate Twilio Access Token for browser audio
 */
export const generateAccessToken = (agentId: string): string => {
  console.log('🔑 Generating access token for agent:', agentId);
  console.log('🔧 Twilio credentials check:', {
    accountSid: !!TWILIO_ACCOUNT_SID,
    apiKey: !!TWILIO_API_KEY,
    apiSecret: !!TWILIO_API_SECRET,
    twimlAppSid: !!process.env.TWILIO_TWIML_APP_SID,
  });

  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET) {
    throw new Error('Missing Twilio credentials for token generation');
  }

  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  console.log('🎯 Creating access token with identity:', agentId);
  const token = new AccessToken(
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
    { 
      identity: agentId, 
      ttl: 3600
    }
  );

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
    incomingAllow: true,
  });

  token.addGrant(voiceGrant);
  const jwt = token.toJwt();
  console.log('✅ Token generated successfully, length:', jwt.length);
  return jwt;
};

/**
 * End an active call
 */
export const endCall = async (callSid: string) => {
  if (!twilioClient) {
    throw new Error('Twilio client not initialized');
  }

  try {
    const call = await twilioClient.calls(callSid).update({
      status: 'completed',
    });

    console.log(`Call ended: ${callSid}`);
    
    return {
      callSid: call.sid,
      status: call.status,
      duration: call.duration,
    };
  } catch (error) {
    console.error('Error ending call:', error);
    throw error;
  }
};

/**
 * Get call details
 */
export const getCallDetails = async (callSid: string) => {
  if (!twilioClient) {
    throw new Error('Twilio client not initialized');
  }

  try {
    const call = await twilioClient.calls(callSid).fetch();
    
    return {
      callSid: call.sid,
      status: call.status,
      direction: call.direction,
      from: call.from,
      to: call.to,
      duration: call.duration,
      price: call.price,
      priceUnit: call.priceUnit,
      startTime: call.startTime,
      endTime: call.endTime,
    };
  } catch (error) {
    console.error('Error fetching call details:', error);
    throw error;
  }
};

/**
 * Send DTMF tones during an active call
 */
export const sendDTMF = async (callSid: string, digits: string) => {
  if (!twilioClient) {
    throw new Error('Twilio client not initialized');
  }

  try {
    // Create a queue to send DTMF
    await twilioClient.calls(callSid).update({
      twiml: `<Response><Play digits="${digits}"/></Response>`,
    });

    console.log(`DTMF sent to call ${callSid}: ${digits}`);
    
    return { success: true, digits };
  } catch (error) {
    console.error('Error sending DTMF:', error);
    throw error;
  }
};

/**
 * Create a call using Twilio REST API with conference
 * This creates a conference and connects both agent and customer
 */
export const createRestApiCall = async (params: {
  to: string;
  from: string;
  url: string;
  agentNumber?: string;
}) => {
  const { to, from, url, agentNumber } = params;
  
  if (!twilioClient) {
    throw new Error('Twilio client not initialized - check credentials');
  }
  
  console.log('📞 Creating REST API call with conference:', { to, from, url, agentNumber });

  // If no agent number provided, just dial customer directly (original behavior)
  if (!agentNumber) {
    const call = await twilioClient.calls.create({
      to,
      from,
      url,
      method: 'POST'
    });

    console.log('✅ Direct call created via REST API:', { 
      sid: call.sid, 
      status: call.status,
      direction: call.direction
    });

    return call;
  }

  // Conference-based approach: Call both agent and customer
  const conferenceName = `call-${Date.now()}`;
  
  // First, call the agent
  const agentCall = await twilioClient.calls.create({
    to: agentNumber,
    from,
    url: `${process.env.BACKEND_URL}/api/calls/twiml-agent?conference=${conferenceName}`,
    method: 'POST'
  });

  // Then call the customer
  const customerCall = await twilioClient.calls.create({
    to,
    from,
    url: `${process.env.BACKEND_URL}/api/calls/twiml-customer?conference=${conferenceName}`,
    method: 'POST'
  });

  console.log('✅ Conference calls created:', { 
    agentCall: agentCall.sid,
    customerCall: customerCall.sid,
    conference: conferenceName
  });

  return {
    sid: customerCall.sid, // Return customer call as primary
    status: customerCall.status,
    direction: customerCall.direction,
    agentCallSid: agentCall.sid,
    conferenceName
  };
};

/**
 * Generate TwiML for agent to dial customer via WebRTC
 */
export const generateAgentDialTwiML = (customerNumber: string): string => {
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Immediately dial the customer number without any delays
  const dial = twiml.dial({
    callerId: process.env.TWILIO_PHONE_NUMBER,
    timeout: 30, // 30 seconds timeout
    record: 'record-from-answer', // Start recording when call is answered
  });
  
  dial.number(customerNumber);

  return twiml.toString();
};

/**
 * Generate TwiML for customer to connect directly to WebRTC agent
 * Enhanced for landline compatibility
 */
export const generateCustomerToAgentTwiML = (phoneNumber?: string): string => {
  const clientIdentity =
    (process.env.TWILIO_VOICE_CLIENT_IDENTITY || 'agent-browser').trim() || 'agent-browser';
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Detect if this is a landline call for optimized settings
  const isLandline = detectLandlineNumber(phoneNumber);
  
  console.log(`🔍 TwiML Generation: ${phoneNumber} detected as ${isLandline ? 'LANDLINE' : 'MOBILE'}`);
  
  // 🎙️ MANDATORY RECORDING SETTINGS - DO NOT DISABLE
  // Enhanced settings for landline compatibility + MANDATORY dual-channel recording
  const dialSettings = {
    timeout: isLandline ? 90 : 60, // Longer timeout for landlines (90s vs 60s)
    record: 'record-from-answer-dual' as any, // ✅ MANDATORY: Dual-channel recording (agent + customer)
    recordingStatusCallback: `${process.env.BACKEND_URL}/api/calls/recording-callback` as any,
    recordingStatusCallbackMethod: 'POST' as any,
    recordingStatusCallbackEvent: ['completed'] as any, // Callback when recording completes
    trim: 'trim-silence' as any, // Remove silence from beginning/end of recording
    answerOnBridge: true as any, // Only answer customer when agent picks up
    ringTone: isLandline ? 'gb' : 'us' as any, // UK ring tone for landlines, US for mobiles
    callerId: process.env.TWILIO_PHONE_NUMBER
  } as any;
  
  console.log('🎙️ MANDATORY RECORDING ENABLED: record-from-answer-dual with callback');
  
  // Add landline-specific optimizations
  if (isLandline) {
    console.log('🏠 Applying landline optimizations: extended timeout, UK ringtone, bridge timing');
    // For landlines, add a brief pause before connection to allow carrier routing
    twiml.pause({ length: 1 });
  }
  
  // Connect customer directly to the WebRTC agent browser client
  const dial = twiml.dial(dialSettings);
  dial.client(clientIdentity);
  
  // Add landline-specific fallback handling (no TTS - just hangup)
  if (isLandline) {
    twiml.hangup();
  }
  
  return twiml.toString();
};

/**
 * Detect if a phone number is likely a landline
 * Returns true for landlines, false for mobiles
 */
function detectLandlineNumber(phoneNumber?: string): boolean {
  if (!phoneNumber) return false;
  
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // UK number patterns
  if (phoneNumber.startsWith('+44') || cleanNumber.startsWith('44')) {
    // UK mobile numbers start with 07xxx
    // UK landlines are typically 01xxx, 02xxx, 03xxx, 08xxx, 09xxx
    const ukNumber = phoneNumber.replace('+44', '').replace(/\D/g, '');
    
    if (ukNumber.startsWith('7')) {
      console.log(`📱 UK Mobile detected: ${phoneNumber}`);
      return false; // Mobile
    } else if (ukNumber.match(/^[123568]/)) {
      console.log(`🏠 UK Landline detected: ${phoneNumber}`);
      return true;  // Landline
    }
  }
  
  // US number patterns  
  if (phoneNumber.startsWith('+1') || cleanNumber.startsWith('1')) {
    // US numbers - harder to detect, but some area codes are primarily landline
    const usAreaCode = cleanNumber.substring(1, 4);
    const landlineAreaCodes = ['212', '213', '214', '215', '216', '217', '218', '301', '302', '303', '304', '305'];
    
    if (landlineAreaCodes.includes(usAreaCode)) {
      console.log(`🏠 US Landline detected: ${phoneNumber} (area code ${usAreaCode})`);
      return true;
    }
  }
  
  // European landline patterns
  if (phoneNumber.match(/^\+(?:33|49|39|34)[1-9]/)) {
    console.log(`🏠 European Landline detected: ${phoneNumber}`);
    return true;
  }
  
  // Default to mobile for better compatibility
  console.log(`📱 Default to Mobile: ${phoneNumber}`);
  return false;
}

/**
 * Generate TwiML for agent connection to conference
 * NO TTS - Silent connection to reduce costs
 */
export const generateAgentTwiML = (conference: string): string => {
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Connect agent to conference directly (no TTS greeting)
  const dial = twiml.dial({
    record: 'do-not-record' // Customer side already recording
  });
  
  dial.conference({
    startConferenceOnEnter: true, // Agent starts the conference
    endConferenceOnExit: true, // End conference when agent leaves
    beep: 'false' // No beep sounds
  }, conference);

  return twiml.toString();
};

/**
 * Generate TwiML for customer connection to conference
 * Uses hold music instead of TTS to reduce costs
 */
export const generateCustomerTwiML = (conference: string): string => {
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Connect customer to conference with recording (no TTS greeting)
  const dial = twiml.dial({
    timeout: 60,
    record: 'record-from-answer-dual' // Record both sides from when call is answered
  });
  
  const waitUrl = resolveConferenceWaitUrl();
  const confOpts: Parameters<typeof dial.conference>[0] = {
    startConferenceOnEnter: false, // Wait for agent
    endConferenceOnExit: true, // End conference when customer leaves
    maxParticipants: 2,
  };
  if (waitUrl) {
    (confOpts as { waitUrl?: string }).waitUrl = waitUrl;
  }
  dial.conference(confOpts, conference);

  // If conference fails, just hangup (no TTS)
  twiml.hangup();

  return twiml.toString();
};

/**
 * Generate TwiML for outbound call - dials customer number directly  
 */
export const generateCallTwiML = (to: string, from: string): string => {
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Dial the customer number directly
  const dial = twiml.dial({
    callerId: from,
  });
  
  dial.number(to);

  return twiml.toString();
};

/**
 * Get call recordings
 */
export const getCallRecordings = async (callSid: string) => {
  if (!twilioClient) {
    throw new Error('Twilio client not initialized');
  }

  try {
    const recordings = await twilioClient.recordings.list({
      callSid: callSid,
      limit: 20,
    });

    return recordings.map(recording => ({
      sid: recording.sid,
      duration: recording.duration,
      url: `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`,
      dateCreated: recording.dateCreated,
    }));
  } catch (error) {
    console.error('Error fetching recordings:', error);
    throw error;
  }
};

/**
 * Get ALL recordings from Twilio account (not just for specific calls)
 */
export const getAllRecordings = async (limit: number = 100, daysBack: number = 30) => {
  if (!twilioClient) {
    throw new Error('Twilio client not initialized');
  }

  try {
    // Get recordings from the last N days
    const dateCreatedAfter = new Date();
    dateCreatedAfter.setDate(dateCreatedAfter.getDate() - daysBack);

    console.log(`📞 Fetching ALL recordings from Twilio (last ${daysBack} days, limit ${limit})...`);

    const recordings = await twilioClient.recordings.list({
      dateCreatedAfter: dateCreatedAfter,
      limit: limit,
    });

    console.log(`📊 Found ${recordings.length} recordings in Twilio`);

    return recordings.map(recording => ({
      sid: recording.sid,
      callSid: recording.callSid,
      duration: recording.duration,
      url: `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`,
      dateCreated: recording.dateCreated,
      accountSid: recording.accountSid,
      apiVersion: recording.apiVersion,
      channels: recording.channels,
      conferenceUid: recording.conferenceSid,
      status: recording.status,
    }));
  } catch (error) {
    console.error('❌ Error fetching all recordings from Twilio:', error);
    throw error;
  }
};

/**
 * Update call metadata
 */
export const updateCallMetadata = async (callSid: string, metadata: any) => {
  // This would typically be saved to your database
  // Not a Twilio API, but included for completeness
  console.log(`Updating metadata for call ${callSid}:`, metadata);
  return { success: true };
};

/**
 * Get Twilio recording URL for streaming with proper authentication
 */
export const getTwilioRecordingUrl = async (recordingSid: string): Promise<string | null> => {
  if (!twilioClient) {
    console.error('❌ Twilio client not initialized');
    return null;
  }

  try {
    console.log(`🎵 Fetching Twilio recording URL for SID: ${recordingSid}`);
    
    const recording = await twilioClient.recordings(recordingSid).fetch();
    
    // Return the authenticated URL using Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      console.error('❌ Missing Twilio credentials for authenticated recording access');
      return null;
    }
    
    // Construct the authenticated media URL for streaming
    const mediaUrl = `https://${accountSid}:${authToken}@api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
    
    console.log(`✅ Got authenticated Twilio recording URL for SID: ${recordingSid}`);
    return mediaUrl;
    
  } catch (error) {
    console.error(`❌ Error fetching Twilio recording URL: ${error}`);
    return null;
  }
};

/**
 * Stream Twilio recording with authentication
 */
export type TwilioRecordingMedia = { buffer: Buffer; contentType: string };

/**
 * Download Twilio recording bytes. Returns correct Content-Type (mp3 or wav).
 */
export const streamTwilioRecording = async (recordingSid: string): Promise<TwilioRecordingMedia | null> => {
  if (!twilioClient) {
    console.error('❌ Twilio client not initialized');
    return null;
  }

  try {
    console.log(`🎵 Streaming Twilio recording: ${recordingSid}`);

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      console.error('❌ Missing Twilio credentials');
      return null;
    }

    const recording = await twilioClient.recordings(recordingSid).fetch();
    const baseUri = recording.uri.replace('.json', '');
    const authString = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const fetchBuffer = (url: string): Promise<{ status: number; buffer: Buffer }> =>
      new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const req = https.get(
          url,
          {
            headers: {
              Authorization: `Basic ${authString}`,
              'User-Agent': 'Omnivox-AI/1.0',
            },
          },
          (res) => {
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => {
              resolve({ status: res.statusCode || 0, buffer: Buffer.concat(chunks) });
            });
          }
        );
        req.on('error', reject);
      });

    const tryMp3 = `https://api.twilio.com${baseUri}.mp3`;
    const tryWav = `https://api.twilio.com${baseUri}.wav`;

    let { status, buffer } = await fetchBuffer(tryMp3);
    let contentType = 'audio/mpeg';

    if (status !== 200 || buffer.length < 100) {
      const second = await fetchBuffer(tryWav);
      if (second.status === 200 && second.buffer.length >= 100) {
        status = second.status;
        buffer = second.buffer;
        contentType = 'audio/wav';
      }
    }

    if (status !== 200) {
      console.error(`❌ Twilio recording stream failed: HTTP ${status}, bytes=${buffer.length}`);
      return null;
    }

    if (buffer.length < 100) {
      console.error(`❌ Twilio recording stream returned trivial body (${buffer.length} bytes)`);
      return null;
    }

    console.log(`✅ Successfully streamed ${buffer.length} bytes from Twilio (${contentType})`);
    return { buffer, contentType };
  } catch (error) {
    console.error(`❌ Error streaming Twilio recording: ${error}`);
    return null;
  }
};

export default {
  generateAccessToken,
  endCall,
  getCallDetails,
  sendDTMF,
  generateCallTwiML,
  generateAgentDialTwiML,
  generateCustomerToAgentTwiML,
  generateAgentTwiML,
  generateCustomerTwiML,
  createRestApiCall,
  getCallRecordings,
  getAllRecordings,
  updateCallMetadata,
  getTwilioRecordingUrl,
  streamTwilioRecording,
};
