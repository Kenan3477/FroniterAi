import { NextRequest, NextResponse } from 'next/server';
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
  
  // Try cookies from request headers
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const authTokenMatch = cookieHeader.match(/auth-token=([^;]+)/) || cookieHeader.match(/authToken=([^;]+)/);
    if (authTokenMatch && authTokenMatch[1]) {
      return authTokenMatch[1];
    }
  }
  
  // Fallback to Next.js cookies API
  const cookieStore = cookies();
  let authCookie = cookieStore.get('auth-token') || cookieStore.get('authToken');
  if (authCookie?.value) {
    return authCookie.value;
  }
  
  return null;
}

// GET - Get current user's assigned inbound queues
export async function GET(request: NextRequest) {
  try {
    console.log('🔗 Fetching current user\'s assigned inbound queues...');
    
    // Get authentication token
    const authToken = getAuthToken(request);
    console.log('🍪 Auth token for queues:', authToken ? 'EXISTS' : 'MISSING');
    
    if (!authToken) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }

    // Check if it's our temporary local token
    if (authToken.startsWith('temp_local_token_')) {
      console.log('✅ Using local bypass for user assigned queues');
      
      // Return empty array for now - no queues assigned to temp users
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No inbound queues assigned to this user'
      });
    }

    // Make request to backend to get current user's assigned queues
    console.log('🔗 Making backend request for user queues...');
    const response = await fetch(`${BACKEND_URL}/api/users/my-inbound-queues`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      // If the endpoint doesn't exist yet, return empty array
      if (response.status === 404) {
        console.log('📋 Backend endpoint not implemented yet, returning empty queues');
        return NextResponse.json({
          success: true,
          data: [],
          message: 'No inbound queues assigned to this user'
        });
      }
      
      const errorData = await response.text();
      console.error(`❌ Backend request failed: ${response.status}`, errorData);
      return NextResponse.json({ 
        success: false, 
        message: `Failed to fetch user inbound queues: ${response.status}` 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Successfully fetched current user inbound queues from backend');
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error fetching current user inbound queues:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}