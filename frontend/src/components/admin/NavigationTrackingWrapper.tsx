/**
 * NavigationTrackingWrapper - Suspense-safe navigation tracking
 * Wraps useNavigationTracking in a Suspense boundary to prevent build errors
 */

'use client';

import { Suspense } from 'react';
import { useNavigationTracking } from '@/hooks/useNavigationTracking';

// Internal component that uses the navigation tracking hook
function NavigationTracker() {
  useNavigationTracking();
  return null; // This component doesn't render anything
}

// Wrapper component with Suspense boundary
export function NavigationTrackingWrapper() {
  return (
    <Suspense fallback={null}>
      <NavigationTracker />
    </Suspense>
  );
}