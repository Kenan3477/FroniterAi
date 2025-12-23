'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeftIcon,
  PhoneIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface Contact {
  id: string;
  contactId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  locked: boolean;
  lockedBy?: string;
  lockedAt?: string;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  listId: string;
}

interface QueueEntry {
  id: string;
  queueId: string;
  campaignId: string;
  listId: string;
  contactId: string;
  status: string;
  assignedAgentId?: string;
  priority: number;
  queuedAt: string;
  dialedAt?: string;
  completedAt?: string;
  outcome?: string;
  notes?: string;
  contact?: Contact;
}

interface Campaign {
  id: string;
  campaignId: string;
  name: string;
  dialMethod: string;
  speed: number;
  status: string;
}

interface OutboundQueueProps {
  campaign: Campaign;
  onBack: () => void;
}

export default function OutboundQueue({ campaign, onBack }: OutboundQueueProps) {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'queue' | 'contacts'>('queue');

  useEffect(() => {
    loadQueueData();
    loadContacts();
  }, [campaign.campaignId]);

  const loadQueueData = async () => {
    try {
      setLoading(true);
      
      // First, generate queue entries for this campaign using the new campaign management API
      const generateResponse = await fetch(`/api/admin/campaign-management/campaigns/${campaign.id}/generate-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          maxRecords: 100 
        })
      });

      if (!generateResponse.ok) {
        // If generate fails, it might be because there are no data lists assigned
        console.warn('Queue generation failed, possibly no data lists assigned to campaign');
        setQueueEntries([]);
        return;
      }

      const generateData = await generateResponse.json();
      
      if (generateData.success) {
        // Use the generated entries directly
        setQueueEntries(generateData.data.entries || []);
      } else {
        console.warn('Queue generation returned no entries:', generateData.message);
        setQueueEntries([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      // Fetch contacts assigned to this campaign via data lists using the new campaign management API
      const response = await fetch(`/api/admin/campaign-management/campaigns/${campaign.id}/contacts`);
      if (!response.ok) {
        console.warn('Failed to fetch campaign contacts, campaign may not have data lists assigned');
        setContacts([]);
        return;
      }

      const contactsData = await response.json();
      if (contactsData.success) {
        setContacts(contactsData.data || []);
      } else {
        console.warn('No contacts found for campaign:', contactsData.message);
        setContacts([]);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
      setContacts([]);
    }
  };

  const handleDialContact = async (contactId: string) => {
    try {
      // Use the campaign management API to dial the next contact
      const response = await fetch(`/api/admin/campaign-management/campaigns/${campaign.id}/dial-next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'AGENT_001', // Using test agent - in production this would come from auth context
          contactId: contactId // Optionally specify which contact to dial
        })
      });

      if (!response.ok) {
        throw new Error('Failed to dial contact');
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('Successfully dialed contact:', result.data);
        // Reload queue data to reflect the dialed contact
        loadQueueData();
        loadContacts();
      } else {
        throw new Error(result.message || 'Dial operation failed');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to dial contact');
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <ClockIcon className="h-4 w-4 text-yellow-600" />;
      case 'dialing':
        return <PhoneIcon className="h-4 w-4 text-blue-600" />;
      case 'connected':
        return <PhoneIcon className="h-4 w-4 text-slate-600" />;
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-slate-600" />;
      case 'failed':
        return <XCircleIcon className="h-4 w-4 text-red-600" />;
      case 'abandoned':
        return <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getContactStatusColor = (status: string) => {
    switch (status) {
      case 'NotAttempted':
        return 'bg-green-100 text-slate-800';
      case 'Answered':
        return 'bg-blue-100 text-blue-800';
      case 'NoAnswer':
        return 'bg-yellow-100 text-yellow-800';
      case 'Busy':
        return 'bg-orange-100 text-orange-800';
      case 'Voicemail':
        return 'bg-purple-100 text-purple-800';
      case 'RetryEligible':
        return 'bg-cyan-100 text-cyan-800';
      case 'MaxAttempts':
        return 'bg-red-100 text-red-800';
      case 'DoNotCall':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="inline-flex items-center text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Campaigns
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <p className="text-sm text-gray-500">Outbound Queue - {campaign.campaignId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              campaign.status === 'Active' 
                ? 'bg-green-100 text-slate-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {campaign.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex px-6">
          <button
            onClick={() => setSelectedTab('queue')}
            className={`py-4 px-6 text-sm font-medium border-b-2 ${
              selectedTab === 'queue'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active Queue ({queueEntries.length})
          </button>
          <button
            onClick={() => setSelectedTab('contacts')}
            className={`py-4 px-6 text-sm font-medium border-b-2 ${
              selectedTab === 'contacts'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Contacts ({contacts.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'queue' ? (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Dial Queue</h2>
              <p className="text-sm text-gray-600">Contacts ready to be dialed, prioritized by blend weights</p>
            </div>

            {queueEntries.length === 0 ? (
              <div className="text-center py-12">
                <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts in queue</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {campaign.status !== 'Active' 
                    ? 'Campaign is not active'
                    : contacts.length === 0
                    ? 'No contacts uploaded yet. Upload a CSV or Excel file to add contacts to this campaign.'
                    : 'No eligible contacts found. Check your contact statuses and attempt limits.'}
                </p>
                {contacts.length > 0 && (
                  <button
                    onClick={loadQueueData}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Refresh Queue
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Queued At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {queueEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {entry.priority}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.contact ? (
                            <div>
                              <div className="font-medium">{entry.contact.firstName} {entry.contact.lastName}</div>
                              {entry.contact.email && (
                                <div className="text-gray-500">{entry.contact.email}</div>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-500">Contact {entry.contactId}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.contact?.phone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(entry.status)}
                            <span className="capitalize">{entry.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(entry.queuedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.status === 'queued' && (
                            <button
                              onClick={() => handleDialContact(entry.contactId)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                            >
                              <PhoneIcon className="h-3 w-3 mr-1" />
                              Dial
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">All Campaign Contacts</h2>
              <p className="text-sm text-gray-600">All contacts assigned to this campaign via data lists</p>
            </div>

            {contacts.length === 0 ? (
              <div className="text-center py-12">
                <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts uploaded</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Upload a CSV or Excel file via Data Management to add contacts to this campaign.
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  The data list is assigned to the campaign but contains no contacts yet.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attempts
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Attempt
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{contact.firstName} {contact.lastName}</div>
                            {contact.email && (
                              <div className="text-gray-500">{contact.email}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {contact.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getContactStatusColor(contact.status)}`}>
                            {contact.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {contact.attemptCount} / {contact.maxAttempts}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(contact.lastAttemptAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}