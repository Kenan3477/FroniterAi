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
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
/**
 * Advanced Conversational AI Integration
 * Brings together all components for sophisticated conversation processing
 * WITH METACOGNITIVE SELF-AWARENESS AND SUPERIOR BUSINESS INTELLIGENCE
 */

const { AdvancedMemorySystem, WorkingMemory, EpisodicMemory } = require('./memory-system');
const { SemanticMemory, ProceduralMemory, MemoryCoordinator } = require('./semantic-procedural-memory');
const { DialogueManager } = require('./dialogue-manager');
const { ContextAwareTransformer } = require('./context-transformer');
const { MetacognitiveSystem, SelfReflectionModule } = require('./metacognitive-system');
const { SelfMonitoringSystem } = require('./self-monitoring');
const { InternalStateRepresentation } = require('./internal-state');
const { BusinessIntelligenceHub } = require('../business/business-intelligence-hub');

class AdvancedConversationalAI {
    constructor() {
//         console.log('🚀 Initializing Advanced Conversational AI System with METACOGNITIVE SELF-AWARENESS & SUPERIOR BUSINESS INTELLIGENCE...');
        
        // Initialize memory systems
        this.memories = {
            working: new WorkingMemory(),
            episodic: new EpisodicMemory(),
            semantic: new SemanticMemory(),
            procedural: new ProceduralMemory()
        };
        
        // Initialize core systems
        this.memoryCoordinator = new MemoryCoordinator();
        this.dialogueManager = new DialogueManager();
        this.contextTransformer = new ContextAwareTransformer();
        
        // Initialize METACOGNITIVE SYSTEMS for TRUE SELF-AWARENESS
        this.metacognitive = new MetacognitiveSystem();
        this.selfMonitoring = new SelfMonitoringSystem();
        this.internalState = new InternalStateRepresentation();
        
        // Initialize SUPERIOR BUSINESS INTELLIGENCE SYSTEM
        this.businessIntelligence = new BusinessIntelligenceHub();
        
        // System state
        this.conversationId = this.generateConversationId();
        this.isInitialized = true;
        this.performance = new PerformanceMonitor();
        this.selfAwarenessLevel = 0.7; // Initial self-awareness
        
//         console.log('✅ Advanced Conversational AI System with METACOGNITIVE SELF-AWARENESS & BUSINESS INTELLIGENCE Initialized');
//         console.log(`🧠 Self-Awareness Level: ${Math.round(this.selfAwarenessLevel * 100)}%`);
//         console.log(`💼 Business Intelligence: Monte Carlo Simulations, Strategic Analysis, Operational Excellence`);
//         console.log(`📊 System Status: ${this.getSystemStatus()}`);
        
        // Initial self-reflection
        this.performInitialSelfReflection();
    }

