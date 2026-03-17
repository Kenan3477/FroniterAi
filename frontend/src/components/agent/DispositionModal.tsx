'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';

interface Disposition {
  id: string;
  name: string;
  description?: string;
  category: string;
  isRequired: boolean;
  retryEligible: boolean;
  retryDelay?: number;
}

interface DispositionModalProps {
  isOpen: boolean;
  callId: string;
  campaignId: string;
  contactName: string;
  onClose: () => void;
  onComplete: (disposition: any) => void;
}

const DispositionModal: React.FC<DispositionModalProps> = ({
  isOpen,
  callId,
  campaignId,
  contactName,
  onClose,
  onComplete
}) => {
  const [dispositions, setDispositions] = useState<Disposition[]>([]);
  const [selectedDisposition, setSelectedDisposition] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [scheduleCallback, setScheduleCallback] = useState(false);
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  const [callbackNotes, setCallbackNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load dispositions for campaign
  useEffect(() => {
    if (isOpen && campaignId) {
      loadDispositions();
    }
  }, [isOpen, campaignId]);

  const loadDispositions = async () => {
    try {
      const response = await fetch(`/api/dispositions?campaignId=${campaignId}`);
      const data = await response.json();
      setDispositions(data.dispositions || []);
    } catch (error) {
      console.error('Error loading dispositions:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDisposition) {
      alert('Please select a disposition');
      return;
    }

    setIsSubmitting(true);

    try {
      const requestData: any = {
        callId,
        dispositionId: selectedDisposition,
        notes
      };

      if (scheduleCallback && callbackDate && callbackTime) {
        requestData.scheduleCallback = {
          date: callbackDate,
          time: callbackTime,
          notes: callbackNotes
        };
      }

      const response = await fetch('/api/dispositions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const result = await response.json();
        onComplete(result);
        resetForm();
        onClose();
      } else {
        throw new Error('Failed to apply disposition');
      }

    } catch (error) {
      console.error('Error applying disposition:', error);
      alert('Failed to apply disposition. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedDisposition('');
    setNotes('');
    setScheduleCallback(false);
    setCallbackDate('');
    setCallbackTime('');
    setCallbackNotes('');
  };

  const selectedDisp = dispositions.find(d => d.id === selectedDisposition);
  const isCallbackDisposition = selectedDisp?.category === 'callback';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Call Disposition</h3>
              <p className="text-sm text-gray-500">Contact: {contactName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Disposition Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Disposition <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dispositions.map(disposition => (
                <button
                  key={disposition.id}
                  onClick={() => setSelectedDisposition(disposition.id)}
                  className={`p-3 text-left rounded-lg border-2 transition-colors ${
                    selectedDisposition === disposition.id
                      ? 'border-slate-500 bg-slate-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{disposition.name}</div>
                  {disposition.description && (
                    <div className="text-xs text-gray-500 mt-1">{disposition.description}</div>
                  )}
                  {disposition.isRequired && (
                    <div className="text-xs text-orange-600 mt-1">Required</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Callback Scheduling */}
          {isCallbackDisposition && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center mb-3">
                <ClockIcon className="h-5 w-5 text-blue-600 mr-2" />
                <label className="block text-sm font-medium text-blue-900">
                  Schedule Callback
                </label>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={callbackDate}
                    onChange={(e) => setCallbackDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={callbackTime}
                    onChange={(e) => setCallbackTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Callback Notes</label>
                <textarea
                  value={callbackNotes}
                  onChange={(e) => setCallbackNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                  placeholder="Reason for callback, preferred time, etc."
                />
              </div>
            </div>
          )}

          {/* Call Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Call Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500"
              placeholder="Add any notes about the call..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedDisposition || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-600 border border-transparent rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Applying...' : 'Complete Call'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispositionModal;