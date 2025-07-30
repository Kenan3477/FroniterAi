'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Mouse,
  Eye,
  FileText,
  Settings,
  Users,
  BarChart3,
  Lightbulb,
  X
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog'
import { useToast } from '@/hooks/useToast'

interface FeatureTourStep {
  id: string
  title: string
  description: string
  target: string // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right'
  content: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

interface FeatureTourProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function FeatureTour({ isOpen, onClose, onComplete }: FeatureTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const { toast } = useToast()

  const steps: FeatureTourStep[] = [
    {
      id: 'navigation',
      title: 'Navigation Menu',
      description: 'Access all your tools and features',
      target: '[data-tour="navigation"]',
      position: 'right',
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Mouse className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold">Main Navigation</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Use the sidebar to navigate between different sections of your dashboard, 
            manage your account, and access powerful analysis tools.
          </p>
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Quick tip:</h4>
            <p className="text-xs text-blue-700">
              Press <kbd className="px-1 py-0.5 bg-white rounded text-xs">Ctrl + K</kbd> to open 
              the command palette for quick navigation
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'dashboard',
      title: 'Dashboard Overview',
      description: 'Your business metrics at a glance',
      target: '[data-tour="dashboard-stats"]',
      position: 'bottom',
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="font-semibold">Dashboard Metrics</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Monitor your key business metrics in real-time. These cards show your most 
            important KPIs and recent activity.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-gray-50 rounded">
              <div className="font-medium">Total Analyses</div>
              <div className="text-muted-foreground">All-time count</div>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <div className="font-medium">Health Score</div>
              <div className="text-muted-foreground">Current rating</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'quick-actions',
      title: 'Quick Actions',
      description: 'Start common tasks instantly',
      target: '[data-tour="quick-actions"]',
      position: 'left',
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Target className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="font-semibold">Quick Actions</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Launch your most common tasks with a single click. Perfect for recurring 
            analyses and frequently used features.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <FileText className="w-3 h-3" />
              <span>New Analysis</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Eye className="w-3 h-3" />
              <span>View Reports</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Settings className="w-3 h-3" />
              <span>Account Settings</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'analysis-creation',
      title: 'Create Analysis',
      description: 'Start your financial analysis',
      target: '[data-tour="new-analysis"]',
      position: 'top',
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-orange-600" />
            </div>
            <h3 className="font-semibold">Financial Analysis</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            This is where the magic happens! Click here to start a new financial analysis. 
            You can upload financial statements or input data manually.
          </p>
          <div className="bg-orange-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Analysis Types:</h4>
            <ul className="text-xs text-orange-700 space-y-1">
              <li>• Ratio Analysis</li>
              <li>• Cash Flow Analysis</li>
              <li>• Profitability Assessment</li>
              <li>• Industry Benchmarking</li>
            </ul>
          </div>
        </div>
      ),
      action: {
        label: 'Try Creating Analysis',
        onClick: () => {
          toast({
            title: 'Analysis Started',
            description: 'Redirecting to analysis creation...'
          })
          // Navigate to analysis creation
        }
      }
    },
    {
      id: 'account-settings',
      title: 'Account Management',
      description: 'Manage your profile and preferences',
      target: '[data-tour="account-menu"]',
      position: 'left',
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <Settings className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="font-semibold">Account Settings</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your profile, billing information, API keys, and security settings. 
            Access your subscription details and usage statistics here.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <div className="p-2 bg-indigo-50 rounded text-xs">
              <div className="font-medium">Profile & Security</div>
              <div className="text-indigo-600">Update personal information</div>
            </div>
            <div className="p-2 bg-indigo-50 rounded text-xs">
              <div className="font-medium">API Access</div>
              <div className="text-indigo-600">Manage integration keys</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'help-support',
      title: 'Help & Documentation',
      description: 'Get help when you need it',
      target: '[data-tour="help-menu"]',
      position: 'top',
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-teal-600" />
            </div>
            <h3 className="font-semibold">Help & Support</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Access comprehensive documentation, API references, video tutorials, 
            and contact support when you need assistance.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Eye className="w-3 h-3" />
              <span>Interactive API Docs</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <FileText className="w-3 h-3" />
              <span>Video Tutorials</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Users className="w-3 h-3" />
              <span>Community Support</span>
            </div>
          </div>
        </div>
      )
    }
  ]

  const currentStepData = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      onComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const skipTour = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
      
      {/* Highlight Effect */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div 
          className="absolute border-2 border-primary-400 rounded-lg shadow-lg"
          style={{
            // Dynamic positioning based on target element
            // This would need JavaScript to calculate actual element position
            top: '20%',
            left: '20%',
            width: '200px',
            height: '100px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(2px)'
          }}
        />
      </div>

      {/* Tour Dialog */}
      <div className="fixed z-50 pointer-events-auto">
        <Card className="w-80 shadow-xl" style={{
          // Dynamic positioning based on step position
          top: currentStep === 0 ? '30%' : currentStep === 1 ? '40%' : currentStep === 2 ? '35%' : '25%',
          left: currentStep === 0 ? '40%' : currentStep === 1 ? '30%' : currentStep === 2 ? '20%' : '35%'
        }}>
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {currentStep + 1} of {steps.length}
                </Badge>
                <span className="text-sm font-medium">{currentStepData.title}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={skipTour}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress */}
            <Progress value={progress} className="h-1 mb-4" />

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {currentStepData.content}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" size="sm" onClick={prevStep}>
                    <ArrowLeft className="w-3 h-3 mr-1" />
                    Back
                  </Button>
                )}
                {currentStep === 0 && (
                  <Button variant="ghost" size="sm" onClick={skipTour}>
                    Skip Tour
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentStepData.action && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={currentStepData.action.onClick}
                  >
                    {currentStepData.action.label}
                  </Button>
                )}
                <Button size="sm" onClick={nextStep}>
                  {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

// Hook for managing feature tour state
export function useFeatureTour() {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  const startTour = () => {
    setIsOpen(true)
  }

  const endTour = () => {
    setIsOpen(false)
    toast({
      title: 'Tour completed!',
      description: 'You\'re ready to explore Frontier on your own.'
    })
  }

  const closeTour = () => {
    setIsOpen(false)
  }

  return {
    isOpen,
    startTour,
    endTour,
    closeTour
  }
}
