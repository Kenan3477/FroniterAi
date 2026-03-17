import { NextRequest, NextResponse } from 'next/server';

// Debug endpoint to test authentication and data
export async function GET(request: NextRequest) {
  try {
    // Check various ways tokens might be stored
    const authHeader = request.headers.get('authorization');
    const cookies = request.headers.get('cookie');
    
    console.log('🔍 Debug - Auth header:', authHeader ? authHeader.substring(0, 50) + '...' : 'none');
    console.log('🔍 Debug - Cookies:', cookies ? cookies.substring(0, 100) + '...' : 'none');
    
    return NextResponse.json({
      success: true,
      debug: {
        hasAuthHeader: !!authHeader,
        authHeaderLength: authHeader?.length || 0,
        hasCookies: !!cookies,
        cookiesLength: cookies?.length || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Debug endpoint error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}