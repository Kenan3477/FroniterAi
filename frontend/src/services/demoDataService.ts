/**
 * Demo data service for preview mode
 * Provides sample data for non-authenticated users
 */

export interface DemoStats {
  today: {
    todayCalls: number;
    successfulCalls: number;
    activeContacts: number;
    conversionRate: number;
  };
  trends: {
    callsTrend: number;
    successTrend: number;
    contactsTrend: number;
    conversionTrend: number;
  };
}

export interface DemoActivity {
  id: string;
  type: 'call' | 'email' | 'meeting';
  contact: string;
  description: string;
  time: string;
  status: 'success' | 'pending' | 'failed';
}

class DemoDataService {
  /**
   * Get demo dashboard statistics
   */
  getDemoStats(): DemoStats {
    return {
      today: {
        todayCalls: 247,
        successfulCalls: 156,
        activeContacts: 1243,
        conversionRate: 63.2,
      },
      trends: {
        callsTrend: 12.5,
        successTrend: 8.3,
        contactsTrend: 15.7,
        conversionTrend: 2.1,
      }
    };
  }

  /**
   * Get demo recent activity
   */
  getDemoActivity(): DemoActivity[] {
    return [
      {
        id: '1',
        type: 'call',
        contact: 'John Smith',
        description: 'Outbound call completed successfully',
        time: '5 minutes ago',
        status: 'success'
      },
      {
        id: '2',
        type: 'email',
        contact: 'Sarah Johnson',
        description: 'Follow-up email sent to lead',
        time: '15 minutes ago',
        status: 'success'
      },
      {
        id: '3',
        type: 'meeting',
        contact: 'Michael Brown',
        description: 'Demo meeting scheduled for next week',
        time: '32 minutes ago',
        status: 'pending'
      },
      {
        id: '4',
        type: 'call',
        contact: 'Maria Garcia',
        description: 'Call attempt - no answer, will retry',
        time: '48 minutes ago',
        status: 'failed'
      },
      {
        id: '5',
        type: 'email',
        contact: 'David Wilson',
        description: 'Lead qualification email sent',
        time: '67 minutes ago',
        status: 'success'
      }
    ];
  }

  /**
   * Get demo user data for preview mode
   */
  getDemoUser() {
    return {
      id: 0,
      username: 'preview-user',
      email: 'demo@omnivox-ai.com',
      firstName: 'Demo',
      lastName: 'User',
      role: 'AGENT'
    };
  }
}

export const demoDataService = new DemoDataService();