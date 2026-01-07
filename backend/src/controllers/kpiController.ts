/**
 * KPI Controller - Real database-driven analytics endpoints
 * Replaces mock endpoints with actual KPI calculations
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { realKPIService } from '../services/realKpiService';

// Validation schemas
const dateRangeSchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  campaignId: z.string().optional(),
  agentId: z.string().optional()
});

const kpiRecordSchema = z.object({
  campaignId: z.string(),
  agentId: z.string(),
  contactId: z.string(),
  callId: z.string(),
  disposition: z.string(),
  dispositionCategory: z.enum(['positive', 'neutral', 'negative']),
  callDuration: z.number().min(0),
  outcome: z.string(),
  notes: z.string().optional()
});

/**
 * Get comprehensive KPI summary for date range
 */
export const getKPISummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, campaignId, agentId } = dateRangeSchema.parse(req.query);

    console.log(`📊 Getting KPI summary for ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    const summary = await realKPIService.getKPISummary(startDate, endDate, campaignId, agentId);

    res.json({
      success: true,
      data: summary,
      meta: {
        dateRange: { start: startDate, end: endDate },
        filters: { campaignId, agentId }
      }
    });

  } catch (error) {
    console.error('❌ Error getting KPI summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get KPI summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get hourly performance breakdown
 */
export const getHourlyPerformance = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, campaignId, agentId } = dateRangeSchema.parse(req.query);

    console.log(`📈 Getting hourly performance data`);

    const hourlyData = await realKPIService.getHourlyData(startDate, endDate, campaignId, agentId);

    res.json({
      success: true,
      data: hourlyData,
      meta: {
        dateRange: { start: startDate, end: endDate },
        filters: { campaignId, agentId }
      }
    });

  } catch (error) {
    console.error('❌ Error getting hourly performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get hourly performance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get call outcome distribution
 */
export const getOutcomeDistribution = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, campaignId, agentId } = dateRangeSchema.parse(req.query);

    console.log(`🎯 Getting outcome distribution`);

    const outcomeData = await realKPIService.getOutcomeData(startDate, endDate, campaignId, agentId);

    res.json({
      success: true,
      data: outcomeData,
      meta: {
        dateRange: { start: startDate, end: endDate },
        filters: { campaignId, agentId }
      }
    });

  } catch (error) {
    console.error('❌ Error getting outcome distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get outcome distribution',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get agent performance rankings
 */
export const getAgentPerformance = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, campaignId } = dateRangeSchema.parse(req.query);

    console.log(`🏆 Getting agent performance rankings`);

    const agentPerformance = await realKPIService.getAgentPerformance(startDate, endDate, campaignId);

    res.json({
      success: true,
      data: agentPerformance,
      meta: {
        dateRange: { start: startDate, end: endDate },
        filters: { campaignId }
      }
    });

  } catch (error) {
    console.error('❌ Error getting agent performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent performance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get campaign-specific metrics
 */
export const getCampaignMetrics = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { days } = req.query;

    const daysNumber = days ? parseInt(days as string) : 7;

    console.log(`📊 Getting campaign metrics for ${campaignId} (${daysNumber} days)`);

    const metrics = await realKPIService.getCampaignMetrics(campaignId, daysNumber);

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('❌ Error getting campaign metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Record a new call KPI entry
 */
export const recordCallKPI = async (req: Request, res: Response) => {
  try {
    const kpiData = kpiRecordSchema.parse(req.body);

    console.log(`📝 Recording KPI for call ${kpiData.callId}`);

    await realKPIService.recordCallKPI(kpiData);

    res.json({
      success: true,
      message: 'Call KPI recorded successfully'
    });

  } catch (error) {
    console.error('❌ Error recording call KPI:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid KPI data',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to record call KPI',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

/**
 * Get dashboard overview with key metrics
 */
export const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    console.log(`📈 Getting dashboard overview`);

    // Get today's metrics
    const todayMetrics = await realKPIService.getKPISummary(today, today);
    
    // Get this week's metrics
    const thisWeekMetrics = await realKPIService.getKPISummary(thisWeekStart, today);
    
    // Get last week's metrics for comparison
    const lastWeekMetrics = await realKPIService.getKPISummary(lastWeekStart, lastWeekEnd);

    // Calculate trends
    const conversionTrend = thisWeekMetrics.conversionRate - lastWeekMetrics.conversionRate;
    const contactTrend = thisWeekMetrics.contactRate - lastWeekMetrics.contactRate;
    const volumeTrend = ((thisWeekMetrics.totalCalls - lastWeekMetrics.totalCalls) / (lastWeekMetrics.totalCalls || 1)) * 100;

    res.json({
      success: true,
      data: {
        today: todayMetrics,
        thisWeek: thisWeekMetrics,
        trends: {
          conversion: conversionTrend,
          contact: contactTrend,
          volume: volumeTrend
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting dashboard overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard overview',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};