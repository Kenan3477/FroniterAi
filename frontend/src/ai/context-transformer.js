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
// Analyzed by Evolution System at 2025-07-28 21:16:37.661548
// Analyzed by Evolution System at 2025-07-28 21:02:34.946752
// Analyzed by Evolution System at 2025-07-28 20:59:04.220954
// Analyzed by Evolution System at 2025-07-28 20:46:31.608300
// Analyzed by Evolution System at 2025-07-28 20:45:31.395033
// Analyzed by Evolution System at 2025-07-28 20:44:31.193249
// Analyzed by Evolution System at 2025-07-28 20:42:00.770114
// Analyzed by Evolution System at 2025-07-28 20:37:30.011892
// Analyzed by Evolution System at 2025-07-28 20:31:28.923615
// Analyzed by Evolution System at 2025-07-28 20:30:58.768444
// Performance optimized by Autonomous Evolution System
/**
 * Context-Aware Transformer Architecture
 * Extended context processing with 100,000+ token support
 */

class ContextAwareTransformer {
    constructor() {
        this.maxContextLength = 100000; // 100K token context window
        this.contextLayers = new ContextLayers();
        this.attentionMechanism = new ExtendedAttentionMechanism();
        this.memoryIntegration = new MemoryIntegrationLayer();
        this.contextCompression = new ContextCompression();
        
        this.currentContext = new ExtendedContext();
        this.processingState = 'ready';
        
//         console.log('🧠 Context-Aware Transformer Initialized with 100K+ token support');
    }

    processInput(input, memories, dialogueState) {
        this.processingState = 'processing';
        
        try {
            // Update extended context
            this.currentContext.addInput(input, {
                timestamp: Date.now(),
                memoryState: memories,
                dialoguePhase: dialogueState.conversationPhase,
                turn: dialogueState.currentTurn
            });
            
            // Process through context layers
            const layeredContext = this.contextLayers.process(this.currentContext, memories);
            
            // Apply extended attention
            const attentionOutput = this.attentionMechanism.attend(layeredContext, input);
            
            // Integrate memory systems
            const memoryIntegratedOutput = this.memoryIntegration.integrate(
                attentionOutput,
                memories,
                this.currentContext
            );
            
            // Manage context length
            const managedContext = this.contextCompression.manage(
                memoryIntegratedOutput,
                this.maxContextLength
            );
            
            this.processingState = 'ready';
            
            return {
                processedContext: managedContext,
                attentionWeights: attentionOutput.weights,
                memoryActivations: memoryIntegratedOutput.activations,
                contextMetrics: this.calculateContextMetrics(managedContext),
                recommendations: this.generateProcessingRecommendations(managedContext)
            };
        } catch (error) {
            this.processingState = 'error';
            console.error('Transformer processing error:', error);
            throw error;
        }
    }

    calculateContextMetrics(context) {
        return {
            totalTokens: context.totalTokens,
            activeMemoryConnections: context.memoryConnections.size,
            attentionSpread: context.attentionDistribution.entropy,
            contextCoherence: context.coherenceScore,
            memoryUtilization: context.memoryUtilization,
            processingEfficiency: this.calculateEfficiency(context)
        };
    }

    calculateEfficiency(context) {
        const tokenRatio = context.activeTokens / context.totalTokens;
        const memoryRatio = context.activeMemoryConnections / context.totalMemoryConnections;
        return (tokenRatio + memoryRatio) / 2;
    }

    generateProcessingRecommendations(context) {
        const recommendations = [];
        
        if (context.totalTokens > this.maxContextLength * 0.9) {
            recommendations.push('Consider context compression for optimal performance');
        }
        
        if (context.coherenceScore < 0.6) {
            recommendations.push('Enhance context coherence through memory integration');
        }
        
        if (context.memoryUtilization < 0.4) {
            recommendations.push('Increase memory system utilization for richer responses');
        }
        
        return recommendations;
    }
}

/**
 * Extended Context - Manages large context windows
 */
