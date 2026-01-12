'use client';

import { useState, useEffect } from 'react';
import {
  BoltIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CloudIcon,
  CogIcon,
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  ChartBarIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';

interface Integration {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  category: 'CRM' | 'EMAIL' | 'SMS' | 'WEBHOOK' | 'ANALYTICS' | 'OTHER';
  type: 'OAUTH' | 'API_KEY' | 'WEBHOOK' | 'DIRECT';
  iconUrl?: string;
  documentationUrl?: string;
  isPublic: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    connections: number;
  };
}

interface Connection {
  id: string;
  integrationId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING';
  lastSyncAt?: string;
  lastError?: string;
  syncCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  integration: {
    name: string;
    displayName: string;
    category: string;
    type: string;
    iconUrl?: string;
  };
}

interface Webhook {
  id: string;
  connectionId?: string;
  name: string;
  url: string;
  method: string;
  events: string[];
  isActive: boolean;
  successCount: number;
  failureCount: number;
  lastTriggeredAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  createdAt: string;
  connection?: {
    integration: {
      name: string;
      displayName: string;
    };
  };
}

interface IntegrationStats {
  integrations: {
    total: number;
    byCategory: Record<string, number>;
  };
  connections: {
    total: number;
    active: number;
    inactive: number;
    byStatus: Record<string, number>;
  };
  webhooks: {
    total: number;
    active: number;
    inactive: number;
  };
}

type ViewMode = 'marketplace' | 'connections' | 'webhooks';

