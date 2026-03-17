/**
 * Real-time Sentiment Analysis Dashboard Component
 * Phase 3: Advanced AI Dialler Implementation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  SpeakerWaveIcon,
  MicrophoneIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  HeartIcon,
  LightBulbIcon,
  BoltIcon,
  UserIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

// Types for sentiment analysis
interface SentimentData {
  id: string;
  callId: string;
  timestamp: Date;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  transcript: string;
  emotions: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
  };
  intent?: string;
  keywords: string[];
}

interface CoachingSuggestion {
  id: string;
  callId: string;
  agentId: string;
  type: 'objection_handling' | 'empathy' | 'closing' | 'product_knowledge' | 'tone_adjustment';
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  acknowledged: boolean;
}

interface CallQualityMetrics {
  callId: string;
  overallScore: number;
  sentimentTrend: Array<{ timestamp: Date; sentiment: number }>;
  talkTimeRatio: number;
  interruptionCount: number;
  silencePeriods: number;
  complianceScore: number;
}

interface SentimentDashboardProps {
  className?: string;
  agentId?: string;
  callId?: string;
}

export const SentimentDashboard: React.FC<SentimentDashboardProps> = ({ 
  className = '', 
  agentId,
  callId 
}) => {
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [coachingSuggestions, setCoachingSuggestions] = useState<CoachingSuggestion[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<CallQualityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  // Real-time sentiment data loading
  const loadSentimentData = useCallback(async () => {
    if (!callId && !agentId) return;

    try {
      setError(null);
      const params = new URLSearchParams();
      if (callId) params.append('callId', callId);
      if (agentId) params.append('agentId', agentId);

      const response = await axios.get(
        `${API_URL}/api/sentiment/analysis?${params.toString()}`,
        getAuthHeaders()
      );

      if (response.data.success) {
        setSentimentData(response.data.data.sentimentData || []);
        setQualityMetrics(response.data.data.qualityMetrics);
      }
    } catch (err) {
      console.error('Error loading sentiment data:', err);
      setError('Failed to load sentiment analysis data');
    }
  }, [callId, agentId]);

  // Load coaching suggestions
  const loadCoachingSuggestions = useCallback(async () => {
    if (!agentId) return;

    try {
      const response = await axios.get(
        `${API_URL}/api/sentiment/coaching/${agentId}`,
        getAuthHeaders()
      );

      if (response.data.success) {
        setCoachingSuggestions(response.data.data || []);
      }
    } catch (err) {
      console.error('Error loading coaching suggestions:', err);
    }
  }, [agentId]);

  // Initialize dashboard
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await Promise.all([
        loadSentimentData(),
        loadCoachingSuggestions()
      ]);
      setLoading(false);
    };

    initialize();
  }, [loadSentimentData, loadCoachingSuggestions]);

  // Set up real-time updates
  useEffect(() => {
    if (!callId && !agentId) return;

    setConnected(true);
    
    // Poll for updates every 5 seconds during active calls
    const interval = setInterval(() => {
      loadSentimentData();
      loadCoachingSuggestions();
    }, 5000);

    return () => {
      clearInterval(interval);
      setConnected(false);
    };
  }, [callId, agentId, loadSentimentData, loadCoachingSuggestions]);

  // Acknowledge coaching suggestion
  const acknowledgeSuggestion = async (suggestionId: string) => {
    try {
      await axios.patch(
        `${API_URL}/api/sentiment/coaching/${suggestionId}/acknowledge`,
        {},
        getAuthHeaders()
      );

      setCoachingSuggestions(prev =>
        prev.map(suggestion =>
          suggestion.id === suggestionId
            ? { ...suggestion, acknowledged: true }
            : suggestion
        )
      );
    } catch (err) {
      console.error('Error acknowledging suggestion:', err);
    }
  };

  // Get sentiment color
  const getSentimentColor = (sentiment: string, confidence: number) => {
    const alpha = Math.max(0.3, confidence);
    switch (sentiment) {
      case 'positive': return `rgba(34, 197, 94, ${alpha})`;
      case 'negative': return `rgba(239, 68, 68, ${alpha})`;
      default: return `rgba(156, 163, 175, ${alpha})`;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  // Generate sentiment chart data
  const sentimentChartData = {
    labels: sentimentData.slice(-20).map((_, index) => `T-${20-index}`),
    datasets: [{
      label: 'Sentiment Score',
      data: sentimentData.slice(-20).map(data => {
        const score = data.sentiment === 'positive' ? data.confidence : 
                     data.sentiment === 'negative' ? -data.confidence : 0;
        return score;
      }),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.1,
      fill: true
    }]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Real-time Sentiment Analysis'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        min: -1,
        max: 1,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading sentiment analysis...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} space-y-6`}>
      {/* Status Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${connected ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className="text-sm font-medium">
                {connected ? 'Live Sentiment Analysis' : 'Analysis Paused'}
              </span>
            </div>
            {callId && (
              <div className="text-sm text-gray-500">
                Call ID: {callId}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <SpeakerWaveIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-600">
              {sentimentData.length} analysis points
            </span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sentiment Chart */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="h-64">
              <Line data={sentimentChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Current Metrics */}
        <div className="space-y-4">
          {qualityMetrics && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Call Quality</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Overall Score</span>
                  <span className={`font-semibold ${
                    qualityMetrics.overallScore >= 8 ? 'text-green-600' :
                    qualityMetrics.overallScore >= 6 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {qualityMetrics.overallScore}/10
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Talk Ratio</span>
                  <span className="text-sm font-medium">
                    {Math.round(qualityMetrics.talkTimeRatio * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Interruptions</span>
                  <span className="text-sm font-medium">
                    {qualityMetrics.interruptionCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Compliance</span>
                  <span className={`text-sm font-medium ${
                    qualityMetrics.complianceScore >= 0.9 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Math.round(qualityMetrics.complianceScore * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Coaching Suggestions */}
      {coachingSuggestions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <LightBulbIcon className="h-5 w-5 text-yellow-500 mr-2" />
              Coaching Suggestions
            </h3>
            <span className="text-sm text-gray-500">
              {coachingSuggestions.filter(s => !s.acknowledged).length} unread
            </span>
          </div>
          
          <div className="space-y-3">
            {coachingSuggestions
              .filter(suggestion => !suggestion.acknowledged)
              .slice(0, 5)
              .map(suggestion => (
              <div
                key={suggestion.id}
                className={`p-4 rounded-lg border-2 ${getPriorityColor(suggestion.priority)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium capitalize">
                        {suggestion.type.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(suggestion.priority)}`}>
                        {suggestion.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{suggestion.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(suggestion.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => acknowledgeSuggestion(suggestion.id)}
                    className="ml-4 px-3 py-1 bg-white text-gray-700 text-xs rounded border hover:bg-gray-50"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sentiment Analysis */}
      {sentimentData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Analysis</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {sentimentData.slice(-10).reverse().map(data => (
              <div key={data.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full mt-2`} 
                     style={{ backgroundColor: getSentimentColor(data.sentiment, data.confidence) }}>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium capitalize ${
                      data.sentiment === 'positive' ? 'text-green-600' :
                      data.sentiment === 'negative' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {data.sentiment}
                    </span>
                    <span className="text-xs text-gray-500">
                      {Math.round(data.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">{data.transcript}</p>
                  {data.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {data.keywords.slice(0, 3).map((keyword, index) => (
                        <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!loading && sentimentData.length === 0 && !error && (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="text-center">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Sentiment Data</h3>
            <p className="text-gray-500">
              {callId ? 'Sentiment analysis will appear here during active calls.' : 
               'Select an active call to view real-time sentiment analysis.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};