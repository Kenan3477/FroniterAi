/**
 * Call Disposition Modal
 * Shows outcome selection interface when call ends
 */

import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  PhoneXMarkIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface CallDispositionModalProps {
  isOpen: boolean;
  contactName: string;
  contactPhone: string;
  callDuration: string;
  onDispositionSelect: (disposition: string, notes?: string, dispositionData?: any) => void;
  onClose: () => void;
}

// Call outcome categories and dispositions
type DispositionOutcome = string | { id: string; name: string; category?: string };

const dispositionCategories = {
  negative: {
    title: 'Negative',
    color: 'bg-red-100 border-red-300',
    icon: ExclamationTriangleIcon,
    iconColor: 'text-red-500',
    outcomes: [
      'Cancelled',
      'Do Not Call',
      'Not Cover And Not Interested', 
      'Not Interested - NI',
      'Wrong Number',
      'Deceased',
      'Hostile/Rude'
    ] as DispositionOutcome[]
  },
  neutral: {
    title: 'Neutral',
    color: 'bg-yellow-100 border-yellow-300',
    icon: ClockIcon,
    iconColor: 'text-yellow-500',
    outcomes: [
      'Answering Machine',
      'Call Back - CALL ME',
      'Call Transferred',
      'Disconnected',
      'Open Chain',
      'Query',
      'Removed Appliance',
      'No Answer',
      'Busy',
      'Voicemail Left'
    ] as DispositionOutcome[]
  },
  positive: {
    title: 'Positive',
    color: 'bg-green-100 border-slate-300',
    icon: CheckIcon,
    iconColor: 'text-slate-500',
    outcomes: [
      'Aged Product',
      'Field Payment Save',
      'Live Work',
      'Save',
      'Upload',
      'Sale Made',
      'Appointment Booked',
      'Interest Shown',
      'Information Sent'
    ] as DispositionOutcome[]
  }
};

export default function CallDispositionModal({
  isOpen,
  contactName,
  contactPhone,
  callDuration,
  onDispositionSelect,
  onClose
}: CallDispositionModalProps) {
  const [selectedDisposition, setSelectedDisposition] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [dispositions, setDispositions] = useState(dispositionCategories);

  // Load dispositions from API when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch('/api/dispositions')
        .then(response => response.json())
        .then(data => {
          console.log('📋 Loaded dispositions from API:', data);
          if (data.success && data.dispositions) {
            // Update dispositions with API data while keeping the structure
            setDispositions({
              negative: {
                ...dispositionCategories.negative,
                outcomes: data.dispositions.negative || []
              },
              neutral: {
                ...dispositionCategories.neutral,
                outcomes: data.dispositions.neutral || []
              },
              positive: {
                ...dispositionCategories.positive,
                outcomes: data.dispositions.positive || []
              }
            });
          }
        })
        .catch(error => {
          console.error('Failed to load dispositions:', error);
          // Keep default dispositions on error
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDispositionClick = (disposition: DispositionOutcome, category: string) => {
    const dispositionName = typeof disposition === 'string' ? disposition : disposition.name;
    const dispositionId = typeof disposition === 'string' ? null : disposition.id;
    
    setSelectedDisposition(dispositionName);
    setSelectedCategory(category);
    
    // Store both name and ID for submission
    (setSelectedDisposition as any).id = dispositionId;
  };

  const handleSubmit = () => {
    if (selectedDisposition) {
      // Pass both the disposition name and ID
      const dispositionData = {
        outcome: selectedDisposition,
        id: (setSelectedDisposition as any).id,
        notes: notes
      };
      
      onDispositionSelect(selectedDisposition, notes, dispositionData);
      // Reset form
      setSelectedDisposition('');
      setNotes('');
      setSelectedCategory('');
      (setSelectedDisposition as any).id = null;
    }
  };

  const handleCancel = () => {
    setSelectedDisposition('');
    setNotes('');
    setSelectedCategory('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-full">
              <PhoneXMarkIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Call Ended</h3>
              <p className="text-sm text-gray-600">
                {contactName} • {contactPhone} • Duration: {callDuration}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Select Call Outcome</h4>
            
            {/* Disposition Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(dispositions).map(([categoryKey, category]) => {
                const IconComponent = category.icon;
                
                return (
                  <div key={categoryKey} className={`border-2 rounded-lg p-4 ${category.color}`}>
                    {/* Category Header */}
                    <div className="flex items-center space-x-2 mb-4">
                      <IconComponent className={`h-5 w-5 ${category.iconColor}`} />
                      <h5 className="font-semibold text-gray-900">{category.title}</h5>
                    </div>
                    
                    {/* Outcome Buttons */}
                    <div className="space-y-2">
                      {category.outcomes.map((outcome) => {
                        const outcomeName = typeof outcome === 'string' ? outcome : outcome.name;
                        const outcomeId = typeof outcome === 'string' ? null : outcome.id;
                        
                        return (
                          <button
                            key={outcomeId || outcomeName}
                            onClick={() => handleDispositionClick(outcome, categoryKey)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${
                              selectedDisposition === outcomeName
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                            }`}
                          >
                            {outcomeName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Disposition Display */}
          {selectedDisposition && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckIcon className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Selected Outcome:</span>
                <span className="text-blue-700">{selectedDisposition}</span>
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Call Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this call..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedDisposition}
              className={`px-6 py-2 rounded-md transition-colors ${
                selectedDisposition
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Submit Disposition
            </button>
          </div>
        </div>

        {/* Quick Actions Footer */}
        {selectedCategory && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Category: <span className="font-medium capitalize">{selectedCategory}</span>
              </span>
              {selectedCategory === 'neutral' && (
                <span className="text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                  Contact will be scheduled for retry
                </span>
              )}
              {selectedCategory === 'positive' && (
                <span className="text-slate-700 bg-green-100 px-2 py-1 rounded">
                  Success! Contact marked as reached
                </span>
              )}
              {selectedCategory === 'negative' && (
                <span className="text-red-700 bg-red-100 px-2 py-1 rounded">
                  Contact will be marked as final
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}