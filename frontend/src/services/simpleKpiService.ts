/**
 * Simple KPI Tracking Service
 * Mock implementation for testing reports functionality
 */

export interface CallKPIData {
  campaignId: string;
  agentId: string;
  contactId: string;
  callId: string;
  disposition: string;
  dispositionCategory: 'positive' | 'neutral' | 'negative';
  callDuration: number;
  callDate: Date;
  hourOfDay: number;
  dayOfWeek: number;
  outcome: string;
  notes?: string;
}

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
  agentName: string;
  totalCalls: number;
  conversions: number;
  conversionRate: number;
  averageCallDuration: number;
  contactRate: number;
}

// Mock data store
const mockKPIData: CallKPIData[] = [];

/**
 * Records a call KPI entry
 */
export async function recordCallKPI(data: CallKPIData): Promise<void> {
  try {
    // For now, just store in memory
    mockKPIData.push({
      ...data,
      callDate: new Date(data.callDate),
    });
    
    console.log('KPI recorded:', data);
  } catch (error) {
    console.error('Error recording KPI:', error);
    throw error;
  }
}

/**
 * Get comprehensive KPI summary for a date range
 */
export async function getKPISummary(
  campaignId?: string,
  agentId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<KPISummary> {
  try {
    // Filter data based on parameters
    let filteredData = [...mockKPIData];
    
    if (campaignId) {
      filteredData = filteredData.filter(record => record.campaignId === campaignId);
    }
    
    if (agentId) {
      filteredData = filteredData.filter(record => record.agentId === agentId);
    }
    
    if (startDate || endDate) {
      filteredData = filteredData.filter(record => {
        const recordDate = new Date(record.callDate);
        if (startDate && recordDate < startDate) return false;
        if (endDate && recordDate > endDate) return false;
        return true;
      });
    }

    // Generate mock data if no real data exists
    if (filteredData.length === 0) {
      filteredData = generateMockKPIData(campaignId, agentId);
    }

    // Calculate aggregations
    const totalCalls = filteredData.length;
    const totalDuration = filteredData.reduce((sum: number, record: CallKPIData) => sum + record.callDuration, 0);
    const averageCallDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
    
    const positiveCalls = filteredData.filter((r: CallKPIData) => r.dispositionCategory === 'positive').length;
    const neutralCalls = filteredData.filter((r: CallKPIData) => r.dispositionCategory === 'neutral').length;
    const negativeCalls = filteredData.filter((r: CallKPIData) => r.dispositionCategory === 'negative').length;
    const contactedCalls = filteredData.filter((r: CallKPIData) => 
      !['no-answer', 'busy', 'disconnected'].includes(r.disposition.toLowerCase())
    ).length;

    const conversionRate = totalCalls > 0 ? (positiveCalls / totalCalls) * 100 : 0;
    const contactRate = totalCalls > 0 ? (contactedCalls / totalCalls) * 100 : 0;

    // Disposition breakdown
    const dispositionBreakdown = filteredData.reduce((acc: { [key: string]: number }, record: CallKPIData) => {
      acc[record.disposition] = (acc[record.disposition] || 0) + 1;
      return acc;
    }, {});

    // Category breakdown
    const categoryBreakdown = filteredData.reduce((acc: { [key: string]: number }, record: CallKPIData) => {
      acc[record.dispositionCategory] = (acc[record.dispositionCategory] || 0) + 1;
      return acc;
    }, {});

    // Hourly breakdown
    const hourlyBreakdown = filteredData.reduce((acc: { [key: string]: { calls: number; conversions: number } }, record: CallKPIData) => {
      const hour = record.hourOfDay.toString().padStart(2, '0') + ':00';
      if (!acc[hour]) acc[hour] = { calls: 0, conversions: 0 };
      acc[hour].calls += 1;
      if (record.dispositionCategory === 'positive') acc[hour].conversions += 1;
      return acc;
    }, {});

    // Daily breakdown
    const dailyBreakdown = filteredData.reduce((acc: { [key: string]: { calls: number; conversions: number } }, record: CallKPIData) => {
      const date = new Date(record.callDate).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = { calls: 0, conversions: 0 };
      acc[date].calls += 1;
      if (record.dispositionCategory === 'positive') acc[date].conversions += 1;
      return acc;
    }, {});

    // Campaign breakdown (if not filtered by campaign)
    const campaignBreakdown = filteredData.reduce((acc: { [key: string]: { calls: number; conversions: number } }, record: CallKPIData) => {
      if (!acc[record.campaignId]) acc[record.campaignId] = { calls: 0, conversions: 0 };
      acc[record.campaignId].calls += 1;
      if (record.dispositionCategory === 'positive') acc[record.campaignId].conversions += 1;
      return acc;
    }, {});

    // Agent breakdown (if not filtered by agent)
    const agentBreakdown = filteredData.reduce((acc: { [key: string]: { calls: number; conversions: number } }, record: CallKPIData) => {
      if (!acc[record.agentId]) acc[record.agentId] = { calls: 0, conversions: 0 };
      acc[record.agentId].calls += 1;
      if (record.dispositionCategory === 'positive') acc[record.agentId].conversions += 1;
      return acc;
    }, {});

    return {
      totalCalls,
      contactedCalls,
      positiveCalls,
      neutralCalls,
      negativeCalls,
      averageCallDuration,
      conversionRate,
      contactRate,
      dispositionBreakdown,
      categoryBreakdown,
      hourlyBreakdown,
      dailyBreakdown,
      campaignBreakdown,
      agentBreakdown
    };
  } catch (error) {
    console.error('Error getting KPI summary:', error);
    throw error;
  }
}

/**
 * Get hourly breakdown data for charts
 */
export async function getHourlyBreakdown(
  campaignId?: string,
  agentId?: string,
  date?: Date
): Promise<HourlyData[]> {
  try {
    // Generate mock hourly data
    const hourlyData = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const hourString = hour.toString().padStart(2, '0') + ':00';
      const totalCalls = Math.floor(Math.random() * 50) + 10; // 10-59 calls
      const conversions = Math.floor(totalCalls * (0.1 + Math.random() * 0.2)); // 10-30% conversion
      
      hourlyData.push({
        hour: hourString,
        totalCalls,
        conversions,
        conversionRate: totalCalls > 0 ? (conversions / totalCalls) * 100 : 0,
        averageDuration: 120 + Math.floor(Math.random() * 300) // 2-7 minutes
      });
    }

    return hourlyData;
  } catch (error) {
    console.error('Error getting hourly breakdown:', error);
    throw error;
  }
}

