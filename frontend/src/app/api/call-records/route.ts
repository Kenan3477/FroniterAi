import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    console.log('📞 Proxying call records request to backend...');

    // Get auth token from Authorization header (primary) or cookies (fallback)
    const authHeader = request.headers.get('authorization');
    let finalToken: string | undefined;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      finalToken = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log('🔑 Found token in Authorization header');
    } else {
      // Fallback to cookies
      const authToken = request.cookies.get('auth-token')?.value;
      const accessToken = request.cookies.get('access-token')?.value;
      const token = request.cookies.get('token')?.value;
      finalToken = authToken || accessToken || token;
      console.log('🔑 Looking for token in cookies:', finalToken ? 'FOUND' : 'NONE');
    }
    
    console.log('🔑 Final token:', finalToken ? `${finalToken.substring(0, 20)}...` : 'NONE');
    
    if (!finalToken) {
      console.log('🔒 No auth token found in headers or cookies');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract query parameters for filtering
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const backendUrl = `${BACKEND_URL}/api/call-records${queryString ? `?${queryString}` : ''}`;
    console.log('Backend URL:', backendUrl);

    // Forward the request to the Railway backend with auth
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (finalToken) {
      headers['Authorization'] = `Bearer ${finalToken}`;
      console.log('🔑 Sending Authorization header with token');
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`❌ Backend response not ok: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.error('🔑 Authentication failed - token expired');
        const errorData = await response.text();
        console.error('🔑 Backend error details:', errorData);
        
        // Check if this is a token expiration (based on backend logs showing "jwt expired")
        if (errorData.includes('expired') || errorData.includes('Unauthorized')) {
          console.log('🔄 Token expired - redirecting to login');
          return NextResponse.json(
            { 
              success: false, 
              error: 'Session expired', 
              message: 'Your session has expired. Please log out and log back in.',
              shouldRefreshAuth: true,
              code: 'SESSION_EXPIRED',
              redirectToLogin: true
            },
            { status: 401 }
          );
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Authentication required', 
            message: 'Please log in to access call records.',
            code: 'AUTH_REQUIRED'
          },
          { status: 401 }
        );
      }
      
      if (response.status === 404) {
        console.error('❌ Backend call-records endpoint not found');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Service unavailable', 
            message: 'Call records service is currently unavailable. Please try again later.',
            code: 'SERVICE_UNAVAILABLE'
          },
          { status: 503 }
        );
      }
      
      // Return other backend error responses
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