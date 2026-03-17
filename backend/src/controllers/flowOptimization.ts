/**
 * Omnivox AI Flow Optimization Controllers
 * API endpoints for AI-powered flow analysis, optimization, and A/B testing
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { flowOptimizationService } from '../services/flowOptimizationService';

const prisma = new PrismaClient();

// Input validation schemas
const AnalyzeFlowParamsSchema = z.object({
  flowId: z.string().min(1)
});

const AnalyzeFlowQuerySchema = z.object({
  timeRange: z.enum(['1d', '7d', '30d']).optional(),
  includeRecommendations: z.string().transform(val => val === 'true').optional()
});

const OptimizeFlowQuerySchema = z.object({
  optimizationType: z.enum(['performance', 'reliability', 'cost', 'all']).optional(),
  autoApply: z.string().transform(val => val === 'true').optional()
});

const ABTestBodySchema = z.object({
  testName: z.string().min(1),
  variations: z.array(z.object({
    name: z.string(),
    changes: z.record(z.any())
  })).min(2),
  trafficSplit: z.array(z.number()).min(2),
  successMetric: z.enum(['execution_time', 'success_rate', 'cost_efficiency']),
  duration: z.number().min(1).max(30)
});

/**
 * Analyze flow for performance bottlenecks and optimization opportunities
 */
