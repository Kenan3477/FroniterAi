import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  
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