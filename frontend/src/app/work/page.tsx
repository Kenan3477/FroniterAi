'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { MainLayout } from '@/components/layout';
import WorkSidebar from '@/components/work/WorkSidebar';
import InteractionTable from '@/components/work/InteractionTable';
import { CustomerInfoCard, CustomerInfoCardData } from '@/components/work/CustomerInfoCard';
import { TwilioClientDialer } from '@/components/dialer/TwilioClientDialer';
import { RootState } from '@/store';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  ArrowPathIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

// Mock data for different interaction types
const mockOutcomedInteractions = [
  {
    id: '1',
    agentName: 'Harley',
    customerName: 'Mr. Chris Bamber 01/09/2025 09/09/2025',
    interactionType: 'call' as const,
    telephone: '+44192327139',
    direction: 'outbound' as const,
    subject: '+44192327139',
    campaignName: 'Wiseguys failed payments',
    outcome: 'Answering Machine',
    dateTime: '09/12/2025 16:56',
    duration: '00:00:12',
  },
  {
    id: '2',
    agentName: 'Harley',
    customerName: 'Laura Byrne 28/07/2025 11/09/2025',
    interactionType: 'call' as const,
    telephone: '+44473404395',
    direction: 'outbound' as const,
    subject: '+44473404395',
    campaignName: 'Wiseguys failed payments',
    outcome: 'Answering Machine',
    dateTime: '09/12/2025 16:56',
    duration: '00:00:06',
  },
  {
    id: '3',
    agentName: 'Harley',
    customerName: 'Laura Byrne 28/07/2025 11/09/2025',
    interactionType: 'call' as const,
    telephone: '+44473404395',
    direction: 'outbound' as const,
    subject: '+44473404395',
    campaignName: 'Wiseguys failed payments',
    outcome: 'Answering Machine',
    dateTime: '09/12/2025 16:54',
    duration: '00:00:02',
  },
  {
    id: '4',
    agentName: 'Harley',
    customerName: 'Mr. Trevor Brown 08/10/2025 17/09/2025',
    interactionType: 'call' as const,
    telephone: '+44741480448',
    direction: 'outbound' as const,
    subject: '+44741480448',
    campaignName: 'Wiseguys failed payments',
    outcome: 'Answering Machine',
    dateTime: '09/12/2025 16:52',
    duration: '00:00:18',
  },
  {
    id: '5',
    agentName: 'Nic',
    customerName: 'Maxine Brookes',
    interactionType: 'call' as const,
    telephone: '+44719647192',
    direction: 'outbound' as const,
    subject: '+44719647192',
    campaignName: 'Ken Campaign NEW',
    outcome: 'Not Interested - NI',
    dateTime: '09/12/2025 16:49',
    duration: '00:05:12',
  },
  {
    id: '6',
    agentName: 'Harley',
    customerName: 'Mrs. Deborah Croft 15/10/2025 18/09/2025',
    interactionType: 'call' as const,
    telephone: '+44784573688',
    direction: 'outbound' as const,
    subject: '+44784573688',
    campaignName: 'Wiseguys failed payments',
    outcome: 'Answering Machine',
    dateTime: '09/12/2025 16:48',
    duration: '00:00:08',
  },
  {
    id: '7',
    agentName: 'Nic',
    customerName: 'Florence Packham',
    interactionType: 'call' as const,
    telephone: '+44795196152',
    direction: 'outbound' as const,
    subject: '+44795196152',
    campaignName: 'Ken Campaign NEW',
    outcome: 'Not Interested - NI',
    dateTime: '09/12/2025 16:47',
    duration: '00:01:22',
  },
  {
    id: '8',
    agentName: 'Mehidi',
    customerName: '',
    interactionType: 'call' as const,
    telephone: '+44782502430',
    direction: 'outbound' as const,
    subject: '+44782502430',
    campaignName: 'Wiseguys failed payments',
    outcome: 'Cancelled',
    dateTime: '09/12/2025 16:46',
    duration: '00:05:01',
  },
  {
    id: '9',
    agentName: 'Harley',
    customerName: 'Mr. Peter Hancox 01/10/2025 19/09/2025',
    interactionType: 'call' as const,
    telephone: '+44752310266',
    direction: 'outbound' as const,
    subject: '+44752310266',
    campaignName: 'Wiseguys failed payments',
    outcome: 'Answering Machine',
    dateTime: '09/12/2025 16:45',
    duration: '00:00:06',
  },
  {
    id: '10',
    agentName: 'Nic',
    customerName: 'Stewart Whitt',
    interactionType: 'call' as const,
    telephone: '+44794139809',
    direction: 'outbound' as const,
    subject: '+44794139809',
    campaignName: 'Ken Campaign NEW',
    outcome: 'Answering Machine',
    dateTime: '09/12/2025 16:41',
    duration: '00:05:00',
  },
];

