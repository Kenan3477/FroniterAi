import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('📝 Proxying transcript request to backend...');
    
    // Get auth token from cookies
    const authToken = request.cookies.get('auth-token')?.value;
    const accessToken = request.cookies.get('access-token')?.value;
    const token = request.cookies.get('token')?.value;
    
    const finalToken = authToken || accessToken || token;
    
    if (!finalToken) {
      console.log('🔒 No auth token found in cookies for transcript request');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract query parameters for transcript format
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const backendUrl = `${BACKEND_URL}/api/transcript/${params.id}`;
    console.log('Backend transcript URL:', backendUrl);

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
      console.error(`❌ Backend transcript response not ok: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.error('🔑 Authentication failed for transcript - token expired');
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        );
      }
      
      if (response.status === 404) {
        console.error('📝 Transcript not found');
        return NextResponse.json(
          { error: 'Transcript not found' },
          { status: 404 }
        );
      }
      
      const errorText = await response.text();
      console.error('❌ Backend transcript error response:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch transcript', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Transcript response received successfully');
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error in transcript API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}