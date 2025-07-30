'use client'

import { useState, useEffect } from 'react'
import { WelcomeOnboarding } from './WelcomeOnboarding'
import { FeatureTour, useFeatureTour } from './FeatureTour'
import { OnboardingChecklist } from './OnboardingChecklist'
import { InteractiveTutorials, TutorialSelector, availableTutorials, type InteractiveTutorial } from './InteractiveTutorials'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

type OnboardingStep = 'welcome' | 'tour' | 'checklist' | 'tutorials' | 'complete'

interface OnboardingManagerProps {
  forceShow?: boolean
  onComplete?: () => void
}

export function OnboardingManager({ forceShow = false, onComplete }: OnboardingManagerProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [selectedTutorial, setSelectedTutorial] = useState<InteractiveTutorial | null>(null)
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const featureTour = useFeatureTour()

  // Determine if onboarding should be shown
  useEffect(() => {
    if (forceShow) {
      setShowOnboarding(true)
      return
    }

    // Show onboarding for new users who haven't completed it
    if (user && !user.onboardingCompleted) {
      setShowOnboarding(true)
    }
  }, [user, forceShow])

  // Handle welcome onboarding completion
  const handleWelcomeComplete = async () => {
    try {
      await updateUser({ onboardingWelcomeCompleted: true })
      setCurrentStep('tour')
      featureTour.startTour()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save progress. Please try again.',
        variant: 'destructive'
      })
    }
  }

  // Handle feature tour completion
  const handleTourComplete = () => {
    featureTour.endTour()
    setCurrentStep('checklist')
  }

  // Handle checklist task completion
  const handleTaskComplete = async (taskId: string) => {
    // Task completion is handled within the checklist component
    // We can add additional logic here if needed
    toast({
      title: 'Task completed!',
      description: 'Great job! Keep going to unlock more features.'
    })
  }

  // Handle tutorial selection and completion
  const handleTutorialSelect = (tutorial: InteractiveTutorial) => {
    setSelectedTutorial(tutorial)
  }

  const handleTutorialComplete = () => {
    setSelectedTutorial(null)
    toast({
      title: 'Tutorial completed!',
      description: 'You\'ve mastered another aspect of Frontier.'
    })
  }

  // Handle complete onboarding
  const handleCompleteOnboarding = async () => {
    try {
      await updateUser({ onboardingCompleted: true })
      setShowOnboarding(false)
      setCurrentStep('complete')
      
      toast({
        title: 'Welcome aboard! 🎉',
        description: 'You\'re all set up and ready to use Frontier.'
      })

      onComplete?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete onboarding. Please try again.',
        variant: 'destructive'
      })
    }
  }

  // Skip onboarding entirely
  const handleSkipOnboarding = async () => {
    try {
      await updateUser({ onboardingCompleted: true })
      setShowOnboarding(false)
      featureTour.closeTour()
      
      toast({
        title: 'Onboarding skipped',
        description: 'You can always access tutorials from the help menu.'
      })

      onComplete?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to skip onboarding. Please try again.',
        variant: 'destructive'
      })
    }
  }

  if (!showOnboarding || !user) {
    return null
  }

  return (
    <>
      {/* Welcome Onboarding Modal */}
      {currentStep === 'welcome' && (
        <WelcomeOnboarding
          user={user}
          onComplete={handleWelcomeComplete}
        />
      )}

      {/* Feature Tour Overlay */}
      {currentStep === 'tour' && (
        <FeatureTour
          isOpen={featureTour.isOpen}
          onClose={handleSkipOnboarding}
          onComplete={handleTourComplete}
        />
      )}

      {/* Interactive Tutorial Modal */}
      {selectedTutorial && (
        <InteractiveTutorials
          tutorial={selectedTutorial}
          isOpen={true}
          onClose={() => setSelectedTutorial(null)}
          onComplete={handleTutorialComplete}
        />
      )}

      {/* Checklist and Tutorials View */}
      {currentStep === 'checklist' && (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Complete Your Setup
              </h1>
              <p className="text-lg text-muted-foreground">
                Follow these steps to get the most out of Frontier
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Checklist */}
              <div className="lg:col-span-2">
                <OnboardingChecklist
                  user={user}
                  onTaskComplete={handleTaskComplete}
                />
              </div>

              {/* Tutorials Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 space-y-6">
                  <div className="bg-white rounded-lg border p-6">
                    <h3 className="text-lg font-semibold mb-4">Interactive Tutorials</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Learn by doing with our step-by-step tutorials
                    </p>
                    <TutorialSelector onSelectTutorial={handleTutorialSelect} />
                  </div>

                  <div className="bg-white rounded-lg border p-6">
                    <h4 className="font-medium mb-3">Need Help?</h4>
                    <div className="space-y-3">
                      <button
                        onClick={() => featureTour.startTour()}
                        className="w-full text-left p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        <div className="font-medium text-blue-900">Retake Feature Tour</div>
                        <div className="text-sm text-blue-700">Review dashboard features</div>
                      </button>
                      <button
                        onClick={() => window.open('/docs', '_blank')}
                        className="w-full text-left p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
                      >
                        <div className="font-medium text-green-900">API Documentation</div>
                        <div className="text-sm text-green-700">Comprehensive guides and examples</div>
                      </button>
                      <button
                        onClick={handleCompleteOnboarding}
                        className="w-full text-left p-3 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors"
                      >
                        <div className="font-medium text-primary-900">Finish Setup</div>
                        <div className="text-sm text-primary-700">Complete onboarding and start using Frontier</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Hook for programmatically controlling onboarding
export function useOnboarding() {
  const [isActive, setIsActive] = useState(false)
  const { user } = useAuth()

  const startOnboarding = () => {
    setIsActive(true)
  }

  const endOnboarding = () => {
    setIsActive(false)
  }

  const isOnboardingNeeded = user && !user.onboardingCompleted

  return {
    isActive,
    isOnboardingNeeded,
    startOnboarding,
    endOnboarding
  }
}
