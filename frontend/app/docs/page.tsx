'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BookOpen, 
  Code, 
  Play, 
  Copy, 
  Download, 
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Zap,
  Shield,
  Globe,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Lightbulb
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ApiPlayground } from '@/components/docs/ApiPlayground'
import { CodeExample } from '@/components/docs/CodeExample'
import { EndpointCard } from '@/components/docs/EndpointCard'
import { QuickStart } from '@/components/docs/QuickStart'
import { SDKDownload } from '@/components/docs/SDKDownload'
import { useAuth } from '@/hooks/useAuth'

interface APIEndpoint {
  id: string
  title: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  category: string
  authenticated: boolean
  tier: 'free' | 'professional' | 'enterprise'
  parameters?: any[]
  responses?: any[]
  examples?: any[]
}

const apiEndpoints: APIEndpoint[] = [
  {
    id: 'health',
    title: 'Health Check',
    method: 'GET',
    path: '/health',
    description: 'Check the health status of the API',
    category: 'System',
    authenticated: false,
    tier: 'free',
    responses: [
      {
        status: 200,
        description: 'API is healthy',
        example: {
          success: true,
          data: {
            status: 'healthy',
            timestamp: '2024-01-15T10:30:00Z',
            version: '1.0.0'
          }
        }
      }
    ]
  },
  {
    id: 'financial-analysis',
    title: 'Financial Analysis',
    method: 'POST',
    path: '/api/v1/business/financial-analysis',
    description: 'Perform comprehensive financial analysis on company data',
    category: 'Financial',
    authenticated: true,
    tier: 'free',
    parameters: [
      {
        name: 'company_name',
        type: 'string',
        required: true,
        description: 'Name of the company to analyze'
      },
      {
        name: 'industry',
        type: 'string',
        required: true,
        description: 'Industry sector (technology, healthcare, finance, etc.)'
      },
      {
        name: 'financial_statements',
        type: 'object',
        required: true,
        description: 'Company financial statements data'
      }
    ],
    responses: [
      {
        status: 200,
        description: 'Successful analysis',
        example: {
          success: true,
          data: {
            company_name: 'Example Corp',
            financial_ratios: {
              liquidity: { current_ratio: 2.5, quick_ratio: 1.8 },
              profitability: { roe: 0.15, roa: 0.12 },
              leverage: { debt_to_equity: 0.4 }
            },
            score: 8.5,
            recommendations: ['Improve cash flow management', 'Consider debt refinancing']
          }
        }
      }
    ]
  },
  {
    id: 'valuation',
    title: 'Business Valuation',
    method: 'POST',
    path: '/api/v1/business/valuation',
    description: 'Calculate business valuation using multiple methods',
    category: 'Financial',
    authenticated: true,
    tier: 'professional',
    parameters: [
      {
        name: 'company_name',
        type: 'string',
        required: true,
        description: 'Name of the company to value'
      },
      {
        name: 'financial_data',
        type: 'object',
        required: true,
        description: 'Financial data for valuation'
      },
      {
        name: 'valuation_methods',
        type: 'array',
        required: false,
        description: 'Methods to use for valuation'
      }
    ]
  },
  {
    id: 'strategic-planning',
    title: 'Strategic Planning',
    method: 'POST',
    path: '/api/v1/business/strategic-planning',
    description: 'Generate strategic planning recommendations',
    category: 'Strategy',
    authenticated: true,
    tier: 'professional',
  },
  {
    id: 'market-research',
    title: 'Market Research',
    method: 'POST',
    path: '/api/v1/business/market-research',
    description: 'Conduct market research and analysis',
    category: 'Strategy',
    authenticated: true,
    tier: 'free',
  },
  {
    id: 'competitive-analysis',
    title: 'Competitive Analysis',
    method: 'POST',
    path: '/api/v1/business/competitive-analysis',
    description: 'Analyze competitive landscape',
    category: 'Strategy',
    authenticated: true,
    tier: 'professional',
  },
  {
    id: 'industry-benchmarks',
    title: 'Industry Benchmarks',
    method: 'GET',
    path: '/api/v1/business/industry-benchmarks',
    description: 'Get industry benchmark data',
    category: 'Data',
    authenticated: true,
    tier: 'free',
  }
]

const categories = ['All', 'System', 'Financial', 'Strategy', 'Data']
const tiers = ['All', 'Free', 'Professional', 'Enterprise']

