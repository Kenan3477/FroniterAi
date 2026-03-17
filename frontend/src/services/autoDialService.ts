/**
 * Enhanced Auto-Dial Service - Phase 3
 * Frontend service for auto-dial functionality with predictive capabilities
 */

export interface AutoDialStatus {
  isActive: boolean;
  isPaused: boolean;
  campaignId?: string;
  dialCount: number;
  queueDepth: number;
  lastDialAttempt?: string;
  predictiveMode: boolean;
  dialRatio?: number;
  lastPredictiveDecision?: PredictiveDecision;
}

export interface PredictiveDecision {
  shouldDial: boolean;
  dialRatio: number;
  callsToPlace: number;
  reasoning: string;
  predictedOutcome: {
    expectedAnswers: number;
    expectedAbandonments: number;
    agentUtilizationImpact: number;
  };
}

export interface PredictiveStats {
  campaignId: string;
  averageAnswerRate: number;
  averageAbandonmentRate: number;
  averageUtilization: number;
  dataPoints: number;
  timeSpan: number;
}

export interface EnhancedAutoDialSession {
  agentId: string;
  campaignId: string;
  isActive: boolean;
  isPaused: boolean;
  dialCount: number;
  sessionStartTime: string;
  lastDialAttempt?: string;
  predictiveMode: boolean;
  dialRatio?: number;
  queueDepth: number;
  lastPredictiveDecision?: PredictiveDecision;
}

class AutoDialService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://froniterai-production.up.railway.app'
      : 'http://localhost:3001';
  }

  /**
   * Start auto-dial for an agent with optional predictive mode
   */
  async startAutoDial(
    agentId: string, 
    campaignId: string, 
    enablePredictive: boolean = false
  ): Promise<{ success: boolean; message: string; autoDialStatus?: AutoDialStatus }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auto-dial/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agentId, 
          campaignId, 
          enablePredictive 
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error starting auto-dial:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to start auto-dial' 
      };
    }
  }

  /**
   * Stop auto-dial for an agent
   */
  async stopAutoDial(agentId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auto-dial/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error stopping auto-dial:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to stop auto-dial' 
      };
    }
  }

  /**
   * Pause auto-dial for an agent
   */
  async pauseAutoDial(agentId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auto-dial/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error pausing auto-dial:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to pause auto-dial' 
      };
    }
  }

  /**
   * Resume auto-dial for an agent
   */
  async resumeAutoDial(agentId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auto-dial/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error resuming auto-dial:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to resume auto-dial' 
      };
    }
  }

  /**
   * Get auto-dial status for an agent
   */
  async getAutoDialStatus(agentId: string): Promise<AutoDialStatus | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auto-dial/status/${agentId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        return data.success ? data.session : null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching auto-dial status:', error);
      return null;
    }
  }

  /**
   * Get predictive dialing statistics for a campaign
   */
  async getPredictiveStats(campaignId: string): Promise<PredictiveStats | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auto-dial/predictive-stats/${campaignId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        return data.success ? data.data.stats : null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching predictive stats:', error);
      return null;
    }
  }

  /**
   * Get all enhanced active auto-dial sessions
   */
  async getEnhancedActiveSessions(): Promise<EnhancedAutoDialSession[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auto-dial/enhanced-active-sessions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        return data.success ? data.data.sessions : [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching enhanced active sessions:', error);
      return [];
    }
  }

  /**
   * Poll auto-dial status with callback
   */
  startStatusPolling(
    agentId: string, 
    callback: (status: AutoDialStatus | null) => void, 
    interval: number = 5000
  ): NodeJS.Timeout {
    const poll = async () => {
      const status = await this.getAutoDialStatus(agentId);
      callback(status);
    };

    // Initial poll
    poll();
    
    // Set up interval polling
    return setInterval(poll, interval);
  }

  /**
   * Stop status polling
   */
  stopStatusPolling(pollingInterval: NodeJS.Timeout): void {
    clearInterval(pollingInterval);
  }
}

// Export singleton instance
export const autoDialService = new AutoDialService();
export default autoDialService;