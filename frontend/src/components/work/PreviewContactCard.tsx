'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Phone, 
  PhoneCall, 
  User, 
  Building2, 
  Mail, 
  MapPin, 
  Calendar,
  Clock,
  SkipForward,
  Pause,
  Play,
  X,
  Tag,
  ChevronDown
} from 'lucide-react';

// Pause reason types for preview_pause
interface PauseReasonOption {
  id: string;
  label: string;
  category: string;
  description?: string;
}

const PREVIEW_PAUSE_REASONS: PauseReasonOption[] = [
  { id: 'contact_research', label: 'Contact Research', category: 'work', description: 'Researching contact information' },
  { id: 'system_slow', label: 'System Running Slow', category: 'technical', description: 'Waiting for system response' },
  { id: 'call_prep', label: 'Call Preparation', category: 'work', description: 'Preparing call script/notes' },
  { id: 'need_break', label: 'Need Break', category: 'personal', description: 'Taking a short break' },
  { id: 'supervisor_help', label: 'Need Supervisor Help', category: 'work', description: 'Waiting for supervisor assistance' },
  { id: 'technical_issue', label: 'Technical Issue', category: 'technical', description: 'Equipment or software problem' },
  { id: 'other', label: 'Other', category: 'other', description: 'Other reason (please specify)' }
];

export interface PreviewContact {
  id: string;
  contactId: string;
  queueId: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phone: string;
  mobile?: string;
  workPhone?: string;
  homePhone?: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  industry?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  website?: string;
  linkedIn?: string;
  notes?: string;
  tags?: string;
  leadSource?: string;
  leadScore?: number;
  deliveryDate?: string;
  ageRange?: string;
  residentialStatus?: string;
  custom1?: string;
  custom2?: string;
  custom3?: string;
  custom4?: string;
  custom5?: string;
  attemptCount: number;
  maxAttempts: number;
  lastAttempt?: string;
  nextAttempt?: string;
  lastOutcome?: string;
  priority: number;
  status: string;
  campaignId: string;
  listId: string;
}

interface PreviewContactCardProps {
  contact: PreviewContact | null;
  isVisible: boolean;
  onCallNow: (contact: PreviewContact, notes?: string) => void;
  onSkip: (contact: PreviewContact, skipReason?: string) => void;
  onClose: () => void;
  onPause?: (reason?: string, comment?: string) => void;
  campaignName?: string;
  isLoading?: boolean;
  isPreviewPaused?: boolean;
}

