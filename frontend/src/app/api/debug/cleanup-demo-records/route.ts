import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting demo record cleanup...');
    
    // Get auth token from cookies
    const authToken = request.cookies.get('auth-token')?.value;
    const accessToken = request.cookies.get('access-token')?.value;
    const token = request.cookies.get('token')?.value;
    
    const finalToken = authToken || accessToken || token;
    
    if (!finalToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required for cleanup' },
        { status: 401 }
      );
    }
    
    // Call backend cleanup endpoint
    const backendUrl = `${BACKEND_URL}/api/admin/cleanup-demo-records`;
    console.log('🔗 Calling backend cleanup:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalToken}`,
      },
    });
    
    if (!response.ok) {
      console.error(`❌ Backend cleanup failed: ${response.status}`);
      const errorText = await response.text();
      return NextResponse.json(
        { 
          success: false, 
          error: 'Backend cleanup failed',
          details: errorText,
          status: response.status
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('✅ Demo record cleanup successful:', data);
    
    return NextResponse.json({
      success: true,
      message: 'Demo records cleaned up successfully',
      data: data
    });
    
  } catch (error) {
    console.error('❌ Demo cleanup error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}