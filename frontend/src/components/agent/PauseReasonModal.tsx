'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface PauseReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, comment?: string) => void;
  eventType: 'break' | 'auto_dial_pause' | 'preview_pause';
  title?: string;
  description?: string;
}

interface PauseReasonOption {
  id: string;
  label: string;
  category: string;
  description?: string;
}

const PAUSE_REASONS: Record<string, PauseReasonOption[]> = {
  break: [
    { id: 'toilet_break', label: 'Toilet Break', category: 'personal', description: 'Restroom break' },
    { id: 'lunch_time', label: 'Lunch Time', category: 'scheduled', description: 'Scheduled lunch break' },
    { id: 'break_time', label: 'Break Time', category: 'scheduled', description: 'Scheduled rest break' },
    { id: 'home_time', label: 'Home Time', category: 'scheduled', description: 'End of shift' },
    { id: 'training', label: 'Training', category: 'work', description: 'Attending training session' },
    { id: 'meeting', label: 'Meeting', category: 'work', description: 'In team/supervisor meeting' },
    { id: 'technical_issue', label: 'Technical Issue', category: 'technical', description: 'System or equipment problem' },
    { id: 'personal_emergency', label: 'Personal Emergency', category: 'personal', description: 'Urgent personal matter' },
    { id: 'other', label: 'Other', category: 'other', description: 'Other reason (please specify)' }
  ],
  auto_dial_pause: [
    { id: 'need_break', label: 'Need Break', category: 'personal', description: 'Taking a short break' },
    { id: 'system_issue', label: 'System Issue', category: 'technical', description: 'Technical problem with dialer' },
    { id: 'call_prep', label: 'Call Preparation', category: 'work', description: 'Preparing for calls' },
    { id: 'admin_task', label: 'Administrative Task', category: 'work', description: 'Completing paperwork/admin' },
    { id: 'coaching', label: 'Coaching/Training', category: 'work', description: 'Speaking with supervisor' },
    { id: 'personal_call', label: 'Personal Call', category: 'personal', description: 'Taking personal call' },
    { id: 'other', label: 'Other', category: 'other', description: 'Other reason (please specify)' }
  ],
  preview_pause: [
    { id: 'contact_research', label: 'Contact Research', category: 'work', description: 'Researching contact information' },
    { id: 'system_slow', label: 'System Running Slow', category: 'technical', description: 'Waiting for system response' },
    { id: 'call_prep', label: 'Call Preparation', category: 'work', description: 'Preparing call script/notes' },
    { id: 'need_break', label: 'Need Break', category: 'personal', description: 'Taking a short break' },
    { id: 'supervisor_help', label: 'Need Supervisor Help', category: 'work', description: 'Waiting for supervisor assistance' },
    { id: 'technical_issue', label: 'Technical Issue', category: 'technical', description: 'Equipment or software problem' },
    { id: 'other', label: 'Other', category: 'other', description: 'Other reason (please specify)' }
  ]
};

const PauseReasonModal: React.FC<PauseReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  eventType,
  title,
  description
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [showOtherInput, setShowOtherInput] = useState(false);

  const reasons = PAUSE_REASONS[eventType] || [];

  const getModalTitle = () => {
    if (title) return title;
    switch (eventType) {
      case 'break':
        return 'Break Reason Required';
      case 'auto_dial_pause':
        return 'Auto Dial Pause Reason';
      case 'preview_pause':
        return 'Preview Pause Reason';
      default:
        return 'Pause Reason Required';
    }
  };

  const getModalDescription = () => {
    if (description) return description;
    switch (eventType) {
      case 'break':
        return 'Please select the reason for your break. This helps us track break patterns and ensure proper coverage.';
      case 'auto_dial_pause':
        return 'Please specify why you are pausing auto dial. This information helps improve system efficiency.';
      case 'preview_pause':
        return 'Please specify why you are pausing contact preview. This helps optimize the preview process.';
      default:
        return 'Please provide a reason for this pause.';
    }
  };

  const handleReasonChange = (reasonId: string) => {
    setSelectedReason(reasonId);
    setShowOtherInput(reasonId === 'other');
    if (reasonId !== 'other') {
      setComment('');
    }
  };

  const handleConfirm = () => {
    if (!selectedReason) {
      alert('Please select a reason for the pause.');
      return;
    }

    if (selectedReason === 'other' && !comment.trim()) {
      alert('Please specify the reason in the comment field.');
      return;
    }

    const selectedReasonObj = reasons.find(r => r.id === selectedReason);
    const reasonLabel = selectedReasonObj?.label || selectedReason;
    const finalReason = selectedReason === 'other' ? `Other: ${comment}` : reasonLabel;

    onConfirm(finalReason, comment || undefined);
    
    // Reset form
    setSelectedReason('');
    setComment('');
    setShowOtherInput(false);
  };

  const handleCancel = () => {
    // Reset form
    setSelectedReason('');
    setComment('');
    setShowOtherInput(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleCancel} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {getModalTitle()}
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              {getModalDescription()}
            </p>

            {/* Reason Selection */}
            <div className="space-y-3">
              {reasons.map((reason) => (
                <label key={reason.id} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="pauseReason"
                    value={reason.id}
                    checked={selectedReason === reason.id}
                    onChange={(e) => handleReasonChange(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {reason.label}
                    </div>
                    {reason.description && (
                      <div className="text-xs text-gray-500">
                        {reason.description}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {/* Other Reason Input */}
            {showOtherInput && (
              <div className="mt-4">
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                  Please specify:
                </label>
                <textarea
                  id="comment"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please provide more details..."
                />
              </div>
            )}

            {/* Optional comment for non-other reasons */}
            {selectedReason && selectedReason !== 'other' && (
              <div className="mt-4">
                <label htmlFor="additional-comment" className="block text-sm font-medium text-gray-700 mb-2">
                  Additional comment (optional):
                </label>
                <textarea
                  id="additional-comment"
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional details..."
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedReason}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PauseReasonModal;