// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Analyzed by Evolution System at 2025-07-28 21:14:07.061412
// Analyzed by Evolution System at 2025-07-28 21:03:35.139575
// Analyzed by Evolution System at 2025-07-28 20:58:04.049514
// Analyzed by Evolution System at 2025-07-28 20:52:02.545480
// Analyzed by Evolution System at 2025-07-28 20:27:58.201834
// Analyzed by Evolution System at 2025-07-28 20:24:57.620415
// Analyzed by Evolution System at 2025-07-28 20:19:56.601283
// Performance optimized by Autonomous Evolution System
/**
 * Self-Monitoring System - Tracks performance and learns from feedback
 */

class SelfMonitoringSystem {
    constructor() {
        this.performanceTracker = new PerformanceTracker();
        this.feedbackAnalyzer = new FeedbackAnalyzer();
        this.mistakeDetector = new MistakeDetector();
        this.capabilityModeler = new CapabilityModeler();
        
        this.performanceHistory = [];
        this.feedbackHistory = [];
        this.mistakeLog = [];
        this.capabilityModel = this.initializeCapabilityModel();
        
//         console.log('📊 Self-Monitoring System: Beginning performance tracking...');
    }

    initializeCapabilityModel() {
        return {
            domains: {
                'business_analysis': { proficiency: 0.8, confidence: 0.85, samples: 0 },
                'website_analysis': { proficiency: 0.85, confidence: 0.9, samples: 0 },
                'strategic_planning': { proficiency: 0.75, confidence: 0.8, samples: 0 },
                'data_analysis': { proficiency: 0.8, confidence: 0.85, samples: 0 },
                'conversation': { proficiency: 0.9, confidence: 0.9, samples: 0 },
                'problem_solving': { proficiency: 0.8, confidence: 0.8, samples: 0 }
            },
            patterns: {
                strongAreas: ['conversation', 'website_analysis'],
                improvementAreas: ['strategic_planning'],
                learningTrends: {},
                confidenceCalibration: 0.8
            },
            lastUpdated: Date.now()
        };
    }

    monitorResponseGeneration(responseData) {
        const monitoring = {
            timestamp: Date.now(),
            responseId: this.generateResponseId(),
            complexityLevel: this.assessResponseComplexity(responseData),
            stepsInvolved: this.identifyProcessingSteps(responseData),
            assumptionsMade: this.identifyAssumptions(responseData),
            uncertaintyAreas: this.identifyUncertaintyAreas(responseData),
            resourcesUsed: this.trackResourceUsage(responseData),
            multipleSteps: false
        };

        monitoring.multipleSteps = monitoring.stepsInvolved.length > 3;
        
        // Track performance in real-time
        this.performanceTracker.recordResponse(monitoring);
        
//         console.log(`📈 Monitoring: Complexity=${Math.round(monitoring.complexityLevel * 100)}%, Steps=${monitoring.stepsInvolved.length}`);
        
        return monitoring;
    }

    assessResponseComplexity(responseData) {
        let complexity = 0.3; // Base complexity
        
        // Content length factor
        if (responseData.content) {
            const length = responseData.content.length;
            complexity += Math.min(length / 2000, 0.3);
        }
        
        // Analysis depth
        if (responseData.type === 'url_analysis') complexity += 0.2;
        if (responseData.type === 'business_analysis') complexity += 0.15;
        
        // Multiple topics or sections
        const sections = (responseData.content || '').split(/\n\n|\*\*/).length;
        complexity += Math.min(sections * 0.05, 0.2);
        
        // Technical depth
        const technicalTerms = (responseData.content || '').match(/\b(analytics|optimization|metrics|strategy|implementation)\b/gi) || [];
        complexity += Math.min(technicalTerms.length * 0.02, 0.15);
        
        return Math.min(complexity, 1.0);
    }

    identifyProcessingSteps(responseData) {
        const steps = [];
        
        // Infer steps based on response type and content
        if (responseData.type === 'url_analysis') {
            steps.push('URL extraction and validation');
            steps.push('Domain analysis and business type inference');
            steps.push('Industry context application');
            steps.push('Insight generation');
            steps.push('Recommendation formulation');
        } else if (responseData.type === 'question_response') {
            steps.push('Question analysis and intent recognition');
            steps.push('Knowledge retrieval from memory systems');
            steps.push('Answer synthesis');
            steps.push('Confidence assessment');
        } else if (responseData.type === 'help_response') {
            steps.push('Help request categorization');
            steps.push('Capability assessment');
            steps.push('Resource compilation');
        } else {
            steps.push('Input analysis');
            steps.push('Context integration');
            steps.push('Response generation');
        }
        
        return steps;
    }

