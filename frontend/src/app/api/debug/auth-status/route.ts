import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Checking authentication status...');
    
    // Get all relevant cookies
    const authToken = request.cookies.get('auth-token')?.value;
    const accessToken = request.cookies.get('access-token')?.value;
    const token = request.cookies.get('token')?.value;
    
    console.log('🍪 Debug: Available cookies:');
    request.cookies.getAll().forEach(cookie => {
      console.log(`  ${cookie.name}: ${cookie.value ? 'EXISTS' : 'EMPTY'} (length: ${cookie.value?.length || 0})`);
    });
    
    // Try to decode JWT payload if available
    let tokenInfo = null;
    const selectedToken = authToken || accessToken || token;
    
    if (selectedToken) {
      try {
        // Decode JWT payload (without verification, just for debugging)
        const payload = JSON.parse(atob(selectedToken.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        const expired = payload.exp < now;
        
        tokenInfo = {
          subject: payload.sub,
          userId: payload.userId,
          role: payload.role,
          issuedAt: new Date(payload.iat * 1000).toISOString(),
          expiresAt: new Date(payload.exp * 1000).toISOString(),
          expired: expired,
          timeUntilExpiry: expired ? 'EXPIRED' : `${payload.exp - now} seconds`
        };
        
        console.log('🔑 Debug: Token info:', tokenInfo);
      } catch (e) {
        console.log('❌ Debug: Failed to decode token:', e);
        tokenInfo = { error: 'Invalid token format' };
      }
    }
    
    return NextResponse.json({
      success: true,
      authentication: {
        hasAuthToken: !!authToken,
        hasAccessToken: !!accessToken,
        hasToken: !!token,
        selectedToken: selectedToken ? 'EXISTS' : 'NONE',
        tokenInfo: tokenInfo
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Debug auth status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Debug failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}