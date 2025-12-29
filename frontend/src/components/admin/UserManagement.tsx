'use client';

import { useState, useEffect } from 'react';
import {
  UsersIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FunnelIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;  // Optional since it can be null
  isActive: boolean;  // Add the actual field from schema
  department?: string;
  phoneNumber?: string;
  lastLogin?: string;  // This is lastLogin in schema, not lastLoginAt
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  byRole: {
    ADMIN: number;
    MANAGER: number;
    AGENT: number;
    VIEWER: number;
  };
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [managingCampaignsUser, setManagingCampaignsUser] = useState<User | null>(null);
  const [availableCampaigns, setAvailableCampaigns] = useState<any[]>([]);
  const [userCampaigns, setUserCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'AGENT',
    status: 'ACTIVE',
    department: '',
    phoneNumber: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users and stats
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Handle the backend format: { success: true, data: { users: [...] } }
        let users = [];
        if (Array.isArray(data)) {
          users = data;
        } else if (data?.data?.users) {
          users = data.data.users;
        } else if (data?.data) {
          users = Array.isArray(data.data) ? data.data : [];
        }
        setUsers(users);
      } else {
        console.error('Failed to fetch users:', response.statusText);
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/users/stats', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Transform backend response to match frontend interface
        if (data?.success && data?.data) {
          const backendData = data.data;
          const transformedStats = {
            total: backendData.overview?.totalUsers || 0,
            active: backendData.overview?.activeUsers || 0,
            inactive: backendData.overview?.inactiveUsers || 0,
            suspended: backendData.overview?.suspendedUsers || 0,
            byRole: {
              ADMIN: backendData.usersByRole?.ADMIN || 0,
              MANAGER: backendData.usersByRole?.MANAGER || 0,
              AGENT: backendData.usersByRole?.AGENT || 0,
              VIEWER: backendData.usersByRole?.VIEWER || 0,
            }
          };
          setStats(transformedStats);
        } else {
          console.error('Invalid stats response format');
          setStats(null);
        }
      } else {
        console.error('Failed to fetch stats:', response.statusText);
        setStats(null);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Filter users
  const filteredUsers = (users || []).filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter.toUpperCase();
    const matchesRole = roleFilter === 'all' || user.role === roleFilter.toUpperCase();
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  // Helper functions
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircleIcon className="w-5 h-5 text-slate-500" />;
      case 'INACTIVE':
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
      case 'SUSPENDED':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <ShieldCheckIcon className="w-5 h-5 text-purple-500" />;
      case 'MANAGER':
        return <ShieldExclamationIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <UsersIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedUsers(
      selectedUsers.length === filteredUsers.length 
        ? [] 
        : filteredUsers.map(user => user.id)
    );
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('✅ User deleted successfully');
        await fetchUsers();
        await fetchStats();
      } else {
        const error = await response.json();
        console.error('❌ Delete user failed:', error);
        alert(error.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  // Campaign Management Functions
  const openCampaignManagement = async (user: User) => {
    setManagingCampaignsUser(user);
    setShowCampaignModal(true);
    setLoadingCampaigns(true);
    
    try {
      // Fetch user's current campaigns and available campaigns
      const [userCampaignsRes, availableCampaignsRes] = await Promise.all([
        fetch(`/api/admin/users/${user.id}/campaigns`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/admin/campaign-management/campaigns', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (userCampaignsRes.ok) {
        const userCampaignsData = await userCampaignsRes.json();
        console.log('🔍 UserManagement - User campaigns from API:', userCampaignsData);
        setUserCampaigns(userCampaignsData.data || []);
      }

      if (availableCampaignsRes.ok) {
        const availableCampaignsData = await availableCampaignsRes.json();
        console.log('🔍 UserManagement - Available campaigns from API:', availableCampaignsData);
        console.log('🔍 UserManagement - Available campaigns data length:', availableCampaignsData.data?.length || 0);
        console.log('🔍 UserManagement - Available campaign details:', 
          (availableCampaignsData.data || []).map((c, i) => ({
            index: i + 1,
            id: c.id,
            name: c.name,
            status: c.status,
            isActive: c.isActive
          }))
        );
        console.log('🔍 UserManagement - Available campaign names with status:', 
          availableCampaignsData.data?.map(c => `"${c.name}" (${c.status})`) || []
        );
        setAvailableCampaigns(availableCampaignsData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch campaign data:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const assignCampaign = async (campaignId: string) => {
    if (!managingCampaignsUser) return;

    // Check if user is already assigned to this campaign
    const isAlreadyAssigned = userCampaigns.some(
      (assignment) => assignment.campaignId === campaignId
    );
    
    if (isAlreadyAssigned) {
      alert('User is already assigned to this campaign');
      return;
    }

    console.log('🔍 Assignment Debug Info:');
    console.log('  - Campaign ID:', campaignId);
    console.log('  - Campaign ID type:', typeof campaignId);
    console.log('  - User ID:', managingCampaignsUser.id);
    console.log('  - User ID type:', typeof managingCampaignsUser.id);

    try {
      const requestBody = {
        campaignId,
        assignedBy: 1 // TODO: Get current admin user ID
      };
      
      console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`/api/admin/users/${managingCampaignsUser.id}/campaigns`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        console.log('✅ Campaign assignment successful');
        // Refresh user campaigns
        await openCampaignManagement(managingCampaignsUser);
      } else {
        const error = await response.json();
        console.error('❌ Campaign assignment failed:', error);
        
        // Handle specific error cases
        if (error.message?.includes('already assigned')) {
          alert('This user is already assigned to this campaign');
        } else {
          alert(error.message || 'Failed to assign campaign');
        }
      }
    } catch (error) {
      console.error('Failed to assign campaign:', error);
      alert('Failed to assign campaign');
    }
  };

  const unassignCampaign = async (campaignId: string) => {
    if (!managingCampaignsUser) return;

    try {
      const response = await fetch(
        `/api/admin/users/${managingCampaignsUser.id}/campaigns/${campaignId}`,
        { 
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        // Refresh user campaigns
        await openCampaignManagement(managingCampaignsUser);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to remove campaign');
      }
    } catch (error) {
      console.error('Failed to remove campaign:', error);
      alert('Failed to remove campaign');
    }
  };

  const createUser = async () => {
    // Enhanced validation
    if (!formData.name || !formData.email || !formData.password) {
      alert('Please fill in all required fields: name, email, and password');
      return;
    }

    // Password validation to match backend requirements
    if (formData.password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    if (!/(?=.*[a-z])/.test(formData.password)) {
      alert('Password must contain at least one lowercase letter');
      return;
    }

    if (!/(?=.*[A-Z])/.test(formData.password)) {
      alert('Password must contain at least one uppercase letter');
      return;
    }

    if (!/(?=.*\d)/.test(formData.password)) {
      alert('Password must contain at least one number');
      return;
    }

    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?])/.test(formData.password)) {
      alert('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const loginUrl = formData.role === 'AGENT' ? '/agent/login' : '/login';
        alert(`✅ User ${formData.name} created successfully!\n\n🔐 Login Instructions:\n• Go to: ${loginUrl}\n• Email: ${formData.email}\n• Password: [as set]\n• Role: ${formData.role}\n\nThey can now access their Omnivox-AI portal with ${formData.role.toLowerCase()} permissions.`);
        setShowCreateModal(false);
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'AGENT',
          status: 'ACTIVE',
          department: '',
          phoneNumber: ''
        });
        await fetchUsers();
        await fetchStats();
      } else {
        alert(result.message || 'Failed to create user');
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('An error occurred while creating the user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'AGENT',
      status: 'ACTIVE',
      department: '',
      phoneNumber: ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UserPlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Add User
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats?.total || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-slate-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats?.active || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Admins</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats?.byRole?.ADMIN || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Agents</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats?.byRole?.AGENT || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">Status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div>
            <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700">Role</label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="agent">Agent</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setRoleFilter('all');
              }}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FunnelIcon className="-ml-1 mr-2 h-5 w-5" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="min-w-full divide-y divide-gray-200">
          <div className="bg-gray-50 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm font-medium text-gray-900">
                  {selectedUsers.length > 0 ? `${selectedUsers.length} selected` : `${filteredUsers.length} users`}
                </span>
              </div>
              {selectedUsers.length > 0 && (
                <div className="flex space-x-2">
                  <button className="text-sm text-blue-600 hover:text-blue-900">Bulk Edit</button>
                  <button className="text-sm text-red-600 hover:text-red-900">Bulk Delete</button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white divide-y divide-gray-200">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-1"></div>
              <div className="col-span-3">User</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Last Login</div>
              <div className="col-span-2">Actions</div>
            </div>

            {filteredUsers.map((user) => (
              <div key={user.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50">
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => handleSelectUser(user.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="col-span-3">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {user.phoneNumber && (
                        <div className="text-sm text-gray-500">{user.phoneNumber}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center">
                    {getRoleIcon(user.role)}
                    <span className="ml-2 text-sm text-gray-900 capitalize">
                      {user.role.toLowerCase()}
                    </span>
                  </div>
                  {user.department && (
                    <div className="text-sm text-gray-500">{user.department}</div>
                  )}
                </div>

                <div className="col-span-2">
                  <div className="flex items-center">
                    {getStatusIcon(user.status)}
                    <span className="ml-2 text-sm text-gray-900 capitalize">
                      {user.status?.toLowerCase() || 'unknown'}
                    </span>
                  </div>
                </div>

                <div className="col-span-2 text-sm text-gray-500">
                  {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                </div>

                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openCampaignManagement(user)}
                      className="text-purple-600 hover:text-purple-900"
                      title="Manage campaigns"
                    >
                      <BriefcaseIcon className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No users match your current filters.
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {(showCreateModal || editingUser) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {editingUser ? 'Edit User' : 'Create New User'}
                    </h3>
                    <div className="mt-4 space-y-4">
                      <p className="text-sm text-gray-500">
                        {editingUser ? 'Update user information' : 'Add a new user to the Omnivox-AI platform'}
                      </p>
                      
                      {/* Form */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Enter full name"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Email Address <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="user@company.com"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Password <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Enter secure password"
                            required
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Must be 8+ characters with uppercase, lowercase, number, and special character
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Role</label>
                          <select
                            value={formData.role}
                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="AGENT">Agent - Basic call handling</option>
                            <option value="MANAGER">Manager - Team supervision</option>
                            <option value="ADMIN">Admin - Full system access</option>
                            <option value="VIEWER">Viewer - Read-only access</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Status</label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="SUSPENDED">Suspended</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Department</label>
                          <input
                            type="text"
                            value={formData.department}
                            onChange={(e) => setFormData({...formData, department: e.target.value})}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Sales, Support, Management..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                          <input
                            type="tel"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={createUser}
                  disabled={isSubmitting}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : (editingUser ? 'Update' : 'Create User')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Management Modal */}
      {showCampaignModal && managingCampaignsUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Manage Campaigns for {managingCampaignsUser.name}
                </h3>
                <button
                  onClick={() => {
                    setShowCampaignModal(false);
                    setManagingCampaignsUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              {loadingCampaigns ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading campaigns...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Assigned Campaigns */}
                  {userCampaigns.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Assigned Campaigns ({userCampaigns.length})
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {userCampaigns.map((campaign) => (
                          <div
                            key={campaign.id}
                            className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded"
                          >
                            <span className="text-sm text-gray-900">{campaign.name}</span>
                            <button
                              onClick={() => unassignCampaign(campaign.id)}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available Campaigns */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Available Campaigns ({(() => {
                        const unassignedCount = availableCampaigns.filter(
                          (campaign) => {
                            const campaignIdentifier = campaign.campaignId || campaign.id;
                            const isAssigned = userCampaigns.some(
                              (assignment) => assignment.campaignId === campaignIdentifier
                            );
                            return !isAssigned;
                          }
                        ).length;
                        return unassignedCount;
                      })()})
                    </h4>
                    {(() => {
                      // Debug data structures
                      console.log('🔍 Campaign Assignment Debug:');
                      console.log('Available campaigns count:', availableCampaigns.length);
                      console.log('User campaigns count:', userCampaigns.length);
                      if (availableCampaigns.length > 0) {
                        console.log('Available campaign sample:', availableCampaigns[0]);
                      }
                      if (userCampaigns.length > 0) {
                        console.log('User campaign sample:', userCampaigns[0]);
                      }
                      
                      // Filter out campaigns that the user is already assigned to
                      const unassignedCampaigns = availableCampaigns.filter(
                        (campaign) => {
                          // Handle both campaignId and id fields for flexibility
                          const campaignIdentifier = campaign.campaignId || campaign.id;
                          const isAssigned = userCampaigns.some(
                            (assignment) => assignment.campaignId === campaignIdentifier
                          );
                          console.log(`Campaign ${campaignIdentifier} (${campaign.name}): assigned=${isAssigned}`);
                          return !isAssigned;
                        }
                      );
                      
                      console.log('Unassigned campaigns count:', unassignedCampaigns.length);
                      
                      return unassignedCampaigns.length > 0 ? (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {unassignedCampaigns.map((campaign) => {
                            const campaignIdentifier = campaign.campaignId || campaign.id;
                            return (
                            <div
                              key={campaignIdentifier}
                              className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded"
                            >
                              <span className="text-sm text-gray-900">{campaign.name}</span>
                              <button
                                onClick={() => assignCampaign(campaignIdentifier)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                Assign
                              </button>
                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          {userCampaigns.length > 0 
                            ? 'All campaigns have been assigned to this user.'
                            : 'No campaigns available.'}
                        </p>
                      );
                    })()}
                  </div>

                  {/* Close Button */}
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCampaignModal(false);
                        setManagingCampaignsUser(null);
                      }}
                      className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}