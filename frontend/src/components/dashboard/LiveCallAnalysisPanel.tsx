'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LiveCallAnalysis {
  callId: string;
  isAnsweringMachine: boolean;
  confidence: number;
  speechPattern: 'human' | 'machine' | 'unknown';
  sentimentScore: number;
  intentClassification: 'interested' | 'not_interested' | 'callback' | 'answering_machine' | 'analyzing';
  keywordDetection: {
    answeringMachineKeywords: string[];
    interestKeywords: string[];
    objectionKeywords: string[];
  };
  lastUpdate: string;
}

interface LiveAnalysisStats {
  activeCalls: number;
  totalProcessed: number;
  answeringMachinesDetected: number;
  successfulInteractions: number;
}

export default function LiveCallAnalysisPanel() {
  const [activeCalls, setActiveCalls] = useState<LiveCallAnalysis[]>([]);
  const [stats, setStats] = useState<LiveAnalysisStats>({
    activeCalls: 0,
    totalProcessed: 0,
    answeringMachinesDetected: 0,
    successfulInteractions: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch active calls and stats
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

      // Fetch active calls
      const callsResponse = await fetch(`${backendUrl}/api/live-analysis/active-calls`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (callsResponse.ok) {
        const callsData = await callsResponse.json();
        setActiveCalls(callsData.data.activeCalls);
      }

      // Fetch stats
      const statsResponse = await fetch(`${backendUrl}/api/live-analysis/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data.liveAnalysis);
      }

      setError(null);
    } catch (err) {
      setError('Failed to fetch live analysis data');
      console.error('Live analysis fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh every 5 seconds for live updates
    const interval = setInterval(fetchData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const getIntentBadgeColor = (intent: string) => {
    switch (intent) {
      case 'interested': return 'bg-green-100 text-green-800';
      case 'not_interested': return 'bg-red-100 text-red-800';
      case 'callback': return 'bg-yellow-100 text-yellow-800';
      case 'answering_machine': return 'bg-gray-100 text-gray-800';
      case 'analyzing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSpeechPatternIcon = (pattern: string) => {
    switch (pattern) {
      case 'human': return '👤';
      case 'machine': return '🤖';
      default: return '❓';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">🧠 Live Call Analysis</h2>
        <Badge variant="outline" className="bg-green-50 text-green-700">
          {activeCalls.length} Active
        </Badge>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-600">Active Calls</div>
            <div className="text-2xl font-bold text-blue-600">{stats.activeCalls}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-600">Total Processed</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalProcessed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-600">Answering Machines</div>
            <div className="text-2xl font-bold text-red-600">{stats.answeringMachinesDetected}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-600">Successful</div>
            <div className="text-2xl font-bold text-green-600">{stats.successfulInteractions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Calls List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Active Call Analyses</h3>
        
        {activeCalls.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-gray-500">
                <p className="text-lg">No active calls being analyzed</p>
                <p className="text-sm mt-2">Live analysis will appear here when calls are in progress</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          activeCalls.map((call) => (
            <Card key={call.callId} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    📞 Call {call.callId.slice(-8)}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getSpeechPatternIcon(call.speechPattern)}</span>
                    <Badge className={getIntentBadgeColor(call.intentClassification)}>
                      {call.intentClassification.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Confidence and Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">AI Confidence</span>
                      <span className="text-sm font-bold">{(call.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${call.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Sentiment Score</span>
                      <span className="text-sm font-bold">{(call.sentimentScore * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          call.sentimentScore > 0.6 ? 'bg-green-500' : 
                          call.sentimentScore > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${call.sentimentScore * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Answering Machine Detection */}
                {call.isAnsweringMachine && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-600">🤖</span>
                      <span className="text-sm font-medium text-yellow-800">
                        Answering Machine Detected
                      </span>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        {(call.confidence * 100).toFixed(1)}% confident
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Keywords Detected */}
                {(call.keywordDetection.interestKeywords.length > 0 || 
                  call.keywordDetection.objectionKeywords.length > 0 ||
                  call.keywordDetection.answeringMachineKeywords.length > 0) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Keywords Detected</h4>
                    
                    {call.keywordDetection.interestKeywords.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs text-green-600">Interest:</span>
                        {call.keywordDetection.interestKeywords.map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-green-100 text-green-800 text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {call.keywordDetection.objectionKeywords.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs text-red-600">Objections:</span>
                        {call.keywordDetection.objectionKeywords.map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-red-100 text-red-800 text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {call.keywordDetection.answeringMachineKeywords.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs text-gray-600">Machine:</span>
                        {call.keywordDetection.answeringMachineKeywords.map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-gray-100 text-gray-800 text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Last Update */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Speech Pattern: {call.speechPattern}</span>
                  <span>Last Update: {new Date(call.lastUpdate).toLocaleTimeString()}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}