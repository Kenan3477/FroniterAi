import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

function getBearerForBackend(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const session = request.cookies.get('session_token')?.value;
  if (session) return session;
  const legacy =
    request.cookies.get('auth-token')?.value ||
    request.cookies.get('authToken')?.value ||
    request.cookies.get('omnivox_token')?.value;
  if (legacy) return legacy;
  return null;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15+
    const params = await context.params;
    
    console.log('🔧 Proxying inbound number update to backend...');
    console.log('🔧 Number ID:', params.id);

    const authToken = getBearerForBackend(request);

    console.log('🔒 Auth token found:', authToken ? `${authToken.substring(0, 10)}...` : 'NONE');

    if (!authToken) {
      console.log('🔒 No auth token found (session_token / auth-token / omnivox_token / Authorization)');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the request body
    const updateData = await request.json();
    console.log('🔧 Update data:', updateData);

    const backendUrl = `${BACKEND_URL}/api/voice/inbound-numbers/${params.id}`;
    console.log('Backend URL:', backendUrl);

    // Forward the request to the Railway backend with cookie-based auth
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      console.error(`❌ Backend response not ok: ${response.status} ${response.statusText}`);
      console.error(`❌ Request was: PUT ${backendUrl}`);
      console.error(`❌ Request body:`, JSON.stringify(updateData, null, 2));
      
      if (response.status === 401) {
        console.error('🔑 Authentication failed - token may be expired');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Authentication expired', 
            message: 'Your session has expired. Please log out and log back in.',
            shouldRefreshAuth: true
          },
          { status: 401 }
        );
      }
      
      // Return the backend error response
      const errorText = await response.text();
      console.error('❌ Backend error details:', errorText);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Backend error: ${response.statusText}`,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Successfully updated inbound number');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying inbound number update:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update inbound number', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15+
    const params = await context.params;
    
    console.log('🗑️ Proxying inbound number deletion to backend...');
    console.log('🗑️ Number ID:', params.id);

    const authToken = getBearerForBackend(request);

    console.log('🔒 Auth token found:', authToken ? `${authToken.substring(0, 10)}...` : 'NONE');

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const backendUrl = `${BACKEND_URL}/api/voice/inbound-numbers/${params.id}`;
    console.log('Backend URL:', backendUrl);

    // Forward the request to the Railway backend with cookie-based auth
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      }
    });

    if (!response.ok) {
      console.error(`❌ Backend response not ok: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.error('🔑 Authentication failed - token may be expired');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Authentication expired', 
            message: 'Your session has expired. Please log out and log back in.',
            shouldRefreshAuth: true
          },
          { status: 401 }
        );
      }
      
      // Return the backend error response
      const errorText = await response.text();
      console.error('❌ Backend error details:', errorText);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Backend error: ${response.statusText}`,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Successfully deleted inbound number');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying inbound number deletion:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete inbound number', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}