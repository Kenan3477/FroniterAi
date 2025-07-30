'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ChartBarIcon,
  UserGroupIcon,
  CursorArrowRaysIcon,
  BanknotesIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

// Mock data - replace with real analytics data
const mockAnalyticsData = {
  pageViews: {
    current: 125420,
    previous: 98650,
    change: 27.1
  },
  uniqueVisitors: {
    current: 42180,
    previous: 35920,
    change: 17.4
  },
  conversions: {
    current: 1240,
    previous: 980,
    change: 26.5
  },
  revenue: {
    current: 124000,
    previous: 89000,
    change: 39.3
  }
}

const trafficSources = [
  { source: 'Organic Search', visitors: 18920, percentage: 44.8, change: 12.3 },
  { source: 'Direct', visitors: 12650, percentage: 30.0, change: -2.1 },
  { source: 'Social Media', visitors: 6340, percentage: 15.0, change: 45.2 },
  { source: 'Paid Ads', visitors: 2870, percentage: 6.8, change: 23.1 },
  { source: 'Referrals', visitors: 1400, percentage: 3.3, change: 8.7 }
]

const topPages = [
  { page: '/', views: 28420, conversions: 340, conversionRate: 1.2 },
  { page: '/comparison', views: 15680, conversions: 280, conversionRate: 1.8 },
  { page: '/case-studies', views: 12340, conversions: 190, conversionRate: 1.5 },
  { page: '/pricing', views: 9870, conversions: 150, conversionRate: 1.5 },
  { page: '/features', views: 8420, conversions: 85, conversionRate: 1.0 }
]

export function AnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-secondary-200 rounded"></div>
              <div className="w-12 h-4 bg-secondary-200 rounded"></div>
            </div>
            <div className="w-24 h-8 bg-secondary-200 rounded mb-2"></div>
            <div className="w-16 h-4 bg-secondary-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-secondary-900">
          Overview Dashboard
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.location.reload()}
            className="btn-ghost btn-sm flex items-center"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-secondary-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="12m">Last 12 months</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <ChartBarIcon className="w-8 h-8 text-blue-600" />
            <div className={`flex items-center text-sm ${
              mockAnalyticsData.pageViews.change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {mockAnalyticsData.pageViews.change > 0 ? (
                <TrendingUpIcon className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDownIcon className="w-4 h-4 mr-1" />
              )}
              {Math.abs(mockAnalyticsData.pageViews.change)}%
            </div>
          </div>
          <div className="text-3xl font-bold text-secondary-900 mb-2">
            {mockAnalyticsData.pageViews.current.toLocaleString()}
          </div>
          <div className="text-sm text-secondary-600">Page Views</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <UserGroupIcon className="w-8 h-8 text-green-600" />
            <div className={`flex items-center text-sm ${
              mockAnalyticsData.uniqueVisitors.change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {mockAnalyticsData.uniqueVisitors.change > 0 ? (
                <TrendingUpIcon className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDownIcon className="w-4 h-4 mr-1" />
              )}
              {Math.abs(mockAnalyticsData.uniqueVisitors.change)}%
            </div>
          </div>
          <div className="text-3xl font-bold text-secondary-900 mb-2">
            {mockAnalyticsData.uniqueVisitors.current.toLocaleString()}
          </div>
          <div className="text-sm text-secondary-600">Unique Visitors</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <CursorArrowRaysIcon className="w-8 h-8 text-purple-600" />
            <div className={`flex items-center text-sm ${
              mockAnalyticsData.conversions.change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {mockAnalyticsData.conversions.change > 0 ? (
                <TrendingUpIcon className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDownIcon className="w-4 h-4 mr-1" />
              )}
              {Math.abs(mockAnalyticsData.conversions.change)}%
            </div>
          </div>
          <div className="text-3xl font-bold text-secondary-900 mb-2">
            {mockAnalyticsData.conversions.current.toLocaleString()}
          </div>
          <div className="text-sm text-secondary-600">Conversions</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <BanknotesIcon className="w-8 h-8 text-orange-600" />
            <div className={`flex items-center text-sm ${
              mockAnalyticsData.revenue.change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {mockAnalyticsData.revenue.change > 0 ? (
                <TrendingUpIcon className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDownIcon className="w-4 h-4 mr-1" />
              )}
              {Math.abs(mockAnalyticsData.revenue.change)}%
            </div>
          </div>
          <div className="text-3xl font-bold text-secondary-900 mb-2">
            ${mockAnalyticsData.revenue.current.toLocaleString()}
          </div>
          <div className="text-sm text-secondary-600">Revenue</div>
        </motion.div>
      </div>

      {/* Traffic Sources and Top Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Traffic Sources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="card p-6"
        >
          <h3 className="text-xl font-bold text-secondary-900 mb-6">
            Traffic Sources
          </h3>
          <div className="space-y-4">
            {trafficSources.map((source, index) => (
              <div key={source.source} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-secondary-900">
                      {source.source}
                    </span>
                    <span className="text-sm text-secondary-600">
                      {source.visitors.toLocaleString()} ({source.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${source.percentage}%` }}
                    />
                  </div>
                </div>
                <div className={`ml-4 text-sm ${
                  source.change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {source.change > 0 ? '+' : ''}{source.change}%
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Pages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="card p-6"
        >
          <h3 className="text-xl font-bold text-secondary-900 mb-6">
            Top Performing Pages
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-secondary-600 border-b border-secondary-200">
                  <th className="pb-3">Page</th>
                  <th className="pb-3">Views</th>
                  <th className="pb-3">Conversions</th>
                  <th className="pb-3">Rate</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {topPages.map((page, index) => (
                  <tr key={page.page} className="border-b border-secondary-100">
                    <td className="py-3 font-medium text-secondary-900">
                      {page.page === '/' ? 'Home' : page.page.replace('/', '').replace('-', ' ')}
                    </td>
                    <td className="py-3 text-secondary-600">
                      {page.views.toLocaleString()}
                    </td>
                    <td className="py-3 text-secondary-600">
                      {page.conversions}
                    </td>
                    <td className="py-3">
                      <span className="text-primary-600 font-medium">
                        {page.conversionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
