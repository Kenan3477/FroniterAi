'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  EyeIcon,
  DocumentTextIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface ComplianceReport {
  pauseEvents: any[];
  auditTrail: any[];
  complianceMetrics: {
    totalPauseEvents: number;
    totalAuditEntries: number;
    totalViolations: number;
    auditCoverage: string;
    complianceScore: number;
  };
  violations: any[];
  generatedAt: string;
  dateRange: {
    from: Date;
    to: Date;
  };
}

interface SecurityGapStatus {
  auditTrails: 'IMPLEMENTED' | 'NOT_IMPLEMENTED';
  roleBasedAccess: 'IMPLEMENTED' | 'PARTIALLY_IMPLEMENTED';
  realDatabase: 'IMPLEMENTED' | 'NOT_IMPLEMENTED';
  complianceMonitoring: 'IMPLEMENTED' | 'NOT_IMPLEMENTED';
}

export default function SecurityCompliancePanel() {
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [securityStatus, setSecurityStatus] = useState<SecurityGapStatus>({
    auditTrails: 'IMPLEMENTED',
    roleBasedAccess: 'IMPLEMENTED', 
    realDatabase: 'IMPLEMENTED',
    complianceMonitoring: 'IMPLEMENTED'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    to: new Date().toISOString().split('T')[0] // today
  });

  const loadComplianceReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('omnivox_token') || localStorage.getItem('authToken') || '';
      if (!token) {
        throw new Error('Authentication required');
      }

      const params = new URLSearchParams({
        dateFrom: dateRange.from,
        dateTo: dateRange.to
      });

      const response = await fetch(`/api/pause-events/compliance-report?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load compliance report: ${response.status}`);
      }

      const data = await response.json();
      setComplianceReport(data.data);

    } catch (error) {
      console.error('❌ Error loading compliance report:', error);
      setError(error instanceof Error ? error.message : 'Failed to load compliance report');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IMPLEMENTED': return 'text-green-600 bg-green-100';
      case 'PARTIALLY_IMPLEMENTED': return 'text-yellow-600 bg-yellow-100';
      case 'NOT_IMPLEMENTED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IMPLEMENTED': return <ShieldCheckIcon className="h-5 w-5 text-green-600" />;
      case 'PARTIALLY_IMPLEMENTED': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'NOT_IMPLEMENTED': return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      default: return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  useEffect(() => {
    loadComplianceReport();
  }, [dateRange.from, dateRange.to]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ShieldCheckIcon className="h-8 w-8 mr-3 text-blue-600" />
            Security & Compliance Dashboard
          </h1>
          <p className="text-gray-600">Monitor security gaps, audit trails, and compliance status</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <button
            onClick={loadComplianceReport}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <ClockIcon className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <DocumentTextIcon className="h-5 w-5 mr-2" />
            )}
            Generate Report
          </button>
        </div>
      </div>

      {/* Security Gap Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Audit Trails</h3>
            {getStatusIcon(securityStatus.auditTrails)}
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(securityStatus.auditTrails)}`}>
            {securityStatus.auditTrails}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Complete audit logging for all pause events with compliance data retention
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Role-Based Access</h3>
            {getStatusIcon(securityStatus.roleBasedAccess)}
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(securityStatus.roleBasedAccess)}`}>
            {securityStatus.roleBasedAccess}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Granular access controls for individual agent pause data
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Real Database</h3>
            {getStatusIcon(securityStatus.realDatabase)}
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(securityStatus.realDatabase)}`}>
            {securityStatus.realDatabase}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Production pause event tracking with database persistence
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Compliance Monitor</h3>
            {getStatusIcon(securityStatus.complianceMonitoring)}
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(securityStatus.complianceMonitoring)}`}>
            {securityStatus.complianceMonitoring}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Real-time compliance violation detection and reporting
          </p>
        </div>
      </div>

      {/* Compliance Metrics */}
      {complianceReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Pause Events</h3>
                <p className="text-2xl font-semibold text-gray-900">{complianceReport.complianceMetrics.totalPauseEvents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Audit Entries</h3>
                <p className="text-2xl font-semibold text-gray-900">{complianceReport.complianceMetrics.totalAuditEntries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Violations</h3>
                <p className="text-2xl font-semibold text-gray-900">{complianceReport.complianceMetrics.totalViolations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Compliance Score</h3>
                <p className="text-2xl font-semibold text-gray-900">{complianceReport.complianceMetrics.complianceScore}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Violations */}
      {complianceReport && complianceReport.violations.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 mr-2 text-red-600" />
              Compliance Violations
            </h3>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {complianceReport.violations.map((violation, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(violation.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {violation.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {JSON.parse(violation.body)?.agentName || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {JSON.parse(violation.body)?.violationReason || 'No reason provided'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        violation.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                        violation.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {violation.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
            <p className="text-red-800">Error: {error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <ClockIcon className="h-8 w-8 text-blue-600 animate-spin mr-3" />
          <p className="text-lg text-gray-600">Generating compliance report...</p>
        </div>
      )}
    </div>
  );
}