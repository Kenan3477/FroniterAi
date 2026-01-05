/**
 * Twilio Service - Backend Twilio Call Handling
 * Handles all Twilio API interactions from backend
 */

import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;
// Twilio configuration - require environment variables for production
const TWILIO_SIP_DOMAIN = process.env.TWILIO_SIP_DOMAIN;
if (!TWILIO_SIP_DOMAIN) {
  throw new Error('TWILIO_SIP_DOMAIN environment variable is required for production');
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
 */
export const generateCustomerToAgentTwiML = (): string => {
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Add a greeting to prevent immediate cancellation
  twiml.say({
    voice: 'alice',
    language: 'en-GB'
  }, 'Please hold while we connect you to an agent.');
  
  // Connect customer directly to the WebRTC agent
  const dial = twiml.dial({
    timeout: 45, // Increase timeout to 45 seconds
    record: 'record-from-answer-dual', // Record both sides
    answerOnBridge: true, // Only answer when agent picks up
  });
  
  // Use client dial to connect to the WebRTC agent
  dial.client('agent-browser');
  
  // If agent doesn't answer, play a message
  twiml.say({
    voice: 'alice',
    language: 'en-GB'
  }, 'Sorry, no agents are available. Please try again later.');

  return twiml.toString();
};

/**
 * Generate TwiML for agent connection to conference
 */
export const generateAgentTwiML = (conference: string): string => {
  const twiml = new twilio.twiml.VoiceResponse();
  
  twiml.say({
    voice: 'alice',
    language: 'en-GB'
  }, 'Connecting you to the customer. Please wait.');
  
  // Connect agent to conference
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
 */
export const generateCustomerTwiML = (conference: string): string => {
  const twiml = new twilio.twiml.VoiceResponse();
  
  twiml.say({
    voice: 'alice',
    language: 'en-GB'
  }, 'Please hold while we connect you to an agent.');
  
  // Connect customer to conference with recording
  const dial = twiml.dial({
    timeout: 60,
    record: 'record-from-answer-dual' // Record both sides from when call is answered
  });
  
  dial.conference({
    startConferenceOnEnter: false, // Wait for agent
    endConferenceOnExit: true, // End conference when customer leaves
    waitUrl: 'http://twimlets.com/holdmusic?Bucket=com.twilio.music.ambient',
    maxParticipants: 2
  }, conference);

  // If conference fails, apologize
  twiml.say({
    voice: 'alice', 
    language: 'en-GB'
  }, 'Sorry, no agents are available. Please try again later.');

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
 * Update call metadata
 */
export const updateCallMetadata = async (callSid: string, metadata: any) => {
  // This would typically be saved to your database
  // Not a Twilio API, but included for completeness
  console.log(`Updating metadata for call ${callSid}:`, metadata);
  return { success: true };
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
  updateCallMetadata,
};
