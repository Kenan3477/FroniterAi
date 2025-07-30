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
// Analyzed by Evolution System at 2025-07-28 21:19:08.296799
// Analyzed by Evolution System at 2025-07-28 21:07:35.773821
// Analyzed by Evolution System at 2025-07-28 21:01:04.661385
// Analyzed by Evolution System at 2025-07-28 20:57:33.963787
// Analyzed by Evolution System at 2025-07-28 20:55:03.089398
// Performance optimized by Autonomous Evolution System
/**
 * Dialogue Manager - Advanced conversation coordination and coherence
 * Manages conversation flow, topic transitions, and dialogue state
 */

class DialogueManager {
    constructor() {
        this.dialogueState = new DialogueState();
        this.topicManager = new TopicManager();
        this.conversationPlanner = new ConversationPlanner();
        this.coherenceTracker = new CoherenceTracker();
        this.responseGenerator = new ResponseGenerator();
        
        this.currentStrategy = 'adaptive'; // adaptive, focused, exploratory
        this.confidenceThreshold = 0.7;
        
//         console.log('💬 Dialogue Manager Initialized');
    }

    processConversationTurn(userInput, context, memories) {
        // Update dialogue state
        this.dialogueState.updateTurn(userInput, context);
        
        // Analyze conversation coherence
        const coherence = this.coherenceTracker.analyzeCoherence(userInput, context);
        
        // Plan response strategy
        const strategy = this.conversationPlanner.planResponse({
            input: userInput,
            context,
            memories,
            coherence,
            currentState: this.dialogueState.getCurrentState()
        });
        
        // Manage topics
        const topicPlan = this.topicManager.manageTopic(userInput, context, strategy);
        
        // Generate response
        const response = this.responseGenerator.generateResponse({
            strategy,
            topicPlan,
            memories,
            coherence,
            context
        });
        
        // Update state with response
        this.dialogueState.updateWithResponse(response);
        
        return {
            response: response.content,
            metadata: {
                strategy: strategy.type,
                topicTransition: topicPlan.transition,
                coherenceScore: coherence.score,
                confidence: response.confidence,
                nextTurnPrediction: strategy.nextTurnPrediction
            }
        };
    }

    adjustStrategy(feedback, performance) {
        if (performance.coherence < 0.6) {
            this.currentStrategy = 'focused';
        } else if (performance.userEngagement > 0.8) {
            this.currentStrategy = 'exploratory';
        } else {
            this.currentStrategy = 'adaptive';
        }
    }
}

/**
 * Dialogue State - Tracks conversation state and history
 */
class DialogueState {
    constructor() {
        this.currentTurn = 0;
        this.conversationPhase = 'opening'; // opening, developing, climax, resolution
        this.grounding = new Map(); // Shared understanding
        this.intentions = []; // User intentions over time
        this.commitments = []; // System commitments made
        this.expectations = []; // What to expect next
        this.conversationGoals = [];
        
        this.turnHistory = [];
        this.stateTransitions = [];
    }

    updateTurn(userInput, context) {
        this.currentTurn++;
        
        const turnData = {
            turn: this.currentTurn,
            timestamp: Date.now(),
            userInput,
            context: { ...context },
            phase: this.conversationPhase,
            intentions: this.extractIntentions(userInput),
            groundingUpdates: this.updateGrounding(userInput, context)
        };
        
        this.turnHistory.push(turnData);
        this.updateConversationPhase();
        this.updateExpectations(userInput);
    }

    updateWithResponse(response) {
        const lastTurn = this.turnHistory[this.turnHistory.length - 1];
        if (lastTurn) {
            lastTurn.systemResponse = response.content;
            lastTurn.systemCommitments = response.commitments || [];
            lastTurn.responseStrategy = response.strategy;
        }
        
        // Update commitments
        if (response.commitments) {
            this.commitments.push(...response.commitments);
        }
    }

