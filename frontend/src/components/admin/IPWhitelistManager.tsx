/**
 * IP Whitelist Management Component
 * Only accessible to Ken (ken@simpleemails.co.uk) - Creator of Omnivox
 * Manages IP addresses that are allowed to access the system
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  ShieldCheckIcon,
  ClockIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface IPWhitelistEntry {
  id: string;
  ipAddress: string;
  name: string;
  description?: string;
  addedBy: string;
  addedAt: string;
  lastActivity?: string;
  isActive: boolean;
  activityCount: number;
}

interface IPActivity {
  id: string;
  ipAddress: string;
  timestamp: string;
  method: string;
  path: string;
  userAgent?: string;
  userEmail?: string;
  userId?: string;
  responseStatus?: number;
  responseTime?: number;
}

const IPWhitelistManager: React.FC = () => {
  const authHeaders = (): HeadersInit => {
    const token =
      localStorage.getItem('omnivox_token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('auth_token') ||
      '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [whitelist, setWhitelist] = useState<IPWhitelistEntry[]>([]);
  const [activities, setActivities] = useState<IPActivity[]>([]);
  const [currentIP, setCurrentIP] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedIPForActivity, setSelectedIPForActivity] = useState<string>('');

  // Add form state
  const [newIP, setNewIP] = useState({
    ipAddress: '',
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchWhitelist();
  }, []);

  const fetchWhitelist = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/ip-whitelist', {
        headers: authHeaders(),
        credentials: 'include',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.message || `Failed to fetch whitelist (${response.status})`,
        );
      }

      if (result.success) {
        setWhitelist(result.data.whitelist);
        setCurrentIP(result.data.currentIP);
      } else {
        throw new Error(result.error || 'Failed to fetch whitelist');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch whitelist');
      console.error('❌ Error fetching whitelist:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIPActivity = async (ipAddress?: string) => {
    try {
      const url = ipAddress 
        ? `/api/admin/ip-activity?ip=${encodeURIComponent(ipAddress)}&limit=100`
        : '/api/admin/ip-activity?limit=100';
        
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch IP activity');
      }

      if (result.success) {
        setActivities(result.data.logs);
      } else {
        throw new Error(result.error || 'Failed to fetch IP activity');
      }
    } catch (err) {
      console.error('❌ Error fetching IP activity:', err);
    }
  };

  const addIPToWhitelist = async () => {
    try {
      if (!newIP.ipAddress || !newIP.name) {
        setError('IP address and name are required');
        return;
      }

      const response = await fetch('/api/admin/ip-whitelist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify(newIP),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.message || `Failed to add IP to whitelist (${response.status})`,
        );
      }

      if (result.success) {
        setShowAddForm(false);
        setNewIP({ ipAddress: '', name: '', description: '' });
        await fetchWhitelist();
      } else {
        throw new Error(result.error || 'Failed to add IP to whitelist');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add IP to whitelist');
      console.error('❌ Error adding IP to whitelist:', err);
    }
  };

  const removeIPFromWhitelist = async (ipAddress: string) => {
    try {
      const response = await fetch(
        `/api/admin/ip-whitelist/${encodeURIComponent(ipAddress)}`,
        {
          method: 'DELETE',
          headers: authHeaders(),
          credentials: 'include',
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.message || `Failed to remove IP from whitelist (${response.status})`,
        );
      }

      if (result.success) {
        await fetchWhitelist();
      } else {
        throw new Error(result.error || 'Failed to remove IP from whitelist');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove IP from whitelist');
      console.error('❌ Error removing IP from whitelist:', err);
    }
  };

  const viewIPActivity = async (ipAddress: string) => {
    setSelectedIPForActivity(ipAddress);
    await fetchIPActivity(ipAddress);
    setShowActivityModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircleIcon className="w-4 h-4 mr-1" />
          Active
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircleIcon className="w-4 h-4 mr-1" />
          Inactive
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">IP Whitelist Security</h1>
                <p className="text-gray-600 mt-1">
                  Omnivox AI Security System - Only Ken can manage whitelisted IP addresses
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add IP Address
            </button>
          </div>

          {/* Current IP Display */}
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <div className="flex items-center">
              <ComputerDesktopIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">Your Current IP:</span>
              <code className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{currentIP}</code>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <div className="text-sm text-red-700">{error}</div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* IP Whitelist Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Whitelisted IP Addresses</h3>
            <p className="text-sm text-gray-600 mt-1">
              {whitelist.length} IP addresses are currently whitelisted
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {whitelist.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        <code className="bg-gray-100 px-2 py-1 rounded">{entry.ipAddress}</code>
                      </div>
                      {entry.description && (
                        <div className="text-sm text-gray-500">{entry.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{entry.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(entry.isActive)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{entry.activityCount} requests</div>
                      {entry.lastActivity && (
                        <div className="text-sm text-gray-500">
                          Last: {formatDate(entry.lastActivity)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(entry.addedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => viewIPActivity(entry.ipAddress)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {entry.id !== 'default-localhost' && entry.id !== 'default-localhost-ipv6' && (
                        <button
                          onClick={() => removeIPFromWhitelist(entry.ipAddress)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add IP Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add IP to Whitelist</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IP Address *</label>
                    <input
                      type="text"
                      value={newIP.ipAddress}
                      onChange={(e) => setNewIP({ ...newIP, ipAddress: e.target.value })}
                      placeholder="192.168.1.1"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name *</label>
                    <input
                      type="text"
                      value={newIP.name}
                      onChange={(e) => setNewIP({ ...newIP, name: e.target.value })}
                      placeholder="Office Network"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={newIP.description}
                      onChange={(e) => setNewIP({ ...newIP, description: e.target.value })}
                      placeholder="Description of this IP address..."
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addIPToWhitelist}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Add IP
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* IP Activity Modal */}
        {showActivityModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Activity for IP: {selectedIPForActivity}
                </h3>
                <button
                  onClick={() => setShowActivityModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Timestamp
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Method
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Path
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        User
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activities.map((activity) => (
                      <tr key={activity.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatDate(activity.timestamp)}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            activity.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                            activity.method === 'POST' ? 'bg-green-100 text-green-800' :
                            activity.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {activity.method}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 font-mono">
                          {activity.path}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            activity.responseStatus && activity.responseStatus < 300 ? 'bg-green-100 text-green-800' :
                            activity.responseStatus && activity.responseStatus < 400 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {activity.responseStatus || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {activity.userEmail || 'Anonymous'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IPWhitelistManager;