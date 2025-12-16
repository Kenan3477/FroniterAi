import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔓 Logout request received');

    // Get auth token from cookie  
    const authToken = request.cookies.get('auth-token')?.value;

    if (authToken) {
      console.log('🔑 Found auth token, notifying backend...');
      
      // Notify backend of logout (optional - for session cleanup)
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      
      try {
        const backendResponse = await fetch(`${backendUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
        });
        
        if (backendResponse.ok) {
          console.log('✅ Backend logout successful');
        } else {
          console.log('⚠️ Backend logout failed, but continuing local logout');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log('⚠️ Backend not available, continuing local logout:', errorMessage);
      }
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear the auth-token cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // This will delete the cookie
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

    // Clear the main auth-token cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
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