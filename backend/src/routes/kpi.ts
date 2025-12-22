/**
 * KPI Routes - Dashboard statistics and metrics
 * Production-ready KPI calculation based on real database data
 */

import express from 'express';
import { getDashboardStats, getAgentKPIs, getCampaignKPIs } from '../services/kpiService';

const router = express.Router();

// Get dashboard stats (production implementation)
router.get('/dashboard', async (req, res) => {
  try {
    const dashboardStats = await getDashboardStats();
    
    console.log('✅ KPI Dashboard stats calculated from real data');
    res.json({
      success: true,
      ...dashboardStats
    });
  } catch (error) {
    console.error('❌ KPI Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch dashboard statistics' }
    });
  }
});

// Get agent KPIs
router.get('/agents', async (req, res) => {
  try {
    const agentId = req.query.agentId as string;
    const agentKPIs = await getAgentKPIs(agentId);
    
    res.json({
      success: true,
      data: agentKPIs
    });
  } catch (error) {
    console.error('❌ Agent KPI error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch agent KPIs' }
    });
  }
});

// Get campaign KPIs
router.get('/campaigns', async (req, res) => {
  try {
    const campaignId = req.query.campaignId as string;
    const campaignKPIs = await getCampaignKPIs(campaignId);
    
    res.json({
      success: true,
      data: campaignKPIs
    });
  } catch (error) {
    console.error('❌ Campaign KPI error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch campaign KPIs' }
    });
  }
});

export default router;