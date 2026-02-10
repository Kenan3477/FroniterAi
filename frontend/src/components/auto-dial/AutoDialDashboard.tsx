/**
 * Auto-Dial Dashboard - Phase 3
 * Real-time monitoring dashboard for auto-dial operations across campaigns
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Phone, 
  Users, 
  TrendingUp, 
  Clock, 
  Target,
  Brain,
  PlayCircle,
  PauseCircle,
  StopCircle,
  RefreshCw
} from 'lucide-react';
import { autoDialService, EnhancedAutoDialSession, PredictiveStats } from '@/services/autoDialService';

interface AutoDialDashboardProps {
  refreshInterval?: number;
}

export default function AutoDialDashboard({
  refreshInterval = 5000
}: AutoDialDashboardProps) {
  const [sessions, setSessions] = useState<EnhancedAutoDialSession[]>([]);
  const [campaignStats, setCampaignStats] = useState<Map<string, PredictiveStats>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Start polling for session data
  useEffect(() => {
    fetchData();
    
    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);
    
    setPollingInterval(interval);
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [refreshInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const fetchData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch active sessions
      const sessionsData = await autoDialService.getEnhancedActiveSessions();
      setSessions(sessionsData);
      
      // Fetch campaign stats for unique campaigns
      const uniqueCampaigns = [...new Set(sessionsData.map(s => s.campaignId))];
      const statsMap = new Map<string, PredictiveStats>();
      
      await Promise.all(
        uniqueCampaigns.map(async (campaignId) => {
          const stats = await autoDialService.getPredictiveStats(campaignId);
          if (stats) {
            statsMap.set(campaignId, stats);
          }
        })
      );
      
      setCampaignStats(statsMap);
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData();
  };

  const getStatusBadgeVariant = (isActive: boolean, isPaused: boolean) => {
    if (!isActive) return 'secondary';
    if (isPaused) return 'outline';
    return 'default';
  };

  const getStatusText = (isActive: boolean, isPaused: boolean) => {
    if (!isActive) return 'Inactive';
    if (isPaused) return 'Paused';
    return 'Active';
  };

  const getTotalMetrics = () => {
    const activeCount = sessions.filter(s => s.isActive && !s.isPaused).length;
    const pausedCount = sessions.filter(s => s.isActive && s.isPaused).length;
    const totalCalls = sessions.reduce((sum, s) => sum + s.dialCount, 0);
    const totalQueue = sessions.reduce((sum, s) => sum + s.queueDepth, 0);
    const predictiveCount = sessions.filter(s => s.predictiveMode).length;

    return {
      activeCount,
      pausedCount,
      totalCalls,
      totalQueue,
      predictiveCount,
      totalSessions: sessions.length
    };
  };

  const metrics = getTotalMetrics();

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Auto-Dial Dashboard</h2>
          <p className="text-gray-600">Real-time monitoring across campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-green-600">{metrics.activeCount}</p>
              </div>
              <PlayCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paused</p>
                <p className="text-2xl font-bold text-yellow-600">{metrics.pausedCount}</p>
              </div>
              <PauseCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Calls</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.totalCalls}</p>
              </div>
              <Phone className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Queue Depth</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.totalQueue}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Predictive</p>
                <p className="text-2xl font-bold text-indigo-600">{metrics.predictiveCount}</p>
              </div>
              <Brain className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-600">{metrics.totalSessions}</p>
              </div>
              <Activity className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Active Auto-Dial Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No active auto-dial sessions</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-2">Agent</th>
                    <th className="text-left p-2">Campaign</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Mode</th>
                    <th className="text-left p-2">Calls</th>
                    <th className="text-left p-2">Queue</th>
                    <th className="text-left p-2">Dial Ratio</th>
                    <th className="text-left p-2">Session Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const sessionDuration = new Date().getTime() - new Date(session.sessionStartTime).getTime();
                    const hours = Math.floor(sessionDuration / (1000 * 60 * 60));
                    const minutes = Math.floor((sessionDuration % (1000 * 60 * 60)) / (1000 * 60));

                    return (
                      <tr key={`${session.agentId}-${session.campaignId}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-2">
                          <span className="font-mono text-sm">{session.agentId}</span>
                        </td>
                        <td className="p-2">
                          <span className="font-mono text-sm">{session.campaignId}</span>
                        </td>
                        <td className="p-2">
                          <Badge variant={getStatusBadgeVariant(session.isActive, session.isPaused)}>
                            {getStatusText(session.isActive, session.isPaused)}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {session.predictiveMode ? (
                            <Badge variant="outline">
                              <Brain className="w-3 h-3 mr-1" />
                              Predictive
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Standard</Badge>
                          )}
                        </td>
                        <td className="p-2">
                          <span className="font-mono">{session.dialCount}</span>
                        </td>
                        <td className="p-2">
                          <span className="font-mono">{session.queueDepth}</span>
                        </td>
                        <td className="p-2">
                          {session.dialRatio ? (
                            <span className="font-mono">{session.dialRatio.toFixed(2)}:1</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-2">
                          <span className="text-sm">
                            {hours > 0 ? `${hours}h ` : ''}{minutes}m
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Performance */}
      {campaignStats.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Campaign Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(campaignStats.entries()).map(([campaignId, stats]) => (
                <div key={campaignId} className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-3">
                    <h4 className="font-medium text-sm">{campaignId}</h4>
                    <p className="text-xs text-gray-500">{stats.dataPoints} data points</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Answer Rate:</span>
                      <span className="font-mono">{(stats.averageAnswerRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div 
                        className="bg-blue-600 h-1 rounded-full" 
                        style={{ width: `${stats.averageAnswerRate * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs">
                      <span>Utilization:</span>
                      <span className="font-mono">{(stats.averageUtilization * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div 
                        className="bg-green-600 h-1 rounded-full" 
                        style={{ width: `${stats.averageUtilization * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs">
                      <span>Abandonment:</span>
                      <span className="font-mono">{(stats.averageAbandonmentRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div 
                        className="bg-red-600 h-1 rounded-full" 
                        style={{ width: `${stats.averageAbandonmentRate * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predictive Insights */}
      {sessions.some(s => s.predictiveMode && s.lastPredictiveDecision) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Latest Predictive Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions
                .filter(s => s.predictiveMode && s.lastPredictiveDecision)
                .map((session) => (
                  <div key={`${session.agentId}-insight`} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Agent {session.agentId}</span>
                      <Badge variant="outline">
                        <Target className="w-3 h-3 mr-1" />
                        {session.dialRatio?.toFixed(2)}:1
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {session.lastPredictiveDecision?.reasoning}
                    </p>
                    {session.lastPredictiveDecision?.predictedOutcome && (
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <span>Expected Answers: {session.lastPredictiveDecision.predictedOutcome.expectedAnswers.toFixed(1)}</span>
                        <span>Expected Abandonment: {session.lastPredictiveDecision.predictedOutcome.expectedAbandonments.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}