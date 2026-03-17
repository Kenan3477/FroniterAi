'use client';

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  Squares2X2Icon,
  CogIcon,
  ChartBarIcon,
  TableCellsIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface DashboardView {
  id: string;
  name: string;
  description: string;
  type: 'dashboard' | 'report' | 'analytics' | 'custom';
  layout: 'grid' | 'list' | 'cards' | 'timeline';
  isDefault: boolean;
  isPublic: boolean;
  userId: string;
  userRole: string;
  widgets: ViewWidget[];
  createdAt: string;
  updatedAt: string;
}

interface ViewWidget {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'metric' | 'recent_activity';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
}

interface ViewFormData {
  name: string;
  description: string;
  type: DashboardView['type'];
  layout: DashboardView['layout'];
  isDefault: boolean;
  isPublic: boolean;
}

const defaultFormData: ViewFormData = {
  name: '',
  description: '',
  type: 'dashboard',
  layout: 'grid',
  isDefault: false,
  isPublic: false
};

export default function ViewsManagement() {
  const [views, setViews] = useState<DashboardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingView, setEditingView] = useState<DashboardView | null>(null);
  const [formData, setFormData] = useState<ViewFormData>(defaultFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    loadViews();
  }, []);

  const loadViews = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/views', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setViews(result.data || []);
      } else {
        console.error('Failed to load views:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading views:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateView = async () => {
    try {
      const response = await fetch('/api/admin/views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setViews(prev => [...prev, result.data]);
        setShowCreateModal(false);
        setFormData(defaultFormData);
        console.log('✅ View created successfully');
      } else {
        console.error('Failed to create view:', response.statusText);
      }
    } catch (error) {
      console.error('Error creating view:', error);
    }
  };

  const handleUpdateView = async () => {
    if (!editingView) return;

    try {
      const response = await fetch(`/api/admin/views/${editingView.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setViews(prev => prev.map(view => view.id === editingView.id ? result.data : view));
        setEditingView(null);
        setFormData(defaultFormData);
        console.log('✅ View updated successfully');
      } else {
        console.error('Failed to update view:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating view:', error);
    }
  };

  const handleDeleteView = async (id: string) => {
    if (!confirm('Are you sure you want to delete this view?')) return;

    try {
      const response = await fetch(`/api/admin/views/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setViews(prev => prev.filter(view => view.id !== id));
        console.log('✅ View deleted successfully');
      } else {
        console.error('Failed to delete view:', response.statusText);
      }
    } catch (error) {
      console.error('Error deleting view:', error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/views/${id}/default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update all views - remove default from others, set this one as default
        setViews(prev => prev.map(view => ({
          ...view,
          isDefault: view.id === id
        })));
        console.log('✅ Default view updated successfully');
      } else {
        console.error('Failed to set default view:', response.statusText);
      }
    } catch (error) {
      console.error('Error setting default view:', error);
    }
  };

  const getTypeIcon = (type: DashboardView['type']) => {
    switch (type) {
      case 'dashboard':
        return <Squares2X2Icon className="h-5 w-5" />;
      case 'report':
        return <ChartBarIcon className="h-5 w-5" />;
      case 'analytics':
        return <ChartBarIcon className="h-5 w-5" />;
      case 'custom':
        return <CogIcon className="h-5 w-5" />;
      default:
        return <EyeIcon className="h-5 w-5" />;
    }
  };

  const getLayoutIcon = (layout: DashboardView['layout']) => {
    switch (layout) {
      case 'grid':
        return <Squares2X2Icon className="h-4 w-4" />;
      case 'list':
        return <TableCellsIcon className="h-4 w-4" />;
      case 'cards':
        return <Squares2X2Icon className="h-4 w-4" />;
      case 'timeline':
        return <ChartBarIcon className="h-4 w-4" />;
    }
  };

  const filteredViews = views.filter(view => {
    const matchesSearch = view.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         view.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || view.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Views</h1>
          <p className="text-gray-600">Configure and manage dashboard layouts and views</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create View
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search views..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="all">All Types</option>
            <option value="dashboard">Dashboard</option>
            <option value="report">Report</option>
            <option value="analytics">Analytics</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {/* Views Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading views...</p>
          </div>
        ) : filteredViews.length === 0 ? (
          <div className="p-8 text-center">
            <EyeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Views Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No views match your search criteria.' : 'Get started by creating your first dashboard view.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create View
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {filteredViews.map((view) => (
              <div key={view.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(view.type)}
                    <h3 className="text-lg font-medium text-gray-900">{view.name}</h3>
                  </div>
                  <div className="flex items-center space-x-1">
                    {view.isDefault && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Default
                      </span>
                    )}
                    {view.isPublic && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        Public
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">{view.description}</p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-2">
                    {getLayoutIcon(view.layout)}
                    <span className="capitalize">{view.layout}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>{view.widgets?.length || 0} widgets</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 capitalize">
                    {view.type} • {view.userRole}
                  </span>
                  <div className="flex items-center space-x-2">
                    {!view.isDefault && (
                      <button
                        onClick={() => handleSetDefault(view.id)}
                        className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 border border-slate-300 rounded"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingView(view);
                        setFormData({
                          name: view.name,
                          description: view.description,
                          type: view.type,
                          layout: view.layout,
                          isDefault: view.isDefault,
                          isPublic: view.isPublic
                        });
                      }}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteView(view.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit View Modal */}
      {(showCreateModal || editingView) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingView ? 'Edit View' : 'Create New View'}
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
                  placeholder="Sales Dashboard"
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
                  placeholder="Overview of sales metrics and performance"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as DashboardView['type'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="dashboard">Dashboard</option>
                    <option value="report">Report</option>
                    <option value="analytics">Analytics</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Layout
                  </label>
                  <select
                    value={formData.layout}
                    onChange={(e) => setFormData(prev => ({ ...prev, layout: e.target.value as DashboardView['layout'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="grid">Grid</option>
                    <option value="list">List</option>
                    <option value="cards">Cards</option>
                    <option value="timeline">Timeline</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                    Set as default view
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                    Make publicly available
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingView(null);
                  setFormData(defaultFormData);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingView ? handleUpdateView : handleCreateView}
                className="px-4 py-2 bg-slate-600 text-white rounded-md text-sm font-medium hover:bg-slate-700"
              >
                {editingView ? 'Update' : 'Create'} View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}