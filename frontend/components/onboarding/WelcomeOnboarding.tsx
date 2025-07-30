'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Rocket, 
  Target, 
  BarChart3, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Play,
  BookOpen,
  Zap,
  Shield,
  Globe
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  content: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

interface WelcomeOnboardingProps {
  onComplete: () => void
  user: any
}

export function WelcomeOnboarding({ onComplete, user }: WelcomeOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const { updateUser } = useAuth()
  const { toast } = useToast()

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Frontier!',
      description: 'Your comprehensive business operations platform',
      icon: Rocket,
      content: (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
            <Rocket className="w-12 h-12 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4">Welcome, {user.name || user.username}! 🎉</h2>
            <p className="text-muted-foreground">
              We're excited to help you unlock powerful business insights. Let's get you set up 
              with everything you need to succeed.
            </p>
          </div>
          <div className="bg-primary-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-primary-700">
              You're on the <span className="capitalize">{user.subscription_tier}</span> plan
            </p>
            <p className="text-xs text-primary-600 mt-1">
              {user.subscription_tier === 'free' 
                ? 'Upgrade anytime to unlock advanced features' 
                : 'All premium features are available to you'}
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'features',
      title: 'Powerful Features',
      description: 'Discover what you can do with Frontier',
      icon: Zap,
      content: (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-center">What you can do with Frontier</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FeatureCard
              icon={BarChart3}
              title="Financial Analysis"
              description="Comprehensive ratio analysis, profitability metrics, and financial health scoring"
              available={true}
            />
            <FeatureCard
              icon={Target}
              title="Strategic Planning"
              description="SWOT analysis, market research, and strategic recommendations"
              available={user.subscription_tier !== 'free'}
            />
            <FeatureCard
              icon={Globe}
              title="Market Research"
              description="Industry benchmarks, competitive analysis, and market insights"
              available={true}
            />
            <FeatureCard
              icon={Users}
              title="Team Collaboration"
              description="Share analyses, collaborate on projects, and manage team access"
              available={user.subscription_tier === 'enterprise'}
            />
          </div>
        </div>
      )
    },
    {
      id: 'first-analysis',
      title: 'Your First Analysis',
      description: 'Let\'s run your first financial analysis',
      icon: BarChart3,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Ready for your first analysis?</h3>
            <p className="text-muted-foreground">
              We'll guide you through creating your first financial analysis. 
              You can use sample data to get started quickly.
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
            <h4 className="font-semibold mb-3">Quick Start Options:</h4>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  toast({
                    title: 'Sample analysis started',
                    description: 'Redirecting to analysis form with sample data...'
                  })
                  // Navigate to analysis form with sample data
                }}
              >
                <Play className="w-4 h-4 mr-2" />
                Try with sample data
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  toast({
                    title: 'Custom analysis',
                    description: 'Redirecting to analysis form...'
                  })
                  // Navigate to analysis form
                }}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Start with your own data
              </Button>
            </div>
          </div>
        </div>
      ),
      action: {
        label: 'Start Analysis',
        onClick: () => {
          // Navigate to analysis form
          toast({
            title: 'Analysis started',
            description: 'Redirecting to analysis form...'
          })
        }
      }
    },
    {
      id: 'resources',
      title: 'Helpful Resources',
      description: 'Everything you need to get the most out of Frontier',
      icon: BookOpen,
      content: (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-center">Resources to help you succeed</h3>
          <div className="grid gap-4">
            <ResourceCard
              icon={BookOpen}
              title="API Documentation"
              description="Complete API reference with examples and tutorials"
              action="View Docs"
              onClick={() => window.open('/docs', '_blank')}
            />
            <ResourceCard
              icon={Play}
              title="Video Tutorials"
              description="Step-by-step guides for common use cases"
              action="Watch Videos"
              onClick={() => {
                toast({
                  title: 'Coming soon!',
                  description: 'Video tutorials will be available soon.'
                })
              }}
            />
            <ResourceCard
              icon={Users}
              title="Community Support"
              description="Join our community for tips, tricks, and support"
              action="Join Community"
              onClick={() => {
                toast({
                  title: 'Community',
                  description: 'Community features coming soon!'
                })
              }}
            />
          </div>
        </div>
      )
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Welcome to your Frontier journey',
      icon: CheckCircle,
      content: (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4">Congratulations! 🎉</h2>
            <p className="text-muted-foreground">
              You're ready to start analyzing your business data and generating valuable insights. 
              Your dashboard is waiting for you!
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-green-700">Pro Tip</p>
            <p className="text-xs text-green-600 mt-1">
              Check out the "Quick Actions" section on your dashboard for common tasks
            </p>
          </div>
        </div>
      ),
      action: {
        label: 'Go to Dashboard',
        onClick: async () => {
          try {
            await updateUser({ onboardingCompleted: true })
            onComplete()
          } catch (error) {
            toast({
              title: 'Error',
              description: 'Failed to complete onboarding. Please try again.',
              variant: 'destructive'
            })
          }
        }
      }
    }
  ]

  const currentStepData = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const skipOnboarding = async () => {
    try {
      await updateUser({ onboardingCompleted: true })
      onComplete()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to skip onboarding. Please try again.',
        variant: 'destructive'
      })
    }
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogOverlay className="bg-black/50 backdrop-blur-sm" />
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <currentStepData.icon className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{currentStepData.title}</h1>
                <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
              </div>
            </div>
            <Badge variant="secondary">
              {currentStep + 1} of {steps.length}
            </Badge>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              {currentStepData.content}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              )}
              {currentStep === 0 && (
                <Button variant="ghost" onClick={skipOnboarding}>
                  Skip Tour
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep < steps.length - 1 ? (
                <Button onClick={nextStep}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                currentStepData.action && (
                  <Button onClick={currentStepData.action.onClick}>
                    {currentStepData.action.label}
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  available 
}: {
  icon: React.ComponentType<any>
  title: string
  description: string
  available: boolean
}) {
  return (
    <div className={`p-4 rounded-lg border ${available ? 'bg-white' : 'bg-gray-50'}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-md ${available ? 'bg-primary-100' : 'bg-gray-200'}`}>
          <Icon className={`w-5 h-5 ${available ? 'text-primary-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{title}</h4>
            {available ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <Shield className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          {!available && (
            <Badge variant="outline" className="mt-2">
              Upgrade required
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

function ResourceCard({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  onClick 
}: {
  icon: React.ComponentType<any>
  title: string
  description: string
  action: string
  onClick: () => void
}) {
  return (
    <div className="p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-blue-100">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onClick}>
          {action}
        </Button>
      </div>
    </div>
  )
}
