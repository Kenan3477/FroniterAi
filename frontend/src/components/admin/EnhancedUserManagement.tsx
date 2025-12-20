'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  UsersIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department?: string;
  phoneNumber?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface EmailValidationResult {
  isValid: boolean;
  isUnique: boolean;
  message: string;
  existingUser?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function EnhancedUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
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
  
  // Enhanced validation states
  const [emailValidation, setEmailValidation] = useState<EmailValidationResult | null>(null);
  const [emailValidating, setEmailValidating] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: ''
  });

  // Success states
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        let users = [];
        if (Array.isArray(data)) {
          users = data;
        } else if (data?.data?.users) {
          users = data.data.users;
        } else if (data?.data) {
          users = Array.isArray(data.data) ? data.data : [];
        }
        setUsers(users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Debounced email validation
  const validateEmail = useCallback(
    debounce(async (email: string) => {
      if (!email || !isValidEmailFormat(email)) {
        setEmailValidation(null);
        return;
      }

      setEmailValidating(true);
      try {
        const response = await fetch('/api/admin/users/validate-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        
        const result = await response.json();
        setEmailValidation(result);
      } catch (error) {
        console.error('Email validation failed:', error);
        setEmailValidation(null);
      } finally {
        setEmailValidating(false);
      }
    }, 500),
    []
  );

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    let score = 0;
    let feedback = '';

    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*]/.test(password)) score++;

    switch (score) {
      case 0:
      case 1:
        feedback = 'Very weak';
        break;
      case 2:
        feedback = 'Weak';
        break;
      case 3:
        feedback = 'Fair';
        break;
      case 4:
        feedback = 'Good';
        break;
      case 5:
        feedback = 'Strong';
        break;
    }

    setPasswordStrength({ score, feedback });
  };

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmailFormat(formData.email)) {
      errors.email = 'Invalid email format';
    } else if (emailValidation && !emailValidation.isUnique) {
      errors.email = 'Email is already in use';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain uppercase, lowercase, and number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Real-time validation for specific fields
    if (field === 'email' && value) {
      validateEmail(value);
    } else if (field === 'password' && value) {
      checkPasswordStrength(value);
    }
  };

  // Create user with enhanced features
  const createUser = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage(
          `User ${formData.name} created successfully! ${
            data.emailVerification?.required 
              ? 'Email verification sent.' 
              : ''
          }`
        );
        setShowSuccessMessage(true);
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
        setEmailValidation(null);
        setFormErrors({});
        fetchUsers(); // Refresh the users list
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 5000);
      } else {
        // Handle validation errors from backend
        if (data.errors) {
          const backendErrors: Record<string, string> = {};
          data.errors.forEach((error: string) => {
            // Map errors to form fields
            if (error.includes('email')) backendErrors.email = error;
            else if (error.includes('password')) backendErrors.password = error;
            else if (error.includes('name')) backendErrors.name = error;
            else backendErrors.general = error;
          });
          setFormErrors(backendErrors);
        } else {
          setFormErrors({
            general: data.message || 'Failed to create user'
          });
        }
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setFormErrors({
        general: 'Network error. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  // Get validation icon and color
  const getEmailValidationIcon = () => {
    if (emailValidating) {
      return <ClockIcon className="h-5 w-5 text-gray-400 animate-spin" />;
    }
    
    if (emailValidation?.isValid && emailValidation?.isUnique) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    } else if (emailValidation?.isValid && !emailValidation?.isUnique) {
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }
    
    return null;
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score <= 1) return 'bg-red-500';
    if (score <= 2) return 'bg-yellow-500';
    if (score <= 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header with success message */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Enterprise User Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage users with advanced validation, audit logging, and email verification.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                {successMessage}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                type="button"
                onClick={() => setShowSuccessMessage(false)}
                className="text-green-400 hover:text-green-600"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">Search users</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              id="search"
              name="search"
              className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Search by name or email..."
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="all">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="AGENT">Agent</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role & Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center">
                  <ClockIcon className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
                  <p className="mt-2 text-gray-500">Loading users...</p>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  {users.length === 0 ? 'No users found' : 'No users match your filters'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <UsersIcon className="h-6 w-6 text-gray-500" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mb-1 ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'MANAGER' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'AGENT' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        user.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.department || 'Not specified'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-4">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Enhanced Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <UsersIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Create New User
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Add a new user to the system with enterprise-grade validation and security.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form className="mt-6 space-y-4">
                {/* General Error */}
                {formErrors.general && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm text-red-800">{formErrors.general}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                      formErrors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                    placeholder="Enter full name"
                  />
                  {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
                </div>

                {/* Email with Real-time Validation */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                  <div className="mt-1 relative">
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        formErrors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                      placeholder="user@company.com"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      {getEmailValidationIcon()}
                    </div>
                  </div>
                  {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
                  {emailValidation && emailValidation.isValid && !emailValidation.isUnique && (
                    <p className="mt-1 text-sm text-amber-600">
                      Email belongs to: {emailValidation.existingUser?.name}
                    </p>
                  )}
                  {emailValidation && emailValidation.isValid && emailValidation.isUnique && (
                    <p className="mt-1 text-sm text-green-600">Email is available</p>
                  )}
                </div>

                {/* Password with Strength Meter */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    name="password"
                    id="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                      formErrors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                    placeholder="Enter secure password"
                  />
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength.score)}`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-600">{passwordStrength.feedback}</span>
                      </div>
                    </div>
                  )}
                  {formErrors.password && <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>}
                </div>

                {/* Role */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="AGENT">Agent</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700">Department (Optional)</label>
                  <input
                    type="text"
                    name="department"
                    id="department"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Sales, Support, etc."
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </form>

              <div className="mt-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={createUser}
                  disabled={isSubmitting || emailValidating || (emailValidation && !emailValidation.isUnique)}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm sm:ml-3 sm:w-auto sm:text-sm ${
                    isSubmitting || emailValidating || (emailValidation && !emailValidation.isUnique)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <ShieldCheckIcon className="h-4 w-4 mr-2" />
                      Create User
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      name: '', email: '', password: '', role: 'AGENT',
                      status: 'ACTIVE', department: '', phoneNumber: ''
                    });
                    setEmailValidation(null);
                    setFormErrors({});
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}