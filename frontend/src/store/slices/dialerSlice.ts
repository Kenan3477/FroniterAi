import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Call } from '../../../../shared/types';

interface DialerState {
  status: 'available' | 'away' | 'busy' | 'offline';
  activeCall: Call | null;
  queuedCalls: Call[];
  callHistory: Call[];
  dialerMode: 'manual' | 'progressive' | 'predictive' | 'preview';
  isRecording: boolean;
  isMuted: boolean;
  isOnHold: boolean;
}

const initialState: DialerState = {
  status: 'away',
  activeCall: null,
  queuedCalls: [],
  callHistory: [],
  dialerMode: 'manual',
  isRecording: false,
  isMuted: false,
  isOnHold: false,
};

const dialerSlice = createSlice({
  name: 'dialer',
  initialState,
  reducers: {
    setStatus: (state, action: PayloadAction<DialerState['status']>) => {
      state.status = action.payload;
    },
    setActiveCall: (state, action: PayloadAction<Call | null>) => {
      state.activeCall = action.payload;
    },
    addToQueue: (state, action: PayloadAction<Call>) => {
      state.queuedCalls.push(action.payload);
    },
    removeFromQueue: (state, action: PayloadAction<string>) => {
      state.queuedCalls = state.queuedCalls.filter(call => call.id !== action.payload);
    },
    addToHistory: (state, action: PayloadAction<Call>) => {
      state.callHistory.unshift(action.payload);
    },
    setDialerMode: (state, action: PayloadAction<DialerState['dialerMode']>) => {
      state.dialerMode = action.payload;
    },
    setRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload;
    },
    setMuted: (state, action: PayloadAction<boolean>) => {
      state.isMuted = action.payload;
    },
    setOnHold: (state, action: PayloadAction<boolean>) => {
      state.isOnHold = action.payload;
    },
  },
});

export const {
  setStatus,
  setActiveCall,
  addToQueue,
  removeFromQueue,
  addToHistory,
  setDialerMode,
  setRecording,
  setMuted,
  setOnHold,
} = dialerSlice.actions;

export default dialerSlice.reducer;