    identifyAssumptions(responseData) {
        const assumptions = [];
        
        // Analyze content for implicit assumptions
        const content = responseData.content || '';
        
        if (content.includes('typically') || content.includes('usually')) {
            assumptions.push('industry standard practices apply');
        }
        
        if (content.includes('modern business') || content.includes('today\'s market')) {
            assumptions.push('contemporary business environment');
        }
        
        if (responseData.type === 'url_analysis' && !content.includes('without more information')) {
            assumptions.push('standard business model assumptions');
        }
        
        if (content.match(/recommend|suggest/) && !content.includes('depending on')) {
            assumptions.push('general best practices are applicable');
        }
        
        return assumptions;
    }

    identifyUncertaintyAreas(responseData) {
        const uncertainAreas = [];
        const content = responseData.content || '';
        
        // Look for uncertainty markers
        if (content.match(/may|might|could|possibly|perhaps/)) {
            uncertainAreas.push('outcome predictions');
        }
        
        if (content.includes('without more information') || content.includes('additional context')) {
            uncertainAreas.push('information completeness');
        }
        
        if (content.includes('depending on') || content.includes('varies by')) {
            uncertainAreas.push('situational factors');
        }
        
        if (responseData.confidence < 0.7) {
            uncertainAreas.push('domain expertise');
        }
        
        return uncertainAreas;
    }

    trackResourceUsage(responseData) {
        return {
            memorySystemsAccessed: ['working', 'episodic', 'semantic', 'procedural'],
            processingTime: responseData.processingTime || null,
            contextTokensUsed: responseData.contextTokens || null,
            knowledgeDomainsAccessed: this.identifyAccessedDomains(responseData)
        };
    }

    identifyAccessedDomains(responseData) {
        const domains = [];
        const content = (responseData.content || '').toLowerCase();
        
        if (content.match(/business|revenue|profit|strategy/)) domains.push('business');
        if (content.match(/website|seo|digital|analytics/)) domains.push('technology');
        if (content.match(/analyze|data|metrics|performance/)) domains.push('analysis');
        if (content.match(/customer|market|sales|marketing/)) domains.push('marketing');
        
        return domains;
    }

    recordUserFeedback(feedback, responseId, context = {}) {
        const feedbackRecord = {
            id: this.generateFeedbackId(),
            responseId,
            feedback,
            timestamp: Date.now(),
            context,
            analysis: this.feedbackAnalyzer.analyzeFeedback(feedback),
            impact: this.assessFeedbackImpact(feedback)
        };
        
        this.feedbackHistory.push(feedbackRecord);
        
        // Update capability model based on feedback
        this.updateCapabilityFromFeedback(feedbackRecord);
        
        // Check for mistakes to learn from
        this.mistakeDetector.analyzeFeedback(feedbackRecord, this.getResponseData(responseId));
        
//         console.log(`📝 Feedback recorded: ${feedbackRecord.analysis.sentiment} (Impact: ${feedbackRecord.impact})`);
        
        return feedbackRecord;
    }

    assessFeedbackImpact(feedback) {
        const positiveIndicators = ['good', 'great', 'helpful', 'useful', 'excellent', 'perfect', 'thanks'];
        const negativeIndicators = ['wrong', 'bad', 'unhelpful', 'useless', 'incorrect', 'poor', 'disappointing'];
        
        const text = feedback.toLowerCase();
        
        const positiveCount = positiveIndicators.filter(word => text.includes(word)).length;
        const negativeCount = negativeIndicators.filter(word => text.includes(word)).length;
        
        if (negativeCount > positiveCount) return 'negative';
        if (positiveCount > negativeCount) return 'positive';
        return 'neutral';
    }

