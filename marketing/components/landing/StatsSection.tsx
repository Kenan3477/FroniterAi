'use client'

import { motion } from 'framer-motion'

const stats = [
  {
    value: '500+',
    label: 'Enterprise Clients',
    description: 'Fortune 500 companies trust us',
    color: 'text-blue-600'
  },
  {
    value: '40%',
    label: 'Efficiency Increase',
    description: 'Average improvement in operations',
    color: 'text-green-600'
  },
  {
    value: '99.9%',
    label: 'Uptime SLA',
    description: 'Guaranteed service availability',
    color: 'text-purple-600'
  },
  {
    value: '$2.5M',
    label: 'Average Savings',
    description: 'Cost reduction per client annually',
    color: 'text-orange-600'
  },
  {
    value: '24h',
    label: 'Deployment Time',
    description: 'From contract to go-live',
    color: 'text-pink-600'
  },
  {
    value: '150+',
    label: 'Integrations',
    description: 'Pre-built connectors available',
    color: 'text-indigo-600'
  }
]

export function StatsSection() {
  return (
    <section className="py-16 bg-gradient-to-br from-secondary-50 to-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70" />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-secondary-900 mb-4">
            Trusted by Industry Leaders
          </h2>
          <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
            Join hundreds of companies already transforming their operations with measurable results
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
              className="text-center group cursor-pointer"
            >
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-secondary-100 group-hover:shadow-2xl group-hover:border-primary-200 transition-all duration-300">
                <div className={`text-3xl sm:text-4xl font-bold mb-2 ${stat.color} group-hover:scale-110 transition-transform`}>
                  {stat.value}
                </div>
                <div className="text-sm font-semibold text-secondary-900 mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-secondary-500 leading-relaxed">
                  {stat.description}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Context */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <div className="inline-flex items-center bg-white border border-secondary-200 rounded-full px-6 py-3 shadow-sm">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse" />
            <span className="text-sm font-medium text-secondary-700">
              All metrics verified by third-party audits
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
