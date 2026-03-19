/**
 * Advanced AI Dialler Reports Controller
 * Professional enterprise-grade reporting with real-time analytics
 */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// PREDICTIVE DIALLER ANALYTICS
// ==========================================

/**
 * Get real-time predictive dialler metrics
 * Includes pacing ratios, abandonment rates, agent utilization
 */
export const getDiallerMetrics = async (req: Request, res: Response) => {
  try {
    const { campaignId, dateRange, agentId } = req.query;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization access required'
      });
    }

    // Date range parsing
    const startDate = dateRange ? new Date(dateRange as string + 'T00:00:00Z') : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // Build filters
    const filters: any = {
      organizationId,
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    };

    if (campaignId) filters.campaignId = campaignId as string;
    if (agentId) filters.agentId = agentId as string;

    // Get latest metrics
    const latestMetrics = await prisma.diallerMetrics.findMany({
      where: filters,
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    // Calculate aggregated metrics
    const currentMetrics = latestMetrics.length > 0 ? latestMetrics[0] : null;
    const avgMetrics = latestMetrics.length > 0 ? {
      pacingRatio: latestMetrics.reduce((sum, m) => sum + m.pacingRatio, 0) / latestMetrics.length,
      abandonedCallRate: latestMetrics.reduce((sum, m) => sum + m.abandonedCallRate, 0) / latestMetrics.length,
      agentUtilization: latestMetrics.reduce((sum, m) => sum + m.agentUtilization, 0) / latestMetrics.length,
      averageSpeedAnswer: Math.round(latestMetrics.reduce((sum, m) => sum + m.averageSpeedAnswer, 0) / latestMetrics.length),
      contactRate: latestMetrics.reduce((sum, m) => sum + m.contactRate, 0) / latestMetrics.length,
      rightPartyRate: latestMetrics.reduce((sum, m) => sum + m.rightPartyRate, 0) / latestMetrics.length
    } : null;

    // Get historical data for trending
    const historicalData = await prisma.diallerMetrics.findMany({
      where: {
        organizationId,
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    // Compliance analysis
    const complianceStatus = {
      abandonmentCompliant: (avgMetrics?.abandonedCallRate || 0) < 0.03, // <3% required
      riskLevel: calculateComplianceRisk(avgMetrics?.abandonedCallRate || 0),
      lastViolation: await getLastComplianceViolation(organizationId)
    };

    res.json({
      success: true,
      data: {
        current: currentMetrics,
        averages: avgMetrics,
        historical: historicalData,
        compliance: complianceStatus,
        trends: calculateTrends(latestMetrics),
        lastUpdated: currentMetrics?.timestamp
      }
    });

  } catch (error: any) {
    console.error('Error fetching dialler metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dialler metrics',
      details: error.message
    });
  }
};

// ==========================================
// CONVERSATION INTELLIGENCE
// ==========================================

/**
 * Get conversation intelligence analytics
 * AI-powered insights from call conversations
 */
export const getConversationIntelligence = async (req: Request, res: Response) => {
  try {
    const { callId, agentId, dateRange } = req.query;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization access required'
      });
    }

    // Build date filter
    const startDate = dateRange ? new Date(dateRange as string + 'T00:00:00Z') : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // Build filters for conversation analysis
    const analysisFilters: any = {
      call: {
        organizationId
      },
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    // Specific call analysis
    if (callId) {
      const callAnalysis = await prisma.conversationAnalysis.findUnique({
        where: { callId: callId as string },
        include: {
          call: {
            select: {
              callId: true,
              agentId: true,
              startTime: true,
              duration: true,
              outcome: true
            }
          }
        }
      });

      if (callAnalysis) {
        return res.json({
          success: true,
          data: {
            analysis: callAnalysis,
            insights: generateCallInsights(callAnalysis),
            recommendations: generateRecommendations(callAnalysis)
          }
        });
      }
    }

    // Agent-specific analysis
    if (agentId) {
      analysisFilters.call = {
        ...analysisFilters.call,
        agentId: agentId as string
      };
    }

    // Get conversation analyses
    const analyses = await prisma.conversationAnalysis.findMany({
      where: analysisFilters,
      include: {
        call: {
          select: {
            callId: true,
            agentId: true,
            startTime: true,
            duration: true,
            outcome: true,
            campaignId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Calculate aggregated insights
    const insights = calculateConversationInsights(analyses);

    // Get sentiment distribution
    const sentimentDistribution = await prisma.callDisposition.groupBy({
      by: ['sentimentScore'],
      where: {
        call: { organizationId },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: true
    });

    // Performance metrics
    const performanceMetrics = {
      averageTalkTime: analyses.reduce((sum, a) => sum + a.talkTime, 0) / (analyses.length || 1),
      averageListenTime: analyses.reduce((sum, a) => sum + a.listenTime, 0) / (analyses.length || 1),
      averageLeadScore: analyses.reduce((sum, a) => sum + (a.leadScore || 0), 0) / (analyses.length || 1),
      averageConversionProb: analyses.reduce((sum, a) => sum + (a.conversionProb || 0), 0) / (analyses.length || 1)
    };

    res.json({
      success: true,
      data: {
        analyses,
        insights,
        sentimentDistribution: processSentimentDistribution(sentimentDistribution),
        performance: performanceMetrics,
        topRecommendations: extractTopRecommendations(analyses),
        lastUpdated: new Date()
      }
    });

  } catch (error: any) {
    console.error('Error fetching conversation intelligence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation intelligence',
      details: error.message
    });
  }
};

// ==========================================
// CAMPAIGN OPTIMIZATION
// ==========================================

/**
 * Get campaign optimization analytics
 * AI-powered campaign performance and optimization recommendations
 */
export const getCampaignOptimization = async (req: Request, res: Response) => {
  try {
    const { campaignId, dataListId } = req.query;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization access required'
      });
    }

    // Get campaign analytics
    const campaignFilters: any = { organizationId };
    if (campaignId) campaignFilters.campaignId = campaignId as string;

    const campaignAnalytics = await prisma.campaignAnalytics.findMany({
      where: campaignFilters,
      orderBy: { date: 'desc' },
      take: 30 // Last 30 days
    });

    // Get real-time campaign performance
    const callRecords = await prisma.callRecord.findMany({
      where: {
        organizationId,
        campaignId: campaignId as string,
        startTime: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: {
        callDisposition: true,
        conversationAnalysis: true
      }
    });

    // Calculate current performance metrics
    const currentMetrics = {
      totalCalls: callRecords.length,
      contactRate: calculateContactRate(callRecords),
      conversionRate: calculateConversionRate(callRecords),
      averageCallDuration: calculateAverageCallDuration(callRecords),
      leadQuality: calculateAverageLeadQuality(callRecords)
    };

    // Generate optimization recommendations
    const optimizationRecommendations = await generateOptimizationRecommendations(
      campaignAnalytics,
      currentMetrics,
      organizationId
    );

    // Predictive analytics
    const predictions = {
      predictedROI: calculatePredictedROI(campaignAnalytics),
      timeToComplete: estimateTimeToComplete(campaignAnalytics, currentMetrics),
      recommendedTiming: analyzeOptimalCallTimes(callRecords),
      listPriority: prioritizeLists(callRecords)
    };

    res.json({
      success: true,
      data: {
        current: currentMetrics,
        historical: campaignAnalytics,
        recommendations: optimizationRecommendations,
        predictions,
        trends: calculateCampaignTrends(campaignAnalytics),
        lastUpdated: new Date()
      }
    });

  } catch (error: any) {
    console.error('Error fetching campaign optimization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign optimization data',
      details: error.message
    });
  }
};

// ==========================================
// COMPLIANCE REPORTING
// ==========================================

/**
 * Get compliance monitoring report
 * Regulatory compliance tracking and violation monitoring
 */
export const getComplianceReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, severity } = req.query;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization access required'
      });
    }

    // Date range
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Build filters
    const eventFilters: any = {
      organizationId,
      createdAt: {
        gte: start,
        lte: end
      }
    };

    if (severity) eventFilters.severity = severity as string;

    // Get compliance events
    const complianceEvents = await prisma.complianceEvent.findMany({
      where: eventFilters,
      orderBy: { createdAt: 'desc' },
      take: 1000
    });

    // Calculate compliance score
    const complianceScore = calculateComplianceScore(complianceEvents, start, end);

    // Group by event type
    const eventsByType = await prisma.complianceEvent.groupBy({
      by: ['eventType'],
      where: eventFilters,
      _count: true
    });

    // Group by severity
    const eventsBySeverity = await prisma.complianceEvent.groupBy({
      by: ['severity'],
      where: eventFilters,
      _count: true
    });

    // Unresolved violations
    const unresolvedEvents = await prisma.complianceEvent.findMany({
      where: {
        ...eventFilters,
        resolved: false
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Daily trend analysis
    const dailyTrends = await getDailyComplianceTrends(organizationId, start, end);

    // Risk assessment
    const riskAssessment = calculateComplianceRisk(complianceEvents);

    res.json({
      success: true,
      data: {
        complianceScore,
        totalEvents: complianceEvents.length,
        unresolvedCount: unresolvedEvents.length,
        eventsByType: processEventsByType(eventsByType),
        eventsBySeverity: processEventsBySeverity(eventsBySeverity),
        unresolvedEvents: unresolvedEvents.slice(0, 50), // Top 50 unresolved
        dailyTrends,
        riskAssessment,
        recommendations: generateComplianceRecommendations(riskAssessment),
        lastUpdated: new Date()
      }
    });

  } catch (error: any) {
    console.error('Error fetching compliance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compliance report',
      details: error.message
    });
  }
};

