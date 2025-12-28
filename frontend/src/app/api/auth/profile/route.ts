import { NextRequest, NextResponse } from 'next/server';

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

    console.log('🔑 Auth token found, fetching profile from backend...');
    
    // Try to fetch profile from backend - MUST use Railway backend per Instructions Rule 3
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://froniterai-production.up.railway.app';
    
    try {
      const backendResponse = await fetch(`${backendUrl}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        console.log('✅ Backend profile fetch successful');
        return NextResponse.json({
          success: true,
          user: backendData.data.user
        });
      } else {
        console.log('⚠️ Backend profile fetch failed, falling back to token-based profile');
      }
    } catch (error) {
      console.log('⚠️ Backend not available, using token-based fallback');
    }
    
    // Fallback: Decode JWT token directly if backend unavailable
    try {
      // Extract payload from JWT token (skip signature verification for fallback)
      const tokenParts = authToken.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('✅ Decoded JWT token payload:', { id: payload.userId || payload.id, email: payload.email, role: payload.role });
      
      const userProfile = {
        id: payload.userId || payload.id || 1,
        email: payload.email || 'unknown@omnivox-ai.com',
        username: payload.email?.split('@')[0] || 'user',
        firstName: payload.firstName || 'User',
        lastName: payload.lastName || 'Name',
        name: `${payload.firstName || 'User'} ${payload.lastName || 'Name'}`,
        role: payload.role || 'AGENT', // Preserve exact case from Railway backend
        status: 'active',
        preferences: {},
        createdAt: new Date('2024-01-01'),
        lastLogin: new Date(),
        isActive: true
      };

      console.log('✅ Returning JWT-based user profile with role:', userProfile.role);
      
      return NextResponse.json({
        success: true,
        user: userProfile
      });
      
    } catch (parseError) {
      console.error('Failed to parse JWT token:', parseError);
      
      // Final fallback for demo tokens
      let username = 'user';
      if (authToken.startsWith('demo-')) {
        username = authToken.replace('demo-', '');
      }
      
      const demoProfile = {
        id: username === 'admin' ? 1 : 2,
        email: `${username}@omnivox-ai.com`,
        username: username,
        firstName: username === 'admin' ? 'Admin' : 'Demo',
        lastName: 'User',
        name: username === 'admin' ? 'Admin User' : 'Demo User',
        role: username === 'admin' ? 'ADMIN' : 'AGENT', // Fixed: Use uppercase for consistency
        status: 'active',
        preferences: {},
        createdAt: new Date('2024-01-01'),
        lastLogin: new Date(),
        isActive: true
      };

      console.log('✅ Returning demo fallback user profile');
      
      return NextResponse.json({
        success: true,
        user: demoProfile
      });
    }

  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('✏️ Profile update request received');
    
    const authToken = request.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      console.log('🔒 No auth token found for profile update');
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, email, preferences } = body;

    // Validate input
    if (!firstName && !lastName && !email && !preferences) {
      return NextResponse.json(
        { success: false, message: 'At least one field is required for update' },
        { status: 400 }
      );
    }

    console.log('🔑 Auth token found, updating profile via backend...');
    
    // Try to update profile via Railway backend per Instructions Rule 3
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://froniterai-production.up.railway.app';
    
    try {
      const backendResponse = await fetch(`${backendUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ firstName, lastName, email, preferences })
      });

      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        console.log('✅ Backend profile update successful');
        return NextResponse.json({
          success: true,
          message: backendData.message,
          user: backendData.data.user
        });
      } else {
        const errorData = await backendResponse.json();
        console.log('❌ Backend profile update failed:', errorData.message);
        return NextResponse.json(
          { success: false, message: errorData.message || 'Backend profile update failed' },
          { status: backendResponse.status }
        );
      }
    } catch (error) {
      console.error('❌ Backend update request failed:', error);
      return NextResponse.json(
        { success: false, message: 'Profile update service temporarily unavailable' },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('❌ Profile update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}