import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';

// Helper function to get authentication token
function getAuthToken(request: NextRequest): string | null {
  // Check for auth cookie first (most reliable)
  const authToken = request.cookies.get('auth-token')?.value;
  
  if (authToken) {
    console.log('✅ Using cookie token for pause events authentication');
    return authToken;
  }
  
  // Try authorization header as fallback
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('✅ Using header token for pause events authentication');
    return authHeader.substring(7);
  }
  
  console.log('❌ No authentication token found for pause events');
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // ✅ AUTHENTICATION: Get and validate auth token
    const authToken = getAuthToken(request);
    if (!authToken) {
      console.log('❌ No auth token found for pause events request');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('🔍 Pause Events - Auth Debug:', {
      hasAuthToken: !!authToken,
      tokenPrefix: authToken.substring(0, 20) + (authToken.length > 20 ? '...' : ''),
      queryParams: queryString,
      isLocalToken: authToken.startsWith('temp_local_token_')
    });
    
    // ✅ LOCAL DEVELOPMENT: Check for temp local token for development
    if (authToken.includes('temp_local_token_')) {
      console.log('✅ Using local bypass for pause events');
      
      // Return mock pause events data for development
      return NextResponse.json({
        success: true,
        data: {
          pauseEvents: [
            {
              id: 'mock_1',
              agentId: '1',
              agentName: 'Test Agent',
              eventType: 'break',
              pauseReason: 'Lunch Break',
              pauseCategory: 'scheduled',
              startTime: '2026-02-24T12:00:00Z',
              endTime: '2026-02-24T12:30:00Z',
              duration: 1800,
              createdAt: '2026-02-24T12:00:00Z',
              agent: {
                agentId: '1',
                firstName: 'Test',
                lastName: 'Agent',
                email: 'test.agent@omnivox.ai'
              }
            },
            {
              id: 'mock_2',
              agentId: '1',
              agentName: 'Test Agent',
              eventType: 'break',
              pauseReason: 'Coffee Break',
              pauseCategory: 'personal',
              startTime: '2026-02-24T10:15:00Z',
              endTime: '2026-02-24T10:30:00Z',
              duration: 900,
              createdAt: '2026-02-24T10:15:00Z',
              agent: {
                agentId: '1',
                firstName: 'Test',
                lastName: 'Agent',
                email: 'test.agent@omnivox.ai'
              }
            },
            {
              id: 'mock_3',
              agentId: '1',
              agentName: 'Test Agent',
              eventType: 'break',
              pauseReason: 'Team Meeting',
              pauseCategory: 'scheduled',
              startTime: '2026-02-24T14:00:00Z',
              endTime: '2026-02-24T14:15:00Z',
              duration: 900,
              createdAt: '2026-02-24T14:00:00Z',
              agent: {
                agentId: '1',
                firstName: 'Test',
                lastName: 'Agent',
                email: 'test.agent@omnivox.ai'
              }
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 3,
            totalPages: 1
          }
        }
      });
    }
    
    // ✅ PRODUCTION: Call Railway backend with real authentication
    console.log('🔗 Calling Railway backend for pause events');
    const backendUrl = `${BACKEND_URL}/api/pause-events${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend pause events error:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch pause events from backend' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Successfully fetched pause events from backend');
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Pause events proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/pause-events`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to create pause event' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Pause events creation proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}