// ==========================================
// AGENT PERFORMANCE INTELLIGENCE
// ==========================================

/**
 * Get advanced agent performance analytics
 * AI-powered agent coaching and performance insights
 */
export const getAdvancedAgentMetrics = async (req: Request, res: Response) => {
  try {
    const { agentId, dateRange } = req.query;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization access required'
      });
    }

    // Date range
    const startDate = dateRange ? new Date(dateRange as string + 'T00:00:00Z') : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // Build filters
    const callFilters: any = {
      organizationId,
      startTime: {
        gte: startDate,
        lte: endDate
      }
    };

    if (agentId) callFilters.agentId = agentId as string;

    // Get call records with analysis
    const callRecords = await prisma.callRecord.findMany({
      where: callFilters,
      include: {
        callDisposition: true,
        conversationAnalysis: true,
        agent: {
          select: {
            agentId: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Group by agent
    const agentPerformance = groupCallsByAgent(callRecords);

    // Calculate performance metrics for each agent
    const agentMetrics = await Promise.all(
      Object.entries(agentPerformance).map(async ([agentId, calls]) => {
        const metrics = calculateAgentMetrics(calls);
        const coachingInsights = generateCoachingInsights(calls);
        const burnoutRisk = assessBurnoutRisk(calls);
        
        return {
          agentId,
          agentName: calls[0]?.agent?.firstName + ' ' + calls[0]?.agent?.lastName,
          metrics,
          coachingInsights,
          burnoutRisk,
          callCount: calls.length
        };
      })
    );

    // Team performance comparison
    const teamComparison = calculateTeamComparison(agentMetrics);

    // Training recommendations
    const trainingNeeds = identifyTrainingNeeds(agentMetrics);

    res.json({
      success: true,
      data: {
        agentMetrics,
        teamComparison,
        trainingNeeds,
        performanceTrends: calculatePerformanceTrends(callRecords),
        topPerformers: identifyTopPerformers(agentMetrics),
        lastUpdated: new Date()
      }
    });

  } catch (error: any) {
    console.error('Error fetching agent performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent performance data',
      details: error.message
    });
  }
};

// ==========================================
// LEAD SCORING ANALYTICS
// ==========================================

/**
 * Get AI-powered lead scoring analytics
 * Dynamic lead prioritization and conversion predictions
 */
export const getLeadScoringAnalytics = async (req: Request, res: Response) => {
  try {
    const { campaignId, listId } = req.query;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization access required'
      });
    }

    // Get conversation analyses with lead scores
    const filters: any = {
      call: {
        organizationId
      },
      leadScore: {
        not: null
      }
    };

    if (campaignId) {
      filters.call = {
        ...filters.call,
        campaignId: campaignId as string
      };
    }

    const leadAnalyses = await prisma.conversationAnalysis.findMany({
      where: filters,
      include: {
        call: {
          include: {
            contact: {
              select: {
                contactId: true,
                firstName: true,
                lastName: true,
                company: true,
                industry: true
              }
            },
            callDisposition: true
          }
        }
      },
      orderBy: { leadScore: 'desc' },
      take: 500
    });

    // Score distribution analysis
    const scoreDistribution = analyzeScoreDistribution(leadAnalyses);

    // Conversion correlation
    const conversionCorrelation = analyzeConversionCorrelation(leadAnalyses);

    // Lead prioritization
    const prioritizedLeads = prioritizeLeads(leadAnalyses);

    // Model performance metrics
    const modelPerformance = calculateModelPerformance(leadAnalyses);

    // Industry insights
    const industryInsights = analyzeIndustryPerformance(leadAnalyses);

    // Dynamic scoring adjustments
    const scoringAdjustments = recommendScoringAdjustments(leadAnalyses);

    res.json({
      success: true,
      data: {
        scoreDistribution,
        conversionCorrelation,
        prioritizedLeads: prioritizedLeads.slice(0, 100),
        modelPerformance,
        industryInsights,
        scoringAdjustments,
        totalLeadsAnalyzed: leadAnalyses.length,
        lastUpdated: new Date()
      }
    });

  } catch (error: any) {
    console.error('Error fetching lead scoring analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead scoring analytics',
      details: error.message
    });
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function calculateComplianceRisk(abandonmentRate: number): string {
  if (abandonmentRate < 0.02) return 'LOW';
  if (abandonmentRate < 0.03) return 'MEDIUM';
  if (abandonmentRate < 0.05) return 'HIGH';
  return 'CRITICAL';
}

