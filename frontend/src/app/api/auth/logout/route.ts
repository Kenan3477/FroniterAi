import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔓 Logout request received');

    // Get auth token and session ID from cookies  
    const authToken = request.cookies.get('auth-token')?.value;
    const sessionId = request.cookies.get('session-id')?.value;

    // Capture logout metadata
    const logoutTime = new Date().toISOString();
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'Unknown';

    if (authToken) {
      console.log('🔑 Found auth token, notifying backend with session tracking...');
      console.log('📊 Session info:', {
        sessionId: sessionId || 'UNKNOWN',
        logoutTime,
        userAgent,
        ip
      });
      
      // Notify backend of logout with comprehensive session tracking
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';
      
      try {
        const backendResponse = await fetch(`${backendUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            sessionId: sessionId || null,
            logoutMetadata: {
              logoutTime,
              userAgent,
              ipAddress: ip,
              logoutMethod: 'manual',
              source: 'frontend'
            }
          }),
        });
        
        if (backendResponse.ok) {
          const logoutData = await backendResponse.json();
          console.log('✅ Backend logout successful with session tracking:', logoutData);
        } else {
          console.log('⚠️ Backend logout failed, but continuing local logout');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log('⚠️ Backend not available, continuing local logout:', errorMessage);
      }
    } else {
      console.log('⚠️ No auth token found - user may have already logged out');
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear the auth-token cookie with multiple attempts
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // This will delete the cookie
      path: '/'
    });

    // Clear the session-id cookie
    response.cookies.set('session-id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    // Additional clearing with different attributes
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    // Clear session-id with different attributes too
    response.cookies.set('session-id', '', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    // Clear with expires date in the past
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0),
      path: '/'
    });

    response.cookies.set('session-id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0),
      path: '/'
    });

    // Also clear legacy cookies just in case
    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });
    response.cookies.set('accessToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    console.log('✅ Logout successful, cookies cleared');
    return response;

  } catch (error) {
    console.error('❌ Logout error:', error);
    
    // Even if there's an error, try to clear cookies
    const response = NextResponse.json(
      { success: true, message: 'Logged out (with cleanup errors)' },
      { status: 200 } // Return 200 to ensure logout proceeds
    );

    // Clear the main auth-token cookie with multiple attempts
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    // Additional clearing with different attributes
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    // Clear with expires date in the past
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0),
      path: '/'
    });

    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    response.cookies.set('accessToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    return response;
  }
}