    extractIntentions(userInput) {
        const intentions = [];
        
        // Question detection
        if (userInput.includes('?') || userInput.toLowerCase().match(/^(what|how|why|when|where|who)/)) {
            intentions.push({ type: 'information_seeking', confidence: 0.9 });
        }
        
        // Request detection
        if (userInput.toLowerCase().match(/^(can you|could you|please|help)/)) {
            intentions.push({ type: 'request', confidence: 0.8 });
        }
        
        // Statement/sharing
        if (!intentions.length) {
            intentions.push({ type: 'information_sharing', confidence: 0.6 });
        }
        
        return intentions;
    }

    updateGrounding(userInput, context) {
        const updates = {};
        
        // Extract entities and concepts mentioned
        const entities = this.extractEntities(userInput);
        entities.forEach(entity => {
            this.grounding.set(entity.name, {
                ...entity,
                lastMentioned: this.currentTurn,
                confidence: entity.confidence
            });
            updates[entity.name] = entity;
        });
        
        return updates;
    }

    extractEntities(text) {
        const entities = [];
        
        // Simple entity extraction (would use NLP in production)
        const businessTerms = ['revenue', 'profit', 'customer', 'growth', 'sales', 'marketing'];
        const techTerms = ['website', 'SEO', 'analytics', 'AI', 'data', 'API'];
        
        businessTerms.forEach(term => {
            if (text.toLowerCase().includes(term)) {
                entities.push({
                    name: term,
                    type: 'business_concept',
                    confidence: 0.8
                });
            }
        });
        
        techTerms.forEach(term => {
            if (text.toLowerCase().includes(term)) {
                entities.push({
                    name: term,
                    type: 'technology_concept',
                    confidence: 0.8
                });
            }
        });
        
        // URL detection
        const urlMatch = text.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
            entities.push({
                name: urlMatch[0],
                type: 'url',
                confidence: 1.0
            });
        }
        
        return entities;
    }

    updateConversationPhase() {
        const turnCount = this.currentTurn;
        
        if (turnCount <= 2) {
            this.conversationPhase = 'opening';
        } else if (turnCount <= 8) {
            this.conversationPhase = 'developing';
        } else if (turnCount <= 12) {
            this.conversationPhase = 'climax';
        } else {
            this.conversationPhase = 'resolution';
        }
    }

    updateExpectations(userInput) {
        // Update what to expect in next turn based on current input
        this.expectations = [];
        
        if (userInput.includes('?')) {
            this.expectations.push({ type: 'expects_answer', confidence: 0.9 });
        }
        
        if (userInput.toLowerCase().includes('help')) {
            this.expectations.push({ type: 'expects_assistance', confidence: 0.8 });
        }
        
        // If user shared information, they might want feedback
        if (this.intentions.some(i => i.type === 'information_sharing')) {
            this.expectations.push({ type: 'expects_acknowledgment', confidence: 0.7 });
        }
    }

    getCurrentState() {
        return {
            turn: this.currentTurn,
            phase: this.conversationPhase,
            grounding: Object.fromEntries(this.grounding),
            activeIntentions: this.intentions,
            commitments: this.commitments,
            expectations: this.expectations,
            goals: this.conversationGoals
        };
    }
}

/**
 * Topic Manager - Manages conversation topics and transitions
 */
class TopicManager {
    constructor() {
        this.topicStack = []; // Current active topics
        this.topicHistory = []; // All topics discussed
        this.topicTransitions = new Map(); // Common transition patterns
        this.topicCoherence = new Map(); // How well topics connect
        
        this.maxActiveTopics = 3;
        this.initializeTransitionPatterns();
    }

    initializeTransitionPatterns() {
        // Common topic transition patterns
        this.topicTransitions.set('business->analytics', { 
            strength: 0.9, 
            phrases: ['Let\'s look at the data', 'Speaking of performance', 'This relates to your metrics'] 
        });
        this.topicTransitions.set('website->SEO', { 
            strength: 0.8, 
            phrases: ['For better visibility', 'To improve search rankings', 'Regarding optimization'] 
        });
        this.topicTransitions.set('problem->solution', { 
            strength: 0.95, 
            phrases: ['Here\'s how we can address that', 'A potential solution would be', 'To resolve this'] 
        });
    }

