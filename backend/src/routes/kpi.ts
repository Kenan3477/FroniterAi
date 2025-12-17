/**
 * KPI Routes - Dashboard statistics and metrics
 */

import express from 'express';

const router = express.Router();

// Get dashboard stats (basic implementation)
router.get('/dashboard', async (req, res) => {
  try {
    // Return mock dashboard data matching frontend expectations
    const dashboardStats = {
      success: true,
      today: {
        todayCalls: 0,
        successfulCalls: 0,
        totalTalkTime: 0,
        conversionRate: 0
      },
      week: {
        weekCalls: 0,
        weekSuccessful: 0,
        weekTalkTime: 0,
        weekConversion: 0
      },
      trends: {
        callsTrend: null,
        successTrend: null,
        timeTrend: null,
        conversionTrend: null
      },
      recentActivity: [],
      campaignProgress: {
        activeCampaigns: 0,
        totalContacts: 0,
        contactedToday: 0
      }
    };

    console.log('✅ KPI Dashboard stats requested - returning mock data');
    res.json(dashboardStats);
  } catch (error) {
    console.error('❌ KPI Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch dashboard statistics' }
    });
  }
});

export default router;