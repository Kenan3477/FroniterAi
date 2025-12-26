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
  
  // Try cookies
  const cookieStore = cookies();
  const authCookie = cookieStore.get('auth-token');
  if (authCookie?.value) {
    return authCookie.value;
  }
  
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const authToken = getAuthToken(request);
    
    const response = await fetch(`${BACKEND_URL}/api/admin/users/stats`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    });
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { 
        total: 0,
        active: 0,
        inactive: 0,
        suspended: 0,
        byRole: {
          ADMIN: 0,
          MANAGER: 0,
          AGENT: 0,
          VIEWER: 0
        }
      },
      { status: 200 }
    );
  }
}