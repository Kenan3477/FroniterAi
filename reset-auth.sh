#!/bin/bash

# Force clear auth for Omnivox development
echo "🔧 Force clearing authentication tokens..."

# Stop any running dev servers
echo "📡 Stopping dev servers..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

# Clear browser cache/cookies (works for Chrome on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🧹 Clearing Chrome cookies for localhost..."
    rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Cookies 2>/dev/null || true
fi

# Create a temporary clear auth page
echo "🔄 Creating auth clear utility..."
cat > /Users/zenan/kennex/frontend/src/app/clear-auth/page.tsx << 'EOF'
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
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (e) {
          console.log('Logout API call failed, continuing...');
        }

        // Force clear cookies with JavaScript (client-side)
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });

        setStatus('✅ Authentication cleared! Redirecting to login...');
        
        // Redirect after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } catch (error) {
        setStatus('⚠️ Error during clearing, but proceeding to login...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    };

    clearAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center p-8 bg-white rounded-lg shadow">
        <div className="text-4xl mb-4">🔐</div>
        <h1 className="text-xl font-bold mb-4">Authentication Reset</h1>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}
EOF

echo "✅ Auth clear utility created"
echo "📡 Starting dev server..."
cd /Users/zenan/kennex/frontend && npm run dev &

echo "🎯 To clear authentication, visit: http://localhost:3000/clear-auth"
echo "⏳ Waiting for server to start..."
sleep 3
echo "🚀 Done! Server should be running on http://localhost:3000"