import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ActiveCallState {
  isActive: boolean;
  phoneNumber: string | null;
  callSid: string | null;
  callType: 'inbound' | 'outbound' | null;
  customerInfo: {
    id?: string;
    contactId?: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
  } | null;
  callStartTime: Date | null;
  callDuration: number;
  callStatus: 'ringing' | 'connected' | 'ended';
}

const initialState: ActiveCallState = {
  isActive: false,
  phoneNumber: null,
  callSid: null,
  callType: null,
  customerInfo: null,
  callStartTime: null,
  callDuration: 0,
  callStatus: 'ended'
};

const activeCallSlice = createSlice({
  name: 'activeCall',
  initialState,
  reducers: {
    startCall: (state, action: PayloadAction<{ 
      phoneNumber: string; 
      customerInfo: any; 
      callSid?: string;
      callType?: 'inbound' | 'outbound';
    }>) => {
      state.isActive = true;
      state.phoneNumber = action.payload.phoneNumber;
      state.customerInfo = action.payload.customerInfo;
      state.callSid = action.payload.callSid || null;
      state.callType = action.payload.callType || 'outbound';
      state.callStartTime = new Date();
      state.callDuration = 0;
      state.callStatus = 'ringing';
    },
    answerCall: (state) => {
      state.callStatus = 'connected';
    },
    updateCallDuration: (state, action: PayloadAction<number>) => {
      state.callDuration = action.payload;
    },
    updateCustomerInfo: (state, action: PayloadAction<Partial<NonNullable<ActiveCallState['customerInfo']>>>) => {
      if (state.customerInfo) {
        state.customerInfo = { ...state.customerInfo, ...action.payload };
      }
    },
    endCall: (state) => {
      state.callStatus = 'ended';
      // Don't clear immediately to allow disposition card to access data
    },
    clearCall: (state) => {
      return initialState;
    }
  }
});

export const {
  startCall,
  answerCall,
  updateCallDuration,
  updateCustomerInfo,
  endCall,
  clearCall
} = activeCallSlice.actions;

export default activeCallSlice.reducer;
