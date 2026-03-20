/**
 * Enhanced Customer Info Card with Conditional Stripe Payment Integration
 * Displays customer information with optional payment portal access during calls
 */

import React, { useState, useEffect } from 'react';
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
  PauseIcon,
  CreditCard,
  DollarSign,
  History,
  ExternalLink,
  AlertCircle,
  Loader2,
  Shield
} from '@heroicons/react/24/outline';

export interface CustomerInfoCardData {
  id?: string;
  contactId?: string; // For database lookups
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  notes?: string;
  stripeCustomerId?: string;
  callStartTime: Date;
  callDuration: number;
  callStatus: 'ringing' | 'connected' | 'ended';
}

interface PaymentData {
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: number;
    description?: string;
    receiptUrl?: string;
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    items: Array<{
      price: {
        unitAmount: number;
        currency: string;
        recurring: {
          interval: string;
        };
      };
      quantity: number;
    }>;
  }>;
  paymentMethods: Array<{
    id: string;
    type: string;
    card?: {
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
    };
  }>;
}

interface StripeStatus {
  isEnabled: boolean;
  isConfigured: boolean;
  testMode: boolean;
}

interface EnhancedCustomerInfoCardProps {
  customerData: CustomerInfoCardData;
  onUpdateField: (field: keyof CustomerInfoCardData, value: string) => void;
  onSave?: () => void;
  onCallCompleted?: () => void;
  callId?: string;
  isCallActive: boolean;
}

