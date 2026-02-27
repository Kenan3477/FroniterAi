/**
 * Customer Info Card
 * Displays in Work Items tab under My Interactions during active call
 */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/contexts/AuthContext';
import { endCall, clearCall, holdCall } from '@/store/slices/activeCallSlice';
import { RootState } from '@/store';
import { CallTransferModal } from '@/components/ui/CallTransferModal';
import { DispositionCard, DispositionData } from '@/components/dialer/DispositionCard';
import { 
  PhoneIcon, 
  EnvelopeIcon, 
  MapPinIcon, 
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  PhoneXMarkIcon,
  ArrowsRightLeftIcon,
  PauseIcon
} from '@heroicons/react/24/outline';

export interface CustomerInfoCardData {
  id?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  notes?: string;
  callStartTime: Date;
  callDuration: number;
  callStatus: 'ringing' | 'connected' | 'ended';
}

interface CustomerInfoCardProps {
  customerData: CustomerInfoCardData;
  onUpdateField: (field: keyof CustomerInfoCardData, value: string) => void;
  onSave?: () => void;
  onCallCompleted?: () => void; // NEW: Callback to refresh data after call completion
}

export const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({
  customerData,
  onUpdateField,
  onSave,
  onCallCompleted
}) => {
  const [isEditing, setIsEditing] = useState(!customerData.id); // Auto-edit if new customer
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const dispatch = useDispatch();
  const activeCallState = useSelector((state: RootState) => state.activeCall);
  
  // Get authenticated user for agent ID
  const { user } = useAuth();
  const agentId = user?.id?.toString() || user?.username || 'demo-agent';

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Call control functions
  const handleEndCall = async () => {
    if (confirm('Are you sure you want to end this call?')) {
      try {
        // Terminate the actual WebRTC call first
        const callTerminated = (window as any).omnivoxTerminateCall?.() || false;
        
        if (callTerminated) {
          console.log('✅ WebRTC call terminated successfully');
        } else {
          console.warn('⚠️ No active WebRTC call found to terminate');
        }
        
        // Show disposition modal instead of immediately ending call
        console.log('📋 Showing disposition modal for call outcome...');
        setShowDispositionModal(true);
        
      } catch (error) {
        console.error('❌ Error terminating WebRTC call:', error);
        alert('❌ Error ending call. Please try again.');
      }
    }
  };

  // Handle disposition submission
  const handleDispositionSubmit = async (dispositionData: DispositionData) => {
    try {
      console.log('📋 Submitting call disposition:', dispositionData);
      
      // Get call information from Redux state  
      const callSid = activeCallState?.callSid;
      const callStartTime = activeCallState?.callStartTime;
      
      // Calculate call duration
      const callDuration = callStartTime 
        ? Math.floor((new Date().getTime() - new Date(callStartTime).getTime()) / 1000)
        : customerData.callDuration || 0;
      
      console.log('📞 Ending call with backend API:', { callSid, duration: callDuration });
      
      // End the call through backend API if we have a callSid
      if (callSid) {
        const response = await fetch('/api/dialer/end', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ 
            callSid: callSid,
            duration: callDuration,
            status: 'completed',
            disposition: dispositionData.outcome
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Call ended successfully via backend API');
        } else {
          console.error('❌ Backend call end failed:', result.error);
        }
      }
      
      // Save call data with disposition
      const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://froniterai-production.up.railway.app'}/api/calls/save-call-data`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          callSid: callSid, // Add required recording evidence
          phoneNumber: customerData.phoneNumber,
          customerInfo: customerData,
          disposition: dispositionData,
          callDuration: callDuration,
          agentId: String(agentId), // Convert to string for database compatibility
          campaignId: 'manual-dial'
        })
      });

      const saveResult = await saveResponse.json();
      
      if (saveResult.success) {
        console.log('✅ Call data and disposition saved successfully');
        
        // Update Redux state
        dispatch(endCall());
        
        // Close disposition modal
        setShowDispositionModal(false);
        
        // Refresh work page data
        if (onCallCompleted) {
          console.log('🔄 Triggering data refresh after call completion...');
          onCallCompleted();
        }
        
        // Optionally clear call state after a delay
        setTimeout(() => {
          dispatch(clearCall());
        }, 1000);
        
      } else {
        console.error('❌ Failed to save call data:', saveResult.error);
        alert('Failed to save call disposition. Please try again.');
        return;
      }
      
    } catch (error) {
      console.error('❌ Error handling call disposition:', error);
      alert('Error saving call disposition. Please try again.');
    }
  };

  const handleTransferCall = () => {
    setShowTransferModal(true);
  };

  const handleTransferConfirm = async (transferType: 'queue' | 'agent' | 'external', targetId: string, targetName: string) => {
    setIsTransferring(true);
    
    try {
      const callId = activeCallState?.callSid || customerData.id;
      const agentId = localStorage.getItem('agentId') || 'current-agent';
      
      console.log(`📞 Transferring call ${callId} to ${transferType}: ${targetId} (${targetName})`);
      
      const response = await fetch('/api/calls/inbound-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          callId,
          transferType,
          targetId,
          agentId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Call transferred successfully:', result.data);
        
        // Notify user of successful transfer
        alert(`✅ Call successfully transferred to ${targetName}`);
        
        // Close transfer modal
        setShowTransferModal(false);
        
        // Update call state in Redux to reflect transfer
        // In a real implementation, this might trigger a state change or call end
        
      } else {
        console.error('❌ Transfer failed:', result.error);
        alert(`❌ Transfer failed: ${result.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('❌ Error transferring call:', error);
      alert('❌ Error transferring call. Please try again.');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleHoldCall = async () => {
    try {
      const callId = activeCallState?.callSid || customerData.id;
      
      if (!callId) {
        alert('❌ No active call to put on hold');
        return;
      }
      
      console.log(`📞 Putting call ${callId} on hold`);
      
      // Check if call is already on hold
      const isOnHold = activeCallState?.isOnHold;
      
      const response = await fetch('/api/calls/hold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          callId,
          action: isOnHold ? 'unhold' : 'hold'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const action = isOnHold ? 'resumed' : 'placed on hold';
        console.log(`✅ Call ${action} successfully`);
        
        // Update Redux state to reflect hold status
        dispatch(holdCall(!isOnHold));
        
      } else {
        console.error('❌ Hold operation failed:', result.error);
        alert(`❌ Failed to ${isOnHold ? 'resume' : 'hold'} call: ${result.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('❌ Error with hold operation:', error);
      alert('❌ Error with hold operation. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ringing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'connected':
        return 'bg-green-100 text-slate-800 border-slate-300';
      case 'ended':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    onSave?.();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border-2 border-blue-300 p-6 mb-4">
      {/* Header with Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <PhoneIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Active Call
            </h3>
            <p className="text-sm text-gray-600">
              Customer Information
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(customerData.callStatus)}`}>
            {customerData.callStatus.toUpperCase()}
          </span>
          {customerData.callStatus === 'connected' && (
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <ClockIcon className="w-4 h-4" />
              <span>{formatDuration(customerData.callDuration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Customer Details */}
      <div className="space-y-4">
        {/* Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              First Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={customerData.firstName}
                onChange={(e) => onUpdateField('firstName', e.target.value)}
                placeholder="Enter first name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm font-medium text-gray-900">
                {customerData.firstName || '—'}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Last Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={customerData.lastName}
                onChange={(e) => onUpdateField('lastName', e.target.value)}
                placeholder="Enter last name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm font-medium text-gray-900">
                {customerData.lastName || '—'}
              </p>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-start space-x-2">
          <PhoneIcon className="w-4 h-4 text-gray-400 mt-1" />
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Phone Number
            </label>
            <p className="text-sm font-medium text-gray-900">
              {customerData.phoneNumber}
            </p>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-start space-x-2">
          <EnvelopeIcon className="w-4 h-4 text-gray-400 mt-1" />
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Email
            </label>
            {isEditing ? (
              <input
                type="email"
                value={customerData.email || ''}
                onChange={(e) => onUpdateField('email', e.target.value)}
                placeholder="Enter email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm text-gray-900">
                {customerData.email || '—'}
              </p>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start space-x-2">
          <MapPinIcon className="w-4 h-4 text-gray-400 mt-1" />
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Address
            </label>
            {isEditing ? (
              <textarea
                value={customerData.address || ''}
                onChange={(e) => onUpdateField('address', e.target.value)}
                placeholder="Enter address"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm text-gray-900">
                {customerData.address || '—'}
              </p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="flex items-start space-x-2">
          <UserIcon className="w-4 h-4 text-gray-400 mt-1" />
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Notes
            </label>
            {isEditing ? (
              <textarea
                value={customerData.notes || ''}
                onChange={(e) => onUpdateField('notes', e.target.value)}
                placeholder="Enter notes about the customer"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {customerData.notes || '—'}
              </p>
            )}
          </div>
        </div>

        {/* Customer Status */}
        {customerData.id ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <CheckCircleIcon className="w-4 h-4 inline mr-1" />
              Existing customer record
            </p>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              New customer - information will be saved when call ends
            </p>
          </div>
        )}

        {/* Call Control Buttons */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Call Controls</h4>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleHoldCall}
              className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeCallState?.isOnHold
                  ? 'bg-green-100 hover:bg-green-200 text-green-800'
                  : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'
              }`}
            >
              <PauseIcon className="w-4 h-4 mr-1" />
              {activeCallState?.isOnHold ? 'Resume' : 'Hold'}
            </button>
            <button
              onClick={handleTransferCall}
              className="flex items-center justify-center px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md text-sm font-medium transition-colors"
            >
              <ArrowsRightLeftIcon className="w-4 h-4 mr-1" />
              Transfer
            </button>
            <button
              onClick={handleEndCall}
              className="flex items-center justify-center px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md text-sm font-medium transition-colors"
            >
              <PhoneXMarkIcon className="w-4 h-4 mr-1" />
              End Call
            </button>
          </div>
        </div>

        {/* Edit/Save Button */}
        <div className="pt-4">
          {isEditing ? (
            <button
              onClick={handleSave}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-medium transition-colors"
            >
              Edit Information
            </button>
          )}
        </div>
      </div>
      
      {/* Transfer Modal */}
      <CallTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransfer={handleTransferConfirm}
        callId={activeCallState?.callSid || customerData.id || ''}
        isTransferring={isTransferring}
      />
      
      {/* Disposition Modal */}
      {showDispositionModal && (
        <DispositionCard
          isOpen={showDispositionModal}
          onClose={() => setShowDispositionModal(false)}
          onSave={handleDispositionSubmit}
          customerInfo={{
            name: `${customerData.firstName} ${customerData.lastName}`.trim() || 'Unknown',
            phoneNumber: customerData.phoneNumber
          }}
          callDuration={customerData.callDuration}
        />
      )}
    </div>
  );
};
