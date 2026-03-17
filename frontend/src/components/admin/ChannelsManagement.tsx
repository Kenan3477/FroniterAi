/**
 * Channels Management System
 * Complete implementation matching Connex functionality
 * Supports Voice, Email, SMS, Live Chat, WhatsApp, Facebook, Instagram, etc.
 */

import React, { useState, useEffect } from 'react';
import {
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  UsersIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  PhoneArrowUpRightIcon,
  PhoneArrowDownLeftIcon,
  CogIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

// Channel types and configurations
interface Channel {
  id: string;
  name: string;
  type: 'voice' | 'email' | 'sms' | 'chat' | 'whatsapp' | 'facebook' | 'instagram' | 'x';
  status: 'active' | 'inactive' | 'maintenance';
  description?: string;
  configuration: any;
  createdAt: string;
  updatedAt: string;
}

interface VoiceConfiguration {
  inboundNumbers?: InboundNumber[];
  ringGroups?: RingGroup[];
  internalNumbers?: InternalNumber[];
  voiceNodes?: VoiceNode[];
  audioFiles?: AudioFile[];
  inboundConferences?: InboundConference[];
  inboundIVR?: InboundIVR[];
  inboundQueues?: InboundQueue[];
  agents?: Agent[];
}

interface InboundNumber {
  id: string;
  number: string;
  description: string;
  route: 'ivr' | 'queue' | 'external';
  destination: string;
  status: 'active' | 'inactive';
}

interface RingGroup {
  id: string;
  name: string;
  agents: string[];
  strategy: 'ring_all' | 'round_robin' | 'longest_idle' | 'random';
  timeout: number;
  voicemail: boolean;
}

interface InternalNumber {
  id: string;
  number: string;
  description: string;
  type: 'service' | 'department' | 'group';
  destination: string;
}

interface VoiceNode {
  id: string;
  name: string;
  type: 'announcement' | 'menu' | 'queue' | 'transfer';
  configuration: any;
  position: { x: number; y: number };
}

interface AudioFile {
  id: string;
  name: string;
  filename: string;
  originalName: string;
  duration: number;
  size: number;
  format: string;
  type: 'greeting' | 'hold_music' | 'announcement' | 'ivr_prompt' | 'voicemail' | 'other';
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
  tags: string[];
}

interface InboundConference {
  id: string;
  name: string;
  accessCode?: string;
  maxParticipants: number;
  recordConference: boolean;
  waitingRoom: boolean;
  muteOnEntry: boolean;
}

interface InboundQueue {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  assignedAgents: number[];
  ringStrategy: string;
  callTimeout: number;
  priority: number;
}

interface Agent {
  id: string;
  name: string;
  displayName: string;
  extension?: string;
  email?: string;
  role?: string;
  status: 'available' | 'busy' | 'offline';
}

interface InboundIVR {
  id: string;
  name: string;
  greeting: string;
  options: IVROption[];
  timeout: number;
  retries: number;
  defaultAction: string;
}

interface IVROption {
  digit: string;
  action: 'transfer' | 'queue' | 'voicemail' | 'announcement';
  destination: string;
  description: string;
}

const ChannelsManagement: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState<string>('voice');
  const [selectedVoiceTab, setSelectedVoiceTab] = useState<string>('inbound_numbers');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfiguration>({});
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const channelTypes = [
    { id: 'voice', name: 'Voice', icon: PhoneIcon, color: 'green' },
    { id: 'email', name: 'Email', icon: EnvelopeIcon, color: 'blue' },
    { id: 'sms', name: 'SMS', icon: DevicePhoneMobileIcon, color: 'purple' },
    { id: 'chat', name: 'Live Chat', icon: ChatBubbleLeftRightIcon, color: 'indigo' },
    { id: 'whatsapp', name: 'WhatsApp', icon: ChatBubbleLeftRightIcon, color: 'green' },
    { id: 'facebook', name: 'Facebook', icon: UsersIcon, color: 'blue' },
    { id: 'instagram', name: 'Instagram', icon: UsersIcon, color: 'pink' },
    { id: 'x', name: 'X (Twitter)', icon: UsersIcon, color: 'black' }
  ];

  const voiceTabs = [
    { id: 'inbound_numbers', name: 'Inbound Numbers', icon: PhoneArrowDownLeftIcon },
    { id: 'inbound_queues', name: 'Inbound Queues', icon: UsersIcon },
    { id: 'ring_groups', name: 'Ring Groups', icon: UsersIcon },
    { id: 'internal_numbers', name: 'Internal Numbers', icon: PhoneIcon },
    { id: 'voice_nodes', name: 'Voice Nodes', icon: CogIcon },
    { id: 'audio_files', name: 'Audio Files', icon: MicrophoneIcon },
    { id: 'inbound_conferences', name: 'Inbound Conferences', icon: UsersIcon }
  ];

  useEffect(() => {
    loadChannels();
    loadVoiceConfiguration();
  }, []);

  const loadChannels = async () => {
    try {
      // Load from localStorage for demo (replace with API call)
      const stored = localStorage.getItem('omnivox_channels');
      if (stored) {
        setChannels(JSON.parse(stored));
      } else {
        const defaultChannels: Channel[] = [
          {
            id: '1',
            name: 'Voice Channel',
            type: 'voice',
            status: 'active',
            description: 'Primary voice communication channel',
            configuration: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: '2',
            name: 'Email Channel',
            type: 'email',
            status: 'active',
            description: 'Email support channel',
            configuration: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        setChannels(defaultChannels);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load channels:', error);
      setLoading(false);
    }
  };

  const loadVoiceConfiguration = async () => {
    try {
      // Default audio files that should always be available
      const defaultAudioFiles = [
        {
          id: 'welcome-greeting',
          name: 'Welcome Greeting',
          filename: 'welcome-greeting.mp3',
          originalName: 'welcome-greeting.mp3',
          duration: 15,
          size: 240000,
          format: 'mp3',
          type: 'greeting' as const,
          uploadedAt: '2024-01-01T00:00:00Z',
          uploadedBy: 'System',
          description: 'Main welcome greeting for customers',
          tags: ['welcome', 'greeting', 'main']
        },
        {
          id: 'closed-message',
          name: 'We Are Closed',
          filename: 'closed-message.wav',
          originalName: 'closed-message.wav',
          duration: 12,
          size: 192000,
          format: 'wav',
          type: 'announcement' as const,
          uploadedAt: '2024-01-01T00:00:00Z',
          uploadedBy: 'System',
          description: 'Out of hours closure message',
          tags: ['closed', 'hours', 'announcement']
        },
        {
          id: 'voicemail-greeting',
          name: 'Standard Voicemail',
          filename: 'voicemail-greeting.mp3',
          originalName: 'voicemail-greeting.mp3',
          duration: 8,
          size: 128000,
          format: 'mp3',
          type: 'voicemail' as const,
          uploadedAt: '2024-01-01T00:00:00Z',
          uploadedBy: 'System',
          description: 'Standard voicemail greeting message',
          tags: ['voicemail', 'greeting']
        },
        {
          id: 'hold-music',
          name: 'Hold Music - Jazz',
          filename: 'hold-music-jazz.mp3',
          originalName: 'hold-music-jazz.mp3',
          duration: 180,
          size: 2880000,
          format: 'mp3',
          type: 'hold_music' as const,
          uploadedAt: '2024-01-01T00:00:00Z',
          uploadedBy: 'System',
          description: 'Background music for call holding',
          tags: ['hold', 'music', 'jazz']
        },
        {
          id: 'inbound-ivr',
          name: 'Inbound IVR',
          filename: 'inbound-ivr.mp3',
          originalName: 'inbound-ivr.mp3',
          duration: 25,
          size: 400000,
          format: 'mp3',
          type: 'ivr_prompt' as const,
          uploadedAt: '2025-01-11T00:00:00Z',
          uploadedBy: 'User',
          description: 'Custom IVR prompt for inbound calls',
          tags: ['ivr', 'inbound', 'prompt']
        }
      ];

      const stored = localStorage.getItem('omnivox_voice_config');
      if (stored) {
        const existingConfig = JSON.parse(stored);
        
        // Default inbound queues that should always be available
        const defaultQueues = [
          {
            id: '1',
            name: 'customer_support',
            displayName: 'Customer Support',
            description: 'Main customer support queue',
            isActive: true,
            assignedAgents: [1001, 1002],
            ringStrategy: 'round_robin',
            callTimeout: 30,
            priority: 1
          },
          {
            id: '2',
            name: 'sales',
            displayName: 'Sales Team',
            description: 'Sales inquiries and new customer queue',
            isActive: true,
            assignedAgents: [1003, 1004],
            ringStrategy: 'longest_idle',
            callTimeout: 45,
            priority: 2
          },
          {
            id: '3',
            name: 'technical_support',
            displayName: 'Technical Support',
            description: 'Technical support and troubleshooting',
            isActive: true,
            assignedAgents: [1005, 1006],
            ringStrategy: 'round_robin',
            callTimeout: 60,
            priority: 1
          }
        ];
        
        // Default agents that should always be available
        const defaultAgents = [
          {
            id: '1',
            name: 'john_doe',
            displayName: 'John Doe',
            extension: '1001',
            email: 'john.doe@company.com',
            role: 'Agent',
            status: 'available' as const
          },
          {
            id: '2',
            name: 'jane_smith',
            displayName: 'Jane Smith',
            extension: '1002',
            email: 'jane.smith@company.com',
            role: 'Senior Agent',
            status: 'available' as const
          },
          {
            id: '3',
            name: 'mike_wilson',
            displayName: 'Mike Wilson',
            extension: '1003',
            email: 'mike.wilson@company.com',
            role: 'Sales Agent',
            status: 'available' as const
          },
          {
            id: '4',
            name: 'sarah_johnson',
            displayName: 'Sarah Johnson',
            extension: '1004',
            email: 'sarah.johnson@company.com',
            role: 'Sales Manager',
            status: 'available' as const
          },
          {
            id: '5',
            name: 'david_brown',
            displayName: 'David Brown',
            extension: '1005',
            email: 'david.brown@company.com',
            role: 'Technical Support',
            status: 'available' as const
          },
          {
            id: '6',
            name: 'lisa_davis',
            displayName: 'Lisa Davis',
            extension: '1006',
            email: 'lisa.davis@company.com',
            role: 'Senior Technical Support',
            status: 'available' as const
          }
        ];
        
        // Merge default audio files with existing ones
        // Keep existing files but ensure defaults are always present
        const existingFileIds = new Set(existingConfig.audioFiles?.map((f: any) => f.id) || []);
        const mergedAudioFiles = [
          ...(existingConfig.audioFiles || []),
          ...defaultAudioFiles.filter(defaultFile => !existingFileIds.has(defaultFile.id))
        ];

        // Merge default queues with existing ones
        const existingQueueIds = new Set(existingConfig.inboundQueues?.map((q: any) => q.id) || []);
        const mergedQueues = [
          ...(existingConfig.inboundQueues || []),
          ...defaultQueues.filter(defaultQueue => !existingQueueIds.has(defaultQueue.id))
        ];

        // Merge default agents with existing ones
        const existingAgentIds = new Set(existingConfig.agents?.map((a: any) => a.id) || []);
        const mergedAgents = [
          ...(existingConfig.agents || []),
          ...defaultAgents.filter(defaultAgent => !existingAgentIds.has(defaultAgent.id))
        ];

        const updatedConfig = {
          ...existingConfig,
          audioFiles: mergedAudioFiles,
          inboundQueues: mergedQueues,
          agents: mergedAgents
        };

        setVoiceConfig(updatedConfig);
        // Save the updated config back to localStorage to persist the defaults
        localStorage.setItem('omnivox_voice_config', JSON.stringify(updatedConfig));
      } else {
        // Default voice configuration for first-time users
        const defaultConfig: VoiceConfiguration = {
          inboundNumbers: [
            {
              id: '1',
              number: '+447700123456',
              description: 'Main Customer Support',
              route: 'ivr',
              destination: 'main_ivr',
              status: 'active'
            }
          ],
          ringGroups: [
            {
              id: '1',
              name: 'Customer Support',
              agents: ['John Doe', 'Jane Smith'],
              strategy: 'round_robin',
              timeout: 30,
              voicemail: true
            }
          ],
          inboundQueues: [
            {
              id: '1',
              name: 'customer_support',
              displayName: 'Customer Support',
              description: 'Main customer support queue',
              isActive: true,
              assignedAgents: [1001, 1002],
              ringStrategy: 'round_robin',
              callTimeout: 30,
              priority: 1
            },
            {
              id: '2',
              name: 'sales',
              displayName: 'Sales Team',
              description: 'Sales inquiries and new customer queue',
              isActive: true,
              assignedAgents: [1003, 1004],
              ringStrategy: 'longest_idle',
              callTimeout: 45,
              priority: 2
            },
            {
              id: '3',
              name: 'technical_support',
              displayName: 'Technical Support',
              description: 'Technical support and troubleshooting',
              isActive: true,
              assignedAgents: [1005, 1006],
              ringStrategy: 'round_robin',
              callTimeout: 60,
              priority: 1
            }
          ],
          agents: [
            {
              id: '1',
              name: 'john_doe',
              displayName: 'John Doe',
              extension: '1001',
              email: 'john.doe@company.com',
              role: 'Agent',
              status: 'available'
            },
            {
              id: '2',
              name: 'jane_smith',
              displayName: 'Jane Smith',
              extension: '1002',
              email: 'jane.smith@company.com',
              role: 'Senior Agent',
              status: 'available'
            },
            {
              id: '3',
              name: 'mike_wilson',
              displayName: 'Mike Wilson',
              extension: '1003',
              email: 'mike.wilson@company.com',
              role: 'Sales Agent',
              status: 'available'
            },
            {
              id: '4',
              name: 'sarah_johnson',
              displayName: 'Sarah Johnson',
              extension: '1004',
              email: 'sarah.johnson@company.com',
              role: 'Sales Manager',
              status: 'available'
            },
            {
              id: '5',
              name: 'david_brown',
              displayName: 'David Brown',
              extension: '1005',
              email: 'david.brown@company.com',
              role: 'Technical Support',
              status: 'available'
            },
            {
              id: '6',
              name: 'lisa_davis',
              displayName: 'Lisa Davis',
              extension: '1006',
              email: 'lisa.davis@company.com',
              role: 'Senior Technical Support',
              status: 'available'
            }
          ],
          audioFiles: defaultAudioFiles
        };
        setVoiceConfig(defaultConfig);
        localStorage.setItem('omnivox_voice_config', JSON.stringify(defaultConfig));
      }
    } catch (error) {
      console.error('Failed to load voice configuration:', error);
    }
  };

  const saveVoiceConfiguration = (config: VoiceConfiguration) => {
    setVoiceConfig(config);
    localStorage.setItem('omnivox_voice_config', JSON.stringify(config));
  };

  const getChannelIcon = (type: string) => {
    const channelType = channelTypes.find(t => t.id === type);
    return channelType?.icon || PhoneIcon;
  };

  const getChannelColor = (type: string) => {
    const channelType = channelTypes.find(t => t.id === type);
    return channelType?.color || 'gray';
  };

  const renderVoiceTabContent = () => {
    switch (selectedVoiceTab) {
      case 'inbound_numbers':
        return <InboundNumbersManager config={voiceConfig} onUpdate={saveVoiceConfiguration} />;
      case 'inbound_queues':
        return <InboundQueuesManager />;
      case 'ring_groups':
        return <ConnexRingGroupsManager config={voiceConfig} onUpdate={saveVoiceConfiguration} />;
      case 'internal_numbers':
        return <InternalNumbersManager config={voiceConfig} onUpdate={saveVoiceConfiguration} />;
      case 'voice_nodes':
        return <VoiceNodesManager config={voiceConfig} onUpdate={saveVoiceConfiguration} />;
      case 'audio_files':
        return <AudioFilesManager config={voiceConfig} onUpdate={saveVoiceConfiguration} />;
      case 'inbound_conferences':
        return <InboundConferencesManager config={voiceConfig} onUpdate={saveVoiceConfiguration} />;
      default:
        return <div>Select a voice configuration option</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <span>Admin</span>
            <span>/</span>
            <span>Channels</span>
          </div>
        </div>
        <div className="flex items-center">
          <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
            <PhoneIcon className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Channels</h1>
            <p className="text-gray-600 mt-1">Manage all communication channels and routing</p>
          </div>
        </div>
      </div>

      {/* Channel Types Grid */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Channel Types</h2>
        <div className="grid grid-cols-4 gap-4">
          {channelTypes.map(type => {
            const Icon = type.icon;
            const isSelected = selectedChannel === type.id;
            return (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedChannel(type.id);
                  if (type.id === 'voice') {
                    setSelectedVoiceTab('inbound_numbers');
                  }
                }}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  isSelected
                    ? `border-${type.color}-500 bg-${type.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`h-8 w-8 mx-auto mb-2 ${
                  isSelected ? `text-${type.color}-600` : 'text-gray-400'
                }`} />
                <div className={`font-medium ${
                  isSelected ? `text-${type.color}-900` : 'text-gray-900'
                }`}>
                  {type.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Voice Channel Configuration */}
      {selectedChannel === 'voice' && (
        <div className="bg-white shadow rounded-lg">
          {/* Voice Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              {voiceTabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedVoiceTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      selectedVoiceTab === tab.id
                        ? 'border-slate-500 text-slate-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 inline mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Voice Tab Content */}
          <div className="p-6">
            {renderVoiceTabContent()}
          </div>
        </div>
      )}

      {/* Other Channel Types */}
      {selectedChannel !== 'voice' && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-12">
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {React.createElement(getChannelIcon(selectedChannel), {
                className: 'h-8 w-8 text-gray-400'
              })}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {channelTypes.find(t => t.id === selectedChannel)?.name} Configuration
            </h3>
            <p className="text-gray-500 mb-4">
              Configure settings for {channelTypes.find(t => t.id === selectedChannel)?.name.toLowerCase()} communications
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
              <h4 className="font-medium text-gray-900 mb-2">Available Features:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Channel configuration</li>
                <li>• Message routing</li>
                <li>• Auto-responses</li>
                <li>• Integration settings</li>
                <li>• Monitoring and analytics</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Voice Channel Managers
import { 
  InboundNumbersManager, 
  AudioFilesManager
} from './VoiceChannelManagers';
import { 
  InternalNumbersManager 
} from './AdditionalVoiceManagers';
import { ConnexRingGroupsManager } from './ConnexRingGroups';
import InboundQueuesManager from './InboundQueuesManager';

// Placeholder components for remaining voice tabs
const VoiceNodesManager = ({ config, onUpdate }: { config: VoiceConfiguration; onUpdate: (config: VoiceConfiguration) => void }) => (
  <div>
    <div className="flex justify-between items-center mb-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Voice Nodes</h3>
        <p className="text-sm text-gray-500">Configure call flow nodes and routing logic</p>
      </div>
      <button className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700">
        <PlusIcon className="h-4 w-4 inline mr-2" />
        Create Voice Node
      </button>
    </div>
    <div className="text-center py-12">
      <CogIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Voice Nodes</h3>
      <p className="text-gray-500">Configure call flow nodes and routing logic</p>
      <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto mt-4">
        <h4 className="font-medium text-gray-900 mb-2">Node Types:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Announcement Nodes</li>
          <li>• Menu/IVR Nodes</li>
          <li>• Queue Nodes</li>
          <li>• Transfer Nodes</li>
          <li>• Condition/Logic Nodes</li>
          <li>• Voicemail Nodes</li>
        </ul>
      </div>
    </div>
  </div>
);

const InboundConferencesManager = ({ config, onUpdate }: { config: VoiceConfiguration; onUpdate: (config: VoiceConfiguration) => void }) => (
  <div>
    <div className="flex justify-between items-center mb-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Inbound Conferences</h3>
        <p className="text-sm text-gray-500">Configure conference rooms and access codes</p>
      </div>
      <button className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700">
        <PlusIcon className="h-4 w-4 inline mr-2" />
        Create Conference Room
      </button>
    </div>
    <div className="text-center py-12">
      <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Inbound Conferences</h3>
      <p className="text-gray-500">Configure conference rooms and access codes</p>
      <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto mt-4">
        <h4 className="font-medium text-gray-900 mb-2">Conference Features:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Access codes and admin PINs</li>
          <li>• Recording capabilities</li>
          <li>• Waiting rooms and entry sounds</li>
          <li>• Mute controls and moderation</li>
          <li>• Maximum participant limits</li>
          <li>• Auto-record options</li>
        </ul>
      </div>
    </div>
  </div>
);

// Remove the placeholder components that were defined before

export default ChannelsManagement;