    manageTopic(userInput, context, strategy) {
        const detectedTopics = this.detectTopics(userInput);
        const currentTopic = this.getCurrentTopic();
        
        let transition = null;
        let newTopic = null;
        
        if (detectedTopics.length > 0) {
            newTopic = detectedTopics[0]; // Take most confident
            
            // Decide if we need a topic transition
            if (currentTopic && currentTopic.name !== newTopic.name) {
                transition = this.planTopicTransition(currentTopic, newTopic, strategy);
            }
            
            this.updateTopicStack(newTopic);
        }
        
        return {
            currentTopic: this.getCurrentTopic(),
            newTopic,
            transition,
            topicStack: [...this.topicStack],
            suggestedTransitionPhrase: transition ? this.getTransitionPhrase(currentTopic, newTopic) : null
        };
    }

    detectTopics(userInput) {
        const topics = [];
        const text = userInput.toLowerCase();
        
        // Business topics
        if (text.match(/revenue|profit|sales|business|growth|customer/)) {
            topics.push({ name: 'business', confidence: 0.8, keywords: ['revenue', 'profit', 'sales'] });
        }
        
        // Technology topics
        if (text.match(/website|seo|analytics|tech|digital|online/)) {
            topics.push({ name: 'technology', confidence: 0.7, keywords: ['website', 'SEO', 'analytics'] });
        }
        
        // Problem-solving topics
        if (text.match(/problem|issue|challenge|help|fix|solve/)) {
            topics.push({ name: 'problem_solving', confidence: 0.9, keywords: ['problem', 'help', 'solve'] });
        }
        
        // Analysis topics
        if (text.match(/analyze|data|metrics|performance|report/)) {
            topics.push({ name: 'analysis', confidence: 0.8, keywords: ['analyze', 'data', 'metrics'] });
        }
        
        // URL analysis topic
        if (text.match(/https?:\/\//)) {
            topics.push({ name: 'url_analysis', confidence: 1.0, keywords: ['URL', 'website'] });
        }
        
        return topics.sort((a, b) => b.confidence - a.confidence);
    }

    planTopicTransition(currentTopic, newTopic, strategy) {
        const transitionKey = `${currentTopic.name}->${newTopic.name}`;
        const knownTransition = this.topicTransitions.get(transitionKey);
        
        if (knownTransition) {
            return {
                type: 'smooth',
                strength: knownTransition.strength,
                method: 'known_pattern'
            };
        }
        
        // Calculate semantic similarity for unknown transitions
        const similarity = this.calculateTopicSimilarity(currentTopic, newTopic);
        
        if (similarity > 0.6) {
            return {
                type: 'bridge',
                strength: similarity,
                method: 'semantic_bridge'
            };
        } else if (strategy.type === 'adaptive') {
            return {
                type: 'acknowledge_shift',
                strength: 0.5,
                method: 'explicit_transition'
            };
        } else {
            return {
                type: 'direct',
                strength: 0.3,
                method: 'direct_shift'
            };
        }
    }

    calculateTopicSimilarity(topic1, topic2) {
        const keywords1 = new Set(topic1.keywords || []);
        const keywords2 = new Set(topic2.keywords || []);
        
        const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
        const union = new Set([...keywords1, ...keywords2]);
        
        return intersection.size / union.size; // Jaccard similarity
    }

    updateTopicStack(newTopic) {
        // Remove if already in stack
        this.topicStack = this.topicStack.filter(t => t.name !== newTopic.name);
        
        // Add to front
        this.topicStack.unshift({
            ...newTopic,
            startTime: Date.now(),
            turnIntroduced: Date.now()
        });
        
        // Maintain max active topics
        if (this.topicStack.length > this.maxActiveTopics) {
            const removed = this.topicStack.pop();
            this.topicHistory.push({
                ...removed,
                endTime: Date.now(),
                duration: Date.now() - removed.startTime
            });
        }
    }

    getCurrentTopic() {
        return this.topicStack.length > 0 ? this.topicStack[0] : null;
    }

    getTopicContext() {
        return {
            active: this.topicStack,
            recent: this.topicHistory.slice(-5),
            transitions: Array.from(this.topicTransitions.keys())
        };
    }

    getTransitionPhrase(fromTopic, toTopic) {
        const transitionKey = `${fromTopic.name}->${toTopic.name}`;
        const knownTransition = this.topicTransitions.get(transitionKey);
        
        if (knownTransition && knownTransition.phrases.length > 0) {
            return knownTransition.phrases[Math.floor(Math.random() * knownTransition.phrases.length)];
        }
        
        // Generic transition phrases
        const genericPhrases = [
            'That brings us to',
            'Speaking of that',
            'In relation to this',
            'This connects to',
            'Building on that thought'
        ];
        
        return genericPhrases[Math.floor(Math.random() * genericPhrases.length)];
    }
}

/**
 * Conversation Planner - Plans response strategies
 */
class ConversationPlanner {
    constructor() {
        this.strategies = new Map();
        this.initializeStrategies();
    }

