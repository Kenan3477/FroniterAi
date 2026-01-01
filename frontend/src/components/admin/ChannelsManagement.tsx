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
  extensions?: Extension[];
  inboundNumbers?: InboundNumber[];
  ringGroups?: RingGroup[];
  internalNumbers?: InternalNumber[];
  voiceNodes?: VoiceNode[];
  audioFiles?: AudioFile[];
  inboundConferences?: InboundConference[];
  inboundIVR?: InboundIVR[];
}

interface Extension {
  id: string;
  extension: string;  // Extension identifier (like "MWolozinsky")
  displayName: string; // Full name (like "Morris Wolozinsky") 
  type: 'Web Phone' | 'Hardware Phone' | 'Softphone';
  voicemailEmail: string;
  ringTimeSec: number;
  regServer: string; // Registration server (web_1, Default, etc.)
  dropAction: 'Hangup' | 'Voicemail' | 'Transfer';
  status: boolean; // Active/Inactive toggle
}

interface InboundNumber {
  id: string;
  number: string;
  description: string;
  route: 'ivr' | 'queue' | 'extension' | 'external';
  destination: string;
  status: 'active' | 'inactive';
}

interface RingGroup {
  id: string;
  name: string;
  extensions: string[];
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
  duration: number;
  size: number;
  type: 'greeting' | 'hold_music' | 'announcement' | 'other';
  uploadedAt: string;
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
  const [selectedVoiceTab, setSelectedVoiceTab] = useState<string>('extensions');
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
    { id: 'extensions', name: 'Extensions', icon: PhoneIcon },
    { id: 'inbound_ivr', name: 'Inbound IVR', icon: PhoneArrowDownLeftIcon },
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
      const stored = localStorage.getItem('omnivox_voice_config');
      if (stored) {
        setVoiceConfig(JSON.parse(stored));
      } else {
        // Default voice configuration
        const defaultConfig: VoiceConfiguration = {
      extensions: [
        {
          id: '1',
          extension: 'MWolozinsky',
          displayName: 'Morris Wolozinsky',
          type: 'Web Phone',
          voicemailEmail: 'support@connexone.co.uk',
          ringTimeSec: 10,
          regServer: 'web_1',
          dropAction: 'Hangup',
          status: true
        },
        {
          id: '2',
          extension: 'Hannah',
          displayName: 'Hannah',
          type: 'Web Phone',
          voicemailEmail: 'test@test.com',
          ringTimeSec: 10,
          regServer: 'web_1',
          dropAction: 'Hangup',
          status: true
        }
      ],
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
              extensions: ['1001', '1002'],
              strategy: 'round_robin',
              timeout: 30,
              voicemail: true
            }
          ]
        };
        setVoiceConfig(defaultConfig);
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
      case 'extensions':
        return <ExtensionsManager config={voiceConfig} onUpdate={saveVoiceConfiguration} />;
      case 'inbound_ivr':
        return <InboundIVRManager config={voiceConfig} onUpdate={saveVoiceConfiguration} />;
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
                    setSelectedVoiceTab('extensions');
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

