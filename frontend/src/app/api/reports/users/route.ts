import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    const { searchParams } = new URL(request.url);
    
    console.log('🔗 Proxying Reports Users API to backend...');
    
    // Forward query parameters to backend
    const queryString = searchParams.toString();
    const endpoint = `${backendUrl}/api/reports/users${queryString ? '?' + queryString : ''}`;
    
    const backendResponse = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!backendResponse.ok) {
      console.error('❌ Backend Reports Users API failed:', backendResponse.status);
      return NextResponse.json({
        success: false,
        data: [],
        source: 'fallback'
      });
    }

    const backendData = await backendResponse.json();
    
    console.log('✅ Reports Users API proxied successfully');
    
    return NextResponse.json({
      success: true,
      ...backendData,
      source: 'backend'
    });

  } catch (error) {
    console.error('Reports Users API proxy error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to proxy Reports Users API',
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
    
    console.log('🔗 Proxying Reports Users API POST to backend...');
    
    const backendResponse = await fetch(`${backendUrl}/api/reports/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      console.error('❌ Backend Reports Users API POST failed:', backendResponse.status);
      const errorData = await backendResponse.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: backendResponse.status });
    }

    const backendData = await backendResponse.json();
    
    console.log('✅ Reports Users API POST proxied successfully');
    
    return NextResponse.json({
      success: true,
      ...backendData,
      source: 'backend'
    });

  } catch (error) {
    console.error('Reports Users API POST proxy error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to proxy Reports Users API POST',
        source: 'error'
      },
      { status: 500 }
    );
  }
}