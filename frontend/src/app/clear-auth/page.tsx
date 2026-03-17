'use client';

import { useEffect, useState } from 'react';

export default function ClearAuthPage() {
  const [status, setStatus] = useState('Clearing authentication...');

  useEffect(() => {
    const clearAuth = async () => {
      try {
        // Clear localStorage and sessionStorage
        localStorage.clear();
        sessionStorage.clear();
        
        // Try to call logout API
        try {
          const response = await fetch('/api/auth/logout', { 
            method: 'POST', 
            credentials: 'include' 
          });
          console.log('Logout API response:', response);
        } catch (e) {
          console.log('Logout API call failed, continuing...');
        }

        // Force clear all cookies with JavaScript (client-side)
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });

        // Additional aggressive cookie clearing
        const cookiesToClear = ['auth-token', 'refreshToken', 'accessToken', 'sessionToken'];
        cookiesToClear.forEach(cookieName => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure`;
        });

        setStatus('✅ Authentication cleared! Redirecting to login...');
        
        // Redirect after a short delay
        setTimeout(() => {
          window.location.replace('/login');
        }, 2000);
      } catch (error) {
        setStatus('⚠️ Error during clearing, but proceeding to login...');
        setTimeout(() => {
          window.location.replace('/login');
        }, 2000);
      }
    };

    clearAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center p-8 bg-white rounded-lg shadow max-w-md">
        <div className="text-4xl mb-4">🔐</div>
        <h1 className="text-xl font-bold mb-4">Authentication Reset</h1>
        <p className="text-gray-600 mb-4">{status}</p>
        
        <div className="space-y-2 text-sm text-gray-500">
          <p>• Clearing localStorage</p>
          <p>• Clearing sessionStorage</p>
          <p>• Calling logout API</p>
          <p>• Force clearing cookies</p>
          <p>• Redirecting to login</p>
        </div>

        <div className="mt-6">
          <a 
            href="/login" 
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Login Manually
          </a>
        </div>
      </div>
    </div>
  );
}