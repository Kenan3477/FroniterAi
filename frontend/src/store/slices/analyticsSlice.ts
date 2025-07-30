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
// Analyzed by Evolution System at 2025-07-28 21:18:38.189728
// Analyzed by Evolution System at 2025-07-28 21:13:36.970310
// Analyzed by Evolution System at 2025-07-28 21:12:36.787883
// Analyzed by Evolution System at 2025-07-28 20:43:31.072152
// Analyzed by Evolution System at 2025-07-28 20:39:00.330541
// Analyzed by Evolution System at 2025-07-28 20:16:25.815278
// Analyzed by Evolution System at 2025-07-28 20:13:25.171724
// Analyzed by Evolution System at 2025-07-28 20:11:54.863834
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface InteractionEvent {
  id: string;
  timestamp: Date;
  type: 'conversation' | 'feature_use' | 'navigation' | 'error';
  event: string;
  metadata?: {
    featureId?: string;
    duration?: number;
    success?: boolean;
    errorMessage?: string;
    userSatisfaction?: number;
    conversationTurn?: number;
  };
}

export interface ConversationAnalytics {
  totalConversations: number;
  averageConversationLength: number;
  mostUsedFeatures: { featureId: string; count: number }[];
  userSatisfactionRating: number;
  commonQueries: { query: string; count: number }[];
  errorRate: number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  systemUptime: number;
  errorCount: number;
  successfulInteractions: number;
  totalInteractions: number;
}

export interface LearningInsights {
  userBehaviorPatterns: string[];
  improvementSuggestions: string[];
  systemOptimizations: string[];
  conversationQuality: number;
  lastAnalysisDate?: Date;
}

interface AnalyticsState {
  events: InteractionEvent[];
  conversationAnalytics: ConversationAnalytics;
  performanceMetrics: PerformanceMetrics;
  learningInsights: LearningInsights;
  isCollectingData: boolean;
  analyticsOptIn: boolean;
  lastSyncDate?: Date;
}

