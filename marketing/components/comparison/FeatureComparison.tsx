'use client'

import { motion } from 'framer-motion'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  MinusCircleIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

const competitors = [
  {
    name: 'Frontier',
    logo: '/logos/frontier.svg',
    pricing: '$99/user/month',
    highlight: true,
    color: 'primary'
  },
  {
    name: 'ServiceNow',
    logo: '/logos/servicenow.svg',
    pricing: '$300+/user/month',
    highlight: false,
    color: 'gray'
  },
  {
    name: 'Salesforce',
    logo: '/logos/salesforce.svg',
    pricing: '$250+/user/month',
    highlight: false,
    color: 'gray'
  },
  {
    name: 'Microsoft Dynamics',
    logo: '/logos/dynamics.svg',
    pricing: '$200+/user/month',
    highlight: false,
    color: 'gray'
  },
  {
    name: 'Oracle',
    logo: '/logos/oracle.svg',
    pricing: '$350+/user/month',
    highlight: false,
    color: 'gray'
  }
]

const features = [
  {
    category: 'Core Platform',
    items: [
      {
        name: 'AI-Powered Automation',
        frontier: 'full',
        servicenow: 'partial',
        salesforce: 'partial',
        dynamics: 'limited',
        oracle: 'limited'
      },
      {
        name: 'Real-Time Analytics',
        frontier: 'full',
        servicenow: 'full',
        salesforce: 'partial',
        dynamics: 'partial',
        oracle: 'full'
      },
      {
        name: 'No-Code Workflows',
        frontier: 'full',
        servicenow: 'partial',
        salesforce: 'partial',
        dynamics: 'limited',
        oracle: 'none'
      },
      {
        name: 'Mobile-First Design',
        frontier: 'full',
        servicenow: 'partial',
        salesforce: 'partial',
        dynamics: 'partial',
        oracle: 'limited'
      }
    ]
  },
  {
    category: 'Implementation',
    items: [
      {
        name: 'Setup Time',
        frontier: '< 24 hours',
        servicenow: '3-6 months',
        salesforce: '2-4 months',
        dynamics: '4-8 months',
        oracle: '6-12 months'
      },
      {
        name: 'Implementation Cost',
        frontier: 'Included',
        servicenow: '$50K+',
        salesforce: '$30K+',
        dynamics: '$40K+',
        oracle: '$100K+'
      },
      {
        name: 'Training Required',
        frontier: '2 hours',
        servicenow: '2-4 weeks',
        salesforce: '1-2 weeks',
        dynamics: '2-3 weeks',
        oracle: '4-6 weeks'
      },
      {
        name: 'Custom Development',
        frontier: 'Not needed',
        servicenow: 'Often required',
        salesforce: 'Usually required',
        dynamics: 'Usually required',
        oracle: 'Always required'
      }
    ]
  },
  {
    category: 'Integration & APIs',
    items: [
      {
        name: 'Pre-built Integrations',
        frontier: '150+',
        servicenow: '100+',
        salesforce: '120+',
        dynamics: '80+',
        oracle: '60+'
      },
      {
        name: 'API Quality',
        frontier: 'full',
        servicenow: 'partial',
        salesforce: 'partial',
        dynamics: 'partial',
        oracle: 'limited'
      },
      {
        name: 'Webhook Support',
        frontier: 'full',
        servicenow: 'partial',
        salesforce: 'partial',
        dynamics: 'limited',
        oracle: 'limited'
      },
      {
        name: 'Real-time Sync',
        frontier: 'full',
        servicenow: 'partial',
        salesforce: 'limited',
        dynamics: 'limited',
        oracle: 'none'
      }
    ]
  },
  {
    category: 'Support & Compliance',
    items: [
      {
        name: 'Support Response',
        frontier: '< 1 hour',
        servicenow: '4-24 hours',
        salesforce: '2-12 hours',
        dynamics: '4-24 hours',
        oracle: '24-48 hours'
      },
      {
        name: 'Security Certifications',
        frontier: 'full',
        servicenow: 'full',
        salesforce: 'full',
        dynamics: 'partial',
        oracle: 'full'
      },
      {
        name: 'GDPR Compliance',
        frontier: 'full',
        servicenow: 'full',
        salesforce: 'full',
        dynamics: 'partial',
        oracle: 'partial'
      },
      {
        name: 'Uptime SLA',
        frontier: '99.9%',
        servicenow: '99.5%',
        salesforce: '99.9%',
        dynamics: '99.5%',
        oracle: '99.0%'
      }
    ]
  }
]

