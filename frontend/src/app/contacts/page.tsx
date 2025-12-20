'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PhoneIcon,
  UserGroupIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

interface Contact {
  id: string;
  contactId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  company?: string;
  status: 'new' | 'contacted' | 'qualified' | 'not_interested' | 'callback' | 'completed';
  tags: string[];
  leadScore: number;
  attemptCount: number;
  lastAttempt?: Date;
  lastOutcome?: string;
  listName: string;
  campaignId?: string;
  source: string;
  createdAt: Date;
  city?: string;
  state?: string;
  industry?: string;
}

interface FilterOptions {
  status: string[];
  tags: string[];
  source: string[];
  campaign: string[];
  leadScoreRange: [number, number];
  attemptRange: [number, number];
  dateRange: {
    start?: Date;
    end?: Date;
  };
  location: {
    cities: string[];
    states: string[];
  };
  industry: string[];
}

interface SearchCriteria {
  query: string;
  filters: FilterOptions;
  sortBy: 'name' | 'leadScore' | 'lastAttempt' | 'attemptCount' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export default function ContactsPage() {
  return (
    <MainLayout>
      <AdvancedContactManagement />
    </MainLayout>
  );
}

function AdvancedContactManagement() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({
    query: '',
    filters: {
      status: [],
      tags: [],
      source: [],
      campaign: [],
      leadScoreRange: [0, 100],
      attemptRange: [0, 10],
      dateRange: {},
      location: { cities: [], states: [] },
      industry: []
    },
    sortBy: 'leadScore',
    sortOrder: 'desc'
  });
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // In production, contacts will be loaded from Railway backend API
  useEffect(() => {
    setContacts([]);
    setFilteredContacts([]);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Advanced Contact Management</h1>
            <p className="text-gray-600">Smart filtering, segmentation, and bulk operations</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export ({filteredContacts.length})
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Contact
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - Smart Lists */}
        <div className="w-80 bg-white border-r border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Smart Lists</h3>
            <div className="space-y-2">
              {[
                { name: 'High Value Prospects', count: 0, criteria: 'leadScore > 80 AND status = qualified' },
                { name: 'Ready for Callback', count: 0, criteria: 'status = callback AND lastAttempt < 2 days' },
                { name: 'Never Contacted', count: 0, criteria: 'attemptCount = 0' },
                { name: 'Warm Leads', count: 0, criteria: 'attemptCount > 0 AND status != not_interested' }
              ].map((list, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div>
                    <div className="font-medium text-gray-900">{list.name}</div>
                    <div className="text-xs text-gray-500">{list.criteria}</div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {list.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Contact Overview</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Contacts</span>
                <span className="font-medium">{contacts.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Filtered Results</span>
                <span className="font-medium">{filteredContacts.length}</span>
              </div>
              <div className="flex justify-between">
                <span>High Score (80+)</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span>Never Contacted</span>
                <span className="font-medium">0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Search and Filters */}
          <div className="bg-white border border-gray-200 rounded-lg mb-6">
            <div className="p-6">
              {/* Search Bar */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search contacts by name, phone, email, company, or tags..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={searchCriteria.query}
                    onChange={(e) => setSearchCriteria(prev => ({ ...prev, query: e.target.value }))}
                  />
                </div>
                <button 
                  className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${
                    showAdvancedFilters ? 'bg-gray-100' : ''
                  }`}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                  Advanced Filters
                </button>
              </div>

              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <div className="border-t pt-4 space-y-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <div className="flex flex-wrap gap-2">
                      {['new', 'contacted', 'qualified', 'not_interested', 'callback', 'completed'].map(status => (
                        <label key={status} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={searchCriteria.filters.status.includes(status)}
                            onChange={(e) => {
                              const newStatus = e.target.checked
                                ? [...searchCriteria.filters.status, status]
                                : searchCriteria.filters.status.filter(s => s !== status);
                              setSearchCriteria(prev => ({
                                ...prev,
                                filters: { ...prev.filters, status: newStatus }
                              }));
                            }}
                          />
                          <span className="ml-2 text-sm capitalize">{status.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Lead Score Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lead Score: {searchCriteria.filters.leadScoreRange[0]} - {searchCriteria.filters.leadScoreRange[1]}
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        className="flex-1"
                        value={searchCriteria.filters.leadScoreRange[0]}
                        onChange={(e) => setSearchCriteria(prev => ({
                          ...prev,
                          filters: {
                            ...prev.filters,
                            leadScoreRange: [parseInt(e.target.value), prev.filters.leadScoreRange[1]]
                          }
                        }))}
                      />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        className="flex-1"
                        value={searchCriteria.filters.leadScoreRange[1]}
                        onChange={(e) => setSearchCriteria(prev => ({
                          ...prev,
                          filters: {
                            ...prev.filters,
                            leadScoreRange: [prev.filters.leadScoreRange[0], parseInt(e.target.value)]
                          }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sort Options */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Sort by:</span>
                  <select 
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                    value={searchCriteria.sortBy}
                    onChange={(e) => setSearchCriteria(prev => ({ ...prev, sortBy: e.target.value as SearchCriteria['sortBy'] }))}
                  >
                    <option value="leadScore">Lead Score</option>
                    <option value="name">Name</option>
                    <option value="lastAttempt">Last Attempt</option>
                    <option value="attemptCount">Attempt Count</option>
                    <option value="createdAt">Date Added</option>
                  </select>
                  <select 
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                    value={searchCriteria.sortOrder}
                    onChange={(e) => setSearchCriteria(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
                <div className="text-sm text-gray-600">
                  Showing {filteredContacts.length} of {contacts.length} contacts
                </div>
              </div>
            </div>
          </div>

          {/* Contact List */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="text-center py-12">
              <UserGroupIcon className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Contact data will be loaded from the Railway backend API. Start by adding contacts or importing your contact lists.
              </p>
              <div className="mt-6">
                <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Your First Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
