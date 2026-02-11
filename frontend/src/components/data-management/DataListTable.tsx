'use client';

import { useState, useEffect } from 'react';
import { 
  EllipsisVerticalIcon, 
  PencilIcon, 
  DocumentDuplicateIcon, 
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface DataList {
  id: string;
  name: string;
  description: string;
  campaign: string;
  total: number;
  available: number;
}

interface Campaign {
  campaignId: string;
  name: string;
  displayName: string;
  type?: string;
  dialMethod?: string;
  status: string;
}

interface DataListTableProps {
  data: DataList[];
  searchTerm: string;
}

export default function DataListTable({ data, searchTerm }: DataListTableProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [editingList, setEditingList] = useState<DataList | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // Fetch available campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoadingCampaigns(true);
      try {
        const response = await fetch('/api/campaigns/active');
        const result = await response.json();
        if (result.success && result.campaigns) {
          setCampaigns(result.campaigns);
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      } finally {
        setLoadingCampaigns(false);
      }
    };

    fetchCampaigns();
  }, []);

  const filteredData = data.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.campaign.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Edit data list
  const handleEditList = (list: DataList) => {
    console.log(`📝 Opening edit dialog for data list: ${list.name}`);
    setEditingList(list);
    setIsEditDialogOpen(true);
    setOpenDropdown(null);
  };

  // Save edited data list
  const handleSaveEdit = async () => {
    if (!editingList) return;

    try {
      const response = await fetch(`/api/admin/campaign-management/data-lists/${editingList.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingList.name,
          description: editingList.description,
          campaignId: editingList.campaign !== 'Unassigned' ? editingList.campaign : null,
          blendWeight: 75 // Default weight
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update data list: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setIsEditDialogOpen(false);
        setEditingList(null);
        alert('Data list updated successfully!');
        // Refresh data would typically be handled by parent component
        // For now, we'll just close the dialog
      } else {
        throw new Error(result.error?.message || 'Failed to update data list');
      }
    } catch (error) {
      console.error('Error updating data list:', error);
      alert(`Failed to update data list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="h-full bg-gray-50">
      <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 m-4">
        {/* Table Header */}
        <div className="border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="grid grid-cols-7 gap-4 px-6 py-3 text-sm font-medium text-gray-900 uppercase tracking-wide">
            <div className="col-span-1">ID</div>
            <div className="col-span-1">Name</div>
            <div className="col-span-2">Description</div>
            <div className="col-span-1">Campaign</div>
            <div className="col-span-1 grid grid-cols-2 gap-2">
              <div>Total</div>
              <div>Available</div>
            </div>
            <div className="col-span-1">Actions</div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto" style={{ height: 'calc(100vh - 320px)' }}>
          {filteredData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Lists Found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'No data lists match your search criteria.' : 'Create your first data list to get started.'}
                </p>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
                  Create Data List
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredData.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`grid grid-cols-7 gap-4 px-6 py-4 text-sm hover:bg-gray-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}
                >
                  {/* ID */}
                  <div className="col-span-1">
                    <span className="font-medium text-gray-900">{item.id}</span>
                  </div>

                  {/* Name */}
                  <div className="col-span-1">
                    <button className="text-blue-600 hover:text-blue-800 font-medium transition-colors text-left">
                      {item.name}
                    </button>
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <span className="text-gray-700">{item.description}</span>
                  </div>

                  {/* Campaign */}
                  <div className="col-span-1">
                    <div className="flex items-center">
                      <span className="text-gray-900">{item.campaign}</span>
                    </div>
                  </div>

                  {/* Total and Available */}
                  <div className="col-span-1 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-900 font-medium">{item.total}</span>
                    </div>
                    <div>
                      <span className="text-gray-900 font-medium">{item.available}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1">
                    <div className="relative">
                      <button
                        data-dropdown-toggle
                        onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                        className="inline-flex items-center p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </button>

                      {/* Dropdown Menu */}
                      {openDropdown === item.id && (
                        <div className="dropdown-menu absolute right-0 top-6 mt-1 w-44 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                          <div className="py-1">
                            <button
                              onClick={() => handleEditList(item)}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              <PencilIcon className="h-4 w-4 mr-3" />
                              Edit Data List
                            </button>
                            <button
                              onClick={() => console.log('Clone data list:', item.id)}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              <DocumentDuplicateIcon className="h-4 w-4 mr-3" />
                              Clone Data List
                            </button>
                            <button
                              onClick={() => console.log('Delete data list:', item.id)}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <TrashIcon className="h-4 w-4 mr-3" />
                              Delete Data List
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between rounded-b-lg">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              Rows per page:
            </span>
            <select className="border border-gray-300 rounded-md text-sm px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>100</option>
              <option>50</option>
              <option>25</option>
              <option>10</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              {filteredData.length > 0 ? `1-${Math.min(10, filteredData.length)}` : '0-0'} of {filteredData.length}
            </span>
            <div className="flex items-center space-x-1">
              <button 
                className="p-2 rounded-md border border-gray-300 text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                disabled={true}
              >
                <span className="sr-only">Previous page</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                className="p-2 rounded-md border border-gray-300 text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                disabled={true}
              >
                <span className="sr-only">Next page</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Data List Dialog */}
      {isEditDialogOpen && editingList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Data List</h3>
              <button
                onClick={() => setIsEditDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingList.name}
                  onChange={(e) => setEditingList({ ...editingList, name: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                  placeholder="Enter data list name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingList.description}
                  onChange={(e) => setEditingList({ ...editingList, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                  placeholder="Enter description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
                {loadingCampaigns ? (
                  <div className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 p-3 text-gray-500">
                    Loading campaigns...
                  </div>
                ) : (
                  <select
                    value={editingList.campaign}
                    onChange={(e) => setEditingList({ ...editingList, campaign: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                  >
                    <option value="Unassigned">Unassigned</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.campaignId} value={campaign.campaignId}>
                        {campaign.displayName || campaign.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Additional Configuration Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blend Weight</label>
                <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500">
                  <option value="25">Low Priority (25%)</option>
                  <option value="50">Medium Priority (50%)</option>
                  <option value="75" selected>High Priority (75%)</option>
                  <option value="100">Maximum Priority (100%)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Controls how often this data list is used in campaigns</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Source</label>
                <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500">
                  <option value="manual">Manual Upload</option>
                  <option value="api">API Integration</option>
                  <option value="import">Imported from CSV</option>
                  <option value="external">External Database</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">How this data list was created</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                />
                <label htmlFor="autoRefresh" className="ml-2 block text-sm text-gray-900">
                  Enable auto-refresh
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setIsEditDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-600 border border-transparent rounded-md hover:bg-slate-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}