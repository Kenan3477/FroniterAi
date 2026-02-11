/**
 * Interaction Service
 * Handles fetching real interaction data from backend with authentication
 * Updated to use categorized interaction history API
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

// Helper function to get authentication headers
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Get token from localStorage
  const token = localStorage.getItem('omnivox_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

export interface InteractionData {
  id: string;
  agentName: string;
  customerName: string;
  interactionType: 'call' | 'email' | 'sms' | 'chat';
  telephone: string;
  direction: 'inbound' | 'outbound';
  subject: string;
  campaignName: string;
  outcome: string;
  dateTime: string;
  duration: string;
  callId?: string;
  contactId?: string;
  agentId?: string;
  campaignId?: string;
  dialType?: 'manual' | 'auto-dial';
  callbackTime?: string;
  notes?: string;
}

export interface CategorizedInteractions {
  queued: InteractionData[];
  allocated: InteractionData[];
  outcomed: InteractionData[];
  unallocated: InteractionData[];
  counts: {
    queued: number;
    allocated: number;
    outcomed: number;
    unallocated: number;
  };
}

/**
 * Fetch categorized interactions from new backend API
 */
export async function getCategorizedInteractions(agentId?: string): Promise<CategorizedInteractions> {
  try {
    const params = new URLSearchParams();
    if (agentId) params.append('agentId', agentId);

    const response = await fetch(`${BACKEND_URL}/api/interaction-history/categorized?${params}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      console.error('Failed to fetch categorized interactions:', response.status);
      return getEmptyCategories();
    }

    const data = await response.json();
    
    if (data.success && data.data) {
      // Transform backend data to match our interface
      return {
        queued: transformInteractionData(data.data.queued || []),
        allocated: transformInteractionData(data.data.allocated || []),
        outcomed: transformInteractionData(data.data.outcomed || []),
        unallocated: transformInteractionData(data.data.unallocated || []),
        counts: data.data.counts || { queued: 0, allocated: 0, outcomed: 0, unallocated: 0 }
      };
    }

    return getEmptyCategories();
  } catch (error) {
    console.error('Error fetching categorized interactions:', error);
    return getEmptyCategories();
  }
}

/**
 * Get interactions by specific status (for backward compatibility)
 */
export async function getOutcomedInteractions(
  agentId?: string,
  campaignId?: string,
  limit: number = 50
): Promise<InteractionData[]> {
  try {
    const categorized = await getCategorizedInteractions(agentId);
    return categorized.outcomed.slice(0, limit);
  } catch (error) {
    console.error('Error fetching outcomed interactions:', error);
    return [];
  }
}

/**
 * Get active interactions (allocated interactions)
 */
export async function getActiveInteractions(agentId?: string): Promise<InteractionData[]> {
  try {
    const categorized = await getCategorizedInteractions(agentId);
    return categorized.allocated;
  } catch (error) {
    console.error('Error fetching active interactions:', error);
    return [];
  }
}

/**
 * Get queued interactions (callbacks scheduled)
 */
export async function getQueuedInteractions(agentId?: string): Promise<InteractionData[]> {
  try {
    const categorized = await getCategorizedInteractions(agentId);
    return categorized.queued;
  } catch (error) {
    console.error('Error fetching queued interactions:', error);
    return [];
  }
}

/**
 * Get unallocated interactions (need follow-up)
 */
export async function getUnallocatedInteractions(agentId?: string): Promise<InteractionData[]> {
  try {
    const categorized = await getCategorizedInteractions(agentId);
    return categorized.unallocated;
  } catch (error) {
    console.error('Error fetching unallocated interactions:', error);
    return [];
  }
}

/**
 * Record a new interaction
 */
export async function recordInteraction(data: {
  contactId: string;
  campaignId: string;
  dialType: 'manual' | 'auto-dial';
  phoneNumber?: string;
  notes?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/interaction-history/record`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to record interaction' };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error recording interaction:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Update interaction outcome
 */
export async function updateInteractionOutcome(
  interactionId: string, 
  data: {
    outcome: string;
    notes?: string;
    callbackTime?: string;
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/interaction-history/${interactionId}/outcome`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to update outcome' };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error updating interaction outcome:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Track auto-dial interaction
 */
export async function trackAutoDialInteraction(data: {
  contactId: string;
  campaignId: string;
  phoneNumber: string;
  autoDialMetrics?: any;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/interaction-history/auto-dial`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to track auto-dial interaction' };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error tracking auto-dial interaction:', error);
    return { success: false, error: 'Network error' };
  }
}

// Helper functions

function getEmptyCategories(): CategorizedInteractions {
  return {
    queued: [],
    allocated: [],
    outcomed: [],
    unallocated: [],
    counts: { queued: 0, allocated: 0, outcomed: 0, unallocated: 0 }
  };
}

function transformInteractionData(interactions: any[]): InteractionData[] {
  return interactions.map((interaction: any) => ({
    id: interaction.id,
    agentName: interaction.agentName || interaction.agent?.firstName + ' ' + interaction.agent?.lastName || 'Unknown Agent',
    customerName: interaction.contactName || interaction.contact?.firstName + ' ' + interaction.contact?.lastName || 'Unknown Contact',
    interactionType: interaction.type || 'call',
    telephone: interaction.phoneNumber || interaction.contact?.phoneNumber || '',
    direction: interaction.direction || 'outbound',
    subject: interaction.subject || interaction.phoneNumber || '',
    campaignName: interaction.campaignName || interaction.campaign?.name || 'Unknown Campaign',
    outcome: interaction.outcome || (interaction.endedAt ? 'Completed' : 'In Progress'),
    dateTime: formatDateTime(interaction.endedAt || interaction.startedAt || interaction.createdAt),
    duration: formatDuration(interaction.duration || 0),
    callId: interaction.callId,
    contactId: interaction.contactId,
    agentId: interaction.agentId,
    campaignId: interaction.campaignId,
    dialType: interaction.dialType || 'manual',
    callbackTime: interaction.callbackTime,
    notes: interaction.notes || interaction.result
  }));
}

/**
 * Format date/time for display
 */
function formatDateTime(dateTime: string | Date): string {
  if (!dateTime) return '';
  
  const date = new Date(dateTime);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format call duration for display
 */
function formatDuration(durationSeconds: number): string {
  if (!durationSeconds || durationSeconds <= 0) return '00:00:00';
  
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate active call duration from start time
 */
function calculateActiveDuration(startTime: string | Date): string {
  if (!startTime) return '00:00:00';
  
  const start = new Date(startTime);
  const now = new Date();
  const durationMs = now.getTime() - start.getTime();
  const durationSeconds = Math.floor(durationMs / 1000);
  
  return formatDuration(durationSeconds);
}