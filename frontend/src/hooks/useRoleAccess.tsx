/**
 * Role-Based Access Control Hook
 * Provides secure role checking for administrative functions
 */

import { useAuth } from '@/contexts/AuthContext';

export const useRoleAccess = () => {
  const { user } = useAuth();

  // Check if user has admin privileges (ADMIN or SUPER_ADMIN)
  const isAdmin = () => {
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  };

  // Check if user has supervisor privileges or higher
  const isSupervisorOrHigher = () => {
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'SUPERVISOR';
  };

  // Check if user can create/manage users (Admin and Super Admin only)
  const canManageUsers = () => {
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  };

  // Check if user can access admin panel
  const canAccessAdmin = () => {
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  };

  // Check if user can manage campaigns
  const canManageCampaigns = () => {
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  };

  // Check if user can view reports
  const canViewReports = () => {
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'SUPERVISOR';
  };

  // Check if user can monitor live calls
  const canMonitorCalls = () => {
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  };

  // Check specific role
  const hasRole = (role: string) => {
    return user?.role === role;
  };

  // Check multiple roles
  const hasAnyRole = (roles: string[]) => {
    return roles.includes(user?.role || '');
  };

  return {
    user,
    isAdmin: isAdmin(),
    isSupervisorOrHigher: isSupervisorOrHigher(),
    canManageUsers: canManageUsers(),
    canAccessAdmin: canAccessAdmin(),
    canManageCampaigns: canManageCampaigns(),
    canViewReports: canViewReports(),
    canMonitorCalls: canMonitorCalls(),
    hasRole,
    hasAnyRole,
  };
};