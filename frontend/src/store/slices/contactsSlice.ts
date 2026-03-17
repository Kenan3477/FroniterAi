import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Contact } from '../../../../shared/types';

interface ContactsState {
  contacts: Contact[];
  selectedContacts: string[];
  searchTerm: string;
  filters: {
    status: string[];
    tags: string[];
    source: string[];
  };
  loading: boolean;
  error: string | null;
}

const initialState: ContactsState = {
  contacts: [],
  selectedContacts: [],
  searchTerm: '',
  filters: {
    status: [],
    tags: [],
    source: [],
  },
  loading: false,
  error: null,
};

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    setContacts: (state, action: PayloadAction<Contact[]>) => {
      state.contacts = action.payload;
    },
    addContact: (state, action: PayloadAction<Contact>) => {
      state.contacts.unshift(action.payload);
    },
    updateContact: (state, action: PayloadAction<Contact>) => {
      const index = state.contacts.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.contacts[index] = action.payload;
      }
    },
    removeContact: (state, action: PayloadAction<string>) => {
      state.contacts = state.contacts.filter(c => c.id !== action.payload);
    },
    setSelectedContacts: (state, action: PayloadAction<string[]>) => {
      state.selectedContacts = action.payload;
    },
    toggleContactSelection: (state, action: PayloadAction<string>) => {
      const contactId = action.payload;
      if (state.selectedContacts.includes(contactId)) {
        state.selectedContacts = state.selectedContacts.filter(id => id !== contactId);
      } else {
        state.selectedContacts.push(contactId);
      }
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<ContactsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
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
  setContacts,
  addContact,
  updateContact,
  removeContact,
  setSelectedContacts,
  toggleContactSelection,
  setSearchTerm,
  setFilters,
  setLoading,
  setError,
} = contactsSlice.actions;

export default contactsSlice.reducer;