import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';

const RAILWAY_BACKEND_URL = process.env.RAILWAY_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export const POST = requireAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { callId, agentId, action } = body;

    // Input validation
    if (!callId || !agentId || !action) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: callId, agentId, action' 
        },
        { status: 400 }
      );
    }

    // Validate action type
    if (!['hold', 'unhold'].includes(action)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid action. Must be: hold or unhold' 
        },
        { status: 400 }
      );
    }

    console.log('📞 Processing call hold operation:', {
      callId,
      agentId,
      action,
      userId: user.userId
    });

    // Forward to Railway backend for Twilio call modification
    const backendUrl = `${RAILWAY_BACKEND_URL}/api/calls/hold`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token`,
        'User-ID': user.userId.toString(),
      },
      body: JSON.stringify({
        callId,
        agentId,
        action,
        userId: user.userId,
        userEmail: user.email,
        userRole: user.role,
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      console.error('❌ Backend call hold operation failed:', response.status, response.statusText);
      const errorData = await response.json().catch(() => ({ error: 'Unknown backend error' }));
      
      return NextResponse.json(
        { 
          success: false,
          error: `Hold operation failed: ${errorData.error || response.statusText}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log(`✅ Call ${action} operation processed successfully:`, data);
    
    // Ensure response includes success flag and current hold state
    return NextResponse.json({
      success: true,
      message: `Call ${action === 'hold' ? 'placed on hold' : 'resumed'} successfully`,
      data: {
        callId,
        action,
        agentId,
        isOnHold: action === 'hold',
        timestamp: new Date().toISOString(),
        ...data
      }
    });

  } catch (error) {
    console.error('❌ Error in call hold API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error during call hold operation' 
      },
      { status: 500 }
    );
  }
});