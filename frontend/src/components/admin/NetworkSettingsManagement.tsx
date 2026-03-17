'use client';

import { useState, useEffect } from 'react';
import {
  GlobeAltIcon,
  ShieldCheckIcon,
  WifiIcon,
  ServerIcon,
  CloudIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface NetworkConfig {
  id: string;
  name: string;
  type: 'cdn' | 'load_balancer' | 'firewall' | 'ssl' | 'dns' | 'cache' | 'monitoring';
  status: 'active' | 'inactive' | 'error' | 'pending';
  endpoint: string;
  configuration: Record<string, any>;
  lastChecked: string;
  health: 'healthy' | 'warning' | 'critical';
  metrics?: {
    latency: number;
    uptime: number;
    throughput: number;
    errorRate: number;
  };
}

interface NetworkFormData {
  name: string;
  type: NetworkConfig['type'];
  endpoint: string;
  configuration: Record<string, any>;
}

const defaultFormData: NetworkFormData = {
  name: '',
  type: 'dns',
  endpoint: '',
  configuration: {}
};

export default function NetworkSettingsManagement() {
  const [configs, setConfigs] = useState<NetworkConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<NetworkConfig | null>(null);
  const [formData, setFormData] = useState<NetworkFormData>(defaultFormData);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [systemHealth, setSystemHealth] = useState<Record<string, any>>({});

  useEffect(() => {
    loadNetworkConfigs();
    loadSystemHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadSystemHealth();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNetworkConfigs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/network', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setConfigs(result.data || []);
      } else {
        console.error('Failed to load network configs:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading network configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemHealth = async () => {
    try {
      const response = await fetch('/api/admin/network/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setSystemHealth(result.data || {});
      }
    } catch (error) {
      console.error('Error loading system health:', error);
    }
  };

  const handleCreateConfig = async () => {
    try {
      const response = await fetch('/api/admin/network', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setConfigs(prev => [...prev, result.data]);
        setShowCreateModal(false);
        setFormData(defaultFormData);
        console.log('✅ Network configuration created successfully');
      } else {
        console.error('Failed to create network config:', response.statusText);
      }
    } catch (error) {
      console.error('Error creating network config:', error);
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/network/${id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Connection test successful:', result);
        
        // Update the config status
        setConfigs(prev => prev.map(config => 
          config.id === id 
            ? { ...config, status: result.success ? 'active' : 'error', lastChecked: new Date().toISOString() }
            : config
        ));
      } else {
        console.error('Failed to test connection:', response.statusText);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this network configuration?')) return;

    try {
      const response = await fetch(`/api/admin/network/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConfigs(prev => prev.filter(config => config.id !== id));
        console.log('✅ Network configuration deleted successfully');
      } else {
        console.error('Failed to delete network config:', response.statusText);
      }
    } catch (error) {
      console.error('Error deleting network config:', error);
    }
  };

  const getTypeIcon = (type: NetworkConfig['type']) => {
    switch (type) {
      case 'cdn':
        return <CloudIcon className="h-5 w-5" />;
      case 'load_balancer':
        return <ServerIcon className="h-5 w-5" />;
      case 'firewall':
        return <ShieldCheckIcon className="h-5 w-5" />;
      case 'ssl':
        return <ShieldCheckIcon className="h-5 w-5" />;
      case 'dns':
        return <GlobeAltIcon className="h-5 w-5" />;
      case 'cache':
        return <ServerIcon className="h-5 w-5" />;
      case 'monitoring':
        return <ChartBarIcon className="h-5 w-5" />;
      default:
        return <WifiIcon className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (status: NetworkConfig['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'inactive':
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: NetworkConfig['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getHealthColor = (health: NetworkConfig['health']) => {
    switch (health) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
    }
  };

  const filteredConfigs = configs.filter(config => {
    return selectedType === 'all' || config.type === selectedType;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Network Settings</h1>
          <p className="text-gray-600">Configure and monitor network infrastructure</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
        >
          <CogIcon className="h-5 w-5 mr-2" />
          Add Configuration
        </button>
      </div>

      {/* System Health Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">System Health Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <WifiIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Network Uptime</p>
                <p className="text-2xl font-bold text-gray-900">{systemHealth.uptime || '99.9%'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Average Latency</p>
                <p className="text-2xl font-bold text-gray-900">{systemHealth.latency || '45ms'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <ServerIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active Connections</p>
                <p className="text-2xl font-bold text-gray-900">{systemHealth.connections || '142'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Security Status</p>
                <p className="text-2xl font-bold text-gray-900">{systemHealth.security || 'Secure'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="all">All Types</option>
            <option value="cdn">CDN</option>
            <option value="load_balancer">Load Balancer</option>
            <option value="firewall">Firewall</option>
            <option value="ssl">SSL/TLS</option>
            <option value="dns">DNS</option>
            <option value="cache">Cache</option>
            <option value="monitoring">Monitoring</option>
          </select>
          <button
            onClick={loadSystemHealth}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
          >
            Refresh Status
          </button>
        </div>
      </div>

      {/* Network Configurations List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading network configurations...</p>
          </div>
        ) : filteredConfigs.length === 0 ? (
          <div className="p-8 text-center">
            <WifiIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Network Configurations</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first network configuration.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
            >
              <CogIcon className="h-5 w-5 mr-2" />
              Add Configuration
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Configuration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Endpoint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Health
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metrics
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getTypeIcon(config.type)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{config.name}</div>
                          <div className="text-sm text-gray-500">
                            Last checked: {new Date(config.lastChecked).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 capitalize">
                        {config.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {config.endpoint}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(config.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(config.status)}`}>
                          {config.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getHealthColor(config.health)}`}>
                        {config.health}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {config.metrics && (
                        <div className="space-y-1">
                          <div>Latency: {config.metrics.latency}ms</div>
                          <div>Uptime: {config.metrics.uptime}%</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleTestConnection(config.id)}
                          className="text-blue-600 hover:text-blue-900 text-xs px-2 py-1 border border-blue-300 rounded"
                        >
                          Test
                        </button>
                        <button
                          onClick={() => handleDeleteConfig(config.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Configuration Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Network Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Primary CDN"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as NetworkConfig['type'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="cdn">CDN</option>
                  <option value="load_balancer">Load Balancer</option>
                  <option value="firewall">Firewall</option>
                  <option value="ssl">SSL/TLS</option>
                  <option value="dns">DNS</option>
                  <option value="cache">Cache</option>
                  <option value="monitoring">Monitoring</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endpoint
                </label>
                <input
                  type="text"
                  value={formData.endpoint}
                  onChange={(e) => setFormData(prev => ({ ...prev, endpoint: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="https://cdn.example.com"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData(defaultFormData);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateConfig}
                className="px-4 py-2 bg-slate-600 text-white rounded-md text-sm font-medium hover:bg-slate-700"
              >
                Add Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}