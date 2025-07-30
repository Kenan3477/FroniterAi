'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Target,
  PieChart,
  LineChart,
  Activity,
  Download,
  Share,
  Filter,
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Building,
  Users,
  Globe
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { FinancialChart } from '@/components/analysis/FinancialChart'
import { RatioAnalysis } from '@/components/analysis/RatioAnalysis'
import { TrendAnalysis } from '@/components/analysis/TrendAnalysis'
import { BenchmarkComparison } from '@/components/analysis/BenchmarkComparison'
import { RecommendationsPanel } from '@/components/analysis/RecommendationsPanel'
import { ExportDialog } from '@/components/analysis/ExportDialog'
import { useAnalysisData } from '@/hooks/useAnalysisData'
import { useAuth } from '@/hooks/useAuth'

interface AnalysisResult {
  id: string
  companyName: string
  industry: string
  analysisDate: string
  score: number
  financialRatios: any
  trends: any
  benchmarks: any
  recommendations: string[]
  status: 'completed' | 'processing' | 'failed'
}

export default function AnalysisPage() {
  const { user } = useAuth()
  const { data: analysisData, isLoading, refetch } = useAnalysisData()
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [timeFilter, setTimeFilter] = useState('30d')

  useEffect(() => {
    if (analysisData && analysisData.length > 0 && !selectedAnalysis) {
      setSelectedAnalysis(analysisData[0])
    }
  }, [analysisData, selectedAnalysis])

  if (isLoading) {
    return <AnalysisSkeleton />
  }

  if (!analysisData || analysisData.length === 0) {
    return <EmptyAnalysisState />
  }

  const analysis = selectedAnalysis || analysisData[0]

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 8) return 'success'
    if (score >= 6) return 'warning'
    return 'destructive'
  }

  const keyMetrics = [
    {
      title: 'Overall Score',
      value: analysis.score,
      unit: '/10',
      change: '+0.5',
      trend: 'up',
      icon: Target,
      color: getScoreColor(analysis.score),
    },
    {
      title: 'Liquidity Ratio',
      value: analysis.financialRatios?.liquidity?.current_ratio || 0,
      unit: ':1',
      change: '+12%',
      trend: 'up',
      icon: Activity,
      color: 'text-blue-600',
    },
    {
      title: 'ROE',
      value: (analysis.financialRatios?.profitability?.roe * 100).toFixed(1) || 0,
      unit: '%',
      change: '+2.1%',
      trend: 'up',
      icon: Percent,
      color: 'text-green-600',
    },
    {
      title: 'Debt-to-Equity',
      value: analysis.financialRatios?.leverage?.debt_to_equity || 0,
      unit: ':1',
      change: '-5%',
      trend: 'down',
      icon: BarChart3,
      color: 'text-purple-600',
    },
  ]

  return (
    <div className="container-wide space-y-8 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analysis Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive financial analysis and business insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowExportDialog(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button>
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </motion.div>

      {/* Analysis Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  {analysis.companyName}
                </CardTitle>
                <CardDescription className="flex items-center gap-4 mt-1">
                  <span className="capitalize">{analysis.industry} Industry</span>
                  <span>•</span>
                  <span>Analyzed on {new Date(analysis.analysisDate).toLocaleDateString()}</span>
                  <Badge variant={getScoreBadge(analysis.score)}>
                    Score: {analysis.score}/10
                  </Badge>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedAnalysis?.id || ''}
                  onChange={(e) => {
                    const selected = analysisData.find(a => a.id === e.target.value)
                    if (selected) setSelectedAnalysis(selected)
                  }}
                  className="form-input"
                >
                  {analysisData.map(analysis => (
                    <option key={analysis.id} value={analysis.id}>
                      {analysis.companyName} - {new Date(analysis.analysisDate).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {keyMetrics.map((metric, index) => (
          <Card key={metric.title} className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <metric.icon className={`w-4 h-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metric.value}{metric.unit}
              </div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                {metric.trend === 'up' ? (
                  <ArrowUpRight className="w-3 h-3 mr-1 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 mr-1 text-red-600" />
                )}
                {metric.change} from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
            <TabsTrigger value="recommendations">Insights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Financial Health Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Financial Health Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${getScoreColor(analysis.score)}`}>
                        {analysis.score}/10
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {analysis.score >= 8 ? 'Excellent' : 
                         analysis.score >= 6 ? 'Good' : 'Needs Improvement'}
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Liquidity</span>
                          <span>85%</span>
                        </div>
                        <Progress value={85} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Profitability</span>
                          <span>78%</span>
                        </div>
                        <Progress value={78} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Leverage</span>
                          <span>92%</span>
                        </div>
                        <Progress value={92} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Efficiency</span>
                          <span>71%</span>
                        </div>
                        <Progress value={71} className="h-2" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Quick Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Strong Cash Position</p>
                        <p className="text-xs text-muted-foreground">
                          Current ratio of 2.5 indicates excellent liquidity
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Monitor Debt Levels</p>
                        <p className="text-xs text-muted-foreground">
                          Debt-to-equity ratio trending upward
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Growing Revenue</p>
                        <p className="text-xs text-muted-foreground">
                          15% YoY growth above industry average
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Industry Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Industry Position
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">Top 25%</div>
                      <p className="text-sm text-muted-foreground">
                        Industry Ranking
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">vs Industry Avg</span>
                        <Badge variant="success">+12%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">vs Top Quartile</span>
                        <Badge variant="outline">-3%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">vs Bottom Quartile</span>
                        <Badge variant="success">+45%</Badge>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        Based on {analysis.industry} industry data from 1,250+ companies
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Overview */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Performance Trend</CardTitle>
                  <CardDescription>
                    Revenue and profit trends over the last 12 months
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FinancialChart data={analysis.trends} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ratio Analysis</CardTitle>
                  <CardDescription>
                    Key financial ratios and their evolution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RatioAnalysis data={analysis.financialRatios} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Financial Analysis</CardTitle>
                  <CardDescription>
                    Comprehensive breakdown of financial performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FinancialChart data={analysis.trends} detailed />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <TrendAnalysis data={analysis.trends} />
          </TabsContent>

          {/* Benchmarks Tab */}
          <TabsContent value="benchmarks" className="space-y-6">
            <BenchmarkComparison 
              data={analysis.benchmarks} 
              industry={analysis.industry}
            />
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            <RecommendationsPanel 
              recommendations={analysis.recommendations}
              score={analysis.score}
              industry={analysis.industry}
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          analysis={analysis}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  )
}

function AnalysisSkeleton() {
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
      
      <div className="grid gap-6 lg:grid-cols-2">
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
            <div className="h-64 bg-muted rounded loading-skeleton" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EmptyAnalysisState() {
  return (
    <div className="container-wide py-16">
      <Card>
        <CardContent className="py-16 text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-4">No Analysis Data</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            You haven't performed any analyses yet. Start by analyzing your first company 
            to see comprehensive financial insights and recommendations.
          </p>
          <Button size="lg">
            <BarChart3 className="w-5 h-5 mr-2" />
            Start New Analysis
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
