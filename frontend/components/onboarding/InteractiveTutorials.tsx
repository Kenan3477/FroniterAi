'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2,
  ArrowRight,
  ArrowLeft,
  X
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog'

interface InteractiveTutorial {
  id: string
  title: string
  description: string
  duration: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: string
  steps: TutorialStep[]
  videoUrl?: string
}

interface TutorialStep {
  id: string
  title: string
  content: React.ReactNode
  action?: {
    type: 'click' | 'input' | 'navigation'
    target?: string
    instruction: string
  }
  validation?: () => boolean
}

interface InteractiveTutorialsProps {
  tutorial: InteractiveTutorial
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function InteractiveTutorials({ tutorial, isOpen, onClose, onComplete }: InteractiveTutorialsProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const currentStepData = tutorial.steps[currentStep]
  const stepProgress = ((currentStep + 1) / tutorial.steps.length) * 100

  const nextStep = () => {
    if (currentStep < tutorial.steps.length - 1) {
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

  const resetTutorial = () => {
    setCurrentStep(0)
    setProgress(0)
    setIsPlaying(false)
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-black/80 backdrop-blur-sm" />
      <DialogContent className={`${isFullscreen ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-4xl max-h-[90vh]'} overflow-hidden`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-lg font-semibold">{tutorial.title}</h2>
                <p className="text-sm text-muted-foreground">{tutorial.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{tutorial.difficulty}</Badge>
                <Badge variant="secondary">{tutorial.duration}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Video Player (if video tutorial) */}
          {tutorial.videoUrl && (
            <div className="relative bg-black aspect-video">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                  <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-sm opacity-75">Video Player Placeholder</p>
                  <p className="text-xs opacity-50">Video: {tutorial.videoUrl}</p>
                </div>
              </div>
              
              {/* Video Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  
                  <div className="flex-1">
                    <Slider 
                      value={[progress]} 
                      onValueChange={(value) => setProgress(value[0])}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={resetTutorial}
                      className="text-white hover:bg-white/20"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Step Progress */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">
                    Step {currentStep + 1} of {tutorial.steps.length}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(stepProgress)}% Complete
                  </span>
                </div>
                <Progress value={stepProgress} className="h-2" />
              </div>

              {/* Step Title */}
              <h3 className="text-xl font-semibold mb-4">{currentStepData.title}</h3>

              {/* Step Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="mb-6"
                >
                  {currentStepData.content}
                </motion.div>
              </AnimatePresence>

              {/* Interactive Action */}
              {currentStepData.action && (
                <Card className="border-2 border-primary-200 bg-primary-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-1">
                        <ArrowRight className="w-4 h-4 text-primary-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-primary-900 mb-1">Try it yourself</h4>
                        <p className="text-sm text-primary-700">{currentStepData.action.instruction}</p>
                        {currentStepData.action.target && (
                          <Badge variant="outline" className="mt-2">
                            Target: {currentStepData.action.target}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" onClick={prevStep}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                )}
                <Button variant="ghost" onClick={resetTutorial}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restart
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Exit Tutorial
                </Button>
                <Button onClick={nextStep}>
                  {currentStep === tutorial.steps.length - 1 ? 'Complete' : 'Next Step'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Pre-defined tutorials
export const availableTutorials: InteractiveTutorial[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with Frontier',
    description: 'Learn the basics of navigating and using Frontier',
    duration: '10 min',
    difficulty: 'beginner',
    category: 'basics',
    videoUrl: '/tutorials/getting-started.mp4',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Frontier',
        content: (
          <div className="space-y-4">
            <p>Welcome to your comprehensive business operations platform! In this tutorial, you'll learn:</p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full" />
                How to navigate the dashboard
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full" />
                Creating your first financial analysis
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full" />
                Understanding your results
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full" />
                Accessing help and support
              </li>
            </ul>
          </div>
        )
      },
      {
        id: 'navigation',
        title: 'Dashboard Navigation',
        content: (
          <div className="space-y-4">
            <p>Your dashboard is your command center. Let's explore the main areas:</p>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">📊 Analytics</h4>
                  <p className="text-sm text-muted-foreground">View your business metrics and KPIs</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">🔍 Analysis</h4>
                  <p className="text-sm text-muted-foreground">Create and manage financial analyses</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ),
        action: {
          type: 'click',
          target: '[data-tour="navigation"]',
          instruction: 'Click on the navigation menu to explore different sections'
        }
      },
      {
        id: 'first-analysis',
        title: 'Creating Your First Analysis',
        content: (
          <div className="space-y-4">
            <p>Financial analysis is at the heart of Frontier. Here's how to get started:</p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Analysis Types Available:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Financial Health Assessment</li>
                <li>• Ratio Analysis</li>
                <li>• Cash Flow Analysis</li>
                <li>• Industry Benchmarking</li>
              </ul>
            </div>
          </div>
        ),
        action: {
          type: 'click',
          target: '[data-tour="new-analysis"]',
          instruction: 'Click the "New Analysis" button to start your first analysis'
        }
      },
      {
        id: 'completion',
        title: 'You\'re Ready!',
        content: (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Play className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="font-semibold">Congratulations!</h4>
            <p>You've completed the getting started tutorial. You're now ready to explore Frontier on your own.</p>
          </div>
        )
      }
    ]
  },
  {
    id: 'financial-analysis',
    title: 'Creating Financial Analysis',
    description: 'Step-by-step guide to creating comprehensive financial analyses',
    duration: '15 min',
    difficulty: 'intermediate',
    category: 'analysis',
    steps: [
      {
        id: 'data-input',
        title: 'Inputting Financial Data',
        content: (
          <div className="space-y-4">
            <p>Learn how to input your financial data for analysis:</p>
            <div className="grid gap-4">
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">📄 Upload Statements</h4>
                  <p className="text-sm text-muted-foreground">Upload PDF or Excel financial statements</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">⌨️ Manual Entry</h4>
                  <p className="text-sm text-muted-foreground">Enter data manually using our forms</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      }
    ]
  }
]

// Tutorial Selection Component
export function TutorialSelector({ onSelectTutorial }: { onSelectTutorial: (tutorial: InteractiveTutorial) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {availableTutorials.map((tutorial) => (
        <Card key={tutorial.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelectTutorial(tutorial)}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold">{tutorial.title}</h3>
                <p className="text-sm text-muted-foreground">{tutorial.category}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{tutorial.description}</p>
            <div className="flex items-center justify-between">
              <Badge variant="outline">{tutorial.difficulty}</Badge>
              <span className="text-sm text-muted-foreground">{tutorial.duration}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
