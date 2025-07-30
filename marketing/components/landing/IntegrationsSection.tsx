'use client'

import { motion } from 'framer-motion'

const integrations = [
  {
    category: 'CRM & Sales',
    tools: [
      { name: 'Salesforce', logo: '/logos/salesforce.svg', connected: true },
      { name: 'HubSpot', logo: '/logos/hubspot.svg', connected: true },
      { name: 'Pipedrive', logo: '/logos/pipedrive.svg', connected: false },
      { name: 'Zoho CRM', logo: '/logos/zoho.svg', connected: true }
    ]
  },
  {
    category: 'Finance & Accounting',
    tools: [
      { name: 'QuickBooks', logo: '/logos/quickbooks.svg', connected: true },
      { name: 'Xero', logo: '/logos/xero.svg', connected: true },
      { name: 'SAP', logo: '/logos/sap.svg', connected: true },
      { name: 'NetSuite', logo: '/logos/netsuite.svg', connected: false }
    ]
  },
  {
    category: 'Communication',
    tools: [
      { name: 'Slack', logo: '/logos/slack.svg', connected: true },
      { name: 'Microsoft Teams', logo: '/logos/teams.svg', connected: true },
      { name: 'Discord', logo: '/logos/discord.svg', connected: false },
      { name: 'Zoom', logo: '/logos/zoom.svg', connected: true }
    ]
  },
  {
    category: 'Cloud & Infrastructure',
    tools: [
      { name: 'AWS', logo: '/logos/aws.svg', connected: true },
      { name: 'Google Cloud', logo: '/logos/gcp.svg', connected: true },
      { name: 'Microsoft Azure', logo: '/logos/azure.svg', connected: true },
      { name: 'Docker', logo: '/logos/docker.svg', connected: true }
    ]
  },
  {
    category: 'Analytics & BI',
    tools: [
      { name: 'Tableau', logo: '/logos/tableau.svg', connected: true },
      { name: 'Power BI', logo: '/logos/powerbi.svg', connected: true },
      { name: 'Google Analytics', logo: '/logos/ga.svg', connected: true },
      { name: 'Mixpanel', logo: '/logos/mixpanel.svg', connected: false }
    ]
  },
  {
    category: 'Project Management',
    tools: [
      { name: 'Jira', logo: '/logos/jira.svg', connected: true },
      { name: 'Asana', logo: '/logos/asana.svg', connected: true },
      { name: 'Monday.com', logo: '/logos/monday.svg', connected: false },
      { name: 'Trello', logo: '/logos/trello.svg', connected: true }
    ]
  }
]

export function IntegrationsSection() {
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
            Seamless
            <span className="gradient-text"> Integrations</span>
          </h2>
          <p className="section-subtitle">
            Connect with 150+ popular business tools and platforms. 
            No data silos, no manual exports—just seamless workflow automation.
          </p>
        </motion.div>

        {/* Integration Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {integrations.map((category, categoryIndex) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
              viewport={{ once: true }}
              className="card p-6"
            >
              <h3 className="text-lg font-bold text-secondary-900 mb-4 text-center">
                {category.category}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {category.tools.map((tool, toolIndex) => (
                  <motion.div
                    key={tool.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: (categoryIndex * 0.1) + (toolIndex * 0.05) }}
                    viewport={{ once: true }}
                    className={`relative p-3 rounded-lg border-2 transition-all duration-300 group cursor-pointer ${
                      tool.connected 
                        ? 'border-green-200 bg-green-50 hover:border-green-300' 
                        : 'border-secondary-200 bg-secondary-50 hover:border-primary-300'
                    }`}
                  >
                    {/* Logo placeholder */}
                    <div className="w-8 h-8 bg-secondary-300 rounded mx-auto mb-2 flex items-center justify-center">
                      <span className="text-xs font-medium text-secondary-600">
                        {tool.name.charAt(0)}
                      </span>
                    </div>
                    
                    <div className="text-xs font-medium text-secondary-900 text-center mb-1">
                      {tool.name}
                    </div>
                    
                    {/* Connection Status */}
                    <div className="flex justify-center">
                      <div className={`w-2 h-2 rounded-full ${
                        tool.connected ? 'bg-green-500' : 'bg-secondary-300'
                      }`} />
                    </div>

                    {/* Hover effect */}
                    <div className="absolute inset-0 bg-primary-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* API & Custom Integrations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-8 lg:p-12 text-white relative overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-white/5 bg-dot-pattern" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
            <div>
              <h3 className="text-3xl font-bold mb-4">
                Don't See Your Tool?
              </h3>
              <p className="text-primary-100 text-lg mb-6">
                Our API-first architecture makes it easy to connect any system. 
                Use our REST APIs, GraphQL endpoints, or webhooks to build custom integrations.
              </p>
              
              <div className="space-y-4 mb-6">
                {[
                  'RESTful API with comprehensive documentation',
                  'GraphQL endpoints for flexible data queries',
                  'Real-time webhooks for instant notifications',
                  'SDKs available for popular programming languages'
                ].map((feature, index) => (
                  <div key={feature} className="flex items-center">
                    <div className="w-2 h-2 bg-primary-200 rounded-full mr-3 flex-shrink-0" />
                    <span className="text-primary-100">{feature}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="btn bg-white text-primary-600 hover:bg-primary-50 btn-lg">
                  View API Docs
                </button>
                <button className="btn border-white/30 text-white hover:bg-white/10 btn-lg">
                  Request Integration
                </button>
              </div>
            </div>
            
            <div className="relative">
              {/* Code Example */}
              <div className="bg-secondary-900 rounded-xl p-6 font-mono text-sm">
                <div className="text-green-400 mb-2">// Example API call</div>
                <div className="text-gray-300">
                  <span className="text-blue-400">fetch</span>
                  <span className="text-gray-300">(</span>
                  <span className="text-yellow-300">'https://api.frontier.com/v1/workflows'</span>
                  <span className="text-gray-300">, {`{`}</span>
                </div>
                <div className="text-gray-300 ml-4">
                  <span className="text-purple-400">method</span>
                  <span className="text-gray-300">: </span>
                  <span className="text-yellow-300">'POST'</span>
                  <span className="text-gray-300">,</span>
                </div>
                <div className="text-gray-300 ml-4">
                  <span className="text-purple-400">headers</span>
                  <span className="text-gray-300">: {`{`}</span>
                </div>
                <div className="text-gray-300 ml-8">
                  <span className="text-yellow-300">'Authorization'</span>
                  <span className="text-gray-300">: </span>
                  <span className="text-yellow-300">'Bearer token'</span>
                </div>
                <div className="text-gray-300 ml-4">{`}`}</div>
                <div className="text-gray-300">{`})`}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Integration Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {[
              { value: '150+', label: 'Pre-built Integrations' },
              { value: '99.9%', label: 'Integration Uptime' },
              { value: '<5min', label: 'Average Setup Time' },
              { value: '24/7', label: 'Integration Support' }
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-secondary-600">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
