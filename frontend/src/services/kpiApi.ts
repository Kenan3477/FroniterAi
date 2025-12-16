// KPI API service for frontend
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

export interface DashboardStats {
  today: {
    todayCalls: number;
    successfulCalls: number;
    totalTalkTime: number;
    conversionRate: number;
    activeContacts: number;
    callsAttempted: number;
    callsConnected: number;
    callsAnswered: number;
    averageCallDuration: number;
    answeredCallRate: number;
    connectionRate: number;
  };
  trends: {
    callsTrend: number | null;
    successTrend: number | null;
    conversionTrend: number | null;
    contactsTrend: number | null;
  };
  historical: Array<{
    date: Date;
    kpis: any;
  }>;
}

export interface CallStats {
  callId: string;
  status: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  recordingUrl?: string;
  disposition?: {
    categoryId: string;
    notes?: string;
  };
}

class KpiApiService {
  /**
   * Get dashboard statistics for current user/agent
   */
  async getDashboardStats(agentId?: string): Promise<DashboardStats> {
    try {
      const params = agentId ? `?agentId=${agentId}` : '';
      const response = await fetch(`${BACKEND_URL}/api/kpi/dashboard${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return fallback data
      return {
        today: {
          todayCalls: 0,
          successfulCalls: 0,
          totalTalkTime: 0,
          conversionRate: 0,
          activeContacts: 0,
          callsAttempted: 0,
          callsConnected: 0,
          callsAnswered: 0,
          averageCallDuration: 0,
          answeredCallRate: 0,
          connectionRate: 0,
        },
        trends: {
          callsTrend: null,
          successTrend: null,
          conversionTrend: null,
          contactsTrend: null,
        },
        historical: [],
      };
    }
  }

  /**
   * Get agent-specific KPI stats
   */
  async getAgentKpis(agentId: string, dateFrom?: Date, dateTo?: Date) {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom.toISOString());
      if (dateTo) params.append('dateTo', dateTo.toISOString());
      
      const response = await fetch(`${BACKEND_URL}/api/kpi/agent/${agentId}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching agent KPIs:', error);
      return null;
    }
  }

  /**
   * Get campaign-specific KPI stats
   */
  async getCampaignKpis(campaignId: string, dateFrom?: Date, dateTo?: Date) {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom.toISOString());
      if (dateTo) params.append('dateTo', dateTo.toISOString());
      
      const response = await fetch(`${BACKEND_URL}/api/kpi/campaign/${campaignId}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching campaign KPIs:', error);
      return null;
    }
  }

  /**
   * Get KPI trends over time
   */
  async getKpiTrends(days: number = 7, agentId?: string, campaignId?: string) {
    try {
      const params = new URLSearchParams();
      params.append('days', days.toString());
      if (agentId) params.append('agentId', agentId);
      if (campaignId) params.append('campaignId', campaignId);
      
      const response = await fetch(`${BACKEND_URL}/api/kpi/trends?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching KPI trends:', error);
      return [];
    }
  }

  /**
   * Submit call disposition
   */
  async submitDisposition(callId: string, dispositionData: {
    agentId: string;
    categoryId: string;
    notes?: string;
    scheduledCallback?: Date;
    followUpDate?: Date;
  }) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/dialler/calls/${callId}/dispositions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dispositionData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error submitting disposition:', error);
      throw error;
    }
  }

  /**
   * Update call status
   */
  async updateCallStatus(callId: string, status: string, metadata?: any) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/dialler/calls/${callId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, ...metadata }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
  }

  /**
   * Start call recording
   */
  async startRecording(callId: string, recordingOptions?: any) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/dialler/calls/${callId}/recording/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recordingOptions || {}),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  /**
   * Stop call recording
   */
  async stopRecording(callId: string, recordingMetadata?: any) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/dialler/calls/${callId}/recording/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recordingMetadata || {}),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }
}

export const kpiApi = new KpiApiService();