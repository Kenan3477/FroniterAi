/**
 * Dialer API Service
 * Handles all communication with backend Twilio endpoints
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

export interface InitiateCallParams {
  to: string;
  from: string;
  agentId: string;
  customerInfo?: any;
}

export interface EndCallParams {
  callSid: string;
  duration: number;
  status: string;
  disposition?: string;
  customerInfo?: any;
}

export interface DTMFParams {
  callSid: string;
  digits: string;
}

/**
 * Generate Twilio access token for WebRTC
 */
export const generateToken = async (agentId: string): Promise<{ token: string; identity: string }> => {
  const response = await fetch(`${BACKEND_URL}/api/calls/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ agentId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate token');
  }

  const data = await response.json();
  return data.data;
};

/**
 * Initiate an outbound call
 */
export const initiateCall = async (params: InitiateCallParams): Promise<any> => {
  const response = await fetch(`${BACKEND_URL}/api/calls/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to initiate call');
  }

  const data = await response.json();
  return data.data;
};

/**
 * End an active call
 */
export const endCall = async (params: EndCallParams): Promise<any> => {
  const response = await fetch(`${BACKEND_URL}/api/calls/end`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to end call');
  }

  const data = await response.json();
  return data.data;
};

/**
 * Get call details
 */
export const getCallDetails = async (callSid: string): Promise<any> => {
  const response = await fetch(`${BACKEND_URL}/api/calls/${callSid}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get call details');
  }

  const data = await response.json();
  return data.data;
};

/**
 * Send DTMF tones
 */
export const sendDTMF = async (params: DTMFParams): Promise<any> => {
  const response = await fetch(`${BACKEND_URL}/api/calls/dtmf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send DTMF');
  }

  const data = await response.json();
  return data.data;
};

/**
 * Get call recordings
 */
export const getCallRecordings = async (callSid: string): Promise<any[]> => {
  const response = await fetch(`${BACKEND_URL}/api/calls/${callSid}/recordings`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get recordings');
  }

  const data = await response.json();
  return data.data;
};

export default {
  generateToken,
  initiateCall,
  endCall,
  getCallDetails,
  sendDTMF,
  getCallRecordings,
};
