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

// DELETE - Remove number from DNC list
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('📞 Proxying DNC DELETE request to backend for ID:', params.id);

    const authToken = getAuthToken(request);
    if (!authToken) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const backendUrl = `${BACKEND_URL}/api/admin/dnc/${params.id}`;

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('📞 Backend DNC delete response:', { success: data.success, id: params.id });

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Error removing DNC number:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to remove number from DNC list'
    }, { status: 500 });
  }
}