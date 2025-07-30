'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Database, 
  Mail, 
  Globe, 
  Shield, 
  Key,
  Palette,
  Bell,
  Users,
  CreditCard,
  FileText,
  AlertTriangle,
  CheckCircle,
  Upload,
  Download
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { useToast } from '@/hooks/useToast'

interface SystemConfig {
  general: {
    siteName: string
    siteDescription: string
    supportEmail: string
    maintenanceMode: boolean
    registrationOpen: boolean
  }
  email: {
    provider: string
    smtpHost: string
    smtpPort: string
    smtpUser: string
    smtpPassword: string
    fromName: string
    fromEmail: string
  }
  api: {
    rateLimit: number
    maxRequestSize: string
    enableCors: boolean
    allowedOrigins: string
    apiKeyExpiry: number
  }
  security: {
    passwordMinLength: number
    requireTwoFactor: boolean
    sessionTimeout: number
    maxLoginAttempts: number
    enableIpWhitelist: boolean
  }
  billing: {
    currency: string
    taxRate: number
    gracePeriod: number
    enableDunning: boolean
    webhookUrl: string
  }
  features: {
    enableAnalytics: boolean
    enableExport: boolean
    enableTeamFeatures: boolean
    enableApiAccess: boolean
    maxAnalysesPerMonth: {
      free: number
      professional: number
      enterprise: number
    }
  }
}

const initialConfig: SystemConfig = {
  general: {
    siteName: 'Frontier Business Analytics',
    siteDescription: 'Comprehensive business operations platform for financial analysis and insights',
    supportEmail: 'support@frontier.com',
    maintenanceMode: false,
    registrationOpen: true
  },
  email: {
    provider: 'smtp',
    smtpHost: 'smtp.frontier.com',
    smtpPort: '587',
    smtpUser: 'noreply@frontier.com',
    smtpPassword: '',
    fromName: 'Frontier Support',
    fromEmail: 'noreply@frontier.com'
  },
  api: {
    rateLimit: 1000,
    maxRequestSize: '10MB',
    enableCors: true,
    allowedOrigins: '*',
    apiKeyExpiry: 365
  },
  security: {
    passwordMinLength: 8,
    requireTwoFactor: false,
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    enableIpWhitelist: false
  },
  billing: {
    currency: 'USD',
    taxRate: 0,
    gracePeriod: 3,
    enableDunning: true,
    webhookUrl: ''
  },
  features: {
    enableAnalytics: true,
    enableExport: true,
    enableTeamFeatures: true,
    enableApiAccess: true,
    maxAnalysesPerMonth: {
      free: 5,
      professional: 50,
      enterprise: -1
    }
  }
}

