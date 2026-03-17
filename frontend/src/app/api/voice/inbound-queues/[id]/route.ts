import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`🔍 Proxying inbound queue GET request for ID: ${id}`);

    // Get auth token from cookies
    const authToken = request.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      console.log('🔒 No auth token found in cookies');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const backendUrl = `${BACKEND_URL}/api/voice/inbound-queues/${id}`;
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
    console.log(`✅ Successfully fetched inbound queue ${id} from backend`);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying inbound queue GET request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inbound queue', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`📝 Proxying inbound queue PUT request for ID: ${id}`);

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
    const backendUrl = `${BACKEND_URL}/api/voice/inbound-queues/${id}`;
    console.log('Backend URL:', backendUrl);

    // Forward the request to the Railway backend with cookie-based auth
    const response = await fetch(backendUrl, {
      method: 'PUT',
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
    console.log(`✅ Successfully updated inbound queue ${id} on backend`);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying inbound queue PUT request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update inbound queue', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`🗑️ Proxying inbound queue DELETE request for ID: ${id}`);

    // Get auth token from cookies
    const authToken = request.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      console.log('🔒 No auth token found in cookies');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const backendUrl = `${BACKEND_URL}/api/voice/inbound-queues/${id}`;
    console.log('Backend URL:', backendUrl);

    // Forward the request to the Railway backend with cookie-based auth
    const response = await fetch(backendUrl, {
      method: 'DELETE',
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
    console.log(`✅ Successfully deleted inbound queue ${id} on backend`);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying inbound queue DELETE request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete inbound queue', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}