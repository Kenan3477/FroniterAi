'use client'

import { motion } from 'framer-motion'
import { 
  CpuChipIcon, 
  ChartBarSquareIcon, 
  BoltIcon, 
  ShieldCheckIcon,
  CloudIcon,
  CogIcon
} from '@heroicons/react/24/outline'

const differentiators = [
  {
    icon: CpuChipIcon,
    title: 'AI-Native Architecture',
    description: 'Built from the ground up with artificial intelligence at its core, not as an afterthought.',
    benefits: [
      'Predictive process optimization',
      'Intelligent resource allocation',
      'Automated decision making',
      'Continuous learning algorithms'
    ],
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: ChartBarSquareIcon,
    title: 'Real-Time Intelligence',
    description: 'Instant visibility into every aspect of your operations with live data streams and analytics.',
    benefits: [
      'Live performance dashboards',
      'Real-time anomaly detection',
      'Instant alert systems',
      'Dynamic reporting'
    ],
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: BoltIcon,
    title: 'Lightning-Fast Deployment',
    description: 'Get up and running in hours, not months, with our rapid deployment methodology.',
    benefits: [
      'Pre-built industry templates',
      'Automated configuration',
      'Zero-downtime migration',
      '24-hour implementation'
    ],
    color: 'from-yellow-500 to-orange-500'
  },
  {
    icon: ShieldCheckIcon,
    title: 'Enterprise-Grade Security',
    description: 'Bank-level security with end-to-end encryption and compliance certifications.',
    benefits: [
      'SOC 2 Type II certified',
      'GDPR & HIPAA compliant',
      'Zero-trust architecture',
      'Multi-factor authentication'
    ],
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: CloudIcon,
    title: 'Hybrid Cloud Flexibility',
    description: 'Deploy anywhere - cloud, on-premise, or hybrid - with seamless scalability.',
    benefits: [
      'Multi-cloud deployment',
      'Auto-scaling infrastructure',
      'Edge computing support',
      '99.9% uptime SLA'
    ],
    color: 'from-indigo-500 to-blue-500'
  },
  {
    icon: CogIcon,
    title: 'No-Code Customization',
    description: 'Adapt and extend functionality without writing a single line of code.',
    benefits: [
      'Visual workflow builder',
      'Drag-and-drop interface',
      'Custom field creation',
      'API integrations'
    ],
    color: 'from-red-500 to-pink-500'
  }
]

export function DifferentiatorsSection() {
  return (
    <section className="section-padding bg-white relative overflow-hidden">
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
            What Makes Frontier
            <span className="gradient-text"> Truly Different</span>
          </h2>
          <p className="section-subtitle">
            We didn't just build another operations platform. We reimagined what 
            business operations could be in the age of AI and automation.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {differentiators.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="card-hover p-8 h-full">
                {/* Icon with Gradient Background */}
                <div className="relative mb-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} p-0.5`}>
                    <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
                      <item.icon className={`w-8 h-8 bg-gradient-to-br ${item.color} text-transparent bg-clip-text`} />
                    </div>
                  </div>
                  <div className={`absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} opacity-20 blur-xl group-hover:opacity-30 transition-opacity`} />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-secondary-900 mb-4 group-hover:text-primary-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-secondary-600 mb-6 leading-relaxed">
                  {item.description}
                </p>

                {/* Benefits List */}
                <ul className="space-y-3">
                  {item.benefits.map((benefit, benefitIndex) => (
                    <motion.li
                      key={benefit}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: (index * 0.1) + (benefitIndex * 0.05) }}
                      viewport={{ once: true }}
                      className="flex items-center text-sm text-secondary-700"
                    >
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${item.color} mr-3 flex-shrink-0`} />
                      {benefit}
                    </motion.li>
                  ))}
                </ul>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="inline-flex items-center bg-primary-50 border border-primary-200 rounded-full px-6 py-3 text-primary-700">
            <BoltIcon className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">
              Experience the difference - Book a personalized demo
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
