import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

/**
 * Authentication Guard - Prevents infinite loops from expired tokens
 * This endpoint clears expired tokens and redirects to login
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Auth Guard: Checking for expired tokens and clearing them...');
    
    // Get tokens from various storage locations
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('auth-token')?.value;
    const accessCookie = request.cookies.get('access-token')?.value;
    
    const tokens = [
      authHeader?.replace('Bearer ', ''),
      cookieToken,
      accessCookie
    ].filter(Boolean);
    
    let hasExpiredTokens = false;
    const tokenStatus = [];
    
    // Check each token for expiry
    for (const token of tokens) {
      if (!token) continue;
      
      try {
        // Decode without verification to check expiry
        const decoded = jwt.decode(token) as any;
        if (decoded?.exp) {
          const expiryDate = new Date(decoded.exp * 1000);
          const isExpired = Date.now() > decoded.exp * 1000;
          
          tokenStatus.push({
            source: token === cookieToken ? 'cookie' : token === accessCookie ? 'access-cookie' : 'header',
            expires: expiryDate.toISOString(),
            expired: isExpired,
            userId: decoded.userId,
            username: decoded.username
          });
          
          if (isExpired) {
            hasExpiredTokens = true;
          }
        }
      } catch (e) {
        console.log('❌ Invalid token format detected');
        hasExpiredTokens = true;
      }
    }
    
    // Create response with cleared cookies if tokens are expired
    const response = NextResponse.json({
      success: true,
      hasExpiredTokens,
      tokenStatus,
      action: hasExpiredTokens ? 'tokens_cleared' : 'tokens_valid',
      message: hasExpiredTokens 
        ? 'Expired tokens detected and cleared. Please log in again.' 
        : 'All tokens are valid',
      redirectToLogin: hasExpiredTokens
    });
    
    // Clear all auth-related cookies if tokens are expired
    if (hasExpiredTokens) {
      console.log('🧹 Clearing expired authentication cookies...');
      
      // Clear all possible auth cookie variants
      const cookiesToClear = [
        'auth-token',
        'access-token', 
        'refresh-token',
        'omnivox_token',
        'authToken',
        'token'
      ];
      
      cookiesToClear.forEach(cookieName => {
        response.cookies.set(cookieName, '', {
          expires: new Date(0),
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      });
    }
    
    return response;
    
  } catch (error) {
    console.error('❌ Auth Guard error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check authentication status'
    }, { status: 500 });
  }
}