    initializeStrategies() {
        this.strategies.set('information_seeking', {
            priority: 'accuracy',
            responseType: 'informative',
            depth: 'detailed',
            structure: 'logical'
        });
        
        this.strategies.set('problem_solving', {
            priority: 'helpfulness',
            responseType: 'solution_oriented',
            depth: 'step_by_step',
            structure: 'procedural'
        });
        
        this.strategies.set('analysis_request', {
            priority: 'insight',
            responseType: 'analytical',
            depth: 'comprehensive',
            structure: 'methodical'
        });
        
        this.strategies.set('casual_conversation', {
            priority: 'engagement',
            responseType: 'conversational',
            depth: 'moderate',
            structure: 'flexible'
        });
    }

    planResponse(planningContext) {
        const { input, context, memories, coherence, currentState } = planningContext;
        
        // Determine primary intent
        const primaryIntent = this.determinePrimaryIntent(input, currentState);
        
        // Select base strategy
        const baseStrategy = this.strategies.get(primaryIntent) || this.strategies.get('casual_conversation');
        
        // Adapt strategy based on context
        const adaptedStrategy = this.adaptStrategy(baseStrategy, {
            coherence,
            memories,
            conversationPhase: currentState.phase,
            userEngagement: this.estimateUserEngagement(context)
        });
        
        // Plan response structure
        const responseStructure = this.planResponseStructure(adaptedStrategy, planningContext);
        
        return {
            type: primaryIntent,
            ...adaptedStrategy,
            structure: responseStructure,
            nextTurnPrediction: this.predictNextTurn(planningContext),
            confidence: this.calculateStrategyConfidence(adaptedStrategy, planningContext)
        };
    }

