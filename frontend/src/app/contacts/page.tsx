'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PhoneIcon,
  UserGroupIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  AdjustmentsHorizontalIcon,
  CloudArrowUpIcon,
  TrashIcon
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
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [dataListNames, setDataListNames] = useState<Record<string, string>>({});
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Computed smart list counts
  const smartListCounts = useMemo(() => ({
    highValueProspects: filteredContacts.filter(c => c.leadScore >= 80 && c.status === 'qualified').length,
    readyForCallback: filteredContacts.filter(c => c.status === 'callback' && 
      c.lastAttempt && (Date.now() - c.lastAttempt.getTime()) < 2 * 24 * 60 * 60 * 1000
    ).length,
    neverContacted: filteredContacts.filter(c => c.attemptCount === 0).length,
    warmLeads: filteredContacts.filter(c => c.attemptCount > 0 && c.status !== 'not_interested').length
  }), [filteredContacts]);

  // Get unique campaign/list info for filtering
  // Use the real data list names from the backend
  const contactsByListId = useMemo(() => {
    return contacts.reduce((acc, contact) => {
      const listId = contact.campaignId || 'unknown';
      if (!acc[listId]) {
        acc[listId] = [];
      }
      acc[listId].push(contact);
      return acc;
    }, {} as Record<string, Contact[]>);
  }, [contacts]);

  // Create available campaigns using actual data list names
  const availableCampaigns = useMemo(() => {
    return Object.keys(contactsByListId).map(listId => {
      const count = contactsByListId[listId].length;
      
      // Try to get the actual name from our mapping first
      let actualName = dataListNames[listId];
      
      // If not available, use hardcoded known names as fallback
      if (!actualName) {
        if (listId === 'list_1767031754967') {
          actualName = 'DAC TEST';
        } else if (listId === 'list_1770985866600') {
          actualName = 'DAC Preview Test Contacts';
        } else {
          actualName = `Data List (${listId.slice(-8)})`;
        }
      }
      
      return {
        id: listId,
        name: actualName,
        count: count
      };
    }).filter(campaign => campaign.count > 0); // Only show lists with contacts
  }, [contactsByListId, dataListNames]);

  // Helper function to generate readable list name from ID
  const getListDisplayName = (listId: string, listName?: string) => {
    // If there's already a proper list name from backend, use it
    if (listName && listName !== 'Unknown') return listName;
    
    // Use the real data list name from our mapping
    if (dataListNames[listId]) {
      return dataListNames[listId];
    }
    
    // Improved fallback logic - check for known list patterns
    if (listId === 'list_1767031754967') {
      return 'DAC TEST'; // Known main list
    }
    if (listId === 'list_1770985866600') {
      return 'DAC Preview Test Contacts'; // Known preview list
    }
    
    // Generic fallback
    return `Data List (${listId.slice(-8)})`;
  };

  const availableSources = useMemo(() => Array.from(new Set(contacts.map(c => c.source))), [contacts]);

  // Fetch data lists to get actual names
  const fetchDataLists = async () => {
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admin/campaign-management/data-lists`;
      console.log('🔍 Fetching data lists from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('📡 Data lists response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('📋 Data lists API response:', result);
        
        if (result.success && result.data && result.data.dataLists) {
          const listMapping: Record<string, string> = {};
          result.data.dataLists.forEach((list: any) => {
            listMapping[list.listId] = list.name;
            console.log(`📝 Mapping: ${list.listId} -> ${list.name}`);
          });
          setDataListNames(listMapping);
          console.log('✅ Data lists loaded successfully:', listMapping);
        } else {
          console.log('⚠️ Unexpected API response structure:', result);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Data lists API failed:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error fetching data lists:', error);
    }
  };

  // Load contacts and data lists from backend
  useEffect(() => {
    fetchDataLists();
    fetchContacts();
    fetchCampaigns();
  }, [searchCriteria.query, searchCriteria.filters]);

  // Retry fetching data lists if they're not loaded and we have contacts
  useEffect(() => {
    if (contacts.length > 0 && Object.keys(dataListNames).length === 0) {
      console.log('🔄 Retrying data lists fetch as backup...');
      fetchDataLists();
    }
  }, [contacts, dataListNames]);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/campaign-management/data-lists`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ Available campaigns/data lists:', result.data);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching campaigns:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      let allContacts: Contact[] = [];
      let page = 1;
      let hasMore = true;
      
      console.log('🔍 Starting to fetch all contacts...');

      while (hasMore) {
        const params = new URLSearchParams();
        
        if (searchCriteria.query) {
          params.append('search', searchCriteria.query);
        }
        
        if (searchCriteria.filters.status.length > 0) {
          params.append('status', searchCriteria.filters.status[0]);
        }
        
        if (searchCriteria.filters.campaign.length > 0) {
          params.append('campaignId', searchCriteria.filters.campaign[0]);
        }
        
        params.append('limit', '1000'); // Get maximum contacts allowed per request
        params.append('page', page.toString());

        console.log(`🔍 Fetching page ${page} with params:`, params.toString());
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/contacts?${params}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Page ${page} fetched successfully:`, result);
          
          if (result.success && result.data && result.data.contacts) {
            const pageContacts = result.data.contacts.map((contact: any) => ({
              id: contact.contactId,
              contactId: contact.contactId,
              firstName: contact.firstName,
              lastName: contact.lastName,
              phone: contact.phone,
              email: contact.email,
              company: contact.customFields?.company || '',
              status: mapBackendStatus(contact.status),
              tags: contact.customFields?.tags ? contact.customFields.tags.split(',') : [],
              leadScore: contact.customFields?.leadScore || 0,
              attemptCount: contact.attemptCount,
              lastAttempt: contact.lastAttemptAt ? new Date(contact.lastAttemptAt) : undefined,
              lastOutcome: contact.status,
              listName: contact.list?.name || getListDisplayName(contact.listId),
              campaignId: contact.listId,
              source: contact.customFields?.leadSource || 'Unknown',
              createdAt: new Date(contact.createdAt),
              city: contact.customFields?.city,
              state: contact.customFields?.state,
              industry: contact.customFields?.industry
            })) as Contact[];
            
            allContacts = [...allContacts, ...pageContacts];
            
            // Check if there are more pages
            const { pagination } = result.data;
            setLoadingProgress({ current: page, total: pagination.totalPages });
            hasMore = page < pagination.totalPages;
            page++;
            
            console.log(`📊 Loaded ${pageContacts.length} contacts from page ${page - 1}, total so far: ${allContacts.length}`);
          } else {
            hasMore = false;
          }
        } else {
          console.error(`❌ Failed to fetch page ${page}:`, response.status);
          hasMore = false;
        }
      }
      
      setContacts(allContacts);
      setFilteredContacts(allContacts);
      setIsLoading(false);
      console.log(`📊 Final result: Loaded ${allContacts.length} total contacts`);
      
    } catch (error) {
      console.error('❌ Error fetching contacts:', error);
      setContacts([]);
      setFilteredContacts([]);
      setIsLoading(false);
    }
  };

  // Map backend status to frontend status
  const mapBackendStatus = (backendStatus: string): Contact['status'] => {
    switch (backendStatus) {
      case 'NotAttempted': return 'new';
      case 'Answered': return 'contacted';
      case 'NoAnswer': 
      case 'Busy': 
      case 'Voicemail': return 'callback';
      case 'MaxAttempts': 
      case 'DoNotCall': return 'not_interested';
      case 'Invalid': return 'not_interested';
      default: return 'new';
    }
  };

  // Handle click-to-dial functionality
  const handleClickToDial = async (contact: Contact) => {
    try {
      console.log(`📞 Initiating call to ${contact.firstName} ${contact.lastName} at ${contact.phone}`);
      
      // Use manual dial API similar to OutboundQueue component
      const response = await fetch('/api/voice/manual-dial', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('omnivox_token') || ''}`
        },
        credentials: 'include',
        body: JSON.stringify({
          contactId: contact.contactId,
          phoneNumber: contact.phone,
          contactName: `${contact.firstName} ${contact.lastName}`,
          campaignId: contact.campaignId || 'manual-dial',
          listId: contact.source || 'contacts-manual'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to initiate call: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Call initiated successfully:', result.data);
        alert(`📞 Calling ${contact.firstName} ${contact.lastName} at ${contact.phone}...`);
      } else {
        throw new Error(result.error?.message || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      alert(`❌ Failed to initiate call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle CRM import functionality  
  const handleCrmImport = async () => {
    try {
      console.log('🔄 Starting CRM import process...');
      
      // For now, show a placeholder - in production this would open CRM connection dialog
      const crmType = prompt('Select CRM type:\n1. Salesforce\n2. HubSpot\n3. Pipedrive\n4. Custom API\n\nEnter 1-4:');
      
      if (!crmType || !['1', '2', '3', '4'].includes(crmType)) {
        alert('❌ Invalid CRM selection or cancelled');
        return;
      }

      const crmNames = { '1': 'Salesforce', '2': 'HubSpot', '3': 'Pipedrive', '4': 'Custom API' };
      const selectedCrm = crmNames[crmType as keyof typeof crmNames];

      alert(`🔄 ${selectedCrm} integration coming soon! This will allow you to:\n\n• Import contacts directly from ${selectedCrm}\n• Sync contact updates bidirectionally\n• Map custom fields automatically\n• Schedule regular data synchronization\n\nFor now, please use the CSV/Excel import feature in Admin > Data Management.`);
      
    } catch (error) {
      console.error('❌ Error with CRM import:', error);
      alert('❌ CRM import failed. Please try again.');
    }
  };

  // Handle contact deletion
  const handleDeleteContact = async (contact: Contact) => {
    try {
      const confirmDelete = confirm(`⚠️ Are you sure you want to delete contact "${contact.firstName} ${contact.lastName}"?\n\nThis action cannot be undone and will permanently remove:\n• Contact information\n• Call history\n• All associated data\n\nClick OK to confirm deletion.`);
      
      if (!confirmDelete) {
        return;
      }

      console.log(`🗑️ Deleting contact: ${contact.firstName} ${contact.lastName} (${contact.contactId})`);

      // Call backend API directly to delete the contact (same pattern as fetch)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/contacts/${contact.contactId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete contact: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Contact deleted successfully:', result);
        
        // Remove the contact from the local state
        setContacts(prevContacts => prevContacts.filter(c => c.contactId !== contact.contactId));
        
        alert(`✅ Contact "${contact.firstName} ${contact.lastName}" has been successfully deleted.`);
      } else {
        throw new Error(result.data?.message || result.error?.message || 'Failed to delete contact');
      }
    } catch (error) {
      console.error('❌ Error deleting contact:', error);
      alert(`❌ Failed to delete contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
            <button 
              onClick={handleCrmImport}
              className="inline-flex items-center px-3 py-2 border border-orange-300 shadow-sm text-sm leading-4 font-medium rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100"
            >
              <CloudArrowUpIcon className="h-4 w-4 mr-2" />
              CRM Import
            </button>
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

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-96 bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-lg font-semibold text-gray-900 mb-2">Loading All Contacts</div>
            <div className="text-gray-600 mb-4">
              {loadingProgress.total > 0 
                ? `Loading page ${loadingProgress.current} of ${loadingProgress.total}...`
                : 'Fetching contact data...'
              }
            </div>
            {loadingProgress.total > 0 && (
              <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      )}

      {!isLoading && (
      <div className="flex">
        {/* Sidebar - Smart Lists */}
        <div className="w-80 bg-white border-r border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Smart Lists</h3>
            <div className="space-y-2">
              {[
                { name: 'High Value Prospects', count: smartListCounts.highValueProspects, criteria: 'leadScore > 80 AND status = qualified' },
                { name: 'Ready for Callback', count: smartListCounts.readyForCallback, criteria: 'status = callback AND lastAttempt < 2 days' },
                { name: 'Never Contacted', count: smartListCounts.neverContacted, criteria: 'attemptCount = 0' },
                { name: 'Warm Leads', count: smartListCounts.warmLeads, criteria: 'attemptCount > 0 AND status != not_interested' }
              ].map((list, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div>
                    <div className="font-medium text-gray-900">{list.name}</div>
                    <div className="text-xs text-gray-500">{list.criteria}</div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {list.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {(searchCriteria.filters.campaign.length > 0 || searchCriteria.query) && (
            <div className="mb-4">
              <button
                onClick={() => setSearchCriteria({
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
                })}
                className="w-full text-sm px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 transition-colors"
              >
                Clear All Filters ({contacts.length} total)
              </button>
            </div>
          )}

          {/* Campaign Filter */}
          {availableCampaigns.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Filter by Campaign/List</h4>
              <div className="space-y-1">
                {availableCampaigns.map((campaign, index) => {
                  const count = contacts.filter(c => c.campaignId === campaign.id).length;
                  const isActive = searchCriteria.filters.campaign.includes(campaign.id);
                  
                  return (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between p-2 rounded border cursor-pointer text-sm transition-colors ${
                        isActive 
                          ? 'border-blue-500 bg-blue-50 text-blue-900' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setSearchCriteria(prev => ({
                          ...prev,
                          filters: {
                            ...prev.filters,
                            campaign: isActive 
                              ? [] // Remove filter if currently active
                              : [campaign.id] // Apply filter
                          }
                        }));
                      }}
                    >
                      <span className={`font-medium ${isActive ? 'text-blue-900' : 'text-gray-700'}`}>
                        {campaign.name}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        isActive 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                <span className="font-medium">{smartListCounts.highValueProspects}</span>
              </div>
              <div className="flex justify-between">
                <span>Never Contacted</span>
                <span className="font-medium">{smartListCounts.neverContacted}</span>
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
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {filteredContacts.length > 0 ? (
              <>
                {/* Table Header */}
                <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Showing {filteredContacts.length} of {contacts.length} contacts
                    </h3>
                    <div className="text-sm text-gray-500">
                      Sort by: {searchCriteria.sortBy} ({searchCriteria.sortOrder})
                    </div>
                  </div>
                </div>

                {/* Contact Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lead Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Attempts
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Campaign/List
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredContacts.map((contact) => (
                        <tr key={contact.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-blue-600">
                                    {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {contact.firstName} {contact.lastName}
                                </div>
                                {contact.email && (
                                  <div className="text-sm text-gray-500">{contact.email}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{contact.company || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono text-gray-900">{contact.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              contact.status === 'new' ? 'bg-blue-100 text-blue-800' :
                              contact.status === 'contacted' ? 'bg-green-100 text-green-800' :
                              contact.status === 'qualified' ? 'bg-purple-100 text-purple-800' :
                              contact.status === 'callback' ? 'bg-yellow-100 text-yellow-800' :
                              contact.status === 'not_interested' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {contact.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900 mr-2">
                                {contact.leadScore}
                              </span>
                              <div className="w-12 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    contact.leadScore >= 80 ? 'bg-green-500' :
                                    contact.leadScore >= 60 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${contact.leadScore}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{contact.attemptCount}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{contact.listName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {contact.lastAttempt ? contact.lastAttempt.toLocaleDateString() : 'Never'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleClickToDial(contact)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                <PhoneIcon className="h-3 w-3 mr-1" />
                                Call
                              </button>
                              <button
                                onClick={() => handleDeleteContact(contact)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                title="Delete contact permanently"
                              >
                                <TrashIcon className="h-3 w-3 mr-1" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <UserGroupIcon className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {contacts.length > 0 
                    ? "Try adjusting your search criteria or filters." 
                    : "Contact data will be loaded from the Railway backend API. Start by adding contacts or importing your contact lists."
                  }
                </p>
                {contacts.length === 0 && (
                  <div className="mt-6">
                    <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Your First Contact
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
