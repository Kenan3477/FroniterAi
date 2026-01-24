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

interface UploadWizardData {
  file: File | null;
  fileName: string;
  displayName: string;
  template: string;
  detectedColumns: string[];
  
  // Upload Options
  contactsNeedNumber: boolean;
  contactsNeedEmail: boolean;
  duplicateCheck: boolean;
  dncCheck: boolean;
  leadingLinesToSkip: number;
  enableFixedWidthColumns: boolean;
  enableCriteriaFiltering: boolean;
  useDelimiter: boolean;
  
  // Primary Columns
  primaryColumns: {
    title: string;
    firstName: string;
    middleName: string;
    lastName: string;
    tel1: string;
    companyName: string;
    department: string;
    website: string;
    industry: string;
    address1: string;
    address2: string;
    address3: string;
    email: string;
    telephone1: string;
    telephone2: string;
    telephone3: string;
    telephone4: string;
    telephone5: string;
    telephone6: string;
    caseReference: string;
    country: string;
    county: string;
    dateOfBirth: string;
    gender: string;
    latitude: string;
    leadReference: string;
    longitude: string;
    middleName2: string;
    postalCode: string;
    securityPhrase: string;
    sms: string;
    sortDate: string;
    sortNumber: string;
    sortText: string;
    sourceReference: string;
    townCity: string;
    title2: string;
  };
  
  // Custom Columns
  customColumns: Array<{
    name: string;
    matchColumn: string;
  }>;
  
  // Template Management
  saveAsTemplate: boolean;
  templateName: string;
  
  // Step management
  step: 'fileUpload' | 'uploadOptions' | 'primaryColumns' | 'customColumns' | 'uploadReview' | 'upload' | 'complete';
  
  // Validation Results
  validContacts: number;
  duplicateContacts: number;
  invalidContacts: number;
  dncContacts: number;
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
  const [isUploadWizardOpen, setIsUploadWizardOpen] = useState(false);
  const [editingList, setEditingList] = useState<DataList | null>(null);
  const [uploadTargetList, setUploadTargetList] = useState<DataList | null>(null);

  // Advanced upload wizard state
  const [uploadData, setUploadData] = useState<UploadWizardData>({
    file: null,
    fileName: '',
    displayName: '',
    template: '',
    detectedColumns: [],
    
    // Upload Options defaults
    contactsNeedNumber: false,
    contactsNeedEmail: false,
    duplicateCheck: false,
    dncCheck: false,
    leadingLinesToSkip: 0,
    enableFixedWidthColumns: false,
    enableCriteriaFiltering: false,
    useDelimiter: true,
    
    // Primary Columns defaults
    primaryColumns: {
      title: '',
      firstName: '',
      middleName: '',
      lastName: '',
      tel1: '',
      companyName: '',
      department: '',
      website: '',
      industry: '',
      address1: '',
      address2: '',
      address3: '',
      email: '',
      telephone1: '',
      telephone2: '',
      telephone3: '',
      telephone4: '',
      telephone5: '',
      telephone6: '',
      caseReference: '',
      country: '',
      county: '',
      dateOfBirth: '',
      gender: '',
      latitude: '',
      leadReference: '',
      longitude: '',
      middleName2: '',
      postalCode: '',
      securityPhrase: '',
      sms: '',
      sortDate: '',
      sortNumber: '',
      sortText: '',
      sourceReference: '',
      townCity: '',
      title2: '',
    },
    
    customColumns: [],
    saveAsTemplate: false,
    templateName: '',
    step: 'fileUpload',
    validContacts: 0,
    duplicateContacts: 0,
    invalidContacts: 0,
    dncContacts: 0,
  });

  // Template management state
  const [savedTemplates, setSavedTemplates] = useState<Array<{
    id: string;
    name: string;
    description: string;
    mappings: { [key: string]: string };
    validationRules: {
      contactsNeedNumber: boolean;
      contactsNeedEmail: boolean;
      duplicateCheck: boolean;
      dncCheck: boolean;
      leadingLinesToSkip: number;
    };
    createdAt: Date;
  }>>([]);