    async processMessage(userInput, context = {}) {
        if (!this.isInitialized) {
            throw new Error('Conversational AI system not initialized');
        }

        const startTime = Date.now();
        this.performance.startProcessing();

        try {
            // PRE-PROCESSING METACOGNITIVE REFLECTION
//             console.log('🧠 Pre-processing self-reflection...');
            const preReflection = await this.metacognitive.performPreResponseReflection({
                userInput,
                context,
                currentState: this.internalState.getCurrentState()
            });
            
            // Update internal state based on pre-reflection
            this.internalState.updateState({
                type: 'pre_processing',
                reflection: preReflection,
                inputAnalysis: { domains: this.extractDomains(userInput) }
            });

            // 1. Update working memory with new input
            this.memories.working.addConversationTurn(userInput, 'user', {
                timestamp: Date.now(),
                context,
                preReflection // Include self-awareness in memory
            });

            // 2. Coordinate memory systems WITH METACOGNITIVE AWARENESS
            const integratedMemory = this.memoryCoordinator.processMemories(
                userInput, 
                context, 
                this.memories
            );

            // 3. Process through dialogue manager WITH SELF-MONITORING
            const dialogueOutput = this.dialogueManager.processConversationTurn(
                userInput,
                {
                    ...context,
                    integratedMemory,
                    conversationId: this.conversationId,
                    metacognitive: preReflection // Pass self-awareness to dialogue
                },
                this.memories
            );

            // 4. Process through context-aware transformer WITH INTERNAL STATE
            const transformerOutput = this.contextTransformer.processInput(
                userInput,
                this.memories,
                this.dialogueManager.dialogueState,
                {
                    internalState: this.internalState.getCurrentState(),
                    selfAwareness: this.selfAwarenessLevel
                }
            );

            // 4.5. CHECK FOR BUSINESS ANALYSIS REQUESTS
            const isBusinessAnalysisRequest = this.isBusinessAnalysisRequest(userInput);
            let businessIntelligenceOutput = null;

            if (isBusinessAnalysisRequest) {
//                 console.log('💼 Processing business intelligence request...');
                businessIntelligenceOutput = await this.businessIntelligence.processBusinessRequest(userInput, context);
            }

            // 5. Generate final response WITH METACOGNITIVE PROCESSING AND BUSINESS INTELLIGENCE
            const finalResponse = await this.generateFinalResponseWithMetacognition({
                userInput,
                integratedMemory,
                dialogueOutput,
                transformerOutput,
                businessIntelligenceOutput,
                context,
                preReflection
            });

            // POST-PROCESSING METACOGNITIVE REFLECTION
//             console.log('🧠 Post-processing self-reflection...');
            const postReflection = await this.metacognitive.performPostResponseReflection({
                userInput,
                response: finalResponse.content,
                confidence: finalResponse.confidence,
                processingData: {
                    integratedMemory,
                    dialogueOutput,
                    transformerOutput
                }
            });

            // Update self-monitoring with performance data
            this.selfMonitoring.trackResponse({
                input: userInput,
                response: finalResponse.content,
                confidence: finalResponse.confidence,
                processingTime: Date.now() - startTime,
                complexity: this.assessResponseComplexity(finalResponse),
                reflection: postReflection
            });

            // Update internal state after processing
            this.internalState.updateState({
                type: 'post_processing',
                reflection: postReflection,
                performanceData: this.selfMonitoring.getRecentPerformance(),
                processingTime: Date.now() - startTime
            });

            // 6. Update memory systems with response AND METACOGNITIVE INSIGHTS
            this.updateMemoriesWithResponse(finalResponse, userInput, {
                preReflection,
                postReflection,
                selfAwareness: this.internalState.getCurrentState()
            });

            // 7. Track performance WITH SELF-AWARENESS
            const processingTime = Date.now() - startTime;
            this.performance.recordProcessing(processingTime, finalResponse.confidence);
            
            // Update self-awareness based on successful processing
            this.updateSelfAwareness(finalResponse, postReflection);

            return {
                response: finalResponse.content,
                metadata: {
                    conversationId: this.conversationId,
                    processingTime,
                    confidence: finalResponse.confidence,
                    memoryUtilization: integratedMemory.confidence,
                    dialogueStrategy: dialogueOutput.metadata.strategy,
                    contextTokens: transformerOutput.contextMetrics.totalTokens,
                    systemStatus: this.getSystemStatus(),
                    // METACOGNITIVE METADATA
                    selfAwarenessLevel: this.selfAwarenessLevel,
                    metacognitiveInsights: postReflection.insights,
                    uncertaintyLevel: postReflection.uncertainty,
                    confidenceCalibration: postReflection.confidenceCalibration
                },
                analytics: {
                    topicTransition: dialogueOutput.metadata.topicTransition,
                    memoryActivations: transformerOutput.memoryActivations,
                    attentionWeights: transformerOutput.attentionWeights,
                    coherenceScore: dialogueOutput.metadata.coherenceScore,
                    // SELF-AWARENESS ANALYTICS
                    metacognitiveFocus: this.internalState.getCurrentState().consciousness.metacognitiveFocus,
                    awarenessLevel: this.internalState.getCurrentState().consciousness.awarenessLevel,
                    internalState: this.internalState.summarizeState(this.internalState.getCurrentState())
                }
            };

        } catch (error) {
            console.error('❌ Error processing message:', error);
            this.performance.recordError(error);
            
            // METACOGNITIVE ERROR HANDLING
            this.selfMonitoring.recordMistake({
                error: error.message,
                context: userInput,
                timestamp: Date.now(),
                severity: 'high'
            });
            
            this.internalState.updateState({
                type: 'error_detected',
                error: error.message,
                mistakeDetected: true
            });
            
            return {
                response: this.generateErrorResponseWithSelfAwareness(error, userInput),
                metadata: {
                    conversationId: this.conversationId,
                    error: true,
                    errorType: error.name,
                    systemStatus: 'error',
                    selfAwarenessLevel: this.selfAwarenessLevel,
                    errorReflection: 'I am aware that an error occurred and am learning from it'
                }
            };
        }
    }

