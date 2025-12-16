import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
  loading: {
    global: boolean;
    [key: string]: boolean;
  };
  modals: {
    [key: string]: boolean;
  };
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const initialState: UIState = {
  sidebarCollapsed: false,
  theme: 'light',
  notifications: [],
  loading: {
    global: false,
  },
  modals: {},
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'read'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date(),
        read: false,
      };
      state.notifications.unshift(notification);
    },
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<{ key: string; loading: boolean }>) => {
      state.loading[action.payload.key] = action.payload.loading;
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = true;
    },
    closeModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = false;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setTheme,
  addNotification,
  markNotificationRead,
  removeNotification,
  setLoading,
  setGlobalLoading,
  openModal,
  closeModal,
} = uiSlice.actions;

export default uiSlice.reducer;