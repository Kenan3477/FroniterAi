'use client'

import { motion } from 'framer-motion'
import { StarIcon } from '@heroicons/react/24/solid'

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'VP of Operations',
    company: 'TechCorp Industries',
    industry: 'Manufacturing',
    image: '/avatars/sarah-johnson.jpg',
    rating: 5,
    quote: "Frontier transformed our manufacturing operations completely. We reduced production costs by 35% and improved efficiency by 40% within just 3 months.",
    metrics: {
      costReduction: '35%',
      efficiencyGain: '40%',
      implementation: '3 months'
    }
  },
  {
    name: 'Michael Chen',
    role: 'Chief Technology Officer',
    company: 'Digital Solutions Inc',
    industry: 'Technology',
    image: '/avatars/michael-chen.jpg',
    rating: 5,
    quote: "The AI-powered automation capabilities are game-changing. Our team can now focus on strategic initiatives instead of manual processes.",
    metrics: {
      timesSaved: '25 hours/week',
      automationRate: '80%',
      teamSatisfaction: '95%'
    }
  },
  {
    name: 'Emily Rodriguez',
    role: 'Head of Operations',
    company: 'HealthCare Plus',
    industry: 'Healthcare',
    image: '/avatars/emily-rodriguez.jpg',
    rating: 5,
    quote: "Compliance management became effortless with Frontier. We maintain 100% compliance while reducing audit preparation time by 70%.",
    metrics: {
      complianceRate: '100%',
      auditTimeReduction: '70%',
      riskMitigation: '90%'
    }
  },
  {
    name: 'David Kim',
    role: 'Operations Director',
    company: 'Global Logistics Co',
    industry: 'Logistics',
    image: '/avatars/david-kim.jpg',
    rating: 5,
    quote: "Real-time visibility across our entire supply chain has been a game-changer. We can now predict and prevent issues before they impact our customers.",
    metrics: {
      visibilityImprovement: '100%',
      issuePreventionRate: '85%',
      customerSatisfaction: '98%'
    }
  },
  {
    name: 'Lisa Thompson',
    role: 'Finance Director',
    company: 'RetailMax',
    industry: 'Retail',
    image: '/avatars/lisa-thompson.jpg',
    rating: 5,
    quote: "The ROI was immediate. Within 6 months, we saved $1.2M in operational costs and improved our cash flow by 25%.",
    metrics: {
      costSavings: '$1.2M',
      cashFlowImprovement: '25%',
      roiTimeline: '6 months'
    }
  },
  {
    name: 'Robert Wilson',
    role: 'VP of Engineering',
    company: 'BuildTech Systems',
    industry: 'Construction',
    image: '/avatars/robert-wilson.jpg',
    rating: 5,
    quote: "Project delivery times improved by 30% and resource utilization by 45%. Frontier helped us scale operations without scaling complexity.",
    metrics: {
      deliveryImprovement: '30%',
      resourceUtilization: '45%',
      projectSuccess: '95%'
    }
  }
]

export function TestimonialsSection() {
  return (
    <section className="section-padding bg-gradient-to-br from-secondary-50 to-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70" />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="section-title mb-6">
            Trusted by
            <span className="gradient-text"> Industry Leaders</span>
          </h2>
          <p className="section-subtitle">
            See what our clients have to say about their transformation journey with Frontier. 
            Real results from real businesses across different industries.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="testimonial-card group-hover:shadow-2xl group-hover:scale-105 transition-all duration-300">
                {/* Header */}
                <div className="flex items-center mb-6">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                    {testimonial.name.charAt(0)}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-bold text-secondary-900 mb-1">
                      {testimonial.name}
                    </h4>
                    <p className="text-sm text-secondary-600 mb-1">
                      {testimonial.role}
                    </p>
                    <p className="text-xs text-secondary-500">
                      {testimonial.company} • {testimonial.industry}
                    </p>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="w-5 h-5 text-yellow-500" />
                  ))}
                  <span className="ml-2 text-sm text-secondary-600">
                    {testimonial.rating}.0
                  </span>
                </div>

                {/* Quote */}
                <blockquote className="text-secondary-700 leading-relaxed mb-6 relative z-10">
                  {testimonial.quote}
                </blockquote>

                {/* Metrics */}
                <div className="grid grid-cols-1 gap-3 pt-4 border-t border-secondary-100">
                  {Object.entries(testimonial.metrics).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-xs text-secondary-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                      <span className="text-sm font-bold text-primary-600">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Overall Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl p-8 lg:p-12 shadow-xl border border-secondary-200"
        >
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-secondary-900 mb-4">
              Proven Results Across Industries
            </h3>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              Our clients consistently achieve remarkable results. Here's what you can expect 
              when you choose Frontier for your operations transformation.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '4.9/5', label: 'Average Rating', description: 'Client satisfaction score' },
              { value: '340%', label: 'Average ROI', description: 'Return on investment' },
              { value: '3 months', label: 'Payback Period', description: 'Time to see results' },
              { value: '95%', label: 'Renewal Rate', description: 'Client retention' }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.8 + (index * 0.1) }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-3xl lg:text-4xl font-bold text-primary-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm font-semibold text-secondary-900 mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-secondary-500">
                  {stat.description}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="inline-flex items-center bg-primary-50 border border-primary-200 rounded-full px-6 py-3 text-primary-700">
            <StarIcon className="w-5 h-5 mr-2 text-primary-500" />
            <span className="text-sm font-medium">
              Join 500+ companies already transforming their operations
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
