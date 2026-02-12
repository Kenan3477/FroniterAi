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

  // Basic token presence check - detailed JWT verification handled in API routes
  if (token && (isAdminRoute || isReportsRoute)) {
    // For demo tokens, we can do basic role checking
    if (token.value.startsWith('demo-')) {
      const demoUser = token.value.replace('demo-', '');
      const userRole = demoUser === 'admin' ? 'ADMIN' : 'AGENT';
      
      if (isAdminRoute && userRole !== 'ADMIN') {
        console.log(`🚫 Access denied: ${userRole} tried to access ${request.nextUrl.pathname}`);
        return NextResponse.redirect(new URL('/dashboard?error=access-denied', request.url));
      }
      
      if (isReportsRoute && !['ADMIN', 'SUPERVISOR'].includes(userRole)) {
        console.log(`🚫 Access denied: ${userRole} tried to access ${request.nextUrl.pathname}`);
        return NextResponse.redirect(new URL('/dashboard?error=access-denied', request.url));
      }
      
      console.log(`✅ Access granted: ${userRole} accessing ${request.nextUrl.pathname}`);
    } else {
      // For real JWT tokens, let the API routes handle verification
      // Just allow access and let backend auth handle permission checks
      console.log(`✅ Token present, allowing access to ${request.nextUrl.pathname}`);
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