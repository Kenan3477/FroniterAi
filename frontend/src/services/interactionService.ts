/**
 * Interaction Service
 * Handles fetching real interaction data from backend with authentication
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
}

/**
 * Fetch real outcomed interactions from backend
 */
export async function getOutcomedInteractions(
  agentId?: string,
  campaignId?: string,
  limit: number = 50
): Promise<InteractionData[]> {
  try {
    const params = new URLSearchParams();
    if (agentId) params.append('agentId', agentId);
    if (campaignId) params.append('campaignId', campaignId);
    params.append('limit', limit.toString());
    params.append('status', 'completed');

    const response = await fetch(`${BACKEND_URL}/api/interactions?${params}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      console.error('Failed to fetch interactions:', response.status);
      return []; // Return empty array if backend is unavailable
    }

    const data = await response.json();
    
    if (data.success && data.data) {
      // Transform backend data to match our interface
      return data.data.map((interaction: any) => ({
        id: interaction.id,
        agentName: interaction.agentName || 'Unknown Agent',
        customerName: interaction.contactName || interaction.customerName || 'Unknown Contact',
        interactionType: interaction.type || 'call',
        telephone: interaction.telephone || interaction.phoneNumber || '',
        direction: interaction.direction || 'outbound',
        subject: interaction.subject || interaction.telephone || '',
        campaignName: interaction.campaignName || 'Unknown Campaign',
        outcome: interaction.outcome || 'Unknown',
        dateTime: formatDateTime(interaction.endTime || interaction.createdAt),
        duration: formatDuration(interaction.duration || 0),
        callId: interaction.callId,
        contactId: interaction.contactId,
        agentId: interaction.agentId,
        campaignId: interaction.campaignId,
      }));
    }

    return []; // Return empty if no data
  } catch (error) {
    console.error('Error fetching outcomed interactions:', error);
    return []; // Return empty array on error - no mock data
  }
}

/**
 * Fetch active interactions (calls in progress)
 */
export async function getActiveInteractions(agentId?: string): Promise<InteractionData[]> {
  try {
    const params = new URLSearchParams();
    if (agentId) params.append('agentId', agentId);
    params.append('status', 'active');

    const response = await fetch(`${BACKEND_URL}/api/interactions?${params}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      return []; // Return empty if backend unavailable
    }

    const data = await response.json();
    
    if (data.success && data.data) {
      return data.data.map((interaction: any) => ({
        id: interaction.id,
        agentName: interaction.agentName || 'Unknown Agent',
        customerName: interaction.contactName || interaction.customerName || 'Unknown Contact',
        interactionType: interaction.type || 'call',
        telephone: interaction.telephone || interaction.phoneNumber || '',
        direction: interaction.direction || 'outbound',
        subject: interaction.subject || interaction.telephone || '',
        campaignName: interaction.campaignName || 'Unknown Campaign',
        outcome: 'In Progress',
        dateTime: formatDateTime(interaction.startTime || interaction.createdAt),
        duration: calculateActiveDuration(interaction.startTime),
        callId: interaction.callId,
        contactId: interaction.contactId,
        agentId: interaction.agentId,
        campaignId: interaction.campaignId,
      }));
    }

    return [];
  } catch (error) {
    console.error('Error fetching active interactions:', error);
    return [];
  }
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