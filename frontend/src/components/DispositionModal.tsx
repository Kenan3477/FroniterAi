// Disposition Collection Component
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Star, Phone, AlertCircle, Calendar, DollarSign } from 'lucide-react';

interface DispositionConfig {
  id: string;
  label: string;
  type: string;
  category: string;
  outcome: string;
  description: string;
  requiresNotes: boolean;
  requiresCallback: boolean;
  allowedNextSteps: string[];
  color: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  campaignSpecific: boolean;
  metadata: Record<string, any>;
}

interface DispositionModalProps {
  callId: string;
  agentId: string;
  phoneNumber: string;
  contactId?: string;
  campaignId?: string;
  sipCallId?: string;
  callDuration: number;
  callStartTime: Date;
  callEndTime: Date;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

const DispositionModal: React.FC<DispositionModalProps> = ({
  callId,
  agentId,
  phoneNumber,
  contactId,
  campaignId,
  sipCallId,
  callDuration,
  callStartTime,
  callEndTime,
  isOpen,
  onClose,
  onSubmit
}) => {
  const [dispositions, setDispositions] = useState<DispositionConfig[]>([]);
  const [selectedDisposition, setSelectedDisposition] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [followUpTime, setFollowUpTime] = useState<string>('');
  const [followUpNotes, setFollowUpNotes] = useState<string>('');
  const [callBackNumber, setCallBackNumber] = useState<string>(phoneNumber);
  const [leadScore, setLeadScore] = useState<number>(5);
  const [saleAmount, setSaleAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Load disposition configurations
  useEffect(() => {
    const fetchDispositions = async () => {
      try {
        const authToken = localStorage.getItem('authToken') || localStorage.getItem('omnivox_token');
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://froniterai-production.up.railway.app';
        
        console.log('🔑 DispositionModal: Fetching configs with auth token:', {
          hasToken: !!authToken,
          tokenLength: authToken?.length || 0,
          tokenPreview: authToken?.substring(0, 20) + '...' || 'NO_TOKEN',
          backendUrl,
          campaignId
        });
        
        const response = await fetch(`${backendUrl}/api/dispositions/configs${campaignId ? `?campaignId=${campaignId}` : ''}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('📡 DispositionModal: Backend response status:', response.status, response.statusText);
        if (!response.ok) {
          console.error(`❌ Disposition configs request failed: ${response.status} ${response.statusText}`);
          if (response.status === 401) {
            console.error('🔑 Authentication failed - user may need to log in again');
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📋 Loaded disposition configs for DispositionModal:', data);
        
        if (data.success && data.data && Array.isArray(data.data)) {
          setDispositions(data.data);
          console.log('✅ Using real database disposition configs:', data.data.length, 'configs loaded');
        } else {
          console.warn('⚠️ Invalid disposition configs response format:', data);
        }
      } catch (error) {
        console.error('❌ Error fetching disposition configs:', error);
      }
    };

    if (isOpen) {
      fetchDispositions();
    }
  }, [isOpen, campaignId]);

  const getSelectedConfig = () => {
    return dispositions.find(d => d.id === selectedDisposition);
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'checkCircle': return CheckCircle;
      case 'xCircle': return XCircle;
      case 'clock': return Clock;
      case 'star': return Star;
      case 'phone': return Phone;
      case 'phoneOff': return Phone;
      case 'calendar': return Calendar;
      case 'ban': return XCircle;
      case 'alert': return AlertCircle;
      case 'voicemail': return Phone;
      default: return CheckCircle;
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    const config = getSelectedConfig();
    if (!config) {
      setError('Please select a disposition');
      return;
    }

    if (config.requiresNotes && !notes.trim()) {
      setError('Notes are required for this disposition');
      return;
    }

    if (config.requiresCallback && !followUpDate) {
      setError('Follow-up date is required for this disposition');
      return;
    }

    if (config.metadata.requiresSaleAmount && !saleAmount) {
      setError('Sale amount is required for this disposition');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const dispositionData = {
        callId,
        sipCallId,
        agentId,
        contactId,
        campaignId,
        phoneNumber,
        dispositionId: selectedDisposition,
        notes: notes.trim() || undefined,
        followUpDate: followUpDate && followUpTime 
          ? `${followUpDate}T${followUpTime}:00.000Z` 
          : followUpDate ? `${followUpDate}T12:00:00.000Z` : undefined,
        followUpNotes: followUpNotes.trim() || undefined,
        callBackNumber: callBackNumber !== phoneNumber ? callBackNumber : undefined,
        leadScore: config.metadata.requiresLeadScore || config.type === 'lead' ? leadScore : undefined,
        saleAmount: saleAmount ? parseFloat(saleAmount) : undefined,
        callDuration,
        callStartTime: callStartTime.toISOString(),
        callEndTime: callEndTime.toISOString(),
        metadata: {
          direction: 'outbound', // TODO: Get actual direction
          userAgent: navigator.userAgent,
        },
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://froniterai-production.up.railway.app'}/api/dispositions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('omnivox_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dispositionData),
      });

      if (response.ok) {
        onSubmit();
        onClose();
        
        // Reset form
        setSelectedDisposition('');
        setNotes('');
        setFollowUpDate('');
        setFollowUpTime('');
        setFollowUpNotes('');
        setCallBackNumber(phoneNumber);
        setLeadScore(5);
        setSaleAmount('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save disposition');
      }
    } catch (error) {
      console.error('Error saving disposition:', error);
      setError('Error saving disposition');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedConfig = getSelectedConfig();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Call Disposition
          </h3>
          <div className="mt-1 text-sm text-gray-600">
            <div>Phone: {phoneNumber}</div>
            <div>Duration: {formatDuration(callDuration)}</div>
            <div>Time: {callStartTime.toLocaleString()}</div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Disposition Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Disposition *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dispositions.map((disposition) => {
                const IconComponent = getIconComponent(disposition.icon);
                const isSelected = selectedDisposition === disposition.id;
                
                return (
                  <button
                    key={disposition.id}
                    onClick={() => setSelectedDisposition(disposition.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <IconComponent 
                        className="w-5 h-5 mr-2" 
                        style={{ color: disposition.color }} 
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {disposition.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {disposition.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Fields Based on Selected Disposition */}
          {selectedConfig && (
            <div className="space-y-4">
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes {selectedConfig.requiresNotes && '*'}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter any additional notes about the call..."
                />
              </div>

              {/* Lead Score for Leads */}
              {(selectedConfig.metadata.requiresLeadScore || selectedConfig.type === 'lead') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lead Score (1-10) *
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={leadScore}
                    onChange={(e) => setLeadScore(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Low (1)</span>
                    <span className="font-medium">Score: {leadScore}</span>
                    <span>High (10)</span>
                  </div>
                </div>
              )}

              {/* Sale Amount for Sales */}
              {selectedConfig.metadata.requiresSaleAmount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sale Amount *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      value={saleAmount}
                      onChange={(e) => setSaleAmount(e.target.value)}
                      step="0.01"
                      min="0"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}

              {/* Callback Scheduling */}
              {selectedConfig.requiresCallback && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Callback Information *
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Date</label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Time</label>
                      <input
                        type="time"
                        value={followUpTime}
                        onChange={(e) => setFollowUpTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Callback Number</label>
                    <input
                      type="tel"
                      value={callBackNumber}
                      onChange={(e) => setCallBackNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Callback Notes</label>
                    <textarea
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Specific instructions for the callback..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedDisposition}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Disposition'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DispositionModal;