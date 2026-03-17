import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import dialerReducer from './slices/dialerSlice';
import contactsReducer from './slices/contactsSlice';
import campaignsReducer from './slices/campaignsSlice';
import interactionsReducer from './slices/interactionsSlice';
import activeCallReducer from './slices/activeCallSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    dialer: dialerReducer,
    contacts: contactsReducer,
    campaigns: campaignsReducer,
    interactions: interactionsReducer,
    activeCall: activeCallReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'activeCall/startCall'],
        ignoredActionPaths: ['payload.callStartTime'],
        ignoredPaths: ['activeCall.callStartTime'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;