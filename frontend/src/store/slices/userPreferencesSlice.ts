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
// Analyzed by Evolution System at 2025-07-28 21:00:34.569794
// Analyzed by Evolution System at 2025-07-28 20:58:34.158962
// Analyzed by Evolution System at 2025-07-28 20:54:33.017853
// Analyzed by Evolution System at 2025-07-28 20:51:02.343858
// Analyzed by Evolution System at 2025-07-28 20:47:01.690133
// Analyzed by Evolution System at 2025-07-28 20:40:30.560905
// Analyzed by Evolution System at 2025-07-28 20:34:29.516839
// Analyzed by Evolution System at 2025-07-28 20:20:26.745565
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dashboardLayout: 'grid' | 'list' | 'compact';
  chatPosition: 'right' | 'bottom' | 'overlay';
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
  accessibility: {
    reducedMotion: boolean;
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large';
    screenReader: boolean;
  };
  conversation: {
    showTypingIndicator: boolean;
    autoSuggestions: boolean;
    contextualHelp: boolean;
    conversationHistory: number; // days to keep
  };
  privacy: {
    analyticsOptIn: boolean;
    conversationLogging: boolean;
    improvementProgram: boolean;
  };
}

interface UserPreferencesState {
  preferences: UserPreferences;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  lastSaved?: Date;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dashboardLayout: 'grid',
  chatPosition: 'right',
  notifications: {
    email: true,
    push: true,
    inApp: true,
    frequency: 'immediate',
  },
  accessibility: {
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium',
    screenReader: false,
  },
  conversation: {
    showTypingIndicator: true,
    autoSuggestions: true,
    contextualHelp: true,
    conversationHistory: 30,
  },
  privacy: {
    analyticsOptIn: true,
    conversationLogging: true,
    improvementProgram: true,
  },
};

const initialState: UserPreferencesState = {
  preferences: defaultPreferences,
  isLoading: false,
  hasUnsavedChanges: false,
};

const userPreferencesSlice = createSlice({
  name: 'userPreferences',
  initialState,
  reducers: {
    updatePreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    
    updateNotificationPreferences: (state, action: PayloadAction<Partial<UserPreferences['notifications']>>) => {
      state.preferences.notifications = { ...state.preferences.notifications, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    
    updateAccessibilityPreferences: (state, action: PayloadAction<Partial<UserPreferences['accessibility']>>) => {
      state.preferences.accessibility = { ...state.preferences.accessibility, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    
    updateConversationPreferences: (state, action: PayloadAction<Partial<UserPreferences['conversation']>>) => {
      state.preferences.conversation = { ...state.preferences.conversation, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    
    updatePrivacyPreferences: (state, action: PayloadAction<Partial<UserPreferences['privacy']>>) => {
      state.preferences.privacy = { ...state.preferences.privacy, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    
    setTheme: (state, action: PayloadAction<UserPreferences['theme']>) => {
      state.preferences.theme = action.payload;
      state.hasUnsavedChanges = true;
    },
    
    setLanguage: (state, action: PayloadAction<string>) => {
      state.preferences.language = action.payload;
      state.hasUnsavedChanges = true;
    },
    
    setDashboardLayout: (state, action: PayloadAction<UserPreferences['dashboardLayout']>) => {
      state.preferences.dashboardLayout = action.payload;
      state.hasUnsavedChanges = true;
    },
    
    setChatPosition: (state, action: PayloadAction<UserPreferences['chatPosition']>) => {
      state.preferences.chatPosition = action.payload;
      state.hasUnsavedChanges = true;
    },
    
    resetToDefaults: (state) => {
      state.preferences = defaultPreferences;
      state.hasUnsavedChanges = true;
    },
    
    loadPreferences: (state, action: PayloadAction<UserPreferences>) => {
      state.preferences = action.payload;
      state.hasUnsavedChanges = false;
      state.isLoading = false;
    },
    
    savePreferencesStart: (state) => {
      state.isLoading = true;
    },
    
    savePreferencesSuccess: (state) => {
      state.isLoading = false;
      state.hasUnsavedChanges = false;
      state.lastSaved = new Date();
    },
    
    savePreferencesFailure: (state) => {
      state.isLoading = false;
    },
    
    markSaved: (state) => {
      state.hasUnsavedChanges = false;
      state.lastSaved = new Date();
    },
  },
});

export const {
  updatePreferences,
  updateNotificationPreferences,
  updateAccessibilityPreferences,
  updateConversationPreferences,
  updatePrivacyPreferences,
  setTheme,
  setLanguage,
  setDashboardLayout,
  setChatPosition,
  resetToDefaults,
  loadPreferences,
  savePreferencesStart,
  savePreferencesSuccess,
  savePreferencesFailure,
  markSaved,
} = userPreferencesSlice.actions;

export default userPreferencesSlice.reducer;