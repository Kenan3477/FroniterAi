'use client';

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface SLA {
  id: string;
  name: string;
  description: string;
  type: 'response_time' | 'resolution_time' | 'first_call_resolution' | 'abandon_rate' | 'custom';
  target: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'percentage';
  priority: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  currentValue?: number;
  status: 'met' | 'at_risk' | 'violated';
}

interface SLAFormData {
  name: string;
  description: string;
  type: SLA['type'];
  target: number;
  unit: SLA['unit'];
  priority: SLA['priority'];
  isActive: boolean;
}

const defaultFormData: SLAFormData = {
  name: '',
  description: '',
  type: 'response_time',
  target: 0,
  unit: 'minutes',
  priority: 'medium',
  isActive: true
};

export default function SLAsManagement() {
  const [slas, setSLAs] = useState<SLA[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSLA, setEditingSLA] = useState<SLA | null>(null);
  const [formData, setFormData] = useState<SLAFormData>(defaultFormData);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSLAs();
  }, []);

  const loadSLAs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/slas', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setSLAs(result.data || []);
      } else {
        console.error('Failed to load SLAs:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading SLAs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSLA = async () => {
    try {
      const response = await fetch('/api/admin/slas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setSLAs(prev => [...prev, result.data]);
        setShowCreateModal(false);
        setFormData(defaultFormData);
        console.log('✅ SLA created successfully');
      } else {
        console.error('Failed to create SLA:', response.statusText);
      }
    } catch (error) {
      console.error('Error creating SLA:', error);
    }
  };

  const handleUpdateSLA = async () => {
    if (!editingSLA) return;

    try {
      const response = await fetch(`/api/admin/slas/${editingSLA.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setSLAs(prev => prev.map(sla => sla.id === editingSLA.id ? result.data : sla));
        setEditingSLA(null);
        setFormData(defaultFormData);
        console.log('✅ SLA updated successfully');
      } else {
        console.error('Failed to update SLA:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating SLA:', error);
    }
  };

  const handleDeleteSLA = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SLA?')) return;

    try {
      const response = await fetch(`/api/admin/slas/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSLAs(prev => prev.filter(sla => sla.id !== id));
        console.log('✅ SLA deleted successfully');
      } else {
        console.error('Failed to delete SLA:', response.statusText);
      }
    } catch (error) {
      console.error('Error deleting SLA:', error);
    }
  };

  const getStatusIcon = (status: SLA['status']) => {
    switch (status) {
      case 'met':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'at_risk':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'violated':
        return <XMarkIcon className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: SLA['status']) => {
    switch (status) {
      case 'met':
        return 'bg-green-100 text-green-800';
      case 'at_risk':
        return 'bg-yellow-100 text-yellow-800';
      case 'violated':
        return 'bg-red-100 text-red-800';
    }
  };

  const getPriorityColor = (priority: SLA['priority']) => {
    switch (priority) {
      case 'low':
        return 'bg-gray-100 text-gray-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
    }
  };

  const filteredSLAs = slas.filter(sla =>
    sla.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sla.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTarget = (target: number, unit: string) => {
    return `${target} ${unit}`;
  };

  const formatCurrentValue = (value: number | undefined, unit: string) => {
    if (value === undefined) return 'N/A';
    return `${value} ${unit}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SLA Management</h1>
          <p className="text-gray-600">Configure and monitor service level agreements</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create SLA
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search SLAs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
        </div>
      </div>

      {/* SLA List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading SLAs...</p>
          </div>
        ) : filteredSLAs.length === 0 ? (
          <div className="p-8 text-center">
            <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No SLAs Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No SLAs match your search criteria.' : 'Get started by creating your first SLA.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create SLA
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SLA Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSLAs.map((sla) => (
                  <tr key={sla.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center">
                          <h4 className="text-sm font-medium text-gray-900">{sla.name}</h4>
                          {!sla.isActive && (
                            <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{sla.description}</p>
                        <span className="text-xs text-gray-500 capitalize">{sla.type.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatTarget(sla.target, sla.unit)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrentValue(sla.currentValue, sla.unit)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(sla.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sla.status)}`}>
                          {sla.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(sla.priority)}`}>
                        {sla.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingSLA(sla);
                            setFormData({
                              name: sla.name,
                              description: sla.description,
                              type: sla.type,
                              target: sla.target,
                              unit: sla.unit,
                              priority: sla.priority,
                              isActive: sla.isActive
                            });
                          }}
                          className="text-slate-600 hover:text-slate-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSLA(sla.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
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

      {/* Create/Edit SLA Modal */}
      {(showCreateModal || editingSLA) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingSLA ? 'Edit SLA' : 'Create New SLA'}
            </h3>
            
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
                  placeholder="Response Time SLA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Maximum time to respond to customer inquiries"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as SLA['type'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="response_time">Response Time</option>
                    <option value="resolution_time">Resolution Time</option>
                    <option value="first_call_resolution">First Call Resolution</option>
                    <option value="abandon_rate">Abandon Rate</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as SLA['priority'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Value
                  </label>
                  <input
                    type="number"
                    value={formData.target}
                    onChange={(e) => setFormData(prev => ({ ...prev, target: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value as SLA['unit'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  Active
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingSLA(null);
                  setFormData(defaultFormData);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingSLA ? handleUpdateSLA : handleCreateSLA}
                className="px-4 py-2 bg-slate-600 text-white rounded-md text-sm font-medium hover:bg-slate-700"
              >
                {editingSLA ? 'Update' : 'Create'} SLA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}