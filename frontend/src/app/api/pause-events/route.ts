import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Debug logging for authentication
    const authHeader = request.headers.get('Authorization') || '';
    const authCookie = request.cookies.get('auth-token')?.value || '';
    
    console.log('🔍 Pause Events - Auth Debug:', {
      hasAuthHeader: !!authHeader,
      authHeaderValue: authHeader.substring(0, 20) + (authHeader.length > 20 ? '...' : ''),
      hasAuthCookie: !!authCookie,
      authCookieValue: authCookie.substring(0, 20) + (authCookie.length > 20 ? '...' : ''),
      allCookies: Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value.substring(0, 10) + '...'])),
      cookieHeader: request.headers.get('cookie'),
      authorizationHeader: request.headers.get('authorization')
    });
    
    // Check for both Authorization header and cookie-based authentication
    if (authHeader.includes('temp_local_token_') || authCookie.includes('temp_local_token_')) {
      console.log('✅ Using local bypass for pause events');
      
      // Return mock pause events data
      return NextResponse.json({
        success: true,
        data: [
          {
            id: 1,
            agentId: 1,
            agentName: 'Test Agent',
            reason: 'Break',
            startTime: '2026-02-24T10:00:00Z',
            endTime: '2026-02-24T10:15:00Z',
            duration: 900,
            createdAt: '2026-02-24T10:00:00Z'
          },
          {
            id: 2,
            agentId: 1,
            agentName: 'Test Agent',
            reason: 'Lunch',
            startTime: '2026-02-24T12:00:00Z',
            endTime: '2026-02-24T12:30:00Z',
            duration: 1800,
            createdAt: '2026-02-24T12:00:00Z'
          },
          {
            id: 3,
            agentId: 1,
            agentName: 'Test Agent',
            reason: 'Meeting',
            startTime: '2026-02-24T14:00:00Z',
            endTime: '2026-02-24T14:30:00Z',
            duration: 1800,
            createdAt: '2026-02-24T14:00:00Z'
          }
        ],
        total: 3,
        page: 1,
        limit: 10
      });
    }
    
    const backendUrl = `${BACKEND_URL}/api/pause-events${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch pause events' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Pause events proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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