const getStatusIcon = (status: string) => {
  if (status === 'full' || status.includes('✓') || status === '99.9%' || status === '< 1 hour' || status === '< 24 hours' || status === '2 hours' || status === 'Included' || status === 'Not needed' || status === '150+') {
    return <CheckCircleIcon className="w-5 h-5 text-green-500" />
  }
  if (status === 'partial' || status === 'limited' || status.includes('weeks') || status.includes('months') || status.includes('$')) {
    return <MinusCircleIcon className="w-5 h-5 text-yellow-500" />
  }
  if (status === 'none') {
    return <XCircleIcon className="w-5 h-5 text-red-500" />
  }
  return null
}

export function FeatureComparison() {
  return (
    <section className="section-padding bg-white relative overflow-hidden">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="section-title mb-6">
            Feature-by-Feature
            <span className="gradient-text"> Comparison</span>
          </h2>
          <p className="section-subtitle">
            See how Frontier stacks up against the competition across all key features and capabilities.
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="overflow-x-auto"
        >
          <div className="min-w-[800px]">
            {/* Header */}
            <div className="grid grid-cols-6 gap-4 mb-8">
              <div className="font-semibold text-secondary-900">Features</div>
              {competitors.map((competitor) => (
                <div key={competitor.name} className="text-center">
                  <div className={`p-4 rounded-xl border-2 ${
                    competitor.highlight 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-secondary-200 bg-secondary-50'
                  }`}>
                    <div className="w-8 h-8 bg-secondary-300 rounded mx-auto mb-2 flex items-center justify-center">
                      <span className="text-xs font-medium text-secondary-600">
                        {competitor.name.charAt(0)}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-secondary-900 mb-1">
                      {competitor.name}
                    </div>
                    <div className={`text-xs ${
                      competitor.highlight ? 'text-primary-600' : 'text-secondary-600'
                    }`}>
                      {competitor.pricing}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature Categories */}
            {features.map((category, categoryIndex) => (
              <motion.div
                key={category.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + (categoryIndex * 0.1) }}
                viewport={{ once: true }}
                className="mb-8"
              >
                <h3 className="text-lg font-bold text-secondary-900 mb-4 pb-2 border-b border-secondary-200">
                  {category.category}
                </h3>
                
                {category.items.map((item, itemIndex) => (
                  <div
                    key={item.name}
                    className={`grid grid-cols-6 gap-4 py-3 px-2 rounded-lg ${
                      itemIndex % 2 === 0 ? 'bg-secondary-25' : 'bg-white'
                    }`}
                  >
                    <div className="font-medium text-secondary-800 flex items-center">
                      {item.name}
                    </div>
                    
                    {/* Frontier */}
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {getStatusIcon(item.frontier)}
                        <span className="text-sm font-medium text-secondary-700">
                          {item.frontier}
                        </span>
                      </div>
                    </div>
                    
                    {/* ServiceNow */}
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {getStatusIcon(item.servicenow)}
                        <span className="text-sm text-secondary-600">
                          {item.servicenow}
                        </span>
                      </div>
                    </div>
                    
                    {/* Salesforce */}
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {getStatusIcon(item.salesforce)}
                        <span className="text-sm text-secondary-600">
                          {item.salesforce}
                        </span>
                      </div>
                    </div>
                    
                    {/* Dynamics */}
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {getStatusIcon(item.dynamics)}
                        <span className="text-sm text-secondary-600">
                          {item.dynamics}
                        </span>
                      </div>
                    </div>
                    
                    {/* Oracle */}
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {getStatusIcon(item.oracle)}
                        <span className="text-sm text-secondary-600">
                          {item.oracle}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16"
        >
          <div className="card p-6 text-center">
            <ChartBarIcon className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-secondary-900 mb-2">
              Superior Features
            </h3>
            <p className="text-secondary-600">
              More advanced capabilities with simpler implementation than any competitor.
            </p>
          </div>
          
          <div className="card p-6 text-center">
            <CurrencyDollarIcon className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-secondary-900 mb-2">
              Better Value
            </h3>
            <p className="text-secondary-600">
              60% lower total cost of ownership compared to enterprise alternatives.
            </p>
          </div>
          
          <div className="card p-6 text-center">
            <ClockIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-secondary-900 mb-2">
              Faster Implementation
            </h3>
            <p className="text-secondary-600">
              Deploy in hours, not months. Start seeing results from day one.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
