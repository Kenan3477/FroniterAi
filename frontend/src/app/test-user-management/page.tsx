'use client';

import EnhancedUserManagement from '@/components/admin/EnhancedUserManagement';

export default function TestUserManagementPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              🚀 Enhanced User Management Test
            </h1>
            <p className="mt-2 text-gray-600">
              Testing enterprise-grade user creation with real-time validation, audit logging, and email verification.
            </p>
          </div>
          <div className="p-6">
            <EnhancedUserManagement />
          </div>
        </div>
      </div>
    </div>
  );
}