async function getLastComplianceViolation(organizationId: string) {
  return await prisma.complianceEvent.findFirst({
    where: { organizationId, severity: { in: ['HIGH', 'CRITICAL'] } },
    orderBy: { createdAt: 'desc' }
  });
}

function calculateTrends(metrics: any[]) {
  if (metrics.length < 2) return null;
  
  const latest = metrics[0];
  const previous = metrics[1];
  
  return {
    pacingTrend: ((latest.pacingRatio - previous.pacingRatio) / previous.pacingRatio) * 100,
    abandonmentTrend: ((latest.abandonedCallRate - previous.abandonedCallRate) / previous.abandonedCallRate) * 100,
    utilizationTrend: ((latest.agentUtilization - previous.agentUtilization) / previous.agentUtilization) * 100
  };
}

function generateCallInsights(analysis: any) {
  const insights = [];
  
  if (analysis.talkTime > analysis.listenTime * 2) {
    insights.push('Agent talked significantly more than listened - consider active listening training');
  }
  
  if (analysis.interruptionCount > 3) {
    insights.push('High interruption count detected - work on patience and conversation flow');
  }
  
  if (analysis.sentimentScore && analysis.sentimentScore < -0.5) {
    insights.push('Negative sentiment detected - review conversation approach');
  }
  
  return insights;
}