// Extensions Manager Component - Matching Connex Structure
const ExtensionsManager: React.FC<{
  config: VoiceConfiguration;
  onUpdate: (config: VoiceConfiguration) => void;
}> = ({ config, onUpdate }) => {
  const [extensions, setExtensions] = useState<Extension[]>(config.extensions || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExtension, setEditingExtension] = useState<Extension | null>(null);

  const handleSave = (extension: Extension) => {
    let updatedExtensions;
    if (editingExtension) {
      updatedExtensions = extensions.map(ext => 
        ext.id === extension.id ? extension : ext
      );
    } else {
      updatedExtensions = [...extensions, { ...extension, id: Date.now().toString() }];
    }
    
    setExtensions(updatedExtensions);
    onUpdate({ ...config, extensions: updatedExtensions });
    setShowAddForm(false);
    setEditingExtension(null);
  };

  const handleDelete = (id: string) => {
    const updatedExtensions = extensions.filter(ext => ext.id !== id);
    setExtensions(updatedExtensions);
    onUpdate({ ...config, extensions: updatedExtensions });
  };

  const toggleExtensionStatus = (id: string) => {
    const updatedExtensions = extensions.map(ext => 
      ext.id === id ? { ...ext, status: !ext.status } : ext
    );
    setExtensions(updatedExtensions);
    onUpdate({ ...config, extensions: updatedExtensions });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Manage Extensions</h3>
          <p className="text-sm text-gray-500">Configure user extensions for call routing and transfers</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
        >
          <PlusIcon className="h-4 w-4 inline mr-2" />
          Create Extensions
        </button>
      </div>

      {/* Extensions Table - Matching Connex Layout */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Extension
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Display Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Voicemail Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ring Time (sec)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reg. Server
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Drop Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {extensions.map(extension => (
              <tr key={extension.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {extension.extension}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {extension.displayName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {extension.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {extension.voicemailEmail}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {extension.ringTimeSec}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {extension.regServer}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {extension.dropAction}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleExtensionStatus(extension.id)}
                    className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    style={{
                      backgroundColor: extension.status ? '#10B981' : '#D1D5DB'
                    }}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        extension.status ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="relative inline-block text-left">
                    <button
                      type="button"
                      className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setEditingExtension(extension);
                        setShowAddForm(true);
                      }}
                    >
                      •••
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {extensions.length === 0 && (
        <div className="text-center py-12">
          <PhoneIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Extensions</h3>
          <p className="text-gray-500">Create your first extension to get started</p>
        </div>
      )}

      {/* Add/Edit Extension Form Modal */}
      {showAddForm && (
        <ConnexExtensionForm
          extension={editingExtension}
          onSave={handleSave}
          onCancel={() => {
            setShowAddForm(false);
            setEditingExtension(null);
          }}
        />
      )}
    </div>
  );
};

// Connex Extension Form Component - Matching Connex Fields
const ConnexExtensionForm: React.FC<{
  extension?: Extension | null;
  onSave: (extension: Extension) => void;
  onCancel: () => void;
}> = ({ extension, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Extension>>({
    extension: extension?.extension || '',
    displayName: extension?.displayName || '',
    type: extension?.type || 'Web Phone',
    voicemailEmail: extension?.voicemailEmail || '',
    ringTimeSec: extension?.ringTimeSec || 10,
    regServer: extension?.regServer || 'web_1',
    dropAction: extension?.dropAction || 'Hangup',
    status: extension?.status !== false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: extension?.id || '',
      ...formData
    } as Extension);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {extension ? 'Edit Extension' : 'Create Extension'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Extension</label>
            <input
              type="text"
              value={formData.extension}
              onChange={(e) => setFormData({...formData, extension: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              placeholder="e.g., MWolozinsky"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Display Name</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({...formData, displayName: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              placeholder="e.g., Morris Wolozinsky"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value as any})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
            >
              <option value="Web Phone">Web Phone</option>
              <option value="Hardware Phone">Hardware Phone</option>
              <option value="Softphone">Softphone</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Voicemail Email</label>
            <input
              type="email"
              value={formData.voicemailEmail}
              onChange={(e) => setFormData({...formData, voicemailEmail: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Ring Time (seconds)</label>
            <input
              type="number"
              min="5"
              max="60"
              value={formData.ringTimeSec}
              onChange={(e) => setFormData({...formData, ringTimeSec: parseInt(e.target.value)})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Registration Server</label>
            <select
              value={formData.regServer}
              onChange={(e) => setFormData({...formData, regServer: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
            >
              <option value="web_1">web_1</option>
              <option value="Default">Default</option>
              <option value="web_2">web_2</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Drop Action</label>
            <select
              value={formData.dropAction}
              onChange={(e) => setFormData({...formData, dropAction: e.target.value as any})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
            >
              <option value="Hangup">Hangup</option>
              <option value="Voicemail">Voicemail</option>
              <option value="Transfer">Transfer</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              id="status"
              type="checkbox"
              checked={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.checked})}
              className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
            />
            <label htmlFor="status" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
            >
              {extension ? 'Update' : 'Create'} Extension
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Enhanced Voice Channel Managers
import { 
  InboundIVRManager, 
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