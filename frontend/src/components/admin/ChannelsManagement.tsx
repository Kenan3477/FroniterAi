import React, { useState, useEffect } from 'react';
import {
  PhoneIcon,
  ChatBubbleLeftIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  SpeakerWaveIcon,
  VideoCameraIcon,
  PlayIcon,
  StopIcon,
  ClockIcon,
  PlusIcon,
  Cog8ToothIcon,
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
  settings: any;
}

interface VoiceConfig {
  outbound?: OutboundConfig;
  inbound?: InboundNumber[];
  recordings?: RecordingConfig;
  conferencing?: ConferencingConfig;
  inboundIVR?: InboundIVR[];
}

interface InboundNumber {
  id: string;
  number: string;
  description: string;
  destination: string;
  audioFile?: string;
  voicemailEnabled: boolean;
  recordingEnabled: boolean;
  status: 'active' | 'inactive';
}

interface OutboundConfig {
  enabled: boolean;
  callerId: string;
  recordingEnabled: boolean;
  voicemailDetection: boolean;
}

interface RecordingConfig {
  enabled: boolean;
  autoStart: boolean;
  storageLocation: string;
  retentionDays: number;
}

interface ConferencingConfig {
  enabled: boolean;
  maxParticipants: number;
  recordingEnabled: boolean;
  waitingRoom: boolean;
}

interface InboundIVR {
  id: string;
  name: string;
  audioFile: string;
  uploadedAt: string;
  duration?: string;
  size?: string;
}

