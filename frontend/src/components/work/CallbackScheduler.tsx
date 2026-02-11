'use client';

import { useState } from 'react';
import { CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline';
import { updateInteractionOutcome } from '@/services/interactionService';

interface CallbackSchedulerProps {
  interactionId: string;
  customerName: string;
  phoneNumber: string;
  onScheduled?: () => void;
  onCancel?: () => void;
}

export default function CallbackScheduler({
  interactionId,
  customerName,
  phoneNumber,
  onScheduled,
  onCancel
}: CallbackSchedulerProps) {
  const [isScheduling, setIsScheduling] = useState(false);
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  const [notes, setNotes] = useState('');

  const handleScheduleCallback = async () => {
    if (!callbackDate || !callbackTime) {
      alert('Please select both date and time for the callback');
      return;
    }

    setIsScheduling(true);
    
    try {
      const callbackDateTime = new Date(`${callbackDate}T${callbackTime}`);
      
      const result = await updateInteractionOutcome(interactionId, {
        outcome: 'CALLBACK_REQUESTED',
        notes: notes || `Callback scheduled for ${callbackDateTime.toLocaleString()}`,
        callbackTime: callbackDateTime.toISOString()
      });

      if (result.success) {
        console.log('✅ Callback scheduled successfully');
        onScheduled?.();
      } else {
        console.error('❌ Failed to schedule callback:', result.error);
        alert(`Failed to schedule callback: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error scheduling callback:', error);
      alert('Error scheduling callback. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMinTime = () => {
    const now = new Date();
    const selectedDate = new Date(callbackDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If the selected date is today, minimum time is current time + 1 hour
    if (selectedDate.toDateString() === today.toDateString()) {
      const minTime = new Date(now.getTime() + 60 * 60 * 1000); // Add 1 hour
      return `${String(minTime.getHours()).padStart(2, '0')}:${String(minTime.getMinutes()).padStart(2, '0')}`;
    }
    
    return '';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <CalendarDaysIcon className="h-5 w-5 mr-2 text-blue-600" />
          Schedule Callback
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Schedule a follow-up call with {customerName} ({phoneNumber})
        </p>
      </div>

      <div className="p-6 space-y-4">
        {/* Date and Time Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Callback Date
            </label>
            <input
              type="date"
              value={callbackDate}
              onChange={(e) => setCallbackDate(e.target.value)}
              min={getMinDateTime()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Callback Time
            </label>
            <input
              type="time"
              value={callbackTime}
              onChange={(e) => setCallbackTime(e.target.value)}
              min={getMinTime()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any additional notes for the callback..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Preview */}
        {callbackDate && callbackTime && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center text-blue-700">
              <ClockIcon className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                Callback scheduled for {new Date(`${callbackDate}T${callbackTime}`).toLocaleString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          onClick={handleScheduleCallback}
          disabled={!callbackDate || !callbackTime || isScheduling}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isScheduling ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Scheduling...
            </>
          ) : (
            <>
              <CalendarDaysIcon className="h-4 w-4 mr-2" />
              Schedule Callback
            </>
          )}
        </button>
      </div>
    </div>
  );
}