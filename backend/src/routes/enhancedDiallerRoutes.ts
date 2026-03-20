/**
 * Enhanced Auto-Dialler API Routes
 * Real-time campaign dialling with configurable rate control
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { authenticate, requireRole } from '../middleware/auth';
import EnhancedAutoDialler from '../services/enhancedAutoDialler';

export function createEnhancedDiallerRoutes(prisma: PrismaClient, io: Server): Router {
  const router = Router();
  const autoDialler = new EnhancedAutoDialler(prisma, io);

  // Apply authentication
  router.use(authenticate);

  /**
   * POST /api/campaigns/:campaignId/auto-dialler/start
   * Start auto-dialling for campaign
   */
  router.post('/:campaignId/auto-dialler/start', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
    try {
      const { campaignId } = req.params;

      // Verify campaign exists and is active
      const campaign = await prisma.campaign.findUnique({
        where: { campaignId },
        select: { status: true, name: true }
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      }

      if (campaign.status !== 'Active') {
        return res.status(400).json({
          success: false,
          error: 'Campaign must be active to start auto-dialling'
        });
      }

      const success = await autoDialler.startDialling(campaignId);

      if (success) {
        res.json({
          success: true,
          message: 'Auto-dialler started successfully',
          data: {
            campaignId,
            status: 'RUNNING',
            startedAt: new Date()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to start auto-dialler'
        });
      }

    } catch (error) {
      console.error('Error starting auto-dialler:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * POST /api/campaigns/:campaignId/auto-dialler/stop
   * Stop auto-dialling for campaign
   */
  router.post('/:campaignId/auto-dialler/stop', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
    try {
      const { campaignId } = req.params;

      const success = await autoDialler.stopDialling(campaignId);

      if (success) {
        res.json({
          success: true,
          message: 'Auto-dialler stopped successfully',
          data: {
            campaignId,
            status: 'STOPPED',
            stoppedAt: new Date()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to stop auto-dialler'
        });
      }

    } catch (error) {
      console.error('Error stopping auto-dialler:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * GET /api/campaigns/:campaignId/auto-dialler/status
   * Get auto-dialler status
   */
  router.get('/:campaignId/auto-dialler/status', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req, res) => {
    try {
      const { campaignId } = req.params;
      const status = autoDialler.getDiallerStatus(campaignId);

      if (status) {
        res.json({
          success: true,
          data: {
            campaignId: status.campaignId,
            isRunning: status.isRunning,
            activeAgents: status.activeAgents.length,
            callsInProgress: status.callsInProgress.size,
            currentRate: status.currentRate,
            queuePosition: status.queuePosition,
            totalQueued: status.totalQueued,
            lastDialTime: status.lastDialTime
          }
        });
      } else {
        res.json({
          success: true,
          data: {
            campaignId,
            isRunning: false,
            activeAgents: 0,
            callsInProgress: 0,
            currentRate: 0,
            queuePosition: 0,
            totalQueued: 0,
            lastDialTime: null
          }
        });
      }

    } catch (error) {
      console.error('Error getting auto-dialler status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * GET /api/campaigns/auto-dialler/status-all
   * Get status for all active auto-diallers
   */
  router.get('/auto-dialler/status-all', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
    try {
      // Get all active campaigns
      const activeCampaigns = await prisma.campaign.findMany({
        where: { status: 'Active' },
        select: { campaignId: true, name: true }
      });

      const statuses = activeCampaigns.map(campaign => {
        const status = autoDialler.getDiallerStatus(campaign.campaignId);
        return {
          campaignId: campaign.campaignId,
          campaignName: campaign.name,
          isRunning: status?.isRunning || false,
          activeAgents: status?.activeAgents.length || 0,
          callsInProgress: status?.callsInProgress.size || 0,
          currentRate: status?.currentRate || 0,
          queuePosition: status?.queuePosition || 0,
          totalQueued: status?.totalQueued || 0,
          lastDialTime: status?.lastDialTime || null
        };
      });

      res.json({
        success: true,
        data: statuses
      });

    } catch (error) {
      console.error('Error getting all auto-dialler statuses:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * POST /api/campaigns/:campaignId/auto-dialler/pause
   * Pause auto-dialling temporarily
   */
  router.post('/:campaignId/auto-dialler/pause', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { duration } = req.body; // Duration in minutes

      const status = autoDialler.getDiallerStatus(campaignId);
      if (!status) {
        return res.status(404).json({
          success: false,
          error: 'Auto-dialler not running for this campaign'
        });
      }

      // Pause by temporarily stopping and scheduling restart
      await autoDialler.stopDialling(campaignId);

      if (duration && duration > 0) {
        // Schedule restart
        setTimeout(async () => {
          await autoDialler.startDialling(campaignId);
          console.log(`🔄 Auto-dialler resumed for campaign ${campaignId} after ${duration} minute pause`);
        }, duration * 60 * 1000);
      }

      res.json({
        success: true,
        message: duration ? `Auto-dialler paused for ${duration} minutes` : 'Auto-dialler paused indefinitely',
        data: {
          campaignId,
          status: 'PAUSED',
          pausedAt: new Date(),
          resumeAt: duration ? new Date(Date.now() + duration * 60 * 1000) : null
        }
      });

    } catch (error) {
      console.error('Error pausing auto-dialler:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * POST /api/campaigns/:campaignId/call-complete
   * Handle call completion notification
   */
  router.post('/:campaignId/call-complete', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req, res) => {
    try {
      const { callId, outcome } = req.body;

      if (!callId || !outcome) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: callId, outcome'
        });
      }

      await autoDialler.handleCallComplete(callId, outcome);

      res.json({
        success: true,
        message: 'Call completion processed'
      });

    } catch (error) {
      console.error('Error handling call completion:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * POST /api/campaigns/auto-dialler/emergency-stop
   * Emergency stop all auto-diallers
   */
  router.post('/auto-dialler/emergency-stop', requireRole('ADMIN'), async (req, res) => {
    try {
      await autoDialler.emergencyStopAll();

      res.json({
        success: true,
        message: 'Emergency stop executed - all auto-diallers stopped',
        data: {
          stoppedAt: new Date()
        }
      });

    } catch (error) {
      console.error('Error in emergency stop:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * GET /api/campaigns/:campaignId/dial-queue/preview
   * Preview dial queue for campaign
   */
  router.get('/:campaignId/dial-queue/preview', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
    try {
      const { campaignId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      // Get next contacts in queue
      const contacts = await prisma.contact.findMany({
        where: {
          list: {
            campaignId
          },
          status: { in: ['new', 'callback'] },
          locked: false,
          OR: [
            { nextAttempt: null },
            { nextAttempt: { lte: new Date() } }
          ],
          attemptCount: { lt: 3 }
        },
        select: {
          contactId: true,
          firstName: true,
          lastName: true,
          phone: true,
          company: true,
          status: true,
          attemptCount: true,
          lastAttempt: true,
          nextAttempt: true
        },
        orderBy: [
          { nextAttempt: 'asc' },
          { createdAt: 'asc' }
        ],
        take: limit
      });

      res.json({
        success: true,
        data: {
          campaignId,
          queueLength: contacts.length,
          contacts,
          previewLimit: limit
        }
      });

    } catch (error) {
      console.error('Error getting dial queue preview:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  return router;
}

export default createEnhancedDiallerRoutes;