'use client';

import React, { useState, useEffect } from 'react';
import {
  PhoneIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface InboundCall {
  id: string;
  callSid: string;
  callerNumber: string;
  status: 'ringing' | 'answered' | 'queued' | 'transferred';
  createdAt: string;
  contactId?: string;
  agentId?: string;
  routingOptions: any;
  metadata: {
    priority: 'high' | 'medium' | 'low';
    isCallback: boolean;
    tags?: string[];
  };
}

interface CallerInfo {
  contactId?: string;
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  tags?: string[];
  isRecentCallback?: boolean;
  lastInteraction?: string;
  notes?: string;
}

interface InboundCallNotificationProps {
  call: InboundCall;
  callerInfo?: CallerInfo;
  agentId: string;
  onAnswer: (callId: string) => Promise<void>;
  onDecline: (callId: string) => Promise<void>;
  onTransfer: (callId: string, transferType: 'queue' | 'agent', targetId: string) => Promise<void>;
  isAnswering?: boolean;
  className?: string;
}

export default function InboundCallNotification({
  call,
  callerInfo,
  agentId,
  onAnswer,
  onDecline,
  onTransfer,
  isAnswering = false,
  className = ''
}: InboundCallNotificationProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showTransferMenu, setShowTransferMenu] = useState(false);

  useEffect(() => {
    const startTime = new Date(call.createdAt).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const elapsed = Math.floor((now - startTime) / 1000);
      setTimeElapsed(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [call.createdAt]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleAnswerCall = async () => {
    try {
      await onAnswer(call.id);
    } catch (error) {
      console.error('Failed to answer inbound call:', error);
    }
  };

  const handleDeclineCall = async () => {
    try {
      await onDecline(call.id);
    } catch (error) {
      console.error('Failed to decline inbound call:', error);
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className="bg-white border border-blue-200 shadow-xl rounded-lg p-4 min-w-80 animate-bounce">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-100 p-2 rounded-full">
              <PhoneIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Incoming Call</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <ClockIcon className="w-4 h-4" />
                <span>{formatDuration(timeElapsed)}</span>
              </div>
            </div>
          </div>
          
          {/* Priority Badge */}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(call.metadata.priority)}`}>
            {call.metadata.priority.toUpperCase()}
          </span>
        </div>

        {/* Caller Information */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="bg-gray-200 p-2 rounded-full">
              <UserIcon className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              {callerInfo ? (
                <div>
                  <p className="font-medium text-gray-900">
                    {callerInfo.name || 'Unknown Contact'}
                  </p>
                  <p className="text-sm text-gray-600">{call.callerNumber}</p>
                  {callerInfo.company && (
                    <p className="text-xs text-gray-500">{callerInfo.company}</p>
                  )}
                  {callerInfo.isRecentCallback && (
                    <div className="flex items-center space-x-1 mt-1">
                      <ExclamationTriangleIcon className="w-4 h-4 text-orange-500" />
                      <span className="text-xs text-orange-600">Recent Callback</span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-medium text-gray-900">{call.callerNumber}</p>
                  <p className="text-sm text-gray-500">Unknown Caller</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Tags */}
          {callerInfo?.tags && callerInfo.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {callerInfo.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={handleAnswerCall}
            disabled={isAnswering || call.status === 'answered'}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <CheckIcon className="w-4 h-4" />
            <span>{isAnswering ? 'Answering...' : 'Answer'}</span>
          </button>
          
          <button
            onClick={handleDeclineCall}
            disabled={isAnswering}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <XMarkIcon className="w-4 h-4" />
            <span>Decline</span>
          </button>
        </div>

        {/* Transfer Menu (if showing) */}
        {showTransferMenu && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 mb-2">Transfer Call To:</p>
            <div className="space-y-2">
              <button
                onClick={() => onTransfer(call.id, 'queue', 'general')}
                className="w-full text-left px-3 py-2 bg-yellow-100 hover:bg-yellow-200 rounded-lg text-sm text-yellow-800"
              >
                General Queue
              </button>
              <button
                onClick={() => onTransfer(call.id, 'queue', 'priority')}
                className="w-full text-left px-3 py-2 bg-yellow-100 hover:bg-yellow-200 rounded-lg text-sm text-yellow-800"
              >
                Priority Queue
              </button>
            </div>
            <button
              onClick={() => setShowTransferMenu(false)}
              className="mt-2 text-xs text-yellow-600 underline"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Call Status Indicator */}
        {call.status !== 'ringing' && (
          <div className="mt-2 text-center">
            <span className="text-xs text-gray-500">
              Status: {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Inbound Call Notification Manager
 * 
 * Manages multiple inbound call notifications for an agent
 */
interface InboundCallManagerProps {
  agentId: string;
  inboundCalls: InboundCall[];
  onAnswer: (callId: string) => Promise<void>;
  onDecline: (callId: string) => Promise<void>;
  onTransfer: (callId: string, transferType: 'queue' | 'agent', targetId: string) => Promise<void>;
  className?: string;
}

export function InboundCallManager({
  agentId,
  inboundCalls,
  onAnswer,
  onDecline,
  onTransfer,
  className = ''
}: InboundCallManagerProps) {
  const [answeringCalls, setAnsweringCalls] = useState<Set<string>>(new Set());

  const handleAnswer = async (callId: string) => {
    setAnsweringCalls(prev => new Set(prev).add(callId));
    try {
      await onAnswer(callId);
    } finally {
      setAnsweringCalls(prev => {
        const newSet = new Set(prev);
        newSet.delete(callId);
        return newSet;
      });
    }
  };

  // Only show calls that are ringing or queued for this agent
  const activeCalls = inboundCalls.filter(call => 
    ['ringing', 'queued'].includes(call.status) && 
    (!call.agentId || call.agentId === agentId)
  );

  if (activeCalls.length === 0) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-3 ${className}`}>
      {activeCalls.map((call, index) => (
        <div key={call.id} style={{ transform: `translateY(${index * 10}px)` }}>
          <InboundCallNotification
            call={call}
            agentId={agentId}
            onAnswer={handleAnswer}
            onDecline={onDecline}
            onTransfer={onTransfer}
            isAnswering={answeringCalls.has(call.id)}
          />
        </div>
      ))}
    </div>
  );
}