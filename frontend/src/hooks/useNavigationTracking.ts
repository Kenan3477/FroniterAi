/**
 * useNavigationTracking Hook
 * Automatically tracks admin navigation patterns for adaptive quick actions
 */

'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useSearchParams } from 'next/navigation';

export const useNavigationTracking = () => {
  const { user, getAuthHeaders } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageStartTime = useRef<number>(Date.now());
  const lastTrackedPath = useRef<string>('');

  // Track navigation for admin users only
  const trackNavigation = async (pagePath: string, timeOnPage?: number) => {
    try {
      // Only track for Admin/Super Admin users
      if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role) || !user.organizationId) {
        return;
      }

      // Only track admin-related pages
      if (!pagePath.includes('/admin') && !pagePath.includes('/work') && 
          !pagePath.includes('/reports') && !pagePath.includes('/call-recordings')) {
        return;
      }

      await fetch('/api/admin/quick-actions/track-navigation', {
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
      console.debug('Navigation tracking failed:', error);
    }
  };

  // Track page views and time spent
  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
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
      if (lastTrackedPath.current) {
        const timeOnPage = Date.now() - pageStartTime.current;
        if (timeOnPage > 1000) {
          // Use sendBeacon for reliable tracking on page unload
          const data = JSON.stringify({
            pagePath: lastTrackedPath.current,
            timeOnPage,
            organizationId: user?.organizationId
          });

          if (navigator.sendBeacon) {
            const blob = new Blob([data], { type: 'application/json' });
            navigator.sendBeacon('/api/admin/quick-actions/track-navigation', blob);
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