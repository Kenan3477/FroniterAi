import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    console.log('📞 Proxying call records request to backend...');

    // Get auth token from cookies
    const authToken = request.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      console.log('🔒 No auth token found in cookies');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract query parameters for filtering
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const backendUrl = `${BACKEND_URL}/api/call-records/search${queryString ? `?${queryString}` : ''}`;
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
      
      if (response.status === 401) {
        console.error('🔑 Authentication failed - token may be expired');
        const errorData = await response.text();
        console.error('🔑 Backend error details:', errorData);
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Session expired', 
            message: 'Your session has expired. Please log out and log back in.',
            shouldRefreshAuth: true,
            code: 'SESSION_EXPIRED'
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
    console.log('✅ Successfully fetched call records from backend');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying call records request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call records', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}