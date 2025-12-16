'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LogoutPage() {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, [logout]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-6xl mb-4">👋</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Logging you out...</h2>
        <p className="text-gray-600">You will be redirected to the login page shortly.</p>
      </div>
    </div>
  );
}