import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('💓 Session heartbeat received');

    const { sessionId, lastActivity } = await request.json();
    const authToken = request.cookies.get('auth-token')?.value;

    if (!authToken) {
      console.log('❌ No auth token found for heartbeat');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!sessionId) {
      console.log('❌ No session ID provided for heartbeat');
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Update backend with session activity
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';
    
    try {
      const backendResponse = await fetch(`${backendUrl}/api/session/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sessionId,
          lastActivity,
          heartbeatTime: new Date().toISOString()
        }),
      });
      
      if (backendResponse.ok) {
        const heartbeatData = await backendResponse.json();
        console.log('✅ Backend session heartbeat successful:', heartbeatData);
        
        return NextResponse.json({
          success: true,
          message: 'Session activity updated',
          sessionId,
          lastActivity
        });
      } else {
        console.log('⚠️ Backend heartbeat failed, but continuing');
        
        return NextResponse.json({
          success: true,
          message: 'Session activity logged locally',
          sessionId,
          lastActivity
        });
      }
    } catch (error) {
      console.log('⚠️ Backend not available for heartbeat:', error);
      
      // Still return success for local tracking
      return NextResponse.json({
        success: true,
        message: 'Session activity logged locally (backend unavailable)',
        sessionId,
        lastActivity
      });
    }

  } catch (error) {
    console.error('❌ Session heartbeat error:', error);
    return NextResponse.json(
      { error: 'Heartbeat failed' },
      { status: 500 }
    );
  }
}