export default function DocsPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedTier, setSelectedTier] = useState('All')
  const [expandedEndpoints, setExpandedEndpoints] = useState<string[]>(['health'])

  const filteredEndpoints = apiEndpoints.filter(endpoint => {
    const matchesSearch = endpoint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         endpoint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         endpoint.path.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'All' || endpoint.category === selectedCategory
    const matchesTier = selectedTier === 'All' || endpoint.tier.toLowerCase() === selectedTier.toLowerCase()
    
    return matchesSearch && matchesCategory && matchesTier
  })

  const toggleEndpoint = (endpointId: string) => {
    setExpandedEndpoints(prev => 
      prev.includes(endpointId) 
        ? prev.filter(id => id !== endpointId)
        : [...prev, endpointId]
    )
  }

  const getMethodColor = (method: string) => {
    const colors = {
      GET: 'bg-green-100 text-green-800',
      POST: 'bg-blue-100 text-blue-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800'
    }
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getTierColor = (tier: string) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      professional: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800'
    }
    return colors[tier as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const canAccessEndpoint = (endpoint: APIEndpoint) => {
    if (!user) return endpoint.tier === 'free' && !endpoint.authenticated
    
    const userTier = user.subscription_tier
    const tierHierarchy = { free: 0, professional: 1, enterprise: 2 }
    
    return tierHierarchy[userTier as keyof typeof tierHierarchy] >= 
           tierHierarchy[endpoint.tier as keyof typeof tierHierarchy]
  }

  return (
    <div className="container-wide space-y-8 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <BookOpen className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">API Documentation</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Comprehensive documentation for the Frontier Business Operations API. 
          Explore endpoints, test requests, and integrate with your applications.
        </p>
        
        {/* Quick Stats */}
        <div className="flex items-center justify-center gap-8 pt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{apiEndpoints.length}</div>
            <div className="text-sm text-muted-foreground">Endpoints</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">99.9%</div>
            <div className="text-sm text-muted-foreground">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">&lt;200ms</div>
            <div className="text-sm text-muted-foreground">Response Time</div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Tabs defaultValue="endpoints" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="endpoints">API Reference</TabsTrigger>
            <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
            <TabsTrigger value="playground">API Playground</TabsTrigger>
            <TabsTrigger value="sdks">SDKs & Libraries</TabsTrigger>
            <TabsTrigger value="guides">Guides</TabsTrigger>
          </TabsList>

          {/* API Reference */}
          <TabsContent value="endpoints" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search endpoints..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="form-input"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <select
                      value={selectedTier}
                      onChange={(e) => setSelectedTier(e.target.value)}
                      className="form-input"
                    >
                      {tiers.map(tier => (
                        <option key={tier} value={tier}>{tier}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Endpoints List */}
            <div className="space-y-4">
              {filteredEndpoints.map((endpoint) => (
                <Card key={endpoint.id} className="overflow-hidden">
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleEndpoint(endpoint.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {expandedEndpoints.includes(endpoint.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <Badge className={getMethodColor(endpoint.method)}>
                            {endpoint.method}
                          </Badge>
                        </div>
                        <div>
                          <CardTitle className="text-lg">{endpoint.title}</CardTitle>
                          <code className="text-sm text-muted-foreground">{endpoint.path}</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {endpoint.authenticated && (
                          <Badge variant="outline">
                            <Shield className="w-3 h-3 mr-1" />
                            Auth Required
                          </Badge>
                        )}
                        <Badge className={getTierColor(endpoint.tier)}>
                          {endpoint.tier}
                        </Badge>
                        {!canAccessEndpoint(endpoint) && (
                          <Badge variant="destructive">
                            Upgrade Required
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      {endpoint.description}
                    </CardDescription>
                  </CardHeader>

                  {expandedEndpoints.includes(endpoint.id) && (
                    <CardContent className="pt-0">
                      <EndpointCard 
                        endpoint={endpoint} 
                        canAccess={canAccessEndpoint(endpoint)}
                      />
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {filteredEndpoints.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No endpoints found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search query or filters
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Quick Start */}
          <TabsContent value="quickstart" className="space-y-6">
            <QuickStart user={user} />
          </TabsContent>

          {/* API Playground */}
          <TabsContent value="playground" className="space-y-6">
            <ApiPlayground endpoints={filteredEndpoints} user={user} />
          </TabsContent>

          {/* SDKs */}
          <TabsContent value="sdks" className="space-y-6">
            <SDKDownload />
          </TabsContent>

          {/* Guides */}
          <TabsContent value="guides" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="card-hover">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle>Getting Started</CardTitle>
                  <CardDescription>
                    Learn how to make your first API call and authenticate requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Read Guide
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle>Best Practices</CardTitle>
                  <CardDescription>
                    Learn about rate limiting, error handling, and optimization techniques
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Read Guide
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                    <Code className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle>Code Examples</CardTitle>
                  <CardDescription>
                    Practical examples in multiple programming languages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    View Examples
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <CardTitle>Error Handling</CardTitle>
                  <CardDescription>
                    Understand error codes and how to handle various error scenarios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Read Guide
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
                    <Globe className="w-6 h-6 text-indigo-600" />
                  </div>
                  <CardTitle>Webhooks</CardTitle>
                  <CardDescription>
                    Set up real-time notifications for analysis completion
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Read Guide
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mb-4">
                    <Lightbulb className="w-6 h-6 text-red-600" />
                  </div>
                  <CardTitle>Use Cases</CardTitle>
                  <CardDescription>
                    Real-world examples and use cases for different industries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    View Use Cases
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}
