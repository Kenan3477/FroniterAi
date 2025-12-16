'use client';

import { useState, useEffect } from 'react';
import {
  KeyIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  ClockIcon,
  ChartBarIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface ApiKey {
  id: string;
  name: string;
  description?: string;
  prefix: string;
  maskedKey?: string;
  apiKey?: string; // Only present on creation
  scopes: string[];
  environment: 'production' | 'staging' | 'development';
  rateLimit?: number;
  usageCount: number;
  lastUsedAt?: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiKeyStats {
  total: number;
  active: number;
  expired: number;
  inactive: number;
  byEnvironment: {
    production: number;
    staging: number;
    development: number;
  };
  recentUsage: number;
}

export default function ApiManagement() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [stats, setStats] = useState<ApiKeyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  // Fetch API keys and stats
  const fetchApiKeys = async () => {
    try {
      const params = new URLSearchParams();
      if (environmentFilter !== 'all') params.append('environment', environmentFilter);
      if (statusFilter !== 'all') params.append('isActive', statusFilter === 'active' ? 'true' : 'false');

      const response = await fetch(`/api/admin/api/keys?${params}`);
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/api/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchApiKeys(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [environmentFilter, statusFilter]);

  // Filter API keys
  const filteredApiKeys = apiKeys.filter(key => {
    const matchesSearch = key.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (key.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Helper functions
  const getEnvironmentBadgeColor = (environment: string) => {
    switch (environment) {
      case 'production':
        return 'bg-red-100 text-red-800';
      case 'staging':
        return 'bg-yellow-100 text-yellow-800';
      case 'development':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (isActive: boolean, expiresAt?: string) => {
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />;
    }
    return isActive ? 
      <CheckCircleIcon className="w-5 h-5 text-green-500" /> : 
      <XCircleIcon className="w-5 h-5 text-red-500" />;
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleSelectKey = (keyId: string) => {
    setSelectedKeys(prev => 
      prev.includes(keyId) 
        ? prev.filter(id => id !== keyId)
        : [...prev, keyId]
    );
  };

  const handleSelectAll = () => {
    setSelectedKeys(
      selectedKeys.length === filteredApiKeys.length 
        ? [] 
        : filteredApiKeys.map(key => key.id)
    );
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return;
    
    try {
      const response = await fetch(`/api/admin/api/keys/${keyId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchApiKeys();
        await fetchStats();
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
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
          <h1 className="text-2xl font-bold text-gray-900">API Management</h1>
          <p className="text-gray-600">Manage API keys, endpoints, and access controls</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Create API Key
        </button>
      </div>

      {/* Newly Created Key Alert */}
      {newlyCreatedKey && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Save your API key:</strong> This is the only time it will be shown.
              </p>
              <div className="mt-2 flex items-center">
                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                  {newlyCreatedKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newlyCreatedKey)}
                  className="ml-2 text-yellow-700 hover:text-yellow-600"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setNewlyCreatedKey(null)}
                className="text-yellow-400 hover:text-yellow-600"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <KeyIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Keys</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.active}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Expired</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.expired}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Production</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.byEnvironment.production}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">30d Usage</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.recentUsage}</dd>
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
                placeholder="Search API keys..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="environment-filter" className="block text-sm font-medium text-gray-700">Environment</label>
            <select
              id="environment-filter"
              value={environmentFilter}
              onChange={(e) => setEnvironmentFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Environments</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
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
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setEnvironmentFilter('all');
                setStatusFilter('all');
              }}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FunnelIcon className="-ml-1 mr-2 h-5 w-5" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* API Keys Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="min-w-full divide-y divide-gray-200">
          <div className="bg-gray-50 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedKeys.length === filteredApiKeys.length && filteredApiKeys.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm font-medium text-gray-900">
                  {selectedKeys.length > 0 ? `${selectedKeys.length} selected` : `${filteredApiKeys.length} API keys`}
                </span>
              </div>
              {selectedKeys.length > 0 && (
                <div className="flex space-x-2">
                  <button className="text-sm text-blue-600 hover:text-blue-900">Bulk Activate</button>
                  <button className="text-sm text-red-600 hover:text-red-900">Bulk Deactivate</button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white divide-y divide-gray-200">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-1"></div>
              <div className="col-span-3">Name & Key</div>
              <div className="col-span-2">Environment</div>
              <div className="col-span-2">Usage & Limits</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Actions</div>
            </div>

            {filteredApiKeys.map((apiKey) => (
              <div key={apiKey.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50">
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(apiKey.id)}
                    onChange={() => handleSelectKey(apiKey.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="col-span-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <KeyIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{apiKey.name}</div>
                      {apiKey.description && (
                        <div className="text-sm text-gray-500">{apiKey.description}</div>
                      )}
                      <div className="text-xs font-mono text-gray-400 mt-1">
                        {apiKey.maskedKey}
                        <button
                          onClick={() => copyToClipboard(apiKey.maskedKey || '')}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          <DocumentDuplicateIcon className="h-3 w-3 inline" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEnvironmentBadgeColor(apiKey.environment)}`}>
                    {apiKey.environment}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    Scopes: {apiKey.scopes.join(', ')}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-sm text-gray-900">
                    {apiKey.usageCount.toLocaleString()} requests
                  </div>
                  {apiKey.rateLimit && (
                    <div className="text-xs text-gray-500">
                      Limit: {apiKey.rateLimit}/min
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Last used: {apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : 'Never'}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center">
                    {getStatusIcon(apiKey.isActive, apiKey.expiresAt)}
                    <span className="ml-2 text-sm text-gray-900">
                      {apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date() ? 'Expired' :
                       apiKey.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {apiKey.expiresAt && (
                    <div className="text-xs text-gray-500">
                      Expires: {formatDate(apiKey.expiresAt)}
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingKey(apiKey)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      <ChartBarIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteApiKey(apiKey.id)}
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

        {filteredApiKeys.length === 0 && (
          <div className="text-center py-12">
            <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No API keys found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first API key to get started.
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit API Key Modal */}
      {(showCreateModal || editingKey) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {editingKey ? 'Edit API Key' : 'Create New API Key'}
                    </h3>
                    <div className="mt-4 space-y-4">
                      <p className="text-sm text-gray-500">
                        {editingKey ? 'Update API key configuration' : 'Create a new API key for system access'}
                      </p>
                      {/* Form would go here - simplified for now */}
                      <div className="text-sm text-gray-500">
                        API key form component would be implemented here with proper form handling, validation, and API integration.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {editingKey ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingKey(null);
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
    </div>
  );
}