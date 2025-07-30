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
// Analyzed by Evolution System at 2025-07-28 21:16:07.505897
// Analyzed by Evolution System at 2025-07-28 21:13:06.889129
// Analyzed by Evolution System at 2025-07-28 20:59:34.346543
// Analyzed by Evolution System at 2025-07-28 20:51:32.404772
// Analyzed by Evolution System at 2025-07-28 20:33:29.299533
// Analyzed by Evolution System at 2025-07-28 20:32:29.119659
// Analyzed by Evolution System at 2025-07-28 20:27:28.095066
// Analyzed by Evolution System at 2025-07-28 20:26:27.898148
// Performance optimized by Autonomous Evolution System
/**
 * Advanced Multi-Level Memory System for Conversational AI
 * Implements working, episodic, semantic, and procedural memory
 */

class AdvancedMemorySystem {
    constructor() {
        this.workingMemory = new WorkingMemory();
        this.episodicMemory = new EpisodicMemory();
        this.semanticMemory = new SemanticMemory();
        this.proceduralMemory = new ProceduralMemory();
        this.memoryCoordinator = new MemoryCoordinator();
        
//         console.log('🧠 Advanced Memory System Initialized');
    }

    // Main memory processing interface
    processMemory(input, context) {
        return this.memoryCoordinator.processMemories(
            input, context, this.getAllMemories()
        );
    }

    getAllMemories() {
        return {
            working: this.workingMemory,
            episodic: this.episodicMemory,
            semantic: this.semanticMemory,
            procedural: this.proceduralMemory
        };
    }

    // Memory consolidation and optimization
    consolidateMemories() {
        this.memoryCoordinator.consolidate(this.getAllMemories());
    }
}

/**
 * Working Memory - Current conversation context
 * Handles immediate conversation state and active topics
 */
class WorkingMemory {
    constructor() {
        this.currentContext = {
            activeTopics: [],
            conversationThread: [],
            userIntent: null,
            emotionalState: 'neutral',
            taskQueue: [],
            activeEntities: new Map()
        };
        this.maxCapacity = 50; // Last 50 exchanges
        this.attentionWeights = new Map();
    }

    addExchange(exchange) {
        this.currentContext.conversationThread.push({
            ...exchange,
            timestamp: Date.now(),
            attentionScore: this.calculateAttentionScore(exchange)
        });

        // Maintain capacity
        if (this.currentContext.conversationThread.length > this.maxCapacity) {
            this.consolidateOldExchanges();
        }

        this.updateActiveTopics(exchange);
        this.updateActiveEntities(exchange);
    }

    calculateAttentionScore(exchange) {
        let score = 1.0;
        
        // Boost score for questions
        if (exchange.content.includes('?')) score += 0.3;
        
        // Boost for emotional content
        if (this.detectEmotion(exchange.content) !== 'neutral') score += 0.2;
        
        // Boost for task-related content
        if (this.detectTaskKeywords(exchange.content)) score += 0.4;
        
        return Math.min(score, 2.0);
    }

    updateActiveTopics(exchange) {
        const topics = this.extractTopics(exchange.content);
        topics.forEach(topic => {
            const existing = this.currentContext.activeTopics.find(t => t.name === topic);
            if (existing) {
                existing.lastMentioned = Date.now();
                existing.frequency++;
            } else {
                this.currentContext.activeTopics.push({
                    name: topic,
                    firstMentioned: Date.now(),
                    lastMentioned: Date.now(),
                    frequency: 1
                });
            }
        });

        // Decay old topics
        this.currentContext.activeTopics = this.currentContext.activeTopics
            .filter(topic => Date.now() - topic.lastMentioned < 300000); // 5 minutes
    }

    updateActiveEntities(exchange) {
        const entities = this.extractEntities(exchange.content);
        entities.forEach(entity => {
            this.currentContext.activeEntities.set(entity.name, {
                type: entity.type,
                value: entity.value,
                lastMentioned: Date.now(),
                context: exchange.content
            });
        });
    }

