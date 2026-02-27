'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CpuChipIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface CoachingRecommendation {
  id: string;
  callId: string;
  agentId: string;
  type: 'suggestion' | 'warning' | 'opportunity' | 'compliance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  action?: string;
  timing: 'immediate' | 'next_pause' | 'call_end';
  confidence: number;
  triggers: string[];
  expiresAt: string;
  acknowledged?: boolean;
}

interface LiveCoachingPanelProps {
  agentId: string;
  currentCallId?: string;
}

export default function LiveCoachingPanel({ agentId, currentCallId }: LiveCoachingPanelProps) {
  const [recommendations, setRecommendations] = useState<CoachingRecommendation[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket for real-time coaching
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}`);
    
    ws.onopen = () => {
      console.log('🎯 Connected to coaching WebSocket');
      // Subscribe to coaching updates for this agent
      ws.send(JSON.stringify({
        type: 'subscribe_coaching',
        agentId: agentId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'live_coaching') {
          setRecommendations(prev => {
            // Remove expired recommendations
            const now = new Date();
            const active = prev.filter(r => new Date(r.expiresAt) > now);
            
            // Add new recommendations
            return [...active, ...data.recommendations];
          });
        }
      } catch (error) {
        console.error('Error parsing coaching message:', error);
      }
    };

    ws.onclose = () => {
      console.log('🎯 Coaching WebSocket disconnected');
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [agentId]);

  // Auto-remove expired recommendations
  useEffect(() => {
    const interval = setInterval(() => {
      setRecommendations(prev => {
        const now = new Date();
        return prev.filter(r => new Date(r.expiresAt) > now);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const acknowledgeRecommendation = async (recommendationId: string) => {
    if (!currentCallId) return;

    try {
      await fetch('/api/live-analysis/acknowledge-coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: currentCallId,
          recommendationId
        })
      });

      setRecommendations(prev => 
        prev.map(r => 
          r.id === recommendationId 
            ? { ...r, acknowledged: true }
            : r
        )
      );

      // Remove after 3 seconds
      setTimeout(() => {
        setRecommendations(prev => prev.filter(r => r.id !== recommendationId));
      }, 3000);

    } catch (error) {
      console.error('Error acknowledging recommendation:', error);
    }
  };

  const getTypeIcon = (type: CoachingRecommendation['type']) => {
    switch (type) {
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'opportunity':
        return <LightBulbIcon className="h-5 w-5" />;
      case 'compliance':
        return <ShieldCheckIcon className="h-5 w-5" />;
      default:
        return <CpuChipIcon className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: CoachingRecommendation['type'], priority: CoachingRecommendation['priority']) => {
    if (priority === 'critical') return 'text-red-600 bg-red-50 border-red-200';
    
    switch (type) {
      case 'warning':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'opportunity':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'compliance':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getPriorityIndicator = (priority: CoachingRecommendation['priority']) => {
    const colors = {
      low: 'bg-gray-400',
      medium: 'bg-yellow-400',
      high: 'bg-orange-500',
      critical: 'bg-red-500'
    };
    
    return (
      <div className={`w-3 h-3 rounded-full ${colors[priority]}`} 
           title={`${priority} priority`} />
    );
  };

  const activeRecommendations = recommendations.filter(r => 
    r.timing === 'immediate' && !r.acknowledged
  );

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className={`relative p-3 rounded-full shadow-lg transition-colors ${
            activeRecommendations.length > 0
              ? 'bg-orange-500 text-white animate-pulse'
              : 'bg-white text-gray-600 border'
          }`}
        >
          <CpuChipIcon className="h-6 w-6" />
          {activeRecommendations.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
              {activeRecommendations.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 z-50">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex items-center space-x-2">
            <CpuChipIcon className="h-5 w-5" />
            <h3 className="font-semibold">Live Coaching</h3>
            {activeRecommendations.length > 0 && (
              <span className="bg-white text-purple-600 text-xs px-2 py-1 rounded-full font-medium">
                {activeRecommendations.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Recommendations */}
        <div className="overflow-y-auto max-h-80">
          <AnimatePresence>
            {activeRecommendations.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <CpuChipIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No active coaching recommendations</p>
                <p className="text-xs text-gray-400 mt-1">AI is listening and will provide suggestions when helpful</p>
              </div>
            ) : (
              activeRecommendations.map((recommendation) => (
                <motion.div
                  key={recommendation.id}
                  initial={{ opacity: 0, x: 300 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -300 }}
                  className={`p-4 border-l-4 border-b ${getTypeColor(recommendation.type, recommendation.priority)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getTypeIcon(recommendation.type)}
                        <h4 className="font-medium text-sm">{recommendation.title}</h4>
                        {getPriorityIndicator(recommendation.priority)}
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">
                        {recommendation.message}
                      </p>
                      
                      {recommendation.action && (
                        <div className="bg-white bg-opacity-50 rounded p-2 mb-3">
                          <p className="text-xs font-medium text-gray-800">
                            💡 Suggested Action:
                          </p>
                          <p className="text-xs text-gray-700 mt-1">
                            {recommendation.action}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <ClockIcon className="h-3 w-3" />
                          <span>
                            Expires in {Math.round((new Date(recommendation.expiresAt).getTime() - new Date().getTime()) / 1000)}s
                          </span>
                          <span>•</span>
                          <span>{Math.round(recommendation.confidence * 100)}% confidence</span>
                        </div>
                        
                        <button
                          onClick={() => acknowledgeRecommendation(recommendation.id)}
                          className="flex items-center space-x-1 text-xs text-green-600 hover:text-green-700 transition-colors"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          <span>Got it</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {activeRecommendations.length > 0 && (
          <div className="p-2 bg-gray-50 border-t text-center">
            <p className="text-xs text-gray-500">
              Recommendations update in real-time based on conversation analysis
            </p>
          </div>
        )}
      </div>
    </div>
  );
}