export default function AppsIntegrations() {
  const [viewMode, setViewMode] = useState<ViewMode>('marketplace');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [stats, setStats] = useState<IntegrationStats | null>({
    integrations: { total: 0, byCategory: {} },
    connections: { total: 0, active: 0, inactive: 0, byStatus: {} },
    webhooks: { total: 0, active: 0, inactive: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Fetch data functions
  const fetchIntegrations = async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const response = await fetch(`/api/admin/integrations/integrations?${params}`);
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    }
  };

  const fetchConnections = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/admin/integrations/connections?${params}`);
      if (response.ok) {
        const data = await response.json();
        setConnections(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('isActive', statusFilter === 'active' ? 'true' : 'false');

      const response = await fetch(`/api/admin/integrations/webhooks?${params}`);
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/integrations/stats');
      if (response.ok) {
        const responseData = await response.json();
        // Handle both direct stats and wrapped response formats
        const statsData = responseData.data || responseData;
        
        // Validate that we have the expected structure
        if (statsData && typeof statsData === 'object') {
          setStats({
            integrations: statsData.integrations || { total: 0, byCategory: {} },
            connections: statsData.connections || { total: 0, active: 0, inactive: 0, byStatus: {} },
            webhooks: statsData.webhooks || { total: 0, active: 0, inactive: 0 }
          });
        } else {
          // Fallback to default if structure is invalid
          setStats({
            integrations: { total: 0, byCategory: {} },
            connections: { total: 0, active: 0, inactive: 0, byStatus: {} },
            webhooks: { total: 0, active: 0, inactive: 0 }
          });
        }
      } else {
        // Provide default stats if API call fails
        setStats({
          integrations: {
            total: 0,
            byCategory: {}
          },
          connections: {
            total: 0,
            active: 0,
            inactive: 0,
            byStatus: {}
          },
          webhooks: {
            total: 0,
            active: 0,
            inactive: 0
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Provide default stats on error
      setStats({
        integrations: {
          total: 0,
          byCategory: {}
        },
        connections: {
          total: 0,
          active: 0,
          inactive: 0,
          byStatus: {}
        },
        webhooks: {
          total: 0,
          active: 0,
          inactive: 0
        }
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchIntegrations(),
        fetchConnections(),
        fetchWebhooks(),
        fetchStats()
      ]);
      setLoading(false);
    };
    loadData();
  }, [categoryFilter, statusFilter]);

  // Helper functions
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'CRM':
        return <CloudIcon className="w-5 h-5 text-blue-500" />;
      case 'EMAIL':
        return <BeakerIcon className="w-5 h-5 text-slate-500" />;
      case 'SMS':
        return <LinkIcon className="w-5 h-5 text-purple-500" />;
      case 'WEBHOOK':
        return <BoltIcon className="w-5 h-5 text-orange-500" />;
      case 'ANALYTICS':
        return <ChartBarIcon className="w-5 h-5 text-red-500" />;
      default:
        return <CogIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircleIcon className="w-5 h-5 text-slate-500" />;
      case 'INACTIVE':
        return <XCircleIcon className="w-5 h-5 text-gray-500" />;
      case 'ERROR':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'PENDING':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
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

  const filteredData = () => {
    const searchLower = searchTerm.toLowerCase();
    
    switch (viewMode) {
      case 'marketplace':
        return integrations.filter(integration => 
          integration.displayName.toLowerCase().includes(searchLower) ||
          integration.description?.toLowerCase().includes(searchLower)
        );
      case 'connections':
        return connections.filter(connection => 
          connection.name.toLowerCase().includes(searchLower) ||
          connection.integration.displayName.toLowerCase().includes(searchLower)
        );
      case 'webhooks':
        return webhooks.filter(webhook => 
          webhook.name.toLowerCase().includes(searchLower) ||
          webhook.url.toLowerCase().includes(searchLower)
        );
      default:
        return [];
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
          <h1 className="text-2xl font-bold text-gray-900">Apps & Integrations</h1>
          <p className="text-gray-600">Connect and manage third-party applications and services</p>
        </div>
        <button
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Add Integration
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BoltIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Available Apps</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats?.integrations?.total || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <LinkIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Connections</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats?.connections?.total || 0}</dd>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats?.connections?.active || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BeakerIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Webhooks</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats?.webhooks?.total || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CloudIcon className="h-6 w-6 text-indigo-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">CRM Apps</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats?.integrations?.byCategory?.CRM || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setViewMode('marketplace')}
            className={`${
              viewMode === 'marketplace'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            <BoltIcon className="h-5 w-5 inline mr-2" />
            App Marketplace
          </button>
          <button
            onClick={() => setViewMode('connections')}
            className={`${
              viewMode === 'connections'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            <LinkIcon className="h-5 w-5 inline mr-2" />
            My Connections ({stats?.connections?.total || 0})
          </button>
          <button
            onClick={() => setViewMode('webhooks')}
            className={`${
              viewMode === 'webhooks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            <BeakerIcon className="h-5 w-5 inline mr-2" />
            Webhooks ({stats?.webhooks?.total || 0})
          </button>
        </nav>
      </div>

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
                placeholder={`Search ${viewMode}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="filter" className="block text-sm font-medium text-gray-700">
              {viewMode === 'marketplace' ? 'Category' : 'Status'}
            </label>
            <select
              id="filter"
              value={viewMode === 'marketplace' ? categoryFilter : statusFilter}
              onChange={(e) => viewMode === 'marketplace' ? setCategoryFilter(e.target.value) : setStatusFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {viewMode === 'marketplace' ? (
                <>
                  <option value="all">All Categories</option>
                  <option value="CRM">CRM</option>
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="WEBHOOK">Webhook</option>
                  <option value="ANALYTICS">Analytics</option>
                  <option value="OTHER">Other</option>
                </>
              ) : (
                <>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  {viewMode === 'connections' && (
                    <>
                      <option value="ERROR">Error</option>
                      <option value="PENDING">Pending</option>
                    </>
                  )}
                </>
              )}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
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

      {/* Content Based on View Mode */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {viewMode === 'marketplace' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredData().length === 0 ? (
              <div className="col-span-full text-center py-12">
                <BoltIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No integrations found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
              </div>
            ) : (
              filteredData().map((integration: any) => (
                <div key={integration.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      {integration.iconUrl ? (
                        <img src={integration.iconUrl} alt={integration.displayName} className="w-10 h-10 rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                          {getCategoryIcon(integration.category)}
                        </div>
                      )}
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">{integration.displayName}</h3>
                        <p className="text-sm text-gray-500">{integration.category} • {integration.type}</p>
                      </div>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      v{integration.version}
                    </span>
                  </div>
                  
                  {integration.description && (
                    <p className="mt-4 text-sm text-gray-600">{integration.description}</p>
                  )}
                  
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {integration._count?.connections || 0} connections
                    </div>
                    <div className="flex space-x-2">
                      {integration.documentationUrl && (
                        <a
                          href={integration.documentationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-500"
                        >
                          Docs
                        </a>
                      )}
                      <button className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                        Connect
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {viewMode === 'connections' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Connection
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Sync
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sync Count
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData().length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                      No connections found. Connect to an app to get started.
                    </td>
                  </tr>
                ) : (
                  filteredData().map((connection: any) => (
                    <tr key={connection.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                            {getCategoryIcon(connection.integration.category)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{connection.name}</div>
                            <div className="text-sm text-gray-500">{connection.integration.displayName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(connection.status)}
                          <span className="ml-2 text-sm text-gray-900">{connection.status}</span>
                        </div>
                        {connection.lastError && (
                          <div className="text-xs text-red-600 mt-1">{connection.lastError}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {connection.lastSyncAt ? formatDate(connection.lastSyncAt) : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {connection.syncCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'webhooks' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Webhook
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Triggered
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData().length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                      No webhooks found. Create a webhook to get started.
                    </td>
                  </tr>
                ) : (
                  filteredData().map((webhook: any) => {
                    const total = webhook.successCount + webhook.failureCount;
                    const successRate = total > 0 ? Math.round((webhook.successCount / total) * 100) : 0;
                    
                    return (
                      <tr key={webhook.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{webhook.name}</div>
                            <div className="text-sm text-gray-500">{webhook.url}</div>
                            <div className="text-xs text-gray-400">
                              {webhook.method} • {webhook.events.join(', ')}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {webhook.isActive ? 
                              <CheckCircleIcon className="w-5 h-5 text-slate-500" /> :
                              <XCircleIcon className="w-5 h-5 text-gray-500" />
                            }
                            <span className="ml-2 text-sm text-gray-900">
                              {webhook.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{successRate}%</div>
                          <div className="text-xs text-gray-500">
                            {webhook.successCount} / {total}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {webhook.lastTriggeredAt ? formatDate(webhook.lastTriggeredAt) : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button className="text-gray-400 hover:text-gray-600">
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}