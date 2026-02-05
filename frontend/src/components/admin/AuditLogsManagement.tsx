'use client';

import { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  UserIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'auth' | 'data' | 'admin' | 'campaign' | 'call' | 'system' | 'security';
  status: 'success' | 'failure' | 'pending';
}

interface AuditFilters {
  dateRange: {
    from: string;
    to: string;
  };
  userId: string;
  action: string;
  severity: string;
  category: string;
  status: string;
}

export default function AuditLogsManagement() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filters, setFilters] = useState<AuditFilters>({
    dateRange: {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 7 days
      to: new Date().toISOString().split('T')[0]
    },
    userId: '',
    action: '',
    severity: '',
    category: '',
    status: ''
  });
  const [stats, setStats] = useState<Record<string, any>>({});

  useEffect(() => {
    loadAuditLogs();
    loadAuditStats();
  }, [filters]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateRange.from) params.append('startDate', filters.dateRange.from);
      if (filters.dateRange.to) params.append('endDate', filters.dateRange.to);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.action) params.append('action', filters.action);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setLogs(result.data || []);
      } else {
        console.error('Failed to load audit logs:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditStats = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setStats(result.data || {});
      }
    } catch (error) {
      console.error('Error loading audit stats:', error);
    }
  };

  const handleExportLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.dateRange.from) params.append('startDate', filters.dateRange.from);
      if (filters.dateRange.to) params.append('endDate', filters.dateRange.to);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.action) params.append('action', filters.action);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (searchTerm) params.append('search', searchTerm);
      params.append('format', 'csv');

      const response = await fetch(`/api/admin/audit-logs/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.log('✅ Audit logs exported successfully');
      } else {
        console.error('Failed to export audit logs:', response.statusText);
      }
    } catch (error) {
      console.error('Error exporting audit logs:', error);
    }
  };

  const getSeverityIcon = (severity: AuditLog['severity']) => {
    switch (severity) {
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XMarkIcon className="h-5 w-5 text-red-500" />;
      case 'critical':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
    }
  };

  const getSeverityColor = (severity: AuditLog['severity']) => {
    switch (severity) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'critical':
        return 'bg-red-200 text-red-900';
    }
  };

  const getStatusIcon = (status: AuditLog['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'failure':
        return <XMarkIcon className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <DocumentTextIcon className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: AuditLog['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failure':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getCategoryColor = (category: AuditLog['category']) => {
    switch (category) {
      case 'auth':
        return 'bg-purple-100 text-purple-800';
      case 'data':
        return 'bg-blue-100 text-blue-800';
      case 'admin':
        return 'bg-gray-100 text-gray-800';
      case 'campaign':
        return 'bg-green-100 text-green-800';
      case 'call':
        return 'bg-orange-100 text-orange-800';
      case 'system':
        return 'bg-indigo-100 text-indigo-800';
      case 'security':
        return 'bg-red-100 text-red-800';
    }
  };

  const filteredLogs = logs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">Monitor system activity and security events</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportLogs}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEvents || '0'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.successRate || '0%'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Warnings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.warnings || '0'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <UserIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeUsers || '0'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={filters.dateRange.from}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, from: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={filters.dateRange.to}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, to: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="">All Categories</option>
                <option value="auth">Authentication</option>
                <option value="data">Data Management</option>
                <option value="admin">Administration</option>
                <option value="campaign">Campaign</option>
                <option value="call">Call Management</option>
                <option value="system">System</option>
                <option value="security">Security</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Audit Logs Found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'No logs match your search criteria.' : 'No audit logs available for the selected period.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.username}</div>
                          <div className="text-sm text-gray-500">{log.userRole}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div>{log.resource}</div>
                        {log.resourceId && (
                          <div className="text-xs text-gray-500">ID: {log.resourceId}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(log.category)}`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getSeverityIcon(log.severity)}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(log.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Audit Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="text-sm text-gray-900">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">User</label>
                  <p className="text-sm text-gray-900">{selectedLog.username} ({selectedLog.userRole})</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Action</label>
                  <p className="text-sm text-gray-900">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Resource</label>
                  <p className="text-sm text-gray-900">{selectedLog.resource}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">IP Address</label>
                  <p className="text-sm text-gray-900">{selectedLog.ipAddress}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(selectedLog.category)}`}>
                    {selectedLog.category}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User Agent</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedLog.userAgent}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Details</label>
                <pre className="text-sm text-gray-900 bg-gray-50 p-4 rounded overflow-x-auto">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}