const ChannelsManagement: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([
    {
      id: '1',
      name: 'Voice Channels',
      type: 'voice',
      status: 'active',
      settings: {}
    }
  ]);

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedVoiceTab, setSelectedVoiceTab] = useState<string>('inbound_numbers');

  const voiceTabs = [
    { id: 'inbound_numbers', label: 'Inbound Numbers', icon: PhoneIcon },
    { id: 'outbound', label: 'Outbound', icon: SpeakerWaveIcon },
    { id: 'recordings', label: 'Recordings', icon: VideoCameraIcon },
    { id: 'conferencing', label: 'Conferencing', icon: VideoCameraIcon }
  ];

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
  };

  const handleBackToChannels = () => {
    setSelectedChannel(null);
  };

  const handleUpdateVoiceConfig = (config: VoiceConfig) => {
    if (selectedChannel) {
      const updatedChannel = { ...selectedChannel, settings: config };
      setChannels(channels.map(c => c.id === selectedChannel.id ? updatedChannel : c));
      setSelectedChannel(updatedChannel);
    }
  };

  const renderVoiceTabContent = () => {
    const currentConfig = selectedChannel?.settings || {};

    switch (selectedVoiceTab) {
      case 'inbound_numbers':
        return (
          <InboundNumbersManager
            config={currentConfig}
            onUpdate={handleUpdateVoiceConfig}
          />
        );
      case 'outbound':
        return (
          <OutboundManager
            config={currentConfig}
            onUpdate={handleUpdateVoiceConfig}
          />
        );
      case 'recordings':
        return (
          <RecordingsManager
            config={currentConfig}
            onUpdate={handleUpdateVoiceConfig}
          />
        );
      case 'conferencing':
        return (
          <ConferencingManager
            config={currentConfig}
            onUpdate={handleUpdateVoiceConfig}
          />
        );
      default:
        return <div>Select a tab to configure</div>;
    }
  };

  if (selectedChannel && selectedChannel.type === 'voice') {
    return (
      <div className="bg-white rounded-lg shadow">
        {/* Voice Channel Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleBackToChannels}
                className="mr-4 p-1 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <PhoneIcon className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h2 className="text-lg font-medium text-gray-900">Voice Channel Configuration</h2>
                <p className="text-sm text-gray-500">Manage inbound/outbound voice settings</p>
              </div>
            </div>
          </div>
        </div>

        {/* Voice Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Voice Configuration">
            {voiceTabs.map((tab) => {
              const IconComponent = tab.icon;
              const isSelected = selectedVoiceTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedVoiceTab(tab.id)}
                  className={`${
                    isSelected
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <IconComponent className="h-4 w-4 mr-2" />
                  {tab.label}
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
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Communication Channels</h2>
        <p className="text-sm text-gray-500">Configure and manage all communication channels</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel) => {
            const getChannelIcon = () => {
              switch (channel.type) {
                case 'voice': return <PhoneIcon className="h-8 w-8 text-blue-600" />;
                case 'email': return <EnvelopeIcon className="h-8 w-8 text-green-600" />;
                case 'sms': return <DevicePhoneMobileIcon className="h-8 w-8 text-purple-600" />;
                case 'chat': return <ChatBubbleLeftIcon className="h-8 w-8 text-orange-600" />;
                default: return <PhoneIcon className="h-8 w-8 text-gray-600" />;
              }
            };

            const getStatusColor = () => {
              switch (channel.status) {
                case 'active': return 'text-green-800 bg-green-100';
                case 'inactive': return 'text-red-800 bg-red-100';
                case 'maintenance': return 'text-yellow-800 bg-yellow-100';
                default: return 'text-gray-800 bg-gray-100';
              }
            };

            return (
              <div
                key={channel.id}
                className="border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleChannelSelect(channel)}
              >
                <div className="flex items-center justify-between mb-4">
                  {getChannelIcon()}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
                    {channel.status}
                  </span>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 mb-2">{channel.name}</h3>
                <p className="text-sm text-gray-500 capitalize mb-4">{channel.type} communication</p>
                
                <div className="flex items-center text-sm text-gray-500">
                  <Cog8ToothIcon className="h-4 w-4 mr-1" />
                  Configure Settings
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Voice Channel Managers
const InboundNumbersManager: React.FC<{
  config: VoiceConfig;
  onUpdate: (config: VoiceConfig) => void;
}> = ({ config, onUpdate }) => {
  const [inboundNumbers, setInboundNumbers] = useState<InboundNumber[]>(config.inbound || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNumber, setEditingNumber] = useState<InboundNumber | null>(null);

  // Get available audio files from localStorage
  const getAvailableAudioFiles = (): InboundIVR[] => {
    try {
      const stored = localStorage.getItem('inboundAudioFiles');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const [availableAudioFiles] = useState<InboundIVR[]>(getAvailableAudioFiles());

  const handleSave = async (numberData: Partial<InboundNumber>) => {
    try {
      let updatedNumbers;
      if (editingNumber) {
        updatedNumbers = inboundNumbers.map(num => 
          num.id === editingNumber.id ? { ...editingNumber, ...numberData } : num
        );
      } else {
        const newNumber: InboundNumber = {
          id: Date.now().toString(),
          number: '',
          description: '',
          destination: '',
          voicemailEnabled: false,
          recordingEnabled: false,
          status: 'active',
          ...numberData
        };
        updatedNumbers = [...inboundNumbers, newNumber];
      }
      
      // Save to backend
      const response = await fetch('/api/voice/inbound-numbers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inbound: updatedNumbers })
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      const result = await response.json();
      console.log('Configuration saved:', result);
      
      setInboundNumbers(updatedNumbers);
      onUpdate({ ...config, inbound: updatedNumbers });
      setShowAddForm(false);
      setEditingNumber(null);
    } catch (error) {
      console.error('Error saving inbound numbers:', error);
      // Still update UI for now
      let updatedNumbers;
      if (editingNumber) {
        updatedNumbers = inboundNumbers.map(num => 
          num.id === editingNumber.id ? { ...editingNumber, ...numberData } : num
        );
      } else {
        const newNumber: InboundNumber = {
          id: Date.now().toString(),
          number: '',
          description: '',
          destination: '',
          voicemailEnabled: false,
          recordingEnabled: false,
          status: 'active',
          ...numberData
        };
        updatedNumbers = [...inboundNumbers, newNumber];
      }
      
      setInboundNumbers(updatedNumbers);
      onUpdate({ ...config, inbound: updatedNumbers });
      setShowAddForm(false);
      setEditingNumber(null);
    }
  };

  const handleDelete = (id: string) => {
    const updatedNumbers = inboundNumbers.filter(num => num.id !== id);
    setInboundNumbers(updatedNumbers);
    onUpdate({ ...config, inbound: updatedNumbers });
  };

  const toggleNumberStatus = (id: string) => {
    const updatedNumbers = inboundNumbers.map(num => 
      num.id === id ? { 
        ...num, 
        status: (num.status === 'active' ? 'inactive' : 'active') as 'active' | 'inactive'
      } : num
    );
    setInboundNumbers(updatedNumbers);
    onUpdate({ ...config, inbound: updatedNumbers });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Inbound Numbers</h3>
          <p className="text-sm text-gray-500">Configure incoming phone numbers and routing</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
        >
          <PlusIcon className="h-4 w-4 inline mr-2" />
          Add Number
        </button>
      </div>

      {/* Numbers Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Destination
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Audio File
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inboundNumbers.map(number => (
              <tr key={number.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {number.number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {number.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {number.destination}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {number.audioFile || 'None'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    number.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {number.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleNumberStatus(number.id)}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      Toggle
                    </button>
                    <button
                      onClick={() => {
                        setEditingNumber(number);
                        setShowAddForm(true);
                      }}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(number.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inboundNumbers.length === 0 && (
        <div className="text-center py-12">
          <PhoneIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Inbound Numbers</h3>
          <p className="text-gray-500">Add your first inbound number to start receiving calls</p>
        </div>
      )}

      {/* Add/Edit Number Form Modal */}
      {showAddForm && (
        <InboundNumberForm
          number={editingNumber}
          availableAudioFiles={availableAudioFiles}
          onSave={handleSave}
          onCancel={() => {
            setShowAddForm(false);
            setEditingNumber(null);
          }}
        />
      )}
    </div>
  );
};

