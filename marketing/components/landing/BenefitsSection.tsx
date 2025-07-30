'use client'

import { motion } from 'framer-motion'
import { 
  CurrencyDollarIcon,
  ClockIcon,
  ChartBarSquareIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline'

const benefits = [
  {
    icon: CurrencyDollarIcon,
    title: 'Reduce Operational Costs',
    description: 'Cut operational expenses by 30% through intelligent automation and resource optimization.',
    metrics: [
      { label: 'Average Cost Reduction', value: '30%' },
      { label: 'ROI Timeline', value: '3 months' },
      { label: 'Annual Savings', value: '$2.5M' }
    ],
    color: 'from-green-500 to-emerald-600'
  },
  {
    icon: ClockIcon,
    title: 'Accelerate Time-to-Market',
    description: 'Launch products and services 40% faster with streamlined processes and automated workflows.',
    metrics: [
      { label: 'Time Reduction', value: '40%' },
      { label: 'Process Efficiency', value: '65%' },
      { label: 'Faster Deployment', value: '24h' }
    ],
    color: 'from-blue-500 to-cyan-600'
  },
  {
    icon: ChartBarSquareIcon,
    title: 'Improve Decision Making',
    description: 'Make better decisions with real-time data insights and predictive analytics capabilities.',
    metrics: [
      { label: 'Data Accuracy', value: '99%' },
      { label: 'Decision Speed', value: '10x' },
      { label: 'Forecast Accuracy', value: '85%' }
    ],
    color: 'from-purple-500 to-pink-600'
  },
  {
    icon: UserGroupIcon,
    title: 'Enhance Team Productivity',
    description: 'Boost team efficiency by 50% through better collaboration tools and automated task management.',
    metrics: [
      { label: 'Productivity Gain', value: '50%' },
      { label: 'Manual Work Reduction', value: '80%' },
      { label: 'Error Reduction', value: '95%' }
    ],
    color: 'from-orange-500 to-red-600'
  },
  {
    icon: ShieldCheckIcon,
    title: 'Ensure Compliance',
    description: 'Maintain 100% compliance with automated monitoring and built-in regulatory frameworks.',
    metrics: [
      { label: 'Compliance Rate', value: '100%' },
      { label: 'Audit Time Reduction', value: '70%' },
      { label: 'Risk Mitigation', value: '90%' }
    ],
    color: 'from-indigo-500 to-blue-600'
  },
  {
    icon: RocketLaunchIcon,
    title: 'Scale with Confidence',
    description: 'Scale operations seamlessly without proportional increases in complexity or resources.',
    metrics: [
      { label: 'Scalability Factor', value: '10x' },
      { label: 'Uptime Guarantee', value: '99.9%' },
      { label: 'Performance Impact', value: 'Zero' }
    ],
    color: 'from-teal-500 to-green-600'
  }
]

export function BenefitsSection() {
  return (
    <section className="section-padding bg-secondary-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="absolute top-20 right-10 w-96 h-96 bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70" />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="section-title mb-6">
            Measurable Business
            <span className="gradient-text"> Impact</span>
          </h2>
          <p className="section-subtitle">
            Don't just transform your operations—transform your bottom line. 
            See the concrete benefits that matter most to your business.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-secondary-200 hover:shadow-2xl hover:border-primary-200 transition-all duration-300 h-full relative overflow-hidden">
                {/* Icon with Gradient */}
                <div className="relative mb-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${benefit.color} p-0.5`}>
                    <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
                      <benefit.icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className={`absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${benefit.color} opacity-20 blur-xl group-hover:opacity-30 transition-opacity`} />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-secondary-900 mb-4 group-hover:text-primary-600 transition-colors">
                  {benefit.title}
                </h3>
                <p className="text-secondary-600 mb-6 leading-relaxed">
                  {benefit.description}
                </p>

                {/* Metrics */}
                <div className="space-y-4">
                  {benefit.metrics.map((metric, metricIndex) => (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: (index * 0.1) + (metricIndex * 0.05) }}
                      viewport={{ once: true }}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm text-secondary-700">{metric.label}</span>
                      <span className={`text-lg font-bold bg-gradient-to-r ${benefit.color} bg-clip-text text-transparent`}>
                        {metric.value}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Hover Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none`} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* ROI Calculator CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="bg-white rounded-2xl p-8 lg:p-12 shadow-xl border border-secondary-200 max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-secondary-900 mb-4">
              Calculate Your ROI
            </h3>
            <p className="text-lg text-secondary-600 mb-8 max-w-2xl mx-auto">
              See exactly how much Frontier could save your business. Our ROI calculator 
              provides personalized estimates based on your industry and company size.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Average ROI', value: '340%' },
                { label: 'Payback Period', value: '3 months' },
                { label: 'Annual Savings', value: '$2.5M' },
                { label: 'Efficiency Gain', value: '40%' }
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold text-primary-600 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-secondary-600">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary btn-lg">
                Calculate My ROI
              </button>
              <button className="btn-outline btn-lg">
                View Case Studies
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