    updateCapabilityFromFeedback(feedbackRecord) {
        const domain = this.inferDomainFromFeedback(feedbackRecord);
        if (!domain || !this.capabilityModel.domains[domain]) return;
        
        const domainModel = this.capabilityModel.domains[domain];
        domainModel.samples++;
        
        // Update proficiency based on feedback
        if (feedbackRecord.impact === 'positive') {
            domainModel.proficiency = Math.min(domainModel.proficiency + 0.02, 1.0);
            domainModel.confidence = Math.min(domainModel.confidence + 0.01, 1.0);
        } else if (feedbackRecord.impact === 'negative') {
            domainModel.proficiency = Math.max(domainModel.proficiency - 0.03, 0.1);
            domainModel.confidence = Math.max(domainModel.confidence - 0.02, 0.1);
        }
        
        // Update learning trends
        this.updateLearningTrends(domain, feedbackRecord.impact);
        
        this.capabilityModel.lastUpdated = Date.now();
    }

    inferDomainFromFeedback(feedbackRecord) {
        const content = (feedbackRecord.context.originalInput || '').toLowerCase();
        
        if (content.match(/website|url|seo/)) return 'website_analysis';
        if (content.match(/business|strategy|planning/)) return 'business_analysis';
        if (content.match(/data|analytics|metrics/)) return 'data_analysis';
        if (content.match(/problem|issue|solve/)) return 'problem_solving';
        
        return 'conversation'; // Default
    }

    updateLearningTrends(domain, impact) {
        if (!this.capabilityModel.patterns.learningTrends[domain]) {
            this.capabilityModel.patterns.learningTrends[domain] = {
                positive: 0,
                negative: 0,
                neutral: 0,
                trend: 'stable'
            };
        }
        
        const trends = this.capabilityModel.patterns.learningTrends[domain];
        trends[impact]++;
        
        // Calculate trend
        const total = trends.positive + trends.negative + trends.neutral;
        const positiveRatio = trends.positive / total;
        const negativeRatio = trends.negative / total;
        
        if (positiveRatio > 0.6) trends.trend = 'improving';
        else if (negativeRatio > 0.4) trends.trend = 'declining';
        else trends.trend = 'stable';
    }

    detectPatterns() {
        const patterns = {
            performancePatterns: this.analyzePerformancePatterns(),
            feedbackPatterns: this.analyzeFeedbackPatterns(),
            domainPatterns: this.analyzeDomainPatterns(),
            temporalPatterns: this.analyzeTemporalPatterns()
        };
        
//         console.log('🔍 Pattern Analysis Complete:', patterns);
        return patterns;
    }

    analyzePerformancePatterns() {
        if (this.performanceHistory.length < 5) return { status: 'insufficient_data' };
        
        const recent = this.performanceHistory.slice(-10);
        const avgComplexity = recent.reduce((sum, p) => sum + p.complexityLevel, 0) / recent.length;
        const avgSteps = recent.reduce((sum, p) => sum + p.stepsInvolved.length, 0) / recent.length;
        
        return {
            averageComplexity: avgComplexity,
            averageSteps: avgSteps,
            complexityTrend: this.calculateTrend(recent.map(p => p.complexityLevel)),
            mostCommonAssumptions: this.findCommonAssumptions(recent),
            frequentUncertaintyAreas: this.findFrequentUncertaintyAreas(recent)
        };
    }

    analyzeFeedbackPatterns() {
        if (this.feedbackHistory.length < 3) return { status: 'insufficient_data' };
        
        const positive = this.feedbackHistory.filter(f => f.impact === 'positive').length;
        const negative = this.feedbackHistory.filter(f => f.impact === 'negative').length;
        const neutral = this.feedbackHistory.filter(f => f.impact === 'neutral').length;
        const total = this.feedbackHistory.length;
        
        return {
            positiveRatio: positive / total,
            negativeRatio: negative / total,
            neutralRatio: neutral / total,
            overallSentiment: positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral',
            commonPositiveThemes: this.extractPositiveThemes(),
            commonNegativeThemes: this.extractNegativeThemes()
        };
    }

    analyzeDomainPatterns() {
        const domainStats = {};
        
        Object.entries(this.capabilityModel.domains).forEach(([domain, data]) => {
            domainStats[domain] = {
                proficiency: data.proficiency,
                confidence: data.confidence,
                samples: data.samples,
                trend: this.capabilityModel.patterns.learningTrends[domain]?.trend || 'unknown'
            };
        });
        
        // Identify strongest and weakest domains
        const sortedByProficiency = Object.entries(domainStats)
            .sort(([,a], [,b]) => b.proficiency - a.proficiency);
        
        return {
            domainStats,
            strongestDomain: sortedByProficiency[0],
            weakestDomain: sortedByProficiency[sortedByProficiency.length - 1],
            mostImproving: this.findMostImprovingDomain(),
            needsAttention: this.findDomainsNeedingAttention()
        };
    }

