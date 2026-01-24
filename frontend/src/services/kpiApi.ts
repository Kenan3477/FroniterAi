/**
 * KPI API Service - Real database-driven analytics
 * Updated to use new comprehensive backend KPI endpoints
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export interface KPISummary {
  totalCalls: number;
  contactedCalls: number;
  positiveCalls: number;
  neutralCalls: number;
  negativeCalls: number;
  averageCallDuration: number;
  conversionRate: number;
  contactRate: number;
  dispositionBreakdown: { [key: string]: number };
  categoryBreakdown: { [key: string]: number };
  hourlyBreakdown: { [key: string]: { calls: number; conversions: number } };
  dailyBreakdown: { [key: string]: { calls: number; conversions: number } };
  campaignBreakdown: { [key: string]: { calls: number; conversions: number } };
  agentBreakdown: { [key: string]: { calls: number; conversions: number } };
}

export interface HourlyData {
  hour: string;
  totalCalls: number;
  conversions: number;
  conversionRate: number;
  averageDuration: number;
}

export interface OutcomeData {
  outcome: string;
  count: number;
  percentage: number;
}

export interface AgentPerformance {
  agentId: string;
  name: string;
  totalCalls: number;
  conversions: number;
  conversionRate: number;
  averageCallDuration: number;
  totalTalkTime: number;
  rank: number;
}

export interface DashboardOverview {
  today: KPISummary;
  thisWeek: KPISummary;
  trends: {
    conversion: number;
    contact: number;
    volume: number;
  };
}

export interface CampaignMetrics {
  summary: KPISummary;
  hourlyTrend: HourlyData[];
  outcomeBreakdown: OutcomeData[];
  dateRange: { start: Date; end: Date };
}

// Legacy interface for backward compatibility
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

class KpiApiService {
  
  private async getAuthHeaders(): Promise<HeadersInit> {
    // Get auth token from localStorage or wherever you store it
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  /**
   * Get comprehensive KPI summary for date range
   */
  async getKPISummary(
    startDate: Date,
    endDate: Date,
    campaignId?: string,
    agentId?: string
  ): Promise<KPISummary> {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      if (campaignId) params.append('campaignId', campaignId);
      if (agentId) params.append('agentId', agentId);

      const response = await fetch(`${BACKEND_URL}/api/kpi/summary?${params}`, {
        headers: await this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success ? data.data : this.getDefaultKPISummary();
    } catch (error) {
      console.error('Error fetching KPI summary:', error);
      return this.getDefaultKPISummary();
    }
  }

  /**
   * Get hourly performance breakdown
   */
  async getHourlyPerformance(
    startDate: Date,
    endDate: Date,
    campaignId?: string,
    agentId?: string
  ): Promise<HourlyData[]> {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      if (campaignId) params.append('campaignId', campaignId);
      if (agentId) params.append('agentId', agentId);

      const response = await fetch(`${BACKEND_URL}/api/kpi/hourly?${params}`, {
        headers: await this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching hourly performance:', error);
      return [];
    }
  }

  /**
   * Get call outcome distribution
   */
  async getOutcomeDistribution(
    startDate: Date,
    endDate: Date,
    campaignId?: string,
    agentId?: string
  ): Promise<OutcomeData[]> {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      if (campaignId) params.append('campaignId', campaignId);
      if (agentId) params.append('agentId', agentId);

      const response = await fetch(`${BACKEND_URL}/api/kpi/outcomes?${params}`, {
        headers: await this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching outcome distribution:', error);
      return [];
    }
  }

  /**
   * Get agent performance rankings
   */
  async getAgentPerformance(
    startDate: Date,
    endDate: Date,
    campaignId?: string
  ): Promise<AgentPerformance[]> {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      if (campaignId) params.append('campaignId', campaignId);

      const response = await fetch(`${BACKEND_URL}/api/kpi/agents?${params}`, {
        headers: await this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching agent performance:', error);
      return [];
    }
  }

  /**
   * Get dashboard overview with trends
   */
  async getDashboardOverview(): Promise<DashboardOverview> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/kpi/dashboard`, {
        headers: await this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success ? data.data : this.getDefaultDashboardOverview();
    } catch (error) {
      console.error('Error fetching dashboard overview:', error);
      return this.getDefaultDashboardOverview();
    }
  }

  /**
   * Get campaign-specific metrics
   */
  async getCampaignMetrics(campaignId: string, days: number = 7): Promise<CampaignMetrics> {
    try {
      const params = new URLSearchParams({
        days: days.toString()
      });

      const response = await fetch(`${BACKEND_URL}/api/kpi/campaign/${campaignId}?${params}`, {
        headers: await this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success ? data.data : this.getDefaultCampaignMetrics();
    } catch (error) {
      console.error('Error fetching campaign metrics:', error);
      return this.getDefaultCampaignMetrics();
    }
  }

  /**
   * Record a call KPI entry
   */
  async recordCallKPI(kpiData: {
    campaignId: string;
    agentId: string;
    contactId: string;
    callId: string;
    disposition: string;
    dispositionCategory: 'positive' | 'neutral' | 'negative';
    callDuration: number;
    outcome: string;
    notes?: string;
  }): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/kpi/record`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(kpiData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error recording call KPI:', error);
      return false;
    }
  }

  /**
   * LEGACY METHODS - For backward compatibility
   */

  /**
   * Get dashboard statistics (legacy format)
   * @deprecated Use getDashboardOverview() instead
   */
  async getDashboardStats(agentId?: string): Promise<DashboardStats> {
    try {
      // Convert new format to legacy format
      const overview = await this.getDashboardOverview();
      const todayData = overview.today;

      return {
        today: {
          todayCalls: todayData.totalCalls,
          successfulCalls: todayData.positiveCalls,
          totalTalkTime: todayData.averageCallDuration * todayData.totalCalls,
          conversionRate: todayData.conversionRate,
          activeContacts: todayData.contactedCalls,
          callsAttempted: todayData.totalCalls,
          callsConnected: todayData.contactedCalls,
          callsAnswered: todayData.contactedCalls,
          averageCallDuration: todayData.averageCallDuration,
          answeredCallRate: todayData.contactRate,
          connectionRate: todayData.contactRate
        },
        trends: {
          callsTrend: overview.trends.volume,
          successTrend: overview.trends.conversion,
          conversionTrend: overview.trends.conversion,
          contactsTrend: overview.trends.contact
        },
        historical: []
      };
    } catch (error) {
      console.error('Error fetching legacy dashboard stats:', error);
      return this.getDefaultDashboardStats();
    }
  }

  /**
   * Get agent-specific KPI stats (legacy)
   * @deprecated Use getKPISummary() with agentId instead
   */
  async getAgentKpis(agentId: string, dateFrom?: Date, dateTo?: Date) {
    const startDate = dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = dateTo || new Date();
    
    return await this.getKPISummary(startDate, endDate, undefined, agentId);
  }

  /**
   * Get campaign-specific KPI stats (legacy)
   * @deprecated Use getCampaignMetrics() instead
   */
  async getCampaignKpis(campaignId: string, dateFrom?: Date, dateTo?: Date) {
    const days = dateFrom && dateTo ? 
      Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)) : 7;
    
    return await this.getCampaignMetrics(campaignId, days);
  }

  /**
   * Default values and fallbacks
   */
  private getDefaultKPISummary(): KPISummary {
    return {
      totalCalls: 0,
      contactedCalls: 0,
      positiveCalls: 0,
      neutralCalls: 0,
      negativeCalls: 0,
      averageCallDuration: 0,
      conversionRate: 0,
      contactRate: 0,
      dispositionBreakdown: {},
      categoryBreakdown: { positive: 0, neutral: 0, negative: 0 },
      hourlyBreakdown: {},
      dailyBreakdown: {},
      campaignBreakdown: {},
      agentBreakdown: {}
    };
  }

  private getDefaultDashboardOverview(): DashboardOverview {
    const defaultSummary = this.getDefaultKPISummary();
    return {
      today: defaultSummary,
      thisWeek: defaultSummary,
      trends: { conversion: 0, contact: 0, volume: 0 }
    };
  }

  private getDefaultCampaignMetrics(): CampaignMetrics {
    return {
      summary: this.getDefaultKPISummary(),
      hourlyTrend: [],
      outcomeBreakdown: [],
      dateRange: { start: new Date(), end: new Date() }
    };
  }

  private getDefaultDashboardStats(): DashboardStats {
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

export const kpiApi = new KpiApiService();