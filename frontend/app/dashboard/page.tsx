'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  ArrowUpRight,            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              {/* Quick Actions */}
              <Card className="col-span-4" data-tour="quick-actions">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Start common tasks with a single click
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QuickActions />
                </CardContent>
              </Card>ight,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Plus,
  FileText,
  Target,
  Briefcase
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useAnalytics } from '@/hooks/useAnalytics'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { RecentAnalyses } from '@/components/dashboard/RecentAnalyses'
import { PerformanceChart } from '@/components/dashboard/PerformanceChart'
import { AlertsPanel } from '@/components/dashboard/AlertsPanel'
import { UpgradePlan } from '@/components/dashboard/UpgradePlan'
import { OnboardingManager } from '@/components/onboarding'

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics()

  useEffect(() => {
    // Any dashboard-specific initialization
  }, [user])

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (!user) {
    return <div>Please log in to access the dashboard</div>
  }

  const stats = [
    {
      title: 'Analyses Completed',
      value: analytics?.totalAnalyses || 0,
      change: '+12%',
      trend: 'up',
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Active Projects',
      value: analytics?.activeProjects || 0,
      change: '+5%',
      trend: 'up',
      icon: Briefcase,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'API Calls',
      value: analytics?.apiCalls || 0,
      change: '+18%',
      trend: 'up',
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Success Rate',
      value: `${analytics?.successRate || 98}%`,
      change: '+2%',
      trend: 'up',
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ]

  return (
    <div className="container-wide space-y-8 py-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user.name || user.username}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your business analyses today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {user.subscription_tier} Plan
          </Badge>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Analysis
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        data-tour="dashboard-stats"
      >
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat, index) => (
          <Card key={stat.title} className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="w-3 h-3 mr-1 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 mr-1 text-red-600" />
                )}
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              {/* Performance Chart */}
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Performance Overview</CardTitle>
                  <CardDescription>
                    Your analysis performance over the last 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <PerformanceChart />
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest analyses and updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentAnalyses />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              {/* Quick Actions */}
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Start a new analysis or access popular features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QuickActions />
                </CardContent>
              </Card>

              {/* Alerts & Notifications */}
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Alerts & Insights</CardTitle>
                  <CardDescription>
                    Important updates and recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertsPanel />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Analytics</CardTitle>
                  <CardDescription>
                    Detailed breakdown of your API usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Monthly API Calls</span>
                      <span className="text-sm font-medium">
                        {analytics?.monthlyApiCalls || 0} / {analytics?.monthlyLimit || 10000}
                      </span>
                    </div>
                    <Progress 
                      value={((analytics?.monthlyApiCalls || 0) / (analytics?.monthlyLimit || 10000)) * 100} 
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground">
                      Resets on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Analysis Types</CardTitle>
                  <CardDescription>
                    Most popular analysis types you've used
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.topAnalysisTypes?.map((type: any, index: number) => (
                      <div key={type.name} className="flex items-center justify-between">
                        <span className="text-sm">{type.name}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={type.percentage} className="w-20" />
                          <span className="text-sm text-muted-foreground w-12">
                            {type.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Projects</CardTitle>
                  <CardDescription>
                    Manage your ongoing business analysis projects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No active projects yet</p>
                    <Button className="mt-4" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Project
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI Insights</CardTitle>
                  <CardDescription>
                    Personalized recommendations based on your analysis patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 rounded-md">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Optimization Opportunity</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Your financial analyses show consistent patterns. Consider setting up automated reports.
                          </p>
                          <Button size="sm" variant="outline" className="mt-3">
                            Learn More
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-50 rounded-md">
                          <Target className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Strategic Planning</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Based on your industry focus, strategic planning tools could provide valuable insights.
                          </p>
                          <Button size="sm" variant="outline" className="mt-3">
                            Explore Tools
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Upgrade Banner for Free Users */}
      {user.subscription_tier === 'free' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <UpgradePlan />
        </motion.div>
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <WelcomeOnboarding 
          onComplete={() => setShowOnboarding(false)}
          user={user}
        />
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="container-wide space-y-8 py-6">
      <div className="space-y-2">
        <div className="h-8 bg-muted rounded w-64 loading-skeleton" />
        <div className="h-4 bg-muted rounded w-96 loading-skeleton" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 bg-muted rounded w-32 loading-skeleton" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 loading-skeleton mb-2" />
              <div className="h-3 bg-muted rounded w-24 loading-skeleton" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded w-48 loading-skeleton" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded loading-skeleton" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded w-48 loading-skeleton" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded loading-skeleton" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding System */}
      <OnboardingManager />
    </div>
  )
}
