'use client'

import { motion } from 'framer-motion'
import { 
  RocketLaunchIcon,
  ChartBarIcon,
  CogIcon,
  ShieldCheckIcon,
  CloudIcon,
  UsersIcon,
  BoltIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'

const features = [
  {
    icon: RocketLaunchIcon,
    title: 'AI-Powered Automation',
    description: 'Intelligent workflows that learn and optimize themselves, reducing manual work by up to 80%.',
    benefits: ['Smart process automation', 'Predictive maintenance', 'Auto-scaling resources'],
    category: 'Automation'
  },
  {
    icon: ChartBarIcon,
    title: 'Real-Time Analytics',
    description: 'Live dashboards with actionable insights that help you make data-driven decisions instantly.',
    benefits: ['Live performance monitoring', 'Predictive analytics', 'Custom KPI tracking'],
    category: 'Analytics'
  },
  {
    icon: CogIcon,
    title: 'Workflow Orchestration',
    description: 'Design, deploy, and manage complex business processes with our visual workflow builder.',
    benefits: ['Drag-and-drop designer', 'Multi-step approvals', 'Conditional logic'],
    category: 'Workflows'
  },
  {
    icon: ShieldCheckIcon,
    title: 'Advanced Security',
    description: 'Enterprise-grade security with zero-trust architecture and compliance certifications.',
    benefits: ['End-to-end encryption', 'Role-based access', 'Audit trails'],
    category: 'Security'
  },
  {
    icon: CloudIcon,
    title: 'Cloud-Native Platform',
    description: 'Built for the cloud with auto-scaling, high availability, and global deployment options.',
    benefits: ['99.9% uptime SLA', 'Global edge network', 'Auto-scaling'],
    category: 'Infrastructure'
  },
  {
    icon: UsersIcon,
    title: 'Team Collaboration',
    description: 'Built-in collaboration tools that keep your team aligned and productive across all operations.',
    benefits: ['Real-time collaboration', 'Comment threads', 'Task assignments'],
    category: 'Collaboration'
  },
  {
    icon: BoltIcon,
    title: 'API-First Architecture',
    description: 'Comprehensive REST and GraphQL APIs that integrate with any system in your tech stack.',
    benefits: ['RESTful APIs', 'GraphQL support', 'Webhook integrations'],
    category: 'Integration'
  },
  {
    icon: GlobeAltIcon,
    title: 'Global Operations',
    description: 'Multi-region deployment with localization support for businesses operating worldwide.',
    benefits: ['Multi-language support', 'Regional compliance', 'Local data centers'],
    category: 'Global'
  }
]

const categories = ['All', 'Automation', 'Analytics', 'Workflows', 'Security', 'Infrastructure', 'Collaboration', 'Integration', 'Global']

export function FeaturesSection() {
  return (
    <section className="section-padding bg-gradient-to-br from-white via-primary-50/30 to-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-dot-pattern opacity-20" />
      
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="section-title mb-6">
            Everything You Need to
            <span className="gradient-text"> Scale Operations</span>
          </h2>
          <p className="section-subtitle">
            A comprehensive platform with all the tools and features your business needs 
            to optimize operations, reduce costs, and accelerate growth.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group h-full"
            >
              <div className="card-hover p-6 h-full relative overflow-hidden">
                {/* Category Badge */}
                <div className="absolute top-4 right-4">
                  <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                    {feature.category}
                  </span>
                </div>

                {/* Icon */}
                <div className="mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary-600" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-secondary-900 mb-3 group-hover:text-primary-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-secondary-600 text-sm mb-4 leading-relaxed">
                  {feature.description}
                </p>

                {/* Benefits */}
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li key={benefit} className="flex items-center text-xs text-secondary-700">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-2 flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>

                {/* Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Feature Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <div className="card p-8 lg:p-12 bg-gradient-to-br from-primary-600 to-primary-800 text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-white/5 bg-dot-pattern" />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
              <div>
                <h3 className="text-3xl font-bold mb-4">
                  Ready to See It in Action?
                </h3>
                <p className="text-primary-100 text-lg mb-6">
                  Get a personalized demo tailored to your industry and see how Frontier 
                  can transform your specific operations challenges.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="btn bg-white text-primary-600 hover:bg-primary-50 btn-lg">
                    Schedule Demo
                  </button>
                  <button className="btn border-white/30 text-white hover:bg-white/10 btn-lg">
                    Start Free Trial
                  </button>
                </div>
              </div>
              
              <div className="relative">
                <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Setup Time', value: '< 24 hours' },
                      { label: 'ROI Timeline', value: '< 3 months' },
                      { label: 'Support', value: '24/7/365' },
                      { label: 'Training', value: 'Included' }
                    ].map((item) => (
                      <div key={item.label} className="text-center">
                        <div className="text-xl font-bold text-white mb-1">{item.value}</div>
                        <div className="text-xs text-primary-100">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
