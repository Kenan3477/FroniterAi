/**
 * Omnivox AI Flow Monitoring Dashboard
 * Real-time flow monitoring, analytics, and performance visualization
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  RotateCcw,
  Download,
  Filter,
  RefreshCw,
} from 'lucide-react';

// Types
interface FlowStatus {
  flowId: string;
  flowName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  activeVersion: number;
  currentRuns: number;
  lastActivity: string | null;
  alertLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issues: string[];
}

interface FlowMetrics {
  flowId: string;
  flowName: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  runningRuns: number;
  averageExecutionTime: number;
  successRate: number;
  lastExecution: string | null;
  currentVersion: number;
  isActive: boolean;
}

interface DashboardData {
  overview: {
    totalFlows: number;
    activeFlows: number;
    totalExecutions: number;
    activeExecutions: number;
    successRate: number;
    avgExecutionTime: number;
  };
  realTimeStatus: FlowStatus[];
  performanceMetrics: Array<{
    timestamp: string;
    executionTime: number;
    status: string;
    nodeCount: number;
    errorCount: number;
  }>;
  systemAlerts: {
    critical: number;
    high: number;
    medium: number;
    issues: Array<{
      flowId: string;
      flowName: string;
      issue: string;
      alertLevel: string;
    }>;
  };
  topPerformingFlows: FlowMetrics[];
  problematicFlows: FlowMetrics[];
  trends: {
    executionTrend: Array<{ timestamp: string; value: number }>;
    errorTrend: Array<{ timestamp: string; value: number }>;
    performanceTrend: Array<{ timestamp: string; value: number }>;
  };
}

const ALERT_COLORS = {
  LOW: '#22C55E',
  MEDIUM: '#F59E0B',
  HIGH: '#EF4444',
  CRITICAL: '#DC2626',
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const FlowMonitoringDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/monitoring/flows/dashboard');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }

      setDashboardData(result.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    fetchDashboardData();

    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchDashboardData, autoRefresh, refreshInterval]);

  // Export data
  const handleExportData = async (format: 'csv' | 'json') => {
    try {
      const response = await fetch(`/api/monitoring/flows/export?format=${format}`);
      if (!response.ok) throw new Error('Export failed');

      const filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 
        `flow-monitoring.${format}`;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading monitoring data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="mx-4 my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            className="ml-4" 
            size="sm" 
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchDashboardData();
            }}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!dashboardData) {
    return (
      <Alert className="mx-4 my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No monitoring data available</AlertDescription>
      </Alert>
    );
  }

  const { overview, realTimeStatus, systemAlerts, topPerformingFlows, problematicFlows, trends } = dashboardData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Flow Monitoring Dashboard</h1>
          <p className="text-muted-foreground">Real-time flow performance and analytics</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Auto-refresh:</span>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </div>
          
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => handleExportData('csv')}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flows</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalFlows}</div>
            <p className="text-xs text-muted-foreground">
              {overview.activeFlows} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Executions</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.activeExecutions}</div>
            <p className="text-xs text-muted-foreground">
              {overview.totalExecutions} total today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            {overview.successRate >= 95 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.successRate.toFixed(1)}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${Math.min(overview.successRate, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Execution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.avgExecutionTime.toFixed(1)}s</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      {systemAlerts.issues.length > 0 && (
        <Alert className={systemAlerts.critical > 0 ? "border-red-500 bg-red-50" : 
          systemAlerts.high > 0 ? "border-orange-500 bg-orange-50" : "border-yellow-500 bg-yellow-50"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">
              System Issues Detected: {systemAlerts.critical} Critical, {systemAlerts.high} High, {systemAlerts.medium} Medium
            </div>
            <div className="space-y-1">
              {systemAlerts.issues.slice(0, 3).map((issue, index) => (
                <div key={index} className="text-sm">
                  <Badge variant={issue.alertLevel === 'CRITICAL' ? 'destructive' : 'secondary'} className="mr-2">
                    {issue.alertLevel}
                  </Badge>
                  <strong>{issue.flowName}:</strong> {issue.issue}
                </div>
              ))}
              {systemAlerts.issues.length > 3 && (
                <p className="text-sm text-muted-foreground">
                  and {systemAlerts.issues.length - 3} more issues...
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="flows">Flow Status</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Execution Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Execution Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends.executionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <ChartTooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Error Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Error Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trends.errorTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <ChartTooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#EF4444" 
                      fill="#EF4444"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top and Problematic Flows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  Top Performing Flows
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformingFlows.map((flow) => (
                    <div key={flow.flowId} className="flex justify-between items-center p-3 rounded-lg border">
                      <div>
                        <div className="font-medium">{flow.flowName}</div>
                        <div className="text-sm text-muted-foreground">
                          {flow.totalRuns} runs
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          {flow.successRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {flow.averageExecutionTime.toFixed(1)}s avg
                        </div>
                      </div>
                    </div>
                  ))}
                  {topPerformingFlows.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No flow data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                  Problematic Flows
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {problematicFlows.map((flow) => (
                    <div key={flow.flowId} className="flex justify-between items-center p-3 rounded-lg border border-red-200">
                      <div>
                        <div className="font-medium">{flow.flowName}</div>
                        <div className="text-sm text-muted-foreground">
                          {flow.totalRuns} runs
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-red-600">
                          {flow.successRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {flow.failedRuns} failures
                        </div>
                      </div>
                    </div>
                  ))}
                  {problematicFlows.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No problematic flows detected
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="flows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Flow Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {realTimeStatus.map((flow) => (
                  <div key={flow.flowId} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ALERT_COLORS[flow.alertLevel] }}
                      />
                      <div>
                        <div className="font-medium">{flow.flowName}</div>
                        <div className="text-sm text-muted-foreground">
                          Version {flow.activeVersion} • {flow.status}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {flow.currentRuns} running
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {flow.lastActivity ? 
                            `Last: ${new Date(flow.lastActivity).toLocaleTimeString()}` : 
                            'No activity'
                          }
                        </div>
                      </div>
                      
                      {flow.issues.length > 0 && (
                        <div className="relative group">
                          <Badge variant="destructive">{flow.issues.length}</Badge>
                          <div className="absolute invisible group-hover:visible bg-black text-white text-xs rounded p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10 whitespace-nowrap">
                            <div className="space-y-1">
                              {flow.issues.map((issue, index) => (
                                <div key={index}>{issue}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trends.performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis />
                  <ChartTooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value) => [`${Number(value).toFixed(2)}s`, 'Execution Time']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Flow Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Flow Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: realTimeStatus.filter(f => f.status === 'ACTIVE').length },
                        { name: 'Inactive', value: realTimeStatus.filter(f => f.status === 'INACTIVE').length },
                        { name: 'Archived', value: realTimeStatus.filter(f => f.status === 'ARCHIVED').length },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Alert Level Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Alert Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { level: 'Low', count: realTimeStatus.filter(f => f.alertLevel === 'LOW').length },
                      { level: 'Medium', count: realTimeStatus.filter(f => f.alertLevel === 'MEDIUM').length },
                      { level: 'High', count: realTimeStatus.filter(f => f.alertLevel === 'HIGH').length },
                      { level: 'Critical', count: realTimeStatus.filter(f => f.alertLevel === 'CRITICAL').length },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="level" />
                    <YAxis />
                    <ChartTooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};