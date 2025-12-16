import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Interaction } from '../../../../shared/types';

interface InteractionsState {
  interactions: Interaction[];
  selectedInteraction: Interaction | null;
  filters: {
    type: string[];
    status: string[];
    channel: string[];
    dateRange?: {
      startDate: Date;
      endDate: Date;
    };
  };
  loading: boolean;
  error: string | null;
}

const initialState: InteractionsState = {
  interactions: [],
  selectedInteraction: null,
  filters: {
    type: [],
    status: [],
    channel: [],
  },
  loading: false,
  error: null,
};

const interactionsSlice = createSlice({
  name: 'interactions',
  initialState,
  reducers: {
    setInteractions: (state, action: PayloadAction<Interaction[]>) => {
      state.interactions = action.payload;
    },
    addInteraction: (state, action: PayloadAction<Interaction>) => {
      state.interactions.unshift(action.payload);
    },
    updateInteraction: (state, action: PayloadAction<Interaction>) => {
      const index = state.interactions.findIndex(i => i.id === action.payload.id);
      if (index !== -1) {
        state.interactions[index] = action.payload;
      }
    },
    setSelectedInteraction: (state, action: PayloadAction<Interaction | null>) => {
      state.selectedInteraction = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<InteractionsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        type: [],
        status: [],
        channel: [],
      };
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setInteractions,
  addInteraction,
  updateInteraction,
  setSelectedInteraction,
  setFilters,
  clearFilters,
  setLoading,
  setError,
} = interactionsSlice.actions;

export default interactionsSlice.reducer;