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

  // Dialog states for edit and upload
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<DataList | null>(null);
  const [uploadTargetList, setUploadTargetList] = useState<DataList | null>(null);

  // Upload wizard state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState<'file' | 'mapping' | 'preview' | 'upload'>('file');
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<{[key: string]: string}>({});
  const [previewData, setPreviewData] = useState<any[]>([]);

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
      console.log(`🗑️ Attempting to delete data list: ${list.name} (ID: ${list.id})`);

      const response = await fetch(`/api/admin/campaign-management/data-lists/${list.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`📋 Delete response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Delete request failed:', errorText);
        throw new Error(`Failed to delete data list: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📋 Delete response data:', result);

      if (result.success) {
        // Remove from local state
        setDataLists(prev => prev.filter(l => l.id !== list.id));
        console.log(`✅ Deleted data list: ${list.name}`);
        alert(`Successfully deleted "${list.name}" and ${result.data?.deletedContacts || 0} contacts`);
        
        // Close dropdown
        setOpenDropdown(null);
      } else {
        throw new Error(result.error?.message || 'Failed to delete data list');
      }
    } catch (error) {
      console.error('❌ Error deleting data list:', error);
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
          campaignId: editingList.campaign !== 'Unassigned' ? editingList.campaign : null,
          blendWeight: 75 // Default weight
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update data list: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        // Update local state
        setDataLists(prev => prev.map(l => 
          l.id === editingList.id 
            ? { ...l, name: editingList.name, campaign: editingList.campaign }
            : l
        ));
        setIsEditDialogOpen(false);
        setEditingList(null);
        alert('Data list updated successfully!');
      } else {
        throw new Error(result.error?.message || 'Failed to update data list');
      }
    } catch (error) {
      console.error('Error updating data list:', error);
      alert(`Failed to update data list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Upload data to list
  const handleUploadData = (list: DataList) => {
    console.log(`📤 Opening upload dialog for data list: ${list.name}`);
    setUploadTargetList(list);
    setIsUploadDialogOpen(true);
    setUploadStep('file');
    setOpenDropdown(null);
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
      // Parse CSV to detect columns
      parseCSVHeaders(file);
    }
  };

  // Parse CSV headers for field mapping
  const parseCSVHeaders = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        setDetectedColumns(headers);
        setUploadStep('mapping');
        
        // Auto-map common fields
        const mapping: {[key: string]: string} = {};
        headers.forEach(header => {
          const lower = header.toLowerCase();
          if (lower.includes('first') && lower.includes('name')) mapping.firstName = header;
          if (lower.includes('last') && lower.includes('name')) mapping.lastName = header;
          if (lower.includes('phone') || lower.includes('tel')) mapping.phone = header;
          if (lower.includes('email')) mapping.email = header;
          if (lower.includes('company')) mapping.company = header;
        });
        setFieldMapping(mapping);
      }
    };
    reader.readAsText(file);
  };

  // Complete upload
  const handleCompleteUpload = async () => {
    if (!uploadFile || !uploadTargetList) return;

    try {
      // Read and parse CSV file
      const text = await uploadFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Parse data rows
      const contacts = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const contact: any = {};
        
        // Map fields based on fieldMapping
        Object.entries(fieldMapping).forEach(([field, column]) => {
          const columnIndex = headers.indexOf(column);
          if (columnIndex !== -1 && values[columnIndex]) {
            contact[field] = values[columnIndex];
          }
        });

        return contact;
      }).filter(contact => contact.firstName || contact.lastName || contact.phone);

      const response = await fetch(`/api/admin/campaign-management/data-lists/${uploadTargetList.id}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contacts: contacts,
          mapping: fieldMapping
        }),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        alert(`Successfully uploaded ${contacts.length} contacts!`);
        setIsUploadDialogOpen(false);
        setUploadFile(null);
        setFieldMapping({});
        setDetectedColumns([]);
        fetchDataLists(); // Refresh to show updated contact counts
      } else {
        throw new Error(result.error?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading data:', error);
      alert(`Failed to upload data: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                                    <button 
                                      onClick={() => {
                                        setOpenDropdown(null);
                                        handleEditList(list);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      <PencilIcon className="h-4 w-4 mr-3" />
                                      Edit List
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setOpenDropdown(null);
                                        handleUploadData(list);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
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

      {/* Edit Data List Dialog */}
      {isEditDialogOpen && editingList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Data List</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingList.name}
                  onChange={(e) => setEditingList({ ...editingList, name: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
                <input
                  type="text"
                  value={editingList.campaign}
                  onChange={(e) => setEditingList({ ...editingList, campaign: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                  placeholder="Enter campaign name or 'Unassigned'"
                />
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

      {/* Upload Data Dialog */}
      {isUploadDialogOpen && uploadTargetList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Upload Data to "{uploadTargetList.name}"
            </h3>

            {uploadStep === 'file' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: CSV, Excel (.xlsx, .xls)
                  </p>
                </div>
              </div>
            )}

            {uploadStep === 'mapping' && detectedColumns.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Map CSV Columns to Fields</h4>
                  <div className="space-y-3">
                    {['firstName', 'lastName', 'phone', 'email', 'company'].map((field) => (
                      <div key={field} className="flex items-center space-x-3">
                        <label className="w-24 text-sm font-medium text-gray-700 capitalize">
                          {field.replace(/([A-Z])/g, ' $1')}:
                        </label>
                        <select
                          value={fieldMapping[field] || ''}
                          onChange={(e) => setFieldMapping({ ...fieldMapping, [field]: e.target.value })}
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                        >
                          <option value="">Select column</option>
                          {detectedColumns.map((col) => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={() => setUploadStep('file')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCompleteUpload}
                    className="px-4 py-2 text-sm font-medium text-white bg-slate-600 border border-transparent rounded-md hover:bg-slate-700"
                  >
                    Upload Data
                  </button>
                </div>
              </div>
            )}

            {uploadStep === 'file' && (
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setIsUploadDialogOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
