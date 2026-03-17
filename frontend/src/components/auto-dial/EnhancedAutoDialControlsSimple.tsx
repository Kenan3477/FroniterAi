/**
 * Enhanced Auto-Dial Controls - Phase 3 (Simplified)
 * React component for auto-dial controls with predictive capabilities
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Square, 
  Phone, 
  TrendingUp, 
  Users, 
  Clock, 
  Target,
  Brain,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { autoDialService, AutoDialStatus, PredictiveStats } from '@/services/autoDialService';

interface EnhancedAutoDialControlsProps {
  agentId: string;
  campaignId: string;
  agentStatus: 'Available' | 'OnCall' | 'Away' | 'Break' | 'Offline';
  onStatusChange?: (status: AutoDialStatus | null) => void;
}

export default function EnhancedAutoDialControls({
  agentId,
  campaignId,
  agentStatus,
  onStatusChange
}: EnhancedAutoDialControlsProps) {
  const [autoDialStatus, setAutoDialStatus] = useState<AutoDialStatus | null>(null);
  const [predictiveStats, setPredictiveStats] = useState<PredictiveStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [enablePredictive, setEnablePredictive] = useState(false);

  // Initialize and manage polling
  useEffect(() => {
    if (agentStatus === 'Available') {
      // Start polling for auto-dial status
      const interval = autoDialService.startStatusPolling(agentId, (status) => {
        setAutoDialStatus(status);
        if (onStatusChange) {
          onStatusChange(status);
        }
      }, 3000); // Poll every 3 seconds

      setPollingInterval(interval);

      // Fetch predictive stats
      fetchPredictiveStats();

      return () => {
        autoDialService.stopStatusPolling(interval);
      };
    } else {
      // Stop polling if agent not available
      if (pollingInterval) {
        autoDialService.stopStatusPolling(pollingInterval);
        setPollingInterval(null);
      }
      return undefined;
    }
  }, [agentId, agentStatus, onStatusChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        autoDialService.stopStatusPolling(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const fetchPredictiveStats = async () => {
    try {
      const stats = await autoDialService.getPredictiveStats(campaignId);
      setPredictiveStats(stats);
    } catch (error) {
      console.error('Error fetching predictive stats:', error);
    }
  };

  const handleStartAutoDial = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await autoDialService.startAutoDial(agentId, campaignId, enablePredictive);
      
      if (result.success) {
        setAutoDialStatus(result.autoDialStatus || null);
        if (onStatusChange && result.autoDialStatus) {
          onStatusChange(result.autoDialStatus);
        }
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start auto-dial');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopAutoDial = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await autoDialService.stopAutoDial(agentId);
      
      if (result.success) {
        setAutoDialStatus(null);
        if (onStatusChange) {
          onStatusChange(null);
        }
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to stop auto-dial');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseAutoDial = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await autoDialService.pauseAutoDial(agentId);
      
      if (result.success) {
        // Status will be updated via polling
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to pause auto-dial');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeAutoDial = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await autoDialService.resumeAutoDial(agentId);
      
      if (result.success) {
        // Status will be updated via polling
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to resume auto-dial');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (isActive: boolean, isPaused: boolean) => {
    if (!isActive) return 'secondary';
    if (isPaused) return 'outline'; // Using 'outline' instead of 'warning'
    return 'default';
  };

  const getStatusText = (isActive: boolean, isPaused: boolean) => {
    if (!isActive) return 'Inactive';
    if (isPaused) return 'Paused';
    return 'Active';
  };

  // Don't render if agent is not available
  if (agentStatus !== 'Available') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Auto-Dial Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Auto-dial available when status is Available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Auto-Dial Controls
          {autoDialStatus?.predictiveMode && (
            <Badge variant="outline" className="ml-2">
              <Brain className="w-3 h-3 mr-1" />
              Predictive
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Auto-Dial Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            <Badge 
              variant={autoDialStatus ? getStatusBadgeVariant(autoDialStatus.isActive, autoDialStatus.isPaused) : 'secondary'}
            >
              {autoDialStatus ? getStatusText(autoDialStatus.isActive, autoDialStatus.isPaused) : 'Inactive'}
            </Badge>
          </div>

          {autoDialStatus && autoDialStatus.isActive && (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>Calls:</span>
                  <span className="font-mono">{autoDialStatus.dialCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Queue:</span>
                  <span className="font-mono">{autoDialStatus.queueDepth}</span>
                </div>
              </div>

              {autoDialStatus.predictiveMode && autoDialStatus.dialRatio && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Dial Ratio:
                    </span>
                    <span className="font-mono">{autoDialStatus.dialRatio.toFixed(2)}:1</span>
                  </div>
                  
                  {autoDialStatus.lastPredictiveDecision && (
                    <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                      <div className="font-medium mb-1">Predictive Decision:</div>
                      <div>{autoDialStatus.lastPredictiveDecision.reasoning}</div>
                      
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>Expected Answers: {autoDialStatus.lastPredictiveDecision.predictedOutcome.expectedAnswers.toFixed(1)}</div>
                        <div>Expected Abandonment: {autoDialStatus.lastPredictiveDecision.predictedOutcome.expectedAbandonments.toFixed(1)}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Separator */}
        <hr className="border-gray-200" />

        {/* Predictive Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <label htmlFor="predictive-mode" className="flex items-center gap-2 text-sm font-medium">
              <Brain className="w-4 h-4" />
              Predictive Mode
            </label>
            <p className="text-xs text-gray-500">
              AI-powered dialing optimization
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              id="predictive-mode"
              type="checkbox"
              checked={enablePredictive}
              onChange={(e) => setEnablePredictive(e.target.checked)}
              disabled={autoDialStatus?.isActive || isLoading}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Separator */}
        <hr className="border-gray-200" />

        {/* Control Buttons */}
        <div className="space-y-2">
          {!autoDialStatus?.isActive ? (
            <Button 
              onClick={handleStartAutoDial}
              disabled={isLoading}
              className="w-full"
              variant="default"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Auto-Dial {enablePredictive ? '(Predictive)' : '(Standard)'}
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {autoDialStatus.isPaused ? (
                <Button 
                  onClick={handleResumeAutoDial}
                  disabled={isLoading}
                  variant="default"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Resume
                </Button>
              ) : (
                <Button 
                  onClick={handlePauseAutoDial}
                  disabled={isLoading}
                  variant="outline"
                >
                  <Pause className="w-4 h-4 mr-1" />
                  Pause
                </Button>
              )}
              
              <Button 
                onClick={handleStopAutoDial}
                disabled={isLoading}
                variant="destructive"
              >
                <Square className="w-4 h-4 mr-1" />
                Stop
              </Button>
            </div>
          )}
        </div>

        {/* Predictive Statistics */}
        {predictiveStats && (
          <>
            {/* Separator */}
            <hr className="border-gray-200" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Campaign Performance</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Answer Rate:</span>
                    <span className="font-mono">{(predictiveStats.averageAnswerRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-blue-600 h-1 rounded-full" 
                      style={{ width: `${predictiveStats.averageAnswerRate * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Utilization:</span>
                    <span className="font-mono">{(predictiveStats.averageUtilization * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-green-600 h-1 rounded-full" 
                      style={{ width: `${predictiveStats.averageUtilization * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Data Points: {predictiveStats.dataPoints}
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Abandonment: {(predictiveStats.averageAbandonmentRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}