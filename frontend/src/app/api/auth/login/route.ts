import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json();
    const loginIdentifier = email || username;

    console.log('🔐 Frontend API: Login attempt for:', loginIdentifier);

    // Temporary bypass for testing - check if it's the local admin
    if (loginIdentifier === 'admin@omnivox.ai' && password === 'admin123') {
      console.log('✅ Using temporary local admin bypass');
      
      const mockUser = {
        id: 1,
        email: 'admin@omnivox.ai',
        username: 'admin',
        name: 'Local Admin',
        firstName: 'Local',
        lastName: 'Admin', 
        role: 'ADMIN',
        isActive: true
      };

      const mockToken = 'temp_local_token_' + Date.now();

      const response = NextResponse.json({
        success: true,
        user: mockUser,
        token: mockToken,
        sessionId: 'local_session_' + Date.now(),
        loginTime: new Date().toISOString(),
        message: 'Authentication successful (local bypass)'
      });

      // Set auth cookie
      response.cookies.set('auth-token', mockToken, {
        httpOnly: true,
        secure: false, // Set to false for localhost
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 // 24 hours
      });

      return response;
    }

    // For non-local admin, try backend connection
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'Unknown';

    // Connect to backend authentication instead of using demo credentials
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
    
    console.log('🔐 Attempting backend authentication for:', loginIdentifier);
    console.log('📡 Backend URL:', `${backendUrl}/api/auth/login`);
    
    const backendResponse = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: loginIdentifier, 
        password
      }),
    });

    console.log('📡 Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      console.log('❌ Backend authentication failed');
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const backendData = await backendResponse.json();
    console.log('📦 Backend response data:', backendData);
    
    // Generate unique session identifier for this login
    const sessionId = backendData.data.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create response using backend data with enhanced session tracking
    const response = NextResponse.json({
      success: true,
      user: backendData.data.user,
      token: backendData.data.token, // Include token for localStorage storage
      sessionId: sessionId, // Include session ID for logout tracking
      loginTime: new Date().toISOString(),
      message: 'Authentication successful'
    });

    // Set secure cookie with backend token
    const isProduction = process.env.NODE_ENV === 'production';
    
    console.log('🍪 Setting auth-token cookie:', {
      token: backendData.data.token ? 'EXISTS' : 'NULL',
      sessionId: backendData.data.sessionId || 'NULL',
      isProduction,
      tokenLength: backendData.data.token?.length || 0
    });
    
    response.cookies.set('auth-token', backendData.data.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    // Also store sessionId in a cookie for logout tracking
    if (backendData.data.sessionId) {
      response.cookies.set('session-id', backendData.data.sessionId, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 // 24 hours
      });
    }

    console.log('✅ Backend authentication successful for:', backendData.data.user.name);
    return response;

  } catch (error) {
    console.error('❌ Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error details:', errorMessage);
    return NextResponse.json(
      { error: 'Login failed', details: errorMessage },
      { status: 500 }
    );
  }
}