  // Load templates from localStorage on component mount
  useEffect(() => {
    const savedTemplatesData = localStorage.getItem('omnivox_upload_templates');
    if (savedTemplatesData) {
      try {
        const templates = JSON.parse(savedTemplatesData);
        setSavedTemplates(templates);
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    }
  }, []);

  // Create template from current mappings
  const createTemplateFromMappings = (templateName: string, mappings: { [key: string]: string }) => {
    const newTemplate = {
      id: Date.now().toString(),
      name: templateName,
      description: `Auto-generated template from ${uploadData.fileName}`,
      mappings,
      validationRules: {
        contactsNeedNumber: uploadData.contactsNeedNumber,
        contactsNeedEmail: uploadData.contactsNeedEmail,
        duplicateCheck: uploadData.duplicateCheck,
        dncCheck: uploadData.dncCheck,
        leadingLinesToSkip: uploadData.leadingLinesToSkip,
      },
      createdAt: new Date(),
    };
    
    setSavedTemplates(prev => [...prev, newTemplate]);
    
    // Save to localStorage for persistence
    const existingTemplates = JSON.parse(localStorage.getItem('omnivox_upload_templates') || '[]');
    localStorage.setItem('omnivox_upload_templates', JSON.stringify([...existingTemplates, newTemplate]));
    
    return newTemplate;
  };

  // Apply template function
  const applyTemplate = (templateName: string) => {
    const template = savedTemplates.find(t => t.name === templateName);
    if (template) {
      setUploadData(prev => ({
        ...prev,
        template: template.name,
        primaryColumns: {
          ...prev.primaryColumns,
          ...template.mappings
        },
        contactsNeedNumber: template.validationRules.contactsNeedNumber,
        contactsNeedEmail: template.validationRules.contactsNeedEmail,
        duplicateCheck: template.validationRules.duplicateCheck,
        dncCheck: template.validationRules.dncCheck,
        leadingLinesToSkip: template.validationRules.leadingLinesToSkip,
      }));
    }
  };

  // Load data lists from API
  // Helper function to get authentication headers (cookies handled server-side)
  const getAuthHeaders = (): Record<string, string> => {
    return {
      'Content-Type': 'application/json',
    };
  };

  const fetchDataLists = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/campaign-management/data-lists', {
        headers: getAuthHeaders(),
      });
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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

  // Upload data to list with advanced wizard
  const handleUploadData = (list: DataList) => {
    console.log(`📤 Opening advanced upload wizard for data list:`, list);
    console.log(`📤 Current state:`, { isUploadWizardOpen, uploadTargetList });
    setUploadTargetList(list);
    setIsUploadWizardOpen(true);
    setUploadData(prev => ({ ...prev, step: 'fileUpload' }));
    setOpenDropdown(null);
    console.log(`📤 After state update - wizard should be open now`);
  };

  // Handle file selection with advanced processing
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadData(prev => ({
        ...prev,
        file: file,
        fileName: file.name,
        displayName: file.name.replace(/\.[^/.]+$/, "")
      }));
      
      // Parse CSV to detect columns and auto-map
      parseCSVForSmartMapping(file);
    }
  };

  // Advanced CSV parsing with smart field mapping
  const parseCSVForSmartMapping = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        setUploadData(prev => ({
          ...prev,
          detectedColumns: headers,
          primaryColumns: {
            ...prev.primaryColumns,
            ...detectSmartMappings(headers)
          }
        }));
      }
    };
    reader.readAsText(file);
  };

  // Smart field mapping detection with comprehensive patterns
  const detectSmartMappings = (headers: string[]): { [key: string]: string } => {
    const mappings: { [key: string]: string } = {};
    
    // Enhanced field patterns for better detection
    const fieldPatterns = {
      firstName: /first.?name|fname|given.?name|forename/i,
      lastName: /last.?name|lname|surname|family.?name/i,
      middleName: /middle.?name|mname|middle.?initial/i,
      telephone1: /phone|tel|telephone|mobile|cell|primary.?phone|phone1/i,
      telephone2: /phone2|tel2|telephone2|secondary.?phone|alt.?phone/i,
      telephone3: /phone3|tel3|telephone3|mobile|cell.?phone/i,
      telephone4: /phone4|tel4|telephone4|work.?phone/i,
      telephone5: /phone5|tel5|telephone5|home.?phone/i,
      telephone6: /phone6|tel6|telephone6|fax/i,
      email: /email|e.?mail|email.?address/i,
      companyName: /company|organisation|organization|business|employer|firm/i,
      title: /title|job.?title|position|role/i,
      title2: /title2|secondary.?title|alt.?title/i,
      department: /department|dept|division/i,
      address1: /address|address1|street|addr1|address.?line.?1/i,
      address2: /address2|apt|apartment|suite|addr2|address.?line.?2/i,
      address3: /address3|addr3|address.?line.?3/i,
      townCity: /city|town|municipality/i,
      county: /county|state|province|region/i,
      postalCode: /zip|postal|post.?code|zipcode/i,
      country: /country|nation/i,
      website: /website|url|web|site/i,
      industry: /industry|sector|business.?type/i,
      dateOfBirth: /dob|date.?of.?birth|birth.?date|birthdate/i,
      gender: /gender|sex/i,
      leadReference: /lead.?ref|reference|ref.?id|lead.?id/i,
      caseReference: /case.?ref|case.?id|ticket.?id/i,
      sourceReference: /source|origin|campaign.?source/i,
      sms: /sms|text.?number|mobile.?sms/i,
      securityPhrase: /security|phrase|password|pin/i,
      latitude: /lat|latitude|geo.?lat/i,
      longitude: /lng|lon|longitude|geo.?lng/i,
      sortDate: /sort.?date|date.?sort|order.?date/i,
      sortNumber: /sort.?number|number.?sort|order.?num/i,
      sortText: /sort.?text|text.?sort|order.?text/i,
    };

    headers.forEach(header => {
      for (const [fieldName, pattern] of Object.entries(fieldPatterns)) {
        if (pattern.test(header) && !mappings[fieldName]) {
          mappings[fieldName] = header;
          break;
        }
      }
    });

    return mappings;
  };

  // Complete upload with advanced processing
  const handleCompleteUpload = async () => {
    if (!uploadData.file || !uploadTargetList) {
      console.error('❌ Upload missing required data:', { file: !!uploadData.file, targetList: !!uploadTargetList });
      return;
    }

    console.log('📤 Starting upload process...', { 
      fileName: uploadData.file.name, 
      targetList: uploadTargetList.name,
      listId: uploadTargetList.id 
    });

    try {
      // Process file based on mapping
      const text = await uploadData.file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip leading lines if configured
      const dataLines = lines.slice(uploadData.leadingLinesToSkip + 1);
      const headers = lines[uploadData.leadingLinesToSkip].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Parse contacts with comprehensive field mapping
      const contacts = dataLines.map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const contact: any = {};
        
        // Map primary columns
        Object.entries(uploadData.primaryColumns).forEach(([field, column]) => {
          if (column) {
            const columnIndex = headers.indexOf(column);
            if (columnIndex !== -1 && values[columnIndex]) {
              contact[field] = values[columnIndex];
            }
          }
        });

        // Map custom columns
        uploadData.customColumns.forEach(({ name, matchColumn }) => {
          const columnIndex = headers.indexOf(matchColumn);
          if (columnIndex !== -1 && values[columnIndex]) {
            contact[name] = values[columnIndex];
          }
        });

        return contact;
      }).filter(contact => {
        // Apply validation rules
        if (uploadData.contactsNeedNumber && !contact.telephone1 && !contact.tel1) return false;
        if (uploadData.contactsNeedEmail && !contact.email) return false;
        return contact.firstName || contact.lastName || contact.telephone1 || contact.tel1;
      });

      console.log('📋 Processed contacts:', { 
        totalProcessed: contacts.length, 
        sampleContact: contacts[0],
        targetListId: uploadTargetList.id 
      });

      const response = await fetch(`/api/admin/campaign-management/data-lists/${uploadTargetList.id}/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          contacts: contacts,
          mapping: uploadData.primaryColumns,
          options: {
            skipDuplicates: uploadData.duplicateCheck,
            validateEmails: uploadData.contactsNeedEmail,
            dncCheck: uploadData.dncCheck
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📤 Upload response:', result);
      
      if (result.success) {
        const uploadStats = result.data || {};
        setUploadData(prev => ({
          ...prev,
          step: 'complete',
          validContacts: uploadStats.totalProcessed || contacts.length,
          duplicateContacts: uploadStats.duplicatesSkipped || 0,
          invalidContacts: uploadStats.invalidContacts || 0,
          dncContacts: uploadStats.dncRejected || 0
        }));
        
        fetchDataLists(); // Refresh to show updated contact counts
        console.log('✅ Upload completed successfully');
      } else {
        throw new Error(result.error?.message || result.message || 'Upload failed');
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
                                        console.log('🔍 Upload Data button clicked for list:', list);
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
          <div className="space-y-6">
            <div className="text-center py-8">
              <CloudArrowUpIcon className="mx-auto h-16 w-16 text-blue-500" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Upload Data to Existing List</h3>
              <p className="mt-2 text-gray-600">Select a data list to upload contacts to.</p>
            </div>
            
            {dataLists.length > 0 ? (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="text-lg font-medium text-gray-900">Available Data Lists</h4>
                </div>
                <div className="divide-y divide-gray-200">
                  {dataLists.map((list) => (
                    <div key={list.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900">{list.name}</h5>
                        <p className="text-sm text-gray-600">{list.description}</p>
                        <p className="text-xs text-gray-500">
                          {list.total} contacts • Status: {list.status}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          console.log('🎯 Direct upload button clicked for:', list);
                          handleUploadData(list);
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Upload Data
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No data lists available. Create one first in the "Create Data Lists" tab.</p>
              </div>
            )}
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

      {/* Advanced Upload Wizard */}
      {(() => {
        console.log('🔍 Modal render check:', { isUploadWizardOpen, uploadTargetList: !!uploadTargetList });
        return isUploadWizardOpen && uploadTargetList;
      })() && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Header with progress */}
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Advanced Upload Wizard - "{uploadTargetList?.name}"
              </h2>
              <div className="mt-3 flex items-center space-x-2">
                {[
                  { step: 'fileUpload', label: 'File Upload', icon: '📁' },
                  { step: 'uploadOptions', label: 'Options', icon: '⚙️' },
                  { step: 'primaryColumns', label: 'Primary Fields', icon: '📋' },
                  { step: 'customColumns', label: 'Custom Fields', icon: '🔧' },
                  { step: 'uploadReview', label: 'Review', icon: '👁️' },
                  { step: 'upload', label: 'Upload', icon: '📤' },
                  { step: 'complete', label: 'Complete', icon: '✅' }
                ].map((item, index) => (
                  <div key={item.step} className="flex items-center">
                    <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${
                      uploadData.step === item.step 
                        ? 'bg-blue-100 text-blue-800 font-medium' 
                        : uploadData.step === 'complete' || 
                          ['fileUpload', 'uploadOptions', 'primaryColumns', 'customColumns', 'uploadReview', 'upload'].indexOf(item.step) < 
                          ['fileUpload', 'uploadOptions', 'primaryColumns', 'customColumns', 'uploadReview', 'upload', 'complete'].indexOf(uploadData.step)
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {index < 6 && (
                      <div className="w-6 h-px bg-gray-300 mx-1"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* Step 1: File Upload */}
              {uploadData.step === 'fileUpload' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Select Data File</h3>
                    
                    {/* Template Selection */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">📋 Quick Start with Template</h4>
                      <p className="text-xs text-blue-700 mb-3">Load a saved mapping template to automatically configure field mappings and validation rules.</p>
                      <div className="flex items-center space-x-3">
                        <select 
                          value={uploadData.template}
                          onChange={(e) => {
                            setUploadData(prev => ({ ...prev, template: e.target.value }));
                          }}
                          className="flex-1 text-sm border-blue-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">Choose a template...</option>
                          {savedTemplates.map((template) => (
                            <option key={template.id} value={template.name}>
                              {template.name} ({new Date(template.createdAt).toLocaleDateString()})
                            </option>
                          ))}
                        </select>
                        <button 
                          onClick={() => {
                            if (uploadData.template) {
                              applyTemplate(uploadData.template);
                              alert(`Template "${uploadData.template}" applied successfully!`);
                            }
                          }}
                          disabled={!uploadData.template}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Apply
                        </button>
                      </div>
                    </div>

                    {/* File Selection */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <div className="space-y-4">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">📁</span>
                        </div>
                        <div>
                          <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-upload"
                          />
                          <label
                            htmlFor="file-upload"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 cursor-pointer"
                          >
                            Choose File
                          </label>
                          <p className="text-sm text-gray-500 mt-2">
                            or drag and drop your CSV, Excel file here
                          </p>
                        </div>
                        <p className="text-xs text-gray-400">
                          Supported formats: CSV, Excel (.xlsx, .xls) - Max 50MB
                        </p>
                      </div>
                    </div>

                    {/* File Info */}
                    {uploadData.file && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-green-600">✅</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-900">{uploadData.fileName}</p>
                            <p className="text-xs text-green-700">
                              {(uploadData.file.size / 1024 / 1024).toFixed(2)} MB • {uploadData.detectedColumns.length} columns detected
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Upload Options */}
              {uploadData.step === 'uploadOptions' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Configuration</h3>
                    
                    {/* Data Processing Options */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Data Processing</h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={uploadData.leadingLinesToSkip}
                            onChange={(e) => setUploadData(prev => ({ ...prev, leadingLinesToSkip: parseInt(e.target.value) || 0 }))}
                            className="w-20 px-3 py-1 border border-gray-300 rounded-md text-sm"
                          />
                          <label className="text-sm text-gray-700">
                            Leading lines to skip (headers, descriptions, etc.)
                          </label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={uploadData.useDelimiter}
                            onChange={(e) => setUploadData(prev => ({ ...prev, useDelimiter: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="text-sm text-gray-700">Use comma delimiter (uncheck for tab/custom)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={uploadData.enableFixedWidthColumns}
                            onChange={(e) => setUploadData(prev => ({ ...prev, enableFixedWidthColumns: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="text-sm text-gray-700">Enable fixed-width column parsing</label>
                        </div>
                      </div>
                    </div>

                    {/* Validation Rules */}
                    <div className="bg-yellow-50 rounded-lg p-4 mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Validation Rules</h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={uploadData.contactsNeedNumber}
                            onChange={(e) => setUploadData(prev => ({ ...prev, contactsNeedNumber: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="text-sm text-gray-700">Contacts must have a phone number</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={uploadData.contactsNeedEmail}
                            onChange={(e) => setUploadData(prev => ({ ...prev, contactsNeedEmail: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="text-sm text-gray-700">Validate email addresses</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={uploadData.duplicateCheck}
                            onChange={(e) => setUploadData(prev => ({ ...prev, duplicateCheck: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="text-sm text-gray-700">Check for duplicate contacts (by phone/email)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={uploadData.dncCheck}
                            onChange={(e) => setUploadData(prev => ({ ...prev, dncCheck: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="text-sm text-gray-700">Check against Do Not Call (DNC) registry</label>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Options */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Advanced Features</h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={uploadData.enableCriteriaFiltering}
                            onChange={(e) => setUploadData(prev => ({ ...prev, enableCriteriaFiltering: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="text-sm text-gray-700">Enable criteria-based filtering during import</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={uploadData.saveAsTemplate}
                            onChange={(e) => setUploadData(prev => ({ ...prev, saveAsTemplate: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="text-sm text-gray-700">Save these settings as a template for future uploads</label>
                        </div>
                        {uploadData.saveAsTemplate && (
                          <div className="ml-6 mt-2">
                            <input
                              type="text"
                              placeholder="Template name..."
                              value={uploadData.templateName}
                              onChange={(e) => setUploadData(prev => ({ ...prev, templateName: e.target.value }))}
                              className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Primary Columns Mapping */}
              {uploadData.step === 'primaryColumns' && uploadData.detectedColumns.length > 0 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Map Primary Contact Fields</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Map your CSV columns to standard contact fields. Smart mapping has been applied based on column headers.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { field: 'firstName', label: 'First Name', required: true },
                        { field: 'lastName', label: 'Last Name', required: true },
                        { field: 'telephone1', label: 'Primary Phone', required: true },
                        { field: 'email', label: 'Email Address', required: false },
                        { field: 'companyName', label: 'Company', required: false },
                        { field: 'title', label: 'Job Title', required: false },
                        { field: 'address1', label: 'Address Line 1', required: false },
                        { field: 'address2', label: 'Address Line 2', required: false },
                        { field: 'townCity', label: 'City/Town', required: false },
                        { field: 'county', label: 'State/County', required: false },
                        { field: 'postalCode', label: 'Postal Code', required: false },
                        { field: 'country', label: 'Country', required: false },
                        { field: 'telephone2', label: 'Secondary Phone', required: false },
                        { field: 'telephone3', label: 'Mobile Phone', required: false },
                        { field: 'website', label: 'Website', required: false },
                        { field: 'department', label: 'Department', required: false },
                        { field: 'industry', label: 'Industry', required: false },
                        { field: 'dateOfBirth', label: 'Date of Birth', required: false },
                        { field: 'gender', label: 'Gender', required: false },
                        { field: 'middleName', label: 'Middle Name', required: false }
                      ].map(({ field, label, required }) => (
                        <div key={field} className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            {label} {required && <span className="text-red-500">*</span>}
                          </label>
                          <select
                            value={uploadData.primaryColumns[field as keyof typeof uploadData.primaryColumns] || ''}
                            onChange={(e) => setUploadData(prev => ({
                              ...prev,
                              primaryColumns: {
                                ...prev.primaryColumns,
                                [field]: e.target.value
                              }
                            }))}
                            className={`w-full rounded-md border-gray-300 shadow-sm text-sm ${
                              required && !uploadData.primaryColumns[field as keyof typeof uploadData.primaryColumns] 
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                                : 'focus:border-blue-500 focus:ring-blue-500'
                            }`}
                          >
                            <option value="">Select column...</option>
                            {uploadData.detectedColumns.map((col) => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Custom Columns */}
              {uploadData.step === 'customColumns' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Field Mapping</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Map any remaining CSV columns to custom fields for additional data storage.
                    </p>
                    
                    <div className="space-y-4">
                      {uploadData.customColumns.map((customCol, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                          <input
                            type="text"
                            placeholder="Custom field name"
                            value={customCol.name}
                            onChange={(e) => {
                              const newCols = [...uploadData.customColumns];
                              newCols[index].name = e.target.value;
                              setUploadData(prev => ({ ...prev, customColumns: newCols }));
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                          <select
                            value={customCol.matchColumn}
                            onChange={(e) => {
                              const newCols = [...uploadData.customColumns];
                              newCols[index].matchColumn = e.target.value;
                              setUploadData(prev => ({ ...prev, customColumns: newCols }));
                            }}
                            className="flex-1 rounded-md border-gray-300 text-sm"
                          >
                            <option value="">Select CSV column...</option>
                            {uploadData.detectedColumns.map((col) => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              const newCols = uploadData.customColumns.filter((_, i) => i !== index);
                              setUploadData(prev => ({ ...prev, customColumns: newCols }));
                            }}
                            className="px-2 py-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      
                      <button
                        onClick={() => {
                          setUploadData(prev => ({
                            ...prev,
                            customColumns: [...prev.customColumns, { name: '', matchColumn: '' }]
                          }));
                        }}
                        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400"
                      >
                        + Add Custom Field Mapping
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Upload Review */}
              {uploadData.step === 'uploadReview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Review Upload Configuration</h3>
                    
                    {/* File Summary */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">File Information</h4>
                      <div className="text-sm text-gray-700 space-y-1">
                        <div>📁 <strong>File:</strong> {uploadData.fileName}</div>
                        <div>📊 <strong>Estimated Records:</strong> ~{uploadData.detectedColumns.length > 0 ? '1,000+' : '0'}</div>
                        <div>⚙️ <strong>Skip Lines:</strong> {uploadData.leadingLinesToSkip}</div>
                      </div>
                    </div>

                    {/* Mapping Summary */}
                    <div className="bg-blue-50 rounded-lg p-4 mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Field Mappings</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {Object.entries(uploadData.primaryColumns).filter(([, value]) => value).map(([field, column]) => (
                          <div key={field} className="flex items-center space-x-2">
                            <span className="text-gray-600">{field}:</span>
                            <span className="font-medium text-blue-700">{column}</span>
                          </div>
                        ))}
                      </div>
                      {uploadData.customColumns.filter(col => col.name && col.matchColumn).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <div className="text-xs font-medium text-gray-600 mb-1">Custom Fields:</div>
                          {uploadData.customColumns.filter(col => col.name && col.matchColumn).map((col, index) => (
                            <div key={index} className="text-sm text-gray-700">
                              {col.name} ← {col.matchColumn}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Validation Rules */}
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Active Validation Rules</h4>
                      <div className="text-sm text-gray-700 space-y-1">
                        {uploadData.contactsNeedNumber && <div>✓ Contacts must have phone number</div>}
                        {uploadData.contactsNeedEmail && <div>✓ Email validation enabled</div>}
                        {uploadData.duplicateCheck && <div>✓ Duplicate detection enabled</div>}
                        {uploadData.dncCheck && <div>✓ DNC registry checking enabled</div>}
                        {!uploadData.contactsNeedNumber && !uploadData.contactsNeedEmail && !uploadData.duplicateCheck && !uploadData.dncCheck && (
                          <div className="text-gray-500">No validation rules active</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6: Upload Progress */}
              {uploadData.step === 'upload' && (
                <div className="space-y-6 text-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Uploading Data</h3>
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl">📤</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: '75%' }}></div>
                    </div>
                    <p className="text-sm text-gray-600">Processing and validating contacts...</p>
                  </div>
                </div>
              )}

              {/* Step 7: Complete */}
              {uploadData.step === 'complete' && (
                <div className="space-y-6 text-center">
                  <div>
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl">✅</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Complete!</h3>
                    
                    <div className="bg-gray-50 rounded-lg p-6 text-left max-w-md mx-auto">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Upload Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Valid Contacts:</span>
                          <span className="font-medium text-green-600">{uploadData.validContacts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Duplicates:</span>
                          <span className="font-medium text-yellow-600">{uploadData.duplicateContacts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Invalid:</span>
                          <span className="font-medium text-red-600">{uploadData.invalidContacts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">DNC Filtered:</span>
                          <span className="font-medium text-red-600">{uploadData.dncContacts}</span>
                        </div>
                      </div>
                    </div>
                    
                    {uploadData.saveAsTemplate && uploadData.templateName && (
                      <div className="text-sm text-blue-600 mt-4">
                        ✅ Template "{uploadData.templateName}" saved for future uploads
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer with navigation */}
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {uploadData.step !== 'complete' && `Step ${['fileUpload', 'uploadOptions', 'primaryColumns', 'customColumns', 'uploadReview', 'upload', 'complete'].indexOf(uploadData.step) + 1} of 7`}
              </div>
              
              <div className="flex space-x-3">
                {/* Back Button */}
                {uploadData.step !== 'fileUpload' && uploadData.step !== 'upload' && uploadData.step !== 'complete' && (
                  <button
                    onClick={() => {
                      const steps = ['fileUpload', 'uploadOptions', 'primaryColumns', 'customColumns', 'uploadReview', 'upload', 'complete'];
                      const currentIndex = steps.indexOf(uploadData.step);
                      if (currentIndex > 0) {
                        setUploadData(prev => ({ ...prev, step: steps[currentIndex - 1] as any }));
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Back
                  </button>
                )}

                {/* Cancel Button */}
                {uploadData.step !== 'complete' && uploadData.step !== 'upload' && (
                  <button
                    onClick={() => {
                      setIsUploadWizardOpen(false);
                      setUploadData(prev => ({ ...prev, step: 'fileUpload', file: null, fileName: '', detectedColumns: [] }));
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}

                {/* Next/Action Buttons */}
                {uploadData.step === 'fileUpload' && uploadData.file && (
                  <button
                    onClick={() => setUploadData(prev => ({ ...prev, step: 'uploadOptions' }))}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Next: Configure Options
                  </button>
                )}

                {uploadData.step === 'uploadOptions' && (
                  <button
                    onClick={() => setUploadData(prev => ({ ...prev, step: 'primaryColumns' }))}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Next: Map Fields
                  </button>
                )}

                {uploadData.step === 'primaryColumns' && (
                  <button
                    onClick={() => setUploadData(prev => ({ ...prev, step: 'customColumns' }))}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Next: Custom Fields
                  </button>
                )}

                {uploadData.step === 'customColumns' && (
                  <button
                    onClick={() => setUploadData(prev => ({ ...prev, step: 'uploadReview' }))}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Next: Review
                  </button>
                )}

                {uploadData.step === 'uploadReview' && (
                  <button
                    onClick={async () => {
                      setUploadData(prev => ({ ...prev, step: 'upload' }));
                      
                      try {
                        // Save template if requested
                        if (uploadData.saveAsTemplate && uploadData.templateName) {
                          createTemplateFromMappings(uploadData.templateName, uploadData.primaryColumns);
                        }
                        
                        // Execute the actual upload
                        await handleCompleteUpload();
                      } catch (error) {
                        console.error('Upload failed:', error);
                        // Reset to review step on error
                        setUploadData(prev => ({ ...prev, step: 'uploadReview' }));
                      }
                    }}
                    className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                  >
                    Start Upload
                  </button>
                )}

                {uploadData.step === 'complete' && (
                  <button
                    onClick={() => {
                      setIsUploadWizardOpen(false);
                      setUploadData(prev => ({ 
                        ...prev, 
                        step: 'fileUpload', 
                        file: null, 
                        fileName: '', 
                        detectedColumns: [],
                        validContacts: 0,
                        duplicateContacts: 0,
                        invalidContacts: 0,
                        dncContacts: 0
                      }));
                      // Refresh data lists
                      fetchDataLists();
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