    analyzeTemporalPatterns() {
        const timeWindows = {
            last24h: Date.now() - 24 * 60 * 60 * 1000,
            lastWeek: Date.now() - 7 * 24 * 60 * 60 * 1000,
            lastMonth: Date.now() - 30 * 24 * 60 * 60 * 1000
        };
        
        const patterns = {};
        
        Object.entries(timeWindows).forEach(([window, cutoff]) => {
            const recentPerformance = this.performanceHistory.filter(p => p.timestamp > cutoff);
            const recentFeedback = this.feedbackHistory.filter(f => f.timestamp > cutoff);
            
            patterns[window] = {
                responseCount: recentPerformance.length,
                feedbackCount: recentFeedback.length,
                avgComplexity: recentPerformance.length > 0 ? 
                    recentPerformance.reduce((sum, p) => sum + p.complexityLevel, 0) / recentPerformance.length : 0,
                feedbackRatio: recentFeedback.length > 0 ? 
                    recentFeedback.filter(f => f.impact === 'positive').length / recentFeedback.length : 0
            };
        });
        
        return patterns;
    }

    calculateTrend(values) {
        if (values.length < 3) return 'insufficient_data';
        
        const slope = this.calculateSlope(values);
        
        if (slope > 0.02) return 'increasing';
        if (slope < -0.02) return 'decreasing';
        return 'stable';
    }

    calculateSlope(values) {
        const n = values.length;
        const xSum = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ...
        const ySum = values.reduce((sum, val) => sum + val, 0);
        const xySum = values.reduce((sum, val, i) => sum + (i * val), 0);
        const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices
        
        return (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
    }

    findCommonAssumptions(performances) {
        const assumptionCounts = {};
        
        performances.forEach(p => {
            p.assumptionsMade.forEach(assumption => {
                assumptionCounts[assumption] = (assumptionCounts[assumption] || 0) + 1;
            });
        });
        
        return Object.entries(assumptionCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([assumption, count]) => ({ assumption, count }));
    }

    findFrequentUncertaintyAreas(performances) {
        const uncertaintyCounts = {};
        
        performances.forEach(p => {
            p.uncertaintyAreas.forEach(area => {
                uncertaintyCounts[area] = (uncertaintyCounts[area] || 0) + 1;
            });
        });
        
        return Object.entries(uncertaintyCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([area, count]) => ({ area, count }));
    }

    extractPositiveThemes() {
        const positives = this.feedbackHistory.filter(f => f.impact === 'positive');
        const themes = {};
        
        positives.forEach(f => {
            const words = f.feedback.toLowerCase().split(/\s+/);
            words.forEach(word => {
                if (word.length > 3 && !['this', 'that', 'with', 'from'].includes(word)) {
                    themes[word] = (themes[word] || 0) + 1;
                }
            });
        });
        
        return Object.entries(themes)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([theme, count]) => ({ theme, count }));
    }

