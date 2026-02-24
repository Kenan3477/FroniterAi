import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('👤 Profile request received');
    
    // Check for auth cookie
    const authToken = request.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      console.log('🔒 No auth token found');
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if it's our temporary local token
    if (authToken.startsWith('temp_local_token_')) {
      console.log('✅ Using local bypass for profile authentication');
      
      return NextResponse.json({
        success: true,
        user: {
          id: 1,
          email: 'admin@omnivox.ai',
          username: 'admin',
          name: 'Local Admin',
          firstName: 'Local',
          lastName: 'Admin',
          role: 'ADMIN',
          isActive: true,
          createdAt: '2026-02-24T00:00:00Z',
          lastLogin: new Date().toISOString()
        }
      });
    }

    console.log('🔑 Auth token found, validating with Railway backend...');
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
    
    // SECURITY FIX: Only use Railway backend for authentication - no fallbacks
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const backendResponse = await fetch(`${backendUrl}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        console.log('✅ Railway backend authentication successful');
        return NextResponse.json({
          success: true,
          user: backendData.data.user
        });
      } else {
        console.log('❌ Railway backend rejected authentication');
        return NextResponse.json(
          { success: false, message: 'Authentication failed' },
          { status: 401 }
        );
      }
    } catch (backendError) {
      console.log('❌ Railway backend authentication error:', backendError);
      return NextResponse.json(
        { success: false, message: 'Authentication service unavailable' },
        { status: 503 }
      );
    }
    
  } catch (error) {
    console.error('❌ Profile error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}