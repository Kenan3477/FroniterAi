import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

// Helper function to get authentication token
function getAuthToken(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try cookies from request headers
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const authTokenMatch = cookieHeader.match(/auth-token=([^;]+)/);
    if (authTokenMatch && authTokenMatch[1]) {
      return authTokenMatch[1];
    }
  }
  
  // Fallback to Next.js cookies API
  const cookieStore = cookies();
  const authCookie = cookieStore.get('auth-token');
  if (authCookie?.value) {
    return authCookie.value;
  }
  
  return null;
}

// GET - Get current user's campaign assignments
export async function GET(request: NextRequest) {
  try {
    console.log('🔗 Fetching current user\'s assigned campaigns...');
    
    // Get authentication token
    const authToken = getAuthToken(request);
    console.log('🍪 Auth token:', authToken ? 'EXISTS' : 'MISSING');
    
    if (!authToken) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }

    // First, decode the token to get user ID (or let backend handle it)
    // Make request to backend to get current user's campaigns
    const response = await fetch(`${BACKEND_URL}/api/users/my-campaigns`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Backend request failed: ${response.status}`, errorData);
      return NextResponse.json({ 
        success: false, 
        message: `Failed to fetch user campaigns: ${response.status}` 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Successfully fetched current user campaigns from backend');
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error fetching current user campaigns:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch user campaigns'
    }, { status: 500 });
  }
}