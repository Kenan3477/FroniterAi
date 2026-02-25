'use client';

import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout';
import WorkSidebar from '@/components/work/WorkSidebar';
import InteractionTable from '@/components/work/InteractionTable';
import { CustomerInfoCard, CustomerInfoCardData } from '@/components/work/CustomerInfoCard';
import { RestApiDialer } from '@/components/dialer/RestApiDialer';
import { PreviewContactCard, PreviewContact } from '@/components/work/PreviewContactCard';
import PauseReasonModal from '@/components/agent/PauseReasonModal';
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
  
  // Get auth context data
  const { user, currentCampaign, agentStatus, updateAgentStatus } = useAuth();
  
  // Client-side hydration state
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Real interaction data state
  const [categorizedInteractions, setCategorizedInteractions] = useState<CategorizedInteractions>({
    queued: [],
    allocated: [],
    outcomed: [],
    unallocated: [],
    counts: { queued: 0, allocated: 0, outcomed: 0, unallocated: 0 }
  });
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);

  // Preview Dialing State - use AuthContext agent status instead of local state
  const agentAvailable = agentStatus === 'Available';
  const [previewContact, setPreviewContact] = useState<PreviewContact | null>(null);
  const [isLoadingContact, setIsLoadingContact] = useState(false);
  const [showPreviewCard, setShowPreviewCard] = useState(false);
  const [previewDialingPaused, setPreviewDialingPaused] = useState(false);
  const [autoDialerPaused, setAutoDialerPaused] = useState(false);
  
  // Auto-dialer should be considered paused if agent is not available
  const isAutoDialerEffectivelyPaused = autoDialerPaused || !agentAvailable;
  const autoDialerStatusText = !agentAvailable ? 'Agent Unavailable' : (autoDialerPaused ? 'Paused' : 'Active');
  const autoDialerStatusColor = !agentAvailable ? 'bg-red-500' : (autoDialerPaused ? 'bg-yellow-500' : 'bg-green-500');
  
  // Pause reason modal state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pendingPauseAction, setPendingPauseAction] = useState<{
    type: 'preview_pause' | 'auto_dial_pause';
    resolve: (confirmed: boolean) => void;
  } | null>(null);
  
  // Ref to prevent infinite loops in preview contact fetching
  const fetchingContactRef = useRef(false);

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

  // Auto-pause dialer when agent becomes unavailable
  useEffect(() => {
    if (!agentAvailable && !autoDialerPaused) {
      // Agent became unavailable, automatically pause the auto-dialer
      console.log('🔄 Agent status changed to unavailable, auto-pausing dialer');
      setAutoDialerPaused(true);
    }
    // Note: We don't auto-resume when agent becomes available, as they may want to control this manually
  }, [agentAvailable, autoDialerPaused]);

  // Load real interaction data from backend
  const loadInteractionData = useCallback(async () => {
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
  }, [agentId]);

  // Load interaction data when view changes or component mounts
  useEffect(() => {
    loadInteractionData();
  }, [selectedView, loadInteractionData]);

  // Preview Dialing Functions - define before useEffect that uses it
  const fetchNextPreviewContact = useCallback(async () => {
    if (fetchingContactRef.current) {
      console.log('⏳ Already fetching contact, skipping...');
      return;
    }
    
    if (!currentCampaign) {
      console.log('❌ No current campaign available for Preview Dialing');
      return;
    }
    
    // Check if current campaign is set to Preview mode
    const isPreviewMode = currentCampaign.dialMethod === 'MANUAL_PREVIEW';
    
    if (!isPreviewMode) {
      console.log(`❌ Campaign ${currentCampaign.name} is not in Preview mode (${currentCampaign.dialMethod})`);
      return;
    }
    
    console.log('🔍 Fetching next preview contact for campaign:', currentCampaign);
    setIsLoadingContact(true);
    fetchingContactRef.current = true;
    
    try {
      // For Preview Dialing, we need to use the backend dial queue API
      // First try to get next contact from dial queue
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dial-queue/next`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaignId: currentCampaign.campaignId,
          agentId: 'agent-1' // TODO: Get actual agent ID from auth context
        })
      });

      console.log('📡 Queue fetch response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Queue data received:', data);
        
        if (data.success && data.data?.contact) {
          // Get next contact from dial queue response  
          const contact = data.data.contact;
          const queueEntry = data.data.queueEntry;
          console.log('🎯 Next contact from queue:', contact);
          console.log('🔍 Contact ID analysis:', {
            contactId: contact.id,
            contactIdType: typeof contact.id,
            contactIdNotUndefined: contact.id !== undefined,
            contactIdNotNull: contact.id !== null,
            contactIdNotUnknown: contact.id !== 'unknown',
            contactIdString: String(contact.id)
          });
          
          console.log('🔍 DIRECT CONTACT VALUES:');
          console.log('   - contact.id:', contact.id);
          console.log('   - typeof contact.id:', typeof contact.id);
          console.log('   - contact.firstName:', contact.firstName);
          console.log('   - contact.lastName:', contact.lastName);
          console.log('   - contact.phone:', contact.phone);
          
          // Generate a proper ID if none exists
          const effectiveId = contact.id || contact.contactId || `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          console.log('🔧 Generating effective ID:', {
            originalId: contact.id,
            contactId: contact.contactId,
            generatedId: effectiveId
          });

          setPreviewContact({
            id: effectiveId,
            contactId: contact.contactId || effectiveId,
            queueId: queueEntry?.id || 'unknown',
            firstName: contact.firstName || '',
            lastName: contact.lastName || '',
            fullName: contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
            phone: contact.phone || '',
            mobile: contact.mobile,
            workPhone: contact.workPhone,
            homePhone: contact.homePhone,
            email: contact.email,
            company: contact.company,
            jobTitle: contact.jobTitle,
            department: contact.department,
            industry: contact.industry,
            address: contact.address,
            address2: contact.address2,
            city: contact.city,
            state: contact.state,
            zipCode: contact.zipCode,
            country: contact.country,
            website: contact.website,
            linkedIn: contact.linkedIn,
            notes: contact.notes,
            tags: contact.tags,
            leadSource: contact.leadSource,
            leadScore: contact.leadScore,
            deliveryDate: contact.deliveryDate,
            ageRange: contact.ageRange,
            residentialStatus: contact.residentialStatus,
            custom1: contact.custom1,
            custom2: contact.custom2,
            custom3: contact.custom3,
            custom4: contact.custom4,
            custom5: contact.custom5,
            attemptCount: contact.attemptCount || 0,
            maxAttempts: contact.maxAttempts || 3,
            lastAttempt: contact.lastAttempt,
            nextAttempt: contact.nextAttempt,
            lastOutcome: contact.lastOutcome,
            priority: contact.priority || 3,
            status: contact.status || 'pending',
            campaignId: contact.campaignId || '',
            listId: contact.listId || ''
          });
          
          // Use startTransition to ensure state updates are batched
          startTransition(() => {
            setShowPreviewCard(true);
          });
          
          console.log('✅ Preview contact card will be shown with contact:', {
            id: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            phone: contact.phone,
            queueId: queueEntry?.id
          });
          console.log('🔧 State after setting - note: state updates are async');
        } else {
          console.log('📭 No contacts available in queue:', data);
          // Agent availability is managed by AuthContext, not local state
        }
      } else {
        const errorData = await response.text();
        console.error('❌ Failed to fetch next contact:', response.status, errorData);
      }
    } catch (error) {
      console.error('💥 Error fetching next contact:', error);
    } finally {
      setIsLoadingContact(false);
      fetchingContactRef.current = false;
    }
  }, [currentCampaign, isClient]);

  // Handle agent availability for Preview Dialing - simplified to avoid infinite loops
  useEffect(() => {
    console.log('🎯 Preview Dialing useEffect triggered:', {
      agentAvailable,
      currentCampaign: currentCampaign?.name,
      dialMethod: currentCampaign?.dialMethod,
      showPreviewCard,
      isLoadingContact,
      fetchingInProgress: fetchingContactRef.current,
      previewDialingPaused
    });
    
    // Only fetch if agent is available, campaign is preview mode, no card showing, not already loading, and not paused
    if (agentAvailable && 
        currentCampaign?.dialMethod === 'MANUAL_PREVIEW' && 
        !showPreviewCard && 
        !isLoadingContact && 
        !fetchingContactRef.current &&
        !previewDialingPaused) {
      console.log('🚀 Triggering fetchNextPreviewContact...');
      fetchNextPreviewContact();
    }
  }, [agentAvailable, currentCampaign?.dialMethod, showPreviewCard, isLoadingContact, previewDialingPaused]);

  // Debug Preview Card state
  useEffect(() => {
    console.log('🔍 Preview Card State Debug - DIRECT VALUES:');
    console.log('   - previewContact exists:', !!previewContact);
    console.log('   - previewContact.id:', previewContact?.id);
    console.log('   - previewContact.firstName:', previewContact?.firstName);
    console.log('   - previewContact.phone:', previewContact?.phone);
    console.log('   - showPreviewCard:', showPreviewCard);
    console.log('   - typeof showPreviewCard:', typeof showPreviewCard);
    console.log('   - agentAvailable:', agentAvailable);
    console.log('   - currentCampaign name:', currentCampaign?.name);
  }, [previewContact, showPreviewCard, agentAvailable, currentCampaign]);

  // Track showPreviewCard state changes specifically
  useEffect(() => {
    console.log('🎯 showPreviewCard state changed to:', showPreviewCard);
  }, [showPreviewCard]);

  // Sync preview dialing pause state with agent status
  useEffect(() => {
    if (agentStatus === 'Available' && previewDialingPaused) {
      console.log('📍 Agent set to Available - resuming preview dialing');
      setPreviewDialingPaused(false);
    } else if (agentStatus !== 'Available' && !previewDialingPaused && currentCampaign?.dialMethod === 'MANUAL_PREVIEW') {
      console.log('📍 Agent set to non-Available - pausing preview dialing');
      setPreviewDialingPaused(true);
    }
  }, [agentStatus, previewDialingPaused, currentCampaign?.dialMethod]);

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
          'Authorization': isClient ? `Bearer ${localStorage.getItem('authToken') || ''}` : ''
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
      
      // Clear current contact - auto-fetch will continue if agent is available
      setPreviewContact(null);
      
      console.log('✅ Call initiated, auto-fetch will continue after call completion');
      
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
      
      // Clear current contact and allow auto-fetch to continue
      setPreviewContact(null);
      
      console.log('✅ Contact skipped, auto-fetch will continue if agent is available');
      
    } catch (error) {
      console.error('Error skipping contact:', error);
    }
  };

  const handleAgentAvailabilityChange = async (available: boolean) => {
    // Use AuthContext to update agent status instead of local state
    try {
      await updateAgentStatus(available ? 'Available' : 'Unavailable');
    } catch (error) {
      console.error('Failed to update agent status:', error);
    }
    
    if (!available) {
      // Agent went unavailable - hide any preview cards
      setShowPreviewCard(false);
      setPreviewContact(null);
    }
  };

  // Pause reason handling functions
  const handlePauseWithReason = (type: 'preview_pause' | 'auto_dial_pause'): Promise<boolean> => {
    return new Promise((resolve) => {
      setPendingPauseAction({ type, resolve });
      setShowPauseModal(true);
    });
  };

  const handlePauseConfirm = async (reason: string, comment?: string) => {
    try {
      if (!user?.id || !pendingPauseAction) return;

      // Start pause event tracking
      const pauseEventResponse = await fetch('/api/pause-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('omnivox_token') || localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          agentId: user.id,
          eventType: pendingPauseAction.type,
          pauseReason: reason,
          pauseCategory: getPauseCategory(reason),
          agentComment: comment,
          metadata: {
            previousStatus: agentStatus,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (pauseEventResponse.ok) {
        const pauseEventData = await pauseEventResponse.json();
        console.log('✅ Pause event started:', pauseEventData);
      }

      // Confirm the pause action
      pendingPauseAction.resolve(true);

    } catch (error) {
      console.error('❌ Error handling pause:', error);
      alert('Failed to record pause reason. Please try again.');
      pendingPauseAction?.resolve(false);
    } finally {
      setShowPauseModal(false);
      setPendingPauseAction(null);
    }
  };

  const handlePauseCancel = () => {
    pendingPauseAction?.resolve(false);
    setShowPauseModal(false);
    setPendingPauseAction(null);
  };

  const getPauseCategory = (reason: string): string => {
    if (reason.toLowerCase().includes('toilet') || reason.toLowerCase().includes('personal')) return 'personal';
    if (reason.toLowerCase().includes('lunch') || reason.toLowerCase().includes('break time') || reason.toLowerCase().includes('home')) return 'scheduled';
    if (reason.toLowerCase().includes('training') || reason.toLowerCase().includes('meeting')) return 'work';
    if (reason.toLowerCase().includes('technical') || reason.toLowerCase().includes('system')) return 'technical';
    return 'other';
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
    <>
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
                
                {/* Auto Dialer Controls */}
                {!activeCall.isActive && currentCampaign && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Auto Dialer</h3>
                        <p className="text-sm text-gray-600">
                          Campaign: {currentCampaign.name} • {currentCampaign.dialMethod}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <div className={`h-3 w-3 rounded-full ${autoDialerStatusColor}`}></div>
                          <span className="text-sm font-medium text-gray-700">
                            {autoDialerStatusText}
                          </span>
                          {!agentAvailable && (
                            <span className="text-xs text-gray-500">
                              (Set status to Available to enable)
                            </span>
                          )}
                        </div>
                        
                        <button
                          onClick={async () => {
                            // Only allow manual pause/resume when agent is available
                            if (!agentAvailable) {
                              alert('Please set your status to Available first');
                              return;
                            }
                            
                            if (!autoDialerPaused) {
                              // Pausing: show reason modal
                              console.log('⏸️ Auto dialer pause requested - showing reason modal');
                              const confirmed = await handlePauseWithReason('auto_dial_pause');
                              
                              if (confirmed) {
                                setAutoDialerPaused(true);
                                console.log('⏸️ Auto dialer paused');
                              }
                            } else {
                              // Resuming: no reason needed
                              setAutoDialerPaused(false);
                              console.log('▶️ Auto dialer resumed');
                            }
                          }}
                          disabled={!agentAvailable}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            !agentAvailable 
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : autoDialerPaused
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-yellow-600 text-white hover:bg-yellow-700'
                          }`}
                        >
                          {!agentAvailable 
                            ? 'Unavailable' 
                            : autoDialerPaused ? '▶️ Resume Dialing' : '⏸️ Pause Dialing'}
                        </button>
                      </div>
                    </div>
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

      {/* Preview Contact Card - Portal Render Outside Main Layout */}
      {(() => {
        const shouldRender = previewContact && 
                            previewContact.id && 
                            previewContact.id !== 'unknown' && 
                            showPreviewCard;
        
        // TEMPORARY: Force render for testing
        const forceRender = previewContact && previewContact.id && previewContact.id !== 'unknown';
        
        console.log('🎨 PreviewContactCard render check - DIRECT VALUES:');
        console.log('   - previewContact exists:', !!previewContact);
        console.log('   - previewContact.id:', previewContact?.id);
        console.log('   - previewContact.firstName:', previewContact?.firstName);
        console.log('   - previewContact.phone:', previewContact?.phone);
        console.log('   - showPreviewCard:', showPreviewCard);
        console.log('   - typeof showPreviewCard:', typeof showPreviewCard);
        console.log('   - id !== unknown:', previewContact?.id !== 'unknown');
        console.log('   - shouldRender result:', shouldRender);
        console.log('   - forceRender result:', forceRender);
        
        if (forceRender) {
          console.log('🚀 FORCE RENDERING PreviewContactCard with full contact:', previewContact);
        } else if (shouldRender) {
          console.log('🚀 Rendering PreviewContactCard with full contact:', previewContact);
        } else {
          console.log('❌ Not rendering PreviewContactCard - missing conditions');
        }
        
        return forceRender ? (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <PreviewContactCard
              contact={previewContact}
              isVisible={true}
              onCallNow={handleCallNow}
              onSkip={handleSkip}
              onClose={() => {
                setShowPreviewCard(false);
                setPreviewContact(null);
              }}
              onPause={async (reason?: string, comment?: string) => {
                const newPausedState = !previewDialingPaused;
                
                if (newPausedState) {
                  // Pausing: reason and comment are provided by the component
                  if (reason) {
                    console.log('⏸️ Preview dialing paused with reason:', reason);
                    setPreviewDialingPaused(true);
                    console.log('⏸️ Preview dialing paused - setting status to Unavailable');
                    await updateAgentStatus('Unavailable');
                    
                    // Log the pause event with the reason
                    try {
                      const pauseEventData = {
                        agentId: user?.id || 'unknown',
                        eventType: 'preview_pause',
                        reason: reason,
                        comment: comment,
                        timestamp: new Date().toISOString()
                      };
                      
                      const response = await fetch('/api/pause-events', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('omnivox_token')}`
                        },
                        body: JSON.stringify(pauseEventData)
                      });
                      
                      if (response.ok) {
                        console.log('✅ Pause event logged successfully');
                      } else {
                        console.error('❌ Failed to log pause event:', response.statusText);
                      }
                    } catch (error) {
                      console.error('❌ Error logging pause event:', error);
                    }
                  } else {
                    console.log('❌ No pause reason provided');
                  }
                } else {
                  // Resuming: set status to Available (no reason needed for resuming)
                  setPreviewDialingPaused(false);
                  console.log('▶️ Preview dialing resumed - setting status to Available');
                  await updateAgentStatus('Available');
                }
              }}
              campaignName={currentCampaign?.name}
              isLoading={isLoadingContact}
              isPreviewPaused={previewDialingPaused}
            />
          </div>
        ) : null;
      })()}
      
      {/* Pause Reason Modal */}
      {showPauseModal && pendingPauseAction && (
        <PauseReasonModal
          isOpen={showPauseModal}
          eventType={pendingPauseAction.type}
          onConfirm={handlePauseConfirm}
          onClose={handlePauseCancel}
          title="Pause Reason Required"
          description={`Please select the reason for pausing ${
            pendingPauseAction.type === 'preview_pause' 
              ? 'preview contact dialing' 
              : 'auto dialer'
          }:`}
        />
      )}
      </MainLayout>
    </>
  );
}