    determinePrimaryIntent(input, currentState) {
        const text = input.toLowerCase();
        
        // URL analysis intent
        if (text.match(/https?:\/\//)) {
            return 'analysis_request';
        }
        
        // Question intent
        if (text.includes('?') || text.match(/^(what|how|why|when|where|who)/)) {
            return 'information_seeking';
        }
        
        // Problem solving intent
        if (text.match(/help|problem|issue|fix|solve/)) {
            return 'problem_solving';
        }
        
        // Analysis request intent
        if (text.match(/analyze|review|check|examine|look at/)) {
            return 'analysis_request';
        }
        
        return 'casual_conversation';
    }

    adaptStrategy(baseStrategy, adaptationContext) {
        const adapted = { ...baseStrategy };
        
        // Adapt based on coherence
        if (adaptationContext.coherence.score < 0.5) {
            adapted.priority = 'clarity';
            adapted.depth = 'simplified';
        }
        
        // Adapt based on conversation phase
        if (adaptationContext.conversationPhase === 'opening') {
            adapted.structure = 'welcoming';
        } else if (adaptationContext.conversationPhase === 'resolution') {
            adapted.structure = 'summarizing';
        }
        
        // Adapt based on available memories
        if (adaptationContext.memories.semantic.confidence > 0.8) {
            adapted.depth = 'comprehensive';
        }
        
        return adapted;
    }

    planResponseStructure(strategy, context) {
        const structure = {
            introduction: this.planIntroduction(strategy, context),
            body: this.planBody(strategy, context),
            conclusion: this.planConclusion(strategy, context)
        };
        
        return structure;
    }

    planIntroduction(strategy, context) {
        if (context.coherence.score < 0.6) {
            return { type: 'clarifying', approach: 'acknowledge_and_clarify' };
        } else if (strategy.responseType === 'analytical') {
            return { type: 'methodical', approach: 'state_analysis_approach' };
        } else {
            return { type: 'direct', approach: 'address_immediately' };
        }
    }

    planBody(strategy, context) {
        const bodyPlan = {
            structure: strategy.structure,
            depth: strategy.depth,
            sections: []
        };
        
        if (strategy.responseType === 'analytical') {
            bodyPlan.sections = ['context', 'analysis', 'insights', 'implications'];
        } else if (strategy.responseType === 'solution_oriented') {
            bodyPlan.sections = ['problem_understanding', 'solution_options', 'recommended_approach'];
        } else if (strategy.responseType === 'informative') {
            bodyPlan.sections = ['direct_answer', 'supporting_details', 'related_information'];
        } else {
            bodyPlan.sections = ['main_response', 'elaboration'];
        }
        
        return bodyPlan;
    }

    planConclusion(strategy, context) {
        if (strategy.responseType === 'solution_oriented') {
            return { type: 'action_oriented', approach: 'next_steps' };
        } else if (strategy.responseType === 'analytical') {
            return { type: 'summary', approach: 'key_takeaways' };
        } else {
            return { type: 'engaging', approach: 'invite_continuation' };
        }
    }

    predictNextTurn(context) {
        const predictions = [];
        
        // Based on current response type
        if (context.currentState.expectations.some(e => e.type === 'expects_answer')) {
            predictions.push({ type: 'follow_up_question', probability: 0.7 });
        }
        
        // Based on conversation phase
        if (context.currentState.phase === 'developing') {
            predictions.push({ type: 'topic_expansion', probability: 0.6 });
        }
        
        return predictions;
    }

    calculateStrategyConfidence(strategy, context) {
        let confidence = 0.8; // Base confidence
        
        // Adjust based on available information
        if (context.memories.semantic.confidence > 0.7) {
            confidence += 0.1;
        }
        
        // Adjust based on coherence
        confidence *= context.coherence.score;
        
        return Math.min(confidence, 1.0);
    }

    estimateUserEngagement(context) {
        // Simple engagement estimation (would be more sophisticated in production)
        const messageLength = context.lastUserMessage?.length || 0;
        const questionCount = (context.lastUserMessage?.match(/\?/g) || []).length;
        
        let engagement = 0.5; // Base engagement
        
        if (messageLength > 50) engagement += 0.2;
        if (questionCount > 0) engagement += 0.2;
        
        return Math.min(engagement, 1.0);
    }
}

/**
 * Coherence Tracker - Monitors conversation coherence
 */
class CoherenceTracker {
    constructor() {
        this.coherenceHistory = [];
        this.coherenceFactors = {
            topicContinuity: 0.3,
            semanticCohesion: 0.3,
            pragmaticCoherence: 0.2,
            referentialCoherence: 0.2
        };
    }

    analyzeCoherence(userInput, context) {
        const topicScore = this.assessTopicContinuity(userInput, context);
        const semanticScore = this.assessSemanticCohesion(userInput, context);
        const pragmaticScore = this.assessPragmaticCoherence(userInput, context);
        const referentialScore = this.assessReferentialCoherence(userInput, context);
        
        const overallScore = 
            topicScore * this.coherenceFactors.topicContinuity +
            semanticScore * this.coherenceFactors.semanticCohesion +
            pragmaticScore * this.coherenceFactors.pragmaticCoherence +
            referentialScore * this.coherenceFactors.referentialCoherence;
        
        const coherenceAnalysis = {
            score: overallScore,
            factors: {
                topicContinuity: topicScore,
                semanticCohesion: semanticScore,
                pragmaticCoherence: pragmaticScore,
                referentialCoherence: referentialScore
            },
            issues: this.identifyCoherenceIssues({
                topicScore,
                semanticScore,
                pragmaticScore,
                referentialScore
            }),
            recommendations: this.generateCoherenceRecommendations(overallScore)
        };
        
        this.coherenceHistory.push({
            timestamp: Date.now(),
            input: userInput,
            analysis: coherenceAnalysis
        });
        
        return coherenceAnalysis;
    }

