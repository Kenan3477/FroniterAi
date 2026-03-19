/**
 * Advanced Analytics Helper Functions
 * Professional-grade analytics calculations for AI dialler reporting
 */

// ==========================================
// CONVERSATION ANALYTICS HELPERS
// ==========================================

export function extractCommonObjections(analyses: any[]): string[] {
  const objections = analyses
    .map(a => a.objectionTypes)
    .filter(Boolean)
    .flat();
  
  const objectionCounts = objections.reduce((counts: { [key: string]: number }, objection) => {
    counts[objection] = (counts[objection] || 0) + 1;
    return counts;
  }, {});
  
  return Object.entries(objectionCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([objection]) => objection);
}

export function identifySuccessPatterns(analyses: any[]): any[] {
  const successfulCalls = analyses.filter(a => 
    a.conversionProb && a.conversionProb > 0.7 ||
    a.call?.callDisposition?.disposition === 'SALE'
  );
  
  const patterns = [];
  
  // Talk time ratio analysis
  const avgTalkRatio = successfulCalls.reduce((sum, a) => 
    sum + (a.talkTime / (a.talkTime + a.listenTime)), 0) / successfulCalls.length;
  
  if (avgTalkRatio < 0.4) {
    patterns.push({
      type: 'LISTENING_RATIO',
      description: 'Successful calls show agents listening more than talking',
      metric: `${Math.round((1 - avgTalkRatio) * 100)}% listening time`
    });
  }
  
  // Interruption analysis
  const avgInterruptions = successfulCalls.reduce((sum, a) => 
    sum + (a.interruptionCount || 0), 0) / successfulCalls.length;
  
  if (avgInterruptions < 2) {
    patterns.push({
      type: 'LOW_INTERRUPTIONS',
      description: 'Successful calls have minimal interruptions',
      metric: `${Math.round(avgInterruptions)} avg interruptions`
    });
  }
  
  // Sentiment stability
  const stableSentiment = successfulCalls.filter(a => 
    a.call?.callDisposition?.sentimentScore && 
    Math.abs(a.call.callDisposition.sentimentScore) < 0.3
  ).length / successfulCalls.length;
  
  if (stableSentiment > 0.7) {
    patterns.push({
      type: 'NEUTRAL_SENTIMENT',
      description: 'Successful calls maintain neutral to positive sentiment',
      metric: `${Math.round(stableSentiment * 100)}% stable sentiment`
    });
  }
  
  return patterns;
}

export function identifyImprovementAreas(analyses: any[]): any[] {
  const areas = [];
  
  // High interruption rate
  const highInterruptionCalls = analyses.filter(a => (a.interruptionCount || 0) > 5).length;
  const interruptionRate = highInterruptionCalls / analyses.length;
  
  if (interruptionRate > 0.3) {
    areas.push({
      area: 'ACTIVE_LISTENING',
      priority: 'HIGH',
      description: 'High interruption rates indicate need for active listening training',
      affectedCalls: Math.round(interruptionRate * 100) + '%'
    });
  }
  
  // Negative sentiment trends
  const negativeCalls = analyses.filter(a => 
    a.call?.callDisposition?.sentimentScore && 
    a.call.callDisposition.sentimentScore < -0.5
  ).length;
  const negativeRate = negativeCalls / analyses.length;
  
  if (negativeRate > 0.2) {
    areas.push({
      area: 'RAPPORT_BUILDING',
      priority: 'MEDIUM',
      description: 'High negative sentiment requires rapport building focus',
      affectedCalls: Math.round(negativeRate * 100) + '%'
    });
  }
  
  // Low lead scoring
  const lowScoreCalls = analyses.filter(a => a.leadScore && a.leadScore < 30).length;
  const lowScoreRate = lowScoreCalls / analyses.length;
  
  if (lowScoreRate > 0.4) {
    areas.push({
      area: 'QUALIFICATION',
      priority: 'HIGH',
      description: 'Low lead scores indicate poor qualification techniques',
      affectedCalls: Math.round(lowScoreRate * 100) + '%'
    });
  }
  
  return areas;
}

