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

// GET - Fetch DNC statistics
export async function GET(request: NextRequest) {
  try {
    console.log('📞 Proxying DNC stats request to backend...');

    const authToken = getAuthToken(request);
    if (!authToken) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const backendUrl = `${BACKEND_URL}/api/admin/dnc/stats`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('📞 Backend DNC stats response:', { 
      success: data.success, 
      totalCount: data.data?.totalCount,
      todayCount: data.data?.todayCount
    });

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Error fetching DNC stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch DNC statistics'
    }, { status: 500 });
  }
}