const mockTasks = [
  {
    id: '1',
    agentName: 'Harley',
    customerName: 'John Smith',
    interactionType: 'call' as const,
    telephone: '+44123456789',
    direction: 'outbound' as const,
    subject: 'Follow up call',
    campaignName: 'Customer Follow-up',
    outcome: 'Scheduled',
    dateTime: '10/12/2025 09:00',
    duration: '-',
  },
];

export default function WorkPage() {
  const [selectedView, setSelectedView] = useState('Queued Interactions');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agentId, setAgentId] = useState('demo-agent');

  // Get active call from Redux
  const activeCall = useSelector((state: RootState) => state.activeCall);
  
  useEffect(() => {
    // Get agent ID from session/auth
    // For now, use a default
    setAgentId('demo-agent');
  }, []);
  
  // Handler for updating customer info
  const handleUpdateCustomerField = (field: keyof CustomerInfoCardData, value: string) => {
    // This could dispatch an action to update Redux if needed
    console.log('Update field:', field, value);
  };

  const getCurrentData = () => {
    switch (selectedView) {
      case 'My Interactions':
        return []; // Empty for now, will show active call interactions when available
      case 'Outcomed Interactions':
        return mockOutcomedInteractions;
      case 'Queued Interactions':
        return [];
      case 'Unallocated Interactions':
        return [];
      case 'Sent Interactions':
        return [];
      case 'Tasks':
        return mockTasks;
      case 'My Contacts':
        return [];
      default:
        return [];
    }
  };

  return (
    <MainLayout>
      <div className="flex h-full">
        {/* Work Sidebar */}
        <WorkSidebar
          selectedView={selectedView}
          onViewChange={setSelectedView}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedView === 'My Interactions' ? (
            // For My Interactions, show dialer and active call info
            <div className="flex-1 p-6 bg-gray-50">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Integrated Dialer - Always visible for manual dialing */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Manual Dialer</h2>
                    <p className="text-sm text-gray-500 mt-1">Dial a number to start an interaction</p>
                  </div>
                  <div className="p-4">
                    <TwilioClientDialer 
                      agentId={agentId}
                      callerIdNumber="+442046343130"
                    />
                  </div>
                </div>

                {/* Customer Info Card - Only visible during active call */}
                {activeCall.isActive && activeCall.customerInfo ? (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Call</h2>
                    <CustomerInfoCard
                      customerData={{
                        id: activeCall.customerInfo.id,
                        firstName: activeCall.customerInfo.firstName || '',
                        lastName: activeCall.customerInfo.lastName || '',
                        phoneNumber: activeCall.phoneNumber || '',
                        email: activeCall.customerInfo.email,
                        address: activeCall.customerInfo.address,
                        notes: activeCall.customerInfo.notes,
                        callStartTime: activeCall.callStartTime || new Date(),
                        callDuration: activeCall.callDuration,
                        callStatus: activeCall.callStatus
                      }}
                      onUpdateField={handleUpdateCustomerField}
                      onSave={() => console.log('Save customer info')}
                    />
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                    <div className="text-center">
                      <PhoneIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-xl font-medium text-gray-900 mb-2">No Active Interactions</h3>
                      <p className="text-gray-500">Use the dialer above to start a call</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-semibold text-gray-900">
                      {selectedView}
                    </h1>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kennex-500"
                      >
                        <FunnelIcon className="h-4 w-4 mr-2" />
                        Filter
                      </button>
                      <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kennex-500">
                        <ArrowsUpDownIcon className="h-4 w-4 mr-2" />
                        Sort
                      </button>
                      <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kennex-500">
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                        Refresh
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {/* Search */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search interactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-80 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-kennex-500 focus:border-kennex-500"
                      />
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-kennex-600 hover:bg-kennex-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kennex-500">
                        Export
                      </button>
                      <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-kennex-600 hover:bg-kennex-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kennex-500">
                        Actions
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date Range
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500 sm:text-sm">
                          <option>Today</option>
                          <option>Yesterday</option>
                          <option>This Week</option>
                          <option>This Month</option>
                          <option>Custom Range</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Campaign
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500 sm:text-sm">
                          <option>All Campaigns</option>
                          <option>Wiseguys failed payments</option>
                          <option>Ken Campaign NEW</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Outcome
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500 sm:text-sm">
                          <option>All Outcomes</option>
                          <option>Answering Machine</option>
                          <option>Not Interested - NI</option>
                          <option>Connected</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Agent
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500 sm:text-sm">
                          <option>All Agents</option>
                          <option>Harley</option>
                          <option>Nic</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden">
                <InteractionTable
                  data={getCurrentData()}
                  section={selectedView}
                  searchTerm={searchTerm}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}