const initialState: AnalyticsState = {
  events: [],
  conversationAnalytics: {
    totalConversations: 0,
    averageConversationLength: 0,
    mostUsedFeatures: [],
    userSatisfactionRating: 0,
    commonQueries: [],
    errorRate: 0,
  },
  performanceMetrics: {
    averageResponseTime: 0,
    systemUptime: 100,
    errorCount: 0,
    successfulInteractions: 0,
    totalInteractions: 0,
  },
  learningInsights: {
    userBehaviorPatterns: [],
    improvementSuggestions: [],
    systemOptimizations: [],
    conversationQuality: 0,
  },
  isCollectingData: true,
  analyticsOptIn: true,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    trackEvent: (state, action: PayloadAction<Omit<InteractionEvent, 'id' | 'timestamp'>>) => {
      if (!state.analyticsOptIn || !state.isCollectingData) return;
      
      const event: InteractionEvent = {
        id: Date.now().toString(),
        timestamp: new Date(),
        ...action.payload,
      };
      
      state.events.push(event);
      
      // Keep only last 1000 events
      if (state.events.length > 1000) {
        state.events = state.events.slice(-1000);
      }
      
      // Update performance metrics
      state.performanceMetrics.totalInteractions += 1;
      if (event.metadata?.success !== false) {
        state.performanceMetrics.successfulInteractions += 1;
      } else {
        state.performanceMetrics.errorCount += 1;
      }
    },
    
    trackConversationStart: (state) => {
      if (!state.analyticsOptIn) return;
      state.conversationAnalytics.totalConversations += 1;
    },
    
    trackFeatureUsage: (state, action: PayloadAction<{ featureId: string; duration?: number }>) => {
      if (!state.analyticsOptIn) return;
      
      const { featureId } = action.payload;
      const existingFeature = state.conversationAnalytics.mostUsedFeatures.find(
        f => f.featureId === featureId
      );
      
      if (existingFeature) {
        existingFeature.count += 1;
      } else {
        state.conversationAnalytics.mostUsedFeatures.push({
          featureId,
          count: 1,
        });
      }
      
      // Sort by count and keep top 10
      state.conversationAnalytics.mostUsedFeatures.sort((a, b) => b.count - a.count);
      state.conversationAnalytics.mostUsedFeatures = state.conversationAnalytics.mostUsedFeatures.slice(0, 10);
    },
    
    updateUserSatisfaction: (state, action: PayloadAction<number>) => {
      if (!state.analyticsOptIn) return;
      
      // Calculate running average
      const currentRating = state.conversationAnalytics.userSatisfactionRating;
      const totalConversations = state.conversationAnalytics.totalConversations;
      
      if (totalConversations > 0) {
        state.conversationAnalytics.userSatisfactionRating = 
          ((currentRating * (totalConversations - 1)) + action.payload) / totalConversations;
      } else {
        state.conversationAnalytics.userSatisfactionRating = action.payload;
      }
    },
    
    trackQuery: (state, action: PayloadAction<string>) => {
      if (!state.analyticsOptIn) return;
      
      const query = action.payload.toLowerCase().trim();
      const existingQuery = state.conversationAnalytics.commonQueries.find(
        q => q.query === query
      );
      
      if (existingQuery) {
        existingQuery.count += 1;
      } else {
        state.conversationAnalytics.commonQueries.push({
          query,
          count: 1,
        });
      }
      
      // Sort by count and keep top 20
      state.conversationAnalytics.commonQueries.sort((a, b) => b.count - a.count);
      state.conversationAnalytics.commonQueries = state.conversationAnalytics.commonQueries.slice(0, 20);
    },
    
    updatePerformanceMetrics: (state, action: PayloadAction<Partial<PerformanceMetrics>>) => {
      state.performanceMetrics = { ...state.performanceMetrics, ...action.payload };
    },
    
    updateLearningInsights: (state, action: PayloadAction<Partial<LearningInsights>>) => {
      state.learningInsights = { 
        ...state.learningInsights, 
        ...action.payload,
        lastAnalysisDate: new Date(),
      };
    },
    
    setAnalyticsOptIn: (state, action: PayloadAction<boolean>) => {
      state.analyticsOptIn = action.payload;
      if (!action.payload) {
        // Clear data if user opts out
        state.events = [];
        state.conversationAnalytics = initialState.conversationAnalytics;
      }
    },
    
    setDataCollection: (state, action: PayloadAction<boolean>) => {
      state.isCollectingData = action.payload;
    },
    
    clearAnalyticsData: (state) => {
      state.events = [];
      state.conversationAnalytics = initialState.conversationAnalytics;
      state.performanceMetrics = initialState.performanceMetrics;
      state.learningInsights = initialState.learningInsights;
    },
    
    syncAnalyticsData: (state) => {
      state.lastSyncDate = new Date();
    },
    
    generateInsights: (state) => {
      // Analyze user behavior patterns
      const patterns: string[] = [];
      
      // Most active time patterns
      const hourCounts: { [key: number]: number } = {};
      state.events.forEach(event => {
        const hour = event.timestamp.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      
      const mostActiveHour = Object.keys(hourCounts).reduce((a, b) => 
        hourCounts[Number(a)] > hourCounts[Number(b)] ? a : b
      );
      
      if (mostActiveHour) {
        patterns.push(`Most active during ${mostActiveHour}:00-${Number(mostActiveHour) + 1}:00`);
      }
      
      // Feature usage patterns
      const topFeature = state.conversationAnalytics.mostUsedFeatures[0];
      if (topFeature) {
        patterns.push(`Primarily uses ${topFeature.featureId} feature`);
      }
      
      // Conversation length patterns
      if (state.conversationAnalytics.averageConversationLength > 10) {
        patterns.push('Tends to have longer, detailed conversations');
      } else if (state.conversationAnalytics.averageConversationLength < 5) {
        patterns.push('Prefers quick, focused interactions');
      }
      
      // Generate improvement suggestions
      const suggestions: string[] = [];
      
      if (state.conversationAnalytics.errorRate > 0.1) {
        suggestions.push('Improve error handling and user guidance');
      }
      
      if (state.conversationAnalytics.userSatisfactionRating < 4) {
        suggestions.push('Focus on improving response quality and relevance');
      }
      
      if (state.performanceMetrics.averageResponseTime > 2000) {
        suggestions.push('Optimize response time for better user experience');
      }
      
      state.learningInsights = {
        userBehaviorPatterns: patterns,
        improvementSuggestions: suggestions,
        systemOptimizations: state.learningInsights.systemOptimizations,
        conversationQuality: state.conversationAnalytics.userSatisfactionRating,
        lastAnalysisDate: new Date(),
      };
    },
  },
});

export const {
  trackEvent,
  trackConversationStart,
  trackFeatureUsage,
  updateUserSatisfaction,
  trackQuery,
  updatePerformanceMetrics,
  updateLearningInsights,
  setAnalyticsOptIn,
  setDataCollection,
  clearAnalyticsData,
  syncAnalyticsData,
  generateInsights,
} = analyticsSlice.actions;

export default analyticsSlice.reducer;