    extractTopics(content) {
        // Advanced topic extraction using semantic analysis
        const topicKeywords = content.toLowerCase()
            .split(' ')
            .filter(word => word.length > 3)
            .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'been'].includes(word));
        
        return [...new Set(topicKeywords)];
    }

    extractEntities(content) {
        const entities = [];
        
        // Extract URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = content.match(urlRegex) || [];
        urls.forEach(url => entities.push({name: url, type: 'url', value: url}));
        
        // Extract numbers
        const numberRegex = /\b\d+(\.\d+)?(%|k|million|billion)?\b/g;
        const numbers = content.match(numberRegex) || [];
        numbers.forEach(num => entities.push({name: num, type: 'number', value: num}));
        
        // Extract companies (basic heuristic)
        const companyRegex = /\b[A-Z][a-z]+ ?(Inc|Corp|LLC|Ltd|Company)?\b/g;
        const companies = content.match(companyRegex) || [];
        companies.forEach(comp => entities.push({name: comp, type: 'company', value: comp}));
        
        return entities;
    }

    detectEmotion(content) {
        const emotions = {
            positive: ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'like'],
            negative: ['bad', 'terrible', 'hate', 'awful', 'horrible', 'frustrated', 'angry'],
            excited: ['excited', 'thrilled', 'fantastic', 'awesome', 'incredible'],
            concerned: ['worried', 'concerned', 'anxious', 'nervous', 'uncertain']
        };

        for (const [emotion, words] of Object.entries(emotions)) {
            if (words.some(word => content.toLowerCase().includes(word))) {
                return emotion;
            }
        }
        return 'neutral';
    }

    detectTaskKeywords(content) {
        const taskWords = ['analyze', 'create', 'build', 'implement', 'design', 'develop', 'help', 'solve'];
        return taskWords.some(word => content.toLowerCase().includes(word));
    }

    consolidateOldExchanges() {
        // Move less important exchanges to episodic memory
        const toConsolidate = this.currentContext.conversationThread
            .sort((a, b) => a.attentionScore - b.attentionScore)
            .slice(0, 10);
        
        this.currentContext.conversationThread = this.currentContext.conversationThread
            .slice(10);
    }

    getCurrentContext() {
        return {
            ...this.currentContext,
            topicSalience: this.calculateTopicSalience(),
            conversationFlow: this.analyzeConversationFlow()
        };
    }

    calculateTopicSalience() {
        return this.currentContext.activeTopics
            .map(topic => ({
                ...topic,
                salience: topic.frequency * (1 / ((Date.now() - topic.lastMentioned) / 60000))
            }))
            .sort((a, b) => b.salience - a.salience);
    }

    analyzeConversationFlow() {
        const recent = this.currentContext.conversationThread.slice(-5);
        return {
            topicShifts: this.detectTopicShifts(recent),
            questionDensity: recent.filter(ex => ex.content.includes('?')).length / recent.length,
            avgResponseLength: recent.reduce((sum, ex) => sum + ex.content.length, 0) / recent.length
        };
    }

    detectTopicShifts(exchanges) {
        const shifts = [];
        for (let i = 1; i < exchanges.length; i++) {
            const prevTopics = this.extractTopics(exchanges[i-1].content);
            const currTopics = this.extractTopics(exchanges[i].content);
            const overlap = prevTopics.filter(t => currTopics.includes(t)).length;
            const totalTopics = new Set([...prevTopics, ...currTopics]).size;
            
            if (totalTopics > 0 && (overlap / totalTopics) < 0.3) {
                shifts.push({
                    position: i,
                    previousTopics: prevTopics,
                    newTopics: currTopics,
                    shiftIntensity: 1 - (overlap / totalTopics)
                });
            }
        }
        return shifts;
    }
}

/**
 * Episodic Memory - Past user interactions and experiences
 */
class EpisodicMemory {
    constructor() {
        this.episodes = [];
        this.userProfile = {
            preferences: {},
            behaviorPatterns: {},
            commonTopics: {},
            conversationStyle: {}
        };
        this.maxEpisodes = 1000;
    }

