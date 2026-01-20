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

// POST - Check if number is on DNC list
export async function POST(request: NextRequest) {
  try {
    console.log('📞 Proxying DNC check request to backend...');

    const authToken = getAuthToken(request);
    if (!authToken) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/admin/dnc/check`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log('📞 Backend DNC check response:', { 
      success: data.success, 
      isBlocked: data.isBlocked,
      phoneNumber: body.phoneNumber 
    });

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Error checking DNC status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check DNC status'
    }, { status: 500 });
  }
}