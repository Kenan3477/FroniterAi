/**
 * Workflow Template Executor
 * Executes saved sequences of admin tasks with progress tracking
 */

'use client';

import React, { useState } from 'react';
import {
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

interface WorkflowStep {
  id: string;
  order: number;
  action: string;
  target: string;
  parameters?: Record<string, any>;
  expected_duration: number;
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  estimatedDuration: number;
  usage_count: number;
  success_rate: number;
}

interface WorkflowExecutorProps {
  template: WorkflowTemplate;
  onComplete?: (success: boolean) => void;
  onCancel?: () => void;
  onNavigate?: (href: string) => void;
}

export default function WorkflowExecutor({
  template,
  onComplete,
  onCancel,
  onNavigate
}: WorkflowExecutorProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [steps, setSteps] = useState<WorkflowStep[]>(
    template.steps.map(step => ({ ...step, status: 'pending' }))
  );
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isExecuting && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isExecuting, startTime]);

  // Start workflow execution
  const startExecution = async () => {
    setIsExecuting(true);
    setStartTime(new Date());
    setCurrentStepIndex(0);
    
    // Execute steps sequentially
    for (let i = 0; i < steps.length; i++) {
      await executeStep(i);
      
      if (!isExecuting) break; // Cancelled
    }
    
    // Complete execution
    setIsExecuting(false);
    setCurrentStepIndex(-1);
    onComplete?.(true);
  };

  // Execute individual step
  const executeStep = async (stepIndex: number): Promise<void> => {
    return new Promise((resolve) => {
      setCurrentStepIndex(stepIndex);
      
      // Update step status
      setSteps(prev => prev.map((step, index) => ({
        ...step,
        status: index === stepIndex ? 'running' : 
               index < stepIndex ? 'completed' : 'pending'
      })));

      const step = steps[stepIndex];
      
      // Simulate step execution with navigation
      setTimeout(() => {
        if (onNavigate && step.target) {
          onNavigate(step.target);
        }
        
        // Mark step as completed
        setSteps(prev => prev.map((s, index) => ({
          ...s,
          status: index === stepIndex ? 'completed' : s.status
        })));
        
        resolve();
      }, Math.min(step.expected_duration * 1000, 2000)); // Max 2 seconds for demo
    });
  };

  // Cancel execution
  const cancelExecution = () => {
    setIsExecuting(false);
    setCurrentStepIndex(-1);
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));
    onCancel?.();
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get step action display name
  const getActionDisplayName = (action: string): string => {
    const actionMap: Record<string, string> = {
      'navigate': '🔗 Navigate to',
      'create_campaign': '📢 Create Campaign',
      'create_user': '👤 Create User',
      'assign_data_list': '📊 Assign Data List',
      'configure_flow': '⚙️ Configure Flow',
      'assign_campaigns': '📋 Assign Campaigns'
    };
    return actionMap[action] || action;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-w-md mx-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <DocumentDuplicateIcon className="h-5 w-5 text-indigo-500 mr-2" />
            <div>
              <h3 className="font-medium text-gray-900">{template.name}</h3>
              <p className="text-sm text-gray-500">{template.description}</p>
            </div>
          </div>
          
          <button
            onClick={cancelExecution}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* Progress info */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-500">
            <ClockIcon className="h-4 w-4 mr-1" />
            {isExecuting ? (
              <span>{formatDuration(elapsedTime)} / {formatDuration(Math.floor(template.estimatedDuration / 1000))}</span>
            ) : (
              <span>~{formatDuration(Math.floor(template.estimatedDuration / 1000))}</span>
            )}
          </div>
          
          <div className="flex items-center">
            <div className="text-xs text-gray-500">
              Step {currentStepIndex >= 0 ? currentStepIndex + 1 : 0} of {steps.length}
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center p-2 rounded-lg transition-colors ${
              step.status === 'running' ? 'bg-blue-50 border border-blue-200' :
              step.status === 'completed' ? 'bg-green-50' :
              'bg-gray-50'
            }`}
          >
            {/* Status icon */}
            <div className="flex-shrink-0 mr-3">
              {step.status === 'completed' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : step.status === 'running' ? (
                <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="h-5 w-5 rounded-full border border-gray-300 bg-white" />
              )}
            </div>
            
            {/* Step content */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">
                {getActionDisplayName(step.action)}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {step.target.replace('/admin?section=', '').replace(/([A-Z])/g, ' $1')}
              </div>
            </div>
            
            {/* Duration */}
            <div className="text-xs text-gray-400 ml-2">
              {formatDuration(Math.floor(step.expected_duration / 1000))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        {!isExecuting ? (
          <button
            onClick={startExecution}
            className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            Execute Workflow
          </button>
        ) : (
          <button
            onClick={cancelExecution}
            className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <PauseIcon className="h-4 w-4 mr-2" />
            Cancel Execution
          </button>
        )}
        
        {/* Template stats */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>✅ {Math.round(template.success_rate * 100)}% success rate</span>
          <span>🔄 Used {template.usage_count} times</span>
        </div>
      </div>
    </div>
  );
}