    assessTopicContinuity(userInput, context) {
        if (!context.previousTopics || context.previousTopics.length === 0) {
            return 1.0; // Perfect continuity for first message
        }
        
        const currentTopics = this.extractTopics(userInput);
        const previousTopics = context.previousTopics.slice(-3); // Last 3 topics
        
        let continuityScore = 0;
        currentTopics.forEach(currentTopic => {
            const matchScore = previousTopics.reduce((max, prevTopic) => {
                return Math.max(max, this.calculateTopicSimilarity(currentTopic, prevTopic));
            }, 0);
            continuityScore = Math.max(continuityScore, matchScore);
        });
        
        return continuityScore;
    }

    assessSemanticCohesion(userInput, context) {
        // Simplified semantic cohesion - in production would use embeddings
        const currentWords = new Set(userInput.toLowerCase().split(/\s+/));
        const previousWords = new Set(
            (context.conversationHistory || [])
                .slice(-3)
                .join(' ')
                .toLowerCase()
                .split(/\s+/)
        );
        
        const intersection = new Set([...currentWords].filter(x => previousWords.has(x)));
        const union = new Set([...currentWords, ...previousWords]);
        
        return intersection.size / Math.max(union.size, 1);
    }

    assessPragmaticCoherence(userInput, context) {
        // Check if response is appropriate to conversation context
        let score = 0.8; // Default reasonable score
        
        // Check for abrupt topic changes without transition
        if (context.expectsAnswer && !this.isAnswerRelated(userInput, context.lastQuestion)) {
            score -= 0.3;
        }
        
        // Check for appropriate speech acts
        if (context.lastSystemCommitment && this.acknowledgesCommitment(userInput)) {
            score += 0.2;
        }
        
        return Math.max(0, Math.min(1, score));
    }

    assessReferentialCoherence(userInput, context) {
        // Check for proper reference resolution
        const pronouns = userInput.match(/\b(it|they|them|this|that|these|those)\b/gi) || [];
        const hasReferents = context.recentEntities && context.recentEntities.length > 0;
        
        if (pronouns.length === 0) {
            return 1.0; // No pronouns to resolve
        }
        
        if (hasReferents) {
            return 0.9; // Good referential context
        } else {
            return 0.3; // Poor referential context
        }
    }

    extractTopics(text) {
        // Simplified topic extraction
        const businessTerms = ['business', 'revenue', 'profit', 'sales', 'customer'];
        const techTerms = ['website', 'SEO', 'analytics', 'technology'];
        
        const topics = [];
        businessTerms.forEach(term => {
            if (text.toLowerCase().includes(term)) {
                topics.push({ name: 'business', strength: 0.8 });
            }
        });
        
        techTerms.forEach(term => {
            if (text.toLowerCase().includes(term)) {
                topics.push({ name: 'technology', strength: 0.8 });
            }
        });
        
        return topics;
    }

    calculateTopicSimilarity(topic1, topic2) {
        // Simple topic similarity (would be more sophisticated in production)
        if (topic1.name === topic2.name) {
            return 1.0;
        }
        
        const relatedTopics = {
            'business': ['analytics', 'performance'],
            'technology': ['website', 'digital']
        };
        
        const related = relatedTopics[topic1.name] || [];
        return related.includes(topic2.name) ? 0.6 : 0.1;
    }

