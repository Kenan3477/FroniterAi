import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

// Helper function to get authentication token from headers or cookies
function getAuthToken(request: NextRequest): string | null {
  // Try authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Fallback to cookies
  const cookieStore = cookies();
  const tokenFromCookie = cookieStore.get('auth-token')?.value;
  return tokenFromCookie || null;
}

// POST - Bulk import DNC numbers
export async function POST(request: NextRequest) {
  try {
    console.log('📞 Proxying DNC bulk import request to backend...');

    const authToken = getAuthToken(request);
    if (!authToken) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/admin/dnc/bulk-import`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log('📞 Backend DNC bulk import response:', { 
      success: data.success, 
      added: data.data?.added,
      skipped: data.data?.skipped,
      errors: data.data?.errors?.length 
    });

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Error bulk importing DNC numbers:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to bulk import DNC numbers'
    }, { status: 500 });
  }
}