'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Authentication Guard Component
 * Redirects unauthenticated users to login page
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect if still loading auth state
    if (loading) {
      console.log('⏳ AuthGuard: Still loading auth state, waiting...');
      return;
    }

    // Define public routes that don't require authentication
    const publicRoutes = ['/login', '/logout', '/'];
    const isPublicRoute = pathname ? publicRoutes.includes(pathname) : false;

    console.log('🔍 AuthGuard: Current state:', {
      pathname,
      isAuthenticated,
      loading,
      isPublicRoute
    });

    // If not authenticated and trying to access protected route, redirect to login
    if (!isAuthenticated && !isPublicRoute) {
      console.log('� AuthGuard: Unauthorized access to protected route, redirecting to login...');
      router.push('/login');
      return;
    }

    // If authenticated and trying to access login page, redirect to dashboard
    if (isAuthenticated && pathname === '/login') {
      console.log('✅ AuthGuard: Authenticated user accessing login, redirecting to dashboard...');
      router.push('/dashboard');
      return;
    }

    // If authenticated and at root, redirect to dashboard  
    if (isAuthenticated && pathname === '/') {
      console.log('✅ AuthGuard: Authenticated user at root, redirecting to dashboard...');
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, loading, pathname, router]);

  return <>{children}</>;
}