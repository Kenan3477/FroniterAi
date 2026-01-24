import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';
    const { searchParams } = new URL(request.url);
    
    console.log('🔗 Proxying Campaign User API to backend...');
    
    // Forward query parameters to backend
    const queryString = searchParams.toString();
    const endpoint = `${backendUrl}/api/campaigns${queryString ? '?' + queryString : ''}`;
    
    const backendResponse = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!backendResponse.ok) {
      console.error('❌ Backend Campaign User API failed:', backendResponse.status);
      return NextResponse.json({
        success: false,
        data: [],
        source: 'fallback'
      });
    }

    const backendData = await backendResponse.json();
    
    console.log('✅ Campaign User API proxied successfully');
    
    return NextResponse.json({
      success: true,
      ...backendData,
      source: 'backend'
    });

  } catch (error) {
    console.error('Campaign User API proxy error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to proxy Campaign User API',
        data: [],
        source: 'error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';
    const body = await request.json();
    
    console.log('🔗 Proxying Campaign User API POST to backend...');
    
    const backendResponse = await fetch(`${backendUrl}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      console.error('❌ Backend Campaign User API POST failed:', backendResponse.status);
      const errorData = await backendResponse.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: backendResponse.status });
    }

    const backendData = await backendResponse.json();
    
    console.log('✅ Campaign User API POST proxied successfully');
    
    return NextResponse.json({
      success: true,
      ...backendData,
      source: 'backend'
    });

  } catch (error) {
    console.error('Campaign User API POST proxy error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to proxy Campaign User API POST',
        source: 'error'
      },
      { status: 500 }
    );
  }
}