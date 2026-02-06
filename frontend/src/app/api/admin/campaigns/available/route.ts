import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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

// GET - Get all campaigns available for assignment
export async function GET(request: NextRequest) {
  try {
    console.log('🔗 Proxying available campaigns request to backend...');
    
    // Get authentication token from header or cookie
    const authToken = getAuthToken(request);
    
    const response = await fetch(`${BACKEND_URL}/api/user-management/campaigns/available`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Backend request failed: ${response.status}`, errorData);
      return NextResponse.json({ 
        success: false, 
        message: `Backend request failed: ${response.status}` 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log(`✅ Successfully fetched available campaigns from backend`);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error proxying available campaigns request:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch available campaigns'
    }, { status: 500 });
  }
}