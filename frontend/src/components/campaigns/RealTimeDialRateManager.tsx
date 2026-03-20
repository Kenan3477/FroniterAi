/**
 * Real-Time Dial Rate Manager Component
 * Campaign dial rate and routing configuration with live monitoring
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Gauge as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Play as StartIcon,
  Square as StopIcon,
  AlertTriangle as WarningIcon,
  History as HistoryIcon,
  Settings as SettingsIcon
} from 'lucide-react';

interface DialRateConfig {
  campaignId: string;
  currentRate: number;
  maxRate: number;
  minRate: number;
  autoAdjust: boolean;
  agentCount: number;
  abandonRateThreshold: number;
}

interface DialRateMetrics {
  campaignId: string;
  timestamp: string;
  connectRate: number;
  abandonRate: number;
  avgWaitTime: number;
  activeCalls: number;
  queuedCalls: number;
  availableAgents: number;
  totalAgents: number;
}

interface RealTimeDialRateManagerProps {
  campaignId?: string;
  onClose?: () => void;
}

export const RealTimeDialRateManager: React.FC<RealTimeDialRateManagerProps> = ({
  campaignId = 'demo-campaign',
  onClose
}) => {
  const [config, setConfig] = useState<DialRateConfig>({
    campaignId,
    currentRate: 1.5,
    maxRate: 3.0,
    minRate: 0.5,
    autoAdjust: true,
    agentCount: 12,
    abandonRateThreshold: 5.0
  });

  const [metrics, setMetrics] = useState<DialRateMetrics>({
    campaignId,
    timestamp: new Date().toISOString(),
    connectRate: 23.5,
    abandonRate: 3.2,
    avgWaitTime: 12.4,
    activeCalls: 8,
    queuedCalls: 15,
    availableAgents: 4,
    totalAgents: 12
  });

  const [isMonitoring, setIsMonitoring] = useState(true);

  const getRateIndicator = () => {
    if (metrics.abandonRate > config.abandonRateThreshold) {
      return { icon: <TrendingDownIcon className="h-4 w-4" />, color: 'destructive' as const, text: 'Reducing Rate' };
    } else if (metrics.connectRate > 30) {
      return { icon: <TrendingUpIcon className="h-4 w-4" />, color: 'default' as const, text: 'Optimal Rate' };
    } else {
      return { icon: <SpeedIcon className="h-4 w-4" />, color: 'secondary' as const, text: 'Monitoring' };
    }
  };

  const indicator = getRateIndicator();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SpeedIcon className="h-6 w-6" />
          <div>
            <h2 className="text-xl font-semibold">Real-Time Dial Rate Manager</h2>
            <p className="text-sm text-muted-foreground">Campaign: {campaignId}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={indicator.color}>
            {indicator.icon}
            {indicator.text}
          </Badge>
          <Button
            variant={isMonitoring ? "destructive" : "default"}
            size="sm"
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? <StopIcon className="h-4 w-4" /> : <StartIcon className="h-4 w-4" />}
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </Button>
        </div>
      </div>

      {/* Current Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{config.currentRate}x</div>
            <p className="text-xs text-muted-foreground">
              Range: {config.minRate}x - {config.maxRate}x
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Connect Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.connectRate}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeCalls} active calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Abandon Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              metrics.abandonRate > config.abandonRateThreshold ? 'text-destructive' : ''
            }`}>
              {metrics.abandonRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              Threshold: {config.abandonRateThreshold}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agent Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.availableAgents}/{metrics.totalAgents}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.queuedCalls} calls queued
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Adjustment Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5" />
            <span>Auto-Adjustment Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Auto-Adjust Enabled</label>
            <Badge variant={config.autoAdjust ? "default" : "secondary"}>
              {config.autoAdjust ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Min Rate</label>
              <p className="text-2xl font-semibold">{config.minRate}x</p>
            </div>
            <div>
              <label className="text-sm font-medium">Max Rate</label>
              <p className="text-2xl font-semibold">{config.maxRate}x</p>
            </div>
            <div>
              <label className="text-sm font-medium">Abandon Threshold</label>
              <p className="text-2xl font-semibold">{config.abandonRateThreshold}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Alerts */}
      {metrics.abandonRate > config.abandonRateThreshold && (
        <Alert variant="destructive">
          <WarningIcon className="h-4 w-4" />
          <AlertDescription>
            Abandon rate ({metrics.abandonRate}%) exceeds threshold ({config.abandonRateThreshold}%). 
            {config.autoAdjust ? ' Auto-adjustment is reducing dial rate.' : ' Consider reducing dial rate manually.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <HistoryIcon className="h-4 w-4 mr-2" />
              View History
            </Button>
            <Button variant="outline" size="sm">
              Emergency Stop
            </Button>
            <Button variant="outline" size="sm">
              Export Metrics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Note */}
      <Alert>
        <WarningIcon className="h-4 w-4" />
        <AlertDescription>
          <strong>Phase 3 Implementation Note:</strong> This interface displays simulated real-time data. 
          Full dial rate automation engine and Socket.IO integration are implemented in the backend. 
          Frontend socket connections and live metric updates are being finalized.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default RealTimeDialRateManager;