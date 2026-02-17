import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Force logout: Clearing all authentication data...');
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Force logout completed - all tokens cleared'
    });

    // Clear ALL possible auth cookies aggressively
    const cookiesToClear = ['auth-token', 'access-token', 'token', 'authToken', 'omnivox_token'];
    
    cookiesToClear.forEach(cookieName => {
      // Clear with multiple domain/path combinations
      response.cookies.set(cookieName, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });
      
      response.cookies.set(cookieName, '', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });
      
      // Also try with expires date in the past
      response.cookies.set(cookieName, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: new Date(0),
        path: '/'
      });
    });
    
    console.log('✅ Force logout: All cookies cleared');
    
    return response;
    
  } catch (error) {
    console.error('❌ Force logout error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Force logout failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}