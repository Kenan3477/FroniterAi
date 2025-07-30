'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BuildingOffice2Icon,
  HeartIcon,
  CogIcon,
  TruckIcon,
  BanknotesIcon,
  AcademicCapIcon,
  ShoppingBagIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline'

const caseStudies = [
  {
    id: 'techcorp-manufacturing',
    industry: 'Manufacturing',
    company: 'TechCorp Industries',
    companySize: '2,500 employees',
    location: 'Detroit, MI',
    icon: CogIcon,
    challenge: 'Manual production planning and quality control processes causing 25% efficiency loss',
    solution: 'AI-powered production optimization and automated quality management',
    results: {
      costReduction: '35%',
      efficiencyGain: '40%',
      qualityImprovement: '60%',
      roiTimeline: '3 months',
      annualSavings: '$2.8M'
    },
    metrics: [
      { label: 'Production Efficiency', before: '65%', after: '91%' },
      { label: 'Quality Defects', before: '8.5%', after: '2.1%' },
      { label: 'Downtime Reduction', before: '12h/week', after: '3h/week' },
      { label: 'Order Fulfillment', before: '72h', after: '24h' }
    ],
    testimonial: {
      quote: "Frontier transformed our manufacturing operations completely. We reduced production costs by 35% and improved efficiency by 40% within just 3 months.",
      author: "Sarah Johnson",
      role: "VP of Operations"
    },
    image: '/case-studies/techcorp-manufacturing.jpg'
  },
  {
    id: 'healthcare-plus',
    industry: 'Healthcare',
    company: 'HealthCare Plus',
    companySize: '5,000 employees',
    location: 'Boston, MA',
    icon: HeartIcon,
    challenge: 'Complex compliance requirements and patient workflow inefficiencies',
    solution: 'Automated compliance monitoring and patient flow optimization',
    results: {
      complianceRate: '100%',
      patientWaitTime: '45%',
      staffProductivity: '30%',
      roiTimeline: '4 months',
      annualSavings: '$4.2M'
    },
    metrics: [
      { label: 'Compliance Rate', before: '85%', after: '100%' },
      { label: 'Patient Wait Time', before: '45 min', after: '25 min' },
      { label: 'Staff Utilization', before: '68%', after: '88%' },
      { label: 'Documentation Time', before: '3.5h/day', after: '1.2h/day' }
    ],
    testimonial: {
      quote: "Compliance management became effortless with Frontier. We maintain 100% compliance while reducing audit preparation time by 70%.",
      author: "Emily Rodriguez",
      role: "Head of Operations"
    },
    image: '/case-studies/healthcare-plus.jpg'
  },
  {
    id: 'global-logistics',
    industry: 'Logistics',
    company: 'Global Logistics Co',
    companySize: '3,200 employees',
    location: 'Los Angeles, CA',
    icon: TruckIcon,
    challenge: 'Lack of real-time visibility across global supply chain operations',
    solution: 'End-to-end supply chain visibility and predictive analytics',
    results: {
      visibilityImprovement: '100%',
      deliveryAccuracy: '25%',
      costReduction: '28%',
      roiTimeline: '5 months',
      annualSavings: '$3.1M'
    },
    metrics: [
      { label: 'On-Time Delivery', before: '78%', after: '97%' },
      { label: 'Inventory Accuracy', before: '82%', after: '99%' },
      { label: 'Route Optimization', before: 'Manual', after: 'AI-Powered' },
      { label: 'Customer Satisfaction', before: '3.2/5', after: '4.8/5' }
    ],
    testimonial: {
      quote: "Real-time visibility across our entire supply chain has been a game-changer. We can now predict and prevent issues before they impact our customers.",
      author: "David Kim",
      role: "Operations Director"
    },
    image: '/case-studies/global-logistics.jpg'
  },
  {
    id: 'fintech-solutions',
    industry: 'Financial Services',
    company: 'FinTech Solutions',
    companySize: '1,800 employees',
    location: 'New York, NY',
    icon: BanknotesIcon,
    challenge: 'Manual risk assessment and compliance reporting processes',
    solution: 'Automated risk management and real-time compliance monitoring',
    results: {
      riskAccuracy: '85%',
      complianceEfficiency: '70%',
      processSpeed: '60%',
      roiTimeline: '2 months',
      annualSavings: '$1.9M'
    },
    metrics: [
      { label: 'Risk Assessment Speed', before: '5 days', after: '2 hours' },
      { label: 'Compliance Reporting', before: '2 weeks', after: '1 day' },
      { label: 'False Positives', before: '35%', after: '8%' },
      { label: 'Customer Onboarding', before: '3 days', after: '4 hours' }
    ],
    testimonial: {
      quote: "Our risk assessment accuracy improved by 85% while reducing processing time from days to hours. The ROI was immediate.",
      author: "Michael Chen",
      role: "Chief Risk Officer"
    },
    image: '/case-studies/fintech-solutions.jpg'
  },
  {
    id: 'retailmax',
    industry: 'Retail',
    company: 'RetailMax',
    companySize: '4,500 employees',
    location: 'Chicago, IL',
    icon: ShoppingBagIcon,
    challenge: 'Inventory management and customer experience optimization across 200+ stores',
    solution: 'AI-powered inventory optimization and omnichannel customer journey management',
    results: {
      inventoryReduction: '30%',
      customerSatisfaction: '45%',
      salesIncrease: '22%',
      roiTimeline: '6 months',
      annualSavings: '$5.2M'
    },
    metrics: [
      { label: 'Inventory Turnover', before: '4.2x/year', after: '6.8x/year' },
      { label: 'Stockout Rate', before: '12%', after: '3%' },
      { label: 'Customer NPS', before: '32', after: '68' },
      { label: 'Online-to-Store', before: '15%', after: '38%' }
    ],
    testimonial: {
      quote: "The ROI was immediate. Within 6 months, we saved $1.2M in operational costs and improved our cash flow by 25%.",
      author: "Lisa Thompson",
      role: "Finance Director"
    },
    image: '/case-studies/retailmax.jpg'
  },
  {
    id: 'buildtech-systems',
    industry: 'Construction',
    company: 'BuildTech Systems',
    companySize: '1,200 employees',
    location: 'Austin, TX',
    icon: BuildingOffice2Icon,
    challenge: 'Project delays and resource allocation inefficiencies across multiple construction sites',
    solution: 'Project management automation and resource optimization platform',
    results: {
      projectDelivery: '30%',
      resourceUtilization: '45%',
      costOverruns: '50%',
      roiTimeline: '4 months',
      annualSavings: '$2.2M'
    },
    metrics: [
      { label: 'Project On-Time', before: '65%', after: '92%' },
      { label: 'Resource Utilization', before: '58%', after: '84%' },
      { label: 'Budget Variance', before: '+15%', after: '-2%' },
      { label: 'Client Satisfaction', before: '3.4/5', after: '4.7/5' }
    ],
    testimonial: {
      quote: "Project delivery times improved by 30% and resource utilization by 45%. Frontier helped us scale operations without scaling complexity.",
      author: "Robert Wilson",
      role: "VP of Engineering"
    },
    image: '/case-studies/buildtech-systems.jpg'
  }
]

