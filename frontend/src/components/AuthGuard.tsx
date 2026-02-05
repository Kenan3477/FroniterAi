'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Authentication Guard Component
 * Prevents access to cached authenticated content after logout
 * Forces re-authentication check on every page load/navigation
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Listen for browser navigation events (back/forward buttons)
    const handleNavigation = () => {
      console.log('🔍 AuthGuard: Navigation detected, checking auth status...');
      
      // Small delay to ensure auth context has updated
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const isProtectedRoute = !currentPath.startsWith('/login') && 
                               !currentPath.startsWith('/logout') &&
                               currentPath !== '/dashboard' && 
                               currentPath !== '/';
        
        // Special check for dashboard after logout
        const isDashboardRoute = currentPath === '/dashboard' || currentPath === '/';
        
        if (isProtectedRoute && !isAuthenticated && !loading) {
          console.log('🚫 AuthGuard: Unauthorized access to protected route detected, redirecting...');
          window.location.replace('/dashboard?preview=true');
        } else if (isDashboardRoute && !isAuthenticated && !loading) {
          // For dashboard access after logout, ensure preview mode
          const hasPreviewParam = window.location.search.includes('preview=true');
          if (!hasPreviewParam) {
            console.log('🔄 AuthGuard: Dashboard accessed after logout, enabling preview mode...');
            window.location.replace('/dashboard?preview=true');
          }
        }
      }, 100);
    };

    // Listen for popstate (back/forward button clicks)
    window.addEventListener('popstate', handleNavigation);
    
    // Also run check on mount
    handleNavigation();

    return () => {
      window.removeEventListener('popstate', handleNavigation);
    };
  }, [isAuthenticated, loading]);

  // Prevent caching of authenticated pages
  useEffect(() => {
    // Disable page caching for authenticated pages
    if (isAuthenticated) {
      const preventCache = () => {
        window.history.replaceState(null, '', window.location.href);
      };
      
      // Set cache control headers via meta tag
      const metaTag = document.createElement('meta');
      metaTag.httpEquiv = 'Cache-Control';
      metaTag.content = 'no-cache, no-store, must-revalidate';
      document.getElementsByTagName('head')[0].appendChild(metaTag);
      
      const pragmaTag = document.createElement('meta');
      pragmaTag.httpEquiv = 'Pragma';
      pragmaTag.content = 'no-cache';
      document.getElementsByTagName('head')[0].appendChild(pragmaTag);
      
      const expiresTag = document.createElement('meta');
      expiresTag.httpEquiv = 'Expires';
      expiresTag.content = '0';
      document.getElementsByTagName('head')[0].appendChild(expiresTag);

      window.addEventListener('beforeunload', preventCache);
      
      return () => {
        window.removeEventListener('beforeunload', preventCache);
        // Clean up meta tags
        [metaTag, pragmaTag, expiresTag].forEach(tag => {
          if (tag.parentNode) {
            tag.parentNode.removeChild(tag);
          }
        });
      };
    }
    
    // Return empty cleanup for non-authenticated case
    return () => {};
  }, [isAuthenticated]);

  return <>{children}</>;
}