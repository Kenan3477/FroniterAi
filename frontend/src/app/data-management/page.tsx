'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import DataManagementSidebar from '@/components/data-management/DataManagementSidebar';
import DataListTable from '@/components/data-management/DataListTable';
import { 
  MagnifyingGlassIcon,
  TableCellsIcon,
  EyeIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface DataList {
  id: string;
  name: string;
  description: string;
  campaign: string;
  total: number;
  available: number;
}

// Mock data for data lists (empty for now as requested)
const mockDataLists: DataList[] = [
  // Empty array - no existing data lists
];

export default function DataManagementPage() {
  const [selectedSection, setSelectedSection] = useState('Manage Data Lists');
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const getCurrentData = () => {
    switch (selectedSection) {
      case 'Manage Data Lists':
        return mockDataLists;
      case 'Create Data Lists':
        return [];
      case 'Data Autoload':
        return [];
      default:
        return [];
    }
  };

  const renderContent = () => {
    if (selectedSection === 'Create Data Lists') {
      return (
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Create New Data List</h3>
              
              <form className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      List Name
                    </label>
                    <input 
                      type="text" 
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                      placeholder="Enter list name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign
                    </label>
                    <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500">
                      <option>Select Campaign</option>
                      <option>DAC Cold First Use</option>
                      <option>Default Campaign</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea 
                    rows={3}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                    placeholder="Enter description"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Source
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="radio" name="dataSource" value="csv" className="text-slate-600" />
                      <span className="ml-2 text-sm text-gray-700">Upload CSV File</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="dataSource" value="database" className="text-slate-600" />
                      <span className="ml-2 text-sm text-gray-700">Import from Database</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="dataSource" value="api" className="text-slate-600" />
                      <span className="ml-2 text-sm text-gray-700">API Integration</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4">
                  <button 
                    type="button"
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-slate-600 text-white rounded-md text-sm font-medium hover:bg-slate-700"
                  >
                    Create Data List
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }
    
    if (selectedSection === 'Data Autoload') {
      return (
        <div className="p-6">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">🔄</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Data Autoload</h3>
              <p className="text-gray-500 mb-4">
                Configure automated data loading and synchronization
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
                <h4 className="font-medium text-gray-900 mb-2">Coming Soon:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Scheduled data imports</li>
                  <li>• Real-time synchronization</li>
                  <li>• Data validation rules</li>
                  <li>• Error handling and notifications</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Default: Manage Data Lists
    return <DataListTable data={getCurrentData()} searchTerm={searchTerm} />;
  };

  return (
    <MainLayout>
      <div className="flex h-full">
        {/* Data Management Sidebar */}
        <DataManagementSidebar
          selectedSection={selectedSection}
          onSectionChange={setSelectedSection}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  {selectedSection}
                </h1>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Search */}
                {selectedSection === 'Manage Data Lists' && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search data lists..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-80 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                    />
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
                    <TableCellsIcon className="h-4 w-4 mr-2" />
                    View
                  </button>
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
                    <EyeIcon className="h-4 w-4 mr-2" />
                    Actions
                  </button>
                  <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {renderContent()}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}