const industries = [
  'All Industries',
  'Manufacturing',
  'Healthcare',
  'Logistics',
  'Financial Services',
  'Retail',
  'Construction',
  'Technology',
  'Education'
]

export function CaseStudyGrid() {
  const [selectedIndustry, setSelectedIndustry] = useState('All Industries')
  const [selectedCaseStudy, setSelectedCaseStudy] = useState(null)

  const filteredCaseStudies = selectedIndustry === 'All Industries' 
    ? caseStudies 
    : caseStudies.filter(study => study.industry === selectedIndustry)

  return (
    <section className="section-padding bg-secondary-50 relative overflow-hidden">
      <div className="container">
        {/* Industry Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {industries.map((industry) => (
            <button
              key={industry}
              onClick={() => setSelectedIndustry(industry)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedIndustry === industry
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-white text-secondary-600 hover:bg-primary-50 hover:text-primary-600 border border-secondary-200'
              }`}
            >
              {industry}
            </button>
          ))}
        </motion.div>

        {/* Case Studies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCaseStudies.map((study, index) => (
            <motion.div
              key={study.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group cursor-pointer"
              onClick={() => setSelectedCaseStudy(study)}
            >
              <div className="card-hover p-6 h-full">
                {/* Header */}
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mr-4">
                    <study.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-secondary-900 group-hover:text-primary-600 transition-colors">
                      {study.company}
                    </h3>
                    <p className="text-sm text-secondary-600">
                      {study.industry} • {study.companySize}
                    </p>
                  </div>
                </div>

                {/* Challenge */}
                <div className="mb-4">
                  <h4 className="font-semibold text-secondary-900 mb-2">Challenge</h4>
                  <p className="text-sm text-secondary-700 line-clamp-2">
                    {study.challenge}
                  </p>
                </div>

                {/* Key Results */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {Object.entries(study.results).slice(0, 4).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="text-xl font-bold text-primary-600">
                        {typeof value === 'string' && value.includes('%') ? value : 
                         typeof value === 'string' && value.includes('$') ? value :
                         typeof value === 'string' && value.includes('month') ? value :
                         `+${value}`}
                      </div>
                      <div className="text-xs text-secondary-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="text-primary-600 text-sm font-medium group-hover:text-primary-700 transition-colors">
                  Read Full Case Study →
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Modal for detailed case study */}
        {selectedCaseStudy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedCaseStudy(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                {/* Header */}
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mr-6">
                    <selectedCaseStudy.icon className="w-8 h-8 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-secondary-900 mb-2">
                      {selectedCaseStudy.company}
                    </h2>
                    <p className="text-secondary-600">
                      {selectedCaseStudy.industry} • {selectedCaseStudy.companySize} • {selectedCaseStudy.location}
                    </p>
                  </div>
                </div>

                {/* Challenge & Solution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-secondary-900 mb-4">Challenge</h3>
                    <p className="text-secondary-700 leading-relaxed">
                      {selectedCaseStudy.challenge}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-secondary-900 mb-4">Solution</h3>
                    <p className="text-secondary-700 leading-relaxed">
                      {selectedCaseStudy.solution}
                    </p>
                  </div>
                </div>

                {/* Results */}
                <div className="bg-primary-50 rounded-xl p-6 mb-8">
                  <h3 className="text-xl font-bold text-secondary-900 mb-6 text-center">
                    Results Achieved
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {Object.entries(selectedCaseStudy.results).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className="text-2xl font-bold text-primary-600 mb-2">
                          {typeof value === 'string' && value.includes('%') ? value : 
                           typeof value === 'string' && value.includes('$') ? value :
                           typeof value === 'string' && value.includes('month') ? value :
                           `+${value}`}
                        </div>
                        <div className="text-sm text-secondary-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detailed Metrics */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-secondary-900 mb-6">Before vs After</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCaseStudy.metrics.map((metric, index) => (
                      <div key={index} className="flex justify-between items-center p-4 bg-secondary-50 rounded-lg">
                        <span className="font-medium text-secondary-900">{metric.label}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-red-600 font-medium">{metric.before}</span>
                          <span className="text-secondary-400">→</span>
                          <span className="text-green-600 font-bold">{metric.after}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Testimonial */}
                <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl p-6 text-white mb-6">
                  <blockquote className="text-lg leading-relaxed mb-4">
                    "{selectedCaseStudy.testimonial.quote}"
                  </blockquote>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold mr-4">
                      {selectedCaseStudy.testimonial.author.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold">{selectedCaseStudy.testimonial.author}</div>
                      <div className="text-primary-200">{selectedCaseStudy.testimonial.role}</div>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="text-center">
                  <button className="btn-primary btn-lg mr-4">
                    Get Similar Results
                  </button>
                  <button 
                    onClick={() => setSelectedCaseStudy(null)}
                    className="btn-ghost btn-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
