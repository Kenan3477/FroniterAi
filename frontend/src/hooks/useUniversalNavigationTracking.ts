/**
 * useUniversalNavigationTracking Hook
 * Tracks navigation patterns for all authenticated users (not just admins)
 */

'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useSearchParams } from 'next/navigation';

export const useUniversalNavigationTracking = () => {
  const { user, getAuthHeaders } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageStartTime = useRef<number>(Date.now());
  const lastTrackedPath = useRef<string>('');

  // Track navigation for all authenticated users
  const trackNavigation = async (pagePath: string, timeOnPage?: number) => {
    try {
      // Only track for authenticated users with organization
      if (!user || !user.organizationId) {
        return;
      }

      // Skip tracking for auth pages and other system pages
      if (pagePath.includes('/login') || pagePath.includes('/logout') || 
          pagePath.includes('/setup-password') || pagePath.includes('/auth-recovery')) {
        return;
      }

      await fetch('/api/dashboard/track-navigation', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          pagePath,
          timeOnPage,
          organizationId: user.organizationId
        })
      });

    } catch (error) {
      // Silently fail - navigation tracking shouldn't disrupt user experience
      console.debug('Universal navigation tracking failed:', error);
    }
  };

  // Track page views and time spent
  useEffect(() => {
    if (!user || !user.organizationId) {
      return;
    }

    const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    
    // Track previous page time if we have a previous path
    if (lastTrackedPath.current && lastTrackedPath.current !== currentPath) {
      const timeOnPreviousPage = Date.now() - pageStartTime.current;
      if (timeOnPreviousPage > 1000) { // Only track if spent more than 1 second
        trackNavigation(lastTrackedPath.current, timeOnPreviousPage);
      }
    }

    // Track current page view
    if (currentPath !== lastTrackedPath.current) {
      trackNavigation(currentPath);
      lastTrackedPath.current = currentPath;
      pageStartTime.current = Date.now();
    }

  }, [pathname, searchParams, user]);

  // Track page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lastTrackedPath.current && user?.organizationId) {
        const timeOnPage = Date.now() - pageStartTime.current;
        if (timeOnPage > 1000) {
          // Use sendBeacon for reliable tracking on page unload
          const data = JSON.stringify({
            pagePath: lastTrackedPath.current,
            timeOnPage,
            organizationId: user.organizationId
          });

          if (navigator.sendBeacon) {
            const blob = new Blob([data], { type: 'application/json' });
            navigator.sendBeacon('/api/dashboard/track-navigation', blob);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.organizationId]);

  return {
    trackNavigation
  };
};