export const analyzeFlow = async (req: Request, res: Response) => {
  try {
    const params = AnalyzeFlowParamsSchema.parse(req.params);
    const query = AnalyzeFlowQuerySchema.parse(req.query);

    const result = await flowOptimizationService.analyzeFlow({
      flowId: params.flowId,
      timeRange: query.timeRange || '7d',
      includeRecommendations: query.includeRecommendations || true
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error analyzing flow:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to analyze flow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Generate and optionally apply flow optimizations
 */
export const optimizeFlow = async (req: Request, res: Response) => {
  try {
    const params = AnalyzeFlowParamsSchema.parse(req.params);
    const query = OptimizeFlowQuerySchema.parse(req.query);

    const result = await flowOptimizationService.optimizeFlow({
      flowId: params.flowId,
      optimizationType: query.optimizationType || 'all',
      autoApply: query.autoApply || false
    });

    res.json({
      success: true,
      data: {
        ...result,
        summary: {
          totalOptimizations: result.optimizations.length,
          appliedOptimizations: result.applied.length,
          pendingOptimizations: result.optimizations.length - result.applied.length,
          estimatedImpact: {
            executionTimeReduction: result.optimizations.reduce((sum, opt) => 
              sum + (opt.estimatedImpact.executionTime || 0), 0
            ),
            reliabilityImprovement: result.optimizations.reduce((sum, opt) => 
              sum + (opt.estimatedImpact.successRate || 0), 0
            ),
            costReduction: result.optimizations.reduce((sum, opt) => 
              sum + (opt.estimatedImpact.costReduction || 0), 0
            )
          }
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error optimizing flow:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to optimize flow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get flow performance insights and quick recommendations
 */
export const getFlowInsights = async (req: Request, res: Response) => {
  try {
    const params = AnalyzeFlowParamsSchema.parse(req.params);

    const result = await flowOptimizationService.getFlowInsights(params.flowId);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting flow insights:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get flow insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Set up A/B testing for flow variations
 */
export const setupABTest = async (req: Request, res: Response) => {
  try {
    const params = AnalyzeFlowParamsSchema.parse(req.params);
    const body = ABTestBodySchema.parse(req.body);

    const result = await flowOptimizationService.setupABTest({
      flowId: params.flowId,
      ...body
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'A/B test setup initiated',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error setting up A/B test:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to setup A/B test',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get optimization recommendations dashboard
 */
export const getOptimizationDashboard = async (req: Request, res: Response) => {
  try {
    // Get all active flows and their optimization potential
    const flows = await prisma.flow.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true }
    });

    const dashboardData = {
      summary: {
        totalFlows: flows.length,
        flowsAnalyzed: 0,
        optimizationsAvailable: 0,
        potentialImprovement: 0
      },
      topOptimizationOpportunities: [],
      recentOptimizations: [],
      systemRecommendations: [
        'Consider implementing flow caching for frequently accessed data',
        'Review timeout settings across all flows for optimal performance',
        'Enable parallel execution for independent flow branches',
        'Implement circuit breaker patterns for external service calls'
      ]
    };

    // For now, return mock data as this would require analyzing all flows
    // In production, this would involve:
    // 1. Background analysis of all flows
    // 2. Caching of optimization recommendations
    // 3. Real-time calculation of system-wide metrics

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting optimization dashboard:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get optimization dashboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get flow performance predictions
 */
export const getFlowPredictions = async (req: Request, res: Response) => {
  try {
    const params = AnalyzeFlowParamsSchema.parse(req.params);

    // For now, return mock predictions
    // In production, this would use machine learning models
    const predictions = [
      {
        type: 'performance_trend',
        prediction: 'Execution time likely to increase by 15% over next week',
        confidence: 78,
        factors: ['Increasing data volume', 'Database query performance degradation'],
        recommendations: ['Optimize database queries', 'Implement query result caching']
      },
      {
        type: 'failure_prediction',
        prediction: 'Failure rate may increase during peak hours',
        confidence: 65,
        factors: ['Historical pattern analysis', 'Resource contention'],
        recommendations: ['Scale infrastructure during peak hours', 'Implement rate limiting']
      }
    ];

    res.json({
      success: true,
      data: {
        flowId: params.flowId,
        predictions,
        lastAnalyzed: new Date().toISOString(),
        nextAnalysis: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting flow predictions:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get flow predictions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get A/B test results
 */
export const getABTestResults = async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;

    if (!testId) {
      return res.status(400).json({
        success: false,
        error: 'Test ID is required'
      });
    }

    // For now, return mock A/B test results
    // In production, this would fetch from test execution data
    const results = {
      testId,
      status: 'COMPLETED',
      duration: 14, // days
      totalSamples: 1250,
      variations: [
        {
          name: 'Control',
          samples: 625,
          metrics: {
            executionTime: 45.2,
            successRate: 92.3,
            costPerExecution: 0.12
          }
        },
        {
          name: 'Optimized',
          samples: 625,
          metrics: {
            executionTime: 38.7,
            successRate: 94.8,
            costPerExecution: 0.11
          }
        }
      ],
      winner: {
        variation: 'Optimized',
        improvement: {
          executionTime: 14.4, // percentage
          successRate: 2.7,
          costPerExecution: 8.3
        },
        confidence: 95.2,
        significance: 0.048
      },
      recommendation: 'Deploy optimized version to all traffic'
    };

    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting A/B test results:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get A/B test results',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get flow optimization history
 */
export const getOptimizationHistory = async (req: Request, res: Response) => {
  try {
    const params = AnalyzeFlowParamsSchema.parse(req.params);

    // For now, return mock optimization history
    // In production, this would fetch from optimization tracking
    const history = [
      {
        optimizationId: 'opt_001',
        type: 'performance',
        appliedDate: '2024-01-15T10:30:00Z',
        description: 'Implemented parallel processing for data retrieval nodes',
        impact: {
          executionTime: -22, // percentage change
          successRate: +1.5,
          costReduction: 8
        },
        status: 'SUCCESS'
      },
      {
        optimizationId: 'opt_002',
        type: 'reliability',
        appliedDate: '2024-01-12T14:15:00Z',
        description: 'Added retry logic and circuit breaker for external API calls',
        impact: {
          executionTime: +2, // slight increase due to retry logic
          successRate: +5.3,
          costReduction: 0
        },
        status: 'SUCCESS'
      }
    ];

    res.json({
      success: true,
      data: {
        flowId: params.flowId,
        optimizationHistory: history,
        totalOptimizations: history.length,
        cumulativeImpact: {
          executionTimeReduction: 20.8,
          successRateImprovement: 6.8,
          costReduction: 8
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting optimization history:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get optimization history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};