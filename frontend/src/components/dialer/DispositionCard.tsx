/**
 * Disposition Card
 * Displays after call ends for agent to add notes and select disposition
 */

import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface DispositionCardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (disposition: DispositionData) => void;
  customerInfo: {
    name?: string;
    phoneNumber: string;
  };
  callDuration: number;
}

export interface DispositionData {
  outcome: string;
  id?: string;
  notes: string;
  followUpRequired: boolean;
  followUpDate?: string;
}

// Default disposition options (fallback)
const defaultDispositionOptions = [
  { id: 'answered', name: 'Answered - Successful', color: 'bg-green-100 text-slate-800 border-slate-300' },
  { id: 'voicemail', name: 'Voicemail Left', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'no-answer', name: 'No Answer', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { id: 'busy', name: 'Busy', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { id: 'not-interested', name: 'Not Interested', color: 'bg-red-100 text-red-800 border-red-300' },
  { id: 'callback', name: 'Callback Requested', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'wrong-number', name: 'Wrong Number', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  { id: 'do-not-call', name: 'Do Not Call', color: 'bg-red-100 text-red-800 border-red-300' },
];

export const DispositionCard: React.FC<DispositionCardProps> = ({
  isOpen,
  onClose,
  onSave,
  customerInfo,
  callDuration
}) => {
  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [selectedDispositionId, setSelectedDispositionId] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [dispositionOptions, setDispositionOptions] = useState(defaultDispositionOptions);

  // Load dispositions from API when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch('/api/dispositions')
        .then(response => response.json())
        .then(data => {
          console.log('📋 Loaded dispositions for DispositionCard:', data);
          if (data.success && data.dispositions) {
            // Flatten all dispositions from categories into a single array
            const allDispositions = [
              ...(data.dispositions.positive || []),
              ...(data.dispositions.neutral || []),
              ...(data.dispositions.negative || [])
            ];
            
            // Convert to the format expected by DispositionCard
            const formattedDispositions = allDispositions.map((disp: any, index: number) => {
              if (typeof disp === 'string') {
                return {
                  id: `disp-${index}`,
                  name: disp,
                  color: 'bg-blue-100 text-blue-800 border-blue-300'
                };
              } else {
                return {
                  id: disp.id,
                  name: disp.name,
                  color: getColorForCategory(disp.category)
                };
              }
            });
            
            setDispositionOptions(formattedDispositions);
          }
        })
        .catch(error => {
          console.error('Failed to load dispositions:', error);
          // Keep default dispositions on error
        });
    }
  }, [isOpen]);

  const getColorForCategory = (category: string) => {
    switch (category) {
      case 'positive':
        return 'bg-green-100 text-slate-800 border-slate-300';
      case 'negative':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'neutral':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    if (!selectedOutcome) {
      alert('Please select a disposition outcome');
      return;
    }

    const dispositionData: DispositionData = {
      outcome: selectedOutcome,
      id: selectedDispositionId,
      notes,
      followUpRequired,
      followUpDate: followUpRequired ? followUpDate : undefined
    };

    onSave(dispositionData);
    
    // Reset form
    setSelectedOutcome('');
    setSelectedDispositionId('');
    setNotes('');
    setFollowUpRequired(false);
    setFollowUpDate('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Call Disposition</h2>
            <p className="text-sm text-gray-600 mt-1">
              {customerInfo.name || customerInfo.phoneNumber} • Duration: {formatDuration(callDuration)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Disposition Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Call Outcome <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {dispositionOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setSelectedOutcome(option.name);
                    setSelectedDispositionId(option.id);
                  }}
                  className={`p-3 border-2 rounded-lg text-left transition-all ${
                    selectedOutcome === option.name
                      ? `${option.color} border-current`
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option.name}</span>
                    {selectedOutcome === option.name && (
                      <CheckIcon className="w-5 h-5" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Call Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any relevant notes about the call..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Follow-up */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="checkbox"
                id="followUp"
                checked={followUpRequired}
                onChange={(e) => setFollowUpRequired(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="followUp" className="text-sm font-medium text-gray-700">
                Follow-up Required
              </label>
            </div>

            {followUpRequired && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow-up Date
                </label>
                <input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedOutcome}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <CheckIcon className="w-5 h-5" />
              <span>Save Disposition</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
