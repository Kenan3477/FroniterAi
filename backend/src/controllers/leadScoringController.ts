/**
 * Lead Scoring Controller
 * Phase 3: Advanced AI Dialler Implementation
 */

import { Request, Response } from 'express';
import { LeadScoringService, LeadScore } from '../services/leadScoringService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const leadScoringService = new LeadScoringService();

export class LeadScoringController {
  
  /**
   * Calculate lead score for a specific contact
   */
  static async calculateContactScore(req: Request, res: Response): Promise<Response> {
    try {
      const { contactId } = req.params;
      const { campaignId } = req.query;
      
      if (!contactId) {
        return res.status(400).json({
          success: false,
          error: 'Contact ID is required'
        });
      }
      
      // Verify contact exists
      const contact = await prisma.contact.findUnique({
        where: { contactId }
      });
      
      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Contact not found'
        });
      }
      
      // Calculate lead score
      const leadScore = await leadScoringService.calculateLeadScore(
        contactId,
        campaignId as string
      );
      
      return res.status(200).json({
        success: true,
        data: {
          contactId,
          leadScore
        }
      });
      
    } catch (error) {
      console.error('Lead score calculation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to calculate lead score'
      });
    }
  }
  
  /**
   * Get prioritized contact list for campaign
   */
  static async getCampaignPrioritizedList(req: Request, res: Response): Promise<Response> {
    try {
      const { campaignId } = req.params;
      const { limit = '100' } = req.query;
      
      if (!campaignId) {
        return res.status(400).json({
          success: false,
          error: 'Campaign ID is required'
        });
      }
      
      // Verify campaign exists
      const campaign = await prisma.campaign.findUnique({
        where: { campaignId }
      });
      
      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      }
      
      // Get prioritized contact list
      const prioritizedList = await leadScoringService.getPrioritizedContacts(
        campaignId,
        parseInt(limit as string)
      );
      
      // Add summary statistics
      const scoreDistribution = this.calculateScoreDistribution(prioritizedList);
      const averageScore = prioritizedList.length > 0 
        ? prioritizedList.reduce((sum, item) => sum + item.leadScore.score, 0) / prioritizedList.length
        : 0;
      
      return res.status(200).json({
        success: true,
        data: {
          campaignId,
          totalContacts: prioritizedList.length,
          averageScore: Math.round(averageScore * 100) / 100,
          scoreDistribution,
          prioritizedContacts: prioritizedList
        }
      });
      
    } catch (error) {
      console.error('Campaign prioritization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get prioritized contact list'
      });
    }
  }
  
  /**
   * Batch calculate lead scores
   */
  static async batchCalculateScores(req: Request, res: Response): Promise<Response> {
    try {
      const { contactIds, campaignId } = req.body;
      
      if (!contactIds || !Array.isArray(contactIds)) {
        return res.status(400).json({
          success: false,
          error: 'Contact IDs array is required'
        });
      }
      
      if (contactIds.length > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 1000 contacts per batch'
        });
      }
      
      // Calculate scores for all contacts
      const scoredContacts = await leadScoringService.batchCalculateScores(
        contactIds,
        campaignId
      );
      
      // Generate batch statistics
      const statistics = this.generateBatchStatistics(scoredContacts);
      
      return res.status(200).json({
        success: true,
        data: {
          batchSize: contactIds.length,
          processedCount: scoredContacts.length,
          statistics,
          scoredContacts
        }
      });
      
    } catch (error) {
      console.error('Batch scoring error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to calculate batch scores'
      });
    }
  }
  
  /**
   * Update lead score based on interaction outcome
   */
  static async updateScoreFromInteraction(req: Request, res: Response): Promise<Response> {
    try {
      const { contactId } = req.params;
      const { outcome, sentiment, duration, channel, agentNotes } = req.body;
      
      if (!contactId || !outcome || !channel) {
        return res.status(400).json({
          success: false,
          error: 'Contact ID, outcome, and channel are required'
        });
      }
      
      // Update score based on interaction
      await leadScoringService.updateScoreFromInteraction(contactId, {
        outcome,
        sentiment,
        duration,
        channel,
        agentNotes
      });
      
      // Get updated score
      const updatedScore = await leadScoringService.calculateLeadScore(contactId);
      
      return res.status(200).json({
        success: true,
        data: {
          contactId,
          updatedScore,
          message: 'Lead score updated successfully'
        }
      });
      
    } catch (error) {
      console.error('Score update error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update lead score'
      });
    }
  }
  
  /**
   * Get lead scoring analytics for campaign or agent
   */
  static async getLeadScoringAnalytics(req: Request, res: Response): Promise<Response> {
    try {
      const { campaignId, agentId, dateFrom, dateTo } = req.query;
      
      if (!campaignId && !agentId) {
        return res.status(400).json({
          success: false,
          error: 'Campaign ID or Agent ID is required'
        });
      }
      
      // Build analytics based on available data
      const analytics = await this.buildScoringAnalytics({
        campaignId: campaignId as string,
        agentId: agentId as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined
      });
      
      return res.status(200).json({
        success: true,
        data: analytics
      });
      
    } catch (error) {
      console.error('Analytics error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate scoring analytics'
      });
    }
  }
  
  /**
   * Get lead score trends over time
   */
  static async getScoreTrends(req: Request, res: Response): Promise<Response> {
    try {
      const { contactId, campaignId } = req.params;
      const { period = '30d' } = req.query;
      
      if (!contactId && !campaignId) {
        return res.status(400).json({
          success: false,
          error: 'Contact ID or Campaign ID is required'
        });
      }
      
      // Calculate date range
      const dateRange = this.calculateDateRange(period as string);
      
      // Get trend data (placeholder for now)
      const trendData = await this.calculateScoreTrends({
        contactId,
        campaignId,
        dateRange
      });
      
      return res.status(200).json({
        success: true,
        data: {
          period,
          dateRange,
          trends: trendData
        }
      });
      
    } catch (error) {
      console.error('Score trends error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get score trends'
      });
    }
  }
  
  /**
   * Get next best contacts to call
   */
  static async getNextBestContacts(req: Request, res: Response): Promise<Response> {
    try {
      const { campaignId, agentId, limit = '50' } = req.query;
      
      if (!campaignId) {
        return res.status(400).json({
          success: false,
          error: 'Campaign ID is required'
        });
      }
      
      // Get prioritized list
      const prioritizedList = await leadScoringService.getPrioritizedContacts(
        campaignId as string,
        parseInt(limit as string)
      );
      
      // Filter based on agent preferences if provided
      let filteredList = prioritizedList;
      if (agentId) {
        filteredList = await this.filterForAgent(prioritizedList, agentId as string);
      }
      
      // Sort by optimal contact time
      const currentHour = new Date().getHours();
      const optimizedList = this.optimizeForCurrentTime(filteredList, currentHour);
      
      return res.status(200).json({
        success: true,
        data: {
          campaignId,
          agentId,
          currentTime: new Date().toISOString(),
          recommendedContacts: optimizedList.slice(0, parseInt(limit as string)),
          totalAvailable: filteredList.length
        }
      });
      
    } catch (error) {
      console.error('Next best contacts error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get next best contacts'
      });
    }
  }
  
  /**
   * Helper Methods
   */
  
  /**
   * Calculate score distribution for analytics
   */
  private static calculateScoreDistribution(scoredContacts: Array<{ leadScore: LeadScore }>) {
    const distribution = {
      urgent: 0,    // 0.8+
      high: 0,      // 0.6-0.8
      medium: 0,    // 0.4-0.6
      low: 0        // <0.4
    };
    
    scoredContacts.forEach(({ leadScore }) => {
      if (leadScore.score >= 0.8) distribution.urgent++;
      else if (leadScore.score >= 0.6) distribution.high++;
      else if (leadScore.score >= 0.4) distribution.medium++;
      else distribution.low++;
    });
    
    return distribution;
  }
  
  /**
   * Generate batch processing statistics
   */
  private static generateBatchStatistics(scoredContacts: Array<{ contactId: string; score: LeadScore }>) {
    if (scoredContacts.length === 0) {
      return {
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        averageConfidence: 0,
        priorityDistribution: { urgent: 0, high: 0, medium: 0, low: 0 }
      };
    }
    
    const scores = scoredContacts.map(sc => sc.score.score);
    const confidences = scoredContacts.map(sc => sc.score.confidence);
    
    const priorityDistribution = {
      urgent: scoredContacts.filter(sc => sc.score.priority === 'urgent').length,
      high: scoredContacts.filter(sc => sc.score.priority === 'high').length,
      medium: scoredContacts.filter(sc => sc.score.priority === 'medium').length,
      low: scoredContacts.filter(sc => sc.score.priority === 'low').length
    };
    
    return {
      averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      averageConfidence: confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length,
      priorityDistribution
    };
  }
  
  /**
   * Build scoring analytics
   */
  private static async buildScoringAnalytics(params: {
    campaignId?: string;
    agentId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    // This would query actual scoring data from the database
    // For now, return placeholder analytics
    
    return {
      scoreAccuracy: {
        predictedConversions: 45,
        actualConversions: 38,
        accuracy: 0.84
      },
      scoreDistribution: {
        urgent: 12,
        high: 28,
        medium: 45,
        low: 15
      },
      conversionRateByScore: {
        urgent: 0.35,
        high: 0.22,
        medium: 0.12,
        low: 0.05
      },
      averageScoreByOutcome: {
        'SALE': 0.85,
        'HOT_LEAD': 0.72,
        'WARM_LEAD': 0.58,
        'NOT_INTERESTED': 0.25
      },
      scoreTrends: {
        improving: 23,
        stable: 52,
        declining: 15
      }
    };
  }
  
  /**
   * Calculate score trends over time
   */
  private static async calculateScoreTrends(params: {
    contactId?: string;
    campaignId?: string;
    dateRange: { from: Date; to: Date };
  }) {
    // This would calculate actual trends from historical scoring data
    // For now, return placeholder trend data
    
    const days = Math.ceil((params.dateRange.to.getTime() - params.dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    const trendPoints = [];
    
    for (let i = 0; i < Math.min(30, days); i++) {
      const date = new Date(params.dateRange.from);
      date.setDate(date.getDate() + i);
      
      trendPoints.push({
        date: date.toISOString().split('T')[0],
        averageScore: 0.5 + (Math.random() - 0.5) * 0.4,
        contactCount: Math.floor(Math.random() * 50) + 10
      });
    }
    
    return trendPoints;
  }
  
  /**
   * Calculate date range from period string
   */
  private static calculateDateRange(period: string): { from: Date; to: Date } {
    const to = new Date();
    const from = new Date();
    
    switch (period) {
      case '7d':
        from.setDate(from.getDate() - 7);
        break;
      case '30d':
        from.setDate(from.getDate() - 30);
        break;
      case '90d':
        from.setDate(from.getDate() - 90);
        break;
      default:
        from.setDate(from.getDate() - 30);
    }
    
    return { from, to };
  }
  
  /**
   * Filter contacts for specific agent preferences
   */
  private static async filterForAgent(
    contacts: Array<{ contact: any; leadScore: LeadScore }>,
    agentId: string
  ): Promise<Array<{ contact: any; leadScore: LeadScore }>> {
    // This would filter based on agent skills, preferences, and performance
    // For now, return all contacts
    return contacts;
  }
  
  /**
   * Optimize contact list for current time
   */
  private static optimizeForCurrentTime(
    contacts: Array<{ contact: any; leadScore: LeadScore }>,
    currentHour: number
  ): Array<{ contact: any; leadScore: LeadScore }> {
    // Sort by time-to-contact and current time optimization
    return contacts.sort((a, b) => {
      const aScore = a.leadScore.score;
      const bScore = b.leadScore.score;
      
      const aTimeOptimal = Math.abs(currentHour - 14) < 4; // Peak calling hours
      const bTimeOptimal = Math.abs(currentHour - 14) < 4;
      
      if (aTimeOptimal && !bTimeOptimal) return -1;
      if (!aTimeOptimal && bTimeOptimal) return 1;
      
      return bScore - aScore; // Higher score first
    });
  }
}

export default LeadScoringController;