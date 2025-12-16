import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    const { searchParams } = new URL(request.url);
    
    console.log('🔗 Proxying Agent Queue API to backend...');
    
    // Forward query parameters to backend
    const queryString = searchParams.toString();
    const endpoint = `${backendUrl}/api/agents/queue${queryString ? '?' + queryString : ''}`;
    
    const backendResponse = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!backendResponse.ok) {
      console.error('❌ Backend Agent Queue API failed:', backendResponse.status);
      return NextResponse.json({
        success: false,
        data: [],
        source: 'fallback'
      });
    }

    const backendData = await backendResponse.json();
    
    console.log('✅ Agent Queue API proxied successfully');
    
    return NextResponse.json({
      success: true,
      ...backendData,
      source: 'backend'
    });

  } catch (error) {
    console.error('Agent Queue API proxy error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to proxy Agent Queue API',
        data: [],
        source: 'error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    const body = await request.json();
    
    console.log('🔗 Proxying Agent Queue API POST to backend...');
    
    const backendResponse = await fetch(`${backendUrl}/api/agents/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      console.error('❌ Backend Agent Queue API POST failed:', backendResponse.status);
      const errorData = await backendResponse.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: backendResponse.status });
    }

    const backendData = await backendResponse.json();
    
    console.log('✅ Agent Queue API POST proxied successfully');
    
    return NextResponse.json({
      success: true,
      ...backendData,
      source: 'backend'
    });

  } catch (error) {
    console.error('Agent Queue API POST proxy error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to proxy Agent Queue API POST',
        source: 'error'
      },
      { status: 500 }
    );
  }
}