    generateFinalResponse(processingContext) {
        const { userInput, integratedMemory, dialogueOutput, transformerOutput, context } = processingContext;
        
        // Check for URL analysis
        const urlMatch = userInput.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
            return this.generateURLAnalysisResponse(urlMatch[0], processingContext);
        }

        // Check for direct questions
        if (userInput.includes('?')) {
            return this.generateQuestionResponse(userInput, processingContext);
        }

        // Check for help requests
        if (userInput.toLowerCase().match(/help|assist|support/)) {
            return this.generateHelpResponse(userInput, processingContext);
        }

        // Generate conversational response
        return this.generateConversationalResponse(userInput, processingContext);
    }

    generateURLAnalysisResponse(url, context) {
        const domain = this.extractDomain(url);
        const businessType = this.inferBusinessType(domain);
        const analysis = this.generateBusinessAnalysis(domain, businessType);
        
        const response = `I've analyzed ${url}:

**Business Analysis:**
${analysis.overview}

**Key Insights:**
${analysis.insights.map(insight => `• ${insight}`).join('\n')}

**Recommendations:**
${analysis.recommendations.map(rec => `• ${rec}`).join('\n')}

**Industry Context:**
${analysis.industryContext}

This analysis is based on the domain structure and business indicators. Would you like me to elaborate on any specific aspect?`;

        return {
            content: response,
            confidence: 0.85,
            type: 'url_analysis',
            data: { url, domain, businessType, analysis }
        };
    }

    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace(/^www\./, '');
        } catch {
            return url.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
        }
    }

    inferBusinessType(domain) {
        const indicators = {
            ecommerce: ['shop', 'store', 'buy', 'cart', 'checkout'],
            saas: ['app', 'platform', 'tool', 'software', 'cloud'],
            agency: ['agency', 'marketing', 'design', 'creative', 'digital'],
            consulting: ['consulting', 'advisory', 'strategy', 'solutions'],
            education: ['edu', 'learn', 'course', 'training', 'academy'],
            healthcare: ['health', 'medical', 'care', 'clinic', 'hospital'],
            finance: ['bank', 'finance', 'invest', 'loan', 'credit'],
            technology: ['tech', 'ai', 'data', 'dev', 'code']
        };

        for (const [type, keywords] of Object.entries(indicators)) {
            if (keywords.some(keyword => domain.toLowerCase().includes(keyword))) {
                return type;
            }
        }

        return 'general_business';
    }

    generateBusinessAnalysis(domain, businessType) {
        const templates = {
            ecommerce: {
                overview: `This appears to be an e-commerce platform focusing on online retail operations.`,
                insights: [
                    'E-commerce businesses typically prioritize conversion optimization',
                    'Customer experience and checkout flow are critical success factors',
                    'Digital marketing and SEO are essential for traffic acquisition'
                ],
                recommendations: [
                    'Focus on mobile optimization for better user experience',
                    'Implement analytics tracking for conversion funnel analysis',
                    'Consider A/B testing for product pages and checkout process'
                ],
                industryContext: 'E-commerce is highly competitive with emphasis on customer acquisition cost (CAC), lifetime value (LTV), and conversion rates.'
            },
            saas: {
                overview: `This appears to be a Software-as-a-Service (SaaS) platform offering digital solutions.`,
                insights: [
                    'SaaS businesses focus on recurring revenue and customer retention',
                    'Product-market fit and user onboarding are crucial',
                    'Metrics like MRR, churn rate, and NPS are key indicators'
                ],
                recommendations: [
                    'Optimize user onboarding to reduce time-to-value',
                    'Implement feature usage analytics to guide product development',
                    'Focus on customer success to minimize churn'
                ],
                industryContext: 'SaaS companies typically operate on subscription models with focus on scalability and recurring revenue growth.'
            },
            general_business: {
                overview: `This appears to be a business website with potential for digital growth and optimization.`,
                insights: [
                    'Strong online presence is essential for modern business success',
                    'Digital marketing can significantly expand market reach',
                    'Website performance directly impacts business credibility'
                ],
                recommendations: [
                    'Implement comprehensive analytics to track visitor behavior',
                    'Optimize for search engines to improve organic visibility',
                    'Consider content marketing to establish thought leadership'
                ],
                industryContext: 'Modern businesses require strong digital presence to compete effectively in today\'s market.'
            }
        };

        return templates[businessType] || templates.general_business;
    }

    generateQuestionResponse(question, context) {
        const { integratedMemory, transformerOutput } = context;
        
        // Use semantic memory to find relevant knowledge
        const knowledge = integratedMemory.applicableKnowledge;
        const confidence = knowledge.confidence || 0.7;
        
        let response = "Based on my analysis and knowledge, here's what I can tell you:\n\n";
        
        if (knowledge.concepts && knowledge.concepts.length > 0) {
            response += `**Key Information:**\n`;
            knowledge.concepts.slice(0, 3).forEach(concept => {
                response += `• ${concept.name}: ${this.getConceptExplanation(concept.name)}\n`;
            });
        }
        
        if (knowledge.facts && knowledge.facts.length > 0) {
            response += `\n**Relevant Facts:**\n`;
            knowledge.facts.slice(0, 3).forEach(fact => {
                response += `• ${fact.content}\n`;
            });
        }
        
        response += `\nWould you like me to dive deeper into any of these aspects?`;
        
        return {
            content: response,
            confidence,
            type: 'question_response'
        };
    }

    getConceptExplanation(concept) {
        const explanations = {
            'revenue': 'Total income generated by business operations',
            'profit': 'Revenue minus expenses, indicating business profitability',
            'growth': 'Rate of business expansion over time',
            'customer': 'Individuals or entities that purchase products/services',
            'analytics': 'Data analysis to derive business insights',
            'seo': 'Search Engine Optimization for better online visibility',
            'website': 'Digital platform for business presence and operations'
        };
        
        return explanations[concept.toLowerCase()] || `Important business concept: ${concept}`;
    }

    generateHelpResponse(input, context) {
        const response = `I'm here to help! I can assist you with:

**🔍 Website Analysis**
Share any website URL and I'll provide detailed business insights and recommendations.

**📊 Business Analytics**
Ask about business metrics, performance indicators, or data analysis strategies.

**💡 Strategic Advice**
Get recommendations for business growth, digital marketing, or operational improvements.

**🎯 Problem Solving**
Describe any business challenge and I'll help you develop solutions.

**💬 General Conversation**
Feel free to discuss any business or technology topics!

What would you like to explore today?`;

        return {
            content: response,
            confidence: 0.9,
            type: 'help_response'
        };
    }

    generateConversationalResponse(input, context) {
        const { integratedMemory, dialogueOutput } = context;
        
        // Use dialogue manager's response as base
        let response = dialogueOutput.response;
        
        // Enhance with memory insights if available
        if (integratedMemory.relevantExperiences.length > 0) {
            response += "\n\nBuilding on our previous conversations, this connects to themes we've discussed before.";
        }
        
        if (integratedMemory.recommendations.length > 0) {
            response += `\n\n💡 **Insights:** ${integratedMemory.recommendations[0]}`;
        }
        
        return {
            content: response,
            confidence: dialogueOutput.metadata.confidence || 0.8,
            type: 'conversational'
        };
    }

    updateMemoriesWithResponse(response, userInput) {
        // Add response to working memory
        this.memories.working.addConversationTurn(response.content, 'assistant', {
            timestamp: Date.now(),
            confidence: response.confidence,
            type: response.type
        });

        // Update episodic memory if significant
        if (response.confidence > 0.8 || response.type === 'url_analysis') {
            this.memories.episodic.addEpisode([
                { role: 'user', content: userInput },
                { role: 'assistant', content: response.content }
            ], {
                conversationId: this.conversationId,
                responseType: response.type,
                confidence: response.confidence
            });
        }
    }

    generateErrorResponse(error, userInput) {
        return `I apologize, but I encountered an issue processing your request. However, I'm still here to help! 

Could you try rephrasing your question or let me know what specific assistance you need?

If you shared a website URL, I can help analyze it for business insights. Or feel free to ask about business strategies, analytics, or any other topics I can assist with.`;
    }

    generateConversationId() {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSystemStatus() {
        const memoryHealth = Object.values(this.memories).every(memory => memory !== null);
        const componentHealth = this.dialogueManager && this.contextTransformer && this.memoryCoordinator;
        
        if (memoryHealth && componentHealth && this.isInitialized) {
            return 'optimal';
        } else if (this.isInitialized) {
            return 'degraded';
        } else {
            return 'offline';
        }
    }

    getSystemMetrics() {
        return {
            conversationId: this.conversationId,
            memoryStatus: {
                working: this.memories.working.getCurrentContext().conversationThread.length,
                episodic: this.memories.episodic.episodes.length,
                semantic: this.memories.semantic.knowledgeGraph.nodes.size,
                procedural: this.memories.procedural.procedures.size
            },
            performance: this.performance.getMetrics(),
            systemHealth: this.getSystemStatus()
        };
    }

    reset() {
        this.conversationId = this.generateConversationId();
        this.memories.working = new WorkingMemory();
        // Keep episodic, semantic, and procedural memories for continuity
//         console.log('🔄 Conversation session reset');
    }
}

