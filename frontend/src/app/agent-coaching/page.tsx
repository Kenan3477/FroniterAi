'use client';

import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout';
import { 
  MicrophoneIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  SpeakerWaveIcon,
  EyeIcon,
  BoltIcon,
  ClockIcon,
  UserIcon,
  HeartIcon,
  TrophyIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ChatBubbleBottomCenterTextIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface Agent {
  id: string;
  name: string;
  status: 'available' | 'on-call' | 'busy' | 'offline';
  avatar: string;
  currentCall?: {
    contactName: string;
    contactPhone: string;
    startTime: Date;
    callType: 'inbound' | 'outbound';
    script: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    quality: number; // 1-10
  };
  stats: {
    callsToday: number;
    avgCallTime: number;
    conversionRate: number;
    satisfaction: number;
  };
}

interface CoachingAlert {
  id: string;
  agentId: string;
  type: 'script_deviation' | 'sentiment_negative' | 'call_too_long' | 'closing_opportunity' | 'objection_handling';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  acknowledged: boolean;
}

interface WhisperMessage {
  id: string;
  agentId: string;
  message: string;
  timestamp: Date;
  type: 'suggestion' | 'reminder' | 'warning' | 'encouragement';
}

const AgentCoaching = () => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [whisperMessage, setWhisperMessage] = useState('');
  const [liveTranscript, setLiveTranscript] = useState<Array<{
    speaker: 'agent' | 'contact';
    text: string;
    timestamp: Date;
    confidence: number;
  }>>([]);
  
  const [agents] = useState<Agent[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      status: 'on-call',
      avatar: '/avatars/sarah.jpg',
      currentCall: {
        contactName: 'John Smith',
        contactPhone: '+1 (555) 123-4567',
        startTime: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
        callType: 'outbound',
        script: 'Insurance Sales Script v2.1',
        sentiment: 'positive',
        quality: 8.5
      },
      stats: {
        callsToday: 12,
        avgCallTime: 6.2,
        conversionRate: 18.5,
        satisfaction: 4.3
      }
    },
    {
      id: '2',
      name: 'Mike Chen',
      status: 'available',
      avatar: '/avatars/mike.jpg',
      stats: {
        callsToday: 15,
        avgCallTime: 5.8,
        conversionRate: 22.1,
        satisfaction: 4.6
      }
    },
    {
      id: '3',
      name: 'Lisa Rodriguez',
      status: 'on-call',
      avatar: '/avatars/lisa.jpg',
      currentCall: {
        contactName: 'Emily Davis',
        contactPhone: '+1 (555) 987-6543',
        startTime: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
        callType: 'inbound',
        script: 'Customer Service Script v1.3',
        sentiment: 'negative',
        quality: 6.2
      },
      stats: {
        callsToday: 9,
        avgCallTime: 7.1,
        conversionRate: 15.8,
        satisfaction: 3.9
      }
    },
    {
      id: '4',
      name: 'David Park',
      status: 'busy',
      avatar: '/avatars/david.jpg',
      stats: {
        callsToday: 8,
        avgCallTime: 4.9,
        conversionRate: 25.3,
        satisfaction: 4.7
      }
    }
  ]);

  const [coachingAlerts, setCoachingAlerts] = useState<CoachingAlert[]>([
    {
      id: '1',
      agentId: '1',
      type: 'closing_opportunity',
      message: 'Contact has expressed strong interest. Good time to close.',
      severity: 'medium',
      timestamp: new Date(Date.now() - 30 * 1000),
      acknowledged: false
    },
    {
      id: '2',
      agentId: '3',
      type: 'sentiment_negative',
      message: 'Contact sentiment turning negative. Consider de-escalation techniques.',
      severity: 'high',
      timestamp: new Date(Date.now() - 45 * 1000),
      acknowledged: false
    },
    {
      id: '3',
      agentId: '1',
      type: 'script_deviation',
      message: 'Agent has deviated from approved script by 60%.',
      severity: 'low',
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      acknowledged: true
    }
  ]);

  const [whisperMessages, setWhisperMessages] = useState<WhisperMessage[]>([]);

  // Simulate live transcript updates
  useEffect(() => {
    if (selectedAgent?.currentCall) {
      const interval = setInterval(() => {
        const sampleTexts = [
          { speaker: 'contact', text: 'I see, that does sound like a good deal.' },
          { speaker: 'agent', text: 'Yes, and we can get you started today if you\'re ready.' },
          { speaker: 'contact', text: 'What would be the monthly payment?' },
          { speaker: 'agent', text: 'For the coverage we discussed, it would be $89 per month.' },
          { speaker: 'contact', text: 'That\'s actually less than what I\'m paying now.' }
        ];
        
        const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
        setLiveTranscript(prev => [...prev.slice(-10), {
          ...randomText,
          timestamp: new Date(),
          confidence: 0.85 + Math.random() * 0.15
        }]);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [selectedAgent]);

  const getCallDuration = (startTime: Date) => {
    const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-700';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-700';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-700';
      default: return 'bg-blue-100 border-blue-300 text-blue-700';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'closing_opportunity': return TrophyIcon;
      case 'sentiment_negative': return ExclamationTriangleIcon;
      case 'call_too_long': return ClockIcon;
      case 'script_deviation': return ChatBubbleLeftRightIcon;
      default: return LightBulbIcon;
    }
  };

  const sendWhisperMessage = () => {
    if (!whisperMessage.trim() || !selectedAgent) return;

    const newMessage: WhisperMessage = {
      id: Date.now().toString(),
      agentId: selectedAgent.id,
      message: whisperMessage.trim(),
      timestamp: new Date(),
      type: 'suggestion'
    };

    setWhisperMessages(prev => [...prev, newMessage]);
    setWhisperMessage('');
  };

  const acknowledgeAlert = (alertId: string) => {
    setCoachingAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true }
          : alert
      )
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'on-call': return 'text-blue-600 bg-blue-100';
      case 'busy': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const activeAlerts = coachingAlerts.filter(alert => 
    !alert.acknowledged && (!selectedAgent || alert.agentId === selectedAgent.id)
  );

  return (
    <MainLayout>
      <div className="h-screen flex">
        {/* Agent List Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Live Agents</h2>
            <p className="text-sm text-gray-500 mt-1">{agents.filter(a => a.status === 'on-call').length} active calls</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedAgent?.id === agent.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {agent.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                        agent.status === 'available' ? 'bg-green-500' :
                        agent.status === 'on-call' ? 'bg-blue-500' :
                        agent.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{agent.name}</div>
                      <div className={`text-xs px-2 py-1 rounded-full capitalize ${getStatusColor(agent.status)}`}>
                        {agent.status}
                      </div>
                    </div>
                  </div>
                </div>

                {agent.currentCall && (
                  <div className="ml-13 space-y-1">
                    <div className="text-sm font-medium text-gray-900">{agent.currentCall.contactName}</div>
                    <div className="text-xs text-gray-500">{agent.currentCall.contactPhone}</div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        {getCallDuration(agent.currentCall.startTime)}
                      </span>
                      <span className={`px-2 py-1 rounded-full ${getSentimentColor(agent.currentCall.sentiment)}`}>
                        {agent.currentCall.sentiment}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div>
                    <div className="text-gray-500">Calls Today</div>
                    <div className="font-medium">{agent.stats.callsToday}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Conversion</div>
                    <div className="font-medium">{agent.stats.conversionRate}%</div>
                  </div>
                </div>

                {/* Alert indicator */}
                {coachingAlerts.some(alert => alert.agentId === agent.id && !alert.acknowledged) && (
                  <div className="mt-2">
                    <div className="bg-red-100 border border-red-300 rounded px-2 py-1">
                      <span className="text-xs text-red-700 font-medium">
                        {coachingAlerts.filter(alert => alert.agentId === agent.id && !alert.acknowledged).length} alert(s)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {selectedAgent ? (
            <>
              {/* Header */}
              <div className="bg-white border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-lg font-medium text-gray-700">
                          {selectedAgent.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                        selectedAgent.status === 'available' ? 'bg-green-500' :
                        selectedAgent.status === 'on-call' ? 'bg-blue-500' :
                        selectedAgent.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">{selectedAgent.name}</h1>
                      <p className="text-gray-500 capitalize">{selectedAgent.status}</p>
                      
                      {selectedAgent.currentCall && (
                        <div className="flex items-center space-x-4 mt-1 text-sm">
                          <span className="flex items-center text-blue-600">
                            <PhoneIcon className="w-4 h-4 mr-1" />
                            {selectedAgent.currentCall.contactName}
                          </span>
                          <span className="flex items-center text-gray-600">
                            <ClockIcon className="w-4 h-4 mr-1" />
                            {getCallDuration(selectedAgent.currentCall.startTime)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {selectedAgent.currentCall && (
                      <>
                        <button
                          onClick={() => setIsListening(!isListening)}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
                            isListening 
                              ? 'bg-red-600 text-white hover:bg-red-700' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <EyeIcon className="w-4 h-4" />
                          <span>{isListening ? 'Stop Monitoring' : 'Monitor Call'}</span>
                        </button>
                        
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Call Quality</div>
                          <div className="font-bold text-lg">{selectedAgent.currentCall.quality}/10</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {selectedAgent.currentCall ? (
                <div className="flex-1 flex">
                  {/* Live Transcript & Coaching */}
                  <div className="flex-1 p-6">
                    {/* Active Alerts */}
                    {activeAlerts.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                          <ExclamationCircleIcon className="w-5 h-5 mr-2 text-red-600" />
                          Active Alerts ({activeAlerts.length})
                        </h3>
                        
                        <div className="space-y-3">
                          {activeAlerts.map((alert) => {
                            const AlertIcon = getAlertIcon(alert.type);
                            
                            return (
                              <div
                                key={alert.id}
                                className={`p-4 border rounded-lg ${getSeverityColor(alert.severity)}`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start space-x-3">
                                    <AlertIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <div className="font-medium">{alert.message}</div>
                                      <div className="text-sm opacity-75">
                                        {alert.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => acknowledgeAlert(alert.id)}
                                    className="px-3 py-1 bg-white border border-current rounded text-sm hover:bg-opacity-10"
                                  >
                                    Acknowledge
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Live Transcript */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
                        Live Transcript
                        {isListening && (
                          <span className="ml-2 flex items-center text-sm text-green-600">
                            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse mr-1"></div>
                            Monitoring
                          </span>
                        )}
                      </h3>

                      {isListening ? (
                        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                          {liveTranscript.length > 0 ? (
                            <div className="space-y-3">
                              {liveTranscript.map((entry, index) => (
                                <div
                                  key={index}
                                  className={`p-3 rounded-lg ${
                                    entry.speaker === 'agent' ? 'bg-blue-100' : 'bg-gray-100'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-sm font-medium ${
                                      entry.speaker === 'agent' ? 'text-blue-700' : 'text-gray-700'
                                    }`}>
                                      {entry.speaker === 'agent' ? selectedAgent.name : selectedAgent.currentCall!.contactName}
                                    </span>
                                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                                      <span>{entry.timestamp.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}</span>
                                      <span>{(entry.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                  </div>
                                  <p className="text-gray-800">{entry.text}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <MicrophoneIcon className="w-12 h-12 mx-auto mb-3" />
                              <p>Waiting for conversation...</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-8 text-center">
                          <EyeIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600">Click "Monitor Call" to see live transcript</p>
                        </div>
                      )}
                    </div>

                    {/* Whisper Coaching */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <SpeakerWaveIcon className="w-5 h-5 mr-2" />
                        Whisper Coaching
                      </h3>

                      <div className="space-y-3">
                        <div className="flex space-x-3">
                          <input
                            type="text"
                            value={whisperMessage}
                            onChange={(e) => setWhisperMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendWhisperMessage()}
                            placeholder="Type a coaching message to whisper to agent..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            onClick={sendWhisperMessage}
                            disabled={!whisperMessage.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                          >
                            Send
                          </button>
                        </div>

                        {/* Quick Suggestions */}
                        <div className="flex flex-wrap gap-2">
                          {[
                            'Ask about their current provider',
                            'Mention the discount expires soon',
                            'Address price objection with value',
                            'Ask for the close',
                            'Summarize benefits discussed'
                          ].map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => setWhisperMessage(suggestion)}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>

                        {/* Sent Messages */}
                        {whisperMessages.filter(m => m.agentId === selectedAgent.id).length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Messages</h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {whisperMessages
                                .filter(m => m.agentId === selectedAgent.id)
                                .slice(-5)
                                .map((message) => (
                                  <div key={message.id} className="bg-blue-50 p-2 rounded text-sm">
                                    <div className="text-blue-900">{message.message}</div>
                                    <div className="text-blue-600 text-xs mt-1">
                                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Agent Performance Sidebar */}
                  <div className="w-80 bg-gray-50 border-l border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>

                    <div className="space-y-4">
                      {/* Current Call Info */}
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-medium mb-3">Current Call</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Contact:</span>
                            <span className="font-medium">{selectedAgent.currentCall.contactName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Duration:</span>
                            <span className="font-medium">{getCallDuration(selectedAgent.currentCall.startTime)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Type:</span>
                            <span className="capitalize">{selectedAgent.currentCall.callType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Script:</span>
                            <span className="text-xs">{selectedAgent.currentCall.script}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Sentiment:</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${getSentimentColor(selectedAgent.currentCall.sentiment)}`}>
                              {selectedAgent.currentCall.sentiment}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Daily Stats */}
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-medium mb-3">Today's Stats</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Calls Made</span>
                            <span className="font-bold text-lg">{selectedAgent.stats.callsToday}</span>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Avg Call Time</span>
                              <span>{selectedAgent.stats.avgCallTime} min</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${Math.min(100, (selectedAgent.stats.avgCallTime / 10) * 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Conversion Rate</span>
                              <span>{selectedAgent.stats.conversionRate}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${selectedAgent.stats.conversionRate}%` }}
                              ></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Satisfaction</span>
                              <span>{selectedAgent.stats.satisfaction}/5</span>
                            </div>
                            <div className="flex space-x-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <HeartIcon 
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= selectedAgent.stats.satisfaction 
                                      ? 'text-red-500 fill-current' 
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Script Progress */}
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-medium mb-3">Script Adherence</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Current Script</span>
                            <span className="text-green-600 font-medium">85%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                          </div>
                          <div className="text-xs text-gray-500">
                            Following: {selectedAgent.currentCall?.script}
                          </div>
                        </div>
                      </div>

                      {/* AI Suggestions */}
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-medium mb-3 flex items-center">
                          <LightBulbIcon className="w-4 h-4 mr-1" />
                          AI Suggestions
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="p-2 bg-blue-50 rounded text-blue-800">
                            Contact seems interested. Consider closing soon.
                          </div>
                          <div className="p-2 bg-green-50 rounded text-green-800">
                            Good rapport building. Keep the conversation flowing.
                          </div>
                          <div className="p-2 bg-yellow-50 rounded text-yellow-800">
                            Address the price concern with value proposition.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">Agent Not on Call</h3>
                    <p className="text-gray-500">
                      {selectedAgent.status === 'available' ? 'Agent is available and waiting for calls' : 
                       selectedAgent.status === 'busy' ? 'Agent is busy with administrative tasks' : 
                       'Agent is offline'}
                    </p>
                    
                    {/* Agent Stats even when not on call */}
                    <div className="mt-6 bg-white rounded-lg p-6 max-w-md mx-auto">
                      <h4 className="font-medium mb-4">Today's Performance</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{selectedAgent.stats.callsToday}</div>
                          <div className="text-gray-500">Calls</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{selectedAgent.stats.conversionRate}%</div>
                          <div className="text-gray-500">Conversion</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{selectedAgent.stats.avgCallTime}m</div>
                          <div className="text-gray-500">Avg Duration</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{selectedAgent.stats.satisfaction}</div>
                          <div className="text-gray-500">Satisfaction</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <EyeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Agent Selected</h3>
                <p className="text-gray-500">Choose an agent from the list to monitor their calls and provide coaching</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AgentCoaching;