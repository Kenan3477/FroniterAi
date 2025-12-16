/**
 * Phase 3: Advanced Contact Management
 * Enhanced contact filtering and search with smart segmentation
 */
'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  TagIcon,
  CalendarIcon,
  PhoneIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

export default function AdvancedContactManagementPage() {
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
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [smartLists, setSmartLists] = useState([
    { name: 'High Value Prospects', count: 45, criteria: 'leadScore > 80 AND status = qualified' },
    { name: 'Ready for Callback', count: 23, criteria: 'status = callback AND lastAttempt < 2 days' },
    { name: 'Never Contacted', count: 156, criteria: 'attemptCount = 0' },
    { name: 'Warm Leads', count: 34, criteria: 'attemptCount > 0 AND status != not_interested' }
  ]);

  // Sample data - in real app this would come from API
  useEffect(() => {
    const sampleContacts: Contact[] = Array.from({ length: 50 }, (_, i) => ({
      id: `contact-${i + 1}`,
      contactId: `C${String(i + 1).padStart(4, '0')}`,
      firstName: ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa'][i % 6],
      lastName: `Contact${i + 1}`,
      phone: `555-${String(i + 1000).slice(-4)}`,
      email: `contact${i + 1}@email.com`,
      company: ['Tech Corp', 'Sales Ltd', 'Marketing Inc', 'Service Co'][i % 4],
      status: ['new', 'contacted', 'qualified', 'not_interested', 'callback', 'completed'][i % 6] as Contact['status'],
      tags: [
        ['lead', 'interested'],
        ['demo', 'qualified'],
        ['follow-up'],
        ['enterprise', 'priority'],
        ['callback'],
        ['completed', 'customer']
      ][i % 6],
      leadScore: Math.floor(Math.random() * 100),
      attemptCount: Math.floor(Math.random() * 5),
      lastAttempt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined,
      lastOutcome: ['answered', 'voicemail', 'no_answer', 'busy'][Math.floor(Math.random() * 4)],
      listName: ['Import List 1', 'Web Leads', 'Cold Prospects', 'Warm Leads'][i % 4],
      campaignId: i % 3 === 0 ? 'camp-001' : undefined,
      source: ['website', 'referral', 'cold_list', 'social_media'][i % 4],
      createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][i % 5],
      state: ['NY', 'CA', 'IL', 'TX', 'AZ'][i % 5],
      industry: ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail'][i % 5]
    }));
    
    setContacts(sampleContacts);
    setFilteredContacts(sampleContacts);
  }, []);

  // Filter and search logic
  useEffect(() => {
    let filtered = [...contacts];
    
    // Text search
    if (searchCriteria.query) {
      const query = searchCriteria.query.toLowerCase();
      filtered = filtered.filter(contact => 
        contact.firstName.toLowerCase().includes(query) ||
        contact.lastName.toLowerCase().includes(query) ||
        contact.phone.includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.company?.toLowerCase().includes(query) ||
        contact.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Status filter
    if (searchCriteria.filters.status.length > 0) {
      filtered = filtered.filter(contact => 
        searchCriteria.filters.status.includes(contact.status)
      );
    }
    
    // Lead score range
    filtered = filtered.filter(contact => 
      contact.leadScore >= searchCriteria.filters.leadScoreRange[0] &&
      contact.leadScore <= searchCriteria.filters.leadScoreRange[1]
    );
    
    // Attempt count range
    filtered = filtered.filter(contact => 
      contact.attemptCount >= searchCriteria.filters.attemptRange[0] &&
      contact.attemptCount <= searchCriteria.filters.attemptRange[1]
    );
    
    // Tags filter
    if (searchCriteria.filters.tags.length > 0) {
      filtered = filtered.filter(contact => 
        searchCriteria.filters.tags.some(tag => contact.tags.includes(tag))
      );
    }
    
    // Industry filter
    if (searchCriteria.filters.industry.length > 0) {
      filtered = filtered.filter(contact => 
        contact.industry && searchCriteria.filters.industry.includes(contact.industry)
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (searchCriteria.sortBy) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`;
          bValue = `${b.firstName} ${b.lastName}`;
          break;
        case 'leadScore':
          aValue = a.leadScore;
          bValue = b.leadScore;
          break;
        case 'lastAttempt':
          aValue = a.lastAttempt?.getTime() || 0;
          bValue = b.lastAttempt?.getTime() || 0;
          break;
        case 'attemptCount':
          aValue = a.attemptCount;
          bValue = b.attemptCount;
          break;
        case 'createdAt':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        default:
          aValue = a.leadScore;
          bValue = b.leadScore;
      }
      
      if (searchCriteria.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredContacts(filtered);
  }, [contacts, searchCriteria]);

  const handleFilterChange = (filterType: keyof FilterOptions, value: any) => {
    setSearchCriteria(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterType]: value
      }
    }));
  };

  const clearFilters = () => {
    setSearchCriteria(prev => ({
      ...prev,
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
      }
    }));
  };

  const getStatusColor = (status: Contact['status']) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'not_interested': return 'bg-red-100 text-red-800';
      case 'callback': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 font-semibold';
    if (score >= 60) return 'text-yellow-600 font-medium';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

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
            <Button variant="outline" size="sm">
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export ({filteredContacts.length})
            </Button>
            <Button size="sm">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - Smart Lists */}
        <div className="w-80 bg-white border-r border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Smart Lists</h3>
            <div className="space-y-2">
              {smartLists.map((list, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div>
                    <div className="font-medium text-gray-900">{list.name}</div>
                    <div className="text-xs text-gray-500">{list.criteria}</div>
                  </div>
                  <Badge variant="secondary">{list.count}</Badge>
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
                <span className="font-medium">{contacts.filter(c => c.leadScore >= 80).length}</span>
              </div>
              <div className="flex justify-between">
                <span>Never Contacted</span>
                <span className="font-medium">{contacts.filter(c => c.attemptCount === 0).length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Search and Filters */}
          <Card className="mb-6">
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
                <Button 
                  variant={showAdvancedFilters ? "default" : "outline"}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                  Advanced Filters
                </Button>
                {(searchCriteria.query || searchCriteria.filters.status.length > 0) && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear All
                  </Button>
                )}
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
                              handleFilterChange('status', newStatus);
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
                        onChange={(e) => handleFilterChange('leadScoreRange', [parseInt(e.target.value), searchCriteria.filters.leadScoreRange[1]])}
                      />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        className="flex-1"
                        value={searchCriteria.filters.leadScoreRange[1]}
                        onChange={(e) => handleFilterChange('leadScoreRange', [searchCriteria.filters.leadScoreRange[0], parseInt(e.target.value)])}
                      />
                    </div>
                  </div>

                  {/* Industry Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                    <div className="flex flex-wrap gap-2">
                      {['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail'].map(industry => (
                        <label key={industry} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={searchCriteria.filters.industry.includes(industry)}
                            onChange={(e) => {
                              const newIndustry = e.target.checked
                                ? [...searchCriteria.filters.industry, industry]
                                : searchCriteria.filters.industry.filter(i => i !== industry);
                              handleFilterChange('industry', newIndustry);
                            }}
                          />
                          <span className="ml-2 text-sm">{industry}</span>
                        </label>
                      ))}
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
          </Card>

          {/* Contact List */}
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContacts.slice(0, 20).map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input type="checkbox" className="rounded border-gray-300" />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {contact.firstName} {contact.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{contact.phone}</div>
                          <div className="text-xs text-gray-500">{contact.email}</div>
                          {contact.company && (
                            <div className="text-xs text-gray-500">{contact.company}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusColor(contact.status)}>
                          {contact.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-semibold ${getLeadScoreColor(contact.leadScore)}`}>
                          {contact.leadScore}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {contact.attemptCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {contact.lastAttempt ? (
                          <>
                            <div>{contact.lastAttempt.toLocaleDateString()}</div>
                            {contact.lastOutcome && (
                              <div className="text-xs">{contact.lastOutcome}</div>
                            )}
                          </>
                        ) : (
                          'Never'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.slice(0, 2).map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {contact.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{contact.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <PhoneIcon className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredContacts.length === 0 && (
              <div className="text-center py-12">
                <UserGroupIcon className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search criteria or filters.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}