export function SystemConfiguration() {
  const [config, setConfig] = useState<SystemConfig>(initialConfig)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const { toast } = useToast()

  const updateConfig = (section: keyof SystemConfig, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
    setHasChanges(true)
  }

  const updateNestedConfig = (section: keyof SystemConfig, parent: string, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parent]: {
          ...(prev[section] as any)[parent],
          [key]: value
        }
      }
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      // Simulate API call to save configuration
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setHasChanges(false)
      toast({
        title: 'Configuration saved',
        description: 'System configuration has been updated successfully.'
      })
    } catch (error) {
      toast({
        title: 'Error saving configuration',
        description: 'Failed to save system configuration. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setConfig(initialConfig)
    setHasChanges(false)
    toast({
      title: 'Configuration reset',
      description: 'Configuration has been reset to default values.'
    })
  }

  const handleExportConfig = () => {
    const configBlob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(configBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `frontier-config-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string)
        setConfig(importedConfig)
        setHasChanges(true)
        toast({
          title: 'Configuration imported',
          description: 'Configuration has been imported successfully.'
        })
      } catch (error) {
        toast({
          title: 'Import failed',
          description: 'Failed to import configuration. Please check the file format.',
          variant: 'destructive'
        })
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Configuration</h2>
          <p className="text-muted-foreground">Manage system settings and configuration</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              Unsaved changes
            </Badge>
          )}
          <Button variant="outline" onClick={handleExportConfig}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleImportConfig}
              className="hidden"
              id="import-config"
            />
            <Button variant="outline" onClick={() => document.getElementById('import-config')?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className={`w-4 h-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                <CardTitle>General Settings</CardTitle>
              </div>
              <CardDescription>Basic site configuration and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={config.general.siteName}
                    onChange={(e) => updateConfig('general', 'siteName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={config.general.supportEmail}
                    onChange={(e) => updateConfig('general', 'supportEmail', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={config.general.siteDescription}
                  onChange={(e) => updateConfig('general', 'siteDescription', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Maintenance Mode</h4>
                    <p className="text-sm text-muted-foreground">Temporarily disable site access</p>
                  </div>
                  <Switch
                    checked={config.general.maintenanceMode}
                    onCheckedChange={(checked) => updateConfig('general', 'maintenanceMode', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Open Registration</h4>
                    <p className="text-sm text-muted-foreground">Allow new user registrations</p>
                  </div>
                  <Switch
                    checked={config.general.registrationOpen}
                    onCheckedChange={(checked) => updateConfig('general', 'registrationOpen', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                <CardTitle>Email Configuration</CardTitle>
              </div>
              <CardDescription>Configure email delivery settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="emailProvider">Email Provider</Label>
                  <Select 
                    value={config.email.provider}
                    onValueChange={(value) => updateConfig('email', 'provider', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smtp">SMTP</SelectItem>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                      <SelectItem value="mailgun">Mailgun</SelectItem>
                      <SelectItem value="ses">Amazon SES</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={config.email.smtpHost}
                    onChange={(e) => updateConfig('email', 'smtpHost', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    value={config.email.smtpPort}
                    onChange={(e) => updateConfig('email', 'smtpPort', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">SMTP Username</Label>
                  <Input
                    id="smtpUser"
                    value={config.email.smtpUser}
                    onChange={(e) => updateConfig('email', 'smtpUser', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    value={config.email.fromName}
                    onChange={(e) => updateConfig('email', 'fromName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={config.email.fromEmail}
                    onChange={(e) => updateConfig('email', 'fromEmail', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPassword">SMTP Password</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  value={config.email.smtpPassword}
                  onChange={(e) => updateConfig('email', 'smtpPassword', e.target.value)}
                  placeholder="Enter SMTP password"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                <CardTitle>API Configuration</CardTitle>
              </div>
              <CardDescription>Configure API access and limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="rateLimit">Rate Limit (requests/hour)</Label>
                  <Input
                    id="rateLimit"
                    type="number"
                    value={config.api.rateLimit}
                    onChange={(e) => updateConfig('api', 'rateLimit', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxRequestSize">Max Request Size</Label>
                  <Input
                    id="maxRequestSize"
                    value={config.api.maxRequestSize}
                    onChange={(e) => updateConfig('api', 'maxRequestSize', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKeyExpiry">API Key Expiry (days)</Label>
                  <Input
                    id="apiKeyExpiry"
                    type="number"
                    value={config.api.apiKeyExpiry}
                    onChange={(e) => updateConfig('api', 'apiKeyExpiry', parseInt(e.target.value))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="allowedOrigins">Allowed Origins (CORS)</Label>
                <Textarea
                  id="allowedOrigins"
                  value={config.api.allowedOrigins}
                  onChange={(e) => updateConfig('api', 'allowedOrigins', e.target.value)}
                  placeholder="Enter allowed origins, separated by commas"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Enable CORS</h4>
                  <p className="text-sm text-muted-foreground">Allow cross-origin requests</p>
                </div>
                <Switch
                  checked={config.api.enableCors}
                  onCheckedChange={(checked) => updateConfig('api', 'enableCors', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <CardTitle>Security Settings</CardTitle>
              </div>
              <CardDescription>Configure security and authentication settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                  <Input
                    id="passwordMinLength"
                    type="number"
                    value={config.security.passwordMinLength}
                    onChange={(e) => updateConfig('security', 'passwordMinLength', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={config.security.sessionTimeout}
                    onChange={(e) => updateConfig('security', 'sessionTimeout', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={config.security.maxLoginAttempts}
                    onChange={(e) => updateConfig('security', 'maxLoginAttempts', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Require Two-Factor Auth</h4>
                    <p className="text-sm text-muted-foreground">Mandatory 2FA for all users</p>
                  </div>
                  <Switch
                    checked={config.security.requireTwoFactor}
                    onCheckedChange={(checked) => updateConfig('security', 'requireTwoFactor', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">IP Whitelist</h4>
                    <p className="text-sm text-muted-foreground">Enable IP-based access control</p>
                  </div>
                  <Switch
                    checked={config.security.enableIpWhitelist}
                    onCheckedChange={(checked) => updateConfig('security', 'enableIpWhitelist', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                <CardTitle>Billing Configuration</CardTitle>
              </div>
              <CardDescription>Configure billing and payment settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    value={config.billing.currency}
                    onValueChange={(value) => updateConfig('billing', 'currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    value={config.billing.taxRate}
                    onChange={(e) => updateConfig('billing', 'taxRate', parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gracePeriod">Grace Period (days)</Label>
                  <Input
                    id="gracePeriod"
                    type="number"
                    value={config.billing.gracePeriod}
                    onChange={(e) => updateConfig('billing', 'gracePeriod', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  value={config.billing.webhookUrl}
                  onChange={(e) => updateConfig('billing', 'webhookUrl', e.target.value)}
                  placeholder="https://your-app.com/webhooks/billing"
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Enable Dunning</h4>
                  <p className="text-sm text-muted-foreground">Automated payment retry and notifications</p>
                </div>
                <Switch
                  checked={config.billing.enableDunning}
                  onCheckedChange={(checked) => updateConfig('billing', 'enableDunning', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <CardTitle>Feature Settings</CardTitle>
              </div>
              <CardDescription>Enable or disable platform features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Analytics</h4>
                    <p className="text-sm text-muted-foreground">Financial analysis features</p>
                  </div>
                  <Switch
                    checked={config.features.enableAnalytics}
                    onCheckedChange={(checked) => updateConfig('features', 'enableAnalytics', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Export Features</h4>
                    <p className="text-sm text-muted-foreground">Data export capabilities</p>
                  </div>
                  <Switch
                    checked={config.features.enableExport}
                    onCheckedChange={(checked) => updateConfig('features', 'enableExport', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Team Features</h4>
                    <p className="text-sm text-muted-foreground">Collaboration and sharing</p>
                  </div>
                  <Switch
                    checked={config.features.enableTeamFeatures}
                    onCheckedChange={(checked) => updateConfig('features', 'enableTeamFeatures', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">API Access</h4>
                    <p className="text-sm text-muted-foreground">External API integrations</p>
                  </div>
                  <Switch
                    checked={config.features.enableApiAccess}
                    onCheckedChange={(checked) => updateConfig('features', 'enableApiAccess', checked)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Analysis Limits per Month</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="freeLimit">Free Plan</Label>
                    <Input
                      id="freeLimit"
                      type="number"
                      value={config.features.maxAnalysesPerMonth.free}
                      onChange={(e) => updateNestedConfig('features', 'maxAnalysesPerMonth', 'free', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proLimit">Professional Plan</Label>
                    <Input
                      id="proLimit"
                      type="number"
                      value={config.features.maxAnalysesPerMonth.professional}
                      onChange={(e) => updateNestedConfig('features', 'maxAnalysesPerMonth', 'professional', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="enterpriseLimit">Enterprise Plan</Label>
                    <Input
                      id="enterpriseLimit"
                      type="number"
                      value={config.features.maxAnalysesPerMonth.enterprise === -1 ? '' : config.features.maxAnalysesPerMonth.enterprise}
                      onChange={(e) => updateNestedConfig('features', 'maxAnalysesPerMonth', 'enterprise', e.target.value ? parseInt(e.target.value) : -1)}
                      placeholder="Unlimited (-1)"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
