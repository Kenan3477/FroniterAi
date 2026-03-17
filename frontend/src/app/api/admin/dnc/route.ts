import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

// Helper function to get authentication token
function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// GET - Fetch DNC numbers with pagination and search
export async function GET(request: NextRequest) {
  try {
    console.log('📞 Proxying DNC GET request to backend...');

    const authToken = getAuthToken(request);
    if (!authToken) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Forward query parameters for pagination and search
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const backendUrl = `${BACKEND_URL}/api/admin/dnc${queryString ? `?${queryString}` : ''}`;
    console.log('📞 Backend URL for DNC:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('📞 Backend DNC response:', { success: data.success, count: data.data?.length });

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Error proxying DNC request:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch DNC numbers'
    }, { status: 500 });
  }
}

// POST - Add number to DNC list
export async function POST(request: NextRequest) {
  try {
    console.log('📞 Proxying DNC POST request to backend...');

    const authToken = getAuthToken(request);
    if (!authToken) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/admin/dnc`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log('📞 Backend DNC add response:', { success: data.success, phoneNumber: body.phoneNumber });

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Error adding DNC number:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add number to DNC list'
    }, { status: 500 });
  }
}