'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { MainLayout } from '@/components/layout';
import WorkSidebar from '@/components/work/WorkSidebar';
import InteractionTable from '@/components/work/InteractionTable';
import { CustomerInfoCard, CustomerInfoCardData } from '@/components/work/CustomerInfoCard';
import { RestApiDialer } from '@/components/dialer/RestApiDialer';
import { RootState } from '@/store';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  ArrowPathIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { getOutcomedInteractions, getActiveInteractions, InteractionData } from '@/services/interactionService';

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
  
  // Real interaction data state
  const [outcomedInteractions, setOutcomedInteractions] = useState<InteractionData[]>([]);
  const [activeInteractions, setActiveInteractions] = useState<InteractionData[]>([]);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);

  // Get active call from Redux
  const activeCall = useSelector((state: RootState) => state.activeCall);
  
  useEffect(() => {
    // Get agent ID from session/auth
    // For now, use a default
    setAgentId('demo-agent');
  }, []);

  // Load interaction data when view changes or component mounts
  useEffect(() => {
    if (selectedView === 'Outcomed Interactions' || selectedView === 'My Interactions') {
      loadInteractionData();
    }
  }, [selectedView, agentId]);

  // Load real interaction data from backend
  const loadInteractionData = async () => {
    setIsLoadingInteractions(true);
    try {
      if (selectedView === 'Outcomed Interactions') {
        const interactions = await getOutcomedInteractions(agentId);
        setOutcomedInteractions(interactions);
      } else if (selectedView === 'My Interactions') {
        const interactions = await getActiveInteractions(agentId);
        setActiveInteractions(interactions);
      }
    } catch (error) {
      console.error('Failed to load interaction data:', error);
    } finally {
      setIsLoadingInteractions(false);
    }
  };
  
  // Handler for updating customer info
  const handleUpdateCustomerField = (field: keyof CustomerInfoCardData, value: string) => {
    // This could dispatch an action to update Redux if needed
    console.log('Update field:', field, value);
  };

  const getCurrentData = () => {
    switch (selectedView) {
      case 'My Interactions':
        return activeInteractions; // Real active call data
      case 'Outcomed Interactions':
        return outcomedInteractions; // Real completed call data only - no mock data
      case 'Queued Interactions':
        return [];
      case 'Unallocated Interactions':
        return [];
      case 'Sent Interactions':
        return [];
      case 'Tasks':
        return mockTasks;
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
          outcomedInteractionsCount={outcomedInteractions.length}
          activeInteractionsCount={activeInteractions.length}
          tasksCount={mockTasks.length}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedView === 'My Interactions' ? (
            // For My Interactions, show dialer and active call info
            <div className="flex-1 p-6 bg-gray-50">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Dialer Section */}
                <RestApiDialer 
                  onCallInitiated={(result) => {
                    console.log('REST API call result:', result);
                  }}
                />

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
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                      >
                        <FunnelIcon className="h-4 w-4 mr-2" />
                        Filter
                      </button>
                      <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
                        <ArrowsUpDownIcon className="h-4 w-4 mr-2" />
                        Sort
                      </button>
                      <button 
                        onClick={loadInteractionData}
                        disabled={isLoadingInteractions}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50"
                      >
                        <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoadingInteractions ? 'animate-spin' : ''}`} />
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
                        className="block w-80 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                      />
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
                        Export
                      </button>
                      <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
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
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
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
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
                          <option>All Campaigns</option>
                          <option>Wiseguys failed payments</option>
                          <option>Ken Campaign NEW</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Outcome
                        </label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
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
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm">
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