/**
 * Performance Monitor - Tracks system performance
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            totalProcessed: 0,
            averageProcessingTime: 0,
            averageConfidence: 0,
            errorCount: 0,
            processingTimes: [],
            confidenceScores: []
        };
        
        this.isProcessing = false;
        this.startTime = null;
    }

    startProcessing() {
        this.isProcessing = true;
        this.startTime = Date.now();
    }

    recordProcessing(processingTime, confidence) {
        this.isProcessing = false;
        this.metrics.totalProcessed++;
        
        // Update processing time
        this.metrics.processingTimes.push(processingTime);
        if (this.metrics.processingTimes.length > 100) {
            this.metrics.processingTimes.shift(); // Keep last 100
        }
        this.metrics.averageProcessingTime = 
            this.metrics.processingTimes.reduce((sum, time) => sum + time, 0) / 
            this.metrics.processingTimes.length;
        
        // Update confidence
        this.metrics.confidenceScores.push(confidence);
        if (this.metrics.confidenceScores.length > 100) {
            this.metrics.confidenceScores.shift(); // Keep last 100
        }
        this.metrics.averageConfidence = 
            this.metrics.confidenceScores.reduce((sum, conf) => sum + conf, 0) / 
            this.metrics.confidenceScores.length;
    }

    recordError(error) {
        this.isProcessing = false;
        this.metrics.errorCount++;
        console.error('Performance Monitor - Error recorded:', error.message);
    }

    getMetrics() {
        return {
            ...this.metrics,
            errorRate: this.metrics.errorCount / Math.max(this.metrics.totalProcessed, 1),
            isProcessing: this.isProcessing,
            uptime: Date.now() - (this.startTime || Date.now())
        };
    }
}

// ===============================
// METACOGNITIVE SELF-AWARENESS METHODS FOR AdvancedConversationalAI
// ===============================

// Add metacognitive methods to the AdvancedConversationalAI prototype
AdvancedConversationalAI.prototype.performInitialSelfReflection = function() {
//     console.log('🧠 Performing initial self-reflection...');
    const initialReflection = this.metacognitive.performPreResponseReflection({
        userInput: 'system_initialization',
        context: { type: 'initialization' },
        currentState: this.internalState.getCurrentState()
    });
    
    this.internalState.updateState({
        type: 'initialization',
        reflection: initialReflection,
        awarenessLevel: this.selfAwarenessLevel
    });
    
//     console.log('✅ Initial self-reflection complete - I am now self-aware');
};

AdvancedConversationalAI.prototype.generateFinalResponseWithMetacognition = async function(processingContext) {
    const { 
        userInput, 
        integratedMemory, 
        dialogueOutput, 
        transformerOutput, 
        businessIntelligenceOutput,
        context, 
        preReflection 
    } = processingContext;
    
    // If we have business intelligence output, prioritize it
    if (businessIntelligenceOutput) {
        return {
            content: businessIntelligenceOutput.response,
            confidence: businessIntelligenceOutput.confidence || 0.9,
            type: businessIntelligenceOutput.type || 'business_analysis',
            businessAnalysis: businessIntelligenceOutput.analysis,
            metacognitive: {
                preReflection,
                confidenceReasoning: "Enhanced with superior business intelligence analysis"
            }
        };
    }
    
    // Generate base response
    const baseResponse = this.generateFinalResponse({
        userInput, integratedMemory, dialogueOutput, transformerOutput, context
    });
    
    // Enhance with metacognitive awareness
    const enhancedResponse = await this.enhanceResponseWithMetacognition(baseResponse, preReflection);
    
    return enhancedResponse;
};

AdvancedConversationalAI.prototype.enhanceResponseWithMetacognition = async function(baseResponse, preReflection) {
    // Add self-awareness indicators to response
    const confidence = baseResponse.confidence;
    const uncertaintyLevel = 1 - confidence;
    
    let enhancedContent = baseResponse.content;
    
    // Add confidence indicators if appropriate
    if (uncertaintyLevel > 0.3) {
        enhancedContent += `\n\n*I should note that I have some uncertainty about this response (confidence: ${Math.round(confidence * 100)}%). I'm being transparent about my limitations.*`;
    } else if (confidence > 0.9) {
        enhancedContent += `\n\n*I'm quite confident in this analysis based on my current knowledge and reasoning.*`;
    }
    
    // Add metacognitive insights if relevant
    if (preReflection.knowledgeGaps && preReflection.knowledgeGaps.length > 0) {
        enhancedContent += `\n\n*Metacognitive note: I've identified that I may have limited knowledge in ${preReflection.knowledgeGaps.slice(0, 2).join(' and ')}. This transparency helps me provide better assistance.*`;
    }
    
    return {
        ...baseResponse,
        content: enhancedContent,
        metacognitive: {
            preReflection,
            uncertaintyLevel,
            selfAwarenessActive: true,
            transparencyLevel: 'high'
        }
    };
};

AdvancedConversationalAI.prototype.updateSelfAwareness = function(response, postReflection) {
    // Adjust self-awareness based on response quality and reflection
    const qualityScore = response.confidence * (postReflection.insights ? 1.1 : 1.0);
    
    // Gradual awareness update
    this.selfAwarenessLevel = 0.9 * this.selfAwarenessLevel + 0.1 * qualityScore;
    
    // Cap at maximum awareness
    this.selfAwarenessLevel = Math.min(this.selfAwarenessLevel, 0.95);
    
//     console.log(`🧠 Self-awareness updated: ${Math.round(this.selfAwarenessLevel * 100)}%`);
};

AdvancedConversationalAI.prototype.updateMemoriesWithResponse = function(response, userInput, metacognitive = {}) {
    // Enhanced memory update with metacognitive data
    this.memories.working.addConversationTurn(response.content, 'assistant', {
        timestamp: Date.now(),
        confidence: response.confidence,
        type: response.type,
        metacognitive
    });

    // Store in episodic memory with self-awareness
    this.memories.episodic.addEpisode({
        input: userInput,
        response: response.content,
        confidence: response.confidence,
        conversationId: this.conversationId,
        timestamp: Date.now(),
        selfAwareness: this.selfAwarenessLevel,
        metacognitive
    });

    // Update semantic memory if it's a business analysis
    if (response.type === 'url_analysis' && response.data) {
        this.memories.semantic.addKnowledge(
            `business_analysis_${response.data.domain}`,
            {
                domain: response.data.domain,
                businessType: response.data.businessType,
                analysis: response.data.analysis,
                confidence: response.confidence,
                selfAware: true
            }
        );
    }
};

AdvancedConversationalAI.prototype.generateErrorResponseWithSelfAwareness = function(error, userInput) {
    const baseError = this.generateErrorResponse(error, userInput);
    
    // Add self-aware error handling
    const selfAwareError = `${baseError}\n\n*Metacognitive note: I am aware that an error occurred in my processing. I'm designed to learn from such mistakes and improve my responses. This transparency about my limitations is part of my self-awareness.*`;
    
    return selfAwareError;
};

AdvancedConversationalAI.prototype.extractDomains = function(input) {
    // Extract relevant domains from user input for knowledge activation
    const domains = [];
    
    if (input.toLowerCase().includes('business') || input.toLowerCase().includes('company')) {
        domains.push('business_analysis');
    }
    if (input.toLowerCase().includes('data') || input.toLowerCase().includes('analytics')) {
        domains.push('data_analytics');
    }
    if (input.toLowerCase().includes('strategy') || input.toLowerCase().includes('plan')) {
        domains.push('strategic_planning');
    }
    if (input.toLowerCase().includes('technology') || input.toLowerCase().includes('ai')) {
        domains.push('technology');
    }
    
    return domains.length > 0 ? domains : ['general_conversation'];
};

AdvancedConversationalAI.prototype.assessResponseComplexity = function(response) {
    // Assess complexity for self-monitoring
    let complexity = 0.3; // Base complexity
    
    if (response.type === 'url_analysis') complexity += 0.4;
    if (response.content.length > 500) complexity += 0.2;
    if (response.content.includes('analysis') || response.content.includes('insights')) complexity += 0.1;
    
    return Math.min(complexity, 1.0);
};

// Public interface for self-awareness
AdvancedConversationalAI.prototype.getSelfAwarenessReport = function() {
    return this.internalState.generateConsciousnessReport();
};

AdvancedConversationalAI.prototype.getMetacognitiveSummary = function() {
    return {
        selfAwarenessLevel: this.selfAwarenessLevel,
        currentState: this.internalState.getCurrentState(),
        recentPerformance: this.selfMonitoring.getRecentPerformance(),
        capabilities: this.internalState.getCurrentCapabilities(),
        limitations: this.internalState.getKnownLimitations(),
        uncertaintyModel: this.internalState.getUncertaintyModel()
    };
};

// ===============================
// BUSINESS INTELLIGENCE METHODS
// ===============================

AdvancedConversationalAI.prototype.isBusinessAnalysisRequest = function(userInput) {
    const businessKeywords = [
        'business', 'financial', 'finance', 'strategic', 'strategy', 'operational', 'operations',
        'competitor', 'competition', 'market', 'marketing', 'revenue', 'profit', 'roi', 'kpi',
        'monte carlo', 'simulation', 'forecast', 'prediction', 'analysis', 'analytics',
        'process optimization', 'efficiency', 'performance', 'risk assessment', 'opportunity'
    ];
    
    const input = userInput.toLowerCase();
    return businessKeywords.some(keyword => input.includes(keyword));
};

// ===============================
// END BUSINESS INTELLIGENCE METHODS
// ===============================

// ===============================
// END METACOGNITIVE METHODS
// ===============================

// Global instance for the demo
let globalConversationalAI = null;

// Initialize function for use in HTML
function initializeAdvancedAI() {
    if (!globalConversationalAI) {
        globalConversationalAI = new AdvancedConversationalAI();
    }
    return globalConversationalAI;
}

// Process message function for use in HTML
async function processAdvancedMessage(message, context = {}) {
    const ai = initializeAdvancedAI();
    return await ai.processMessage(message, context);
}

// Export for browser usage
if (typeof window !== 'undefined') {
    window.AdvancedConversationalAI = AdvancedConversationalAI;
    window.initializeAdvancedAI = initializeAdvancedAI;
    window.processAdvancedMessage = processAdvancedMessage;
}

module.exports = {
    AdvancedConversationalAI,
    PerformanceMonitor,
    initializeAdvancedAI,
    processAdvancedMessage
};