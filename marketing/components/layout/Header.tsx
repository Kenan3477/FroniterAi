'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Bars3Icon, 
  XMarkIcon,
  ChevronDownIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

const navigation = [
  { name: 'Home', href: '/' },
  { 
    name: 'Product', 
    href: '/product',
    submenu: [
      { name: 'Features', href: '/features' },
      { name: 'Integrations', href: '/integrations' },
      { name: 'Security', href: '/security' },
      { name: 'API Documentation', href: '/api-docs' }
    ]
  },
  { name: 'Comparison', href: '/comparison' },
  { name: 'Case Studies', href: '/case-studies' },
  { 
    name: 'Resources', 
    href: '/resources',
    submenu: [
      { name: 'Blog', href: '/blog' },
      { name: 'Documentation', href: '/docs' },
      { name: 'Help Center', href: '/help' },
      { name: 'ROI Calculator', href: '/roi-calculator' }
    ]
  },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Contact', href: '/contact' }
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSubmenu, setActiveSubmenu] = useState(null)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-secondary-200">
      <nav className="container flex items-center justify-between py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <RocketLaunchIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-secondary-900">Frontier</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-8">
          {navigation.map((item) => (
            <div key={item.name} className="relative group">
              {item.submenu ? (
                <>
                  <button className="flex items-center space-x-1 text-secondary-700 hover:text-primary-600 transition-colors py-2">
                    <span>{item.name}</span>
                    <ChevronDownIcon className="w-4 h-4" />
                  </button>
                  
                  {/* Submenu */}
                  <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="bg-white rounded-xl shadow-xl border border-secondary-200 py-2 min-w-[200px]">
                      {item.submenu.map((subitem) => (
                        <Link
                          key={subitem.name}
                          href={subitem.href}
                          className="block px-4 py-2 text-sm text-secondary-700 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          {subitem.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <Link
                  href={item.href}
                  className="text-secondary-700 hover:text-primary-600 transition-colors py-2"
                >
                  {item.name}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden lg:flex items-center space-x-4">
          <Link href="/login" className="btn-ghost btn-md">
            Sign In
          </Link>
          <Link href="/trial" className="btn-primary btn-md">
            Start Free Trial
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="lg:hidden p-2 text-secondary-700 hover:text-primary-600 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <XMarkIcon className="w-6 h-6" />
          ) : (
            <Bars3Icon className="w-6 h-6" />
          )}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="lg:hidden bg-white border-t border-secondary-200"
        >
          <div className="container py-4">
            <div className="space-y-4">
              {navigation.map((item) => (
                <div key={item.name}>
                  {item.submenu ? (
                    <>
                      <button
                        onClick={() => setActiveSubmenu(activeSubmenu === item.name ? null : item.name)}
                        className="flex items-center justify-between w-full text-left text-secondary-700 hover:text-primary-600 transition-colors py-2"
                      >
                        <span>{item.name}</span>
                        <ChevronDownIcon className={`w-4 h-4 transition-transform ${
                          activeSubmenu === item.name ? 'rotate-180' : ''
                        }`} />
                      </button>
                      
                      {activeSubmenu === item.name && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pl-4 space-y-2"
                        >
                          {item.submenu.map((subitem) => (
                            <Link
                              key={subitem.name}
                              href={subitem.href}
                              className="block text-sm text-secondary-600 hover:text-primary-600 transition-colors py-1"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {subitem.name}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className="block text-secondary-700 hover:text-primary-600 transition-colors py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}
              
              {/* Mobile CTAs */}
              <div className="pt-4 space-y-3 border-t border-secondary-200">
                <Link
                  href="/login"
                  className="block w-full btn-ghost btn-md text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/trial"
                  className="block w-full btn-primary btn-md text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </header>
  )
}