class ExtendedContext {
    constructor() {
        this.contextHistory = [];
        this.tokenCount = 0;
        this.memoryConnections = new Map();
        this.attentionDistribution = new AttentionDistribution();
        this.coherenceTracker = new ContextCoherenceTracker();
        
        // Context segments for efficient processing
        this.segments = {
            immediate: [], // Last few turns
            recent: [],    // Recent conversation
            episodic: [],  // Important past conversations
            semantic: []   // Background knowledge
        };
        
        this.segmentLimits = {
            immediate: 5000,  // 5K tokens
            recent: 15000,    // 15K tokens
            episodic: 30000,  // 30K tokens
            semantic: 50000   // 50K tokens
        };
    }

    addInput(input, metadata) {
        const contextEntry = {
            id: this.generateContextId(),
            content: input,
            tokens: this.estimateTokens(input),
            timestamp: metadata.timestamp,
            metadata,
            segment: 'immediate',
            importance: this.calculateImportance(input, metadata),
            connections: this.findConnections(input)
        };
        
        this.contextHistory.push(contextEntry);
        this.tokenCount += contextEntry.tokens;
        
        // Update segments
        this.updateSegments(contextEntry);
        
        // Update coherence
        this.coherenceTracker.updateCoherence(contextEntry, this.contextHistory);
        
        // Manage memory connections
        this.updateMemoryConnections(contextEntry);
    }

