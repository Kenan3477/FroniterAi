import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
interface Contact {
  id: string;
  contactId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  company?: string;
  status: 'qualified' | 'not-interested' | 'callback' | 'no-answer' | 'busy' | 'voicemail' | 'new' | 'do-not-call';
  tags: string[];
  leadScore: number;
  attemptCount: number;
  lastAttempt?: Date;
  lastOutcome?: string;
  listName: string;
  campaignId: string;
  source: string;
  createdAt: Date;
  city?: string;
  state?: string;
  industry?: string;
}

interface ContactsContextType {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Actions
  loadContacts: () => Promise<void>;
  addContact: (contact: Contact) => void;
  updateContact: (contactId: string, updates: Partial<Contact>) => void;
  deleteContact: (contactId: string) => void;
  refreshContacts: () => Promise<void>;
  clearCache: () => void;
}

const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

// Cache settings
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'omnivox_contacts_cache';
const STORAGE_TIMESTAMP_KEY = 'omnivox_contacts_timestamp';

export function ContactsProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load cached contacts from localStorage on mount
  useEffect(() => {
    loadCachedContacts();
  }, []);

  const loadCachedContacts = () => {
    try {
      const cachedContacts = localStorage.getItem(STORAGE_KEY);
      const cachedTimestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
      
      if (cachedContacts && cachedTimestamp) {
        const timestamp = new Date(cachedTimestamp);
        const now = new Date();
        
        // Check if cache is still valid (within CACHE_DURATION)
        if (now.getTime() - timestamp.getTime() < CACHE_DURATION) {
          console.log('📦 Loading contacts from cache...');
          const parsedContacts = JSON.parse(cachedContacts);
          setContacts(parsedContacts);
          setLastUpdated(timestamp);
          console.log(`✅ Loaded ${parsedContacts.length} contacts from cache`);
          return;
        } else {
          console.log('⏰ Cache expired, will fetch fresh contacts');
        }
      }
    } catch (error) {
      console.error('❌ Error loading cached contacts:', error);
      // Clear corrupted cache
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
    }
  };

  const cacheContacts = (contactsData: Contact[]) => {
    try {
      const timestamp = new Date();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contactsData));
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, timestamp.toISOString());
      setLastUpdated(timestamp);
      console.log(`💾 Cached ${contactsData.length} contacts`);
    } catch (error) {
      console.error('❌ Error caching contacts:', error);
    }
  };

  const mapBackendStatus = (status: string): Contact['status'] => {
    const statusMap: { [key: string]: Contact['status'] } = {
      'qualified': 'qualified',
      'not_interested': 'not-interested', 
      'callback': 'callback',
      'no_answer': 'no-answer',
      'busy': 'busy',
      'voicemail': 'voicemail',
      'new': 'new',
      'do_not_call': 'do-not-call',
      'NotAttempted': 'new',
      'Answered': 'qualified',
      'NoAnswer': 'no-answer',
      'Busy': 'busy',
      'Voicemail': 'voicemail',
      'DoNotCall': 'do-not-call'
    };
    return statusMap[status] || 'new';
  };

  const getListDisplayName = (listId: string): string => {
    if (!listId) return 'Unknown';
    if (listId.includes('manual-dial')) return 'Manual Dial';
    return listId.replace(/^list-/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const loadContacts = async () => {
    // If we have cached contacts and they're not too old, don't reload
    if (contacts.length > 0 && lastUpdated && new Date().getTime() - lastUpdated.getTime() < CACHE_DURATION) {
      console.log('📦 Using existing cached contacts, skipping reload');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      let allContacts: Contact[] = [];
      let page = 1;
      let hasMore = true;
      
      console.log('🔍 Starting to fetch all contacts...');

      while (hasMore) {
        const params = new URLSearchParams();
        params.append('limit', '1000');
        params.append('page', page.toString());

        console.log(`🔍 Fetching page ${page}...`);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/contacts?${params}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.data && result.data.contacts) {
            const pageContacts = result.data.contacts.map((contact: any) => ({
              id: contact.contactId,
              contactId: contact.contactId,
              firstName: contact.firstName,
              lastName: contact.lastName,
              phone: contact.phone,
              email: contact.email,
              company: contact.customFields?.company || '',
              status: mapBackendStatus(contact.status),
              tags: contact.customFields?.tags ? contact.customFields.tags.split(',') : [],
              leadScore: contact.customFields?.leadScore || 0,
              attemptCount: contact.attemptCount,
              lastAttempt: contact.lastAttemptAt ? new Date(contact.lastAttemptAt) : undefined,
              lastOutcome: contact.status,
              listName: contact.list?.name || getListDisplayName(contact.listId),
              campaignId: contact.listId,
              source: contact.customFields?.leadSource || 'Unknown',
              createdAt: new Date(contact.createdAt),
              city: contact.customFields?.city,
              state: contact.customFields?.state,
              industry: contact.customFields?.industry
            })) as Contact[];
            
            allContacts = [...allContacts, ...pageContacts];
            
            // Check if there are more pages
            const { pagination } = result.data;
            hasMore = page < pagination.totalPages;
            page++;
            
            console.log(`📊 Loaded ${pageContacts.length} contacts from page ${page - 1}, total so far: ${allContacts.length}`);
          } else {
            hasMore = false;
          }
        } else {
          console.error(`❌ Failed to fetch page ${page}:`, response.status);
          hasMore = false;
          throw new Error(`Failed to fetch contacts: ${response.status}`);
        }
      }

      console.log(`✅ Successfully loaded ${allContacts.length} total contacts`);
      setContacts(allContacts);
      cacheContacts(allContacts);
      
    } catch (err) {
      console.error('❌ Error loading contacts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshContacts = async () => {
    // Force refresh - clear cache first
    clearCache();
    await loadContacts();
  };

  const addContact = (contact: Contact) => {
    setContacts(prev => [contact, ...prev]);
    // Update cache
    const newContacts = [contact, ...contacts];
    cacheContacts(newContacts);
  };

  const updateContact = (contactId: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(contact => 
      contact.contactId === contactId ? { ...contact, ...updates } : contact
    ));
    // Update cache
    const updatedContacts = contacts.map(contact => 
      contact.contactId === contactId ? { ...contact, ...updates } : contact
    );
    cacheContacts(updatedContacts);
  };

  const deleteContact = (contactId: string) => {
    setContacts(prev => prev.filter(contact => contact.contactId !== contactId));
    // Update cache
    const filteredContacts = contacts.filter(contact => contact.contactId !== contactId);
    cacheContacts(filteredContacts);
  };

  const clearCache = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
    setLastUpdated(null);
    console.log('🗑️ Cleared contacts cache');
  };

  const value: ContactsContextType = {
    contacts,
    isLoading,
    error,
    lastUpdated,
    loadContacts,
    addContact,
    updateContact,
    deleteContact,
    refreshContacts,
    clearCache
  };

  return (
    <ContactsContext.Provider value={value}>
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  const context = useContext(ContactsContext);
  if (context === undefined) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return context;
}

export type { Contact, ContactsContextType };