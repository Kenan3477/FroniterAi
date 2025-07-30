'use client'

import { motion } from 'framer-motion'
import { ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline'

const ctaFeatures = [
  'Start with a 14-day free trial',
  'No setup fees or hidden costs',
  'Full access to all features',
  '24/7 implementation support',
  'Cancel anytime, no questions asked'
]

const urgencyIndicators = [
  { label: 'Companies signed up today', value: '23' },
  { label: 'Average time saved per week', value: '25 hours' },
  { label: 'Implementation slots left this month', value: '7' }
]

export function CTASection() {
  return (
    <section className="section-padding bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-white/5 bg-dot-pattern" />
      <div className="absolute top-20 left-10 w-96 h-96 bg-white/10 rounded-full mix-blend-overlay filter blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full mix-blend-overlay filter blur-3xl" />

      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main CTA Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-balance">
              Ready to Transform Your
              <span className="block text-primary-200">Operations?</span>
            </h2>
            <p className="text-xl sm:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto text-balance">
              Join 500+ companies already saving millions in operational costs. 
              Start your transformation today with zero risk.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <button className="btn bg-white text-primary-600 hover:bg-primary-50 btn-xl group text-lg font-semibold">
              Start Free Trial
              <ArrowRightIcon className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button className="btn border-white/30 text-white hover:bg-white/10 btn-xl text-lg font-semibold">
              Schedule Demo
            </button>
          </motion.div>

          {/* Features List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
              {ctaFeatures.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 + (index * 0.1) }}
                  viewport={{ once: true }}
                  className="flex items-center justify-center sm:justify-start text-primary-100"
                >
                  <CheckIcon className="w-5 h-5 mr-2 text-primary-200 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Social Proof Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12"
          >
            {urgencyIndicators.map((indicator, index) => (
              <div key={indicator.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-primary-200 mb-2">
                  {indicator.value}
                </div>
                <div className="text-sm text-primary-100">
                  {indicator.label}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Guarantee */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            viewport={{ once: true }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-white/20 max-w-2xl mx-auto"
          >
            <h3 className="text-2xl font-bold text-white mb-4">
              30-Day Money-Back Guarantee
            </h3>
            <p className="text-primary-100 leading-relaxed">
              If you don't see measurable improvements in your operations within 30 days, 
              we'll refund every penny. No questions asked, no fine print.
            </p>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <p className="text-primary-200 text-sm mb-6">
              Trusted by Fortune 500 companies worldwide
            </p>
            
            <div className="flex justify-center items-center space-x-8 opacity-60">
              {[
                'SOC 2 Certified',
                'GDPR Compliant',
                'ISO 27001',
                '99.9% Uptime SLA'
              ].map((badge) => (
                <div key={badge} className="text-xs text-primary-100 font-medium">
                  {badge}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        viewport={{ once: true }}
        className="fixed bottom-6 right-6 z-50 sm:hidden"
      >
        <button className="btn bg-white text-primary-600 hover:bg-primary-50 shadow-2xl rounded-full w-14 h-14 flex items-center justify-center">
          <ArrowRightIcon className="w-6 h-6" />
        </button>
      </motion.div>
    </section>
  )
}
