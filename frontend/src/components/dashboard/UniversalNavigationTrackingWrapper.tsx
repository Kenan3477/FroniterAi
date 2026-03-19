/**
 * UniversalNavigationTrackingWrapper - Suspense-safe universal navigation tracking
 * Tracks navigation patterns for all authenticated users to enable adaptive dashboard quick actions
 */

'use client';

import { Suspense } from 'react';
import { useUniversalNavigationTracking } from '@/hooks/useUniversalNavigationTracking';

// Internal component that uses the universal navigation tracking hook
function UniversalNavigationTracker() {
  useUniversalNavigationTracking();
  return null; // This component doesn't render anything
}

// Wrapper component with Suspense boundary
export function UniversalNavigationTrackingWrapper() {
  return (
    <Suspense fallback={null}>
      <UniversalNavigationTracker />
    </Suspense>
  );
}