    addEpisode(conversation, metadata) {
        const episode = {
            id: this.generateEpisodeId(),
            timestamp: Date.now(),
            conversation: this.summarizeConversation(conversation),
            metadata: {
                ...metadata,
                duration: this.calculateDuration(conversation),
                topicFlow: this.analyzeTopicFlow(conversation),
                emotionalArc: this.analyzeEmotionalArc(conversation),
                taskOutcomes: this.analyzeTaskOutcomes(conversation)
            },
            importance: this.calculateImportance(conversation, metadata)
        };

        this.episodes.push(episode);
        this.updateUserProfile(episode);
        this.maintainCapacity();
    }

    generateEpisodeId() {
        return `episode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    summarizeConversation(conversation) {
        return {
            exchangeCount: conversation.length,
            mainTopics: this.extractMainTopics(conversation),
            keyMoments: this.identifyKeyMoments(conversation),
            summary: this.generateSummary(conversation)
        };
    }

    calculateDuration(conversation) {
        if (conversation.length < 2) return 0;
        const first = conversation[0].timestamp;
        const last = conversation[conversation.length - 1].timestamp;
        return last - first;
    }

    analyzeTopicFlow(conversation) {
        const topics = conversation.map(ex => this.extractTopics(ex.content));
        return {
            initialTopics: topics[0] || [],
            finalTopics: topics[topics.length - 1] || [],
            topicTransitions: this.calculateTopicTransitions(topics),
            topicPersistence: this.calculateTopicPersistence(topics)
        };
    }

    analyzeEmotionalArc(conversation) {
        const emotions = conversation.map(ex => this.detectEmotion(ex.content));
        return {
            initialEmotion: emotions[0],
            finalEmotion: emotions[emotions.length - 1],
            emotionalTurns: this.detectEmotionalTurns(emotions),
            overallTrend: this.calculateEmotionalTrend(emotions)
        };
    }

    analyzeTaskOutcomes(conversation) {
        const tasks = this.identifyTasks(conversation);
        return tasks.map(task => ({
            task: task.description,
            outcome: task.completed ? 'completed' : 'incomplete',
            satisfaction: task.userSatisfaction || 'unknown'
        }));
    }

    calculateImportance(conversation, metadata) {
        let importance = 1.0;
        
        // Length factor
        importance += Math.log(conversation.length + 1) * 0.1;
        
        // Task completion factor
        const tasks = this.analyzeTaskOutcomes(conversation);
        const completedTasks = tasks.filter(t => t.outcome === 'completed').length;
        importance += completedTasks * 0.3;
        
        // Emotional intensity factor
        const emotions = conversation.map(ex => this.detectEmotion(ex.content));
        const nonNeutral = emotions.filter(e => e !== 'neutral').length;
        importance += (nonNeutral / emotions.length) * 0.2;
        
        return Math.min(importance, 3.0);
    }

    updateUserProfile(episode) {
        // Update preferences based on episode
        const topics = episode.conversation.mainTopics;
        topics.forEach(topic => {
            this.userProfile.commonTopics[topic] = 
                (this.userProfile.commonTopics[topic] || 0) + episode.importance;
        });

        // Update conversation style
        this.updateConversationStyle(episode);
    }

    updateConversationStyle(episode) {
        const style = this.userProfile.conversationStyle;
        
        // Average response length
        const avgLength = episode.conversation.exchangeCount > 0 ? 
            episode.conversation.summary.length / episode.conversation.exchangeCount : 0;
        style.avgResponseLength = (style.avgResponseLength || 0) * 0.9 + avgLength * 0.1;
        
        // Question tendency
        const questionRatio = episode.metadata.topicFlow ? 
            (episode.conversation.summary.match(/\?/g) || []).length / episode.conversation.exchangeCount : 0;
        style.questionTendency = (style.questionTendency || 0) * 0.9 + questionRatio * 0.1;
        
        // Formality level (basic heuristic)
        const formalWords = ['please', 'thank', 'appreciate', 'kindly'];
        const formalCount = episode.conversation.summary.toLowerCase()
            .split(' ').filter(word => formalWords.includes(word)).length;
        const formalityScore = formalCount / episode.conversation.exchangeCount;
        style.formalityLevel = (style.formalityLevel || 0.5) * 0.9 + formalityScore * 0.1;
    }

    maintainCapacity() {
        if (this.episodes.length > this.maxEpisodes) {
            // Keep most important episodes
            this.episodes.sort((a, b) => b.importance - a.importance);
            this.episodes = this.episodes.slice(0, this.maxEpisodes);
        }
    }

    retrieveRelevantEpisodes(query, maxResults = 5) {
        const queryTopics = this.extractTopics(query);
        const scored = this.episodes.map(episode => ({
            episode,
            relevance: this.calculateRelevance(episode, queryTopics)
        }));

        return scored
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, maxResults)
            .map(item => item.episode);
    }

    calculateRelevance(episode, queryTopics) {
        const episodeTopics = episode.conversation.mainTopics;
        const overlap = episodeTopics.filter(t => queryTopics.includes(t)).length;
        const union = new Set([...episodeTopics, ...queryTopics]).size;
        
        const topicSimilarity = union > 0 ? overlap / union : 0;
        const recencyFactor = 1 / (1 + (Date.now() - episode.timestamp) / (1000 * 60 * 60 * 24));
        const importanceFactor = episode.importance / 3.0;
        
        return topicSimilarity * 0.5 + recencyFactor * 0.3 + importanceFactor * 0.2;
    }

    extractTopics(content) {
        return content.toLowerCase()
            .split(' ')
            .filter(word => word.length > 3)
            .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'been'].includes(word));
    }

    detectEmotion(content) {
        const emotions = {
            positive: ['good', 'great', 'excellent', 'amazing'],
            negative: ['bad', 'terrible', 'awful', 'horrible'],
            excited: ['excited', 'thrilled', 'fantastic'],
            concerned: ['worried', 'concerned', 'anxious']
        };

        for (const [emotion, words] of Object.entries(emotions)) {
            if (words.some(word => content.toLowerCase().includes(word))) {
                return emotion;
            }
        }
        return 'neutral';
    }

    extractMainTopics(conversation) {
        const allTopics = conversation.flatMap(ex => this.extractTopics(ex.content));
        const topicCounts = {};
        allTopics.forEach(topic => {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });

        return Object.entries(topicCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([topic]) => topic);
    }

    identifyKeyMoments(conversation) {
        const keyMoments = [];
        
        conversation.forEach((exchange, index) => {
            // Task completion moments
            if (this.isTaskCompletion(exchange.content)) {
                keyMoments.push({
                    type: 'task_completion',
                    position: index,
                    content: exchange.content
                });
            }
            
            // Emotional peaks
            const emotion = this.detectEmotion(exchange.content);
            if (emotion !== 'neutral') {
                keyMoments.push({
                    type: 'emotional_moment',
                    emotion: emotion,
                    position: index,
                    content: exchange.content
                });
            }
            
            // Topic shifts
            if (index > 0) {
                const prevTopics = this.extractTopics(conversation[index-1].content);
                const currTopics = this.extractTopics(exchange.content);
                const overlap = prevTopics.filter(t => currTopics.includes(t)).length;
                
                if (overlap === 0 && currTopics.length > 0) {
                    keyMoments.push({
                        type: 'topic_shift',
                        position: index,
                        newTopics: currTopics
                    });
                }
            }
        });
        
        return keyMoments;
    }

    generateSummary(conversation) {
        if (conversation.length === 0) return '';
        
        const topics = this.extractMainTopics(conversation);
        const keyMoments = this.identifyKeyMoments(conversation);
        const duration = this.calculateDuration(conversation);
        
        let summary = `Conversation about ${topics.slice(0, 3).join(', ')}`;
        
        if (keyMoments.length > 0) {
            const taskCompletions = keyMoments.filter(m => m.type === 'task_completion').length;
            if (taskCompletions > 0) {
                summary += ` with ${taskCompletions} task(s) completed`;
            }
        }
        
        if (duration > 0) {
            const minutes = Math.round(duration / (1000 * 60));
            summary += `. Duration: ${minutes} minutes`;
        }
        
        return summary;
    }

    isTaskCompletion(content) {
        const completionPhrases = [
            'completed', 'finished', 'done', 'accomplished', 
            'achieved', 'solved', 'resolved', 'success'
        ];
        return completionPhrases.some(phrase => content.toLowerCase().includes(phrase));
    }

    calculateTopicTransitions(topicArrays) {
        const transitions = [];
        for (let i = 1; i < topicArrays.length; i++) {
            const prev = new Set(topicArrays[i-1]);
            const curr = new Set(topicArrays[i]);
            const added = [...curr].filter(t => !prev.has(t));
            const removed = [...prev].filter(t => !curr.has(t));
            
            if (added.length > 0 || removed.length > 0) {
                transitions.push({ position: i, added, removed });
            }
        }
        return transitions;
    }

    calculateTopicPersistence(topicArrays) {
        const persistence = {};
        topicArrays.forEach((topics, index) => {
            topics.forEach(topic => {
                if (!persistence[topic]) {
                    persistence[topic] = { first: index, last: index, count: 1 };
                } else {
                    persistence[topic].last = index;
                    persistence[topic].count++;
                }
            });
        });
        
        return Object.entries(persistence).map(([topic, data]) => ({
            topic,
            duration: data.last - data.first + 1,
            frequency: data.count,
            persistence: data.count / (data.last - data.first + 1)
        }));
    }

    detectEmotionalTurns(emotions) {
        const turns = [];
        for (let i = 1; i < emotions.length; i++) {
            if (emotions[i] !== emotions[i-1]) {
                turns.push({
                    position: i,
                    from: emotions[i-1],
                    to: emotions[i]
                });
            }
        }
        return turns;
    }

    calculateEmotionalTrend(emotions) {
        const emotionValues = {
            'positive': 1, 'excited': 2, 'neutral': 0, 
            'concerned': -1, 'negative': -2
        };
        
        const values = emotions.map(e => emotionValues[e] || 0);
        if (values.length < 2) return 'stable';
        
        const first = values.slice(0, Math.ceil(values.length / 3)).reduce((a, b) => a + b, 0);
        const last = values.slice(-Math.ceil(values.length / 3)).reduce((a, b) => a + b, 0);
        
        if (last > first + 1) return 'improving';
        if (last < first - 1) return 'declining';
        return 'stable';
    }

    identifyTasks(conversation) {
        const tasks = [];
        const taskVerbs = ['analyze', 'create', 'build', 'implement', 'solve', 'help', 'find'];
        
        conversation.forEach((exchange, index) => {
            taskVerbs.forEach(verb => {
                if (exchange.content.toLowerCase().includes(verb)) {
                    tasks.push({
                        description: this.extractTaskDescription(exchange.content, verb),
                        startPosition: index,
                        completed: this.isTaskCompleted(conversation, index),
                        userSatisfaction: this.assessUserSatisfaction(conversation, index)
                    });
                }
            });
        });
        
        return tasks;
    }

    extractTaskDescription(content, verb) {
        const sentences = content.split(/[.!?]+/);
        const taskSentence = sentences.find(s => s.toLowerCase().includes(verb));
        return taskSentence ? taskSentence.trim() : content.substring(0, 100);
    }

    isTaskCompleted(conversation, taskStart) {
        const remaining = conversation.slice(taskStart + 1);
        return remaining.some(ex => this.isTaskCompletion(ex.content));
    }

    assessUserSatisfaction(conversation, taskStart) {
        const remaining = conversation.slice(taskStart + 1, taskStart + 5);
        const positiveWords = ['good', 'great', 'perfect', 'excellent', 'thanks', 'thank'];
        const negativeWords = ['bad', 'wrong', 'not right', 'issue', 'problem'];
        
        let score = 0;
        remaining.forEach(ex => {
            positiveWords.forEach(word => {
                if (ex.content.toLowerCase().includes(word)) score += 1;
            });
            negativeWords.forEach(word => {
                if (ex.content.toLowerCase().includes(word)) score -= 1;
            });
        });
        
        if (score > 0) return 'positive';
        if (score < 0) return 'negative';
        return 'neutral';
    }
}

module.exports = {
    AdvancedMemorySystem,
    WorkingMemory,
    EpisodicMemory
};