    isAnswerRelated(userInput, lastQuestion) {
        // Check if user input relates to the last question asked
        if (!lastQuestion) return true;
        
        const questionWords = new Set(lastQuestion.toLowerCase().split(/\s+/));
        const answerWords = new Set(userInput.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...questionWords].filter(x => answerWords.has(x)));
        return intersection.size > 0;
    }

    acknowledgesCommitment(userInput) {
        const acknowledgmentWords = ['thanks', 'thank you', 'ok', 'okay', 'yes', 'sure'];
        return acknowledgmentWords.some(word => userInput.toLowerCase().includes(word));
    }

    identifyCoherenceIssues(scores) {
        const issues = [];
        
        if (scores.topicScore < 0.4) {
            issues.push({ type: 'topic_discontinuity', severity: 'high' });
        }
        
        if (scores.semanticScore < 0.3) {
            issues.push({ type: 'semantic_disconnect', severity: 'medium' });
        }
        
        if (scores.pragmaticScore < 0.5) {
            issues.push({ type: 'pragmatic_mismatch', severity: 'medium' });
        }
        
        if (scores.referentialScore < 0.4) {
            issues.push({ type: 'unclear_references', severity: 'low' });
        }
        
        return issues;
    }

    generateCoherenceRecommendations(overallScore) {
        const recommendations = [];
        
        if (overallScore < 0.5) {
            recommendations.push('Consider acknowledging the topic shift explicitly');
            recommendations.push('Ask for clarification to maintain coherence');
        } else if (overallScore < 0.7) {
            recommendations.push('Use transitional phrases to improve flow');
        } else {
            recommendations.push('Maintain current coherence level');
        }
        
        return recommendations;
    }
}

/**
 * Response Generator - Generates coherent responses
 */
class ResponseGenerator {
    constructor() {
        this.templateLibrary = new ResponseTemplateLibrary();
        this.rhetoricManager = new RhetoricManager();
    }

    generateResponse(generationContext) {
        const { strategy, topicPlan, memories, coherence, context } = generationContext;
        
        // Select response template
        const template = this.templateLibrary.selectTemplate(strategy, topicPlan);
        
        // Generate content for each section
        const content = this.generateContent(template, generationContext);
        
        // Apply rhetorical enhancements
        const enhanced = this.rhetoricManager.enhance(content, strategy, coherence);
        
        // Calculate response confidence
        const confidence = this.calculateResponseConfidence(enhanced, generationContext);
        
        return {
            content: enhanced.text,
            strategy: strategy.type,
            confidence,
            commitments: enhanced.commitments || [],
            metadata: {
                template: template.name,
                rhetoricDevices: enhanced.devices,
                coherenceAlignment: coherence.score
            }
        };
    }

    generateContent(template, context) {
        const sections = {};
        
        template.sections.forEach(section => {
            sections[section.name] = this.generateSection(section, context);
        });
        
        return {
            sections,
            fullText: this.assembleResponse(sections, template)
        };
    }

    generateSection(section, context) {
        switch (section.name) {
            case 'introduction':
                return this.generateIntroduction(section, context);
            case 'analysis':
                return this.generateAnalysis(section, context);
            case 'insights':
                return this.generateInsights(section, context);
            case 'conclusion':
                return this.generateConclusion(section, context);
            default:
                return this.generateGenericSection(section, context);
        }
    }

    generateIntroduction(section, context) {
        if (context.topicPlan.transition) {
            const transitionPhrase = context.topicPlan.suggestedTransitionPhrase || 'Speaking of that';
            return `${transitionPhrase}, let me address your ${context.strategy.responseType} request.`;
        } else {
            return "I'd be happy to help with that.";
        }
    }

    generateAnalysis(section, context) {
        const knowledge = context.memories.semantic;
        const procedures = context.memories.procedural;
        
        let analysis = "Based on my analysis";
        
        if (knowledge.confidence > 0.7) {
            analysis += " and relevant knowledge";
        }
        
        if (procedures.success_rate > 0.8) {
            analysis += " following proven methodologies";
        }
        
        return analysis + ", here's what I found:";
    }

