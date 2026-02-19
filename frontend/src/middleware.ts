import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isLogoutPage = request.nextUrl.pathname === '/logout';
  const isDashboardPage = request.nextUrl.pathname === '/dashboard' || request.nextUrl.pathname === '/';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isReportsRoute = request.nextUrl.pathname.startsWith('/reports');
  const isDataManagementRoute = request.nextUrl.pathname.startsWith('/data-management');
  
  // Allow API routes to handle their own auth
  if (isApiRoute) {
    return NextResponse.next();
  }
  
  // Allow logout page access
  if (isLogoutPage) {
    return NextResponse.next();
  }
  
  // For dashboard/root pages - require authentication or redirect to login
  if (isDashboardPage) {
    if (!token) {
      console.log('🔐 No auth token found, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }
  
  // If user is not authenticated and trying to access protected route
  if (!token && !isLoginPage) {
    console.log('🔐 No auth token found for protected route, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If user is authenticated and trying to access login page, redirect to dashboard
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // SECURITY FIX: Remove demo token handling - only allow real JWT tokens
  // SECURITY FIX: Remove demo token handling - only allow real JWT tokens
  // All authentication must go through proper backend validation
  if (token && (isAdminRoute || isReportsRoute || isDataManagementRoute)) {
    console.log('🔐 Protected route access with token - backend will validate');
    return NextResponse.next();
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