// ==========================================
// CAMPAIGN OPTIMIZATION HELPERS
// ==========================================

export function calculateContactRate(callRecords: any[]): number {
  const contactedCalls = callRecords.filter(call => 
    call.outcome === 'CONNECTED' || 
    call.callDisposition?.disposition !== 'NO_ANSWER'
  ).length;
  
  return callRecords.length > 0 ? contactedCalls / callRecords.length : 0;
}

export function calculateConversionRate(callRecords: any[]): number {
  const conversions = callRecords.filter(call => 
    call.callDisposition?.disposition === 'SALE' ||
    call.callDisposition?.disposition === 'APPOINTMENT'
  ).length;
  
  return callRecords.length > 0 ? conversions / callRecords.length : 0;
}

export function calculateAverageCallDuration(callRecords: any[]): number {
  const totalDuration = callRecords.reduce((sum, call) => sum + (call.duration || 0), 0);
  return callRecords.length > 0 ? totalDuration / callRecords.length : 0;
}

export function calculateAverageLeadQuality(callRecords: any[]): number {
  const scoredCalls = callRecords.filter(call => call.conversationAnalysis?.leadScore);
  const totalScore = scoredCalls.reduce((sum, call) => sum + call.conversationAnalysis.leadScore, 0);
  return scoredCalls.length > 0 ? totalScore / scoredCalls.length : 0;
}

export async function generateOptimizationRecommendations(
  campaignAnalytics: any[],
  currentMetrics: any,
  organizationId: string
): Promise<any[]> {
  const recommendations = [];
  
  // Contact rate optimization
  if (currentMetrics.contactRate < 0.3) {
    recommendations.push({
      type: 'TIMING_OPTIMIZATION',
      priority: 'HIGH',
      title: 'Optimize Call Timing',
      description: 'Contact rate is below industry average. Consider adjusting call times.',
      impact: 'Could improve contact rate by 15-25%',
      action: 'Analyze call time patterns and adjust to peak contact hours'
    });
  }
  
  // Conversion rate improvement
  if (currentMetrics.conversionRate < 0.05) {
    recommendations.push({
      type: 'SCRIPT_OPTIMIZATION',
      priority: 'HIGH',
      title: 'Review Call Scripts',
      description: 'Low conversion rate indicates script or approach issues.',
      impact: 'Could improve conversion rate by 20-40%',
      action: 'A/B test new scripts and provide additional training'
    });
  }
  
  // Call duration analysis
  if (currentMetrics.averageCallDuration > 300) { // 5 minutes
    recommendations.push({
      type: 'EFFICIENCY_IMPROVEMENT',
      priority: 'MEDIUM',
      title: 'Improve Call Efficiency',
      description: 'Average call duration is above optimal range.',
      impact: 'Could increase daily call volume by 20%',
      action: 'Implement qualification frameworks to streamline conversations'
    });
  }
  
  return recommendations;
}

export function calculatePredictedROI(campaignAnalytics: any[]): number {
  if (campaignAnalytics.length < 7) return 0;
  
  const recentWeek = campaignAnalytics.slice(0, 7);
  const avgROI = recentWeek.reduce((sum, day) => sum + (day.roi || 0), 0) / recentWeek.length;
  
  // Simple trend calculation
  const firstHalf = recentWeek.slice(0, 3).reduce((sum, day) => sum + (day.roi || 0), 0) / 3;
  const secondHalf = recentWeek.slice(4, 7).reduce((sum, day) => sum + (day.roi || 0), 0) / 3;
  
  const trendMultiplier = secondHalf > firstHalf ? 1.1 : 0.9;
  
  return avgROI * trendMultiplier;
}

