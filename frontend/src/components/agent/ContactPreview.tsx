'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, MapPin, Calendar, Clock, AlertCircle, Star } from 'lucide-react';

interface ContactRecord {
  id: string;
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  timezone?: string;
  preferredCallTime?: string;
  priority: number;
  attempts: number;
  lastCallAttempt?: string;
  status: string;
  data?: any;
  campaign?: {
    id: string;
    name: string;
    mode: string;
  };
  callHistory?: CallHistoryItem[];
}

interface CallHistoryItem {
  id: string;
  startTime: string;
  duration?: number;
  status: string;
  disposition?: {
    categoryId: string;
    subcategoryId?: string;
    notes?: string;
  };
}

interface ContactPreviewProps {
  record: ContactRecord;
  isDialling?: boolean;
  onDial?: () => void;
  className?: string;
}

export default function ContactPreview({ record, isDialling = false, onDial, className = '' }: ContactPreviewProps) {
  const getFullName = () => {
    if (record.firstName && record.lastName) {
      return `${record.firstName} ${record.lastName}`;
    }
    return record.firstName || record.lastName || 'Unknown Contact';
  };

  const getAddress = () => {
    const parts = [record.address, record.city, record.state, record.zipCode].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const getLastCallInfo = () => {
    if (!record.callHistory || record.callHistory.length === 0) {
      return record.lastCallAttempt ? {
        date: new Date(record.lastCallAttempt).toLocaleDateString(),
        status: 'No previous calls'
      } : null;
    }

    const lastCall = record.callHistory[0];
    return {
      date: new Date(lastCall.startTime).toLocaleDateString(),
      time: new Date(lastCall.startTime).toLocaleTimeString(),
      duration: lastCall.duration ? `${Math.floor(lastCall.duration / 60)}:${(lastCall.duration % 60).toString().padStart(2, '0')}` : '0:00',
      status: lastCall.status,
      disposition: lastCall.disposition
    };
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'bg-red-500';
    if (priority >= 3) return 'bg-orange-500';
    if (priority >= 2) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-blue-500';
      case 'DIALLING': return 'bg-purple-500';
      case 'CONNECTED': return 'bg-green-500';
      case 'NO_ANSWER': return 'bg-yellow-500';
      case 'BUSY': return 'bg-orange-500';
      case 'FAILED': return 'bg-red-500';
      case 'COMPLETED': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const lastCall = getLastCallInfo();

  return (
    <Card className={`h-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center text-lg">
              <User className="h-5 w-5 mr-2 text-gray-500" />
              {getFullName()}
            </CardTitle>
            <CardDescription className="flex items-center mt-1">
              <Phone className="h-4 w-4 mr-1" />
              {record.phoneNumber}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Badge className={`${getPriorityColor(record.priority)} text-white`}>
              <Star className="h-3 w-3 mr-1" />
              Priority {record.priority}
            </Badge>
            <Badge className={`${getStatusColor(record.status)} text-white text-xs`}>
              {record.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Information */}
        <div className="space-y-2">
          {record.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="h-4 w-4 mr-2" />
              {record.email}
            </div>
          )}

          {getAddress() && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2" />
              {getAddress()}
            </div>
          )}

          {record.timezone && (
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-2" />
              Timezone: {record.timezone}
            </div>
          )}

          {record.preferredCallTime && (
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              Preferred time: {record.preferredCallTime}
            </div>
          )}
        </div>

        {/* Call Statistics */}
        <div className="border-t pt-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Attempts:</span>
              <span className="font-medium ml-2">{record.attempts}</span>
              {record.attempts > 2 && (
                <AlertCircle className="h-4 w-4 inline ml-1 text-orange-500" />
              )}
            </div>
            <div>
              <span className="text-gray-500">Campaign:</span>
              <span className="font-medium ml-2 text-xs">{record.campaign?.name || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Last Call Information */}
        {lastCall && (
          <div className="border-t pt-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Last Call</div>
            <div className="space-y-1 text-xs text-gray-600">
              <div>Date: {lastCall.date}</div>
              {lastCall.time && <div>Time: {lastCall.time}</div>}
              <div>Duration: {lastCall.duration}</div>
              <div>Status: {lastCall.status}</div>
              {lastCall.disposition && (
                <div className="mt-2 p-2 bg-gray-50 rounded">
                  <div className="font-medium">Disposition: {lastCall.disposition.categoryId}</div>
                  {lastCall.disposition.notes && (
                    <div className="text-gray-600 mt-1">{lastCall.disposition.notes}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Data */}
        {record.data && Object.keys(record.data).length > 0 && (
          <div className="border-t pt-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Additional Information</div>
            <div className="space-y-1 text-xs">
              {Object.entries(record.data).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign Information */}
        {record.campaign && (
          <div className="border-t pt-3">
            <div className="text-sm">
              <div className="font-medium text-gray-700">Campaign Details</div>
              <div className="text-xs text-gray-600 mt-1">
                <div>Mode: {record.campaign.mode}</div>
              </div>
            </div>
          </div>
        )}

        {/* Call to Action */}
        {onDial && (
          <div className="border-t pt-3">
            <button
              onClick={onDial}
              disabled={isDialling}
              className={`w-full px-4 py-2 rounded-md text-white font-medium transition-colors ${
                isDialling
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isDialling ? (
                <>
                  <div className="animate-spin inline-block h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                  Dialling...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2 inline" />
                  Call Now
                </>
              )}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}