    generateInsights(section, context) {
        const insights = [];
        
        // Add insights based on available knowledge
        if (context.memories.semantic.facts.length > 0) {
            insights.push("The data suggests several key patterns");
        }
        
        if (context.memories.episodic.length > 0) {
            insights.push("Building on our previous discussions");
        }
        
        return insights.join('. ') || "Here are the key insights:";
    }

    generateConclusion(section, context) {
        if (context.strategy.responseType === 'solution_oriented') {
            return "Would you like me to elaborate on any of these recommendations?";
        } else if (context.strategy.responseType === 'analytical') {
            return "Let me know if you'd like me to dive deeper into any aspect of this analysis.";
        } else {
            return "Is there anything specific you'd like to explore further?";
        }
    }

    generateGenericSection(section, context) {
        return `[Generated content for ${section.name}]`;
    }

    assembleResponse(sections, template) {
        return template.sections
            .map(section => sections[section.name])
            .filter(text => text && text.trim())
            .join(' ');
    }

    calculateResponseConfidence(enhanced, context) {
        let confidence = 0.7; // Base confidence
        
        // Adjust based on strategy confidence
        confidence *= context.strategy.confidence || 1.0;
        
        // Adjust based on coherence
        confidence *= context.coherence.score;
        
        // Adjust based on available knowledge
        if (context.memories.semantic.confidence > 0.8) {
            confidence += 0.1;
        }
        
        return Math.min(confidence, 1.0);
    }
}

/**
 * Response Template Library - Templates for different response types
 */
class ResponseTemplateLibrary {
    constructor() {
        this.templates = new Map();
        this.initializeTemplates();
    }

    initializeTemplates() {
        this.templates.set('analytical', {
            name: 'analytical',
            sections: [
                { name: 'introduction', required: true },
                { name: 'analysis', required: true },
                { name: 'insights', required: true },
                { name: 'conclusion', required: false }
            ]
        });
        
        this.templates.set('solution_oriented', {
            name: 'solution_oriented',
            sections: [
                { name: 'introduction', required: true },
                { name: 'problem_understanding', required: true },
                { name: 'solution_options', required: true },
                { name: 'conclusion', required: true }
            ]
        });
        
        this.templates.set('informative', {
            name: 'informative',
            sections: [
                { name: 'introduction', required: false },
                { name: 'direct_answer', required: true },
                { name: 'supporting_details', required: false },
                { name: 'conclusion', required: false }
            ]
        });
    }

    selectTemplate(strategy, topicPlan) {
        const templateName = strategy.responseType;
        return this.templates.get(templateName) || this.templates.get('informative');
    }
}

/**
 * Rhetoric Manager - Enhances responses with rhetorical devices
 */
class RhetoricManager {
    constructor() {
        this.devices = {
            'clarity': ['parallel_structure', 'enumeration', 'definition'],
            'engagement': ['rhetorical_question', 'anecdote', 'example'],
            'persuasion': ['evidence', 'analogy', 'authority'],
            'connection': ['transition', 'bridge', 'reference']
        };
    }

    enhance(content, strategy, coherence) {
        let enhanced = { ...content };
        const devices = [];
        
        // Apply devices based on strategy
        if (strategy.priority === 'clarity' && coherence.score < 0.7) {
            enhanced = this.applyClarity(enhanced);
            devices.push('clarity_enhancement');
        }
        
        if (strategy.priority === 'engagement') {
            enhanced = this.applyEngagement(enhanced);
            devices.push('engagement_enhancement');
        }
        
        return {
            ...enhanced,
            devices
        };
    }

    applyClarity(content) {
        // Add clarity enhancements
        return {
            ...content,
            text: content.fullText.replace(/\. /g, '. Additionally, ')
        };
    }

    applyEngagement(content) {
        // Add engagement enhancements
        return {
            ...content,
            text: content.fullText + ' What are your thoughts on this?'
        };
    }
}

module.exports = {
    DialogueManager,
    DialogueState,
    TopicManager,
    ConversationPlanner,
    CoherenceTracker,
    ResponseGenerator,
    ResponseTemplateLibrary,
    RhetoricManager
};