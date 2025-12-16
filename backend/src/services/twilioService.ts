/**
 * Twilio Service - Backend Twilio Call Handling
 * Handles all Twilio API interactions from backend
 */

import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;
const TWILIO_SIP_DOMAIN = process.env.TWILIO_SIP_DOMAIN || 'kennex-dev.sip.twilio.com';

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

interface CallInitiateParams {
  to: string;
  from: string;
  agentId: string;
  customerInfo?: any;
  agentPhone?: string; // Optional: Agent's phone number if not using browser
}

interface CallEndParams {
  callSid: string;
  duration: number;
  status: string;
  disposition?: string;
}

interface ConferenceInfo {
  conferenceSid: string;
  conferenceName: string;
  customerCallSid: string;
  agentCallSid?: string;
}

/**
 * Generate Twilio Access Token for WebRTC calling
 */
export const generateAccessToken = (agentId: string): string => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET) {
    throw new Error('Missing Twilio credentials for token generation');
  }

  console.log('🔑 Token Generation Debug:');
  console.log('  Account SID:', TWILIO_ACCOUNT_SID);
  console.log('  API Key:', TWILIO_API_KEY);
  console.log('  API Secret:', TWILIO_API_SECRET?.substring(0, 10) + '...');
  console.log('  TwiML App SID:', process.env.TWILIO_TWIML_APP_SID);
  console.log('  Agent ID:', agentId);

  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  // Create an access token using the new Ireland API Key
  const token = new AccessToken(
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
    { 
      identity: agentId, 
      ttl: 3600
    }
  );

  // Create a Voice grant with TwiML App SID for outgoing calls
  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID, // Enable outgoing calls
    incomingAllow: true, // Allow incoming calls
  });

  // Add the grant to the token
  token.addGrant(voiceGrant);

  const jwt = token.toJwt();
  console.log('✅ Generated access token for agent:', agentId);
  console.log('  Token length:', jwt.length);

  // Serialize the token to a JWT string
  return jwt;
};

/**
 * Initiate a call through Twilio using Conference for two-way audio
 */
export const initiateCall = async (params: CallInitiateParams) => {
  if (!twilioClient) {
    throw new Error('Twilio client not initialized');
  }

  try {
    // Create a unique conference name
    const conferenceName = `call-${params.agentId}-${Date.now()}`;
    
    // Create TwiML that will add the customer to a conference room
    // The customer will hear ringing music until agent joins
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference
      beep="false"
      waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical"
      waitMethod="GET"
      endConferenceOnExit="true"
    >${conferenceName}</Conference>
  </Dial>
</Response>`;

    // Initiate call to customer first
    const call = await twilioClient.calls.create({
      to: params.to, // Call the customer
      from: params.from, // From your Twilio number
      twiml: twiml, // Customer joins conference and waits
      record: true, // Enable call recording
      // statusCallback: `${process.env.BACKEND_URL}/api/calls/status`, // Disabled for localhost
    });

    console.log(`Customer call initiated: ${call.sid}`);
    console.log(`Conference created: ${conferenceName}`);
    
    // Return conference info so agent can join
    return {
      callSid: call.sid,
      conferenceName: conferenceName,
      status: call.status,
      direction: call.direction,
      to: call.to,
      from: call.from,
    };
  } catch (error) {
    console.error('Error initiating call:', error);
    throw error;
  }
};

/**
 * Join agent to conference (for browser-based calling)
 * Agent will use their browser/WebRTC to join the conference
 */
export const joinConference = async (conferenceName: string, agentId: string) => {
  if (!twilioClient) {
    throw new Error('Twilio client not initialized');
  }

  try {
    // Generate TwiML to join the conference
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference
      beep="false"
      startConferenceOnEnter="true"
      endConferenceOnExit="true"
    >${conferenceName}</Conference>
  </Dial>
</Response>`;

    console.log(`Agent ${agentId} joining conference: ${conferenceName}`);
    
    return {
      conferenceName,
      twiml,
      message: 'Agent can join conference via WebRTC'
    };
  } catch (error) {
    console.error('Error joining conference:', error);
    throw error;
  }
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
 * Generate TwiML for outbound call
 */
export const generateCallTwiML = (to: string, from: string): string => {
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Dial the number - simplified without recording for now
  const dial = twiml.dial({
    callerId: from,
    // Removed recording options to avoid callback issues during initial testing
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
  initiateCall,
  endCall,
  getCallDetails,
  sendDTMF,
  generateCallTwiML,
  getCallRecordings,
  updateCallMetadata,
};
