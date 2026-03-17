import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon, 
  DocumentDuplicateIcon,
  CloudArrowUpIcon,
  EllipsisVerticalIcon,
  QueueListIcon,
  UserGroupIcon
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
    residentialStatus: string;
    ageRange: string;
    deliveryDate: string;
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
  totalRecords: number;
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
      residentialStatus: '',
      ageRange: '',
      deliveryDate: '',
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
    totalRecords: 0,
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

  // New state for contact and queue views
  const [isContactsViewOpen, setIsContactsViewOpen] = useState(false);
  const [isQueueViewOpen, setIsQueueViewOpen] = useState(false);
  const [viewingList, setViewingList] = useState<DataList | null>(null);
  const [contactsData, setContactsData] = useState<any[]>([]);
  const [queueData, setQueueData] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);
  
  // Enhanced queue management state
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [queueStats, setQueueStats] = useState<any>(null);
  const [availableCampaigns, setAvailableCampaigns] = useState<any[]>([]);
  
  // Contact editing state
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  
  // Bulk operations progress tracking
  const [bulkProgress, setBulkProgress] = useState<{
    isRunning: boolean;
    operation: string;
    progress: number;
    total: number;
    current: number;
  }>({
    isRunning: false,
    operation: '',
    progress: 0,
    total: 0,
    current: 0
  });

  // Advanced AI capabilities - always enabled for professional dialler functionality
  const [leadScores, setLeadScores] = useState<any[]>([]);
  const [predictiveMetrics, setPredictiveMetrics] = useState<any>(null);
  const [sentimentAnalysis, setSentimentAnalysis] = useState<any>(null);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  
  // Progress tracking for AI operations
  const [aiProgress, setAiProgress] = useState<{
    isCalculating: boolean;
    operation: string;
    progress: number;
  }>({
    isCalculating: false,
    operation: '',
    progress: 0
  });

  // Analytics data state
  const [analyticsData, setAnalyticsData] = useState({
    totalLists: 0,
    totalContacts: 0,
    activeLists: 0,
    availableContacts: 0
  });

  // Helper function to determine available custom fields from contacts data
  const getAvailableCustomFields = (contacts: any[]) => {
    if (!contacts || contacts.length === 0) {
      console.log('🔍 getAvailableCustomFields: No contacts data');
      return [];
    }
    
    const customFields: { key: string; label: string }[] = [];
    console.log('🔍 getAvailableCustomFields: Analyzing ALL contacts for custom fields...');
    
    // Check all contacts, not just the first one, to ensure we don't miss fields
    const fieldsToCheck = [
      { key: 'residentialStatus', label: 'Residential Status' },
      { key: 'title', label: 'Title' },
      { key: 'company', label: 'Company' },
      { key: 'jobTitle', label: 'Job Title' },
      { key: 'industry', label: 'Industry' },
      { key: 'department', label: 'Department' },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'town', label: 'Town' },
      { key: 'county', label: 'County' },
      { key: 'state', label: 'State' },
      { key: 'zipCode', label: 'Zip Code' },
      { key: 'postcode', label: 'Postcode' },
      { key: 'country', label: 'Country' },
      { key: 'address2', label: 'Address 2' },
      { key: 'address3', label: 'Address 3' },
      { key: 'contactNumber', label: 'Contact Number' },
      { key: 'website', label: 'Website' },
      { key: 'linkedIn', label: 'LinkedIn' },
      { key: 'ageRange', label: 'Age Range' },
      { key: 'deliveryDate', label: 'Delivery Date' },
      { key: 'leadSource', label: 'Lead Source' },
      { key: 'leadScore', label: 'Lead Score' },
      { key: 'tags', label: 'Tags' },
      { key: 'notes', label: 'Notes' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'workPhone', label: 'Work Phone' },
      { key: 'homePhone', label: 'Home Phone' },
      { key: 'fullName', label: 'Full Name' },
      { key: 'custom1', label: 'Custom Field 1' },
      { key: 'custom2', label: 'Custom Field 2' },
      { key: 'custom3', label: 'Custom Field 3' },
      { key: 'custom4', label: 'Custom Field 4' },
      { key: 'custom5', label: 'Custom Field 5' }
    ];
    
    // Check each field across all contacts
    fieldsToCheck.forEach(fieldDef => {
      const hasData = contacts.some(contact => {
        const value = contact[fieldDef.key];
        return value && value !== null && value !== undefined && value !== '' && value !== 'null' && value.toString().trim() !== '';
      });
      
      // Also check if field exists even with 'null' values - indicates it was mapped from CSV
      const existsInData = contacts.some(contact => contact.hasOwnProperty(fieldDef.key));
      
      if (hasData || existsInData) {
        // Apply intelligent naming for custom fields based on content
        let label = fieldDef.label;
        if (fieldDef.key.startsWith('custom')) {
          const sampleValue = contacts.find(c => c[fieldDef.key] && c[fieldDef.key] !== 'null')?.[fieldDef.key]?.toLowerCase() || '';
          if (sampleValue.includes('homeowner') || sampleValue.includes('residential')) {
            label = 'Homeowner Status';
          } else if (sampleValue.includes('income')) {
            label = 'Income Range';
          } else if (sampleValue.includes('education')) {
            label = 'Education Level';
          } else if (sampleValue.includes('marital')) {
            label = 'Marital Status';
          } else if (sampleValue.includes('employment')) {
            label = 'Employment Status';
          }
        }
        
        customFields.push({ key: fieldDef.key, label });
        const sampleValue = contacts.find(c => c[fieldDef.key] && c[fieldDef.key] !== 'null')?.[fieldDef.key] || 
                          contacts.find(c => c[fieldDef.key])?.[fieldDef.key];
        console.log(`✅ Found ${fieldDef.key}: Sample value:`, sampleValue, '→ Label:', label);
      }
    });
    
    console.log(`🔍 getAvailableCustomFields: Found ${customFields.length} custom fields:`, customFields.map(f => `${f.key} (${f.label})`));
    return customFields;
  };

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
      // Simply refresh the data lists which will trigger count recalculation
      setLoading(true);
      await fetchDataLists();
      console.log('🔧 Contact counts refreshed successfully');
    } catch (error) {
      console.error('🔧 Force update failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data lists from API
  // Helper function to get authentication headers (cookies handled server-side)
  const getAuthHeaders = (): Record<string, string> => {
    const token = document.cookie.split('auth-token=')[1]?.split(';')[0];
    console.log('🍪 Cookie check:', document.cookie);
    console.log('🔑 Extracted token:', token ? 'YES (length: ' + token.length + ')' : 'NO');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Load available campaigns for assignment
  const fetchCampaigns = async () => {
    try {
      // Use the correct campaign management API endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admin/campaign-management/campaigns`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('🎯 Fetched campaigns:', result); // Debug log
        
        if (result.success && result.data && Array.isArray(result.data)) {
          // Transform and filter the campaign data to exclude deleted campaigns
          const transformedCampaigns = result.data
            .filter((campaign: any) => {
              // Filter out deleted campaigns
              const name = campaign.displayName || campaign.name || '';
              return !name.toLowerCase().includes('[deleted]') && 
                     !name.toLowerCase().includes('deleted') &&
                     campaign.status !== 'ARCHIVED' &&
                     campaign.status !== 'DELETED';
            })
            .map((campaign: any) => ({
              campaignId: campaign.campaignId,
              name: campaign.name,
              displayName: campaign.displayName || campaign.name,
              status: campaign.status
            }));
          setCampaigns(transformedCampaigns);
          console.log('✅ Campaigns loaded (filtered):', transformedCampaigns);
        } else {
          console.warn('No campaigns found in response:', result);
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch campaigns, status:', response.status, errorText);
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
            campaign: list.campaignId || 'Unassigned', // Will be updated after campaigns are loaded
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

  // Periodic refresh of campaigns to catch new additions/deletions
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCampaigns();
      console.log('🔄 Auto-refreshing campaigns...');
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Refresh campaigns when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchCampaigns();
      console.log('🔄 Refreshing campaigns on window focus...');
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Update campaign names in data lists when campaigns are loaded
  useEffect(() => {
    if (campaigns.length > 0 && dataLists.length > 0) {
      let hasUpdates = false;
      const updatedDataLists = dataLists.map(list => {
        if (list.campaignId && (list.campaign === list.campaignId || list.campaign === 'Unassigned')) {
          // If campaign field still shows the ID or is unassigned, replace with actual name
          const campaign = campaigns.find(c => c.campaignId === list.campaignId);
          if (campaign) {
            hasUpdates = true;
            return {
              ...list,
              campaign: campaign.displayName || campaign.name,
              description: `Assigned to Campaign: ${campaign.displayName || campaign.name}`
            };
          }
        }
        return list;
      });
      
      if (hasUpdates) {
        setDataLists(updatedDataLists);
        console.log('✅ Updated data lists with campaign names');
      }
    }
  }, [campaigns]);

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

  // View contacts in data list
  const handleViewContacts = async (list: DataList) => {
    console.log(`👥 Opening contacts view for data list: ${list.name}`);
    console.log(`🔍 List details:`, { id: list.id, listId: list.listId, name: list.name });
    setViewingList(list);
    setContactsLoading(true);
    setIsContactsViewOpen(true);
    setOpenDropdown(null);

    try {
      const url = `/api/admin/campaign-management/data-lists/${list.id}/contacts?page=1&limit=100`;
      console.log(`📡 Making request to: ${url}`);
      console.log(`🔐 Auth headers:`, getAuthHeaders());

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      console.log(`📊 Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Response error text:`, errorText);
        throw new Error(`Failed to fetch contacts: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Response data:`, result);
      
      if (result.success) {
        setContactsData(result.data.contacts);
        console.log(`✅ Loaded ${result.data.contacts.length} contacts for "${list.name}"`);
        
        // Debug: Log the first contact structure to check custom fields
        if (result.data.contacts.length > 0) {
          const firstContact = result.data.contacts[0];
          console.log('🔍 CONTACT STRUCTURE DEBUG - First contact fields:');
          console.log('📋 Basic fields:', {
            id: firstContact.id,
            firstName: firstContact.firstName,
            lastName: firstContact.lastName,
            phone: firstContact.phone,
            email: firstContact.email
          });
          console.log('🏠 Address fields:', {
            address: firstContact.address,
            city: firstContact.city,
            state: firstContact.state,
            zipCode: firstContact.zipCode,
            country: firstContact.country
          });
          console.log('🔧 Custom fields:', {
            residentialStatus: firstContact.residentialStatus,
            custom1: firstContact.custom1,
            custom2: firstContact.custom2,
            custom3: firstContact.custom3,
            custom4: firstContact.custom4,
            custom5: firstContact.custom5
          });
          console.log('💼 Professional fields:', {
            title: firstContact.title,
            company: firstContact.company,
            jobTitle: firstContact.jobTitle,
            industry: firstContact.industry
          });
          console.log('🎯 Other fields:', {
            ageRange: firstContact.ageRange,
            leadSource: firstContact.leadSource,
            tags: firstContact.tags
          });
          console.log('📄 Complete contact object:', firstContact);
        }
        
        // Automatically calculate lead scores for AI analysis
        if (result.data.contacts.length > 0) {
          console.log('🤖 Automatically calculating lead scores for contacts...');
          handleCalculateLeadScores(list);
        }
      } else {
        throw new Error(result.error?.message || 'Failed to load contacts');
      }
    } catch (error) {
      console.error('❌ Error fetching contacts:', error);
      alert(`Failed to load contacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Close the modal if there's an error
      setIsContactsViewOpen(false);
      setViewingList(null);
    } finally {
      setContactsLoading(false);
    }
  };

  // View outbound queue for data list
  const handleViewQueue = async (list: DataList) => {
    console.log(`📞 Opening queue view for data list: ${list.name}`);
    setViewingList(list);
    setQueueLoading(true);
    setIsQueueViewOpen(true);
    setOpenDropdown(null);
    setSelectedCampaign(''); // Reset campaign filter

    try {
      const campaignParam = selectedCampaign ? `&campaignId=${selectedCampaign}` : '';
      const response = await fetch(`/api/admin/campaign-management/data-lists/${list.id}/queue?page=1&limit=100${campaignParam}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch queue: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setQueueData(result.data.queue);
        setQueueStats(result.data.stats);
        setAvailableCampaigns(result.data.stats.campaigns || []);
        console.log(`✅ Loaded ${result.data.queue.length} queue entries`);
        console.log(`📊 Queue stats:`, result.data.stats);
      } else {
        throw new Error(result.error?.message || 'Failed to load queue');
      }
    } catch (error) {
      console.error('❌ Error fetching queue:', error);
      alert(`Failed to load queue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setQueueLoading(false);
    }
  };

  // Filter queue by campaign
  const handleCampaignFilter = async (campaignId: string) => {
    if (!viewingList) return;

    setSelectedCampaign(campaignId);
    setQueueLoading(true);

    try {
      const campaignParam = campaignId ? `&campaignId=${campaignId}` : '';
      const response = await fetch(`/api/admin/campaign-management/data-lists/${viewingList.id}/queue?page=1&limit=100${campaignParam}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch filtered queue: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setQueueData(result.data.queue);
        setQueueStats(result.data.stats);
        console.log(`✅ Filtered queue by campaign: ${campaignId || 'All'}`);
      } else {
        throw new Error(result.error?.message || 'Failed to filter queue');
      }
    } catch (error) {
      console.error('❌ Error filtering queue:', error);
      alert(`Failed to filter queue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setQueueLoading(false);
    }
  };

  // Edit contact functionality
  const handleEditContact = (contact: any) => {
    setEditingContact(contact);
    setIsEditingContact(true);
  };

  const handleSaveContact = async (updatedContact: any) => {
    try {
      const response = await fetch(`/api/admin/campaign-management/contacts/${updatedContact.contactId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedContact)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to update contact: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        // Update the contact in both contacts and queue data
        setContactsData(prev => prev.map(contact => 
          contact.contactId === updatedContact.contactId ? result.data.contact : contact
        ));
        setQueueData(prev => prev.map(entry => 
          entry.contact?.contactId === updatedContact.contactId 
            ? { ...entry, contact: result.data.contact }
            : entry
        ));
        
        alert(result.data.message || 'Contact updated successfully');
        setIsEditingContact(false);
        setEditingContact(null);
      } else {
        throw new Error(result.error?.message || 'Failed to update contact');
      }
    } catch (error) {
      console.error('❌ Error updating contact:', error);
      alert(`Failed to update contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Advanced AI-Powered Functions

  // Calculate lead scores for all contacts in a data list
  const handleCalculateLeadScores = async (list: DataList) => {
    setAiProgress({
      isCalculating: true,
      operation: `Calculating AI lead scores for "${list.name}"`,
      progress: 0
    });

    try {
      console.log(`🤖 Calculating lead scores for data list: ${list.name}`);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setAiProgress(prev => {
          if (!prev.isCalculating) return prev;
          const newProgress = Math.min(prev.progress + 15, 90);
          return { ...prev, progress: newProgress };
        });
      }, 200);

      // Get contacts for this data list first
      const contactsResponse = await fetch(`/api/admin/campaign-management/data-lists/${list.id}/contacts?page=1&limit=100`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!contactsResponse.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const contactsResult = await contactsResponse.json();
      if (!contactsResult.success) {
        throw new Error('Failed to get contact list');
      }

      const contacts = contactsResult.data.contacts;
      const contactIds = contacts.map((c: any) => c.contactId);

      // Batch calculate lead scores
      const scoresResponse = await fetch('/api/admin/lead-scoring/batch-calculate', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactIds,
          campaignId: list.campaignId
        })
      });

      clearInterval(progressInterval);

      if (!scoresResponse.ok) {
        throw new Error('Failed to calculate lead scores');
      }

      const scoresResult = await scoresResponse.json();
      if (scoresResult.success) {
        setLeadScores(scoresResult.data.scoredContacts);
        setAiProgress({ ...aiProgress, progress: 100 });
        
        setTimeout(() => {
          setAiProgress({ isCalculating: false, operation: '', progress: 0 });
          alert(`✅ Successfully calculated lead scores for ${scoresResult.data.scoredContacts.length} contacts`);
        }, 500);
      } else {
        throw new Error(scoresResult.error?.message || 'Failed to calculate scores');
      }
    } catch (error) {
      setAiProgress({ isCalculating: false, operation: '', progress: 0 });
      console.error('❌ Error calculating lead scores:', error);
      alert(`Failed to calculate lead scores: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Get predictive metrics for campaign queue optimization
  const handleGetPredictiveMetrics = async (campaignId: string) => {
    try {
      console.log(`📊 Fetching predictive metrics for campaign: ${campaignId}`);

      const response = await fetch(`/api/auto-dial/predictive-stats/${campaignId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch predictive metrics');
      }

      const result = await response.json();
      if (result.success) {
        setPredictiveMetrics(result.data.stats);
        console.log(`✅ Loaded predictive metrics:`, result.data.stats);
      } else {
        throw new Error(result.error?.message || 'Failed to load metrics');
      }
    } catch (error) {
      console.error('❌ Error fetching predictive metrics:', error);
      alert(`Failed to load predictive metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Get AI-powered next best actions for contacts
  const handleGetNextBestActions = async (list: DataList) => {
    try {
      console.log(`🎯 Getting next best actions for: ${list.name}`);

      const response = await fetch(`/api/admin/lead-scoring/next-best-contacts?campaignId=${list.campaignId}&limit=20`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to get next best actions');
      }

      const result = await response.json();
      if (result.success) {
        setAiRecommendations(result.data.prioritizedContacts);
        console.log(`✅ Loaded AI recommendations:`, result.data.prioritizedContacts);
      } else {
        throw new Error(result.error?.message || 'Failed to load recommendations');
      }
    } catch (error) {
      console.error('❌ Error getting next best actions:', error);
      alert(`Failed to get recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Initialize AI capabilities on component mount
  useEffect(() => {
    console.log('🤖 AI capabilities initialized - always active for professional dialler');
  }, []);

  // Delete all contacts in data list with progress tracking
  const handleDeleteContacts = async (list: DataList) => {
    if (!confirm(`Are you sure you want to delete ALL contacts in "${list.name}"?\n\nThis will remove ${list.total} contacts but keep the data list. This action cannot be undone.`)) {
      return;
    }

    // Start progress tracking
    setBulkProgress({
      isRunning: true,
      operation: `Deleting contacts from "${list.name}"`,
      progress: 0,
      total: list.total,
      current: 0
    });

    try {
      console.log(`🗑️ Attempting to delete all contacts in: ${list.name}`);
      setOpenDropdown(null);

      // Simulate progress updates for user feedback
      const progressInterval = setInterval(() => {
        setBulkProgress(prev => {
          if (!prev.isRunning) return prev;
          const newProgress = Math.min(prev.progress + 10, 90);
          return { ...prev, progress: newProgress };
        });
      }, 100);

      const response = await fetch(`/api/admin/campaign-management/data-lists/${list.id}/contacts`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Delete response error:', response.status, errorText);
        throw new Error(`Failed to delete contacts: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Delete response:', result);

      if (result.success) {
        // Complete progress
        setBulkProgress(prev => ({ ...prev, progress: 100, current: prev.total }));
        
        setTimeout(() => {
          alert(`✅ Successfully deleted ${result.data.deletedCount} contacts from "${list.name}"`);
          setBulkProgress({ isRunning: false, operation: '', progress: 0, total: 0, current: 0 });
          
          // Update local state - reset contact count to 0
          setDataLists(prev => prev.map(l => 
            l.id === list.id 
              ? { ...l, total: 0, available: 0 }
              : l
          ));
          
          // Refresh data from backend
          fetchDataLists();
        }, 500);
      } else {
        throw new Error(result.error?.message || 'Failed to delete contacts');
      }
    } catch (error) {
      setBulkProgress({ isRunning: false, operation: '', progress: 0, total: 0, current: 0 });
      console.error('❌ Error deleting contacts:', error);
      alert(`Failed to delete contacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        
        // Calculate total records (excluding header row and empty lines)
        const dataLines = lines.slice(1).filter(line => line.trim().length > 0);
        const totalRecords = dataLines.length;
        
        setUploadData(prev => ({
          ...prev,
          detectedColumns: headers,
          totalRecords: totalRecords,
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

        // ENHANCED: Auto-detect common CSV column patterns for specific CSV files
        headers.forEach((header, index) => {
          if (values[index]) {
            const lowerHeader = header.toLowerCase().replace(/[_\s-]/g, '');
            
            // Map specific column patterns from your CSV
            if (lowerHeader === 'deliverydate') rawContact.deliveryDate = values[index];
            if (lowerHeader === 'title') rawContact.title = values[index];
            if (lowerHeader === 'firstname') rawContact.firstName = values[index];
            if (lowerHeader === 'lastname') rawContact.lastName = values[index];
            if (lowerHeader === 'address1') rawContact.address1 = values[index];
            if (lowerHeader === 'address2') rawContact.address2 = values[index];
            if (lowerHeader === 'adress3' || lowerHeader === 'address3') rawContact.address3 = values[index]; // Handle typo
            if (lowerHeader === 'town' || lowerHeader === 'city') rawContact.townCity = values[index];
            if (lowerHeader === 'county' || lowerHeader === 'state') rawContact.county = values[index];
            if (lowerHeader === 'postcode' || lowerHeader === 'zipcode' || lowerHeader === 'postalcode') rawContact.postalCode = values[index];
            if (lowerHeader === 'contactnumber' || lowerHeader === 'phone' || lowerHeader === 'telephone') rawContact.telephone1 = values[index];
            if (lowerHeader === 'agerange') rawContact.ageRange = values[index];
            if (lowerHeader === 'residentialstatus' || lowerHeader === 'residential') rawContact.residentialStatus = values[index];
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
        
        // Map other common fields with correct field name mappings
        contact.email = rawContact.email || '';
        contact.address = rawContact.address1 || rawContact.address || ''; 
        contact.address2 = rawContact.address2 || '';
        contact.address3 = rawContact.address3 || '';
        
        // Fix field mapping - use correct primaryColumn names
        contact.city = rawContact.townCity || rawContact.city || '';           // ✅ FIX: Use townCity from primaryColumns
        contact.state = rawContact.county || rawContact.state || '';           // ✅ FIX: Use county from primaryColumns
        contact.zipCode = rawContact.postalCode || rawContact.zipCode || '';   // ✅ FIX: Use postalCode from primaryColumns
        contact.country = rawContact.country || '';
        
        // Map professional fields
        contact.title = rawContact.title || '';
        contact.company = rawContact.companyName || rawContact.company || '';  // ✅ FIX: Use companyName from primaryColumns
        contact.jobTitle = rawContact.jobTitle || '';
        contact.department = rawContact.department || '';
        contact.industry = rawContact.industry || '';
        contact.website = rawContact.website || '';
        
        // Map contact methods
        contact.mobile = rawContact.mobile || rawContact.telephone2 || '';
        contact.workPhone = rawContact.workPhone || rawContact.telephone3 || '';
        contact.homePhone = rawContact.homePhone || rawContact.telephone4 || '';
        
        // Map demographic and custom data - ADD MISSING fields mapping!
        contact.residentialStatus = rawContact.residentialStatus || '';         // ✅ Map residentialStatus
        contact.ageRange = rawContact.ageRange || '';                           // ✅ ADD: Map ageRange
        contact.deliveryDate = rawContact.deliveryDate || '';                   // ✅ ADD: Map deliveryDate
        contact.leadSource = rawContact.leadSource || '';
        
        // Map custom fields (custom1-5) from custom columns
        contact.custom1 = rawContact.custom1 || '';
        contact.custom2 = rawContact.custom2 || '';
        contact.custom3 = rawContact.custom3 || '';
        contact.custom4 = rawContact.custom4 || '';
        contact.custom5 = rawContact.custom5 || '';
        
        // Copy any remaining custom fields that don't conflict
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

      // Get headers with debugging
      const authHeaders = getAuthHeaders();
      const uploadHeaders = {
        ...authHeaders,
        'Content-Type': 'application/json'
      };
      console.log('📤 Final upload headers:', uploadHeaders);

      const response = await fetch(`/api/admin/campaign-management/data-lists/${uploadTargetList.id}/upload`, {
        method: 'POST',
        headers: uploadHeaders,
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
                    fetchCampaigns(); // Also refresh campaigns
                  }}
                  className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                >
                  🔄 Refresh
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
                              <div className="text-sm font-medium text-gray-900">{list.name}</div>
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
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          console.log('👥 View Contacts dropdown clicked for:', list);
                                          setOpenDropdown(null);
                                          handleViewContacts(list);
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      >
                                        <UserGroupIcon className="h-4 w-4 mr-3" />
                                        View Contacts
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          console.log('📞 View Queue dropdown clicked for:', list);
                                          setOpenDropdown(null);
                                          handleViewQueue(list);
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      >
                                        <QueueListIcon className="h-4 w-4 mr-3" />
                                        View Queue
                                      </button>
                                      
                                      {/* AI Actions - Always Available */}
                                      <hr className="my-1" />
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              console.log('🤖 Calculate Lead Scores for:', list);
                                              setOpenDropdown(null);
                                              handleCalculateLeadScores(list);
                                            }}
                                            className="flex items-center w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                                          >
                                            🎯
                                            <span className="ml-3">Calculate Lead Scores</span>
                                          </button>
                                          
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              console.log('🎬 Get Next Best Actions for:', list);
                                              setOpenDropdown(null);
                                              handleGetNextBestActions(list);
                                            }}
                                            className="flex items-center w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                                          >
                                            🎬
                                            <span className="ml-3">Get Next Best Actions</span>
                                          </button>
                                          
                                          {list.campaignId && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                console.log('📊 Get Predictive Metrics for:', list);
                                                setOpenDropdown(null);
                                                if (list.campaignId) {
                                                  handleGetPredictiveMetrics(list.campaignId);
                                                }
                                              }}
                                              className="flex items-center w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                                            >
                                              📊
                                              <span className="ml-3">Predictive Analytics</span>
                                            </button>
                                          )}
                                      
                                      <hr className="my-1" />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          console.log('🗑️ Delete Contacts dropdown clicked for:', list);
                                          setOpenDropdown(null);
                                          handleDeleteContacts(list);
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                      >
                                        <TrashIcon className="h-4 w-4 mr-3" />
                                        Delete All Contacts
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
                        { field: 'residentialStatus', label: 'Residential Status', required: false },
                        { field: 'ageRange', label: 'Age Range', required: false },
                        { field: 'deliveryDate', label: 'Delivery Date', required: false },
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
                        <div>📊 <strong>Estimated Records:</strong> {Math.max(0, uploadData.totalRecords - uploadData.leadingLinesToSkip).toLocaleString()}</div>
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

      {/* Contacts View Modal */}
      {isContactsViewOpen && viewingList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[98vw] h-[95vh] overflow-hidden flex flex-col">
            <div className="bg-gray-50 px-6 py-4 border-b flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-900">
                Contacts in "{viewingList.name}"
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                View and manage all contacts in this data list - Scroll horizontally to see all fields
              </p>
            </div>
            
            <div className="flex-1 overflow-auto min-h-0">
              {contactsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading contacts...</span>
                </div>
              ) : contactsData.length === 0 ? (
                <div className="text-center py-8">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts found</h3>
                  <p className="mt-1 text-sm text-gray-500">This data list doesn't contain any contacts yet.</p>
                </div>
              ) : (
                <div className="w-full">
                  <div className="overflow-x-auto overflow-y-auto h-full">
                    <table className="w-max min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                          Phone
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                          Email
                        </th>
                        {/* Dynamic Custom Fields Headers */}
                        {getAvailableCustomFields(contactsData).map(field => (
                          <th key={field.key} scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider bg-purple-50 border-l border-purple-200 whitespace-nowrap min-w-[120px]">
                            {field.label}
                          </th>
                        ))}
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[100px]">
                          Last Call
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[100px]">
                          Created
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[80px]">
                          Actions
                        </th>
                        {/* AI Analysis Columns - Always Visible */}
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[80px]">
                          AI Score
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[80px]">
                          Priority
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                          Next Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {contactsData.map((contact) => (
                        <tr key={contact.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {contact.firstName} {contact.lastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {contact.phone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {contact.email || '-'}
                          </td>
                          {/* Dynamic Custom Fields Data */}
                          {getAvailableCustomFields(contactsData).map(field => (
                            <td key={field.key} className="px-6 py-4 whitespace-nowrap text-sm text-purple-700 bg-purple-25 border-l border-purple-100">
                              <div className="flex items-center">
                                <span className="font-medium">
                                  {contact[field.key] && contact[field.key] !== 'null' ? contact[field.key] : '-'}
                                </span>
                                {contact[field.key] && contact[field.key] !== 'null' && (
                                  <div className="ml-2 w-2 h-2 bg-purple-400 rounded-full opacity-60"></div>
                                )}
                              </div>
                            </td>
                          ))}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {contact.lastCall ? (
                              <div>
                                <div>{new Date(contact.lastCall.startTime).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-400">{contact.lastCall.outcome || 'No outcome'}</div>
                              </div>
                            ) : (
                              'Never called'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(contact.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => handleEditContact(contact)}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              Edit
                            </button>
                          </td>
                          {/* AI Analysis Columns - Always Visible */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {(() => {
                                  const score = leadScores.find(ls => ls.contactId === contact.contactId);
                                  if (score) {
                                    const scoreValue = Math.round(score.score.score * 100);
                                    const colorClass = scoreValue >= 80 ? 'text-green-600 bg-green-100' :
                                                      scoreValue >= 60 ? 'text-yellow-600 bg-yellow-100' :
                                                      scoreValue >= 40 ? 'text-orange-600 bg-orange-100' :
                                                      'text-red-600 bg-red-100';
                                    return (
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
                                        {scoreValue}%
                                      </span>
                                    );
                                  }
                                  return <span className="text-gray-400">No score</span>;
                                })()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {(() => {
                                  const score = leadScores.find(ls => ls.contactId === contact.contactId);
                                  if (score) {
                                    const priority = score.score.priority;
                                    const colorClass = priority === 'urgent' ? 'text-red-600 bg-red-100' :
                                                      priority === 'high' ? 'text-orange-600 bg-orange-100' :
                                                      priority === 'medium' ? 'text-yellow-600 bg-yellow-100' :
                                                      'text-gray-600 bg-gray-100';
                                    return (
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${colorClass}`}>
                                        {priority}
                                      </span>
                                    );
                                  }
                                  return <span className="text-gray-400">-</span>;
                                })()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {(() => {
                                  const score = leadScores.find(ls => ls.contactId === contact.contactId);
                                  return score ? (
                                    <span className="text-sm text-blue-600 font-medium">
                                      {score.score.nextBestAction}
                                    </span>
                                  ) : <span className="text-gray-400">Calculate score</span>;
                                })()}
                              </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </div>
            
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => {
                  setIsContactsViewOpen(false);
                  setViewingList(null);
                  setContactsData([]);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queue View Modal */}
      {isQueueViewOpen && viewingList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[1200px] max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Outbound Queue for "{viewingList.name}"
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    View contacts queued for outbound dialing
                  </p>
                </div>
                
                {/* Campaign Filter */}
                <div className="flex items-center space-x-4">
                  <div className="min-w-[200px]">
                    <label htmlFor="campaign-filter" className="block text-sm font-medium text-gray-700 mb-1">
                      Filter by Campaign
                    </label>
                    <select
                      id="campaign-filter"
                      value={selectedCampaign}
                      onChange={(e) => handleCampaignFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Campaigns</option>
                      {campaigns.map((campaign) => (
                        <option key={campaign.campaignId} value={campaign.campaignId}>
                          {campaign.displayName || campaign.name} ({campaign.status})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Queue Stats */}
                  {queueStats && (
                    <div className="text-sm text-gray-600">
                      <div className="flex space-x-4">
                        <span>Total: {queueStats.total}</span>
                        {Object.entries(queueStats.statusBreakdown || {}).map(([status, count]) => (
                          <span key={status} className="capitalize">
                            {status}: {String(count)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {queueLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading queue...</span>
                </div>
              ) : queueData.length === 0 ? (
                <div className="text-center py-8">
                  <QueueListIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No queue entries found</h3>
                  <p className="mt-1 text-sm text-gray-500">No contacts from this list are currently queued for dialing.</p>
                </div>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Queued At
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Dialed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {queueData.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {entry.contact.firstName} {entry.contact.lastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.contact.phone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              entry.status === 'queued' ? 'bg-yellow-100 text-yellow-800' :
                              entry.status === 'dialing' ? 'bg-blue-100 text-blue-800' :
                              entry.status === 'completed' ? 'bg-green-100 text-green-800' :
                              entry.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {entry.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.priority}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(entry.queuedAt).toLocaleDateString()} {new Date(entry.queuedAt).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.dialedAt ? (
                              <div>
                                {new Date(entry.dialedAt).toLocaleDateString()}
                                <div className="text-xs text-gray-400">
                                  {new Date(entry.dialedAt).toLocaleTimeString()}
                                </div>
                              </div>
                            ) : (
                              'Not dialed yet'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => {
                  setIsQueueViewOpen(false);
                  setViewingList(null);
                  setQueueData([]);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Edit Modal */}
      {isEditingContact && editingContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Contact
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Update contact information
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveContact(editingContact);
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={editingContact.firstName || ''}
                      onChange={(e) => setEditingContact((prev: any) => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={editingContact.lastName || ''}
                      onChange={(e) => setEditingContact((prev: any) => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={editingContact.phone || ''}
                    onChange={(e) => setEditingContact((prev: any) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={editingContact.email || ''}
                    onChange={(e) => setEditingContact((prev: any) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    value={editingContact.company || ''}
                    onChange={(e) => setEditingContact((prev: any) => ({ ...prev, company: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      value={editingContact.city || ''}
                      onChange={(e) => setEditingContact((prev: any) => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                      State/County
                    </label>
                    <input
                      type="text"
                      id="state"
                      value={editingContact.state || ''}
                      onChange={(e) => setEditingContact((prev: any) => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={editingContact.notes || ''}
                    onChange={(e) => setEditingContact((prev: any) => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </form>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsEditingContact(false);
                  setEditingContact(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveContact(editingContact)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Progress Modal */}
      {bulkProgress.isRunning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[500px] p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {bulkProgress.operation}
              </h3>
              
              <div className="mb-4">
                <div className="bg-gray-200 rounded-full h-4 mb-2">
                  <div 
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${bulkProgress.progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  {bulkProgress.progress}% complete
                  {bulkProgress.total > 0 && (
                    <span> ({bulkProgress.current} of {bulkProgress.total})</span>
                  )}
                </p>
              </div>
              
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Processing...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
