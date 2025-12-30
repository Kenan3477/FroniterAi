/**
 * Manual Dial Pad Modal
 * Opens when phone icon is clicked, allows manual dialing with customer lookup
 */

import React, { useState } from 'react';
import { XMarkIcon, PhoneIcon } from '@heroicons/react/24/outline';

interface CustomerInfo {
  id?: string;
  contactId?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

interface DialPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDial: (phoneNumber: string, customerInfo: CustomerInfo | null) => void;
  callerIdNumber: string;
}

export const DialPadModal: React.FC<DialPadModalProps> = ({
  isOpen,
  onClose,
  onDial,
  callerIdNumber
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isCustomerInfoCollapsed, setIsCustomerInfoCollapsed] = useState(false);

  // Fetch customer info from backend
  const lookupCustomerInfo = async (number: string) => {
    setIsLookingUp(true);
    try {
      const response = await fetch(`/api/contacts/lookup?phoneNumber=${encodeURIComponent(number)}`);
      if (response.ok) {
        const data = await response.json();
        setCustomerInfo(data);
      } else {
        // No customer found, create blank template
        setCustomerInfo({
          phoneNumber: number,
          firstName: '',
          lastName: '',
          address: '',
          email: '',
          notes: ''
        });
      }
    } catch (error) {
      console.error('Failed to lookup customer:', error);
      setCustomerInfo({
        phoneNumber: number,
        firstName: '',
        lastName: '',
        address: '',
        email: '',
        notes: ''
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  // Handle dial pad button clicks
  const handleDialPadClick = (digit: string) => {
    setPhoneNumber(prev => prev + digit);
  };

  // Handle backspace
  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  // Handle dial button
  const handleDial = async () => {
    if (!phoneNumber.trim()) {
      alert('Please enter a phone number');
      return;
    }

    // Format to E.164 if not already
    let formattedNumber = phoneNumber.trim();
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+' + formattedNumber;
    }

    // Lookup customer info before dialing
    await lookupCustomerInfo(formattedNumber);

    // Call the onDial callback with number and customer info
    onDial(formattedNumber, customerInfo);
    
    // Keep modal open to show customer info
  };

  // Update customer info fields
  const updateCustomerField = (field: keyof CustomerInfo, value: string) => {
    setCustomerInfo(prev => prev ? { ...prev, [field]: value } : null);
  };

  if (!isOpen) return null;

  const dialPadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Dial Pad</h2>
            <p className="text-sm text-gray-600">Enter a phone number to place a call</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-lg transition-all"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Phone Number Display */}
          <div className="text-center">
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+44 7123 456789"
              className="w-full text-3xl text-center font-mono p-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
            <p className="text-sm text-gray-500 mt-3">
              Enter number in international format (e.g., +44 7123 456789)
            </p>
          </div>

          {/* Dial Pad Grid */}
          <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
            {dialPadButtons.flat().map((digit) => (
              <button
                key={digit}
                onClick={() => handleDialPadClick(digit)}
                className="h-20 text-3xl font-semibold bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors shadow-sm border border-gray-200"
              >
                {digit}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 max-w-xs mx-auto">
            <button
              onClick={handleBackspace}
              className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
            >
              ⌫ Delete
            </button>
            <button
              onClick={handleDial}
              disabled={!phoneNumber.trim() || isLookingUp}
              className="flex-2 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 transition-colors"
            >
              <PhoneIcon className="w-6 h-6" />
              <span>{isLookingUp ? 'Looking up...' : 'Call'}</span>
            </button>
          </div>

          {/* Customer Information Card */}
          {customerInfo && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Customer Information
                </h3>
                <button
                  onClick={() => setIsCustomerInfoCollapsed(!isCustomerInfoCollapsed)}
                  className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded transition-colors"
                  title={isCustomerInfoCollapsed ? "Expand customer details" : "Collapse customer details"}
                >
                  <svg 
                    className={`w-5 h-5 transition-transform duration-200 ${isCustomerInfoCollapsed ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {!isCustomerInfoCollapsed && (
                <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={customerInfo.firstName || ''}
                      onChange={(e) => updateCustomerField('firstName', e.target.value)}
                      placeholder="Enter first name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={customerInfo.lastName || ''}
                      onChange={(e) => updateCustomerField('lastName', e.target.value)}
                      placeholder="Enter last name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={customerInfo.phoneNumber}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={customerInfo.email || ''}
                    onChange={(e) => updateCustomerField('email', e.target.value)}
                    placeholder="Enter email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={customerInfo.address || ''}
                    onChange={(e) => updateCustomerField('address', e.target.value)}
                    placeholder="Enter address"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={customerInfo.notes || ''}
                    onChange={(e) => updateCustomerField('notes', e.target.value)}
                    placeholder="Enter notes"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {customerInfo.id && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      ✓ Existing customer found in database
                    </p>
                  </div>
                )}
                {!customerInfo.id && customerInfo.firstName === '' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      ℹ No customer record found. Fill in details and they will be saved when the call ends.
                    </p>
                  </div>
                )}
              </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
