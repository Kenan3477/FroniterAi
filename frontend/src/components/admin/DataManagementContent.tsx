import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon, 
  DocumentDuplicateIcon,
  CloudArrowUpIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';

interface DataList {
  id: string;
  listId: string;
  name: string;
  description: string;
  campaign: string;
  total: number;
  available: number;
  dialAttempts: number;
  lastDialed: string;
  status: 'Active' | 'Inactive';
  createdAt: Date;
}

interface DataManagementContentProps {
  searchTerm: string;
}

export default function DataManagementContent({ searchTerm }: DataManagementContentProps) {
  const [selectedSubTab, setSelectedSubTab] = useState('Manage Data Lists');
  const [dataLists, setDataLists] = useState<DataList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm2, setSearchTerm2] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Load data lists from API
  const fetchDataLists = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/campaign-management/data-lists');
      if (!response.ok) {
        throw new Error(`Failed to fetch data lists: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success && result.data?.dataLists) {
        // Transform backend data to frontend format
        const transformedLists = result.data.dataLists.map((list: any) => ({
          id: list.id,
          listId: list.listId,
          name: list.name,
          description: list.campaignId ? `Assigned to Campaign: ${list.campaignId}` : 'No campaign assigned',
          campaign: list.campaignId || 'Unassigned',
          total: list.totalContacts || 0,
          available: list.totalContacts || 0,
          dialAttempts: 0,
          lastDialed: new Date().toISOString().split('T')[0],
          status: list.active ? 'Active' : 'Inactive' as 'Active' | 'Inactive',
          createdAt: new Date(list.createdAt)
        }));
        setDataLists(transformedLists);
      } else {
        console.error('Invalid response format:', result);
        setError('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error fetching data lists:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data lists');
    } finally {
      setLoading(false);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchDataLists();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Delete data list via API
  const handleDeleteList = async (list: DataList) => {
    if (!confirm(`Are you sure you want to delete "${list.name}"? This will also delete all contacts in this list.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/campaign-management/data-lists/${list.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete data list: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        // Remove from local state
        setDataLists(prev => prev.filter(l => l.id !== list.id));
        console.log(`✅ Deleted data list: ${list.name}`);
      } else {
        throw new Error(result.error?.message || 'Failed to delete data list');
      }
    } catch (error) {
      console.error('Error deleting data list:', error);
      alert(`Failed to delete data list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Clone data list via API
  const handleCloneList = async (list: DataList) => {
    const includeContacts = confirm(`Clone "${list.name}"?\n\nClick OK to clone with contacts, Cancel to clone without contacts.`);
    
    try {
      const response = await fetch(`/api/admin/campaign-management/data-lists/${list.id}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newName: `${list.name} (Copy)`,
          includeContacts: includeContacts
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to clone data list: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.data?.dataList) {
        // Transform and add to local state
        const clonedList = {
          id: result.data.dataList.id,
          listId: result.data.dataList.listId,
          name: result.data.dataList.name,
          description: result.data.dataList.campaignId ? `Assigned to Campaign: ${result.data.dataList.campaignId}` : 'No campaign assigned',
          campaign: result.data.dataList.campaignId || 'Unassigned',
          total: result.data.dataList.totalContacts || 0,
          available: result.data.dataList.totalContacts || 0,
          dialAttempts: 0,
          lastDialed: new Date().toISOString().split('T')[0],
          status: 'Inactive' as const,
          createdAt: new Date(result.data.dataList.createdAt)
        };
        
        setDataLists(prev => [...prev, clonedList]);
        console.log(`✅ Cloned data list: ${list.name} -> ${clonedList.name}`);
      } else {
        throw new Error(result.error?.message || 'Failed to clone data list');
      }
    } catch (error) {
      console.error('Error cloning data list:', error);
      alert(`Failed to clone data list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Filter data lists based on search
  const filteredLists = dataLists.filter(list => 
    list.name.toLowerCase().includes(searchTerm2.toLowerCase()) ||
    list.description.toLowerCase().includes(searchTerm2.toLowerCase()) ||
    list.campaign.toLowerCase().includes(searchTerm2.toLowerCase()) ||
    list.id.includes(searchTerm2)
  );

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900">Data Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your contact data and upload new data lists</p>
      </div>
      
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex space-x-8">
          {['Manage Data Lists', 'Create Data Lists', 'Upload Data', 'Data Analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedSubTab(tab)}
              className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                selectedSubTab === tab
                  ? 'border-slate-500 text-slate-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {selectedSubTab === 'Manage Data Lists' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Data Lists</h3>
                <p className="text-sm text-gray-500">Manage your contact data lists</p>
              </div>
              <button className="bg-slate-600 text-white px-4 py-2 rounded-md hover:bg-slate-700 transition-colors flex items-center">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create New List
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Error loading data lists</h4>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <button
                    onClick={fetchDataLists}
                    className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
                  <span className="ml-3 text-gray-600">Loading data lists...</span>
                </div>
              </div>
            )}

            {!loading && !error && (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="Search data lists..."
                    value={searchTerm2}
                    onChange={(e) => setSearchTerm2(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>

                {filteredLists.length === 0 && (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No data lists found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {dataLists.length === 0 ? 'Get started by creating your first data list.' : 'Try adjusting your search terms.'}
                    </p>
                  </div>
                )}

                {filteredLists.length > 0 && (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">List Details</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLists.map((list) => (
                        <tr key={list.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">#{list.id} - {list.name}</div>
                              <div className="text-sm text-gray-500">{list.description}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{list.campaign}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{list.total}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{list.available}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              list.status === 'Active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {list.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="relative">
                              <button
                                onClick={() => setOpenDropdown(openDropdown === list.id ? null : list.id)}
                                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                              >
                                <EllipsisVerticalIcon className="h-5 w-5" />
                              </button>
                              
                              {openDropdown === list.id && (
                                <div className="absolute right-0 top-8 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                                  <div className="py-1">
                                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                      <PencilIcon className="h-4 w-4 mr-3" />
                                      Edit List
                                    </button>
                                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                      <CloudArrowUpIcon className="h-4 w-4 mr-3" />
                                      Upload Data
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenDropdown(null);
                                        handleCloneList(list);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      <DocumentDuplicateIcon className="h-4 w-4 mr-3" />
                                      Clone List
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenDropdown(null);
                                        handleDeleteList(list);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                    >
                                      <TrashIcon className="h-4 w-4 mr-3" />
                                      Delete List
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}

        {selectedSubTab === 'Create Data Lists' && (
          <div className="text-center py-12">
            <PlusIcon className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Create New Data List</h3>
            <p className="mt-2 text-gray-600">Feature coming soon...</p>
          </div>
        )}

        {selectedSubTab === 'Upload Data' && (
          <div className="text-center py-12">
            <CloudArrowUpIcon className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Upload Data</h3>
            <p className="mt-2 text-gray-600">Feature coming soon...</p>
          </div>
        )}

        {selectedSubTab === 'Data Analytics' && (
          <div className="text-center py-12">
            <h3 className="mt-4 text-lg font-medium text-gray-900">Data Analytics</h3>
            <p className="mt-2 text-gray-600">Feature coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}