    extractNegativeThemes() {
        const negatives = this.feedbackHistory.filter(f => f.impact === 'negative');
        const themes = {};
        
        negatives.forEach(f => {
            const words = f.feedback.toLowerCase().split(/\s+/);
            words.forEach(word => {
                if (word.length > 3 && !['this', 'that', 'with', 'from'].includes(word)) {
                    themes[word] = (themes[word] || 0) + 1;
                }
            });
        });
        
        return Object.entries(themes)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([theme, count]) => ({ theme, count }));
    }

    findMostImprovingDomain() {
        const trends = this.capabilityModel.patterns.learningTrends;
        
        let mostImproving = null;
        let bestRatio = 0;
        
        Object.entries(trends).forEach(([domain, trend]) => {
            const total = trend.positive + trend.negative + trend.neutral;
            if (total > 2) { // Minimum samples
                const positiveRatio = trend.positive / total;
                if (positiveRatio > bestRatio) {
                    bestRatio = positiveRatio;
                    mostImproving = domain;
                }
            }
        });
        
        return mostImproving;
    }

    findDomainsNeedingAttention() {
        const needsAttention = [];
        
        Object.entries(this.capabilityModel.domains).forEach(([domain, data]) => {
            if (data.proficiency < 0.6 || data.confidence < 0.6) {
                needsAttention.push({
                    domain,
                    reason: data.proficiency < 0.6 ? 'low_proficiency' : 'low_confidence',
                    severity: data.proficiency < 0.4 || data.confidence < 0.4 ? 'high' : 'medium'
                });
            }
        });
        
        return needsAttention;
    }

    generateSelfReport() {
        const patterns = this.detectPatterns();
        
        const report = {
            timestamp: Date.now(),
            overview: this.generateOverview(),
            strengths: this.identifyStrengths(),
            improvementAreas: this.identifyImprovementAreas(),
            learningProgress: this.assessLearningProgress(),
            recommendations: this.generateSelfRecommendations(),
            patterns,
            metadata: {
                totalResponses: this.performanceHistory.length,
                totalFeedback: this.feedbackHistory.length,
                monitoringPeriod: this.calculateMonitoringPeriod()
            }
        };
        
//         console.log('📋 Self-Monitoring Report Generated:', report.overview);
        return report;
    }

    generateOverview() {
        const domainStats = this.capabilityModel.domains;
        const avgProficiency = Object.values(domainStats).reduce((sum, d) => sum + d.proficiency, 0) / Object.keys(domainStats).length;
        const avgConfidence = Object.values(domainStats).reduce((sum, d) => sum + d.confidence, 0) / Object.keys(domainStats).length;
        
        return {
            overallProficiency: avgProficiency,
            overallConfidence: avgConfidence,
            totalDomains: Object.keys(domainStats).length,
            mostActiveDomain: this.findMostActiveDomain(),
            systemHealth: this.assessSystemHealth(),
            keyInsight: this.generateKeyInsight(avgProficiency, avgConfidence)
        };
    }

    findMostActiveDomain() {
        return Object.entries(this.capabilityModel.domains)
            .sort(([,a], [,b]) => b.samples - a.samples)[0]?.[0] || 'unknown';
    }

    assessSystemHealth() {
        const issues = this.findDomainsNeedingAttention();
        const recentErrors = this.mistakeLog.filter(m => m.timestamp > Date.now() - 24 * 60 * 60 * 1000);
        
        if (issues.filter(i => i.severity === 'high').length > 0 || recentErrors.length > 3) {
            return 'needs_attention';
        } else if (issues.length > 0 || recentErrors.length > 1) {
            return 'stable_with_issues';
        } else {
            return 'healthy';
        }
    }

    generateKeyInsight(proficiency, confidence) {
        if (proficiency > 0.8 && confidence > 0.8) {
            return 'Operating at high proficiency with strong confidence calibration';
        } else if (proficiency > 0.7 && confidence < 0.7) {
            return 'Good capabilities but need better confidence calibration';
        } else if (proficiency < 0.7 && confidence > 0.8) {
            return 'Overconfident - need to improve actual capabilities';
        } else {
            return 'Both proficiency and confidence need improvement';
        }
    }

    identifyStrengths() {
        return Object.entries(this.capabilityModel.domains)
            .filter(([,data]) => data.proficiency > 0.8 && data.confidence > 0.8)
            .sort(([,a], [,b]) => (b.proficiency + b.confidence) - (a.proficiency + a.confidence))
            .slice(0, 3)
            .map(([domain, data]) => ({
                domain,
                proficiency: data.proficiency,
                confidence: data.confidence,
                samples: data.samples
            }));
    }

    identifyImprovementAreas() {
        return Object.entries(this.capabilityModel.domains)
            .filter(([,data]) => data.proficiency < 0.75 || data.confidence < 0.75)
            .sort(([,a], [,b]) => (a.proficiency + a.confidence) - (b.proficiency + b.confidence))
            .slice(0, 3)
            .map(([domain, data]) => ({
                domain,
                proficiency: data.proficiency,
                confidence: data.confidence,
                priority: data.proficiency < 0.6 ? 'high' : 'medium',
                samples: data.samples
            }));
    }

    assessLearningProgress() {
        const trends = this.capabilityModel.patterns.learningTrends;
        const improving = Object.entries(trends).filter(([,trend]) => trend.trend === 'improving').length;
        const declining = Object.entries(trends).filter(([,trend]) => trend.trend === 'declining').length;
        const stable = Object.entries(trends).filter(([,trend]) => trend.trend === 'stable').length;
        
        return {
            improving,
            declining,
            stable,
            overallTrend: improving > declining ? 'positive' : declining > improving ? 'negative' : 'stable',
            learningVelocity: this.calculateLearningVelocity()
        };
    }

    calculateLearningVelocity() {
        if (this.feedbackHistory.length < 5) return 'insufficient_data';
        
        const recent = this.feedbackHistory.slice(-5);
        const older = this.feedbackHistory.slice(-10, -5);
        
        if (older.length === 0) return 'baseline';
        
        const recentPositive = recent.filter(f => f.impact === 'positive').length / recent.length;
        const olderPositive = older.filter(f => f.impact === 'positive').length / older.length;
        
        const change = recentPositive - olderPositive;
        
        if (change > 0.2) return 'fast_improving';
        if (change > 0.1) return 'improving';
        if (change < -0.2) return 'declining';
        if (change < -0.1) return 'slowly_declining';
        return 'stable';
    }

    generateSelfRecommendations() {
        const recommendations = [];
        
        // Based on improvement areas
        this.identifyImprovementAreas().forEach(area => {
            if (area.priority === 'high') {
                recommendations.push({
                    type: 'capability_improvement',
                    priority: 'high',
                    action: `Focus on improving ${area.domain} proficiency through targeted practice`,
                    domain: area.domain
                });
            }
        });
        
        // Based on system health
        const health = this.assessSystemHealth();
        if (health === 'needs_attention') {
            recommendations.push({
                type: 'system_health',
                priority: 'high',
                action: 'Address critical domain weaknesses and recent error patterns'
            });
        }
        
        // Based on learning trends
        const needsAttention = this.findDomainsNeedingAttention();
        needsAttention.forEach(domain => {
            recommendations.push({
                type: 'confidence_calibration',
                priority: domain.severity,
                action: `Recalibrate confidence levels for ${domain.domain}`,
                domain: domain.domain
            });
        });
        
        return recommendations.slice(0, 5); // Top 5 recommendations
    }

    calculateMonitoringPeriod() {
        if (this.performanceHistory.length === 0) return 0;
        
        const oldest = Math.min(
            ...this.performanceHistory.map(p => p.timestamp),
            ...this.feedbackHistory.map(f => f.timestamp)
        );
        
        return Date.now() - oldest;
    }

    getResponseData(responseId) {
        return this.performanceHistory.find(p => p.responseId === responseId);
    }

    generateResponseId() {
        return `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateFeedbackId() {
        return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getCurrentCapabilityModel() {
        return { ...this.capabilityModel };
    }

    getPerformanceMetrics() {
        return {
            totalResponses: this.performanceHistory.length,
            totalFeedback: this.feedbackHistory.length,
            totalMistakes: this.mistakeLog.length,
            avgComplexity: this.performanceHistory.length > 0 ? 
                this.performanceHistory.reduce((sum, p) => sum + p.complexityLevel, 0) / this.performanceHistory.length : 0,
            recentPerformance: this.calculateRecentPerformance()
        };
    }

    calculateRecentPerformance() {
        const recent = this.performanceHistory.slice(-10);
        if (recent.length === 0) return null;
        
        return {
            avgComplexity: recent.reduce((sum, p) => sum + p.complexityLevel, 0) / recent.length,
            avgSteps: recent.reduce((sum, p) => sum + p.stepsInvolved.length, 0) / recent.length,
            commonAssumptions: this.findCommonAssumptions(recent),
            uncertaintyAreas: this.findFrequentUncertaintyAreas(recent)
        };
    }
}

/**
 * Supporting Classes for Self-Monitoring
 */

class PerformanceTracker {
    constructor() {
        this.metrics = new Map();
        this.thresholds = {
            complexity: { low: 0.3, medium: 0.6, high: 0.8 },
            steps: { low: 2, medium: 4, high: 6 }
        };
    }

    recordResponse(monitoring) {
        const performance = {
            ...monitoring,
            performanceLevel: this.assessPerformanceLevel(monitoring),
            efficiency: this.calculateEfficiency(monitoring),
            resourceIntensity: this.assessResourceIntensity(monitoring)
        };
        
        this.metrics.set(monitoring.responseId, performance);
        return performance;
    }

    assessPerformanceLevel(monitoring) {
        const { complexity, steps } = this.thresholds;
        
        if (monitoring.complexityLevel > complexity.high || monitoring.stepsInvolved.length > steps.high) {
            return 'high_performance';
        } else if (monitoring.complexityLevel > complexity.medium || monitoring.stepsInvolved.length > steps.medium) {
            return 'medium_performance';
        } else {
            return 'standard_performance';
        }
    }

    calculateEfficiency(monitoring) {
        // Simple efficiency metric: output quality vs resource usage
        const outputScore = monitoring.complexityLevel; // Proxy for output quality
        const resourceScore = monitoring.stepsInvolved.length / 10; // Normalized resource usage
        
        return outputScore / Math.max(resourceScore, 0.1);
    }

    assessResourceIntensity(monitoring) {
        const intensity = 
            (monitoring.stepsInvolved.length / 10) * 0.4 +
            (monitoring.assumptionsMade.length / 5) * 0.3 +
            (monitoring.uncertaintyAreas.length / 5) * 0.3;
        
        return Math.min(intensity, 1.0);
    }
}

class FeedbackAnalyzer {
    constructor() {
        this.sentimentPatterns = {
            positive: /\b(good|great|excellent|helpful|useful|perfect|amazing|wonderful|brilliant)\b/gi,
            negative: /\b(bad|poor|wrong|useless|unhelpful|terrible|awful|disappointing|incorrect)\b/gi,
            neutral: /\b(okay|fine|adequate|reasonable|acceptable)\b/gi
        };
    }

    analyzeFeedback(feedback) {
        const text = feedback.toLowerCase();
        
        const sentiment = this.detectSentiment(text);
        const specificity = this.assessSpecificity(feedback);
        const constructiveness = this.assessConstructiveness(feedback);
        const topics = this.extractTopics(feedback);
        
        return {
            sentiment,
            specificity,
            constructiveness,
            topics,
            wordCount: feedback.split(/\s+/).length,
            hasActionableItems: this.hasActionableItems(feedback)
        };
    }

    detectSentiment(text) {
        const positive = (text.match(this.sentimentPatterns.positive) || []).length;
        const negative = (text.match(this.sentimentPatterns.negative) || []).length;
        const neutral = (text.match(this.sentimentPatterns.neutral) || []).length;
        
        if (positive > negative && positive > neutral) return 'positive';
        if (negative > positive && negative > neutral) return 'negative';
        return 'neutral';
    }

    assessSpecificity(feedback) {
        const specificIndicators = [
            /\b(specifically|exactly|particularly|especially)\b/gi,
            /\b(step \d+|point \d+|section \d+)\b/gi,
            /\b(this part|that section|the \w+ part)\b/gi
        ];
        
        const specificCount = specificIndicators.reduce((count, pattern) => {
            return count + (feedback.match(pattern) || []).length;
        }, 0);
        
        return Math.min(specificCount / 3, 1.0);
    }

    assessConstructiveness(feedback) {
        const constructiveIndicators = [
            /\b(suggest|recommend|improve|better|instead|try|consider)\b/gi,
            /\b(could|should|might|perhaps|maybe)\b/gi,
            /\b(because|since|due to|reason)\b/gi
        ];
        
        const constructiveCount = constructiveIndicators.reduce((count, pattern) => {
            return count + (feedback.match(pattern) || []).length;
        }, 0);
        
        return Math.min(constructiveCount / 5, 1.0);
    }

    extractTopics(feedback) {
        const topicPatterns = {
            accuracy: /\b(correct|accurate|right|wrong|mistake|error)\b/gi,
            helpfulness: /\b(helpful|useful|useless|unhelpful)\b/gi,
            clarity: /\b(clear|unclear|confusing|understand|explanation)\b/gi,
            completeness: /\b(complete|incomplete|missing|enough|more)\b/gi,
            relevance: /\b(relevant|irrelevant|related|topic|subject)\b/gi
        };
        
        const topics = [];
        Object.entries(topicPatterns).forEach(([topic, pattern]) => {
            if (pattern.test(feedback)) {
                topics.push(topic);
            }
        });
        
        return topics;
    }

    hasActionableItems(feedback) {
        const actionablePatterns = [
            /\b(should|could|need to|try to|improve|fix|change)\b/gi,
            /\b(add|remove|include|exclude|focus on)\b/gi,
            /\b(suggestion|recommendation|advice)\b/gi
        ];
        
        return actionablePatterns.some(pattern => pattern.test(feedback));
    }
}

class MistakeDetector {
    constructor() {
        this.mistakeTypes = {
            factual_error: /\b(wrong|incorrect|false|mistake|error)\b/gi,
            irrelevant_response: /\b(irrelevant|off.topic|not related|doesn't answer)\b/gi,
            unclear_explanation: /\b(unclear|confusing|doesn't make sense)\b/gi,
            incomplete_response: /\b(incomplete|missing|not enough|need more)\b/gi,
            overconfident: /\b(too confident|overconfident|not sure)\b/gi
        };
    }

    analyzeFeedback(feedbackRecord, responseData) {
        if (feedbackRecord.impact !== 'negative') return null;
        
        const mistakes = this.detectMistakeTypes(feedbackRecord.feedback);
        
        if (mistakes.length > 0) {
            const mistakeRecord = {
                id: this.generateMistakeId(),
                timestamp: feedbackRecord.timestamp,
                responseId: feedbackRecord.responseId,
                mistakeTypes: mistakes,
                feedback: feedbackRecord.feedback,
                responseData,
                severity: this.assessSeverity(mistakes, feedbackRecord),
                learningOpportunity: this.identifyLearningOpportunity(mistakes, responseData)
            };
            
//             console.log(`⚠️ Mistake detected: ${mistakes.join(', ')} (Severity: ${mistakeRecord.severity})`);
            return mistakeRecord;
        }
        
        return null;
    }

    detectMistakeTypes(feedback) {
        const detected = [];
        
        Object.entries(this.mistakeTypes).forEach(([type, pattern]) => {
            if (pattern.test(feedback)) {
                detected.push(type);
            }
        });
        
        return detected;
    }

    assessSeverity(mistakes, feedbackRecord) {
        const severityMap = {
            factual_error: 3,
            irrelevant_response: 2,
            unclear_explanation: 1,
            incomplete_response: 1,
            overconfident: 2
        };
        
        const totalSeverity = mistakes.reduce((sum, mistake) => {
            return sum + (severityMap[mistake] || 1);
        }, 0);
        
        if (totalSeverity >= 4) return 'high';
        if (totalSeverity >= 2) return 'medium';
        return 'low';
    }

    identifyLearningOpportunity(mistakes, responseData) {
        const opportunities = {
            factual_error: 'Improve fact-checking and knowledge verification',
            irrelevant_response: 'Better input analysis and topic relevance',
            unclear_explanation: 'Enhance clarity and explanation quality',
            incomplete_response: 'Improve completeness assessment',
            overconfident: 'Better confidence calibration'
        };
        
        return mistakes.map(mistake => opportunities[mistake]).filter(Boolean);
    }

    generateMistakeId() {
        return `mistake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

class CapabilityModeler {
    constructor() {
        this.updateThreshold = 0.1; // Minimum change to trigger update
        this.decayFactor = 0.99; // Gradual decay of old performance
    }

    updateCapability(domain, performance, feedback) {
        // Bayesian-like update of capability estimates
        const currentModel = this.getCurrentModel(domain);
        
        const performanceUpdate = this.calculatePerformanceUpdate(performance);
        const feedbackUpdate = this.calculateFeedbackUpdate(feedback);
        
        const combinedUpdate = (performanceUpdate + feedbackUpdate) / 2;
        
        return this.applyUpdate(currentModel, combinedUpdate);
    }

    calculatePerformanceUpdate(performance) {
        // Convert performance metrics to capability update
        return {
            proficiencyDelta: (performance.quality - 0.7) * 0.1,
            confidenceDelta: (performance.confidence - 0.7) * 0.05
        };
    }

    calculateFeedbackUpdate(feedback) {
        // Convert feedback to capability update
        const impact = feedback.impact === 'positive' ? 1 : feedback.impact === 'negative' ? -1 : 0;
        
        return {
            proficiencyDelta: impact * 0.05,
            confidenceDelta: impact * 0.03
        };
    }

    applyUpdate(currentModel, update) {
        return {
            proficiency: Math.max(0, Math.min(1, 
                currentModel.proficiency + update.proficiencyDelta)),
            confidence: Math.max(0, Math.min(1, 
                currentModel.confidence + update.confidenceDelta)),
            lastUpdated: Date.now()
        };
    }

    getCurrentModel(domain) {
        // Return current model for domain or default
        return {
            proficiency: 0.7,
            confidence: 0.7,
            lastUpdated: Date.now()
        };
    }
}

module.exports = {
    SelfMonitoringSystem,
    PerformanceTracker,
    FeedbackAnalyzer,
    MistakeDetector,
    CapabilityModeler
};