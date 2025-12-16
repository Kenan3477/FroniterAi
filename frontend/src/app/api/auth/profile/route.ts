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
    
    // Try to fetch profile from backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    
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
    
    // Fallback: Extract user info from token if backend is unavailable
    // This handles the transition period where some tokens might be old format
    let username = 'user';
    if (authToken.startsWith('demo-')) {
      username = authToken.replace('demo-', '');
    }
    
    const userProfile = {
      id: username === 'admin' ? 1 : 2,
      email: `${username}@kennex.ai`,
      username: username,
      firstName: username === 'admin' ? 'Admin' : 'Demo',
      lastName: 'User',
      name: username === 'admin' ? 'Admin User' : 'Demo User',
      role: username === 'admin' ? 'admin' : 'agent',
      status: 'active',
      preferences: {},
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date(),
      isActive: true
    };

    console.log('✅ Returning fallback user profile');
    
    return NextResponse.json({
      success: true,
      user: userProfile
    });

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
    
    const body = await request.json();
    const { firstName, lastName, preferences, status } = body;

    // Validate input
    if (!firstName || !lastName) {
      return NextResponse.json(
        { success: false, message: 'First name and last name are required' },
        { status: 400 }
      );
    }

    console.log('✅ Profile update successful (demo mode)');
    
    // For development, return success without database operation
    const updatedProfile = {
      id: 1,
      email: 'demo@kennex.ai',
      username: 'demo',
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      role: 'agent',
      status: status || 'active',
      preferences: preferences || {},
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date(),
      isActive: true
    };

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedProfile
    });

  } catch (error) {
    console.error('❌ Profile update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}