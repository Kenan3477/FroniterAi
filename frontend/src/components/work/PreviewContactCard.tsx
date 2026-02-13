'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
  NotebookPen,
  SkipForward,
  X
} from 'lucide-react';

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
  campaignName?: string;
  isLoading?: boolean;
}

export const PreviewContactCard: React.FC<PreviewContactCardProps> = ({
  contact,
  isVisible,
  onCallNow,
  onSkip,
  onClose,
  campaignName,
  isLoading = false
}) => {
  const [notes, setNotes] = useState('');
  const [skipReason, setSkipReason] = useState('');
  const [showSkipReason, setShowSkipReason] = useState(false);

  // Reset form when contact changes
  useEffect(() => {
    setNotes(contact?.notes || '');
    setSkipReason('');
    setShowSkipReason(false);
  }, [contact]);

  if (!isVisible || !contact) {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold text-blue-600">
                  {getInitials().toUpperCase()}
                </span>
              </div>
              <div>
                <CardTitle className="text-xl text-gray-900">
                  {contact.fullName || `${contact.firstName} ${contact.lastName}`.trim()}
                </CardTitle>
                <div className="flex items-center space-x-3 mt-1">
                  {contact.company && (
                    <span className="text-sm text-gray-600">{contact.company}</span>
                  )}
                  {contact.jobTitle && (
                    <span className="text-sm text-gray-500">• {contact.jobTitle}</span>
                  )}
                  <Badge className={priority.color}>{priority.label}</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {campaignName && (
                <Badge variant="outline" className="text-xs">
                  {campaignName}
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Contact Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Phone Numbers */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                Phone Numbers
              </h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-500">Primary</Label>
                  <div className="font-mono text-sm font-medium">
                    {formatPhoneNumber(contact.phone)}
                  </div>
                </div>
                {contact.mobile && contact.mobile !== contact.phone && (
                  <div>
                    <Label className="text-xs text-gray-500">Mobile</Label>
                    <div className="font-mono text-sm">{formatPhoneNumber(contact.mobile)}</div>
                  </div>
                )}
                {contact.workPhone && (
                  <div>
                    <Label className="text-xs text-gray-500">Work</Label>
                    <div className="font-mono text-sm">{formatPhoneNumber(contact.workPhone)}</div>
                  </div>
                )}
                {contact.homePhone && (
                  <div>
                    <Label className="text-xs text-gray-500">Home</Label>
                    <div className="font-mono text-sm">{formatPhoneNumber(contact.homePhone)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                <User className="w-4 h-4 mr-2" />
                Contact Details
              </h3>
              <div className="space-y-2">
                {contact.email && (
                  <div>
                    <Label className="text-xs text-gray-500">Email</Label>
                    <div className="text-sm">{contact.email}</div>
                  </div>
                )}
                {contact.website && (
                  <div>
                    <Label className="text-xs text-gray-500">Website</Label>
                    <div className="text-sm">{contact.website}</div>
                  </div>
                )}
                {contact.linkedIn && (
                  <div>
                    <Label className="text-xs text-gray-500">LinkedIn</Label>
                    <div className="text-sm">{contact.linkedIn}</div>
                  </div>
                )}
                {contact.leadSource && (
                  <div>
                    <Label className="text-xs text-gray-500">Lead Source</Label>
                    <div className="text-sm">{contact.leadSource}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Company Information */}
            {(contact.company || contact.jobTitle || contact.department || contact.industry) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <Building2 className="w-4 h-4 mr-2" />
                  Company
                </h3>
                <div className="space-y-2">
                  {contact.company && (
                    <div>
                      <Label className="text-xs text-gray-500">Company</Label>
                      <div className="text-sm font-medium">{contact.company}</div>
                    </div>
                  )}
                  {contact.jobTitle && (
                    <div>
                      <Label className="text-xs text-gray-500">Job Title</Label>
                      <div className="text-sm">{contact.jobTitle}</div>
                    </div>
                  )}
                  {contact.department && (
                    <div>
                      <Label className="text-xs text-gray-500">Department</Label>
                      <div className="text-sm">{contact.department}</div>
                    </div>
                  )}
                  {contact.industry && (
                    <div>
                      <Label className="text-xs text-gray-500">Industry</Label>
                      <div className="text-sm">{contact.industry}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Address Information */}
            {(contact.address || contact.city || contact.state || contact.zipCode || contact.country) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Address
                </h3>
                <div className="space-y-1">
                  {contact.address && (
                    <div className="text-sm">{contact.address}</div>
                  )}
                  {contact.address2 && (
                    <div className="text-sm">{contact.address2}</div>
                  )}
                  <div className="text-sm">
                    {[contact.city, contact.state, contact.zipCode].filter(Boolean).join(', ')}
                  </div>
                  {contact.country && (
                    <div className="text-sm">{contact.country}</div>
                  )}
                </div>
              </div>
            )}

            {/* Call History */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Call History
              </h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-500">Attempts</Label>
                  <div className="text-sm">
                    <span className="font-medium">{contact.attemptCount}</span>
                    <span className="text-gray-500"> / {contact.maxAttempts}</span>
                  </div>
                </div>
                {contact.lastAttempt && (
                  <div>
                    <Label className="text-xs text-gray-500">Last Attempt</Label>
                    <div className="text-sm">
                      {new Date(contact.lastAttempt).toLocaleDateString()} at{' '}
                      {new Date(contact.lastAttempt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                )}
                {contact.lastOutcome && (
                  <div>
                    <Label className="text-xs text-gray-500">Last Outcome</Label>
                    <div className="text-sm">{contact.lastOutcome}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Fields */}
            {(contact.custom1 || contact.custom2 || contact.custom3 || contact.custom4 || contact.custom5) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Custom Fields</h3>
                <div className="space-y-2">
                  {contact.custom1 && (
                    <div>
                      <Label className="text-xs text-gray-500">Custom 1</Label>
                      <div className="text-sm">{contact.custom1}</div>
                    </div>
                  )}
                  {contact.custom2 && (
                    <div>
                      <Label className="text-xs text-gray-500">Custom 2</Label>
                      <div className="text-sm">{contact.custom2}</div>
                    </div>
                  )}
                  {contact.custom3 && (
                    <div>
                      <Label className="text-xs text-gray-500">Custom 3</Label>
                      <div className="text-sm">{contact.custom3}</div>
                    </div>
                  )}
                  {contact.custom4 && (
                    <div>
                      <Label className="text-xs text-gray-500">Custom 4</Label>
                      <div className="text-sm">{contact.custom4}</div>
                    </div>
                  )}
                  {contact.custom5 && (
                    <div>
                      <Label className="text-xs text-gray-500">Custom 5</Label>
                      <div className="text-sm">{contact.custom5}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="border-t pt-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                <NotebookPen className="w-4 h-4 mr-2" />
                Call Notes
              </h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this contact or call..."
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          {/* Skip Reason Section (conditionally shown) */}
          {showSkipReason && (
            <div className="border-t pt-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-900">Skip Reason</Label>
                <Input
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="Why are you skipping this contact?"
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="border-t pt-6 flex justify-between items-center">
            <div className="text-xs text-gray-500">
              Contact ID: {contact.contactId} • Queue: {contact.queueId}
            </div>
            <div className="flex space-x-3">
              {showSkipReason ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowSkipReason(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      onSkip(contact, skipReason);
                      setShowSkipReason(false);
                    }}
                    disabled={isLoading}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    Confirm Skip
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowSkipReason(true)}
                    disabled={isLoading}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    Skip
                  </Button>
                  <Button
                    onClick={() => onCallNow(contact, notes)}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <PhoneCall className="w-4 h-4 mr-2" />
                    {isLoading ? 'Connecting...' : 'Call Now'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};