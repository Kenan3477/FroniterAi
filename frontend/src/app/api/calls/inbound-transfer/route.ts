import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';

const RAILWAY_BACKEND_URL = process.env.RAILWAY_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export const POST = requireAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { callId, transferType, targetId, targetName, agentId } = body;

    // Input validation
    if (!callId || !transferType || !targetId || !agentId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: callId, transferType, targetId, agentId' 
        },
        { status: 400 }
      );
    }

    // Validate transfer type for inbound calls (more restrictive)
    if (!['queue', 'agent'].includes(transferType)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid transfer type for inbound call. Must be: queue or agent' 
        },
        { status: 400 }
      );
    }

    console.log('📞 Processing inbound call transfer request:', {
      callId,
      transferType,
      targetId,
      targetName,
      agentId,
      userId: user.userId
    });

    // Forward to Railway backend for inbound call transfer processing
    const backendUrl = `${RAILWAY_BACKEND_URL}/api/calls/inbound-transfer`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token`,
        'User-ID': user.userId.toString(),
      },
      body: JSON.stringify({
        callId,
        transferType,
        targetId,
        targetName: targetName || targetId,
        agentId,
        userId: user.userId,
        userEmail: user.email,
        userRole: user.role,
        callDirection: 'inbound',
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      console.error('❌ Backend inbound call transfer failed:', response.status, response.statusText);
      const errorData = await response.json().catch(() => ({ error: 'Unknown backend error' }));
      
      return NextResponse.json(
        { 
          success: false,
          error: `Inbound transfer failed: ${errorData.error || response.statusText}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('✅ Inbound call transfer processed successfully:', data);
    
    // Ensure response includes success flag
    return NextResponse.json({
      success: true,
      message: `Inbound call successfully transferred to ${transferType}: ${targetName || targetId}`,
      data: {
        callId,
        transferType,
        targetId,
        targetName: targetName || targetId,
        callDirection: 'inbound',
        timestamp: new Date().toISOString(),
        ...data
      }
    });

  } catch (error) {
    console.error('❌ Error in inbound call transfer API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error during inbound call transfer' 
      },
      { status: 500 }
    );
  }
});