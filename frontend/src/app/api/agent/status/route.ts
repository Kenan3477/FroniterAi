import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';
    const { searchParams } = new URL(request.url);
    
    console.log('🔗 Proxying Agent Status API to backend...');
    
    // Forward query parameters to backend
    const queryString = searchParams.toString();
    const endpoint = `${backendUrl}/api/agent/status${queryString ? '?' + queryString : ''}`;
    
    const backendResponse = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!backendResponse.ok) {
      console.error('❌ Backend Agent Status API failed:', backendResponse.status);
      return NextResponse.json({
        success: false,
        data: [],
        source: 'fallback'
      });
    }

    const backendData = await backendResponse.json();
    
    console.log('✅ Agent Status API proxied successfully');
    
    return NextResponse.json({
      success: true,
      ...backendData,
      source: 'backend'
    });

  } catch (error) {
    console.error('Agent Status API proxy error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to proxy Agent Status API',
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
    
    console.log('🔗 Proxying Agent Status API POST to backend...');
    
    const backendResponse = await fetch(`${backendUrl}/api/agent/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      console.error('❌ Backend Agent Status API POST failed:', backendResponse.status);
      const errorData = await backendResponse.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: backendResponse.status });
    }

    const backendData = await backendResponse.json();
    
    console.log('✅ Agent Status API POST proxied successfully');
    
    return NextResponse.json({
      success: true,
      ...backendData,
      source: 'backend'
    });

  } catch (error) {
    console.error('Agent Status API POST proxy error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to proxy Agent Status API POST',
        source: 'error'
      },
      { status: 500 }
    );
  }
}