export function estimateTimeToComplete(campaignAnalytics: any[], currentMetrics: any): number {
  // This would need campaign target data to be accurate
  // For now, return a placeholder calculation
  const avgDailyCalls = currentMetrics.totalCalls;
  const estimatedTotalNeeded = 10000; // Placeholder
  
  return avgDailyCalls > 0 ? Math.ceil(estimatedTotalNeeded / avgDailyCalls) : 0;
}

export function analyzeOptimalCallTimes(callRecords: any[]): any[] {
  const hourlyPerformance: { [hour: number]: { calls: number, contacts: number, conversions: number } } = {};
  
  callRecords.forEach(call => {
    const hour = new Date(call.startTime).getHours();
    if (!hourlyPerformance[hour]) {
      hourlyPerformance[hour] = { calls: 0, contacts: 0, conversions: 0 };
    }
    
    hourlyPerformance[hour].calls++;
    
    if (call.outcome === 'CONNECTED') {
      hourlyPerformance[hour].contacts++;
    }
    
    if (call.callDisposition?.disposition === 'SALE') {
      hourlyPerformance[hour].conversions++;
    }
  });
  
  return Object.entries(hourlyPerformance)
    .map(([hour, performance]) => ({
      hour: parseInt(hour),
      contactRate: performance.contacts / performance.calls,
      conversionRate: performance.conversions / performance.calls,
      totalCalls: performance.calls
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 5);
}

export function prioritizeLists(callRecords: any[]): any[] {
  // Group by data list (this would need to be added to call records)
  // For now, return a placeholder
  return [
    { listId: 'list1', priority: 'HIGH', reason: 'High conversion rate' },
    { listId: 'list2', priority: 'MEDIUM', reason: 'Good contact rate' }
  ];
}

export function calculateCampaignTrends(campaignAnalytics: any[]): any {
  if (campaignAnalytics.length < 7) return null;
  
  const recent7 = campaignAnalytics.slice(0, 7);
  const previous7 = campaignAnalytics.slice(7, 14);
  
  const recentAvg = recent7.reduce((sum, day) => sum + (day.contactRate || 0), 0) / 7;
  const previousAvg = previous7.reduce((sum, day) => sum + (day.contactRate || 0), 0) / 7;
  
  return {
    contactRateTrend: previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0,
    direction: recentAvg > previousAvg ? 'IMPROVING' : 'DECLINING'
  };
}

// ==========================================
// COMPLIANCE HELPERS
// ==========================================

export function calculateComplianceScore(events: any[], startDate: Date, endDate: Date): number {
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const criticalEvents = events.filter(e => e.severity === 'CRITICAL').length;
  const highEvents = events.filter(e => e.severity === 'HIGH').length;
  const mediumEvents = events.filter(e => e.severity === 'MEDIUM').length;
  
  // Scoring algorithm (100 is perfect)
  let score = 100;
  score -= criticalEvents * 20;
  score -= highEvents * 10;
  score -= mediumEvents * 5;
  
  // Adjust for time period
  score = Math.max(0, score - (totalDays * 0.1));
  
  return Math.round(score);
}

export async function getDailyComplianceTrends(organizationId: string, startDate: Date, endDate: Date) {
  // This would require a more complex query
  // Returning placeholder structure
  const days = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    days.push({
      date: new Date(currentDate),
      eventCount: Math.floor(Math.random() * 5),
      severity: 'LOW'
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return days;
}

export function calculateComplianceRisk(events: any[]): any {
  const criticalCount = events.filter(e => e.severity === 'CRITICAL').length;
  const unresolvedCount = events.filter(e => !e.resolved).length;
  
  let riskLevel = 'LOW';
  let riskScore = 0;
  
  if (criticalCount > 0) {
    riskLevel = 'CRITICAL';
    riskScore = Math.min(100, criticalCount * 25);
  } else if (unresolvedCount > 5) {
    riskLevel = 'HIGH';
    riskScore = Math.min(75, unresolvedCount * 10);
  } else if (unresolvedCount > 2) {
    riskLevel = 'MEDIUM';
    riskScore = Math.min(50, unresolvedCount * 15);
  }
  
  return {
    level: riskLevel,
    score: riskScore,
    factors: {
      criticalEvents: criticalCount,
      unresolvedEvents: unresolvedCount,
      trendDirection: events.length > 10 ? 'INCREASING' : 'STABLE'
    }
  };
}

export function processEventsByType(eventsByType: any[]): any[] {
  return eventsByType.map(group => ({
    type: group.eventType,
    count: group._count,
    percentage: 0 // Would need total count to calculate
  }));
}

export function processEventsBySeverity(eventsBySeverity: any[]): any[] {
  const total = eventsBySeverity.reduce((sum, group) => sum + group._count, 0);
  
  return eventsBySeverity.map(group => ({
    severity: group.severity,
    count: group._count,
    percentage: total > 0 ? Math.round((group._count / total) * 100) : 0
  }));
}

export function generateComplianceRecommendations(riskAssessment: any): any[] {
  const recommendations = [];
  
  if (riskAssessment.level === 'CRITICAL') {
    recommendations.push({
      priority: 'IMMEDIATE',
      title: 'Address Critical Violations',
      description: 'Critical compliance violations require immediate attention',
      action: 'Review and resolve all critical events within 24 hours'
    });
  }
  
  if (riskAssessment.factors.unresolvedEvents > 5) {
    recommendations.push({
      priority: 'HIGH',
      title: 'Resolve Pending Issues',
      description: 'Multiple unresolved compliance events',
      action: 'Assign dedicated compliance officer to resolve pending issues'
    });
  }
  
  return recommendations;
}

// ==========================================
// AGENT PERFORMANCE HELPERS
// ==========================================

export function groupCallsByAgent(callRecords: any[]): { [agentId: string]: any[] } {
  return callRecords.reduce((groups, call) => {
    const agentId = call.agentId;
    if (!groups[agentId]) {
      groups[agentId] = [];
    }
    groups[agentId].push(call);
    return groups;
  }, {} as { [agentId: string]: any[] });
}

export function calculateAgentMetrics(calls: any[]): any {
  const totalCalls = calls.length;
  const connectedCalls = calls.filter(c => c.outcome === 'CONNECTED').length;
  const conversions = calls.filter(c => c.callDisposition?.disposition === 'SALE').length;
  const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
  
  const avgSentiment = calls
    .filter(c => c.callDisposition?.sentimentScore)
    .reduce((sum, c) => sum + c.callDisposition.sentimentScore, 0) / 
    calls.filter(c => c.callDisposition?.sentimentScore).length || 0;
  
  const avgLeadScore = calls
    .filter(c => c.conversationAnalysis?.leadScore)
    .reduce((sum, c) => sum + c.conversationAnalysis.leadScore, 0) /
    calls.filter(c => c.conversationAnalysis?.leadScore).length || 0;
  
  return {
    totalCalls,
    contactRate: totalCalls > 0 ? connectedCalls / totalCalls : 0,
    conversionRate: totalCalls > 0 ? conversions / totalCalls : 0,
    averageCallDuration: totalCalls > 0 ? totalDuration / totalCalls : 0,
    averageSentiment: avgSentiment,
    averageLeadScore: avgLeadScore,
    productivity: totalCalls // Could be enhanced with work hours
  };
}

export function generateCoachingInsights(calls: any[]): any[] {
  const insights = [];
  
  const avgTalkTime = calls.reduce((sum, c) => sum + (c.conversationAnalysis?.talkTime || 0), 0) / calls.length;
  const avgListenTime = calls.reduce((sum, c) => sum + (c.conversationAnalysis?.listenTime || 0), 0) / calls.length;
  
  if (avgTalkTime > avgListenTime * 2) {
    insights.push({
      area: 'ACTIVE_LISTENING',
      severity: 'MEDIUM',
      insight: 'Agent talks significantly more than they listen',
      recommendation: 'Practice active listening techniques and asking open-ended questions'
    });
  }
  
  const avgInterruptions = calls.reduce((sum, c) => sum + (c.conversationAnalysis?.interruptionCount || 0), 0) / calls.length;
  
  if (avgInterruptions > 3) {
    insights.push({
      area: 'CONVERSATION_FLOW',
      severity: 'HIGH',
      insight: 'High interruption rate detected',
      recommendation: 'Focus on patience and allowing prospects to finish thoughts'
    });
  }
  
  return insights;
}

export function assessBurnoutRisk(calls: any[]): any {
  const avgSentiment = calls
    .filter(c => c.callDisposition?.sentimentScore)
    .reduce((sum, c) => sum + c.callDisposition.sentimentScore, 0) / 
    calls.filter(c => c.callDisposition?.sentimentScore).length || 0;
  
  const negativeCallsRatio = calls.filter(c => 
    c.callDisposition?.sentimentScore && c.callDisposition.sentimentScore < -0.3
  ).length / calls.length;
  
  let riskLevel = 'LOW';
  let riskScore = 0;
  
  if (negativeCallsRatio > 0.6 || avgSentiment < -0.5) {
    riskLevel = 'HIGH';
    riskScore = 80;
  } else if (negativeCallsRatio > 0.4 || avgSentiment < -0.2) {
    riskLevel = 'MEDIUM';
    riskScore = 50;
  }
  
  return {
    level: riskLevel,
    score: riskScore,
    factors: {
      negativeCallsRatio,
      averageSentiment: avgSentiment,
      callVolume: calls.length
    },
    recommendations: riskLevel === 'HIGH' ? [
      'Schedule coaching session',
      'Review call recordings for improvement areas',
      'Consider workload adjustment'
    ] : []
  };
}

export function calculateTeamComparison(agentMetrics: any[]): any {
  const teamAverage = {
    contactRate: agentMetrics.reduce((sum, a) => sum + a.metrics.contactRate, 0) / agentMetrics.length,
    conversionRate: agentMetrics.reduce((sum, a) => sum + a.metrics.conversionRate, 0) / agentMetrics.length,
    averageSentiment: agentMetrics.reduce((sum, a) => sum + a.metrics.averageSentiment, 0) / agentMetrics.length
  };
  
  return {
    teamAverage,
    topPerformer: agentMetrics.sort((a, b) => b.metrics.conversionRate - a.metrics.conversionRate)[0],
    needsAttention: agentMetrics.filter(a => a.burnoutRisk?.level === 'HIGH')
  };
}

export function identifyTrainingNeeds(agentMetrics: any[]): any[] {
  const needs = [];
  
  const lowConversionAgents = agentMetrics.filter(a => a.metrics.conversionRate < 0.03);
  if (lowConversionAgents.length > 0) {
    needs.push({
      area: 'SALES_TECHNIQUES',
      priority: 'HIGH',
      affectedAgents: lowConversionAgents.length,
      description: 'Multiple agents showing low conversion rates'
    });
  }
  
  const lowSentimentAgents = agentMetrics.filter(a => a.metrics.averageSentiment < -0.2);
  if (lowSentimentAgents.length > 0) {
    needs.push({
      area: 'RAPPORT_BUILDING',
      priority: 'MEDIUM',
      affectedAgents: lowSentimentAgents.length,
      description: 'Agents struggling with customer rapport'
    });
  }
  
  return needs;
}

export function calculatePerformanceTrends(callRecords: any[]): any {
  // Group calls by day and calculate daily metrics
  const dailyMetrics: { [date: string]: { calls: number, conversions: number } } = {};
  
  callRecords.forEach(call => {
    const date = new Date(call.startTime).toISOString().split('T')[0];
    if (!dailyMetrics[date]) {
      dailyMetrics[date] = { calls: 0, conversions: 0 };
    }
    
    dailyMetrics[date].calls++;
    if (call.callDisposition?.disposition === 'SALE') {
      dailyMetrics[date].conversions++;
    }
  });
  
  return Object.entries(dailyMetrics)
    .map(([date, metrics]) => ({
      date,
      callVolume: metrics.calls,
      conversionRate: metrics.calls > 0 ? metrics.conversions / metrics.calls : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function identifyTopPerformers(agentMetrics: any[]): any[] {
  return agentMetrics
    .sort((a, b) => {
      const scoreA = a.metrics.conversionRate * 0.4 + a.metrics.contactRate * 0.3 + (a.metrics.averageSentiment + 1) * 0.3;
      const scoreB = b.metrics.conversionRate * 0.4 + b.metrics.contactRate * 0.3 + (b.metrics.averageSentiment + 1) * 0.3;
      return scoreB - scoreA;
    })
    .slice(0, 3)
    .map(agent => ({
      ...agent,
      performanceScore: (agent.metrics.conversionRate * 0.4 + agent.metrics.contactRate * 0.3 + (agent.metrics.averageSentiment + 1) * 0.3) * 100
    }));
}

// ==========================================
// LEAD SCORING HELPERS
// ==========================================

export function analyzeScoreDistribution(leadAnalyses: any[]): any {
  const scores = leadAnalyses.map(a => a.leadScore).filter(Boolean);
  const distribution = {
    high: scores.filter(s => s >= 80).length,
    medium: scores.filter(s => s >= 50 && s < 80).length,
    low: scores.filter(s => s < 50).length
  };
  
  const total = scores.length;
  
  return {
    high: { count: distribution.high, percentage: total > 0 ? Math.round((distribution.high / total) * 100) : 0 },
    medium: { count: distribution.medium, percentage: total > 0 ? Math.round((distribution.medium / total) * 100) : 0 },
    low: { count: distribution.low, percentage: total > 0 ? Math.round((distribution.low / total) * 100) : 0 },
    average: total > 0 ? scores.reduce((sum, s) => sum + s, 0) / total : 0
  };
}

export function analyzeConversionCorrelation(leadAnalyses: any[]): any {
  const scoreBuckets: { [bucket: string]: { total: number, conversions: number } } = {
    'high': { total: 0, conversions: 0 },
    'medium': { total: 0, conversions: 0 },
    'low': { total: 0, conversions: 0 }
  };
  
  leadAnalyses.forEach(analysis => {
    const score = analysis.leadScore;
    const converted = analysis.call?.callDisposition?.disposition === 'SALE';
    
    let bucket = 'low';
    if (score >= 80) bucket = 'high';
    else if (score >= 50) bucket = 'medium';
    
    scoreBuckets[bucket].total++;
    if (converted) scoreBuckets[bucket].conversions++;
  });
  
  return Object.entries(scoreBuckets).map(([bucket, data]) => ({
    bucket,
    conversionRate: data.total > 0 ? data.conversions / data.total : 0,
    sampleSize: data.total
  }));
}

export function prioritizeLeads(leadAnalyses: any[]): any[] {
  return leadAnalyses
    .filter(a => a.leadScore && a.call?.contact)
    .sort((a, b) => {
      // Prioritization algorithm
      const scoreA = (a.leadScore * 0.6) + (a.conversionProb || 0) * 40;
      const scoreB = (b.leadScore * 0.6) + (b.conversionProb || 0) * 40;
      return scoreB - scoreA;
    })
    .map(analysis => ({
      contactId: analysis.call.contact.contactId,
      name: `${analysis.call.contact.firstName} ${analysis.call.contact.lastName}`,
      company: analysis.call.contact.company,
      leadScore: analysis.leadScore,
      conversionProb: analysis.conversionProb,
      industry: analysis.call.contact.industry,
      lastContact: analysis.call.startTime,
      priority: analysis.leadScore >= 80 ? 'HIGH' : analysis.leadScore >= 50 ? 'MEDIUM' : 'LOW'
    }));
}

export function calculateModelPerformance(leadAnalyses: any[]): any {
  const predictedHighValue = leadAnalyses.filter(a => a.leadScore >= 80);
  const actualConversions = predictedHighValue.filter(a => 
    a.call?.callDisposition?.disposition === 'SALE'
  );
  
  const precision = predictedHighValue.length > 0 ? actualConversions.length / predictedHighValue.length : 0;
  
  const allConversions = leadAnalyses.filter(a => 
    a.call?.callDisposition?.disposition === 'SALE'
  );
  
  const recall = allConversions.length > 0 ? actualConversions.length / allConversions.length : 0;
  
  const f1Score = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
  
  return {
    precision: Math.round(precision * 100),
    recall: Math.round(recall * 100),
    f1Score: Math.round(f1Score * 100),
    totalPredictions: leadAnalyses.length,
    accuracy: Math.round(((predictedHighValue.filter(a => a.call?.callDisposition?.disposition === 'SALE').length + 
                          leadAnalyses.filter(a => a.leadScore < 80 && a.call?.callDisposition?.disposition !== 'SALE').length) / 
                          leadAnalyses.length) * 100)
  };
}

export function analyzeIndustryPerformance(leadAnalyses: any[]): any[] {
  const industryData: { [industry: string]: { total: number, avgScore: number, conversions: number } } = {};
  
  leadAnalyses.forEach(analysis => {
    const industry = analysis.call?.contact?.industry || 'Unknown';
    if (!industryData[industry]) {
      industryData[industry] = { total: 0, avgScore: 0, conversions: 0 };
    }
    
    industryData[industry].total++;
    industryData[industry].avgScore += analysis.leadScore;
    
    if (analysis.call?.callDisposition?.disposition === 'SALE') {
      industryData[industry].conversions++;
    }
  });
  
  return Object.entries(industryData)
    .map(([industry, data]) => ({
      industry,
      averageScore: Math.round(data.avgScore / data.total),
      conversionRate: data.total > 0 ? Math.round((data.conversions / data.total) * 100) : 0,
      sampleSize: data.total
    }))
    .sort((a, b) => b.averageScore - a.averageScore);
}

export function recommendScoringAdjustments(leadAnalyses: any[]): any[] {
  const recommendations = [];
  
  // Analyze false positives (high score, no conversion)
  const falsePositives = leadAnalyses.filter(a => 
    a.leadScore >= 80 && a.call?.callDisposition?.disposition !== 'SALE'
  );
  
  if (falsePositives.length > leadAnalyses.filter(a => a.leadScore >= 80).length * 0.7) {
    recommendations.push({
      type: 'SCORE_THRESHOLD',
      priority: 'HIGH',
      title: 'Adjust High Score Threshold',
      description: 'Too many high-scored leads are not converting',
      currentThreshold: 80,
      recommendedThreshold: 90,
      expectedImprovement: '15-25% precision increase'
    });
  }
  
  // Analyze model drift
  const recentAnalyses = leadAnalyses.filter(a => 
    new Date(a.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  
  if (recentAnalyses.length > 50) {
    const recentAvgScore = recentAnalyses.reduce((sum, a) => sum + a.leadScore, 0) / recentAnalyses.length;
    const overallAvgScore = leadAnalyses.reduce((sum, a) => sum + a.leadScore, 0) / leadAnalyses.length;
    
    if (Math.abs(recentAvgScore - overallAvgScore) > 10) {
      recommendations.push({
        type: 'MODEL_DRIFT',
        priority: 'MEDIUM',
        title: 'Potential Model Drift Detected',
        description: 'Recent scores differ significantly from historical average',
        drift: Math.round(recentAvgScore - overallAvgScore),
        action: 'Consider model retraining with recent data'
      });
    }
  }
  
  return recommendations;
}