const InboundNumberForm: React.FC<{
  number?: InboundNumber | null;
  availableAudioFiles: InboundIVR[];
  onSave: (data: Partial<InboundNumber>) => void;
  onCancel: () => void;
}> = ({ number, availableAudioFiles, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    number: number?.number || '',
    description: number?.description || '',
    destination: number?.destination || '',
    audioFile: number?.audioFile || '',
    voicemailEnabled: number?.voicemailEnabled || false,
    recordingEnabled: number?.recordingEnabled || false,
    status: number?.status || 'active'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {number ? 'Edit Inbound Number' : 'Add Inbound Number'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="text"
              value={formData.number}
              onChange={(e) => setFormData({...formData, number: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              placeholder="+1234567890"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              placeholder="Main support line"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Destination</label>
            <input
              type="text"
              value={formData.destination}
              onChange={(e) => setFormData({...formData, destination: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              placeholder="Queue or agent extension"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Audio File</label>
            <select
              value={formData.audioFile}
              onChange={(e) => setFormData({...formData, audioFile: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
            >
              <option value="">No audio file</option>
              {availableAudioFiles.map(file => (
                <option key={file.id} value={file.name}>
                  {file.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.voicemailEnabled}
                onChange={(e) => setFormData({...formData, voicemailEnabled: e.target.checked})}
                className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Voicemail</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.recordingEnabled}
                onChange={(e) => setFormData({...formData, recordingEnabled: e.target.checked})}
                className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Recording</span>
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
              {number ? 'Update' : 'Add'} Number
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const OutboundManager: React.FC<{
  config: VoiceConfig;
  onUpdate: (config: VoiceConfig) => void;
}> = ({ config, onUpdate }) => {
  const [outboundConfig, setOutboundConfig] = useState<OutboundConfig>(config.outbound || {
    enabled: false,
    callerId: '',
    recordingEnabled: false,
    voicemailDetection: false
  });

  const handleUpdate = (updates: Partial<OutboundConfig>) => {
    const newConfig = { ...outboundConfig, ...updates };
    setOutboundConfig(newConfig);
    onUpdate({ ...config, outbound: newConfig });
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900">Outbound Configuration</h3>
        <p className="text-sm text-gray-500">Configure outbound calling settings and caller ID</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center">
          <input
            id="outbound-enabled"
            type="checkbox"
            checked={outboundConfig.enabled}
            onChange={(e) => handleUpdate({ enabled: e.target.checked })}
            className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
          />
          <label htmlFor="outbound-enabled" className="ml-2 block text-sm text-gray-900">
            Enable Outbound Calling
          </label>
        </div>

        {outboundConfig.enabled && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Caller ID</label>
              <input
                type="text"
                value={outboundConfig.callerId}
                onChange={(e) => handleUpdate({ callerId: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                placeholder="+1234567890"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={outboundConfig.recordingEnabled}
                  onChange={(e) => handleUpdate({ recordingEnabled: e.target.checked })}
                  className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Call Recording</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={outboundConfig.voicemailDetection}
                  onChange={(e) => handleUpdate({ voicemailDetection: e.target.checked })}
                  className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Voicemail Detection</span>
              </label>
            </div>
          </>
        )}

        {!outboundConfig.enabled && (
          <div className="text-center py-12">
            <SpeakerWaveIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Outbound Calling Disabled</h3>
            <p className="text-gray-500">Enable outbound calling to configure settings</p>
          </div>
        )}
      </div>
    </div>
  );
};

const RecordingsManager: React.FC<{
  config: VoiceConfig;
  onUpdate: (config: VoiceConfig) => void;
}> = ({ config, onUpdate }) => {
  const [recordingConfig, setRecordingConfig] = useState<RecordingConfig>(config.recordings || {
    enabled: false,
    autoStart: false,
    storageLocation: 'cloud',
    retentionDays: 30
  });

  const handleUpdate = (updates: Partial<RecordingConfig>) => {
    const newConfig = { ...recordingConfig, ...updates };
    setRecordingConfig(newConfig);
    onUpdate({ ...config, recordings: newConfig });
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900">Recording Settings</h3>
        <p className="text-sm text-gray-500">Configure call recording and storage options</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center">
          <input
            id="recording-enabled"
            type="checkbox"
            checked={recordingConfig.enabled}
            onChange={(e) => handleUpdate({ enabled: e.target.checked })}
            className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
          />
          <label htmlFor="recording-enabled" className="ml-2 block text-sm text-gray-900">
            Enable Call Recording
          </label>
        </div>

        {recordingConfig.enabled && (
          <>
            <div className="flex items-center">
              <input
                id="auto-start"
                type="checkbox"
                checked={recordingConfig.autoStart}
                onChange={(e) => handleUpdate({ autoStart: e.target.checked })}
                className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
              />
              <label htmlFor="auto-start" className="ml-2 block text-sm text-gray-900">
                Auto-start recording
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Storage Location</label>
              <select
                value={recordingConfig.storageLocation}
                onChange={(e) => handleUpdate({ storageLocation: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              >
                <option value="cloud">Cloud Storage</option>
                <option value="local">Local Storage</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Retention Period (days)</label>
              <input
                type="number"
                value={recordingConfig.retentionDays}
                onChange={(e) => handleUpdate({ retentionDays: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                min="1"
                max="365"
              />
            </div>
          </>
        )}

        {!recordingConfig.enabled && (
          <div className="text-center py-12">
            <VideoCameraIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Call Recording Disabled</h3>
            <p className="text-gray-500">Enable recording to configure storage and retention settings</p>
            <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Recording Features:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Automatic call recording</li>
                <li>• Quality monitoring and compliance</li>
                <li>• Secure cloud storage</li>
                <li>• Configurable retention policies</li>
                <li>• Search and playback capabilities</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ConferencingManager: React.FC<{
  config: VoiceConfig;
  onUpdate: (config: VoiceConfig) => void;
}> = ({ config, onUpdate }) => {
  const [conferencingConfig, setConferencingConfig] = useState<ConferencingConfig>(config.conferencing || {
    enabled: false,
    maxParticipants: 10,
    recordingEnabled: false,
    waitingRoom: false
  });

  const handleUpdate = (updates: Partial<ConferencingConfig>) => {
    const newConfig = { ...conferencingConfig, ...updates };
    setConferencingConfig(newConfig);
    onUpdate({ ...config, conferencing: newConfig });
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900">Conference Settings</h3>
        <p className="text-sm text-gray-500">Configure audio conferencing and meeting rooms</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center">
          <input
            id="conferencing-enabled"
            type="checkbox"
            checked={conferencingConfig.enabled}
            onChange={(e) => handleUpdate({ enabled: e.target.checked })}
            className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
          />
          <label htmlFor="conferencing-enabled" className="ml-2 block text-sm text-gray-900">
            Enable Audio Conferencing
          </label>
        </div>

        {conferencingConfig.enabled && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Maximum Participants</label>
              <input
                type="number"
                value={conferencingConfig.maxParticipants}
                onChange={(e) => handleUpdate({ maxParticipants: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                min="2"
                max="100"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={conferencingConfig.recordingEnabled}
                  onChange={(e) => handleUpdate({ recordingEnabled: e.target.checked })}
                  className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Conference Recording</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={conferencingConfig.waitingRoom}
                  onChange={(e) => handleUpdate({ waitingRoom: e.target.checked })}
                  className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Waiting Room</span>
              </label>
            </div>
          </>
        )}

        {!conferencingConfig.enabled && (
          <div className="text-center py-12">
            <VideoCameraIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Conferencing Disabled</h3>
            <p className="text-gray-500">Enable conferencing to set up meeting rooms and controls</p>
            <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Conference Features:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Multi-party audio calls</li>
                <li>• Recording capabilities</li>
                <li>• Waiting rooms and entry sounds</li>
                <li>• Mute controls and moderation</li>
                <li>• Maximum participant limits</li>
                <li>• Auto-record options</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelsManagement;