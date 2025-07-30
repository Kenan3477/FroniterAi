'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  CheckCircle, 
  Circle, 
  Play, 
  BookOpen, 
  Target, 
  BarChart3,
  Users,
  Settings,
  Trophy,
  Star
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

interface OnboardingTask {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  category: 'setup' | 'explore' | 'advanced'
  points: number
  estimatedTime: string
  completed: boolean
  action: {
    label: string
    onClick: () => void
  }
  dependencies?: string[]
}

interface OnboardingChecklistProps {
  user: any
  onTaskComplete: (taskId: string) => void
}

export function OnboardingChecklist({ user, onTaskComplete }: OnboardingChecklistProps) {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set())
  const [totalPoints, setTotalPoints] = useState(0)
  const { updateUser } = useAuth()
  const { toast } = useToast()

  const tasks: OnboardingTask[] = [
    {
      id: 'complete-profile',
      title: 'Complete Your Profile',
      description: 'Add your profile picture and company information',
      icon: Settings,
      category: 'setup',
      points: 10,
      estimatedTime: '2 min',
      completed: false,
      action: {
        label: 'Complete Profile',
        onClick: () => {
          // Navigate to profile page
          toast({
            title: 'Profile',
            description: 'Redirecting to profile settings...'
          })
          handleTaskComplete('complete-profile')
        }
      }
    },
    {
      id: 'first-analysis',
      title: 'Run Your First Analysis',
      description: 'Create and run your first financial analysis',
      icon: BarChart3,
      category: 'explore',
      points: 25,
      estimatedTime: '5 min',
      completed: false,
      action: {
        label: 'Start Analysis',
        onClick: () => {
          toast({
            title: 'Analysis',
            description: 'Redirecting to analysis creation...'
          })
          handleTaskComplete('first-analysis')
        }
      }
    },
    {
      id: 'explore-dashboard',
      title: 'Explore Your Dashboard',
      description: 'Take a tour of your dashboard features',
      icon: Target,
      category: 'explore',
      points: 15,
      estimatedTime: '3 min',
      completed: false,
      action: {
        label: 'Take Tour',
        onClick: () => {
          // Start feature tour
          toast({
            title: 'Dashboard Tour',
            description: 'Starting interactive tour...'
          })
          handleTaskComplete('explore-dashboard')
        }
      }
    },
    {
      id: 'read-documentation',
      title: 'Explore API Documentation',
      description: 'Learn about our API and integration options',
      icon: BookOpen,
      category: 'explore',
      points: 15,
      estimatedTime: '5 min',
      completed: false,
      action: {
        label: 'View Docs',
        onClick: () => {
          window.open('/docs', '_blank')
          handleTaskComplete('read-documentation')
        }
      }
    },
    {
      id: 'invite-team',
      title: 'Invite Team Members',
      description: 'Add colleagues to collaborate on analyses',
      icon: Users,
      category: 'advanced',
      points: 20,
      estimatedTime: '3 min',
      completed: false,
      action: {
        label: 'Invite Team',
        onClick: () => {
          if (user.subscription_tier === 'free') {
            toast({
              title: 'Upgrade Required',
              description: 'Team features are available on paid plans.',
              variant: 'destructive'
            })
            return
          }
          toast({
            title: 'Team Invitation',
            description: 'Opening team management...'
          })
          handleTaskComplete('invite-team')
        }
      },
      dependencies: ['complete-profile']
    },
    {
      id: 'setup-integrations',
      title: 'Set Up Integrations',
      description: 'Connect your accounting software or generate API keys',
      icon: Settings,
      category: 'advanced',
      points: 30,
      estimatedTime: '10 min',
      completed: false,
      action: {
        label: 'Setup Integration',
        onClick: () => {
          toast({
            title: 'Integrations',
            description: 'Opening integration settings...'
          })
          handleTaskComplete('setup-integrations')
        }
      },
      dependencies: ['first-analysis']
    }
  ]

  const handleTaskComplete = async (taskId: string) => {
    if (completedTasks.has(taskId)) return

    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const newCompleted = new Set([...completedTasks, taskId])
    setCompletedTasks(newCompleted)
    setTotalPoints(prev => prev + task.points)
    
    onTaskComplete(taskId)

    toast({
      title: 'Task Completed! 🎉',
      description: `You earned ${task.points} points!`
    })

    // Update user progress
    try {
      await updateUser({
        onboardingTasks: Array.from(newCompleted),
        onboardingPoints: totalPoints + task.points
      })
    } catch (error) {
      console.error('Failed to update user progress:', error)
    }
  }

  // Initialize completed tasks from user data
  useEffect(() => {
    if (user.onboardingTasks) {
      setCompletedTasks(new Set(user.onboardingTasks))
    }
    if (user.onboardingPoints) {
      setTotalPoints(user.onboardingPoints)
    }
  }, [user])

  const tasksByCategory = {
    setup: tasks.filter(t => t.category === 'setup'),
    explore: tasks.filter(t => t.category === 'explore'),
    advanced: tasks.filter(t => t.category === 'advanced')
  }

  const completionPercentage = (completedTasks.size / tasks.length) * 100
  const maxPoints = tasks.reduce((sum, task) => sum + task.points, 0)

  const isTaskAvailable = (task: OnboardingTask) => {
    if (!task.dependencies) return true
    return task.dependencies.every(depId => completedTasks.has(depId))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Getting Started Checklist
              </CardTitle>
              <CardDescription>
                Complete these tasks to get the most out of Frontier
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary-600">{totalPoints}</div>
              <div className="text-sm text-muted-foreground">of {maxPoints} points</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{completedTasks.size} of {tasks.length} completed</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Task Categories */}
      <div className="space-y-6">
        {/* Setup Tasks */}
        <TaskCategory
          title="Setup & Configuration"
          description="Essential setup tasks to get started"
          tasks={tasksByCategory.setup}
          completedTasks={completedTasks}
          onTaskComplete={handleTaskComplete}
          isTaskAvailable={isTaskAvailable}
        />

        {/* Exploration Tasks */}
        <TaskCategory
          title="Explore Features"
          description="Discover what Frontier can do for you"
          tasks={tasksByCategory.explore}
          completedTasks={completedTasks}
          onTaskComplete={handleTaskComplete}
          isTaskAvailable={isTaskAvailable}
        />

        {/* Advanced Tasks */}
        <TaskCategory
          title="Advanced Features"
          description="Unlock the full potential of Frontier"
          tasks={tasksByCategory.advanced}
          completedTasks={completedTasks}
          onTaskComplete={handleTaskComplete}
          isTaskAvailable={isTaskAvailable}
        />
      </div>

      {/* Completion Reward */}
      {completionPercentage === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardContent className="p-6 text-center">
              <Star className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Congratulations! 🎉</h3>
              <p className="text-muted-foreground mb-4">
                You've completed all onboarding tasks and earned {totalPoints} points!
              </p>
              <Badge variant="secondary" className="text-yellow-700 bg-yellow-100">
                Onboarding Master
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

function TaskCategory({ 
  title, 
  description, 
  tasks, 
  completedTasks, 
  onTaskComplete,
  isTaskAvailable 
}: {
  title: string
  description: string
  tasks: OnboardingTask[]
  completedTasks: Set<string>
  onTaskComplete: (taskId: string) => void
  isTaskAvailable: (task: OnboardingTask) => boolean
}) {
  const completedCount = tasks.filter(task => completedTasks.has(task.id)).length
  const categoryProgress = (completedCount / tasks.length) * 100

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant={completedCount === tasks.length ? 'default' : 'secondary'}>
            {completedCount}/{tasks.length}
          </Badge>
        </div>
        <Progress value={categoryProgress} className="h-1" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              completed={completedTasks.has(task.id)}
              available={isTaskAvailable(task)}
              onComplete={() => onTaskComplete(task.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TaskCard({ 
  task, 
  completed, 
  available, 
  onComplete 
}: {
  task: OnboardingTask
  completed: boolean
  available: boolean
  onComplete: () => void
}) {
  const Icon = task.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`p-4 rounded-lg border ${
        completed 
          ? 'bg-green-50 border-green-200' 
          : available 
            ? 'bg-white border-gray-200 hover:border-primary-200 hover:bg-primary-50/50' 
            : 'bg-gray-50 border-gray-100'
      } transition-colors`}
    >
      <div className="flex items-start gap-4">
        <div className="mt-1">
          {completed ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Icon className={`w-5 h-5 ${
                  completed ? 'text-green-600' : available ? 'text-primary-600' : 'text-gray-400'
                }`} />
                <h4 className={`font-medium ${
                  completed ? 'text-green-900' : available ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {task.title}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {task.points} pts
                </Badge>
              </div>
              <p className={`text-sm mb-3 ${
                completed ? 'text-green-700' : available ? 'text-muted-foreground' : 'text-gray-400'
              }`}>
                {task.description}
              </p>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">
                  ⏱️ {task.estimatedTime}
                </span>
                {task.dependencies && (
                  <span className="text-xs text-muted-foreground">
                    Requires: {task.dependencies.join(', ')}
                  </span>
                )}
              </div>
            </div>
            
            <div className="ml-4">
              {completed ? (
                <Badge className="bg-green-100 text-green-700">
                  Completed
                </Badge>
              ) : available ? (
                <Button 
                  size="sm" 
                  onClick={task.action.onClick}
                  className="shrink-0"
                >
                  <Play className="w-3 h-3 mr-1" />
                  {task.action.label}
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline" 
                  disabled
                  className="shrink-0"
                >
                  Locked
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
