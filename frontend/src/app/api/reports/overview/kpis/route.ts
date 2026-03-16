import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const authToken = getAuthToken(request);
    
    if (!authToken) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Extract query parameters from the request
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const endpoint = `${BACKEND_URL}/api/reports/overview/kpis${queryString ? '?' + queryString : ''}`;
    
    console.log('🔗 Proxying KPIs request to Railway backend:', endpoint);

    const backendResponse = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!backendResponse.ok) {
      console.error('❌ Railway backend KPIs API failed:', backendResponse.status);
      return NextResponse.json({
        success: false,
        error: `Backend API failed with status: ${backendResponse.status}`
      }, { status: backendResponse.status });
    }

    const backendData = await backendResponse.json();
    
    console.log('✅ KPIs API proxied successfully');
    
    return NextResponse.json(backendData);

  } catch (error) {
    console.error('❌ Error proxying KPIs API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch KPIs data'
    }, { status: 500 });
  }
}