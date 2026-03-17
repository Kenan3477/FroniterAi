'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import AdminSidebar from '@/components/admin/AdminSidebar';
import DataManagementContent from '@/components/admin/DataManagementContent';
import UserManagement from '@/components/admin/UserManagement';
import ApiManagement from '@/components/admin/ApiManagement';
import AppsIntegrations from '@/components/admin/AppsIntegrations';
import BusinessSettingsPage from '@/components/admin/BusinessSettingsPage';
import CampaignManagementPage from '@/components/admin/CampaignManagementPage';
import DoNotCallPage from '@/components/admin/DoNotCallPage';
import FlowsManagement from '@/components/flows/FlowsManagement';
import ChannelsManagement from '@/components/admin/ChannelsManagement';
import ReportsSystem from '@/components/admin/ReportsSystem';
import SystemOverview from '@/components/admin/SystemOverview';
import SLAsManagement from '@/components/admin/SLAsManagement';
import ViewsManagement from '@/components/admin/ViewsManagement';
import NetworkSettingsManagement from '@/components/admin/NetworkSettingsManagement';
import AuditLogsManagement from '@/components/admin/AuditLogsManagement';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  ArrowPathIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

export default function AdminPage() {
  const [selectedSection, setSelectedSection] = useState('Admin');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check user role on client side for better UX
    const checkAdminAccess = async () => {
      try {
        const response = await fetch('/api/auth/profile', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.role === 'ADMIN') {
            setIsAuthorized(true);
          } else {
            console.log('🚫 Non-admin user trying to access admin panel, redirecting...');
            router.push('/dashboard?error=access-denied');
            return;
          }
        } else {
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('Error checking admin access:', error);
        router.push('/dashboard');
        return;
      }
    };

    checkAdminAccess();
  }, [router]);

  // Show loading state while checking authorization
  if (isAuthorized === null) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking admin access...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show access denied if not authorized (shouldn't reach here due to middleware, but good UX)
  if (isAuthorized === false) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">You don't have permission to access the admin panel.</p>
            <button 
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-full">
        {/* Admin Sidebar */}
        <AdminSidebar
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
                {selectedSection !== 'System Settings' && selectedSection !== 'Audit Logs' && selectedSection !== 'Security & Compliance' && selectedSection !== 'Network Settings' && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    >
                      <FunnelIcon className="h-4 w-4 mr-2" />
                      Filter
                    </button>
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
                      <ArrowsUpDownIcon className="h-4 w-4 mr-2" />
                      Sort
                    </button>
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
                      <ArrowPathIcon className="h-4 w-4 mr-2" />
                      Refresh
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Search */}
                {selectedSection !== 'System Settings' && selectedSection !== 'Security & Compliance' && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder={
                        selectedSection === 'Data Management' ? 'Search data lists...' :
                        selectedSection === 'Campaigns' ? 'Search campaigns...' :
                        `Search ${selectedSection.toLowerCase()}...`
                      }
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-80 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                    />
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  {selectedSection !== 'Admin' && selectedSection !== 'API' && selectedSection !== 'Business Settings' && selectedSection !== 'Data Management' && selectedSection !== 'SLAs' && selectedSection !== 'Views' && selectedSection !== 'User Management' && (
                    <button 
                      onClick={() => {
                        if (selectedSection === 'Campaigns') {
                          setShowCreateCampaign(true);
                        }
                        // Add handlers for other sections as needed
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add {selectedSection === 'User Management' ? 'User' : 
                           selectedSection === 'Apps and Integrations' ? 'Integration' :
                           selectedSection === 'Campaigns' ? 'Campaign' :
                           selectedSection === 'Channels' ? 'Channel' :
                           selectedSection === 'Flows' ? 'Flow' :
                           selectedSection === 'Inbound Queues' ? 'Queue' :
                           selectedSection.slice(0, -1)}
                    </button>
                  )}
                  {selectedSection !== 'Admin' && selectedSection !== 'Business Settings' && selectedSection !== 'User Management' && (
                    <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
                      Export
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && selectedSection !== 'Admin' && selectedSection !== 'Business Settings' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-4 gap-4">
                  {selectedSection === 'User Management' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Role
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Roles</option>
                          <option>Admin</option>
                          <option>Manager</option>
                          <option>Agent</option>
                          <option>Viewer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Statuses</option>
                          <option>Active</option>
                          <option>Inactive</option>
                          <option>Suspended</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Departments</option>
                          <option>Sales</option>
                          <option>Support</option>
                          <option>Marketing</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Created Date
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Time</option>
                          <option>Today</option>
                          <option>This Week</option>
                          <option>This Month</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  {selectedSection === 'Campaigns' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Campaign Type
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Types</option>
                          <option>Outbound</option>
                          <option>Inbound</option>
                          <option>Blended</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Campaign Status
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Statuses</option>
                          <option>Active</option>
                          <option>Paused</option>
                          <option>Completed</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  {selectedSection === 'Channels' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Channel Type
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Channels</option>
                          <option>Voice</option>
                          <option>Email</option>
                          <option>SMS</option>
                          <option>Chat</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Statuses</option>
                          <option>Active</option>
                          <option>Inactive</option>
                          <option>Maintenance</option>
                        </select>
                      </div>
                    </>
                  )}

                  {selectedSection === 'Data Management' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data Source
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Sources</option>
                          <option>Database</option>
                          <option>CSV Files</option>
                          <option>API Import</option>
                          <option>Manual Entry</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data Type
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Types</option>
                          <option>Contact Data</option>
                          <option>Campaign Data</option>
                          <option>Call Records</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Statuses</option>
                          <option>Active</option>
                          <option>Processing</option>
                          <option>Error</option>
                        </select>
                      </div>
                    </>
                  )}

                  {selectedSection === 'Dialer Configuration' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dialer Type
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Types</option>
                          <option>Predictive</option>
                          <option>Progressive</option>
                          <option>Preview</option>
                          <option>Manual</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Campaign Status
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Campaigns</option>
                          <option>Active</option>
                          <option>Paused</option>
                          <option>Scheduled</option>
                        </select>
                      </div>
                    </>
                  )}

                  {selectedSection === 'Reports & Analytics' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Report Type
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Reports</option>
                          <option>Call Reports</option>
                          <option>Agent Reports</option>
                          <option>Campaign Reports</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Time Period
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>Today</option>
                          <option>This Week</option>
                          <option>This Month</option>
                          <option>Custom Range</option>
                        </select>
                      </div>
                    </>
                  )}

                  {selectedSection === 'Templates & Scripts' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Template Type
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Templates</option>
                          <option>Call Scripts</option>
                          <option>Email Templates</option>
                          <option>SMS Templates</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Categories</option>
                          <option>Sales</option>
                          <option>Support</option>
                          <option>Follow-up</option>
                        </select>
                      </div>
                    </>
                  )}

                  {selectedSection === 'Integrations' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Integration Type
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Integrations</option>
                          <option>CRM</option>
                          <option>Email</option>
                          <option>SMS</option>
                          <option>Analytics</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Statuses</option>
                          <option>Connected</option>
                          <option>Disconnected</option>
                          <option>Error</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {selectedSection === 'System Settings' ? (
              <div className="p-6">
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Organization Name
                        </label>
                        <input type="text" defaultValue="Omnivox-AI" className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time Zone
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500">
                          <option>UTC</option>
                          <option>GMT</option>
                          <option>EST</option>
                          <option>PST</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                          <p className="text-sm text-gray-500">Require 2FA for all users</p>
                        </div>
                        <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">
                          <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Session Timeout</h4>
                          <p className="text-sm text-gray-500">Auto-logout after inactivity</p>
                        </div>
                        <select className="rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500">
                          <option>30 minutes</option>
                          <option>1 hour</option>
                          <option>4 hours</option>
                          <option>8 hours</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Dialer Settings</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Default Dialer Mode
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500">
                          <option>Progressive</option>
                          <option>Predictive</option>
                          <option>Preview</option>
                          <option>Manual</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Concurrent Calls
                        </label>
                        <input type="number" defaultValue="100" className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedSection === 'Admin' ? (
              <div className="p-6">
                <div className="max-w-4xl mx-auto space-y-8">
                  <SystemOverview />
                </div>
              </div>
            ) : selectedSection === 'Data Management' ? (
              <DataManagementContent searchTerm={searchTerm} />
            ) : selectedSection === 'User Management' ? (
              <UserManagement />
            ) : selectedSection === 'API' ? (
              <ApiManagement />
            ) : selectedSection === 'Apps and Integrations' ? (
              <AppsIntegrations />
            ) : selectedSection === 'Business Settings' ? (
              <BusinessSettingsPage />
            ) : selectedSection === 'Campaigns' ? (
              <CampaignManagementPage />
            ) : selectedSection === 'Do Not Call (DNC)' ? (
              <DoNotCallPage />
            ) : selectedSection === 'Channels' ? (
              <div className="p-6">
                <ChannelsManagement />
              </div>
            ) : selectedSection === 'Reports & Analytics' ? (
              <ReportsSystem />
            ) : selectedSection === 'SLAs' ? (
              <div className="p-6">
                <SLAsManagement />
              </div>
            ) : selectedSection === 'Views' ? (
              <div className="p-6">
                <ViewsManagement />
              </div>
            ) : selectedSection === 'Network Settings' ? (
              <div className="p-6">
                <NetworkSettingsManagement />
              </div>
            ) : selectedSection === 'Audit Logs' ? (
              <div className="p-6">
                <AuditLogsManagement />
              </div>
            ) : selectedSection === 'Flows' || selectedSection.startsWith('Flows - ') ? (
              <FlowsManagement 
                onBackToAdmin={() => setSelectedSection('Admin')}
                initialSubSection={
                  selectedSection === 'Flows - Manage Flows' ? 'Manage Flows' :
                  selectedSection === 'Flows - Automation Flow Summaries' ? 'Automation Flow Summaries' :
                  'Manage Flows'
                }
              />
            ) : (
              <div className="p-6">
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-6xl mb-4">
                      {selectedSection === 'User Management' && '👥'}
                      {selectedSection === 'API' && '🔑'}
                      {selectedSection === 'Apps and Integrations' && '🔗'}
                      {selectedSection === 'Business Settings' && '🏢'}
                      {selectedSection === 'Campaigns' && '📢'}
                      {selectedSection === 'Do Not Call (DNC)' && '🚫'}
                      {selectedSection === 'Channels' && '📡'}
                      {selectedSection === 'Flows' && '🔄'}
                      {selectedSection === 'Inbound Queues' && '📥'}
                      {selectedSection === 'SLAs' && '⏱️'}
                      {selectedSection === 'Views' && '👁️'}
                      {selectedSection === 'Dialer Configuration' && '📞'}
                      {selectedSection === 'Reports & Analytics' && '📊'}
                      {selectedSection === 'Templates & Scripts' && '📄'}
                      {selectedSection === 'Cloud & Storage' && '☁️'}
                      {selectedSection === 'API Management' && '🔗'}
                      {selectedSection === 'Integrations' && '⚡'}
                      {selectedSection === 'Security & Compliance' && '🛡️'}
                      {selectedSection === 'Notifications' && '🔔'}
                      {selectedSection === 'Network Settings' && '🌐'}
                      {selectedSection === 'Audit Logs' && '📋'}
                      {!['Users', 'Roles & Permissions', 'Data Management', 'Dialer Configuration', 'Reports & Analytics', 'Templates & Scripts', 'Cloud & Storage', 'API Management', 'Integrations', 'Security & Compliance', 'Notifications', 'Network Settings', 'Audit Logs'].includes(selectedSection) && '⚙️'}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{selectedSection}</h3>
                    <p className="text-gray-500 mb-4">
                      {selectedSection === 'User Management' && 'Manage user accounts, groups, and access controls'}
                      {selectedSection === 'API' && 'Manage API keys, endpoints, and developer settings'}
                      {selectedSection === 'Apps and Integrations' && 'Configure third-party applications and integrations'}
                      {selectedSection === 'Business Settings' && 'Configure general business settings and preferences'}
                      {selectedSection === 'Campaigns' && 'Create and manage marketing campaigns'}
                      {selectedSection === 'Do Not Call (DNC)' && 'Manage Do Not Call registry and compliance settings'}
                      {selectedSection === 'Channels' && 'Configure communication channels and routing'}
                      {selectedSection === 'Flows' && 'Design and manage workflow automation'}
                      {selectedSection === 'Inbound Queues' && 'Manage incoming message queues and routing'}
                      {selectedSection === 'SLAs' && 'Configure service level agreements and targets'}
                      {selectedSection === 'Views' && 'Customize dashboards and data views'}
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
                      <h4 className="font-medium text-gray-900 mb-2">Coming Soon:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• {selectedSection} management interface</li>
                        <li>• Advanced filtering and search</li>
                        <li>• Bulk operations</li>
                        <li>• Real-time updates</li>
                        {selectedSection === 'Dialer Configuration' && <li>• Campaign scheduling and optimization</li>}
                        {selectedSection === 'Reports & Analytics' && <li>• Custom report builder</li>}
                        {selectedSection === 'Templates & Scripts' && <li>• Script editor and version control</li>}
                        {selectedSection === 'Security & Compliance' && <li>• GDPR and compliance tools</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}