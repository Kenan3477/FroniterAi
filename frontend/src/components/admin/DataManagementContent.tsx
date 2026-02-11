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
  campaignId?: string;
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

  // Data list creation state
  const [newListData, setNewListData] = useState({
    name: '',
    description: '',
    campaignId: '',
    blendWeight: 50,
    autoUpload: false
  });
  const [createListLoading, setCreateListLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Array<{ campaignId: string; name: string; displayName: string; status: string }>>([]);

  // Analytics data state
  const [analyticsData, setAnalyticsData] = useState({
    totalLists: 0,
    totalContacts: 0,
    activeLists: 0,
    availableContacts: 0
  });

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

  // Calculate analytics data from current data lists
  const calculateAnalyticsData = () => {
    const totalLists = dataLists.length;
    const totalContacts = dataLists.reduce((sum, list) => sum + list.total, 0);
    const activeLists = dataLists.filter(list => list.status === 'Active').length;
    const availableContacts = dataLists.reduce((sum, list) => sum + list.available, 0);
    
    setAnalyticsData({
      totalLists,
      totalContacts,
      activeLists,
      availableContacts
    });
  };

  // Manual function to update contact counts for debugging
  const forceUpdateContactCounts = async () => {
    console.log('🔧 Force updating contact counts...');
    
    try {
      // Direct backend call to trigger contact count recalculation
      const response = await fetch('https://froniterai-production.up.railway.app/api/admin/campaign-management/data-lists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${document.cookie.split('auth-token=')[1]?.split(';')[0]}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'recalculate_counts'
        })
      });
      
      if (response.ok) {
        console.log('🔧 Contact count recalculation triggered');
        setTimeout(() => fetchDataLists(), 1000);
      }
    } catch (error) {
      console.error('🔧 Force update failed:', error);
      
      // Fallback: Just refresh the data lists
      setTimeout(() => fetchDataLists(), 500);
    }
  };

  // Load data lists from API
  // Helper function to get authentication headers (cookies handled server-side)
  const getAuthHeaders = (): Record<string, string> => {
    const token = document.cookie.split('auth-token=')[1]?.split(';')[0];
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Load available campaigns for assignment
  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns/active');
      
      if (response.ok) {
        const result = await response.json();
        console.log('🎯 Fetched campaigns:', result); // Debug log
        if (result.success && result.campaigns) {
          setCampaigns(result.campaigns);
        } else {
          console.warn('No campaigns found in response:', result);
        }
      } else {
        console.error('Failed to fetch campaigns, status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  // Handle create new data list
  const handleCreateDataList = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newListData.name) {
      alert('Please enter a name for the data list');
      return;
    }
    
    setCreateListLoading(true);
    
    try {
      console.log('📝 Creating new data list:', newListData);
      
      const response = await fetch('/api/admin/campaign-management/data-lists', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newListData.name,
          description: newListData.description,
          campaignId: newListData.campaignId || null,
          blendWeight: newListData.blendWeight
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create data list: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Data list created successfully:', result);
      
      if (result.success && result.data?.dataList) {
        // Add new list to local state
        const newList: DataList = {
          id: result.data.dataList.id,
          listId: result.data.dataList.listId,
          name: result.data.dataList.name,
          description: newListData.description || 'No description provided',
          campaign: newListData.campaignId ? 
            campaigns.find(c => c.campaignId === newListData.campaignId)?.name || 'Assigned' : 
            'Unassigned',
          total: 0,
          available: 0,
          dialAttempts: 0,
          lastDialed: new Date().toISOString().split('T')[0],
          status: 'Inactive',
          createdAt: new Date(result.data.dataList.createdAt)
        };
        
        setDataLists(prev => [newList, ...prev]);
        
        // Reset form
        setNewListData({
          name: '',
          description: '',
          campaignId: '',
          blendWeight: 50,
          autoUpload: false
        });
        
        // If auto-upload is selected, trigger upload wizard
        if (newListData.autoUpload) {
          setUploadTargetList(newList);
          setIsUploadWizardOpen(true);
          setSelectedSubTab('Manage Data Lists');
        }
        
        alert('Data list created successfully!');
      }
    } catch (error) {
      console.error('Error creating data list:', error);
      alert(`Failed to create data list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreateListLoading(false);
    }
  };

  const fetchDataLists = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔗 Fetching data lists from API...');
      const response = await fetch('/api/admin/campaign-management/data-lists', {
        headers: getAuthHeaders(),
      });
      
      console.log('📡 API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API response error:', errorText);
        throw new Error(`Failed to fetch data lists: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📡 Raw API response:', result);
      if (result.success && result.data?.dataLists) {
        // Transform backend data to frontend format
        const transformedLists = result.data.dataLists.map((list: any) => {
          // Try multiple possible fields for contact count
          const contactCount = list.totalContacts || list.contactCount || list.total_contacts || list._count?.contacts || 0;
          
          console.log(`📊 Data list "${list.name}" contact count:`, {
            id: list.id,
            name: list.name,
            totalContacts: list.totalContacts,
            contactCount: list.contactCount,
            total_contacts: list.total_contacts,
            _count: list._count,
            finalCount: contactCount,
            rawListData: list
          });
          
          // Flag problematic data
          if (contactCount === 0 && (list.totalContacts !== 0 || list.contactCount !== 0 || list.total_contacts !== 0)) {
            console.warn(`⚠️ CONTACT COUNT ISSUE: List "${list.name}" has mismatched contact count fields!`);
          }
          
          return {
            id: list.id,
            listId: list.listId,
            name: list.name,
            description: list.campaignId ? `Assigned to Campaign: ${list.campaignId}` : 'No campaign assigned',
            campaign: list.campaignId || 'Unassigned',
            campaignId: list.campaignId,
            total: contactCount,
            available: contactCount,
            dialAttempts: 0,
            lastDialed: new Date().toISOString().split('T')[0],
            status: list.active ? 'Active' : 'Inactive' as 'Active' | 'Inactive',
            createdAt: new Date(list.createdAt)
          };
        });
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
    fetchCampaigns(); // Load campaigns for data list creation
  }, []);

  // Recalculate analytics when data lists change
  useEffect(() => {
    calculateAnalyticsData();
  }, [dataLists]);

  // Debug: Monitor modal state changes
  useEffect(() => {
    console.log('🔍 REACT STATE CHANGE - isUploadWizardOpen changed to:', isUploadWizardOpen);
  }, [isUploadWizardOpen]);

  useEffect(() => {
    console.log('🔍 REACT STATE CHANGE - uploadTargetList changed to:', uploadTargetList);
  }, [uploadTargetList]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-menu') && !target.closest('[data-dropdown-toggle]')) {
        setOpenDropdown(null);
      }
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
      const responseText = await response.text();
      console.log(`📋 Delete response body: ${responseText}`);

      if (!response.ok) {
        console.error('❌ Delete request failed:', responseText);
        throw new Error(`Failed to delete data list: ${response.status} ${response.statusText} - ${responseText}`);
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.log('📋 Response was not JSON, treating as success');
        result = { success: true };
      }
      
      console.log('📋 Delete response data:', result);

      if (result.success !== false) {
        // Remove from local state immediately
        setDataLists(prev => prev.filter(l => l.id !== list.id));
        console.log(`✅ Deleted data list: ${list.name}`);
        
        // Show success message
        const deletedCount = result.data?.deletedContacts || 'all';
        alert(`Successfully deleted "${list.name}" and ${deletedCount} contacts`);
        
        // Close dropdown
        setOpenDropdown(null);
        
        // Refresh data from backend to ensure consistency
        setTimeout(() => {
          fetchDataLists();
        }, 500);
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
    fetchCampaigns(); // Ensure campaigns are loaded
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
          campaignId: editingList.campaign !== 'Unassigned' ? editingList.campaignId : null,
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
            ? { ...l, name: editingList.name, campaign: editingList.campaign, campaignId: editingList.campaignId }
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

  // Toggle data list status
  const handleToggleStatus = async (list: DataList) => {
    const newStatus = list.status === 'Active' ? 'Inactive' : 'Active';
    
    try {
      const response = await fetch(`/api/admin/campaign-management/data-lists/${list.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: list.name,
          campaignId: list.campaign !== 'Unassigned' ? list.campaignId : null,
          status: newStatus,
          active: newStatus === 'Active'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update data list status: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        // Update local state
        setDataLists(prev => prev.map(l => 
          l.id === list.id 
            ? { ...l, status: newStatus }
            : l
        ));
        alert(`Data list status updated to ${newStatus}!`);
      } else {
        throw new Error(result.error?.message || 'Failed to update data list status');
      }
    } catch (error) {
      console.error('Error updating data list status:', error);
      alert(`Failed to update data list status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle inline campaign assignment change
  const handleCampaignChange = async (list: DataList, newCampaignId: string) => {
    try {
      const selectedCampaign = campaigns.find(c => c.campaignId === newCampaignId);
      const campaignName = selectedCampaign ? (selectedCampaign.displayName || selectedCampaign.name) : 'Unassigned';

      const response = await fetch(`/api/admin/campaign-management/data-lists/${list.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: list.name,
          campaignId: newCampaignId || null,
          blendWeight: 75,
          status: list.status,
          active: list.status === 'Active'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update campaign assignment: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        // Update local state
        setDataLists(prev => prev.map(l => 
          l.id === list.id 
            ? { ...l, campaign: campaignName, campaignId: newCampaignId }
            : l
        ));
        console.log(`✅ Campaign updated to: ${campaignName}`);
      } else {
        throw new Error(result.error?.message || 'Failed to update campaign assignment');
      }
    } catch (error) {
      console.error('Error updating campaign assignment:', error);
      alert(`Failed to update campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Upload data to list with advanced wizard
  const handleUploadData = (list: DataList) => {
    console.log(`📤 === HANDLE UPLOAD DATA FUNCTION CALLED ===`);
    console.log(`📤 List parameter:`, list);
    console.log(`📤 Current state BEFORE updates:`, { 
      isUploadWizardOpen, 
      uploadTargetList,
      uploadDataStep: uploadData.step 
    });
    
    try {
      setUploadTargetList(list);
      console.log(`📤 setUploadTargetList called with:`, list);
      
      setIsUploadWizardOpen(true);
      console.log(`📤 setIsUploadWizardOpen called with: true`);
      
      setUploadData(prev => ({ ...prev, step: 'fileUpload' }));
      console.log(`📤 setUploadData called to set step to 'fileUpload'`);
      
      setOpenDropdown(null);
      console.log(`📤 setOpenDropdown called with: null`);
      
      console.log(`📤 === ALL STATE SETTERS CALLED ===`);
    } catch (error) {
      console.error(`📤 ERROR in handleUploadData:`, error);
    }
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
    try {
      if (!uploadData.file || !uploadTargetList) {
        const errorMsg = `❌ Upload missing required data: file=${!!uploadData.file}, targetList=${!!uploadTargetList}`;
        console.error(errorMsg);
        alert(`ERROR: ${errorMsg}`);
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
      console.log('📄 File content preview:', text.substring(0, 500));
      
      const lines = text.split('\n').filter(line => line.trim());
      console.log('📋 Total lines found:', lines.length);
      console.log('📋 First few lines:', lines.slice(0, 3));
      
      if (lines.length === 0) {
        throw new Error('File appears to be empty');
      }
      
      // Skip leading lines if configured
      const dataLines = lines.slice(uploadData.leadingLinesToSkip + 1);
      console.log('📊 Data lines after skipping header:', dataLines.length);
      console.log('📊 Leading lines to skip:', uploadData.leadingLinesToSkip);
      
      if (uploadData.leadingLinesToSkip >= lines.length) {
        throw new Error(`Cannot skip ${uploadData.leadingLinesToSkip} lines from ${lines.length} total lines`);
      }
      
      const headers = lines[uploadData.leadingLinesToSkip].split(',').map(h => h.trim().replace(/"/g, ''));
      console.log('📑 Headers detected:', headers);
      
      // Parse contacts with comprehensive field mapping
      const contacts = dataLines.map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const rawContact: any = {};
        
        // Map primary columns to raw contact
        Object.entries(uploadData.primaryColumns).forEach(([field, column]) => {
          if (column) {
            const columnIndex = headers.indexOf(column);
            if (columnIndex !== -1 && values[columnIndex]) {
              rawContact[field] = values[columnIndex];
            }
          }
        });

        // Map custom columns
        uploadData.customColumns.forEach(({ name, matchColumn }) => {
          const columnIndex = headers.indexOf(matchColumn);
          if (columnIndex !== -1 && values[columnIndex]) {
            rawContact[name] = values[columnIndex];
          }
        });

        // Transform to backend-expected format
        const contact: any = {};
        
        // Map phone field (backend expects 'phone', not 'telephone1')
        contact.phone = rawContact.telephone1 || rawContact.tel1 || rawContact.phone || '';
        
        // Map name fields (backend expects 'firstName' and/or 'fullName')
        contact.firstName = rawContact.firstName || '';
        contact.lastName = rawContact.lastName || '';
        
        // If we have both first and last name, create fullName field
        if (contact.firstName && contact.lastName) {
          contact.fullName = `${contact.firstName} ${contact.lastName}`.trim();
        } else if (rawContact.fullName) {
          contact.fullName = rawContact.fullName;
        }
        
        // Map other common fields
        contact.email = rawContact.email || '';
        contact.address1 = rawContact.address1 || '';
        contact.address2 = rawContact.address2 || '';
        contact.city = rawContact.city || '';
        contact.state = rawContact.state || '';
        contact.zipCode = rawContact.zipCode || '';
        contact.country = rawContact.country || '';
        contact.dateOfBirth = rawContact.dateOfBirth || '';
        contact.gender = rawContact.gender || '';
        contact.title = rawContact.title || '';
        contact.company = rawContact.company || '';
        contact.jobTitle = rawContact.jobTitle || '';
        
        // Map additional phone numbers
        contact.telephone2 = rawContact.telephone2 || '';
        contact.telephone3 = rawContact.telephone3 || '';
        contact.fax = rawContact.fax || '';
        contact.mobile = rawContact.mobile || '';
        contact.sms = rawContact.sms || '';
        
        // Copy any custom fields
        Object.keys(rawContact).forEach(key => {
          if (!contact.hasOwnProperty(key) && rawContact[key]) {
            contact[key] = rawContact[key];
          }
        });

        return contact;
      });

      console.log('📊 Raw contacts before filtering:', {
        totalRaw: contacts.length,
        sampleRawContact: contacts[0],
        validationRules: {
          contactsNeedNumber: uploadData.contactsNeedNumber,
          contactsNeedEmail: uploadData.contactsNeedEmail
        }
      });

      const filteredContacts = contacts.filter(contact => {
        const hasPhone = !!contact.phone;
        const hasEmail = !!contact.email;
        const hasName = !!(contact.firstName || contact.fullName);
        
        console.log('🔍 Filtering contact:', {
          contact: contact,
          hasPhone,
          hasEmail,
          hasName,
          passesPhoneCheck: !uploadData.contactsNeedNumber || hasPhone,
          passesEmailCheck: !uploadData.contactsNeedEmail || hasEmail,
          passesNameCheck: hasName || hasPhone
        });

        // Apply validation rules (using backend field names)
        if (uploadData.contactsNeedNumber && !hasPhone) return false;
        if (uploadData.contactsNeedEmail && !hasEmail) return false;
        return hasName || hasPhone;
      });

      console.log('📋 Processed contacts:', { 
        totalProcessed: filteredContacts.length, 
        sampleContact: filteredContacts[0],
        targetListId: uploadTargetList.id,
        allContacts: filteredContacts.slice(0, 3) // Show first 3 contacts
      });

      const uploadPayload = {
        contacts: filteredContacts,
        mapping: uploadData.primaryColumns,
        options: {
          skipDuplicates: uploadData.duplicateCheck,
          validateEmails: uploadData.contactsNeedEmail,
          dncCheck: uploadData.dncCheck
        }
      };
      
      console.log('📤 Upload payload being sent:', {
        contactCount: uploadPayload.contacts.length,
        mapping: uploadPayload.mapping,
        options: uploadPayload.options,
        samplePayload: {
          contacts: uploadPayload.contacts.slice(0, 2),
          mapping: uploadPayload.mapping,
          options: uploadPayload.options
        }
      });

      // Temporary debug alert to verify data
      alert(`DEBUG: About to upload ${uploadPayload.contacts.length} contacts to list ID: ${uploadTargetList.id}. Check console for full details.`);

      // Validate payload before sending
      if (!uploadTargetList || !uploadTargetList.id) {
        throw new Error('No target data list specified');
      }

      if (!filteredContacts || filteredContacts.length === 0) {
        throw new Error('No valid contacts to upload');
      }

      console.log('🔐 Auth headers for upload:', getAuthHeaders());
      console.log('🎯 Upload target list:', uploadTargetList);
      console.log('📍 Upload URL:', `/api/admin/campaign-management/data-lists/${uploadTargetList.id}/upload`);

      const response = await fetch(`/api/admin/campaign-management/data-lists/${uploadTargetList.id}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(uploadPayload),
      });

      console.log('📡 Upload request sent, awaiting response...');
      console.log('📡 Request details:', {
        method: 'POST',
        url: `/api/admin/campaign-management/data-lists/${uploadTargetList.id}/upload`,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        bodySize: JSON.stringify(uploadPayload).length
      });
      console.log('📡 Upload response status:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorDetails;
        try {
          const errorData = await response.text();
          console.error('❌ Full error response:', errorData);
          errorDetails = errorData;
        } catch (parseError) {
          console.error('❌ Could not parse error response:', parseError);
          errorDetails = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(`Upload failed with ${response.status}: ${errorDetails}`);
      }

      const result = await response.json();
      console.log('📤 Upload response:', result);
      console.log('📤 Upload response details:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        const uploadStats = result.data || {};
        console.log('📤 Upload stats breakdown:', {
          totalProcessed: uploadStats.totalProcessed,
          duplicatesSkipped: uploadStats.duplicatesSkipped, 
          invalidContacts: uploadStats.invalidContacts,
          dncRejected: uploadStats.dncRejected,
          contactsSaved: uploadStats.contactsSaved,
          rawUploadStats: uploadStats
        });
        setUploadData(prev => ({
          ...prev,
          step: 'complete',
          validContacts: uploadStats.totalProcessed || contacts.length,
          duplicateContacts: uploadStats.duplicatesSkipped || 0,
          invalidContacts: uploadStats.invalidContacts || 0,
          dncContacts: uploadStats.dncRejected || 0
        }));
        
        console.log('📊 Upload completed, refreshing data lists...');
        console.log('📊 Upload stats from backend:', uploadStats);
        
        // Immediate verification: Check specific list data directly from backend
        try {
          console.log('🔍 Starting backend verification...');
          
          const verifyResponse = await fetch(`https://froniterai-production.up.railway.app/api/admin/campaign-management/data-lists`, {
            headers: {
              'Authorization': `Bearer ${document.cookie.split('auth-token=')[1]?.split(';')[0]}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (verifyResponse.ok) {
            const verifyResult = await verifyResponse.json();
            console.log('🔍 DIRECT BACKEND VERIFICATION:', verifyResult);
            
            const updatedList = verifyResult.data?.dataLists?.find((list: any) => list.id === uploadTargetList.id);
            console.log('🔍 Updated list from backend:', updatedList);
            
            if (updatedList) {
              console.log(`📊 Backend shows ${updatedList.totalContacts} contacts for list ${updatedList.name}`);
              
              if (updatedList.totalContacts === 0) {
                console.error('🚨 CRITICAL ISSUE: Backend shows 0 contacts after upload!');
                console.error('🚨 Upload may have failed silently or contacts not being counted');
              }
            }
          }
          
          // Also try to directly query contacts for this list
          try {
            const contactsResponse = await fetch(`https://froniterai-production.up.railway.app/api/admin/campaign-management/data-lists/${uploadTargetList.id}/contacts`, {
              headers: {
                'Authorization': `Bearer ${document.cookie.split('auth-token=')[1]?.split(';')[0]}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (contactsResponse.ok) {
              const contactsResult = await contactsResponse.json();
              console.log('🔍 DIRECT CONTACTS CHECK:', contactsResult);
              console.log(`📊 Direct contact query shows: ${contactsResult.data?.contacts?.length || 0} contacts`);
            } else {
              console.log('🔍 Direct contacts endpoint not available or failed');
            }
          } catch (contactsError) {
            console.log('🔍 Direct contacts check failed:', contactsError);
          }
          
        } catch (verifyError) {
          console.log('🔍 Backend verification failed:', verifyError);
        }
        
        // Add a delay to ensure backend has processed the upload, then refresh
        setTimeout(async () => {
          await fetchDataLists();
          console.log('📊 Data lists refreshed after upload');
        }, 2000); // Increased delay to 2 seconds
        
        console.log('✅ Upload completed successfully');
      } else {
        throw new Error(result.error?.message || result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ COMPREHENSIVE ERROR in handleCompleteUpload:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      console.error('❌ Upload context:', {
        hasFile: !!uploadData.file,
        fileName: uploadData.file?.name,
        hasTargetList: !!uploadTargetList,
        targetListId: uploadTargetList?.id,
        targetListName: uploadTargetList?.name
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ UPLOAD FAILED: ${errorMessage}\n\nCheck console for detailed error information.`);
    }
  } catch (topLevelError) {
    console.error('❌ TOP-LEVEL ERROR in handleCompleteUpload:', topLevelError);
    alert(`❌ CRITICAL ERROR: ${topLevelError instanceof Error ? topLevelError.message : 'Unknown critical error'}`);
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
          {['Manage Data Lists', 'Create Data Lists', 'Data Analytics'].map((tab) => (
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
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    console.log('🔄 Manual refresh triggered');
                    fetchDataLists();
                  }}
                  className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                >
                  🔄 Refresh
                </button>
                
                <button
                  onClick={async () => {
                    console.log('🔍 Direct backend check triggered');
                    try {
                      const response = await fetch('https://froniterai-production.up.railway.app/api/admin/campaign-management/data-lists', {
                        headers: {
                          'Authorization': `Bearer ${document.cookie.split('auth-token=')[1]?.split(';')[0]}`,
                          'Content-Type': 'application/json'
                        }
                      });
                      
                      if (response.ok) {
                        const result = await response.json();
                        console.log('🔍 DIRECT BACKEND RESULT:', result);
                        alert(`Backend check: Found ${result.data?.dataLists?.length || 0} lists. Check console for details.`);
                      }
                    } catch (error) {
                      console.error('🔍 Direct backend check failed:', error);
                      alert('Backend check failed - see console');
                    }
                  }}
                  className="px-3 py-1 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100"
                >
                  🔍 Backend Check
                </button>
                
                <button
                  onClick={() => forceUpdateContactCounts()}
                  className="px-3 py-1 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100"
                >
                  🔧 Fix Counts
                </button>
                
                <button className="bg-slate-600 text-white px-4 py-2 rounded-md hover:bg-slate-700 transition-colors flex items-center">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create New List
                </button>
              </div>
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
                            <select
                              value={list.campaignId || ''}
                              onChange={(e) => handleCampaignChange(list, e.target.value)}
                              className="text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:border-slate-500 focus:ring-slate-500 bg-white min-w-[140px]"
                            >
                              <option value="">Unassigned</option>
                              {campaigns.map((campaign) => (
                                <option key={campaign.campaignId} value={campaign.campaignId}>
                                  {campaign.displayName || campaign.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{list.total}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{list.available}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleStatus(list)}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors hover:opacity-80 cursor-pointer ${
                                list.status === 'Active' 
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              {list.status}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              {/* Direct Action Buttons */}
                              <button
                                onClick={() => {
                                  console.log('🔍 Direct Upload Data button clicked for list:', list);
                                  handleUploadData(list);
                                }}
                                className="inline-flex items-center px-3 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100"
                              >
                                <CloudArrowUpIcon className="h-3 w-3 mr-1" />
                                Upload
                              </button>
                              
                              {/* Dropdown Menu */}
                              <div className="relative">
                                <button
                                  data-dropdown-toggle
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('🔍 Dropdown button clicked for list:', list.id);
                                    setOpenDropdown(openDropdown === list.id ? null : list.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                                >
                                  <EllipsisVerticalIcon className="h-4 w-4" />
                                </button>
                                
                                {openDropdown === list.id && (
                                  <div className="dropdown-menu absolute right-0 top-6 mt-1 w-44 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                                    <div className="py-1">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          console.log('🔍 Edit List dropdown clicked for:', list);
                                          setOpenDropdown(null);
                                          handleEditList(list);
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      >
                                        <PencilIcon className="h-4 w-4 mr-3" />
                                        Edit List
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          console.log('🔍 Clone List dropdown clicked for:', list);
                                          setOpenDropdown(null);
                                          handleCloneList(list);
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      >
                                        <DocumentDuplicateIcon className="h-4 w-4 mr-3" />
                                        Clone List
                                      </button>
                                      <hr className="my-1" />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          console.log('🗑️ Delete List dropdown clicked for:', list);
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
          <div className="max-w-2xl mx-auto">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Create New Data List</h3>
              
              <form onSubmit={handleCreateDataList} className="space-y-6">
                <div>
                  <label htmlFor="listName" className="block text-sm font-medium text-gray-700">
                    List Name *
                  </label>
                  <input
                    type="text"
                    id="listName"
                    value={newListData.name}
                    onChange={(e) => setNewListData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500"
                    placeholder="Enter data list name"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="listDescription" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="listDescription"
                    value={newListData.description}
                    onChange={(e) => setNewListData(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500"
                    rows={3}
                    placeholder="Enter description for this data list"
                  />
                </div>
                
                <div>
                  <label htmlFor="assignCampaign" className="block text-sm font-medium text-gray-700">
                    Assign to Campaign
                  </label>
                  <select
                    id="assignCampaign"
                    value={newListData.campaignId}
                    onChange={(e) => setNewListData(prev => ({ ...prev, campaignId: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500"
                  >
                    <option value="">No Campaign (Unassigned)</option>
                    {campaigns.map(campaign => (
                      <option key={campaign.campaignId} value={campaign.campaignId}>
                        {campaign.displayName || campaign.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="blendWeight" className="block text-sm font-medium text-gray-700">
                    Blend Weight (%)
                  </label>
                  <input
                    type="number"
                    id="blendWeight"
                    min="1"
                    max="100"
                    value={newListData.blendWeight}
                    onChange={(e) => setNewListData(prev => ({ ...prev, blendWeight: parseInt(e.target.value) || 50 }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500"
                    placeholder="50"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Weight for dialing priority when multiple lists are assigned to a campaign
                  </p>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoUpload"
                    checked={newListData.autoUpload}
                    onChange={(e) => setNewListData(prev => ({ ...prev, autoUpload: e.target.checked }))}
                    className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoUpload" className="ml-2 block text-sm text-gray-700">
                    Upload data immediately after creation
                  </label>
                </div>
                
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setNewListData({
                        name: '',
                        description: '',
                        campaignId: '',
                        blendWeight: 50,
                        autoUpload: false
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={!newListData.name || createListLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-slate-600 border border-transparent rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createListLoading ? 'Creating...' : 'Create Data List'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {selectedSubTab === 'Data Analytics' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3h2v1a1 1 0 102 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 2a1 1 0 000 2h2a1 1 0 100-2H7z" clipRule="evenodd"></path>
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Data Lists</dt>
                        <dd className="text-lg font-medium text-gray-900">{analyticsData.totalLists}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Contacts</dt>
                        <dd className="text-lg font-medium text-gray-900">{analyticsData.totalContacts.toLocaleString()}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path>
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Lists</dt>
                        <dd className="text-lg font-medium text-gray-900">{analyticsData.activeLists}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Available Contacts</dt>
                        <dd className="text-lg font-medium text-gray-900">{analyticsData.availableContacts.toLocaleString()}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Lists Table with Analytics */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Data List Performance</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        List Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Campaign
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Contacts
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dial Attempts
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Success Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Activity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dataLists.map((list) => {
                      const successRate = list.total > 0 ? Math.round((list.dialAttempts / list.total) * 100) : 0;
                      return (
                        <tr key={list.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {list.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              list.campaign === 'Unassigned' 
                                ? 'bg-gray-100 text-gray-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {list.campaign}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {list.total.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {list.dialAttempts.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{ width: `${Math.min(successRate, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm">{successRate}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {list.lastDialed}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              list.status === 'Active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {list.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
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
                <select
                  value={editingList.campaignId || ''}
                  onChange={(e) => {
                    const selectedCampaign = campaigns.find(c => c.campaignId === e.target.value);
                    setEditingList({ 
                      ...editingList, 
                      campaign: selectedCampaign ? (selectedCampaign.displayName || selectedCampaign.name) : 'Unassigned',
                      campaignId: selectedCampaign?.campaignId || ''
                    });
                  }}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                >
                  <option value="">Unassigned</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.campaignId} value={campaign.campaignId}>
                      {campaign.displayName || campaign.name}
                    </option>
                  ))}
                </select>
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
        console.log('🔍 === MODAL RENDER CHECK ===');
        console.log('🔍 isUploadWizardOpen:', isUploadWizardOpen, typeof isUploadWizardOpen);
        console.log('🔍 uploadTargetList:', uploadTargetList);
        console.log('🔍 uploadTargetList truthy?', !!uploadTargetList);
        const shouldRenderModal = isUploadWizardOpen && uploadTargetList;
        console.log('🔍 Final shouldRenderModal result:', shouldRenderModal);
        console.log('🔍 === END MODAL RENDER CHECK ===');
        return shouldRenderModal;
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
