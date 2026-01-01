import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Proxying inbound queues GET request to backend...');

    // Get auth token from cookies
    const authToken = request.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      console.log('🔒 No auth token found in cookies');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const backendUrl = `${BACKEND_URL}/api/voice/inbound-queues`;
    console.log('Backend URL:', backendUrl);

    // Forward the request to the Railway backend with cookie-based auth
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      console.error(`❌ Backend response not ok: ${response.status} ${response.statusText}`);
      const errorData = await response.json();
      return NextResponse.json(
        { success: false, error: errorData.error || response.statusText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Successfully fetched inbound queues from backend');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying inbound queues request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inbound queues', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('➕ Proxying inbound queues POST request to backend...');

    // Get auth token from cookies
    const authToken = request.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      console.log('🔒 No auth token found in cookies');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/voice/inbound-queues`;
    console.log('Backend URL:', backendUrl);

    // Forward the request to the Railway backend with cookie-based auth
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error(`❌ Backend response not ok: ${response.status} ${response.statusText}`);
      const errorData = await response.json();
      return NextResponse.json(
        { success: false, error: errorData.error || response.statusText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Successfully created inbound queue on backend');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying inbound queues POST request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create inbound queue', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}