    generateContextId() {
        return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    estimateTokens(text) {
        // Rough token estimation (4 characters per token average)
        return Math.ceil(text.length / 4);
    }

    calculateImportance(input, metadata) {
        let importance = 0.5; // Base importance
        
        // Boost for questions
        if (input.includes('?')) importance += 0.2;
        
        // Boost for URLs (high value content)
        if (input.match(/https?:\/\//)) importance += 0.3;
        
        // Boost for specific business terms
        if (input.match(/revenue|profit|growth|analytics/i)) importance += 0.2;
        
        // Boost based on dialogue phase
        if (metadata.dialoguePhase === 'climax') importance += 0.1;
        
        return Math.min(importance, 1.0);
    }

    findConnections(input) {
        const connections = [];
        
        // Find connections to previous context
        this.contextHistory.slice(-10).forEach(entry => {
            const similarity = this.calculateSimilarity(input, entry.content);
            if (similarity > 0.3) {
                connections.push({
                    targetId: entry.id,
                    similarity,
                    type: 'contextual'
                });
            }
        });
        
        return connections;
    }

    calculateSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }

    updateSegments(contextEntry) {
        // Add to immediate segment
        this.segments.immediate.push(contextEntry);
        
        // Manage segment sizes
        this.manageSegmentSize('immediate');
        this.promoteContextEntries();
    }

    manageSegmentSize(segmentName) {
        const segment = this.segments[segmentName];
        const limit = this.segmentLimits[segmentName];
        
        let totalTokens = segment.reduce((sum, entry) => sum + entry.tokens, 0);
        
        while (totalTokens > limit && segment.length > 0) {
            const removed = segment.shift();
            totalTokens -= removed.tokens;
            
            // Promote important entries to next segment
            if (removed.importance > 0.7) {
                this.promoteEntry(removed, segmentName);
            }
        }
    }

    promoteContextEntries() {
        // Promote from immediate to recent
        const toPromote = this.segments.immediate.filter(entry => 
            entry.importance > 0.6 && 
            Date.now() - entry.timestamp > 5 * 60 * 1000 // 5 minutes old
        );
        
        toPromote.forEach(entry => {
            this.segments.immediate = this.segments.immediate.filter(e => e.id !== entry.id);
            entry.segment = 'recent';
            this.segments.recent.push(entry);
        });
        
        this.manageSegmentSize('recent');
    }

    promoteEntry(entry, fromSegment) {
        const promotionMap = {
            immediate: 'recent',
            recent: 'episodic',
            episodic: 'semantic'
        };
        
        const targetSegment = promotionMap[fromSegment];
        if (targetSegment) {
            entry.segment = targetSegment;
            this.segments[targetSegment].push(entry);
            this.manageSegmentSize(targetSegment);
        }
    }

    updateMemoryConnections(contextEntry) {
        contextEntry.connections.forEach(connection => {
            this.memoryConnections.set(connection.targetId, {
                ...connection,
                sourceId: contextEntry.id,
                strength: connection.similarity
            });
        });
    }

    getActiveContext(maxTokens) {
        const activeContext = [];
        let totalTokens = 0;
        
        // Prioritize by segment importance and recency
        const prioritizedEntries = [
            ...this.segments.immediate,
            ...this.segments.recent,
            ...this.segments.episodic.filter(e => e.importance > 0.7),
            ...this.segments.semantic.filter(e => e.importance > 0.8)
        ];
        
        for (const entry of prioritizedEntries) {
            if (totalTokens + entry.tokens <= maxTokens) {
                activeContext.push(entry);
                totalTokens += entry.tokens;
            }
        }
        
        return {
            entries: activeContext,
            totalTokens,
            coverage: this.calculateCoverage(activeContext)
        };
    }

    calculateCoverage(activeContext) {
        const totalEntries = this.contextHistory.length;
        const activeEntries = activeContext.length;
        
        return {
            entryRatio: activeEntries / totalEntries,
            importanceSum: activeContext.reduce((sum, entry) => sum + entry.importance, 0),
            timeSpan: this.calculateTimeSpan(activeContext)
        };
    }

    calculateTimeSpan(activeContext) {
        if (activeContext.length === 0) return 0;
        
        const timestamps = activeContext.map(entry => entry.timestamp);
        return Math.max(...timestamps) - Math.min(...timestamps);
    }
}

/**
 * Context Layers - Multi-layered context processing
 */
class ContextLayers {
    constructor() {
        this.layers = [
            new SyntacticLayer(),
            new SemanticLayer(),
            new PragmaticLayer(),
            new DiscourseLayer(),
            new MemoryLayer()
        ];
    }

    process(extendedContext, memories) {
        let processedContext = { ...extendedContext };
        
        // Process through each layer
        this.layers.forEach((layer, index) => {
            const layerOutput = layer.process(processedContext, memories);
            processedContext = {
                ...processedContext,
                [`layer${index}_output`]: layerOutput,
                enrichments: {
                    ...processedContext.enrichments,
                    [layer.name]: layerOutput.enrichment
                }
            };
        });
        
        return processedContext;
    }
}

/**
 * Syntactic Layer - Handles syntax and structure
 */
class SyntacticLayer {
    constructor() {
        this.name = 'syntactic';
    }

    process(context, memories) {
        const activeContext = context.getActiveContext(20000); // 20K for syntactic analysis
        
        const syntacticAnalysis = {
            sentenceStructures: this.analyzeSentenceStructures(activeContext.entries),
            parsePatterns: this.identifyParsePatterns(activeContext.entries),
            grammarComplexity: this.calculateGrammarComplexity(activeContext.entries),
            structuralCoherence: this.assessStructuralCoherence(activeContext.entries)
        };
        
        return {
            analysis: syntacticAnalysis,
            enrichment: this.generateSyntacticEnrichment(syntacticAnalysis)
        };
    }

    analyzeSentenceStructures(entries) {
        const structures = [];
        
        entries.forEach(entry => {
            const sentences = entry.content.split(/[.!?]+/);
            sentences.forEach(sentence => {
                if (sentence.trim()) {
                    structures.push({
                        entryId: entry.id,
                        structure: this.classifySentenceStructure(sentence.trim()),
                        length: sentence.trim().split(/\s+/).length,
                        complexity: this.calculateSyntacticComplexity(sentence.trim())
                    });
                }
            });
        });
        
        return structures;
    }

    classifySentenceStructure(sentence) {
        if (sentence.includes('?')) return 'interrogative';
        if (sentence.match(/^(please|can you|could you)/i)) return 'imperative';
        if (sentence.includes('!')) return 'exclamatory';
        return 'declarative';
    }

    calculateSyntacticComplexity(sentence) {
        const words = sentence.split(/\s+/).length;
        const clauses = sentence.split(/[,;:]/).length;
        const complexity = (words / 10) + (clauses / 5);
        return Math.min(complexity, 1.0);
    }

    identifyParsePatterns(entries) {
        // Identify common parsing patterns
        const patterns = [];
        const commonPatterns = [
            { pattern: /\b(what|how|why|when|where)\b.*\?/i, type: 'wh_question' },
            { pattern: /\b(analyze|review|check|examine)\b/i, type: 'analysis_request' },
            { pattern: /https?:\/\/[^\s]+/i, type: 'url_reference' },
            { pattern: /\b(help|assist|support)\b/i, type: 'help_request' }
        ];
        
        entries.forEach(entry => {
            commonPatterns.forEach(({ pattern, type }) => {
                if (pattern.test(entry.content)) {
                    patterns.push({
                        entryId: entry.id,
                        type,
                        confidence: 0.8
                    });
                }
            });
        });
        
        return patterns;
    }

    calculateGrammarComplexity(entries) {
        const totalWords = entries.reduce((sum, entry) => 
            sum + entry.content.split(/\s+/).length, 0);
        const totalSentences = entries.reduce((sum, entry) => 
            sum + entry.content.split(/[.!?]+/).length, 0);
        
        return {
            averageWordsPerSentence: totalWords / Math.max(totalSentences, 1),
            complexityScore: Math.min(totalWords / (totalSentences * 15), 1.0)
        };
    }

    assessStructuralCoherence(entries) {
        // Assess structural coherence across entries
        let coherenceScore = 1.0;
        
        for (let i = 1; i < entries.length; i++) {
            const prev = entries[i - 1];
            const curr = entries[i];
            
            const structuralSimilarity = this.calculateStructuralSimilarity(prev.content, curr.content);
            coherenceScore *= (0.7 + structuralSimilarity * 0.3);
        }
        
        return coherenceScore;
    }

    calculateStructuralSimilarity(text1, text2) {
        const struct1 = this.getStructuralFeatures(text1);
        const struct2 = this.getStructuralFeatures(text2);
        
        let similarity = 0;
        similarity += Math.abs(struct1.questionMarks - struct2.questionMarks) < 1 ? 0.2 : 0;
        similarity += Math.abs(struct1.sentenceCount - struct2.sentenceCount) < 2 ? 0.3 : 0;
        similarity += Math.abs(struct1.avgWordLength - struct2.avgWordLength) < 2 ? 0.5 : 0;
        
        return similarity;
    }

    getStructuralFeatures(text) {
        return {
            questionMarks: (text.match(/\?/g) || []).length,
            exclamationMarks: (text.match(/!/g) || []).length,
            sentenceCount: text.split(/[.!?]+/).length,
            avgWordLength: text.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / 
                          Math.max(text.split(/\s+/).length, 1)
        };
    }

    generateSyntacticEnrichment(analysis) {
        return {
            dominantStructure: this.findDominantStructure(analysis.sentenceStructures),
            complexityTrend: this.analyzeTrend(analysis.sentenceStructures.map(s => s.complexity)),
            patternSummary: this.summarizePatterns(analysis.parsePatterns),
            coherenceLevel: analysis.structuralCoherence > 0.7 ? 'high' : 
                           analysis.structuralCoherence > 0.4 ? 'medium' : 'low'
        };
    }

    findDominantStructure(structures) {
        const typeCounts = {};
        structures.forEach(s => {
            typeCounts[s.structure] = (typeCounts[s.structure] || 0) + 1;
        });
        
        return Object.entries(typeCounts)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'declarative';
    }

    analyzeTrend(values) {
        if (values.length < 2) return 'stable';
        
        const trend = values.slice(1).reduce((acc, val, i) => acc + (val - values[i]), 0);
        return trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable';
    }

    summarizePatterns(patterns) {
        const patternCounts = {};
        patterns.forEach(p => {
            patternCounts[p.type] = (patternCounts[p.type] || 0) + 1;
        });
        
        return Object.entries(patternCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([type, count]) => ({ type, count }));
    }
}

/**
 * Semantic Layer - Handles meaning and semantics
 */
class SemanticLayer {
    constructor() {
        this.name = 'semantic';
        this.conceptExtractor = new ConceptExtractor();
        this.relationMapper = new RelationMapper();
    }

    process(context, memories) {
        const activeContext = context.getActiveContext(30000); // 30K for semantic analysis
        
        const semanticAnalysis = {
            concepts: this.conceptExtractor.extractConcepts(activeContext.entries),
            relations: this.relationMapper.mapRelations(activeContext.entries),
            semanticCoherence: this.calculateSemanticCoherence(activeContext.entries),
            meaningEvolution: this.trackMeaningEvolution(activeContext.entries)
        };
        
        return {
            analysis: semanticAnalysis,
            enrichment: this.generateSemanticEnrichment(semanticAnalysis, memories)
        };
    }

    calculateSemanticCoherence(entries) {
        if (entries.length < 2) return 1.0;
        
        let totalCoherence = 0;
        let comparisons = 0;
        
        for (let i = 1; i < entries.length; i++) {
            const similarity = context.calculateSimilarity(
                entries[i - 1].content,
                entries[i].content
            );
            totalCoherence += similarity;
            comparisons++;
        }
        
        return totalCoherence / Math.max(comparisons, 1);
    }

    trackMeaningEvolution(entries) {
        const evolution = [];
        const concepts = new Map();
        
        entries.forEach((entry, index) => {
            const entryConcepts = this.conceptExtractor.extractFromText(entry.content);
            
            entryConcepts.forEach(concept => {
                if (!concepts.has(concept.name)) {
                    concepts.set(concept.name, {
                        firstSeen: index,
                        occurrences: [],
                        evolution: []
                    });
                }
                
                const conceptData = concepts.get(concept.name);
                conceptData.occurrences.push({
                    index,
                    confidence: concept.confidence,
                    context: concept.context
                });
                
                // Track how the concept's usage evolves
                if (conceptData.occurrences.length > 1) {
                    const prevOccurrence = conceptData.occurrences[conceptData.occurrences.length - 2];
                    conceptData.evolution.push({
                        from: prevOccurrence.index,
                        to: index,
                        confidenceChange: concept.confidence - prevOccurrence.confidence,
                        contextShift: this.calculateContextShift(prevOccurrence.context, concept.context)
                    });
                }
            });
        });
        
        return Array.from(concepts.entries()).map(([name, data]) => ({
            concept: name,
            ...data
        }));
    }

    calculateContextShift(context1, context2) {
        // Calculate how much the context of concept usage has shifted
        const words1 = new Set(context1.toLowerCase().split(/\s+/));
        const words2 = new Set(context2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return 1 - (intersection.size / union.size); // Higher value = more shift
    }

    generateSemanticEnrichment(analysis, memories) {
        return {
            dominantConcepts: analysis.concepts
                .sort((a, b) => b.frequency - a.frequency)
                .slice(0, 5),
            semanticDensity: this.calculateSemanticDensity(analysis.concepts),
            coherenceLevel: analysis.semanticCoherence > 0.7 ? 'high' : 
                           analysis.semanticCoherence > 0.4 ? 'medium' : 'low',
            memoryAlignment: this.assessMemoryAlignment(analysis, memories),
            conceptEvolution: this.summarizeConceptEvolution(analysis.meaningEvolution)
        };
    }

    calculateSemanticDensity(concepts) {
        const uniqueConcepts = new Set(concepts.map(c => c.name)).size;
        const totalOccurrences = concepts.reduce((sum, c) => sum + c.frequency, 0);
        
        return uniqueConcepts / Math.max(totalOccurrences, 1);
    }

    assessMemoryAlignment(analysis, memories) {
        let alignment = 0;
        let checks = 0;
        
        analysis.concepts.forEach(concept => {
            const semanticMatch = memories.semantic.queryKnowledge(concept.name);
            if (semanticMatch.confidence > 0.5) {
                alignment += semanticMatch.confidence;
                checks++;
            }
        });
        
        return checks > 0 ? alignment / checks : 0;
    }

    summarizeConceptEvolution(evolution) {
        return evolution
            .filter(e => e.evolution.length > 0)
            .slice(0, 3)
            .map(e => ({
                concept: e.concept,
                evolutionPattern: this.classifyEvolutionPattern(e.evolution),
                stability: this.calculateConceptStability(e.evolution)
            }));
    }

    classifyEvolutionPattern(evolution) {
        const confidenceChanges = evolution.map(e => e.confidenceChange);
        const avgChange = confidenceChanges.reduce((sum, c) => sum + c, 0) / confidenceChanges.length;
        
        if (avgChange > 0.1) return 'strengthening';
        if (avgChange < -0.1) return 'weakening';
        return 'stable';
    }

    calculateConceptStability(evolution) {
        const contextShifts = evolution.map(e => e.contextShift);
        const avgShift = contextShifts.reduce((sum, s) => sum + s, 0) / contextShifts.length;
        
        return 1 - avgShift; // Higher stability = lower context shift
    }
}

/**
 * Concept Extractor - Extracts semantic concepts
 */
class ConceptExtractor {
    constructor() {
        this.conceptPatterns = new Map([
            ['business_metrics', /\b(revenue|profit|growth|sales|customer|retention)\b/gi],
            ['technology', /\b(website|SEO|analytics|AI|digital|online|tech)\b/gi],
            ['analysis', /\b(analyze|data|metrics|performance|insights|report)\b/gi],
            ['problem_solving', /\b(problem|issue|challenge|solution|fix|help)\b/gi]
        ]);
    }

    extractConcepts(entries) {
        const concepts = new Map();
        
        entries.forEach(entry => {
            const entryConcepts = this.extractFromText(entry.content);
            
            entryConcepts.forEach(concept => {
                if (concepts.has(concept.name)) {
                    const existing = concepts.get(concept.name);
                    existing.frequency += 1;
                    existing.totalConfidence += concept.confidence;
                    existing.contexts.push(concept.context);
                } else {
                    concepts.set(concept.name, {
                        name: concept.name,
                        category: concept.category,
                        frequency: 1,
                        totalConfidence: concept.confidence,
                        contexts: [concept.context],
                        firstSeen: entry.timestamp
                    });
                }
            });
        });
        
        // Calculate average confidence
        concepts.forEach(concept => {
            concept.averageConfidence = concept.totalConfidence / concept.frequency;
        });
        
        return Array.from(concepts.values());
    }

    extractFromText(text) {
        const concepts = [];
        
        this.conceptPatterns.forEach((pattern, category) => {
            const matches = text.match(pattern) || [];
            const uniqueMatches = [...new Set(matches.map(m => m.toLowerCase()))];
            
            uniqueMatches.forEach(match => {
                concepts.push({
                    name: match,
                    category,
                    confidence: 0.8,
                    context: this.extractContext(text, match)
                });
            });
        });
        
        return concepts;
    }

    extractContext(text, concept) {
        const words = text.split(/\s+/);
        const conceptIndex = words.findIndex(word => 
            word.toLowerCase().includes(concept.toLowerCase())
        );
        
        if (conceptIndex === -1) return '';
        
        const start = Math.max(0, conceptIndex - 3);
        const end = Math.min(words.length, conceptIndex + 4);
        
        return words.slice(start, end).join(' ');
    }
}

/**
 * Relation Mapper - Maps semantic relationships
 */
class RelationMapper {
    constructor() {
        this.relationPatterns = [
            { pattern: /(\w+)\s+(?:causes?|leads? to|results? in)\s+(\w+)/gi, type: 'causation' },
            { pattern: /(\w+)\s+(?:correlates? with|relates? to)\s+(\w+)/gi, type: 'correlation' },
            { pattern: /(\w+)\s+(?:is|are)\s+(?:part of|component of)\s+(\w+)/gi, type: 'part_of' },
            { pattern: /(\w+)\s+(?:includes?|contains?)\s+(\w+)/gi, type: 'contains' }
        ];
    }

    mapRelations(entries) {
        const relations = [];
        
        entries.forEach(entry => {
            this.relationPatterns.forEach(({ pattern, type }) => {
                let match;
                while ((match = pattern.exec(entry.content)) !== null) {
                    relations.push({
                        source: match[1].toLowerCase(),
                        target: match[2].toLowerCase(),
                        type,
                        confidence: 0.7,
                        context: entry.content,
                        entryId: entry.id
                    });
                }
            });
        });
        
        return this.consolidateRelations(relations);
    }

    consolidateRelations(relations) {
        const consolidated = new Map();
        
        relations.forEach(relation => {
            const key = `${relation.source}:${relation.target}:${relation.type}`;
            
            if (consolidated.has(key)) {
                const existing = consolidated.get(key);
                existing.frequency += 1;
                existing.confidence = Math.min(existing.confidence + 0.1, 1.0);
                existing.contexts.push(relation.context);
            } else {
                consolidated.set(key, {
                    ...relation,
                    frequency: 1,
                    contexts: [relation.context]
                });
            }
        });
        
        return Array.from(consolidated.values());
    }
}

/**
 * Attention Distribution - Manages attention across context
 */
class AttentionDistribution {
    constructor() {
        this.attentionWeights = new Map();
        this.entropy = 0;
    }

    updateDistribution(contextEntries, currentFocus) {
        this.attentionWeights.clear();
        
        contextEntries.forEach(entry => {
            const weight = this.calculateAttentionWeight(entry, currentFocus);
            this.attentionWeights.set(entry.id, weight);
        });
        
        this.entropy = this.calculateEntropy();
    }

    calculateAttentionWeight(entry, currentFocus) {
        let weight = entry.importance; // Base weight from importance
        
        // Recency bias (more recent gets higher attention)
        const age = Date.now() - entry.timestamp;
        const recencyFactor = Math.exp(-age / (1000 * 60 * 60)); // Decay over hours
        weight *= (0.5 + recencyFactor * 0.5);
        
        // Relevance to current focus
        if (currentFocus) {
            const relevance = this.calculateRelevance(entry.content, currentFocus);
            weight *= (0.7 + relevance * 0.3);
        }
        
        // Connection strength (well-connected entries get more attention)
        const connectionBoost = Math.min(entry.connections.length * 0.1, 0.3);
        weight += connectionBoost;
        
        return Math.min(weight, 1.0);
    }

    calculateRelevance(content, focus) {
        const contentWords = new Set(content.toLowerCase().split(/\s+/));
        const focusWords = new Set(focus.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...contentWords].filter(x => focusWords.has(x)));
        return intersection.size / Math.max(focusWords.size, 1);
    }

    calculateEntropy() {
        const weights = Array.from(this.attentionWeights.values());
        const sum = weights.reduce((acc, w) => acc + w, 0);
        
        if (sum === 0) return 0;
        
        const probabilities = weights.map(w => w / sum);
        return -probabilities.reduce((entropy, p) => {
            return p > 0 ? entropy + p * Math.log2(p) : entropy;
        }, 0);
    }

    getTopAttentionEntries(k = 10) {
        return Array.from(this.attentionWeights.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, k)
            .map(([id, weight]) => ({ id, weight }));
    }
}

module.exports = {
    ContextAwareTransformer,
    ExtendedContext,
    ContextLayers,
    SyntacticLayer,
    SemanticLayer,
    ConceptExtractor,
    RelationMapper,
    AttentionDistribution
};