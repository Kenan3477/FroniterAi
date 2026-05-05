// Dialer API service — used by BackendDialer / DialPadModal.
// Outbound initiation must go through the Next.js proxy (`/api/calls/call-rest-api`),
// not straight to `${NEXT_PUBLIC_BACKEND_URL}/api/calls/call-rest-api` (that path does not exist on Express).

export interface InitiateCallParams {
  to: string;
  from?: string;
  agentId: string;
  customerInfo?: any;
}

export interface EndCallParams {
  callSid?: string | null;
  callId?: string;
  duration?: number;
  status?: string;
  customerInfo?: any;
  disposition?: string;
  notes?: string;
}

export interface SendDTMFParams {
  callSid?: string | null;
  callId?: string;
  digits: string;
}

export interface CallResponse {
  success: boolean;
  callId?: string;
  callSid?: string;
  message?: string;
  error?: string;
}

// DNC Check and Call Initiation - Production implementation
export async function initiateCall(params: InitiateCallParams): Promise<CallResponse> {
  try {
    console.log('📞 Starting call initiation process:', params);
    
    // Step 1: Check DNC (Do Not Call) list first
    console.log('🔍 Checking DNC status for number:', params.to);
    
    const bearer =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('authToken') ||
          localStorage.getItem('omnivox_token') ||
          '')) ||
      '';

    const dncBase =
      (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_BACKEND_URL) ||
      '';
    const dncUrl = dncBase
      ? `${dncBase.replace(/\/+$/, '')}/api/admin/dnc/check`
      : '/api/admin/dnc/check';

    const dncCheckResponse = await fetch(dncUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify({ phoneNumber: params.to })
    });
    
    if (!dncCheckResponse.ok) {
      console.error('❌ DNC check failed with status:', dncCheckResponse.status);
      throw new Error(`DNC check failed: ${dncCheckResponse.status}`);
    }
    
    const dncResult = await dncCheckResponse.json();
    
    if (!dncResult.success) {
      console.error('❌ DNC check API error:', dncResult.error);
      return {
        success: false,
        error: `DNC check failed: ${dncResult.error || 'Unable to verify Do Not Call status'}`
      };
    }
    
    if (dncResult.isBlocked) {
      console.log('🚫 Call BLOCKED - Number is on DNC list:', dncResult.dncEntry);
      return {
        success: false,
        error: `Call blocked: This number (${params.to}) is on the Do Not Call list.\nReason: ${dncResult.dncEntry?.reason || 'Customer request'}\nAdded: ${dncResult.dncEntry?.createdAt ? new Date(dncResult.dncEntry.createdAt).toLocaleDateString() : 'Unknown'}`
      };
    }
    
    console.log('✅ DNC check passed, proceeding with call initiation');
    
    // Step 2: Next.js API route proxies to Railway `/api/calls/rest-api` with correct auth/cookies.
    console.log('📞 Initiating call via /api/calls/call-rest-api proxy');

    const dialCorrelationId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `dc-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

    const response = await fetch('/api/calls/call-rest-api', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify({ 
        to: params.to,
        from: params.from,
        agentId: params.agentId,
        customerInfo: params.customerInfo,
        dialCorrelationId,
      })
    });
    
    const responseText = await response.text();
    let result: any = {};
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      result = {
        success: false,
        error:
          responseText?.slice(0, 300) ||
          `Call service returned non-JSON (HTTP ${response.status})`,
      };
    }
    
    if (result.success) {
      console.log('✅ Call initiated successfully via backend API');
      return {
        success: true,
        callId: result.callId,
        callSid: result.callSid,
        message: result.message || 'Call initiated successfully'
      };
    } else {
      console.error('❌ Backend call initiation failed:', result.error);
      return {
        success: false,
        error: result.error || 'Failed to initiate call'
      };
    }
  } catch (error) {
    console.error('❌ Error calling backend API to initiate call:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate call'
    };
  }
}

export async function endCall(params: EndCallParams): Promise<CallResponse> {
  try {
    console.log('📞 Ending call via backend API:', params);
    
    // Make real API call to backend
    const response = await fetch('/api/dialer/end', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({ 
        callSid: params.callSid,
        duration: params.duration,
        status: params.status || 'completed',
        disposition: params.disposition,
        customerInfo: params.customerInfo
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Call ended successfully via backend API');
      return {
        success: true,
        message: result.message || 'Call ended successfully'
      };
    } else {
      console.error('❌ Backend call end failed:', result.error);
      return {
        success: false,
        error: result.error || 'Failed to end call'
      };
    }
  } catch (error) {
    console.error('❌ Error calling backend API to end call:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to end call'
    };
  }
}

export async function sendDTMF(params: SendDTMFParams): Promise<CallResponse> {
  try {
    // TODO: Implement actual DTMF sending via backend API
    console.log('Sending DTMF:', params);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      success: true,
      message: 'DTMF sent successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send DTMF'
    };
  }
}