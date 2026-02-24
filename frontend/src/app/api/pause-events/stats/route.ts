import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Check for both Authorization header and cookie-based authentication
    const authHeader = request.headers.get('Authorization') || '';
    const authCookie = request.cookies.get('auth-token')?.value || '';
    
    if (authHeader.includes('temp_local_token_') || authCookie.includes('temp_local_token_')) {
      console.log('✅ Using local bypass for pause events stats');
      
      // Return mock pause events stats
      return NextResponse.json({
        success: true,
        stats: {
          totalEvents: 3,
          totalDuration: 4500, // 75 minutes in seconds
          averageDuration: 1500, // 25 minutes
          byReason: {
            'Break': { count: 1, totalDuration: 900 },
            'Lunch': { count: 1, totalDuration: 1800 },
            'Meeting': { count: 1, totalDuration: 1800 }
          },
          byAgent: {
            'Test Agent': { count: 3, totalDuration: 4500 }
          },
          byDate: {
            '2026-02-24': { count: 3, totalDuration: 4500 }
          }
        }
      });
    }
    
    const backendUrl = `${BACKEND_URL}/api/pause-events/stats${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch pause events statistics' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Pause events stats proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}