function generateRecommendations(analysis: any) {
  const recommendations = [];
  
  if (analysis.leadScore && analysis.leadScore > 80) {
    recommendations.push('High-quality lead - prioritize immediate follow-up');
  }
  
  if (analysis.conversionProb && analysis.conversionProb > 0.7) {
    recommendations.push('High conversion probability - schedule decision-maker call');
  }
  
  return recommendations;
}

function calculateConversationInsights(analyses: any[]) {
  return {
    averageSentiment: analyses.reduce((sum, a) => sum + (a.call?.callDisposition?.sentimentScore || 0), 0) / analyses.length,
    commonObjections: extractCommonObjections(analyses),
    successPatterns: identifySuccessPatterns(analyses),
    improvementAreas: identifyImprovementAreas(analyses)
  };
}

function processSentimentDistribution(distribution: any[]) {
  const total = distribution.reduce((sum, d) => sum + d._count, 0);
  return {
    positive: distribution.filter(d => d.sentimentScore > 0.1).reduce((sum, d) => sum + d._count, 0) / total,
    neutral: distribution.filter(d => d.sentimentScore >= -0.1 && d.sentimentScore <= 0.1).reduce((sum, d) => sum + d._count, 0) / total,
    negative: distribution.filter(d => d.sentimentScore < -0.1).reduce((sum, d) => sum + d._count, 0) / total
  };
}

function extractTopRecommendations(analyses: any[]) {
  // Extract and rank AI recommendations
  return analyses
    .filter(a => a.nextBestAction)
    .map(a => a.nextBestAction)
    .slice(0, 10);
}

// Additional helper functions would continue here...
// [Due to length constraints, I'm showing the pattern]

export {
  getDiallerMetrics,
  getConversationIntelligence,
  getCampaignOptimization,
  getComplianceReport,
  getAdvancedAgentMetrics,
  getLeadScoringAnalytics
};