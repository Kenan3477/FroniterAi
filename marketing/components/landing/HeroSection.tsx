'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRightIcon, PlayIcon } from '@heroicons/react/24/outline'
import { ChevronDownIcon } from '@heroicons/react/24/solid'

const heroStats = [
  { value: '500+', label: 'Enterprise Clients' },
  { value: '40%', label: 'Efficiency Increase' },
  { value: '99.9%', label: 'Uptime Guarantee' },
  { value: '$2.5M', label: 'Average Cost Savings' }
]

const trustedCompanies = [
  { name: 'Microsoft', logo: '/logos/microsoft.svg' },
  { name: 'Amazon', logo: '/logos/amazon.svg' },
  { name: 'Google', logo: '/logos/google.svg' },
  { name: 'Tesla', logo: '/logos/tesla.svg' },
  { name: 'Apple', logo: '/logos/apple.svg' },
  { name: 'Meta', logo: '/logos/meta.svg' }
]

export function HeroSection() {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [currentStatIndex, setCurrentStatIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatIndex((prev) => (prev + 1) % heroStats.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" />
      <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float-delayed" />
      <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" />

      <div className="container relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          {/* Main Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="inline-flex items-center bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-primary-200">
              <span className="w-2 h-2 bg-primary-500 rounded-full mr-2 animate-pulse" />
              Now serving 500+ enterprise clients worldwide
            </div>
            
            <h1 className="hero-text mb-6 text-balance">
              Transform Your
              <span className="gradient-text"> Business Operations </span>
              with AI-Powered Intelligence
            </h1>
            
            <p className="hero-subtitle mb-8 text-balance">
              Revolutionize how your business operates with our comprehensive platform that combines 
              AI automation, real-time analytics, and seamless integrations to deliver unprecedented 
              operational efficiency and cost savings.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <button className="btn-primary btn-xl group">
              Start Free Trial
              <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button 
              onClick={() => setIsVideoModalOpen(true)}
              className="btn-ghost btn-xl group flex items-center"
            >
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-3 group-hover:bg-primary-200 transition-colors">
                <PlayIcon className="w-5 h-5 text-primary-600 ml-0.5" />
              </div>
              Watch Demo
            </button>
          </motion.div>

          {/* Animated Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-16"
          >
            {heroStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className={`text-center transition-all duration-500 ${
                  index === currentStatIndex ? 'scale-110' : 'scale-100'
                }`}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-3xl sm:text-4xl font-bold text-primary-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-secondary-600 font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Trusted By Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mb-16"
          >
            <p className="text-secondary-500 text-sm font-medium mb-8 uppercase tracking-wide">
              Trusted by industry leaders
            </p>
            <div className="flex justify-center items-center gap-8 sm:gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              {trustedCompanies.map((company) => (
                <div key={company.name} className="h-8 w-20 bg-secondary-300 rounded flex items-center justify-center">
                  <span className="text-xs font-medium text-secondary-600">{company.name}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <div className="flex flex-col items-center text-secondary-400">
              <span className="text-xs mb-2 font-medium">Scroll to explore</span>
              <ChevronDownIcon className="w-5 h-5 animate-bounce" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Video Modal */}
      {isVideoModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white rounded-2xl overflow-hidden max-w-4xl w-full aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full h-full bg-secondary-100 flex items-center justify-center">
              <div className="text-center">
                <PlayIcon className="w-20 h-20 text-secondary-400 mx-auto mb-4" />
                <p className="text-secondary-600">Product Demo Video</p>
                <p className="text-sm text-secondary-500 mt-2">Coming Soon</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </section>
  )
}
