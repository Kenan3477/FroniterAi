/**
 * Customer Info Card
 * Displays in Work Items tab under My Interactions during active call
 */

import React, { useState } from 'react';
import { 
  PhoneIcon, 
  EnvelopeIcon, 
  MapPinIcon, 
  UserIcon,
  ClockIcon,
  CheckCircleIcon
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
}

export const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({
  customerData,
  onUpdateField,
  onSave
}) => {
  const [isEditing, setIsEditing] = useState(!customerData.id); // Auto-edit if new customer

  const formatDuration = (seconds: number): string => {
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

        {/* Edit/Save Button */}
        <div className="pt-2">
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
    </div>
  );
};
