'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy Advanced Reports Redirect
 * Redirects users to the unified Reports page to prevent 404 errors
 */
export default function AdvancedReportsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to reports page with advanced tabs
    router.replace('/reports');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🔄</div>
        <h3 className="text-lg font-medium text-gray-900">Redirecting...</h3>
        <p className="text-gray-500">Advanced Reports functionality has been consolidated into the main Reports section.</p>
      </div>
    </div>
  );
}