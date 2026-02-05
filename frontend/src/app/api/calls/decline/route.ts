import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';

const RAILWAY_BACKEND_URL = process.env.RAILWAY_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export const POST = requireAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { callId, agentId, reason, timestamp } = body;

    if (!callId || !agentId) {
      return NextResponse.json(
        { error: 'Call ID and Agent ID are required' },
        { status: 400 }
      );
    }

    console.log('📞 Processing call decline notification:', {
      callId,
      agentId,
      reason: reason || 'agent_declined',
      userId: user.userId
    });

    // Forward to Railway backend for call state management
    const backendUrl = `${RAILWAY_BACKEND_URL}/api/calls/decline`;
    
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
        userId: user.userId,
        reason: reason || 'agent_declined',
        timestamp: timestamp || new Date().toISOString(),
        userEmail: user.email,
        userRole: user.role
      }),
    });

    if (!response.ok) {
      console.error('❌ Backend call decline failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to process call decline' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('✅ Call decline processed successfully');
    return NextResponse.json({
      success: true,
      message: 'Call decline processed successfully',
      data
    });

  } catch (error) {
    console.error('❌ Error in call decline API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});