export const EnhancedCustomerInfoCard: React.FC<EnhancedCustomerInfoCardProps> = ({
  customerData,
  onUpdateField,
  onSave,
  onCallCompleted,
  callId,
  isCallActive
}) => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const activeCallState = useSelector((state: RootState) => state.activeCall);

  // Original states
  const [isEditing, setIsEditing] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);

  // New Stripe-related states
  const [activeTab, setActiveTab] = useState<'contact' | 'payment'>('contact');
  const [paymentData, setPaymentData] = useState<PaymentData>({ 
    payments: [], 
    subscriptions: [],
    paymentMethods: []
  });
  const [stripeStatus, setStripeStatus] = useState<StripeStatus>({
    isEnabled: false,
    isConfigured: false,
    testMode: true
  });
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingStripeStatus, setLoadingStripeStatus] = useState(true);
  const [stripePortalLoading, setStripePortalLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    // Check Stripe status on component mount
    checkStripeStatus();
  }, []);

  useEffect(() => {
    // Fetch payment data when payment tab is active and Stripe is enabled
    if (activeTab === 'payment' && stripeStatus.isEnabled) {
      fetchPaymentHistory();
    }
  }, [activeTab, customerData.contactId, stripeStatus.isEnabled]);

  const checkStripeStatus = async () => {
    setLoadingStripeStatus(true);
    try {
      const response = await fetch('/api/stripe/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setStripeStatus({
          isEnabled: data.isEnabled,
          isConfigured: data.isConfigured,
          testMode: data.testMode
        });
      }
    } catch (error) {
      console.error('Failed to check Stripe status:', error);
    } finally {
      setLoadingStripeStatus(false);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!customerData.contactId) return;
    
    setLoadingPayments(true);
    setPaymentError(null);
    try {
      const response = await fetch(`/api/stripe/customer/${customerData.contactId}/payments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setPaymentData({
          payments: data.payments || [],
          subscriptions: data.subscriptions || [],
          paymentMethods: data.paymentMethods || []
        });
        
        if (data.error) {
          setPaymentError(data.error);
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
      setPaymentError('Failed to load payment history');
    } finally {
      setLoadingPayments(false);
    }
  };

  const openStripePortal = async () => {
    if (!isCallActive) {
      alert('Payment portal is only available during active calls');
      return;
    }
    
    setStripePortalLoading(true);
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          customerId: customerData.contactId || customerData.id,
          callId: callId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Open Stripe portal in new window/tab
        window.open(
          data.portalUrl,
          'stripe-portal',
          'width=1024,height=768,scrollbars=yes,resizable=yes,location=yes'
        );
      } else {
        throw new Error(data.error || 'Failed to create portal session');
      }
    } catch (error) {
      console.error('Failed to open Stripe portal:', error);
      alert(`Unable to open payment portal: ${error.message}`);
    } finally {
      setStripePortalLoading(false);
    }
  };

  // Original helper functions
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  // Payment helper functions
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
      case 'active':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'failed':
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Original event handlers (keeping existing functionality)
  const handleHoldCall = async () => {
    try {
      dispatch(holdCall());
    } catch (error) {
      console.error('Failed to hold call:', error);
    }
  };

  const handleTransferCall = () => {
    setShowTransferModal(true);
  };

  const handleTransferConfirm = async (targetAgent: string, notes?: string) => {
    setIsTransferring(true);
    try {
      // Transfer logic here
      console.log('Transferring call to:', targetAgent, notes);
    } catch (error) {
      console.error('Transfer failed:', error);
    } finally {
      setIsTransferring(false);
      setShowTransferModal(false);
    }
  };

  const handleEndCall = () => {
    setShowDispositionModal(true);
  };

  const handleDispositionSubmit = async (dispositionData: DispositionData) => {
    setIsEndingCall(true);
    try {
      // End call logic with disposition
      dispatch(endCall());
      onCallCompleted?.();
    } catch (error) {
      console.error('Failed to end call:', error);
    } finally {
      setIsEndingCall(false);
      setShowDispositionModal(false);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    onSave?.();
  };

  // Don't show payment tab if Stripe is not enabled
  const showPaymentTab = stripeStatus.isEnabled && stripeStatus.isConfigured;

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

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('contact')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'contact'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserIcon className="inline w-4 h-4 mr-1" />
          Contact Info
        </button>
        
        {showPaymentTab && (
          <button
            onClick={() => setActiveTab('payment')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'payment'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard className="inline w-4 h-4 mr-1" />
            Payments
            {stripeStatus.testMode && (
              <span className="ml-1 text-xs bg-yellow-100 text-yellow-600 px-1 rounded">
                TEST
              </span>
            )}
          </button>
        )}
        
        {loadingStripeStatus && (
          <div className="flex items-center px-2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'contact' && (
        <div className="space-y-4">
          {/* Customer Details (existing functionality) */}
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
      )}

      {/* Payment Tab Content */}
      {activeTab === 'payment' && showPaymentTab && (
        <div className="space-y-4">
          {/* Stripe Portal Button */}
          <div className={`border rounded-lg p-4 ${
            stripeStatus.testMode 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`font-medium ${
                  stripeStatus.testMode ? 'text-yellow-900' : 'text-blue-900'
                }`}>
                  Payment Portal
                  {stripeStatus.testMode && (
                    <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                      TEST MODE
                    </span>
                  )}
                </h4>
                <p className={`text-sm ${
                  stripeStatus.testMode ? 'text-yellow-700' : 'text-blue-700'
                }`}>
                  Open secure payment portal for this customer
                </p>
              </div>
              <button
                onClick={openStripePortal}
                disabled={stripePortalLoading || !isCallActive}
                className={`flex items-center px-4 py-2 rounded-md text-white font-medium transition-colors ${
                  stripePortalLoading || !isCallActive
                    ? 'bg-gray-400 cursor-not-allowed'
                    : stripeStatus.testMode
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {stripePortalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                {stripePortalLoading ? 'Opening...' : 'Open Portal'}
              </button>
            </div>
            
            {!isCallActive && (
              <div className="mt-2 flex items-center text-orange-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                <p className="text-xs">Payment portal available only during active calls</p>
              </div>
            )}
          </div>
          
          {/* Payment History */}
          {loadingPayments ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {paymentError && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-yellow-500 mr-2" />
                    <p className="text-sm text-yellow-700">{paymentError}</p>
                  </div>
                </div>
              )}
              
              {/* Recent Payments */}
              {paymentData.payments.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Recent Payments
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {paymentData.payments.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <span className={`inline-block w-2 h-2 rounded-full mr-3 ${getPaymentStatusColor(payment.status)}`}></span>
                          <div>
                            <span className="text-sm font-medium">
                              {formatCurrency(payment.amount, payment.currency)}
                            </span>
                            {payment.description && (
                              <p className="text-xs text-gray-500">{payment.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {formatDate(payment.created)}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            payment.status === 'succeeded' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No payment history message */}
              {paymentData.payments.length === 0 && paymentData.subscriptions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No payment history found</p>
                  <p className="text-xs">Customer may not have made any payments yet</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Transfer Modal */}
      <CallTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransfer={handleTransferConfirm}
        callId={callId || customerData.id || ''}
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