'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  RefreshIcon
} from '@heroicons/react/24/outline';

interface PerformanceData {
  timestamp: string;
  performance: {
    averageProcessingTime: number;
    errorRate: number;
    throughput: number;
    memoryUsage: number;
    activeCalls: number;
  };
  accuracy: {
    rate: number;
    totalAnalyses: number;
    correctAnalyses: number;
    byMethod: Record<string, {
      total: number;
      correct: number;
      rate: number;
    }>;
  };
  metrics: {
    hour: Record<string, { avg: number; count: number; max: number; min: number }>;
    day: Record<string, { avg: number; count: number; max: number; min: number }>;
  };
  errors: Record<string, number>;
  operations: Record<string, number>;
}

interface AMDStats {
  activeCalls: number;
  detectedMachines: number;
  detectedHumans: number;
  averageConfidence: number;
  thresholds: Record<string, number>;
}

export default function PerformanceDashboard() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [amdStats, setAmdStats] = useState<AMDStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchPerformanceData = async () => {
    try {
      const [perfResponse, amdResponse] = await Promise.all([
        fetch('/api/live-analysis/performance/dashboard'),
        fetch('/api/live-analysis/amd/stats')
      ]);

      if (perfResponse.ok) {
        const perfData = await perfResponse.json();
        setPerformanceData(perfData.data);
      }

      if (amdResponse.ok) {
        const amdData = await amdResponse.json();
        setAmdStats(amdData.data);
      }

      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();

    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchPerformanceData, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusColor = (value: number, type: 'performance' | 'accuracy' | 'error'): string => {
    if (type === 'performance') {
      if (value < 500) return 'text-green-600 bg-green-50';
      if (value < 1000) return 'text-yellow-600 bg-yellow-50';
      return 'text-red-600 bg-red-50';
    } else if (type === 'accuracy') {
      if (value > 90) return 'text-green-600 bg-green-50';
      if (value > 80) return 'text-yellow-600 bg-yellow-50';
      return 'text-red-600 bg-red-50';
    } else { // error
      if (value < 1) return 'text-green-600 bg-green-50';
      if (value < 5) return 'text-yellow-600 bg-yellow-50';
      return 'text-red-600 bg-red-50';
    }
  };

  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
  };

  const getTrendIcon = (current: number, target: number) => {
    if (current > target) {
      return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
    } else if (current < target) {
      return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="text-center text-gray-500 p-8">
        <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>Unable to load performance data</p>
        <Button onClick={fetchPerformanceData} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Monitoring</h2>
          <p className="text-gray-600">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
          </label>
          <Button
            onClick={fetchPerformanceData}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshIcon className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* System Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <ClockIcon className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Avg Processing Time</p>
              <div className="flex items-center space-x-2">
                <p className={`text-lg font-semibold ${getStatusColor(performanceData.performance.averageProcessingTime, 'performance').split(' ')[0]}`}>
                  {formatNumber(performanceData.performance.averageProcessingTime, 0)}ms
                </p>
                {getTrendIcon(performanceData.performance.averageProcessingTime, 500)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-sm text-gray-600">Error Rate</p>
              <div className="flex items-center space-x-2">
                <p className={`text-lg font-semibold ${getStatusColor(performanceData.performance.errorRate, 'error').split(' ')[0]}`}>
                  {formatNumber(performanceData.performance.errorRate)}%
                </p>
                {getTrendIcon(performanceData.performance.errorRate, 1)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Throughput</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatNumber(performanceData.performance.throughput, 1)}/min
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <CpuChipIcon className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Memory Usage</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatNumber(performanceData.performance.memoryUsage, 0)}MB
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <ChartBarIcon className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Active Calls</p>
              <p className="text-lg font-semibold text-gray-900">
                {performanceData.performance.activeCalls}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Analysis Accuracy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Analysis Accuracy</h3>
            <Badge className={getStatusColor(performanceData.accuracy.rate, 'accuracy')}>
              {formatNumber(performanceData.accuracy.rate)}%
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Analyses:</span>
              <span className="font-medium">{performanceData.accuracy.totalAnalyses}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Correct Predictions:</span>
              <span className="font-medium text-green-600">{performanceData.accuracy.correctAnalyses}</span>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">By Detection Method:</h4>
            <div className="space-y-2">
              {Object.entries(performanceData.accuracy.byMethod).map(([method, stats]) => (
                <div key={method} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 capitalize">{method.replace('_', ' ')}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-800">{stats.correct}/{stats.total}</span>
                    <Badge variant="outline" className={getStatusColor(stats.rate, 'accuracy')}>
                      {formatNumber(stats.rate)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">AMD Statistics</h3>
            {amdStats && (
              <Badge variant="outline">
                {formatNumber(amdStats.averageConfidence * 100)}% avg confidence
              </Badge>
            )}
          </div>

          {amdStats && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Machines Detected</p>
                  <p className="text-2xl font-bold text-blue-600">{amdStats.detectedMachines}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Humans Detected</p>
                  <p className="text-2xl font-bold text-green-600">{amdStats.detectedHumans}</p>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>Active Calls: <span className="font-medium text-gray-900">{amdStats.activeCalls}</span></p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Error Summary */}
      {Object.keys(performanceData.errors).length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(performanceData.errors).map(([errorType, count]) => (
              <div key={errorType} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm text-gray-700 capitalize">{errorType.replace('_', ' ')}</span>
                <Badge variant="destructive">{count}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Operations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Operation Counts</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(performanceData.operations).map(([operation, count]) => (
            <div key={operation} className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 capitalize">{operation.replace('_', ' ')}</p>
              <p className="text-lg font-semibold text-gray-900">{count}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}