export const PreviewContactCard: React.FC<PreviewContactCardProps> = ({
  contact,
  isVisible,
  onCallNow,
  onSkip,
  onClose,
  onPause,
  campaignName,
  isLoading = false,
  isPreviewPaused = false
}) => {
  // State for pause reason selection
  const [showPauseReasons, setShowPauseReasons] = useState(false);
  const [selectedPauseReason, setSelectedPauseReason] = useState<string>('');
  const [pauseComment, setPauseComment] = useState<string>('');

  // Reset form when contact changes
  useEffect(() => {
    // Reset pause reason selection when contact changes
    setShowPauseReasons(false);
    setSelectedPauseReason('');
    setPauseComment('');
  }, [contact]);

  // Handle pause button click
  const handlePauseClick = () => {
    if (isPreviewPaused) {
      // If already paused, resume without asking for reason
      onPause?.();
    } else {
      // Show pause reason selection
      setShowPauseReasons(true);
    }
  };

  // Handle pause reason confirmation
  const handlePauseConfirm = () => {
    if (!selectedPauseReason) {
      alert('Please select a pause reason.');
      return;
    }

    if (selectedPauseReason === 'other' && !pauseComment.trim()) {
      alert('Please specify the reason in the comment field.');
      return;
    }

    const selectedReasonObj = PREVIEW_PAUSE_REASONS.find(r => r.id === selectedPauseReason);
    const reasonLabel = selectedReasonObj?.label || selectedPauseReason;
    const finalReason = selectedPauseReason === 'other' ? `Other: ${pauseComment}` : reasonLabel;

    // Call pause with reason
    onPause?.(finalReason, pauseComment || undefined);
    
    // Reset form
    setShowPauseReasons(false);
    setSelectedPauseReason('');
    setPauseComment('');
  };

  // Handle pause reason cancellation
  const handlePauseCancel = () => {
    setShowPauseReasons(false);
    setSelectedPauseReason('');
    setPauseComment('');
  };

  console.log('🎯 PreviewContactCard render decision:', {
    isVisible,
    hasContact: !!contact,
    willRender: isVisible && contact
  });

  if (!isVisible || !contact) {
    return null;
  }

  try {
    // Contact render check - no console spam
  } catch (error) {
    console.error('❌ PreviewContactCard error:', error);
    return null;
  }

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    // Basic UK phone number formatting
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('44')) {
      return `+44 ${cleaned.slice(2).replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}`;
    }
    if (cleaned.startsWith('0')) {
      return cleaned.replace(/(\d{5})(\d{3})(\d{3})/, '$1 $2 $3');
    }
    return phone;
  };

  const getInitials = () => {
    const first = contact.firstName || contact.fullName?.split(' ')[0] || '';
    const last = contact.lastName || contact.fullName?.split(' ').slice(1).join(' ') || '';
    return (first[0] || '') + (last[0] || '');
  };

  const getPriorityLabel = () => {
    switch (contact.priority) {
      case 1: return { label: 'High Priority', color: 'bg-red-100 text-red-800' };
      case 2: return { label: 'Medium Priority', color: 'bg-yellow-100 text-yellow-800' };
      default: return { label: 'Low Priority', color: 'bg-green-100 text-green-800' };
    }
  };

  const priority = getPriorityLabel();

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          zIndex: 9999
        }}
      >
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white shadow-xl border rounded-xl">
        {/* Simplified Header */}
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Compact Avatar */}
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold text-blue-600">
                  {getInitials().toUpperCase()}
                </span>
              </div>
              <div>
                <CardTitle className="text-xl text-gray-900 mb-1">
                  {contact.fullName || `${contact.firstName} ${contact.lastName}`.trim()}
                </CardTitle>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  {contact.company && (
                    <span className="font-medium">{contact.company}</span>
                  )}
                  {contact.jobTitle && (
                    <span>• {contact.jobTitle}</span>
                  )}
                  <Badge className={`${priority.color} text-xs`}>{priority.label}</Badge>
                  {campaignName && (
                    <Badge variant="outline" className="text-xs">
                      {campaignName}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Compact Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            
            {/* Phone Numbers */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center mb-2">
                <Phone className="w-4 h-4 mr-2 text-blue-600" />
                Phone Numbers
              </h3>
              <div className="space-y-1">
                <div className="bg-white rounded p-2">
                  <Label className="text-xs font-medium text-blue-600">PRIMARY</Label>
                  <div className="font-mono text-sm font-bold text-gray-900">
                    {formatPhoneNumber(contact.phone)}
                  </div>
                </div>
                {contact.mobile && contact.mobile !== contact.phone && (
                  <div className="bg-white rounded p-2">
                    <Label className="text-xs text-gray-500">Mobile</Label>
                    <div className="font-mono text-sm text-gray-700">{formatPhoneNumber(contact.mobile)}</div>
                  </div>
                )}
                {contact.workPhone && (
                  <div className="bg-white rounded p-2">
                    <Label className="text-xs text-gray-500">Work</Label>
                    <div className="font-mono text-sm text-gray-700">{formatPhoneNumber(contact.workPhone)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Details */}
            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center mb-2">
                <Mail className="w-4 h-4 mr-2 text-green-600" />
                Contact Details
              </h3>
              <div className="space-y-1">
                {contact.email && (
                  <div className="bg-white rounded p-2">
                    <Label className="text-xs text-green-600">Email</Label>
                    <div className="text-sm font-medium text-gray-900 break-all">{contact.email}</div>
                  </div>
                )}
                {contact.website && (
                  <div className="bg-white rounded p-2">
                    <Label className="text-xs text-gray-500">Website</Label>
                    <div className="text-sm text-blue-600 break-all">{contact.website}</div>
                  </div>
                )}
                {contact.leadSource && (
                  <div className="bg-white rounded p-2">
                    <Label className="text-xs text-gray-500">Lead Source</Label>
                    <div className="text-sm font-medium text-gray-700">{contact.leadSource}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Company & Address Combined */}
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center mb-2">
                <Building2 className="w-4 h-4 mr-2 text-purple-600" />
                Company & Location
              </h3>
              <div className="space-y-1">
                {contact.company && (
                  <div className="bg-white rounded p-2">
                    <Label className="text-xs text-purple-600">Company</Label>
                    <div className="text-sm font-bold text-gray-900">{contact.company}</div>
                  </div>
                )}
                {contact.jobTitle && (
                  <div className="bg-white rounded p-2">
                    <Label className="text-xs text-gray-500">Job Title</Label>
                    <div className="text-sm text-gray-700">{contact.jobTitle}</div>
                  </div>
                )}
                {(contact.address || contact.city) && (
                  <div className="bg-white rounded p-2">
                    <Label className="text-xs text-gray-500">Address</Label>
                    <div className="text-sm text-gray-700">
                      {contact.address && <div>{contact.address}</div>}
                      <div>{[contact.city, contact.state, contact.zipCode].filter(Boolean).join(', ')}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Compact Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            
            {/* Call History */}
            <div className="bg-gray-50 rounded-lg p-3 border">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center mb-2">
                <Clock className="w-4 h-4 mr-2 text-gray-600" />
                Call History
              </h3>
              <div className="bg-white rounded p-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Attempts</span>
                  <span className="font-mono text-sm font-bold">
                    {contact.attemptCount} / {contact.maxAttempts}
                  </span>
                </div>
                {contact.lastAttempt && (
                  <div className="mt-1 text-xs text-gray-500">
                    Last: {new Date(contact.lastAttempt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            {/* Custom Fields (if any) */}
            {(contact.custom1 || contact.custom2 || contact.custom3) && (
              <div className="bg-gray-50 rounded-lg p-3 border">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center mb-2">
                  <Tag className="w-4 h-4 mr-2 text-gray-600" />
                  Additional Info
                </h3>
                <div className="space-y-1">
                  {contact.custom1 && (
                    <div className="bg-white rounded p-2">
                      <Label className="text-xs text-gray-500">Custom 1</Label>
                      <div className="text-sm text-gray-700">{contact.custom1}</div>
                    </div>
                  )}
                  {contact.custom2 && (
                    <div className="bg-white rounded p-2">
                      <Label className="text-xs text-gray-500">Custom 2</Label>
                      <div className="text-sm text-gray-700">{contact.custom2}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Compact Action Buttons */}
          <div className="bg-gray-50 rounded-lg p-3 border">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="text-xs text-gray-500 font-mono">
                ID: {contact.contactId} • Queue: {contact.queueId}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSkip(contact)}
                  disabled={isLoading}
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  <SkipForward className="w-4 h-4 mr-1" />
                  Skip
                </Button>
                
                {onPause && (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePauseClick}
                      disabled={isLoading}
                      className={`${
                        isPreviewPaused 
                          ? 'text-green-600 border-green-300 hover:bg-green-50' 
                          : 'text-blue-600 border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {isPreviewPaused ? (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </>
                      )}
                    </Button>

                    {/* Pause Reason Selection - appears below pause button when needed */}
                    {showPauseReasons && !isPreviewPaused && (
                      <div className="absolute z-10 mt-8 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">Select Pause Reason</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handlePauseCancel}
                              className="h-6 w-6 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {PREVIEW_PAUSE_REASONS.map((reason) => (
                              <div
                                key={reason.id}
                                className={`p-2 rounded cursor-pointer text-sm ${
                                  selectedPauseReason === reason.id
                                    ? 'bg-blue-50 border-blue-200 border'
                                    : 'hover:bg-gray-50'
                                }`}
                                onClick={() => setSelectedPauseReason(reason.id)}
                              >
                                <div className="font-medium">{reason.label}</div>
                                {reason.description && (
                                  <div className="text-xs text-gray-500">{reason.description}</div>
                                )}
                              </div>
                            ))}
                          </div>

                          {selectedPauseReason === 'other' && (
                            <div className="space-y-2">
                              <Label htmlFor="pauseComment" className="text-sm font-medium">
                                Please specify:
                              </Label>
                              <textarea
                                id="pauseComment"
                                value={pauseComment}
                                onChange={(e) => setPauseComment(e.target.value)}
                                placeholder="Enter pause reason..."
                                className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
                                rows={2}
                              />
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button
                              onClick={handlePauseConfirm}
                              disabled={!selectedPauseReason}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Confirm Pause
                            </Button>
                            <Button
                              onClick={handlePauseCancel}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <Button
                  onClick={() => onCallNow(contact, '')}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <PhoneCall className="w-4 h-4 mr-1" />
                  {isLoading ? 'Connecting...' : 'Call Now'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
};