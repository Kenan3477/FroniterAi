'use client'

import { motion } from 'framer-motion'
import { 
  FunnelIcon,
  UserIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  CheckCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

const funnelSteps = [
  {
    step: 'Awareness',
    icon: EyeIcon,
    visitors: 42180,
    conversionRate: 100,
    description: 'Website visitors',
    color: 'blue'
  },
  {
    step: 'Interest',
    icon: UserIcon,
    visitors: 18920,
    conversionRate: 44.8,
    description: 'Engaged visitors (>2 pages)',
    color: 'green'
  },
  {
    step: 'Consideration',
    icon: CursorArrowRaysIcon,
    visitors: 5680,
    conversionRate: 13.5,
    description: 'Feature/pricing page views',
    color: 'purple'
  },
  {
    step: 'Intent',
    icon: FunnelIcon,
    visitors: 2340,
    conversionRate: 5.5,
    description: 'Trial signup attempts',
    color: 'orange'
  },
  {
    step: 'Conversion',
    icon: CheckCircleIcon,
    visitors: 1240,
    conversionRate: 2.9,
    description: 'Completed trial signups',
    color: 'emerald'
  }
]

const funnelMetrics = [
  {
    metric: 'Overall Conversion Rate',
    value: '2.9%',
    change: '+0.3%',
    trend: 'up'
  },
  {
    metric: 'Average Time to Convert',
    value: '4.2 days',
    change: '-0.8 days',
    trend: 'up'
  },
  {
    metric: 'Cost per Conversion',
    value: '$87',
    change: '-$12',
    trend: 'up'
  },
  {
    metric: 'Lifetime Value',
    value: '$2,400',
    change: '+$240',
    trend: 'up'
  }
]

const channelPerformance = [
  {
    channel: 'Organic Search',
    awareness: 18920,
    interest: 9460,
    consideration: 3784,
    intent: 1324,
    conversion: 756,
    conversionRate: 4.0
  },
  {
    channel: 'Direct',
    awareness: 12650,
    interest: 5060,
    consideration: 1012,
    intent: 506,
    conversion: 304,
    conversionRate: 2.4
  },
  {
    channel: 'Social Media',
    awareness: 6340,
    interest: 2536,
    consideration: 507,
    intent: 190,
    conversion: 114,
    conversionRate: 1.8
  },
  {
    channel: 'Paid Ads',
    awareness: 2870,
    interest: 1148,
    consideration: 287,
    intent: 172,
    conversion: 103,
    conversionRate: 3.6
  }
]

export function FunnelAnalysis() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-secondary-900">
          Marketing Funnel Analysis
        </h2>
        <div className="text-sm text-secondary-600">
          Last 30 days
        </div>
      </div>

      {/* Funnel Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="card p-8"
      >
        <h3 className="text-xl font-bold text-secondary-900 mb-8 text-center">
          Conversion Funnel
        </h3>
        
        <div className="space-y-6">
          {funnelSteps.map((step, index) => (
            <div key={step.step}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 bg-${step.color}-100 rounded-xl flex items-center justify-center`}>
                    <step.icon className={`w-5 h-5 text-${step.color}-600`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-secondary-900">{step.step}</h4>
                    <p className="text-sm text-secondary-600">{step.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-secondary-900">
                    {step.visitors.toLocaleString()}
                  </div>
                  <div className="text-sm text-secondary-600">
                    {step.conversionRate.toFixed(1)}% of total
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="relative mb-4">
                <div className="w-full bg-secondary-200 rounded-full h-8 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${step.conversionRate}%` }}
                    transition={{ duration: 1, delay: index * 0.2 }}
                    className={`h-full bg-gradient-to-r from-${step.color}-500 to-${step.color}-600`}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-white font-medium text-sm">
                  {step.visitors.toLocaleString()} visitors
                </div>
              </div>
              
              {/* Drop-off Rate */}
              {index < funnelSteps.length - 1 && (
                <div className="flex items-center justify-center py-2">
                  <div className="flex items-center space-x-2 text-sm text-red-600">
                    <ArrowRightIcon className="w-4 h-4" />
                    <span>
                      {((funnelSteps[index].visitors - funnelSteps[index + 1].visitors) / funnelSteps[index].visitors * 100).toFixed(1)}% drop-off
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Funnel Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {funnelMetrics.map((metric, index) => (
          <div key={metric.metric} className="card p-6">
            <div className="text-2xl font-bold text-secondary-900 mb-2">
              {metric.value}
            </div>
            <div className="text-sm text-secondary-600 mb-2">
              {metric.metric}
            </div>
            <div className={`text-xs flex items-center ${
              metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              <span>{metric.change} from last period</span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Channel Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="card p-6"
      >
        <h3 className="text-xl font-bold text-secondary-900 mb-6">
          Channel Performance Through Funnel
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-secondary-600 border-b border-secondary-200">
                <th className="pb-3">Channel</th>
                <th className="pb-3">Awareness</th>
                <th className="pb-3">Interest</th>
                <th className="pb-3">Consideration</th>
                <th className="pb-3">Intent</th>
                <th className="pb-3">Conversion</th>
                <th className="pb-3">Conv. Rate</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {channelPerformance.map((channel) => (
                <tr key={channel.channel} className="border-b border-secondary-100">
                  <td className="py-3 font-medium text-secondary-900">
                    {channel.channel}
                  </td>
                  <td className="py-3 text-secondary-600">
                    {channel.awareness.toLocaleString()}
                  </td>
                  <td className="py-3 text-secondary-600">
                    {channel.interest.toLocaleString()}
                  </td>
                  <td className="py-3 text-secondary-600">
                    {channel.consideration.toLocaleString()}
                  </td>
                  <td className="py-3 text-secondary-600">
                    {channel.intent.toLocaleString()}
                  </td>
                  <td className="py-3 text-secondary-600">
                    {channel.conversion.toLocaleString()}
                  </td>
                  <td className="py-3">
                    <span className={`font-medium ${
                      channel.conversionRate >= 3.0 ? 'text-green-600' : 
                      channel.conversionRate >= 2.0 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {channel.conversionRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Optimization Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="card p-6 bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200"
      >
        <h3 className="text-xl font-bold text-secondary-900 mb-4">
          Optimization Opportunities
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-secondary-900 mb-2">
              🎯 Highest Impact
            </h4>
            <ul className="space-y-2 text-sm text-secondary-700">
              <li>• Improve Interest → Consideration rate (44.8% → 30%+)</li>
              <li>• Optimize trial signup flow (Intent → Conversion)</li>
              <li>• A/B test pricing page design</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-secondary-900 mb-2">
              📈 Channel Focus
            </h4>
            <ul className="space-y-2 text-sm text-secondary-700">
              <li>• Scale organic search (highest conversion rate)</li>
              <li>• Improve social media targeting</li>
              <li>• Optimize paid ads for quality over volume</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
