'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Authentication Recovery Component
 * Detects expired token loops and provides recovery options
 */
export default function AuthRecoveryPage() {
  const [status, setStatus] = useState('Checking authentication status...');
  const [tokenStatus, setTokenStatus] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAndRecoverAuth();
  }, []);

  const checkAndRecoverAuth = async () => {
    try {
      setStatus('Checking for expired tokens...');
      
      // Call auth guard to check token status
      const response = await fetch('/api/auth/guard', {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.hasExpiredTokens) {
        setStatus('Expired tokens detected. Clearing storage...');
        setTokenStatus(data.tokenStatus);
        
        // Clear localStorage and sessionStorage
        localStorage.clear();
        sessionStorage.clear();
        
        setStatus('Authentication storage cleared. Ready to log in.');
        
        setTimeout(() => {
          router.push('/login');
        }, 2000);
        
      } else {
        setStatus('Authentication is valid. Redirecting...');
        setTokenStatus(data.tokenStatus);
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      }
      
    } catch (error) {
      setStatus('Error checking authentication. Manual recovery needed.');
      console.error('Auth recovery error:', error);
    }
  };

  const forceRecovery = () => {
    setIsRecovering(true);
    setStatus('Forcing authentication recovery...');
    
    // Force clear all possible storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear any remaining cookies client-side
    document.cookie.split(";").forEach(c => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
    
    setStatus('Manual recovery complete. Redirecting to login...');
    
    setTimeout(() => {
      window.location.href = '/login';
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m12-7a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Recovery
          </h1>
          
          <p className="text-gray-600 mb-6">
            {status}
          </p>
          
          {tokenStatus.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showDetails ? 'Hide' : 'Show'} token details
              </button>
              
              {showDetails && (
                <div className="mt-3 p-3 bg-gray-100 rounded text-left text-xs">
                  <pre>{JSON.stringify(tokenStatus, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-3">
            {!isRecovering && (
              <button
                onClick={forceRecovery}
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Force Manual Recovery
              </button>
            )}
            
            <button
              onClick={() => router.push('/login')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go to Login
            </button>
          </div>
          
          <div className="mt-6 text-xs text-gray-500">
            <p>If the site was stuck in a refresh loop, this page should resolve the issue.</p>
            <p className="mt-1">Clear your browser cache if problems persist.</p>
          </div>
        </div>
      </div>
    </div>
  );
}