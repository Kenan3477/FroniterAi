import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isReportsRoute = request.nextUrl.pathname.startsWith('/reports');
  
  // Allow API routes to handle their own auth
  if (isApiRoute) {
    return NextResponse.next();
  }
  
  // If user is not authenticated and trying to access protected route
  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If user is authenticated and trying to access login page
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Role-based access control for admin and reports routes
  if (token && (isAdminRoute || isReportsRoute)) {
    try {
      let userRole = 'AGENT'; // Default role
      
      if (token.value.startsWith('demo-')) {
        // Handle demo tokens
        const demoUser = token.value.replace('demo-', '');
        userRole = demoUser === 'admin' ? 'ADMIN' : 'AGENT';
        console.log('🔍 Middleware - Demo token detected, role:', userRole);
      } else {
        // Handle real JWT tokens from Railway backend - SECURE VERSION
        try {
          const JWT_SECRET = process.env.JWT_SECRET;
          if (!JWT_SECRET) {
            console.error('🚨 SECURITY: JWT_SECRET environment variable is required');
            return NextResponse.redirect(new URL('/login?error=config', request.url));
          }
          const decoded = jwt.verify(token.value, JWT_SECRET) as any;
          userRole = decoded.role || 'AGENT';
          console.log('🔍 Middleware - JWT token verified, role:', userRole);
        } catch (jwtError) {
          console.log('🔍 Middleware - JWT verification failed, redirecting to login');
          return NextResponse.redirect(new URL('/login?error=invalid-token', request.url));
        }
      }

      // Check if user has permission to access admin routes
      if (isAdminRoute && userRole !== 'ADMIN') {
        console.log(`🚫 Access denied: ${userRole} tried to access ${request.nextUrl.pathname}`);
        return NextResponse.redirect(new URL('/dashboard?error=access-denied', request.url));
      }

      // Check if user has permission to access reports routes  
      if (isReportsRoute && !['ADMIN', 'SUPERVISOR'].includes(userRole)) {
        console.log(`🚫 Access denied: ${userRole} tried to access ${request.nextUrl.pathname}`);
        return NextResponse.redirect(new URL('/dashboard?error=access-denied', request.url));
      }
      
      console.log(`✅ Access granted: ${userRole} accessing ${request.nextUrl.pathname}`);
    } catch (error) {
      console.error('Error verifying token in middleware:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};