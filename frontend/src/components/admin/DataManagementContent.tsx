'use client';

import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { 
  EllipsisVerticalIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PlusIcon,
  CloudArrowUpIcon,
  CheckIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface DataList {
  id: string;
  name: string;
  description: string;
  campaign: string;
  total: number;
  available: number;
  queued: number;
  reset: number;
  status: 'Active' | 'Inactive';
  createdAt: Date;
}

interface DataListCreator {
  step: 'details' | 'settings' | 'review';
  id: string;
  name: string;
  description: string;
  campaign: string;
  priority: number;
  weight: number;
  setAsActive: boolean;
  tags: string[];
  maxDialAttempts: number;
  recycleTime: number;
}

interface UploadWizard {
  step: 'upload' | 'columns' | 'validation' | 'review' | 'processing';
  file: File | null;
  fileName: string;
  targetList: string;
  detectedColumns: string[];
  columnMappings: { [key: string]: string };
  validationOptions: {
    skipDuplicates: boolean;
    validatePhones: boolean;
    validateEmails: boolean;
    skipEmptyRows: boolean;
  };
  previewData: any[];
  progress: number;
}

interface DataManagementContentProps {
  searchTerm: string;
}

// Sample campaigns
const campaigns = [
  'DAC Cold First Use',
  'DAC FRS', 
  'Claims Team',
  'Default Campaign',
  'Marketing Campaign',
  'Follow Up Campaign'
];

// Sample data lists
const initialDataLists: DataList[] = [
  {
    id: '15761',
    name: '100 day today MF!',
    description: 'NO CAMPAIGN ON CCS - First use 0609',
    campaign: 'DAC Cold First Use',
    total: 0,
    available: 0,
    queued: 0,
    reset: 0,
    status: 'Inactive',
    createdAt: new Date('2024-01-15')
  },
  {
    id: '15615',
    name: '100 products',
    description: 'HardSoft Leads only not on anything yet',
    campaign: 'DAC FRS',
    total: 1000,
    available: 1000,
    queued: 0,
    reset: 0,
    status: 'Inactive',
    createdAt: new Date('2024-02-10')
  }
];

export default function DataManagementContent({ searchTerm }: DataManagementContentProps) {
  const [selectedSubTab, setSelectedSubTab] = useState('Manage Data Lists');
  const [dataLists, setDataLists] = useState<DataList[]>(initialDataLists);
  const [searchTerm2, setSearchTerm2] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showDataListCreator, setShowDataListCreator] = useState(false);
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [selectedListForUpload, setSelectedListForUpload] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data List Creator State
  const [dataListCreator, setDataListCreator] = useState<DataListCreator>({
    step: 'details',
    id: '',
    name: '',
    description: '',
    campaign: '',
    priority: 0,
    weight: 100,
    setAsActive: false,
    tags: [],
    maxDialAttempts: 3,
    recycleTime: 24
  });

  // Upload Wizard State
  const [uploadWizard, setUploadWizard] = useState<UploadWizard>({
    step: 'upload',
    file: null,
    fileName: '',
    targetList: '',
    detectedColumns: [],
    columnMappings: {},
    validationOptions: {
      skipDuplicates: true,
      validatePhones: true,
      validateEmails: false,
      skipEmptyRows: true
    },
    previewData: [],
    progress: 0
  });

  // Column mapping options for upload
  const columnOptions = [
    { key: 'firstName', label: 'First Name', category: 'Basic Info' },
    { key: 'lastName', label: 'Last Name', category: 'Basic Info' },
    { key: 'fullName', label: 'Full Name', category: 'Basic Info' },
    { key: 'email', label: 'Email Address', category: 'Contact Info' },
    { key: 'phone', label: 'Phone Number', category: 'Contact Info' },
    { key: 'mobile', label: 'Mobile Phone', category: 'Contact Info' },
    { key: 'workPhone', label: 'Work Phone', category: 'Contact Info' },
    { key: 'homePhone', label: 'Home Phone', category: 'Contact Info' },
    { key: 'company', label: 'Company', category: 'Business Info' },
    { key: 'jobTitle', label: 'Job Title', category: 'Business Info' },
    { key: 'department', label: 'Department', category: 'Business Info' },
    { key: 'industry', label: 'Industry', category: 'Business Info' },
    { key: 'address', label: 'Address', category: 'Location' },
    { key: 'address2', label: 'Address Line 2', category: 'Location' },
    { key: 'city', label: 'City', category: 'Location' },
    { key: 'state', label: 'State/Province', category: 'Location' },
    { key: 'zipCode', label: 'Zip/Postal Code', category: 'Location' },
    { key: 'country', label: 'Country', category: 'Location' },
    { key: 'website', label: 'Website', category: 'Additional Info' },
    { key: 'linkedIn', label: 'LinkedIn', category: 'Additional Info' },
    { key: 'notes', label: 'Notes/Comments', category: 'Additional Info' },
    { key: 'tags', label: 'Tags', category: 'Additional Info' },
    { key: 'leadSource', label: 'Lead Source', category: 'Additional Info' },
    { key: 'leadScore', label: 'Lead Score', category: 'Additional Info' },
    { key: 'custom1', label: 'Custom Field 1', category: 'Custom Fields' },
    { key: 'custom2', label: 'Custom Field 2', category: 'Custom Fields' },
    { key: 'custom3', label: 'Custom Field 3', category: 'Custom Fields' },
    { key: 'custom4', label: 'Custom Field 4', category: 'Custom Fields' },
    { key: 'custom5', label: 'Custom Field 5', category: 'Custom Fields' }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter data lists based on search
  const filteredLists = dataLists.filter(list => 
    list.name.toLowerCase().includes(searchTerm2.toLowerCase()) ||
    list.description.toLowerCase().includes(searchTerm2.toLowerCase()) ||
    list.campaign.toLowerCase().includes(searchTerm2.toLowerCase()) ||
    list.id.includes(searchTerm2)
  );

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Parse CSV/Excel file to detect actual columns
      Papa.parse(file, {
        header: true,
        preview: 10, // Only parse first 10 rows for headers and preview
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.error('Parse errors:', results.errors);
            alert('Error parsing file. Please check the file format and try again.');
            return;
          }
          
          // Extract column headers
          const detectedColumns = results.meta.fields || [];
          
          // Get preview data (first few rows)
          const previewData = results.data.slice(0, 5);
          
          setUploadWizard(prev => ({
            ...prev,
            file,
            fileName: file.name,
            detectedColumns,
            previewData,
            step: 'columns'
          }));
        },
        error: (error) => {
          console.error('File parsing error:', error);
          alert('Error reading file. Please ensure it is a valid CSV or Excel file.');
        }
      });
    }
  };

  // Create or edit data list
  const handleSaveDataList = () => {
    if (dataListCreator.id) {
      // Edit existing
      setDataLists(prev => prev.map(list => 
        list.id === dataListCreator.id 
          ? { ...list, ...dataListCreator, status: dataListCreator.setAsActive ? 'Active' : 'Inactive' }
          : list
      ));
    } else {
      // Create new
      const newList: DataList = {
        id: Date.now().toString(),
        name: dataListCreator.name,
        description: dataListCreator.description,
        campaign: dataListCreator.campaign,
        total: 0,
        available: 0,
        queued: 0,
        reset: 0,
        status: dataListCreator.setAsActive ? 'Active' : 'Inactive',
        createdAt: new Date()
      };
      setDataLists(prev => [...prev, newList]);
    }
    
    // Reset and close
    setShowDataListCreator(false);
    resetDataListCreator();
  };

  const resetDataListCreator = () => {
    setDataListCreator({
      step: 'details',
      id: '',
      name: '',
      description: '',
      campaign: '',
      priority: 0,
      weight: 100,
      setAsActive: false,
      tags: [],
      maxDialAttempts: 3,
      recycleTime: 24
    });
  };

  // Process upload
  const processUpload = () => {
    if (!uploadWizard.file) return;

    setUploadWizard(prev => ({ ...prev, step: 'processing', progress: 0 }));
    
    // Parse the entire file for processing
    Papa.parse(uploadWizard.file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          setUploadWizard(prev => ({ ...prev, progress: 20 }));
          
          if (results.errors.length > 0) {
            console.error('Parse errors:', results.errors);
            alert('Error parsing file during processing. Please check the file format.');
            setShowUploadWizard(false);
            return;
          }

          // Transform data according to column mappings
          const transformedContacts = results.data.map((row: any) => {
            const contact: any = {};
            
            // Apply column mappings
            Object.entries(uploadWizard.columnMappings).forEach(([sourceColumn, targetField]) => {
              if (targetField && row[sourceColumn]) {
                contact[targetField] = row[sourceColumn];
              }
            });
            
            return contact;
          });

          setUploadWizard(prev => ({ ...prev, progress: 50 }));

          // Send to API
          const response = await fetch('/api/contacts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contacts: transformedContacts,
              listId: uploadWizard.targetList,
              validationOptions: uploadWizard.validationOptions
            }),
          });

          setUploadWizard(prev => ({ ...prev, progress: 80 }));

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to upload contacts');
          }

          const result = await response.json();
          setUploadWizard(prev => ({ ...prev, progress: 100 }));

          // Show success message
          setTimeout(() => {
            alert(`Upload completed successfully!\n\nTotal: ${result.stats.total}\nProcessed: ${result.stats.processed}\nSkipped: ${result.stats.skipped}\nErrors: ${result.stats.errors}`);
            
            // Reset wizard and close
            setShowUploadWizard(false);
            setUploadWizard({
              step: 'upload',
              file: null,
              fileName: '',
              targetList: '',
              detectedColumns: [],
              columnMappings: {},
              validationOptions: {
                skipDuplicates: true,
                validatePhones: true,
                validateEmails: false,
                skipEmptyRows: true
              },
              previewData: [],
              progress: 0
            });
            
            // Refresh data lists if needed
            // TODO: Refresh the data lists to show updated contact counts
            
          }, 1000);

        } catch (error) {
          console.error('Upload error:', error);
          alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setShowUploadWizard(false);
        }
      },
      error: (error) => {
        console.error('File parsing error during processing:', error);
        alert('Error reading file during processing. Please try again.');
        setShowUploadWizard(false);
      }
    });
  };

  const renderDataListCreatorWizard = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {dataListCreator.id ? 'Edit Data List' : 'Create New Data List'}
            </h2>
            <button
              onClick={() => {
                setShowDataListCreator(false);
                resetDataListCreator();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="mt-4 flex items-center space-x-4">
            {['details', 'settings', 'review'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  dataListCreator.step === step
                    ? 'bg-slate-600 text-white'
                    : index < ['details', 'settings', 'review'].indexOf(dataListCreator.step)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index < ['details', 'settings', 'review'].indexOf(dataListCreator.step) ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="ml-2 text-sm text-gray-600 capitalize">{step}</span>
                {index < 2 && <div className="w-8 h-0.5 bg-gray-200 mx-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {dataListCreator.step === 'details' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  List Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dataListCreator.name}
                  onChange={(e) => setDataListCreator(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                  placeholder="Enter list name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={dataListCreator.description}
                  onChange={(e) => setDataListCreator(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                  placeholder="Enter description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign <span className="text-red-500">*</span>
                </label>
                <select
                  value={dataListCreator.campaign}
                  onChange={(e) => setDataListCreator(prev => ({ ...prev, campaign: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                >
                  <option value="">Select a campaign</option>
                  {campaigns.map(campaign => (
                    <option key={campaign} value={campaign}>{campaign}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {dataListCreator.step === 'settings' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <input
                    type="number"
                    value={dataListCreator.priority}
                    onChange={(e) => setDataListCreator(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weight (%)</label>
                  <input
                    type="number"
                    value={dataListCreator.weight}
                    onChange={(e) => setDataListCreator(prev => ({ ...prev, weight: parseInt(e.target.value) || 100 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Dial Attempts</label>
                  <input
                    type="number"
                    value={dataListCreator.maxDialAttempts}
                    onChange={(e) => setDataListCreator(prev => ({ ...prev, maxDialAttempts: parseInt(e.target.value) || 3 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recycle Time (hours)</label>
                  <input
                    type="number"
                    value={dataListCreator.recycleTime}
                    onChange={(e) => setDataListCreator(prev => ({ ...prev, recycleTime: parseInt(e.target.value) || 24 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="setAsActive"
                  checked={dataListCreator.setAsActive}
                  onChange={(e) => setDataListCreator(prev => ({ ...prev, setAsActive: e.target.checked }))}
                  className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                />
                <label htmlFor="setAsActive" className="ml-2 text-sm text-gray-900">
                  Set as active list
                </label>
              </div>
            </div>
          )}

          {dataListCreator.step === 'review' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Review List Details</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div><span className="font-medium">Name:</span> {dataListCreator.name}</div>
                <div><span className="font-medium">Description:</span> {dataListCreator.description || 'None'}</div>
                <div><span className="font-medium">Campaign:</span> {dataListCreator.campaign}</div>
                <div><span className="font-medium">Priority:</span> {dataListCreator.priority}</div>
                <div><span className="font-medium">Weight:</span> {dataListCreator.weight}%</div>
                <div><span className="font-medium">Status:</span> {dataListCreator.setAsActive ? 'Active' : 'Inactive'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-between rounded-b-lg">
          <div>
            {dataListCreator.step !== 'details' && (
              <button
                onClick={() => {
                  const steps = ['details', 'settings', 'review'];
                  const currentIndex = steps.indexOf(dataListCreator.step);
                  if (currentIndex > 0) {
                    setDataListCreator(prev => ({ ...prev, step: steps[currentIndex - 1] as any }));
                  }
                }}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowDataListCreator(false);
                resetDataListCreator();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            
            {dataListCreator.step === 'review' ? (
              <button
                onClick={handleSaveDataList}
                disabled={!dataListCreator.name || !dataListCreator.campaign}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-600 border border-transparent rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {dataListCreator.id ? 'Update List' : 'Create List'}
              </button>
            ) : (
              <button
                onClick={() => {
                  const steps = ['details', 'settings', 'review'];
                  const currentIndex = steps.indexOf(dataListCreator.step);
                  if (currentIndex < steps.length - 1) {
                    setDataListCreator(prev => ({ ...prev, step: steps[currentIndex + 1] as any }));
                  }
                }}
                disabled={dataListCreator.step === 'details' && (!dataListCreator.name || !dataListCreator.campaign)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-slate-600 border border-transparent rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRightIcon className="h-4 w-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUploadWizard = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Upload Data Wizard</h2>
            <button
              onClick={() => setShowUploadWizard(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="mt-4 flex items-center space-x-4">
            {['upload', 'columns', 'validation', 'review'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  uploadWizard.step === step
                    ? 'bg-slate-600 text-white'
                    : index < ['upload', 'columns', 'validation', 'review'].indexOf(uploadWizard.step)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index < ['upload', 'columns', 'validation', 'review'].indexOf(uploadWizard.step) ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="ml-2 text-sm text-gray-600 capitalize">{step}</span>
                {index < 3 && <div className="w-8 h-0.5 bg-gray-200 mx-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {uploadWizard.step === 'upload' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target List</label>
                <select
                  value={uploadWizard.targetList}
                  onChange={(e) => setUploadWizard(prev => ({ ...prev, targetList: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                >
                  <option value="">Select a data list</option>
                  {dataLists.map(list => (
                    <option key={list.id} value={list.id}>#{list.id} - {list.name}</option>
                  ))}
                </select>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload a CSV or Excel file
                    </span>
                    <span className="mt-1 block text-sm text-gray-500">
                      or drag and drop files here
                    </span>
                  </label>
                  <input
                    id="file-upload"
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                  />
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
                >
                  Choose File
                </button>
              </div>

              {uploadWizard.file && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-700">
                    <CheckIcon className="inline h-4 w-4 mr-1" />
                    File selected: {uploadWizard.fileName}
                  </p>
                </div>
              )}
            </div>
          )}

          {uploadWizard.step === 'columns' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Map Columns</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Map the columns from your file to the system fields. You can map to standard fields or custom fields.
                </p>
                
                {/* Show detected columns count */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                  <div className="flex items-center">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2" />
                    <span className="text-sm text-blue-800">
                      Detected {uploadWizard.detectedColumns.length} columns in your file
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {uploadWizard.detectedColumns.map((column, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-center p-4 bg-gray-50 rounded-lg">
                    <div className="col-span-4">
                      <div className="font-medium text-gray-900">{column}</div>
                      <div className="text-xs text-gray-500">Column {index + 1}</div>
                    </div>
                    
                    <div className="col-span-1 flex justify-center">
                      <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    
                    <div className="col-span-7">
                      <select
                        value={uploadWizard.columnMappings[column] || ''}
                        onChange={(e) => setUploadWizard(prev => ({
                          ...prev,
                          columnMappings: {
                            ...prev.columnMappings,
                            [column]: e.target.value
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                      >
                        <option value="">-- Select field --</option>
                        {/* Group options by category */}
                        {['Basic Info', 'Contact Info', 'Business Info', 'Location', 'Additional Info', 'Custom Fields'].map(category => {
                          const categoryOptions = columnOptions.filter(option => option.category === category);
                          if (categoryOptions.length === 0) return null;
                          
                          return (
                            <optgroup key={category} label={category}>
                              {categoryOptions.map(option => (
                                <option key={option.key} value={option.key}>
                                  {option.label}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Mapping summary */}
              <div className="border-t pt-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Mapped:</span> {Object.keys(uploadWizard.columnMappings).length} of {uploadWizard.detectedColumns.length} columns
                </div>
              </div>
            </div>
          )}

          {uploadWizard.step === 'validation' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Data Preview</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Review how your data will be imported. Check the first few rows to ensure the mapping is correct.
                </p>
              </div>

              {/* Preview Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Row
                        </th>
                        {Object.keys(uploadWizard.columnMappings).map(column => {
                          const mappedField = uploadWizard.columnMappings[column];
                          const fieldLabel = columnOptions.find(opt => opt.key === mappedField)?.label || mappedField;
                          return (
                            <th key={column} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <div>
                                <div className="font-semibold text-gray-900">{fieldLabel}</div>
                                <div className="text-gray-500 font-normal normal-case">from: {column}</div>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {uploadWizard.previewData.slice(0, 5).map((row: any, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {index + 1}
                          </td>
                          {Object.keys(uploadWizard.columnMappings).map(column => (
                            <td key={column} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {row[column] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Validation Options */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Validation Options</h4>
                <div className="space-y-4">
                  {[
                    { key: 'skipDuplicates', label: 'Skip duplicate records', description: 'Remove duplicate entries based on phone/email' },
                    { key: 'validatePhones', label: 'Validate phone numbers', description: 'Check phone number format and validity' },
                    { key: 'validateEmails', label: 'Validate email addresses', description: 'Check email format and syntax' },
                    { key: 'skipEmptyRows', label: 'Skip empty rows', description: 'Ignore rows with no data' }
                  ].map(option => (
                    <div key={option.key} className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id={option.key}
                          type="checkbox"
                          checked={uploadWizard.validationOptions[option.key as keyof typeof uploadWizard.validationOptions]}
                          onChange={(e) => setUploadWizard(prev => ({
                            ...prev,
                            validationOptions: {
                              ...prev.validationOptions,
                              [option.key]: e.target.checked
                            }
                          }))}
                          className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3">
                        <label htmlFor={option.key} className="text-sm font-medium text-gray-700">
                          {option.label}
                        </label>
                        <p className="text-sm text-gray-500">{option.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {uploadWizard.step === 'review' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Review Upload</h3>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div><span className="font-medium">File:</span> {uploadWizard.fileName}</div>
                <div><span className="font-medium">Target List:</span> #{uploadWizard.targetList}</div>
                <div><span className="font-medium">Detected Columns:</span> {uploadWizard.detectedColumns.length}</div>
                <div><span className="font-medium">Mapped Fields:</span> {Object.keys(uploadWizard.columnMappings).length}</div>
              </div>

              <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                <div className="flex">
                  <InformationCircleIcon className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Ready to upload</h3>
                    <p className="mt-2 text-sm text-yellow-700">
                      Your data will be processed and added to the selected list. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {uploadWizard.step === 'processing' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Processing Upload</h3>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-slate-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadWizard.progress}%` }}
                  ></div>
                </div>
                <p className="mt-2 text-sm text-gray-600">{uploadWizard.progress}% complete</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {uploadWizard.step !== 'processing' && (
          <div className="px-6 py-4 bg-gray-50 flex justify-between rounded-b-lg">
            <div>
              {uploadWizard.step !== 'upload' && (
                <button
                  onClick={() => {
                    const steps = ['upload', 'columns', 'validation', 'review'];
                    const currentIndex = steps.indexOf(uploadWizard.step);
                    if (currentIndex > 0) {
                      setUploadWizard(prev => ({ ...prev, step: steps[currentIndex - 1] as any }));
                    }
                  }}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowUploadWizard(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              
              {uploadWizard.step === 'review' ? (
                <button
                  onClick={processUpload}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-600 border border-transparent rounded-md hover:bg-slate-700"
                >
                  Start Upload
                </button>
              ) : (
                <button
                  onClick={() => {
                    const steps = ['upload', 'columns', 'validation', 'review'];
                    const currentIndex = steps.indexOf(uploadWizard.step);
                    if (currentIndex < steps.length - 1) {
                      setUploadWizard(prev => ({ ...prev, step: steps[currentIndex + 1] as any }));
                    }
                  }}
                  disabled={
                    (uploadWizard.step === 'upload' && (!uploadWizard.file || !uploadWizard.targetList)) ||
                    (uploadWizard.step === 'columns' && Object.keys(uploadWizard.columnMappings).length === 0)
                  }
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-slate-600 border border-transparent rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900">Data Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your contact data and upload new data lists</p>
      </div>
      
      {/* Sub-tabs */}
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

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {selectedSubTab === 'Manage Data Lists' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Data Lists</h3>
                <p className="text-sm text-gray-500">Manage your contact data lists</p>
              </div>
              <button 
                onClick={() => setShowDataListCreator(true)}
                className="bg-slate-600 text-white px-4 py-2 rounded-md hover:bg-slate-700 transition-colors flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create New List
              </button>
            </div>

            {/* Search */}
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

              {/* Table */}
              <div className="overflow-x-auto">
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
                            value={list.campaign}
                            onChange={(e) => {
                              setDataLists(prev => prev.map(l => 
                                l.id === list.id ? { ...l, campaign: e.target.value } : l
                              ));
                            }}
                            className="text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                          >
                            {campaigns.map(campaign => (
                              <option key={campaign} value={campaign}>{campaign}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{list.total}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{list.available}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            list.status === 'Active' 
                              ? 'bg-green-100 text-slate-800' 
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
                                      setDataListCreator(prev => ({
                                        ...prev,
                                        id: list.id,
                                        name: list.name,
                                        description: list.description,
                                        campaign: list.campaign,
                                        setAsActive: list.status === 'Active'
                                      }));
                                      setShowDataListCreator(true);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <PencilIcon className="h-4 w-4 mr-3" />
                                    Edit List
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenDropdown(null);
                                      setSelectedListForUpload(list.id);
                                      setUploadWizard(prev => ({ ...prev, targetList: list.id }));
                                      setShowUploadWizard(true);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <CloudArrowUpIcon className="h-4 w-4 mr-3" />
                                    Upload Data
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenDropdown(null);
                                      const clonedList = {
                                        ...list,
                                        id: Date.now().toString(),
                                        name: `${list.name} (Copy)`,
                                        total: 0,
                                        available: 0,
                                        status: 'Inactive' as const
                                      };
                                      setDataLists(prev => [...prev, clonedList]);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <DocumentDuplicateIcon className="h-4 w-4 mr-3" />
                                    Clone List
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenDropdown(null);
                                      if (confirm(`Are you sure you want to delete "${list.name}"?`)) {
                                        setDataLists(prev => prev.filter(l => l.id !== list.id));
                                      }
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
              </div>
            </div>
          </div>
        )}

        {selectedSubTab === 'Create Data Lists' && (
          <div className="space-y-6">
            <div className="text-center py-12">
              <PlusIcon className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Create New Data List</h3>
              <p className="mt-2 text-gray-600">
                Use the wizard to create a new data list with custom settings
              </p>
              <button 
                onClick={() => setShowDataListCreator(true)}
                className="mt-4 bg-slate-600 text-white px-6 py-3 rounded-md hover:bg-slate-700 transition-colors"
              >
                Start Creation Wizard
              </button>
            </div>
          </div>
        )}

        {selectedSubTab === 'Upload Data' && (
          <div className="space-y-6">
            <div className="text-center py-12">
              <CloudArrowUpIcon className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Upload Data to Lists</h3>
              <p className="mt-2 text-gray-600">
                Import contacts from CSV or Excel files into your data lists
              </p>
              <button 
                onClick={() => setShowUploadWizard(true)}
                className="mt-4 bg-slate-600 text-white px-6 py-3 rounded-md hover:bg-slate-700 transition-colors"
              >
                Start Upload Wizard
              </button>
            </div>
          </div>
        )}

        {selectedSubTab === 'Data Analytics' && (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900">Data Analytics</h3>
              <p className="text-gray-600 mb-4">
                View analytics and insights about your data lists
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
                <h4 className="font-medium text-gray-900 mb-2">Coming Soon:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Data quality metrics</li>
                  <li>• Contact distribution charts</li>
                  <li>• Performance analytics</li>
                  <li>• Export reports</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showDataListCreator && renderDataListCreatorWizard()}
      {showUploadWizard && renderUploadWizard()}
    </div>
  );
}