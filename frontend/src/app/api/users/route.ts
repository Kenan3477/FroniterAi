import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Users proxy - Forwarding request to backend:', `${BACKEND_URL}/api/users`);
    
    const response = await fetch(`${BACKEND_URL}/api/users`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ Users proxy - Backend error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Users proxy - Success, found users:', data.length);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Users proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}