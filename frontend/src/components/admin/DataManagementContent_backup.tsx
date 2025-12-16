'use client';

import React, { useState, useEffect, useRef } from 'react';

interface DataList {
  id: string;
  name: string;
  description: string;
  campaign: string;
  total: number;
  available: number;
  status: 'Active' | 'Inactive';
}

interface DataListCreator {
  step: 'dataList' | 'webForm' | 'customFields' | 'costBilling' | 'review';
  id: string;
  name: string;
  description: string;
  campaign: string;
  priority: number;
  weight: number;
  priorityTag: string;
  setAsActive: boolean;
  webFormUrl: string;
  customFields: Array<{
    name: string;
    type: string;
    label: string;
    hidden: boolean;
    readOnly: boolean;
  }>;
  enableTariff: boolean;
}

interface DataManagementContentProps {
  searchTerm: string;
}

interface UploadData {
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
  // Additional fields
  listName?: string;
  description?: string;
  campaign?: string;
  skipDuplicates?: boolean;
  validateEmails?: boolean;
  // Validation Results
  processedData?: {
    totalRows: number;
    validContacts: Array<any>;
    duplicateContacts: Array<any>;
    invalidContacts: Array<any>;
    dncContacts: Array<any>;
    unmappedFields: string[];
    suggestedMappings: { [key: string]: string };
  };
  step: 'fileUpload' | 'uploadOptions' | 'primaryColumns' | 'customColumns' | 'uploadReview' | 'upload' | 'settings' | 'complete';
  // Review Data
  validContacts: number;
  duplicateContacts: number;
  invalidContacts: number;
  dncContacts: number;
}

// Sample data lists
const initialDataLists: DataList[] = [
  {
    id: '15761',
    name: '100 day today MF!',
    description: 'NO CAMPAIGN ON CCS - First use 0609',
    campaign: 'DAC Cold First Use',
    total: 0,
    available: 0,
    status: 'Inactive'
  },
  {
    id: '15615',
    name: '100 products',
    description: 'HardSoft  Leads only not on anything yet',
    campaign: 'DAC FRS',
    total: 1000,
    available: 1000,
    status: 'Inactive'
  }
];

export default function DataManagementContent({ searchTerm }: DataManagementContentProps) {
  const [selectedSubTab, setSelectedSubTab] = useState('Manage Data Lists');
  const [dataLists, setDataLists] = useState<DataList[]>(initialDataLists);
  const [searchTerm2, setSearchTerm2] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [showDataListCreator, setShowDataListCreator] = useState(false);
  const [wizardMode, setWizardMode] = useState<'create' | 'upload'>('create');
  const [targetListId, setTargetListId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showOutcomeSummary, setShowOutcomeSummary] = useState<string | null>(null);
  const [showCloneDialog, setShowCloneDialog] = useState<string | null>(null);
  const [cloneListName, setCloneListName] = useState('');
  const [dataListCreator, setDataListCreator] = useState<DataListCreator>({
    step: 'dataList',
    id: Date.now().toString(),
    name: '',
    description: '',
    campaign: '',
    priority: 0,
    weight: 0,
    priorityTag: '',
    setAsActive: false,
    webFormUrl: '',
    customFields: [
      {
        name: 'custom_0',
        type: 'Text',
        label: '',
        hidden: false,
        readOnly: false
      }
    ],
    enableTariff: false
  });

  const [uploadData, setUploadData] = useState<UploadData>({
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
    listName: '',
    description: '',
    campaign: '',
    skipDuplicates: false,
    validateEmails: false,
    step: 'fileUpload',
    validContacts: 0,
    duplicateContacts: 0,
    invalidContacts: 0,
    dncContacts: 0
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

  // Enhanced smart mapping function that creates templates
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
    const existingTemplates = JSON.parse(localStorage.getItem('uploadTemplates') || '[]');
    localStorage.setItem('uploadTemplates', JSON.stringify([...existingTemplates, newTemplate]));
    
    return newTemplate;
  };

  // Load templates from localStorage on component mount
  useEffect(() => {
    const savedTemplatesData = localStorage.getItem('uploadTemplates');
    if (savedTemplatesData) {
      setSavedTemplates(JSON.parse(savedTemplatesData));
    }
  }, []);

  // Apply template function
  const applyTemplate = (template: any) => {
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
  };

  // Utility functions for file processing
  const parseCSVFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const rows = lines.slice(uploadData.leadingLinesToSkip + 1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            return row;
          });
          resolve(rows);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return false;
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const detectSmartMappings = (headers: string[]): { [key: string]: string } => {
    const mappings: { [key: string]: string } = {};
    const fieldPatterns = {
      firstName: /first.?name|fname|given.?name|f_name/i,
      lastName: /last.?name|lname|surname|family.?name|l_name/i,
      email: /email|e.?mail|email.?address/i,
      telephone1: /phone|tel|mobile|cell|number|telephone|tel1/i,
      companyName: /company|business|organization|org|company.?name/i,
      address1: /address|addr|street|address.?line.?1/i,
      postalCode: /zip|postal|post.?code|zipcode/i,
      townCity: /city|town|municipality/i,
      county: /county|state|province|region/i,
      country: /country|nation/i,
      title: /title|salutation|prefix/i,
      tel1: /tel1|phone1|primary.?phone/i,
      address2: /address.?2|apartment|apt|suite/i,
      address3: /address.?3/i,
      website: /website|url|web|site/i,
      industry: /industry|sector|business.?type/i,
      department: /department|dept|division/i,
      dateOfBirth: /dob|date.?of.?birth|birth.?date/i,
      gender: /gender|sex/i,
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

  // All the handler functions and render functions would continue here...
  // This is a simplified version to get us back to a working state

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900">Data Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your contact data and upload new data lists</p>
      </div>
      
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex space-x-8">
          {['Manage Data Lists', 'Data Analytics', 'Export Data'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedSubTab(tab)}
              className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                selectedSubTab === tab
                  ? 'border-kennex-500 text-kennex-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Data Lists</h3>
              <p className="text-sm text-gray-500">Manage your contact data lists</p>
            </div>
            <button 
              onClick={() => setShowDataListCreator(true)}
              className="bg-kennex-600 text-white px-4 py-2 rounded-md hover:bg-kennex-700 transition-colors"
            >
              Create New List
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search data lists..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kennex-500 focus:border-kennex-500"
              />
            </div>

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
                  {dataLists.map((list) => (
                    <tr key={list.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">#{list.id} - {list.name}</div>
                          <div className="text-sm text-gray-500">{list.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{list.campaign}</td>
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
                        <button className="text-kennex-600 hover:text-kennex-900">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}