/**
 * Role-Based Security Component
 * Protects components and content based on user roles
 */

import React from 'react';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
  showFallback?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback = null,
  redirectTo,
  showFallback = true,
}) => {
  const { user, hasAnyRole } = useRoleAccess();
  const router = useRouter();

  useEffect(() => {
    if (user && !hasAnyRole(allowedRoles) && redirectTo) {
      router.push(redirectTo);
    }
  }, [user, hasAnyRole, allowedRoles, redirectTo, router]);

  // Show loading state while user data is being fetched
  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  // Check if user has required role
  if (!hasAnyRole(allowedRoles)) {
    if (showFallback) {
      return fallback || (
        <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
          <div className="text-red-600 text-6xl mb-4">🚫</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h3>
          <p className="text-red-600 mb-4">
            You don't have permission to access this section. 
            Contact your administrator if you believe this is an error.
          </p>
          <div className="text-sm text-red-500">
            Required roles: {allowedRoles.join(', ')} | Your role: {user.role}
          </div>
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
};

// Specialized components for common use cases
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <RoleGuard allowedRoles={['ADMIN', 'SUPER_ADMIN']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const SupervisorAndUp: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <RoleGuard allowedRoles={['ADMIN', 'SUPER_ADMIN', 'SUPERVISOR']} fallback={fallback}>
    {children}
  </RoleGuard>
);

// Hook for conditional rendering
export const useConditionalRender = () => {
  const roleAccess = useRoleAccess();

  const renderIf = (condition: boolean, component: React.ReactNode) => {
    return condition ? component : null;
  };

  return {
    ...roleAccess,
    renderIf,
  };
};