/**
 * Get outcome distribution data
 */
export async function getOutcomeDistribution(
  campaignId?: string,
  agentId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<OutcomeData[]> {
  try {
    // Generate mock outcome data
    const outcomes = [
      { outcome: 'Sale', count: 45, percentage: 15.2 },
      { outcome: 'Interested', count: 78, percentage: 26.4 },
      { outcome: 'Callback Scheduled', count: 64, percentage: 21.6 },
      { outcome: 'Not Interested', count: 89, percentage: 30.1 },
      { outcome: 'Wrong Number', count: 20, percentage: 6.7 }
    ];

    return outcomes;
  } catch (error) {
    console.error('Error getting outcome distribution:', error);
    throw error;
  }
}

/**
 * Get agent performance data
 */
export async function getAgentPerformance(
  campaignId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<AgentPerformance[]> {
  try {
    // Generate mock agent performance data
    const agents = [
      {
        agentId: 'agent1',
        agentName: 'John Smith',
        totalCalls: 47,
        conversions: 12,
        conversionRate: 25.5,
        averageCallDuration: 245,
        contactRate: 72.3
      },
      {
        agentId: 'agent2',
        agentName: 'Sarah Wilson',
        totalCalls: 52,
        conversions: 15,
        conversionRate: 28.8,
        averageCallDuration: 198,
        contactRate: 68.9
      },
      {
        agentId: 'agent3',
        agentName: 'Mike Johnson',
        totalCalls: 38,
        conversions: 8,
        conversionRate: 21.1,
        averageCallDuration: 267,
        contactRate: 75.1
      }
    ];

    return agents;
  } catch (error) {
    console.error('Error getting agent performance:', error);
    throw error;
  }
}

// Helper function to generate mock KPI data
function generateMockKPIData(campaignId?: string, agentId?: string): CallKPIData[] {
  const mockData: CallKPIData[] = [];
  const dispositions = [
    { name: 'Sale', category: 'positive' as const },
    { name: 'Interested', category: 'positive' as const },
    { name: 'Callback Scheduled', category: 'neutral' as const },
    { name: 'Not Interested', category: 'negative' as const },
    { name: 'No Answer', category: 'neutral' as const },
    { name: 'Busy', category: 'neutral' as const },
    { name: 'Wrong Number', category: 'negative' as const }
  ];

  for (let i = 0; i < 100; i++) {
    const disposition = dispositions[Math.floor(Math.random() * dispositions.length)];
    const callDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days
    
    mockData.push({
      campaignId: campaignId || `campaign_${Math.floor(Math.random() * 3) + 1}`,
      agentId: agentId || `agent_${Math.floor(Math.random() * 5) + 1}`,
      contactId: `contact_${i + 1}`,
      callId: `call_${i + 1}`,
      disposition: disposition.name,
      dispositionCategory: disposition.category,
      callDuration: Math.floor(Math.random() * 600) + 60, // 1-11 minutes
      callDate,
      hourOfDay: callDate.getHours(),
      dayOfWeek: callDate.getDay(),
      outcome: disposition.name,
      notes: Math.random() > 0.7 ? `Notes for call ${i + 1}` : undefined
    });
  }

  return mockData;
}