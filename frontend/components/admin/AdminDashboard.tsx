'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  MessageCircle, 
  BarChart3, 
  Settings, 
  Shield,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Activity,
  UserPlus,
  Mail,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserManagement } from './UserManagement'
import { SupportTickets } from './SupportTickets'
import { SystemAnalytics } from './SystemAnalytics'
import { SystemConfiguration } from './SystemConfiguration'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  openTickets: number
  avgResponseTime: string
  systemUptime: number
  monthlyRevenue: number
  revenueGrowth: number
}

const mockStats: AdminStats = {
  totalUsers: 1825,
  activeUsers: 1420,
  newUsersToday: 23,
  openTickets: 8,
  avgResponseTime: '2.4h',
  systemUptime: 99.98,
  monthlyRevenue: 22300,
  revenueGrowth: 14.4
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats] = useState<AdminStats>(mockStats)

  const quickActions = [
    {
      title: 'Add New User',
      description: 'Create a new user account',
      icon: UserPlus,
      action: () => console.log('Add user'),
      color: 'blue'
    },
    {
      title: 'Send Announcement',
      description: 'Broadcast message to all users',
      icon: Mail,
      action: () => console.log('Send announcement'),
      color: 'green'
    },
    {
      title: 'View System Logs',
      description: 'Check recent system activity',
      icon: Activity,
      action: () => console.log('View logs'),
      color: 'purple'
    },
    {
      title: 'Backup Database',
      description: 'Create system backup',
      icon: Shield,
      action: () => console.log('Backup'),
      color: 'orange'
    }
  ]

  const recentActivity = [
    {
      type: 'user',
      message: 'New user registration: john.doe@example.com',
      time: '5 minutes ago',
      icon: Users
    },
    {
      type: 'ticket',
      message: 'Support ticket #1234 resolved',
      time: '12 minutes ago',
      icon: MessageCircle
    },
    {
      type: 'system',
      message: 'Database backup completed successfully',
      time: '1 hour ago',
      icon: CheckCircle
    },
    {
      type: 'alert',
      message: 'High API usage detected for enterprise user',
      time: '2 hours ago',
      icon: AlertCircle
    },
    {
      type: 'revenue',
      message: 'New enterprise subscription: $2,499/month',
      time: '3 hours ago',
      icon: TrendingUp
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Monitor and manage your Frontier platform
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                      <div className="flex items-center mt-1">
                        <Badge variant="secondary" className="text-xs">
                          +{stats.newUsersToday} today
                        </Badge>
                      </div>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                      <p className="text-2xl font-bold">{stats.activeUsers.toLocaleString()}</p>
                      <div className="flex items-center mt-1">
                        <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                          {((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% active
                        </Badge>
                      </div>
                    </div>
                    <Activity className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Open Tickets</p>
                      <p className="text-2xl font-bold">{stats.openTickets}</p>
                      <div className="flex items-center mt-1">
                        <Badge variant="outline" className="text-xs">
                          Avg: {stats.avgResponseTime}
                        </Badge>
                      </div>
                    </div>
                    <MessageCircle className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                      <p className="text-2xl font-bold">${stats.monthlyRevenue.toLocaleString()}</p>
                      <div className="flex items-center mt-1">
                        <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                          +{stats.revenueGrowth}%
                        </Badge>
                      </div>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {quickActions.map((action, index) => {
                      const Icon = action.icon
                      return (
                        <motion.div
                          key={index}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="outline"
                            className="h-auto p-4 flex flex-col items-start space-y-2 hover:shadow-md transition-shadow"
                            onClick={action.action}
                          >
                            <Icon className={`w-6 h-6 text-${action.color}-500`} />
                            <div className="text-left">
                              <div className="font-medium text-sm">{action.title}</div>
                              <div className="text-xs text-muted-foreground">{action.description}</div>
                            </div>
                          </Button>
                        </motion.div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest system events and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => {
                      const Icon = activity.icon
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <Icon className="w-5 h-5 text-gray-600 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{activity.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{activity.time}</span>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Current system status and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="font-medium">System Uptime</p>
                      <p className="text-2xl font-bold text-green-600">{stats.systemUptime}%</p>
                      <p className="text-sm text-green-700">Last 30 days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                    <BarChart3 className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-medium">API Response</p>
                      <p className="text-2xl font-bold text-blue-600">120ms</p>
                      <p className="text-sm text-blue-700">Average response time</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
                    <Activity className="w-8 h-8 text-purple-500" />
                    <div>
                      <p className="font-medium">Active Sessions</p>
                      <p className="text-2xl font-bold text-purple-600">847</p>
                      <p className="text-sm text-purple-700">Current connections</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="support">
            <SupportTickets />
          </TabsContent>

          <TabsContent value="analytics">
            <SystemAnalytics />
          </TabsContent>

          <TabsContent value="settings">
            <SystemConfiguration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
