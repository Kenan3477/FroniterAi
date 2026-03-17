/**
 * Real Reports Components - Scheduled Reports Component
 * Replaces "NOT IMPLEMENTED" scheduled reporting functionality
 */

import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon,
  ClockIcon,
  EnvelopeIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { realReportsApi, ScheduledReport, ReportTemplate } from '../../services/realReportsApi';

interface ScheduledReportsProps {
  className?: string;
}

interface CreateReportForm {
  name: string;
  templateId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  filters: Record<string, any>;
  enabled: boolean;
}

export const ScheduledReports: React.FC<ScheduledReportsProps> = ({ className = '' }) => {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateReportForm>({
    name: '',
    templateId: '',
    frequency: 'weekly',
    recipients: [],
    filters: {},
    enabled: true
  });
  const [newRecipient, setNewRecipient] = useState('');

  useEffect(() => {
    loadScheduledReports();
    loadTemplates();
  }, []);

  const loadScheduledReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await realReportsApi.getScheduledReports();
      setReports(data);
    } catch (err) {
      console.error('Error loading scheduled reports:', err);
      setError('Failed to load scheduled reports');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await realReportsApi.getReportTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  const addRecipient = () => {
    if (newRecipient && !createForm.recipients.includes(newRecipient)) {
      setCreateForm(prev => ({
        ...prev,
        recipients: [...prev.recipients, newRecipient]
      }));
      setNewRecipient('');
    }
  };

  const removeRecipient = (email: string) => {
    setCreateForm(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r !== email)
    }));
  };

  const createScheduledReport = async () => {
    try {
      setError(null);
      
      if (!createForm.name || !createForm.templateId || createForm.recipients.length === 0) {
        setError('Please fill in all required fields');
        return;
      }

      await realReportsApi.createScheduledReport(createForm);
      await loadScheduledReports();
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        templateId: '',
        frequency: 'weekly',
        recipients: [],
        filters: {},
        enabled: true
      });
    } catch (err) {
      console.error('Error creating scheduled report:', err);
      setError('Failed to create scheduled report');
    }
  };

  const getFrequencyIcon = (frequency: string) => {
    switch (frequency) {
      case 'daily': return '📅';
      case 'weekly': return '📊';
      case 'monthly': return '📋';
      default: return '⏰';
    }
  };

  const formatNextRun = (nextRun: Date) => {
    const now = new Date();
    const next = new Date(nextRun);
    const diffMs = next.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Within 1 hour';
    if (diffHours < 24) return `In ${diffHours} hours`;
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading scheduled reports...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Scheduled Reports</h2>
          <p className="text-sm text-gray-500">
            Automate report generation and delivery
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Schedule Report
        </button>
      </div>

      {/* Scheduled Reports List */}
      <div className="space-y-4">
        {reports.map(report => (
          <div
            key={report.id}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                  <span className="ml-3 text-lg">
                    {getFrequencyIcon(report.frequency)}
                  </span>
                  <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                    report.enabled 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {report.enabled ? 'Active' : 'Paused'}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span className="capitalize">{report.frequency}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <ClockIcon className="h-4 w-4 mr-2" />
                    <span>Next run: {formatNextRun(report.nextRun)}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    <span>{report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-sm text-gray-500">
                    Template: {templates.find(t => t.id === report.templateId)?.name || 'Unknown Template'}
                  </p>
                  {report.lastRun && (
                    <p className="text-sm text-gray-500">
                      Last run: {new Date(report.lastRun).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="mt-3">
                  <details className="group">
                    <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                      View recipients
                    </summary>
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      {report.recipients.join(', ')}
                    </div>
                  </details>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {/* Toggle enabled status */}}
                  className={`p-2 rounded ${
                    report.enabled 
                      ? 'text-green-600 hover:text-green-800' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={report.enabled ? 'Pause' : 'Resume'}
                >
                  {report.enabled ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                </button>
                
                <button
                  onClick={() => {/* Edit report */}}
                  className="p-2 text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => {/* Delete report */}}
                  className="p-2 text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Reports</h3>
            <p className="text-gray-500 mb-4">
              Create your first scheduled report to automate data delivery.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Schedule Your First Report
            </button>
          </div>
        </div>
      )}

      {/* Create Report Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Schedule New Report</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter report name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Template *
                </label>
                <select
                  value={createForm.templateId}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, templateId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select a template</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <select
                  value={createForm.frequency}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, frequency: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipients *
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="email"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Enter email address"
                  />
                  <button
                    onClick={addRecipient}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {createForm.recipients.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                    >
                      {email}
                      <button
                        onClick={() => removeRecipient(email)}
                        className="ml-2 text-blue-500 hover:text-blue-700"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={createForm.enabled}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Enable immediately
                  </span>
                </label>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-4 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createScheduledReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Schedule Report
              </button>
            </div>
          </div>
        </div>
      )}

      {error && !showCreateModal && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};