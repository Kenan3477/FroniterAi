import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { trackEvent } from '../store/analyticsSlice';
import { apiService } from '../services/apiService';
import {
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  CurrencyDollarIcon,
  TrendingUpIcon,
  ClockIcon,
  EyeIcon,
  RefreshIcon,
} from '@heroicons/react/24/outline';

interface MetricData {
  label: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  trend: number[];
  icon: React.ComponentType<any>;
  color: string;
}

const MetricsPanel: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeframe, setTimeframe] = useState('7d');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load metrics data
  const loadMetrics = async (tf: string = timeframe) => {
    try {
      setLoading(true);
      const data = await apiService.getDashboardMetrics(tf);
      
      const metricsData: MetricData[] = [
        {
          label: 'Revenue',
          value: `$${(data.metrics.revenue / 1000).toFixed(1)}K`,
          change: data.metrics.growth,
          changeType: data.metrics.growth > 0 ? 'increase' : data.metrics.growth < 0 ? 'decrease' : 'neutral',
          trend: Array.from({ length: 7 }, (_, i) => data.metrics.revenue * (1 + Math.random() * 0.1 - 0.05)),
          icon: CurrencyDollarIcon,
          color: 'green',
        },
        {
          label: 'Customers',
          value: data.metrics.customers.toLocaleString(),
          change: 8.2,
          changeType: 'increase',
          trend: Array.from({ length: 7 }, (_, i) => data.metrics.customers * (1 + Math.random() * 0.05)),
          icon: UsersIcon,
          color: 'blue',
        },
        {
          label: 'Retention Rate',
          value: `${data.metrics.retention.toFixed(1)}%`,
          change: -2.1,
          changeType: 'decrease',
          trend: Array.from({ length: 7 }, (_, i) => data.metrics.retention * (1 + Math.random() * 0.02 - 0.01)),
          icon: TrendingUpIcon,
          color: 'purple',
        },
        {
          label: 'Satisfaction',
          value: `${data.metrics.satisfaction.toFixed(1)}/5`,
          change: 0.3,
          changeType: 'increase',
          trend: Array.from({ length: 7 }, (_, i) => data.metrics.satisfaction * (1 + Math.random() * 0.1 - 0.05)),
          icon: ChartBarIcon,
          color: 'yellow',
        },
      ];

      setMetrics(metricsData);
      setLastUpdated(new Date());
      
      dispatch(trackEvent({
        event: 'metrics_loaded',
        properties: { timeframe: tf, metricsCount: metricsData.length }
      }));

    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh metrics
  useEffect(() => {
    loadMetrics();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadMetrics();
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeframe, autoRefresh]);

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    dispatch(trackEvent({
      event: 'metrics_timeframe_changed',
      properties: { timeframe: newTimeframe }
    }));
  };

  // Handle manual refresh
  const handleRefresh = () => {
    dispatch(trackEvent({
      event: 'metrics_manual_refresh',
      properties: { timeframe }
    }));
    loadMetrics();
  };

  // Render mini sparkline
  const renderSparkline = (trend: number[], color: string) => {
    const max = Math.max(...trend);
    const min = Math.min(...trend);
    const range = max - min || 1;

    return (
      <svg className="w-16 h-8" viewBox="0 0 64 32">
        <polyline
          fill="none"
          stroke={`currentColor`}
          strokeWidth="2"
          points={trend
            .map((value, index) => {
              const x = (index * 64) / (trend.length - 1);
              const y = 32 - ((value - min) / range) * 32;
              return `${x},${y}`;
            })
            .join(' ')}
        />
      </svg>
    );
  };

  // Get color classes
  const getColorClasses = (color: string, type: 'bg' | 'text' | 'border') => {
    const colorMap: Record<string, Record<string, string>> = {
      green: {
        bg: 'bg-green-100 dark:bg-green-900',
        text: 'text-green-600 dark:text-green-400',
        border: 'border-green-200 dark:border-green-700',
      },
      blue: {
        bg: 'bg-blue-100 dark:bg-blue-900',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-700',
      },
      purple: {
        bg: 'bg-purple-100 dark:bg-purple-900',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-700',
      },
      yellow: {
        bg: 'bg-yellow-100 dark:bg-yellow-900',
        text: 'text-yellow-600 dark:text-yellow-400',
        border: 'border-yellow-200 dark:border-yellow-700',
      },
    };
    return colorMap[color]?.[type] || colorMap.blue[type];
  };

  if (loading && !metrics.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="flex justify-between items-center mb-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ChartBarIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Business Metrics
            </h2>
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Timeframe selector */}
            <select
              value={timeframe}
              onChange={(e) => handleTimeframeChange(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1d">24 Hours</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
              <option value="90d">90 Days</option>
            </select>
            
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                autoRefresh
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              Auto-refresh
            </button>
            
            {/* Manual refresh */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
              title="Refresh metrics"
            >
              <RefreshIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {lastUpdated && (
          <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <ClockIcon className="h-3 w-3 mr-1" />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${getColorClasses(metric.color, 'border')} ${getColorClasses(metric.color, 'bg')} bg-opacity-50 dark:bg-opacity-20`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${getColorClasses(metric.color, 'bg')}`}>
                  <metric.icon className={`h-5 w-5 ${getColorClasses(metric.color, 'text')}`} />
                </div>
                
                <div className={`${getColorClasses(metric.color, 'text')}`}>
                  {renderSparkline(metric.trend, metric.color)}
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {metric.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metric.value}
                </p>
                
                <div className="flex items-center space-x-1">
                  {metric.changeType === 'increase' ? (
                    <ArrowUpIcon className="h-3 w-3 text-green-500" />
                  ) : metric.changeType === 'decrease' ? (
                    <ArrowDownIcon className="h-3 w-3 text-red-500" />
                  ) : null}
                  
                  <span className={`text-xs font-medium ${
                    metric.changeType === 'increase' 
                      ? 'text-green-600 dark:text-green-400'
                      : metric.changeType === 'decrease'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                  </span>
                  
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    vs last period
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick insights */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <EyeIcon className="h-4 w-4" />
            <span>
              {metrics.filter(m => m.changeType === 'increase').length} metrics trending up, 
              {metrics.filter(m => m.changeType === 'decrease').length} down
            </span>
          </div>
          
          <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            View detailed analytics →
          </button>
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;
