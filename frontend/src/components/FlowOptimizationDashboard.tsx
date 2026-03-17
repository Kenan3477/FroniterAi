/**
 * Omnivox AI Flow Optimization Dashboard
 * AI-powered flow analysis, bottleneck detection, and optimization recommendations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Target,
  Lightbulb,
  Play,
  RefreshCw,
  Settings,
  BarChart3,
  Activity,
} from 'lucide-react';

// Types
interface FlowBottleneck {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  bottleneckType: 'execution_time' | 'failure_rate' | 'resource_usage' | 'dependency_wait';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  impact: number;
  description: string;
  recommendations: string[];
  estimatedImprovement: {
    executionTime?: number;
    successRate?: number;
    costReduction?: number;
  };
}

interface FlowOptimization {
  optimizationId: string;
  flowId: string;
  type: 'performance' | 'reliability' | 'cost';
  category: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedImpact: {
    executionTime?: number;
    successRate?: number;
    costReduction?: number;
  };
  implementation: {
    complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
    estimatedEffort: number;
  };
  confidence: number;
}

interface FlowAnalysis {
  flowId: string;
  flowName: string;
  analysisTimestamp: string;
  overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  performanceScore: number;
  reliabilityScore: number;
  efficiencyScore: number;
  bottlenecks: FlowBottleneck[];
  optimizations: FlowOptimization[];
  predictions: Array<{
    predictionType: string;
    confidence: number;
    timeframe: string;
    description: string;
    preemptiveActions: string[];
  }>;
  trends: {
    executionTime: { trend: 'IMPROVING' | 'STABLE' | 'DEGRADING'; rate: number };
    successRate: { trend: 'IMPROVING' | 'STABLE' | 'DEGRADING'; rate: number };
    resourceUsage: { trend: 'IMPROVING' | 'STABLE' | 'DEGRADING'; rate: number };
  };
}

interface FlowInsights {
  insights: string[];
  quickWins: FlowOptimization[];
  complexOptimizations: FlowOptimization[];
  resourceOptimizations: string[];
}

const SEVERITY_COLORS = {
  LOW: '#22C55E',
  MEDIUM: '#F59E0B',
  HIGH: '#EF4444',
  CRITICAL: '#DC2626',
};

const HEALTH_COLORS = {
  EXCELLENT: '#22C55E',
  GOOD: '#84CC16',
  FAIR: '#F59E0B',
  POOR: '#EF4444',
  CRITICAL: '#DC2626',
};

const PRIORITY_COLORS = {
  LOW: '#6B7280',
  MEDIUM: '#F59E0B',
  HIGH: '#EF4444',
  CRITICAL: '#DC2626',
};

interface Props {
  flowId?: string;
}

export const FlowOptimizationDashboard: React.FC<Props> = ({ flowId }) => {
  const [analysis, setAnalysis] = useState<FlowAnalysis | null>(null);
  const [insights, setInsights] = useState<FlowInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch flow analysis
  const fetchAnalysis = useCallback(async () => {
    if (!flowId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/flows/${flowId}/analyze?timeRange=7d&includeRecommendations=true`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to analyze flow');
      }

      setAnalysis(result.data);
    } catch (error) {
      console.error('Error fetching analysis:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch analysis');
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  // Fetch flow insights
  const fetchInsights = useCallback(async () => {
    if (!flowId) return;

    try {
      const response = await fetch(`/api/flows/${flowId}/insights`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setInsights(result.data);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  }, [flowId]);

  // Apply optimizations
  const handleOptimize = async (optimizationType: string = 'all', autoApply: boolean = false) => {
    if (!flowId) return;

    setOptimizing(true);
    try {
      const response = await fetch(`/api/flows/${flowId}/optimize?optimizationType=${optimizationType}&autoApply=${autoApply}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Refresh analysis after optimization
        await fetchAnalysis();
        
        if (result.data.applied.length > 0) {
          alert(`Applied ${result.data.applied.length} optimizations successfully!`);
        }
      } else {
        throw new Error(result.error || 'Failed to optimize flow');
      }
    } catch (error) {
      console.error('Error optimizing flow:', error);
      setError(error instanceof Error ? error.message : 'Failed to optimize flow');
    } finally {
      setOptimizing(false);
    }
  };

  // Fetch data on component mount and flowId change
  useEffect(() => {
    if (flowId) {
      fetchAnalysis();
      fetchInsights();
    }
  }, [flowId, fetchAnalysis, fetchInsights]);

  if (!flowId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Select a flow to view AI optimization insights</p>
        </div>
      </div>
    );
  }

  if (loading && !analysis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Analyzing flow with AI...</span>
        </div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <Alert className="mx-4 my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            className="ml-4" 
            size="sm" 
            onClick={fetchAnalysis}
          >
            Retry Analysis
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!analysis) {
    return (
      <Alert className="mx-4 my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No analysis data available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Brain className="w-8 h-8 mr-3 text-blue-600" />
            AI Flow Optimization
          </h1>
          <p className="text-muted-foreground">
            Intelligent analysis and optimization for {analysis.flowName}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge 
            variant={analysis.overallHealth === 'EXCELLENT' || analysis.overallHealth === 'GOOD' ? 'default' : 'destructive'}
            style={{ backgroundColor: HEALTH_COLORS[analysis.overallHealth] }}
          >
            {analysis.overallHealth}
          </Badge>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAnalysis}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Analysis
          </Button>
          
          <Button 
            size="sm" 
            onClick={() => handleOptimize('all', false)}
            disabled={optimizing || analysis.optimizations.length === 0}
          >
            <Zap className="w-4 h-4 mr-2" />
            {optimizing ? 'Optimizing...' : 'Optimize Flow'}
          </Button>
        </div>
      </div>

      {/* Health Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold">{analysis.performanceScore}/100</div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={60}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{value: analysis.performanceScore}]}>
                    <RadialBar dataKey="value" cornerRadius={10} fill="#3B82F6" />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              {analysis.trends.executionTime.trend === 'IMPROVING' ? (
                <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
              ) : analysis.trends.executionTime.trend === 'DEGRADING' ? (
                <TrendingDown className="w-3 h-3 text-red-600 mr-1" />
              ) : null}
              Execution time {analysis.trends.executionTime.trend.toLowerCase()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reliability Score</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold">{analysis.reliabilityScore}/100</div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={60}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{value: analysis.reliabilityScore}]}>
                    <RadialBar dataKey="value" cornerRadius={10} fill="#10B981" />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              {analysis.trends.successRate.trend === 'IMPROVING' ? (
                <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
              ) : analysis.trends.successRate.trend === 'DEGRADING' ? (
                <TrendingDown className="w-3 h-3 text-red-600 mr-1" />
              ) : null}
              Success rate {analysis.trends.successRate.trend.toLowerCase()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold">{analysis.efficiencyScore}/100</div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={60}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{value: analysis.efficiencyScore}]}>
                    <RadialBar dataKey="value" cornerRadius={10} fill="#8B5CF6" />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <Target className="w-3 h-3 mr-1" />
              Resource utilization
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
          <TabsTrigger value="optimizations">Optimizations</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
                  Quick Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights ? (
                  <div className="space-y-3">
                    {insights.insights.map((insight, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{insight}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading insights...</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Wins */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 text-blue-500 mr-2" />
                  Quick Wins
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights?.quickWins.length ? (
                  <div className="space-y-3">
                    {insights.quickWins.slice(0, 3).map((optimization) => (
                      <div key={optimization.optimizationId} className="p-3 rounded-lg border">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm">{optimization.title}</h4>
                          <Badge 
                            variant="secondary" 
                            style={{ backgroundColor: PRIORITY_COLORS[optimization.priority] }}
                          >
                            {optimization.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {optimization.description}
                        </p>
                        <div className="flex justify-between text-xs">
                          <span>Effort: {optimization.implementation.estimatedEffort}h</span>
                          <span>Confidence: {optimization.confidence}%</span>
                        </div>
                      </div>
                    ))}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setActiveTab('optimizations')}
                    >
                      View All Optimizations
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No quick wins identified
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Optimization Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{analysis.bottlenecks.length}</div>
                  <div className="text-sm text-muted-foreground">Bottlenecks Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{analysis.optimizations.length}</div>
                  <div className="text-sm text-muted-foreground">Optimizations Available</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analysis.optimizations.reduce((sum, opt) => sum + (opt.estimatedImpact.executionTime || 0), 0).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Est. Time Reduction</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{analysis.predictions.length}</div>
                  <div className="text-sm text-muted-foreground">Predictions Made</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bottlenecks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Bottlenecks</CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.bottlenecks.length > 0 ? (
                <div className="space-y-4">
                  {analysis.bottlenecks.map((bottleneck) => (
                    <div key={bottleneck.nodeId} className="p-4 rounded-lg border">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{bottleneck.nodeLabel}</h4>
                          <p className="text-sm text-muted-foreground">{bottleneck.nodeType}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="secondary"
                            style={{ backgroundColor: SEVERITY_COLORS[bottleneck.severity] }}
                          >
                            {bottleneck.severity}
                          </Badge>
                          <span className="text-sm font-medium">{bottleneck.impact}% impact</span>
                        </div>
                      </div>
                      
                      <p className="text-sm mb-3">{bottleneck.description}</p>
                      
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Recommendations:</h5>
                        {bottleneck.recommendations.map((rec, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <CheckCircle className="w-3 h-3 text-green-600 mt-1 flex-shrink-0" />
                            <span className="text-xs">{rec}</span>
                          </div>
                        ))}
                      </div>
                      
                      {bottleneck.estimatedImprovement && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                          <strong>Estimated Improvement:</strong>
                          {bottleneck.estimatedImprovement.executionTime && 
                            ` ${bottleneck.estimatedImprovement.executionTime}% faster execution`}
                          {bottleneck.estimatedImprovement.successRate && 
                            ` ${bottleneck.estimatedImprovement.successRate}% higher success rate`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-600">No significant bottlenecks detected!</p>
                  <p className="text-sm text-muted-foreground">Your flow is performing well.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimizations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Available Optimizations</CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleOptimize('performance')}
                    disabled={optimizing}
                  >
                    Optimize Performance
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleOptimize('reliability')}
                    disabled={optimizing}
                  >
                    Improve Reliability
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {analysis.optimizations.length > 0 ? (
                <div className="space-y-4">
                  {analysis.optimizations.map((optimization) => (
                    <div key={optimization.optimizationId} className="p-4 rounded-lg border">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{optimization.title}</h4>
                          <p className="text-sm text-muted-foreground">{optimization.type} • {optimization.category}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="secondary"
                            style={{ backgroundColor: PRIORITY_COLORS[optimization.priority] }}
                          >
                            {optimization.priority}
                          </Badge>
                          <span className="text-sm">Confidence: {optimization.confidence}%</span>
                        </div>
                      </div>
                      
                      <p className="text-sm mb-3">{optimization.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                        <div>
                          <span className="font-medium">Complexity:</span> {optimization.implementation.complexity}
                        </div>
                        <div>
                          <span className="font-medium">Effort:</span> {optimization.implementation.estimatedEffort} hours
                        </div>
                      </div>
                      
                      {optimization.estimatedImpact && (
                        <div className="p-2 bg-blue-50 rounded text-xs">
                          <strong>Expected Impact:</strong>
                          {optimization.estimatedImpact.executionTime && 
                            ` ${optimization.estimatedImpact.executionTime}% faster`}
                          {optimization.estimatedImpact.successRate && 
                            ` ${optimization.estimatedImpact.successRate}% more reliable`}
                          {optimization.estimatedImpact.costReduction && 
                            ` ${optimization.estimatedImpact.costReduction}% cost reduction`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-600">No optimizations needed!</p>
                  <p className="text-sm text-muted-foreground">Your flow is already well-optimized.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.predictions.length > 0 ? (
                <div className="space-y-4">
                  {analysis.predictions.map((prediction, index) => (
                    <div key={index} className="p-4 rounded-lg border">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium">{prediction.predictionType.replace(/_/g, ' ').toUpperCase()}</h4>
                        <Badge variant="secondary">{prediction.confidence}% confidence</Badge>
                      </div>
                      
                      <p className="text-sm mb-2">{prediction.description}</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Expected timeframe: {prediction.timeframe}
                      </p>
                      
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Preemptive Actions:</h5>
                        {prediction.preemptiveActions.map((action, actionIndex) => (
                          <div key={actionIndex} className="flex items-start space-x-2">
                            <AlertTriangle className="w-3 h-3 text-yellow-600 mt-1 flex-shrink-0" />
                            <span className="text-xs">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No predictions available</p>
                  <p className="text-sm text-muted-foreground">Need more historical data for accurate predictions.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};