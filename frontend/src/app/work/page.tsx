'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MainLayout } from '@/components/layout';
import WorkSidebar from '@/components/work/WorkSidebar';
import InteractionTable from '@/components/work/InteractionTable';
import { CustomerInfoCard, CustomerInfoCardData } from '@/components/work/CustomerInfoCard';
import { RestApiDialer } from '@/components/dialer/RestApiDialer';
import { PreviewContactCard, PreviewContact } from '@/components/work/PreviewContactCard';
import { RootState } from '@/store';
import { updateCallDuration, updateCustomerInfo } from '@/store/slices/activeCallSlice';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  ArrowPathIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { getOutcomedInteractions, getActiveInteractions, getQueuedInteractions, getUnallocatedInteractions, getCategorizedInteractions, InteractionData, CategorizedInteractions } from '@/services/interactionService';

export default function WorkPage() {
  const [selectedView, setSelectedView] = useState('Queued Interactions');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agentId, setAgentId] = useState('demo-agent');
  
  // Real interaction data state
  const [categorizedInteractions, setCategorizedInteractions] = useState<CategorizedInteractions>({
    queued: [],
    allocated: [],
    outcomed: [],
    unallocated: [],
    counts: { queued: 0, allocated: 0, outcomed: 0, unallocated: 0 }
  });
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);

  // Preview Dialing State
  const [agentAvailable, setAgentAvailable] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState<any>(null);
  const [previewContact, setPreviewContact] = useState<PreviewContact | null>(null);
  const [isLoadingContact, setIsLoadingContact] = useState(false);
  const [showPreviewCard, setShowPreviewCard] = useState(false);

  // Get active call from Redux
  const activeCall = useSelector((state: RootState) => state.activeCall);
  const dispatch = useDispatch();
  
  useEffect(() => {
    // TODO: Get agent ID from authentication system
    // For now, use a session-based default
    setAgentId('current-agent');
  }, []);

  // Auto-switch to My Interactions when there's an active call
  useEffect(() => {
    if (activeCall.isActive && selectedView !== 'My Interactions') {
      console.log('🎯 Active call detected, switching to My Interactions');
      setSelectedView('My Interactions');
    }
  }, [activeCall.isActive, selectedView]);

  // Update call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (activeCall.isActive && activeCall.callStatus === 'connected' && activeCall.callStartTime) {
      interval = setInterval(() => {
        const duration = Math.floor((Date.now() - new Date(activeCall.callStartTime!).getTime()) / 1000);
        dispatch(updateCallDuration(duration));
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeCall.isActive, activeCall.callStatus, activeCall.callStartTime, dispatch]);

  // Load interaction data when view changes or component mounts
  useEffect(() => {
    loadInteractionData();
  }, [selectedView, agentId]);

  // Preview Dialing Functions - define before useEffect that uses it
  const fetchNextPreviewContact = useCallback(async () => {
    if (!currentCampaign) {
      console.log('❌ No current campaign available for Preview Dialing');
      return;
    }
    
    console.log('🔍 Fetching next preview contact for campaign:', currentCampaign);
    setIsLoadingContact(true);
    
    try {
      const response = await fetch(`/api/admin/campaign-management/campaigns/${currentCampaign.id}/queue`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      console.log('📡 Queue fetch response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Queue data received:', data);
        
        if (data.success && data.queue?.length > 0) {
          // Get next contact from queue
          const nextContact = data.queue[0];
          console.log('🎯 Next contact from queue:', nextContact);
          
          setPreviewContact({
            id: nextContact.id,
            contactId: nextContact.contactId,
            queueId: nextContact.queueId,
            firstName: nextContact.firstName || '',
            lastName: nextContact.lastName || '',
            fullName: nextContact.fullName,
            phone: nextContact.phone,
            mobile: nextContact.mobile,
            workPhone: nextContact.workPhone,
            homePhone: nextContact.homePhone,
            email: nextContact.email,
            company: nextContact.company,
            jobTitle: nextContact.jobTitle,
            department: nextContact.department,
            industry: nextContact.industry,
            address: nextContact.address,
            address2: nextContact.address2,
            city: nextContact.city,
            state: nextContact.state,
            zipCode: nextContact.zipCode,
            country: nextContact.country,
            website: nextContact.website,
            linkedIn: nextContact.linkedIn,
            notes: nextContact.notes,
            tags: nextContact.tags,
            leadSource: nextContact.leadSource,
            leadScore: nextContact.leadScore,
            deliveryDate: nextContact.deliveryDate,
            ageRange: nextContact.ageRange,
            residentialStatus: nextContact.residentialStatus,
            custom1: nextContact.custom1,
            custom2: nextContact.custom2,
            custom3: nextContact.custom3,
            custom4: nextContact.custom4,
            custom5: nextContact.custom5,
            attemptCount: nextContact.attemptCount || 0,
            maxAttempts: nextContact.maxAttempts || 3,
            lastAttempt: nextContact.lastAttempt,
            nextAttempt: nextContact.nextAttempt,
            lastOutcome: nextContact.lastOutcome,
            priority: nextContact.priority || 3,
            status: nextContact.status || 'pending',
            campaignId: nextContact.campaignId,
            listId: nextContact.listId
          });
          setShowPreviewCard(true);
          console.log('✅ Preview contact card will be shown');
        } else {
          console.log('📭 No contacts available in queue:', data);
          setAgentAvailable(false); // Auto-disable availability if no contacts
        }
      } else {
        const errorData = await response.text();
        console.error('❌ Failed to fetch next contact:', response.status, errorData);
      }
    } catch (error) {
      console.error('💥 Error fetching next contact:', error);
    } finally {
      setIsLoadingContact(false);
    }
  }, [currentCampaign]);

  // Handle agent availability for Preview Dialing
  useEffect(() => {
    console.log('🎯 Preview Dialing useEffect triggered:', {
      agentAvailable,
      currentCampaign: currentCampaign?.name,
      dialStrategy: currentCampaign?.dialStrategy,
      showPreviewCard
    });
    
    if (agentAvailable && currentCampaign?.dialStrategy === 'Preview' && !showPreviewCard) {
      console.log('🚀 Triggering fetchNextPreviewContact...');
      fetchNextPreviewContact();
    }
  }, [agentAvailable, currentCampaign?.dialStrategy, showPreviewCard, fetchNextPreviewContact]);

  // Get actual campaign data from the user's assigned campaigns  
  useEffect(() => {
    const fetchUserCampaign = async () => {
      try {
        const response = await fetch('/api/auth/user-campaigns', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.length > 0) {
            // Find a campaign with Preview dial strategy
            const previewCampaign = result.data.find((campaign: any) => 
              campaign.dialMethod === 'MANUAL_PREVIEW'
            );
            
            if (previewCampaign) {
              console.log('🎯 Found Preview campaign:', previewCampaign);
              setCurrentCampaign({
                id: previewCampaign.campaignId,
                name: previewCampaign.name,
                dialStrategy: 'Preview'
              });
            } else {
              // Fallback to first campaign and check if it's Preview mode
              const firstCampaign = result.data[0];
              console.log('🔍 Using first available campaign:', firstCampaign);
              setCurrentCampaign({
                id: firstCampaign.campaignId,
                name: firstCampaign.name,
                dialStrategy: firstCampaign.dialMethod === 'MANUAL_PREVIEW' ? 'Preview' : 'Manual'
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user campaigns:', error);
        // Fallback to hardcoded campaign for demo
        console.log('🎯 Using fallback campaign for demo');
        setCurrentCampaign({
          id: 'cmjlwtm260006a49neir3ui93', // DAC campaign ID from console
          name: 'DAC',
          dialStrategy: 'Preview'
        });
      }
    };
    
    fetchUserCampaign();
  }, []);

  // Load real interaction data from backend
  const loadInteractionData = async () => {
    setIsLoadingInteractions(true);
    try {
      const categorized = await getCategorizedInteractions(agentId);
      setCategorizedInteractions(categorized);
      console.log('🔄 Loaded categorized interactions:', categorized);
    } catch (error) {
      console.error('Failed to load interaction data:', error);
    } finally {
      setIsLoadingInteractions(false);
    }
  };
  
  // Handler for updating customer info
  const handleUpdateCustomerField = (field: keyof CustomerInfoCardData, value: string) => {
    // Update Redux store with new customer information
    console.log('Update field:', field, value);
    
    dispatch(updateCustomerInfo({
      [field]: value
    }));
  };

  // Handle saving customer information
  const handleSaveCustomerInfo = async () => {
    try {
      console.log('💾 Saving customer information...');
      
      if (!activeCall.isActive || !activeCall.customerInfo) {
        console.warn('⚠️ No active call or customer info to save');
        return;
      }

      // Save customer info to backend via API call
      const response = await fetch('/api/calls/save-call-data', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          phoneNumber: activeCall.phoneNumber,
          customerInfo: activeCall.customerInfo,
          callDuration: activeCall.callDuration,
          agentId: 'agent-browser', // TODO: Get real agent ID
          campaignId: 'manual-dial'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Customer information saved successfully');
        // Optionally show success message
      } else {
        console.error('❌ Failed to save customer info:', result.error);
        alert('Failed to save customer information. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error saving customer info:', error);
      alert('Error saving customer information. Please try again.');
    }
  };

  const handleCallNow = async (contact: PreviewContact, notes?: string) => {
    try {
      console.log('🎯 Initiating call to:', contact.phone, 'with notes:', notes);
      
      // Update contact notes if provided
      if (notes && notes.trim()) {
        // TODO: API call to update contact notes
      }
      
      // Hide preview card
      setShowPreviewCard(false);
      
      // Initiate call via RestApiDialer
      // The dialer will handle the actual call initiation
      // For now, simulate the call
      
      // TODO: Integrate with actual dialing system
      alert(`Calling ${contact.firstName} ${contact.lastName} at ${contact.phone}`);
      
      // Clear current contact and fetch next one if agent still available
      setPreviewContact(null);
      if (agentAvailable) {
        setTimeout(() => fetchNextPreviewContact(), 1000);
      }
      
    } catch (error) {
      console.error('Error initiating call:', error);
    }
  };

  const handleSkip = async (contact: PreviewContact, skipReason?: string) => {
    try {
      console.log('⏭️ Skipping contact:', contact.contactId, 'reason:', skipReason);
      
      // TODO: API call to record skip reason and update contact status
      
      // Hide preview card
      setShowPreviewCard(false);
      
      // Clear current contact and fetch next one if agent still available
      setPreviewContact(null);
      if (agentAvailable) {
        setTimeout(() => fetchNextPreviewContact(), 500);
      }
      
    } catch (error) {
      console.error('Error skipping contact:', error);
    }
  };

  const handleAgentAvailabilityChange = (available: boolean) => {
    setAgentAvailable(available);
    if (!available) {
      // Agent went unavailable - hide any preview cards
      setShowPreviewCard(false);
      setPreviewContact(null);
    }
  };

  const getCurrentData = () => {
    switch (selectedView) {
      case 'My Interactions':
        return categorizedInteractions.allocated; // Real active call data
      case 'Outcomed Interactions':
        return categorizedInteractions.outcomed; // Real completed call data only - no mock data
      case 'Queued Interactions':
        return categorizedInteractions.queued;
      case 'Unallocated Interactions':
        return categorizedInteractions.unallocated;
      case 'Sent Interactions':
        return [];
      case 'Tasks':
        return []; // Tasks will be implemented with real task management system
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
          outcomedInteractionsCount={categorizedInteractions.counts.outcomed}
          activeInteractionsCount={categorizedInteractions.counts.allocated}
          queuedInteractionsCount={categorizedInteractions.counts.queued}
          unallocatedInteractionsCount={categorizedInteractions.counts.unallocated}
          tasksCount={0} // Tasks will be implemented with real task management system
          agentAvailable={agentAvailable}
          onAgentAvailabilityChange={handleAgentAvailabilityChange}
          currentCampaign={currentCampaign}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedView === 'My Interactions' ? (
            // For My Interactions, show dialer and active call info
            <div className="flex-1 p-6 bg-gray-50">
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Dialer Section - Always keep RestApiDialer mounted for incoming call handling */}
                <RestApiDialer 
                  onCallInitiated={(result) => {
                    console.log('REST API call result:', result);
                  }}
                />

                {/* Debug Section for Preview Dialing */}
                {currentCampaign && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-semibold text-blue-800 mb-2">Preview Dialing Debug</h3>
                    <div className="text-xs text-blue-600 space-y-1">
                      <p><strong>Campaign:</strong> {currentCampaign.name}</p>
                      <p><strong>Dial Strategy:</strong> {currentCampaign.dialStrategy}</p>
                      <p><strong>Agent Available:</strong> {agentAvailable ? 'Yes' : 'No'}</p>
                      <p><strong>Preview Card Showing:</strong> {showPreviewCard ? 'Yes' : 'No'}</p>
                      <p><strong>Loading Contact:</strong> {isLoadingContact ? 'Yes' : 'No'}</p>
                    </div>
                    <button
                      onClick={() => {
                        console.log('🎯 Manual trigger fetchNextPreviewContact');
                        fetchNextPreviewContact();
                      }}
                      disabled={isLoadingContact}
                      className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoadingContact ? 'Loading...' : 'Test Fetch Contact'}
                    </button>
                  </div>
                )}

                {/* Show dialing interface only when no active call */}
                {!activeCall.isActive && (
                  <div className="mt-4">
                    {/* Dialer interface elements can go here if needed */}
                  </div>
                )}

                {/* Active Call Section */}
                {activeCall.isActive && activeCall.customerInfo ? (
                  <div>
                    <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-4">
                      <div className="flex items-center">
                        <div className="flex items-center">
                          <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse mr-3"></div>
                          <h2 className="text-lg font-semibold text-green-800">
                            Call Active - {activeCall.phoneNumber}
                          </h2>
                        </div>
                        <div className="ml-auto text-sm text-green-700 flex items-center space-x-4">
                          <span>
                            Duration: {Math.floor(activeCall.callDuration / 60)}:{(activeCall.callDuration % 60).toString().padStart(2, '0')}
                          </span>
                          {activeCall.callStartTime && (
                            <span>Started: {new Date(activeCall.callStartTime).toLocaleTimeString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
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
                      onSave={handleSaveCustomerInfo}
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
                  onRefresh={loadInteractionData}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preview Contact Card - Overlay */}
      <PreviewContactCard
        contact={previewContact}
        isVisible={showPreviewCard}
        onCallNow={handleCallNow}
        onSkip={handleSkip}
        onClose={() => {
          setShowPreviewCard(false);
          setPreviewContact(null);
        }}
        campaignName={currentCampaign?.name}
        isLoading={isLoadingContact}
      />
    </MainLayout>
  );
}