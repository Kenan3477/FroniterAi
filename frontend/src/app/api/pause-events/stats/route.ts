import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';

// Helper function to get authentication token
function getAuthToken(request: NextRequest): string | null {
  // Check for auth cookie first (most reliable)
  const authToken = request.cookies.get('auth-token')?.value;
  
  if (authToken) {
    console.log('✅ Using cookie token for pause events stats authentication');
    return authToken;
  }
  
  // Try authorization header as fallback
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('✅ Using header token for pause events stats authentication');
    return authHeader.substring(7);
  }
  
  console.log('❌ No authentication token found for pause events stats');
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // ✅ AUTHENTICATION: Get and validate auth token
    const authToken = getAuthToken(request);
    if (!authToken) {
      console.log('❌ No auth token found for pause events stats request');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('🔍 Pause Events Stats - Auth Debug:', {
      hasAuthToken: !!authToken,
      tokenPrefix: authToken.substring(0, 20) + (authToken.length > 20 ? '...' : ''),
      queryParams: queryString,
      isLocalToken: authToken.startsWith('temp_local_token_')
    });
    
    // ✅ LOCAL DEVELOPMENT: Check for temp local token for development  
    if (authToken.includes('temp_local_token_')) {
      console.log('✅ Using local bypass for pause events stats');
      
      // Return mock pause events stats
      return NextResponse.json({
        success: true,
        data: {
          stats: {
            totalEvents: 3,
            totalDuration: 4500, // 75 minutes in seconds
            averageDuration: 1500, // 25 minutes
            byReason: {
              'Lunch Break': { count: 1, totalDuration: 1800 },
              'Coffee Break': { count: 1, totalDuration: 900 },
              'Team Meeting': { count: 1, totalDuration: 900 }
            },
            byCategory: {
              'scheduled': { count: 2, totalDuration: 2700 },
              'personal': { count: 1, totalDuration: 900 }
            },
            byAgent: {
              'Test Agent': { count: 3, totalDuration: 4500 }
            },
            byDate: {
              '2026-02-24': { count: 3, totalDuration: 4500 }
            }
          }
        }
      });
    }
    
    // ✅ PRODUCTION: Call Railway backend with real authentication
    console.log('🔗 Calling Railway backend for pause events stats');
    const backendUrl = `${BACKEND_URL}/api/pause-events/stats${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend pause events stats error:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch pause events statistics from backend' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Successfully fetched pause events stats from backend');
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Pause events stats proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}