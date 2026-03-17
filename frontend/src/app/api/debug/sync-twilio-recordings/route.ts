import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting Twilio recordings sync...');
    
    // Get auth token from cookies
    const authToken = request.cookies.get('auth-token')?.value;
    const accessToken = request.cookies.get('access-token')?.value;
    const token = request.cookies.get('token')?.value;
    
    const finalToken = authToken || accessToken || token;
    
    if (!finalToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required for sync' },
        { status: 401 }
      );
    }
    
    // Call backend sync endpoint
    const backendUrl = `${BACKEND_URL}/api/admin/sync-twilio-recordings`;
    console.log('🔗 Calling backend sync:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalToken}`,
      },
    });
    
    if (!response.ok) {
      console.error(`❌ Backend sync failed: ${response.status}`);
      const errorText = await response.text();
      return NextResponse.json(
        { 
          success: false, 
          error: 'Backend sync failed',
          details: errorText,
          status: response.status
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('✅ Twilio recordings sync successful:', data);
    
    return NextResponse.json({
      success: true,
      message: 'Twilio recordings synced successfully',
      data: data
    });
    
  } catch (error) {
    console.error('❌ Twilio sync error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}