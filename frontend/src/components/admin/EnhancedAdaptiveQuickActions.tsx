/**
 * Enhanced Adaptive Quick Actions Component
 * Advanced AI-powered quick actions with predictive intelligence, team learning, 
 * voice commands, workflow templates, and mobile optimization
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  HomeIcon,
  UsersIcon,
  MegaphoneIcon,
  ChartBarIcon,
  CogIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
  CircleStackIcon,
  KeyIcon,
  MicrophoneIcon,
  PhoneIcon,
  EyeIcon,
  SparklesIcon,
  ClockIcon,
  FireIcon,
  UserGroupIcon,
  CloudIcon,
  LightBulbIcon,
  PlayIcon,
  StopIcon,
  SpeakerWaveIcon,
  DevicePhoneMobileIcon,
  BoltIcon,
  DocumentDuplicateIcon,
  RocketLaunchIcon,
  BeakerIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  section: string;
  frequency: number;
  category: 'navigation' | 'action' | 'report' | 'workflow' | 'integration' | 'template' | 'team_suggestion';
  color: string;
  confidence?: number;
  reasoning?: string;
  priority?: 'high' | 'medium' | 'low';
  estimatedTimeSaved?: number;
}

interface PredictiveAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  confidence: number;
  reasoning: string;
  category: 'workflow' | 'integration' | 'template' | 'team_suggestion';
  priority: 'high' | 'medium' | 'low';
  estimatedTimeSaved: number;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  estimatedDuration: number;
  usage_count: number;
  success_rate: number;
}

interface IntegrationShortcut {
  id: string;
  integration_name: string;
  action_type: string;
  endpoint: string;
  icon: string;
  color: string;
  success_rate: number;
}

interface EnhancedAdaptiveQuickActionsProps {
  className?: string;
  onNavigate?: (href: string) => void;
  mobileMode?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  HomeIcon,
  UsersIcon,
  MegaphoneIcon,
  ChartBarIcon,
  CogIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
  CircleStackIcon,
  KeyIcon,
  MicrophoneIcon,
  PhoneIcon,
  EyeIcon,
  SparklesIcon,
  ClockIcon,
  FireIcon,
  UserGroupIcon,
  CloudIcon,
  LightBulbIcon,
  PlayIcon,
  StopIcon,
  SpeakerWaveIcon,
  DevicePhoneMobileIcon,
  BoltIcon,
  DocumentDuplicateIcon,
  RocketLaunchIcon,
  BeakerIcon,
  StarIcon
};

export default function EnhancedAdaptiveQuickActions({ 
  className = '', 
  onNavigate,
  mobileMode = false
}: EnhancedAdaptiveQuickActionsProps) {
  const { user, getAuthHeaders } = useAuth();
  
  // State management
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [predictiveActions, setPredictiveActions] = useState<PredictiveAction[]>([]);
  const [teamSuggestions, setTeamSuggestions] = useState<PredictiveAction[]>([]);
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [integrationShortcuts, setIntegrationShortcuts] = useState<IntegrationShortcut[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'adaptive' | 'predictive' | 'team' | 'templates' | 'integrations'>('adaptive');
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string>('');
  
  // Refs
  const recognitionRef = useRef<any>(null);

  // Check for voice support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setVoiceSupported(!!SpeechRecognition);
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event: any) => {
          const command = event.results[0][0].transcript;
          setLastVoiceCommand(command);
          processVoiceCommand(command);
          setVoiceListening(false);
        };
        
        recognition.onerror = () => {
          setVoiceListening(false);
        };
        
        recognition.onend = () => {
          setVoiceListening(false);
        };
        
        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Load all data types
  const loadAllData = useCallback(async () => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      setLoading(false);
      return;
    }

    try {
      const [
        adaptiveResponse,
        predictiveResponse,
        teamResponse,
        templatesResponse,
        integrationsResponse
      ] = await Promise.all([
        fetch('/api/admin/quick-actions/personalized?timeRange=30d', { headers: getAuthHeaders() }),
        fetch(`/api/admin/quick-actions/predictive?currentPage=${window.location.pathname}&timeOfDay=${new Date().getHours()}`, { headers: getAuthHeaders() }),
        fetch('/api/admin/quick-actions/team-learning', { headers: getAuthHeaders() }),
        fetch('/api/admin/quick-actions/templates', { headers: getAuthHeaders() }),
        fetch('/api/admin/quick-actions/integrations', { headers: getAuthHeaders() })
      ]);

      if (adaptiveResponse.ok) {
        const data = await adaptiveResponse.json();
        setQuickActions(data.data?.quickActions || []);
      }

      if (predictiveResponse.ok) {
        const data = await predictiveResponse.json();
        setPredictiveActions(data.data?.predictiveActions || []);
      }

      if (teamResponse.ok) {
        const data = await teamResponse.json();
        setTeamSuggestions(data.data?.suggestions || []);
      }

      if (templatesResponse.ok) {
        const data = await templatesResponse.json();
        setWorkflowTemplates(data.data?.templates || []);
      }

      if (integrationsResponse.ok) {
        const data = await integrationsResponse.json();
        setIntegrationShortcuts(data.data?.shortcuts || []);
      }

    } catch (error) {
      console.error('Error loading enhanced quick actions:', error);
      // Fallback to default actions if API calls fail
      setQuickActions([
        {
          id: 'campaigns',
          title: 'Campaigns',
          description: 'Manage your campaigns',
          icon: 'MegaphoneIcon',
          href: '/admin#campaigns',
          section: 'admin',
          frequency: 0,
          category: 'navigation' as const,
          color: 'blue'
        },
        {
          id: 'users',
          title: 'User Management',
          description: 'Manage users and permissions',
          icon: 'UsersIcon',
          href: '/admin#users',
          section: 'admin',
          frequency: 0,
          category: 'navigation' as const,
          color: 'green'
        },
        {
          id: 'data-management',
          title: 'Data Management',
          description: 'Manage contact lists and data',
          icon: 'CircleStackIcon',
          href: '/admin#data-management',
          section: 'admin',
          frequency: 0,
          category: 'navigation' as const,
          color: 'purple'
        },
        {
          id: 'reports',
          title: 'Reports',
          description: 'View analytics and reports',
          icon: 'ChartBarIcon',
          href: '/admin#reports',
          section: 'admin',
          frequency: 0,
          category: 'navigation' as const,
          color: 'orange'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Voice command processing
  const processVoiceCommand = async (command: string) => {
    try {
      const response = await fetch('/api/admin/quick-actions/voice-command', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          command,
          context: window.location.pathname,
          organizationId: user?.organizationId
        })
      });

      if (response.ok) {
        const data = await response.json();
        const actionData = data.data.processedCommand.actionData;
        
        if (actionData.href && actionData.href !== '#') {
          handleActionClick({ href: actionData.href } as QuickAction);
        }
      }
    } catch (error) {
      console.error('Voice command processing failed:', error);
    }
  };

  // Start voice listening
  const startVoiceListening = () => {
    if (recognitionRef.current && voiceSupported) {
      setVoiceListening(true);
      recognitionRef.current.start();
    }
  };

  // Stop voice listening
  const stopVoiceListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setVoiceListening(false);
    }
  };

  // Handle action clicks
  const handleActionClick = async (action: QuickAction | PredictiveAction | any) => {
    if (onNavigate) {
      onNavigate(action.href);
    } else {
      window.location.href = action.href;
    }
  };

  // Execute workflow template
  const executeWorkflowTemplate = async (template: WorkflowTemplate) => {
    // For now, just navigate to the first step - in production this would execute the full sequence
    const firstStep = template.id.includes('campaign') 
      ? '/admin?section=Campaigns' 
      : '/admin?section=User Management';
    
    handleActionClick({ href: firstStep });
  };

  // Don't render for non-admin users
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return null;
  }

  // Mobile optimized layout
  if (mobileMode) {
    return (
      <div className={`theme-card rounded-lg p-4 ${className}`}>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {quickActions.slice(0, 4).map((action) => {
            const IconComponent = iconMap[action.icon] || HomeIcon;
            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={`p-4 rounded-xl ${action.color} text-white text-center transition-all duration-200 active:scale-95 shadow-lg`}
              >
                <IconComponent className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm font-medium truncate">{action.title}</div>
              </button>
            );
          })}
        </div>
        
        {voiceSupported && (
          <button
            onClick={voiceListening ? stopVoiceListening : startVoiceListening}
            className={`w-full p-3 rounded-lg font-medium transition-colors ${
              voiceListening 
                ? 'bg-red-500 text-white' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {voiceListening ? (
              <div className="flex items-center justify-center">
                <StopIcon className="h-5 w-5 mr-2" />
                Listening...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <SpeakerWaveIcon className="h-5 w-5 mr-2" />
                Voice Command
              </div>
            )}
          </button>
        )}
      </div>
    );
  }

  // Desktop layout with tabs
  return (
    <div className={`theme-card rounded-lg p-6 ${className}`}>
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <RocketLaunchIcon className="h-6 w-6 text-purple-500 mr-2" />
          <h3 className="text-lg font-semibold theme-text-primary">AI Quick Actions</h3>
        </div>

        {voiceSupported && (
          <button
            onClick={voiceListening ? stopVoiceListening : startVoiceListening}
            className={`p-2 rounded-lg transition-colors ${
              voiceListening 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}
            title={voiceListening ? 'Stop listening' : 'Voice command'}
          >
            {voiceListening ? (
              <StopIcon className="h-5 w-5" />
            ) : (
              <MicrophoneIcon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'adaptive', label: 'Adaptive', icon: SparklesIcon },
          { key: 'predictive', label: 'AI Predictions', icon: LightBulbIcon },
          { key: 'team', label: 'Team Learning', icon: UserGroupIcon },
          { key: 'templates', label: 'Workflows', icon: DocumentDuplicateIcon },
          { key: 'integrations', label: 'Integrations', icon: BoltIcon }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Icon className="h-4 w-4 mr-1.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Voice feedback */}
      {lastVoiceCommand && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Voice Command:</strong> "{lastVoiceCommand}"
          </p>
        </div>
      )}

      {/* Tab content */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center p-3 bg-gray-100 rounded-lg">
                  <div className="w-10 h-10 bg-gray-300 rounded-lg mr-3"></div>
                  <div className="flex-1">
                    <div className="w-24 h-4 bg-gray-300 rounded mb-1"></div>
                    <div className="w-32 h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Adaptive Actions Tab */}
            {activeTab === 'adaptive' && (
              <div className="space-y-3">
                {quickActions.length > 0 ? (
                  quickActions.map((action) => {
                    const IconComponent = iconMap[action.icon] || HomeIcon;
                    return (
                      <ActionButton
                        key={action.id}
                        action={action}
                        IconComponent={IconComponent}
                        onClick={() => handleActionClick(action)}
                      />
                    );
                  })
                ) : (
                  <EmptyState 
                    title="Building Your Quick Actions"
                    description="Your personalized shortcuts will appear here as you use the system."
                  />
                )}
              </div>
            )}

            {/* Predictive Actions Tab */}
            {activeTab === 'predictive' && (
              <div className="space-y-3">
                {predictiveActions.length > 0 ? (
                  predictiveActions.map((action) => {
                    const IconComponent = iconMap[action.icon] || LightBulbIcon;
                    return (
                      <PredictiveActionButton
                        key={action.id}
                        action={action}
                        IconComponent={IconComponent}
                        onClick={() => handleActionClick(action)}
                      />
                    );
                  })
                ) : (
                  <EmptyState 
                    title="AI Predictions Ready"
                    description="AI-powered action suggestions will appear based on your workflow context."
                  />
                )}
              </div>
            )}

            {/* Team Learning Tab */}
            {activeTab === 'team' && (
              <div className="space-y-3">
                {teamSuggestions.length > 0 ? (
                  teamSuggestions.map((suggestion) => {
                    const IconComponent = iconMap[suggestion.icon] || UserGroupIcon;
                    return (
                      <TeamSuggestionButton
                        key={suggestion.id}
                        suggestion={suggestion}
                        IconComponent={IconComponent}
                        onClick={() => handleActionClick(suggestion)}
                      />
                    );
                  })
                ) : (
                  <EmptyState 
                    title="Team Insights Coming"
                    description="Learn from your team's best practices and successful workflows."
                  />
                )}
              </div>
            )}

            {/* Workflow Templates Tab */}
            {activeTab === 'templates' && (
              <div className="space-y-3">
                {workflowTemplates.length > 0 ? (
                  workflowTemplates.map((template) => (
                    <WorkflowTemplateButton
                      key={template.id}
                      template={template}
                      onClick={() => executeWorkflowTemplate(template)}
                    />
                  ))
                ) : (
                  <EmptyState 
                    title="Workflow Templates"
                    description="Saved sequences of common admin tasks will appear here."
                  />
                )}
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
              <div className="space-y-3">
                {integrationShortcuts.length > 0 ? (
                  integrationShortcuts.map((shortcut) => {
                    const IconComponent = iconMap[shortcut.icon] || BoltIcon;
                    return (
                      <IntegrationButton
                        key={shortcut.id}
                        shortcut={shortcut}
                        IconComponent={IconComponent}
                        onClick={() => window.open(shortcut.endpoint, '_blank')}
                      />
                    );
                  })
                ) : (
                  <EmptyState 
                    title="Integration Shortcuts"
                    description="Quick access to external tools and integrations will appear here."
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Component sub-components
function ActionButton({ action, IconComponent, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
    >
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${action.color} text-white mr-3 group-hover:scale-105 transition-transform duration-200`}>
        <IconComponent className="h-5 w-5" />
      </div>
      
      <div className="flex-1 text-left">
        <div className="flex items-center">
          <h4 className="font-medium theme-text-primary group-hover:text-blue-700">
            {action.title}
          </h4>
          {action.frequency > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
              {action.frequency} visits
            </span>
          )}
        </div>
        <p className="text-sm theme-text-secondary group-hover:text-blue-600">
          {action.description}
        </p>
      </div>
      
      <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

function PredictiveActionButton({ action, IconComponent, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center p-3 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 transition-all duration-200 group"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white mr-3">
        <IconComponent className="h-5 w-5" />
      </div>
      
      <div className="flex-1 text-left">
        <div className="flex items-center">
          <h4 className="font-medium text-purple-700">
            {action.title}
          </h4>
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
            {Math.round(action.confidence * 100)}% confident
          </span>
        </div>
        <p className="text-sm text-purple-600 mb-1">
          {action.description}
        </p>
        <p className="text-xs text-purple-500 italic">
          {action.reasoning}
        </p>
      </div>
    </button>
  );
}

function TeamSuggestionButton({ suggestion, IconComponent, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center p-3 rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all duration-200 group"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white mr-3">
        <IconComponent className="h-5 w-5" />
      </div>
      
      <div className="flex-1 text-left">
        <h4 className="font-medium text-green-700">
          {suggestion.title}
        </h4>
        <p className="text-sm text-green-600 mb-1">
          {suggestion.description}
        </p>
        <div className="flex items-center">
          <span className="text-xs text-green-500">
            ⏱️ Save {suggestion.estimatedTimeSaved} min
          </span>
          <span className="mx-2 text-green-300">•</span>
          <span className="text-xs text-green-500">
            👥 {suggestion.reasoning}
          </span>
        </div>
      </div>
    </button>
  );
}

function WorkflowTemplateButton({ template, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center p-3 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 transition-all duration-200 group"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 text-white mr-3">
        <PlayIcon className="h-5 w-5" />
      </div>
      
      <div className="flex-1 text-left">
        <h4 className="font-medium text-indigo-700">
          {template.name}
        </h4>
        <p className="text-sm text-indigo-600 mb-1">
          {template.description}
        </p>
        <div className="flex items-center">
          <span className="text-xs text-indigo-500">
            ⏱️ ~{Math.round(template.estimatedDuration / 60)} min
          </span>
          <span className="mx-2 text-indigo-300">•</span>
          <span className="text-xs text-indigo-500">
            ✅ {Math.round(template.success_rate * 100)}% success rate
          </span>
          <span className="mx-2 text-indigo-300">•</span>
          <span className="text-xs text-indigo-500">
            🔄 Used {template.usage_count} times
          </span>
        </div>
      </div>
    </button>
  );
}

function IntegrationButton({ shortcut, IconComponent, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center p-3 rounded-lg border border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 transition-all duration-200 group"
    >
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${shortcut.color} text-white mr-3`}>
        <IconComponent className="h-5 w-5" />
      </div>
      
      <div className="flex-1 text-left">
        <h4 className="font-medium text-orange-700">
          {shortcut.integration_name}
        </h4>
        <p className="text-sm text-orange-600 mb-1">
          Open in new tab
        </p>
        <span className="text-xs text-orange-500">
          ✅ {Math.round(shortcut.success_rate * 100)}% uptime
        </span>
      </div>
      
      <div className="text-orange-400 group-hover:text-orange-600 transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    </button>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-8">
      <BeakerIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
      <h4 className="text-lg font-medium theme-text-primary mb-2">
        {title}
      </h4>
      <p className="text-sm theme-text-secondary">
        {description}
      </p>
    </div>
  );
}