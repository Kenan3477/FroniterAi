// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Analyzed by Evolution System at 2025-07-28 21:10:36.322240
// Analyzed by Evolution System at 2025-07-28 21:05:35.459870
// Analyzed by Evolution System at 2025-07-28 20:55:33.209894
// Analyzed by Evolution System at 2025-07-28 20:50:02.172930
// Analyzed by Evolution System at 2025-07-28 20:32:59.233575
// Analyzed by Evolution System at 2025-07-28 20:22:27.083031
// Analyzed by Evolution System at 2025-07-28 20:17:56.136400
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FeatureCard {
  id: string;
  title: string;
  description: string;
  category: 'financial' | 'strategic' | 'operational' | 'analytics';
  iconName: string;
  isActive: boolean;
  isVisible: boolean;
  usage_count: number;
  last_used?: Date;
  quickActions: string[];
  relatedFeatures: string[];
}

export interface DashboardLayout {
  layout: 'grid' | 'list' | 'compact';
  chatPosition: 'right' | 'bottom' | 'overlay';
  showSidebar: boolean;
  gridColumns: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    callback: string;
  };
}

interface DashboardState {
  features: FeatureCard[];
  layout: DashboardLayout;
  notifications: Notification[];
  searchQuery: string;
  selectedCategory: string | null;
  isLoading: boolean;
  recentlyUsed: string[];
  favoriteFeatures: string[];
}

const initialFeatures: FeatureCard[] = [
  {
    id: 'financial-analysis',
    title: 'Financial Analysis',
    description: 'Comprehensive financial statement analysis and ratios',
    category: 'financial',
    iconName: 'TrendingUp',
    isActive: true,
    isVisible: true,
    usage_count: 0,
    quickActions: ['Analyze Balance Sheet', 'Calculate Ratios', 'Generate Report'],
    relatedFeatures: ['valuation-tools', 'trend-analysis'],
  },
  {
    id: 'strategic-planning',
    title: 'Strategic Planning',
    description: 'SWOT analysis, market research, and strategic recommendations',
    category: 'strategic',
    iconName: 'Target',
    isActive: true,
    isVisible: true,
    usage_count: 0,
    quickActions: ['SWOT Analysis', 'Market Research', 'Strategic Objectives'],
    relatedFeatures: ['competitive-analysis', 'market-research'],
  },
  {
    id: 'valuation-tools',
    title: 'Valuation Tools',
    description: 'DCF, comparable analysis, and valuation modeling',
    category: 'financial',
    iconName: 'Calculator',
    isActive: true,
    isVisible: true,
    usage_count: 0,
    quickActions: ['DCF Model', 'Comparable Analysis', 'Valuation Report'],
    relatedFeatures: ['financial-analysis', 'trend-analysis'],
  },
  {
    id: 'competitive-analysis',
    title: 'Competitive Analysis',
    description: 'Competitor research and positioning analysis',
    category: 'strategic',
    iconName: 'Users',
    isActive: true,
    isVisible: true,
    usage_count: 0,
    quickActions: ['Competitor Research', 'Market Positioning', 'SWOT Comparison'],
    relatedFeatures: ['strategic-planning', 'market-research'],
  },
  {
    id: 'trend-analysis',
    title: 'Trend Analysis',
    description: 'Historical trends and future projections',
    category: 'analytics',
    iconName: 'BarChart3',
    isActive: true,
    isVisible: true,
    usage_count: 0,
    quickActions: ['Historical Trends', 'Forecasting', 'Pattern Analysis'],
    relatedFeatures: ['financial-analysis', 'valuation-tools'],
  },
  {
    id: 'market-research',
    title: 'Market Research',
    description: 'Industry analysis and market size estimation',
    category: 'strategic',
    iconName: 'Globe',
    isActive: true,
    isVisible: true,
    usage_count: 0,
    quickActions: ['Industry Analysis', 'Market Size', 'Growth Trends'],
    relatedFeatures: ['strategic-planning', 'competitive-analysis'],
  },
];

const initialState: DashboardState = {
  features: initialFeatures,
  layout: {
    layout: 'grid',
    chatPosition: 'right',
    showSidebar: true,
    gridColumns: 3,
  },
  notifications: [],
  searchQuery: '',
  selectedCategory: null,
  isLoading: false,
  recentlyUsed: [],
  favoriteFeatures: [],
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    updateLayout: (state, action: PayloadAction<Partial<DashboardLayout>>) => {
      state.layout = { ...state.layout, ...action.payload };
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    setSelectedCategory: (state, action: PayloadAction<string | null>) => {
      state.selectedCategory = action.payload;
    },
    
    toggleFeatureVisibility: (state, action: PayloadAction<string>) => {
      const feature = state.features.find(f => f.id === action.payload);
      if (feature) {
        feature.isVisible = !feature.isVisible;
      }
    },
    
    incrementFeatureUsage: (state, action: PayloadAction<string>) => {
      const feature = state.features.find(f => f.id === action.payload);
      if (feature) {
        feature.usage_count += 1;
        feature.last_used = new Date();
        
        // Update recently used
        state.recentlyUsed = [
          action.payload,
          ...state.recentlyUsed.filter(id => id !== action.payload)
        ].slice(0, 10);
      }
    },
    
    toggleFavoriteFeature: (state, action: PayloadAction<string>) => {
      const featureId = action.payload;
      if (state.favoriteFeatures.includes(featureId)) {
        state.favoriteFeatures = state.favoriteFeatures.filter(id => id !== featureId);
      } else {
        state.favoriteFeatures.push(featureId);
      }
    },
    
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'read'>>) => {
      const notification: Notification = {
        id: Date.now().toString(),
        timestamp: new Date(),
        read: false,
        ...action.payload,
      };
      state.notifications.unshift(notification);
      
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    updateFeatureCard: (state, action: PayloadAction<{ id: string; updates: Partial<FeatureCard> }>) => {
      const feature = state.features.find(f => f.id === action.payload.id);
      if (feature) {
        Object.assign(feature, action.payload.updates);
      }
    },
    
    reorderFeatures: (state, action: PayloadAction<string[]>) => {
      const reorderedFeatures: FeatureCard[] = [];
      action.payload.forEach(id => {
        const feature = state.features.find(f => f.id === id);
        if (feature) {
          reorderedFeatures.push(feature);
        }
      });
      state.features = reorderedFeatures;
    },
  },
});

export const {
  updateLayout,
  setSearchQuery,
  setSelectedCategory,
  toggleFeatureVisibility,
  incrementFeatureUsage,
  toggleFavoriteFeature,
  addNotification,
  markNotificationRead,
  clearAllNotifications,
  setLoading,
  updateFeatureCard,
  reorderFeatures,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;