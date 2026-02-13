import express from 'express';
import { Request, Response } from 'express';
import { queueService, CreateQueueEntryRequest } from '../services/queueService';

const router = express.Router();

// Types for dial queue system
interface Contact {
  contactId: string;
  listId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  status: 'NotAttempted' | 'Answered' | 'NoAnswer' | 'Busy' | 'Voicemail' | 'RetryEligible' | 'MaxAttempts' | 'DoNotCall' | 'Invalid';
  attemptCount: number;
  maxAttempts: number;
  locked: boolean;
  lockedBy?: string;
  lockedAt?: Date;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  customFields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface DialQueueEntry {
  queueId: string;
  campaignId: string;
  listId: string;
  contactId: string;
  status: 'queued' | 'dialing' | 'connected' | 'completed' | 'failed' | 'abandoned';
  assignedAgentId?: string;
  priority: number;
  queuedAt: Date;
  dialedAt?: Date;
  completedAt?: Date;
  outcome?: string;
  notes?: string;
}

// Production contact storage - contacts loaded from database
let contacts: Contact[] = [];

// Helper function to get dialable contacts for a campaign
function getDialableContacts(campaignId: string, maxRecords: number = 20): Contact[] {
  // Filter contacts that are available to dial
  const dialableContacts = contacts.filter(contact => 
    !contact.locked && 
    contact.status !== 'MaxAttempts' && 
    contact.status !== 'DoNotCall' &&
    contact.status !== 'Invalid' &&
    contact.attemptCount < contact.maxAttempts &&
    (!contact.nextRetryAt || contact.nextRetryAt <= new Date())
  );

  // Sort by priority (NotAttempted first, then RetryEligible)
  dialableContacts.sort((a, b) => {
    if (a.status === 'NotAttempted' && b.status !== 'NotAttempted') return -1;
    if (a.status !== 'NotAttempted' && b.status === 'NotAttempted') return 1;
    return a.attemptCount - b.attemptCount;
  });

  return dialableContacts.slice(0, maxRecords);
}

// Generate dial queue entries for a campaign
// POST /api/dial-queue/generate
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { campaignId, maxRecords = 20 } = req.body;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Campaign ID is required' }
      });
    }

    // Generate queue entries using database service
    const queueEntries = await queueService.generateQueueForCampaign(campaignId, maxRecords);

    console.log(`📋 Generated dial queue for campaign ${campaignId}: ${queueEntries.length} entries`);

    res.json({
      success: true,
      data: {
        campaignId,
        queueEntries: queueEntries.length,
        entries: queueEntries.map(entry => ({
          queueId: entry.queueId,
          contactId: entry.contactId,
          status: entry.status,
          priority: entry.priority,
          queuedAt: entry.queuedAt
        })),
        message: `Generated ${queueEntries.length} dial queue entries`
      }
    });

  } catch (error) {
    console.error('Error generating dial queue:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error generating dial queue' }
    });
  }
});

// Get dial queue entries for a campaign
// GET /api/dial-queue?campaignId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.query;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Campaign ID is required' }
      });
    }

    // Get campaign queue stats using database service
    const campaignStats = await queueService.getCampaignQueueStats(campaignId as string);

    res.json({
      success: true,
      data: {
        ...campaignStats,
        entries: [], // Could add pagination endpoint separately if needed
        stats: {
          totalQueued: campaignStats.totalQueued,
          totalDialing: 0, // Would need additional query
          totalConnected: 0, // Would need additional query
          totalCompleted: campaignStats.completedToday
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dial queue:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error fetching dial queue' }
    });
  }
});

// Get next contact to dial (for auto-dialer)
// POST /api/dial-queue/next
router.post('/next', async (req: Request, res: Response) => {
  try {
    const { campaignId, agentId } = req.body;

    if (!campaignId || !agentId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Campaign ID and Agent ID are required' }
      });
    }

    // Find next queued entry using database service  
    const nextEntry = await queueService.getNextContactForAgent(agentId, campaignId);

    if (!nextEntry) {
      return res.json({
        success: true,
        data: {
          message: 'No contacts available to dial',
          campaignId,
          agentId
        }
      });
    }

    // Note: getNextContactForAgent already updates status to 'dialing' and assigns agent

    res.json({
      success: true,
      data: {
        queueEntry: nextEntry,
        contact: {
          contactId: nextEntry.contactId,
          firstName: nextEntry.contact?.firstName,
          lastName: nextEntry.contact?.lastName,
          fullName: nextEntry.contact?.firstName + ' ' + nextEntry.contact?.lastName,
          phone: nextEntry.contact?.phone,
          email: nextEntry.contact?.email,
          company: nextEntry.contact?.company || '',
          jobTitle: nextEntry.contact?.jobTitle || '',
          department: nextEntry.contact?.department || '',
          industry: nextEntry.contact?.industry || '',
          address: nextEntry.contact?.address || '',
          address2: nextEntry.contact?.address2 || '',
          city: nextEntry.contact?.city || '',
          state: nextEntry.contact?.state || '',
          zipCode: nextEntry.contact?.zipCode || '',
          country: nextEntry.contact?.country || '',
          website: nextEntry.contact?.website || '',
          linkedIn: nextEntry.contact?.linkedIn || '',
          notes: nextEntry.contact?.notes || '',
          tags: nextEntry.contact?.tags || [],
          leadSource: nextEntry.contact?.leadSource || '',
          leadScore: nextEntry.contact?.leadScore || 0,
          deliveryDate: nextEntry.contact?.deliveryDate || '',
          ageRange: nextEntry.contact?.ageRange || '',
          residentialStatus: nextEntry.contact?.residentialStatus || '',
          custom1: nextEntry.contact?.custom1 || '',
          custom2: nextEntry.contact?.custom2 || '',
          custom3: nextEntry.contact?.custom3 || '',
          custom4: nextEntry.contact?.custom4 || '',
          custom5: nextEntry.contact?.custom5 || '',
          attemptCount: nextEntry.contact?.attemptCount || 0,
          maxAttempts: nextEntry.contact?.maxAttempts || 3,
          lastAttempt: nextEntry.contact?.lastAttempt || null,
          nextAttempt: nextEntry.contact?.nextAttempt || null,
          lastOutcome: nextEntry.contact?.lastOutcome || '',
          priority: nextEntry.priority || 3,
          status: nextEntry.contact?.status || 'pending',
          campaignId: nextEntry.campaignId,
          listId: nextEntry.listId
        },
        dialAction: 'initiate_call',
        campaignId,
        agentId
      }
    });

  } catch (error) {
    console.error('Error getting next dial contact:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error getting next contact' }
    });
  }
});

// Update queue entry status (called after dial attempt)
// PUT /api/dial-queue/:queueId/status
router.put('/:queueId/status', async (req: Request, res: Response) => {
  try {
    const { queueId } = req.params;
    const { status, outcome, notes } = req.body;

    // Update queue entry using database service
    const queueEntry = await queueService.updateQueueStatus(queueId, status);
    
    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        error: { message: 'Queue entry not found' }
      });
    }

    // Additional outcome and notes update if provided
    if (outcome || notes) {
      await queueService.updateQueueOutcome(queueId, outcome, notes);
    }

    res.json({
      success: true,
      data: {
        queueEntry,
        status: 'updated',
        message: 'Queue entry status updated successfully'
      }
    });

  } catch (error) {
    console.error('Error updating queue entry status:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error updating queue status' }
    });
  }
});

// Get campaign dial statistics  
// GET /api/dial-queue/stats/:campaignId
router.get('/stats/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    // Get campaign statistics using database service
    const stats = await queueService.getCampaignQueueStats(campaignId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting campaign stats:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error getting campaign stats' }
    });
  }
});

// PREDICTIVE DIALING ENGINE

interface PredictiveDialerConfig {
  campaignId: string;
  dialMethod: 'AUTODIAL' | 'MANUAL_DIAL' | 'MANUAL_PREVIEW' | 'SKIP';
  dialSpeed: number; // Calls per minute
  maxConcurrentCalls: number;
  abandonRateThreshold: number; // Maximum allowed abandon rate (0.05 = 5%)
  pacingMultiplier: number; // Multiplier for aggressive/conservative pacing
  isActive: boolean;
}

interface DialerMetrics {
  availableAgents: number;
  activeCalls: number;
  averageCallTime: number; // In seconds
  connectionRate: number; // Percentage of calls that connect
  abandonRate: number; // Percentage of answered calls that are abandoned
}

// Store for active dialing configurations
const activeDialers: Map<string, PredictiveDialerConfig> = new Map();

// Store for dialer metrics (in production this would be from database/analytics)
const dialerMetrics: Map<string, DialerMetrics> = new Map();

// POST /api/dialQueue/predictive/start - Start predictive dialing for campaign
router.post('/predictive/start', (req: Request, res: Response) => {
  try {
    const config: PredictiveDialerConfig = req.body;

    // Validate configuration
    if (!config.campaignId || !config.dialMethod || !config.dialSpeed) {
      return res.status(400).json({
        success: false,
        error: 'Missing required configuration parameters'
      });
    }

    // Set default values
    config.maxConcurrentCalls = config.maxConcurrentCalls || 10;
    config.abandonRateThreshold = config.abandonRateThreshold || 0.05;
    config.pacingMultiplier = config.pacingMultiplier || 1.0;
    config.isActive = true;

    // Store the configuration
    activeDialers.set(config.campaignId, config);

    // Initialize metrics if not exists
    if (!dialerMetrics.has(config.campaignId)) {
      dialerMetrics.set(config.campaignId, {
        availableAgents: 0,
        activeCalls: 0,
        averageCallTime: 120, // Default 2 minutes
        connectionRate: 0.3, // Default 30% connection rate
        abandonRate: 0.02 // Default 2% abandon rate
      });
    }

    res.json({
      success: true,
      data: {
        config,
        message: 'Predictive dialing started successfully',
        estimatedCallsPerHour: calculateCallsPerHour(config)
      }
    });

  } catch (error) {
    console.error('Error starting predictive dialing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start predictive dialing'
    });
  }
});

// POST /api/dialQueue/predictive/stop - Stop predictive dialing for campaign
router.post('/predictive/stop', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required'
      });
    }

    const config = activeDialers.get(campaignId);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Predictive dialing not active for this campaign'
      });
    }

    config.isActive = false;
    activeDialers.delete(campaignId);

    res.json({
      success: true,
      data: {
        campaignId,
        message: 'Predictive dialing stopped successfully'
      }
    });

  } catch (error) {
    console.error('Error stopping predictive dialing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop predictive dialing'
    });
  }
});

// GET /api/dialQueue/predictive/status/:campaignId - Get predictive dialing status
router.get('/predictive/status/:campaignId', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const config = activeDialers.get(campaignId);
    const metrics = dialerMetrics.get(campaignId);

    const status = {
      isActive: !!config?.isActive,
      config: config || null,
      metrics: metrics || null,
      currentPacing: config ? calculateOptimalPacing(config, metrics!) : null,
      estimatedWaitTime: config ? calculateEstimatedWaitTime(config, metrics!) : null
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error getting predictive dialing status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get predictive dialing status'
    });
  }
});

// POST /api/dialQueue/predictive/update-metrics - Update dialer metrics (called by call handlers)
router.post('/predictive/update-metrics', (req: Request, res: Response) => {
  try {
    const { campaignId, metrics: newMetrics } = req.body;

    if (!campaignId || !newMetrics) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID and metrics are required'
      });
    }

    const currentMetrics = dialerMetrics.get(campaignId) || {
      availableAgents: 0,
      activeCalls: 0,
      averageCallTime: 120,
      connectionRate: 0.3,
      abandonRate: 0.02
    };

    // Update metrics with weighted averages for smoothing
    const updatedMetrics: DialerMetrics = {
      availableAgents: newMetrics.availableAgents ?? currentMetrics.availableAgents,
      activeCalls: newMetrics.activeCalls ?? currentMetrics.activeCalls,
      averageCallTime: newMetrics.averageCallTime 
        ? (currentMetrics.averageCallTime * 0.8) + (newMetrics.averageCallTime * 0.2)
        : currentMetrics.averageCallTime,
      connectionRate: newMetrics.connectionRate 
        ? (currentMetrics.connectionRate * 0.9) + (newMetrics.connectionRate * 0.1)
        : currentMetrics.connectionRate,
      abandonRate: newMetrics.abandonRate 
        ? (currentMetrics.abandonRate * 0.9) + (newMetrics.abandonRate * 0.1)
        : currentMetrics.abandonRate
    };

    dialerMetrics.set(campaignId, updatedMetrics);

    res.json({
      success: true,
      data: {
        metrics: updatedMetrics,
        message: 'Metrics updated successfully'
      }
    });

  } catch (error) {
    console.error('Error updating metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update metrics'
    });
  }
});

// Helper functions for predictive dialing calculations
function calculateCallsPerHour(config: PredictiveDialerConfig): number {
  if (config.dialMethod !== 'AUTODIAL') {
    return 0; // Manual dialing doesn't have predictable calls per hour
  }
  return config.dialSpeed * 60; // Convert calls per minute to calls per hour
}

function calculateOptimalPacing(config: PredictiveDialerConfig, metrics: DialerMetrics): number {
  if (!config.isActive || config.dialMethod !== 'AUTODIAL') {
    return 1.0;
  }

  // Basic predictive algorithm
  const { availableAgents, averageCallTime, connectionRate, abandonRate } = metrics;
  
  if (availableAgents === 0) {
    return 0; // No agents available
  }

  // Calculate how many calls we need to place to keep agents busy
  const avgCallsPerAgent = 60 / (averageCallTime / 60); // Calls per agent per minute
  const targetCallsPerMinute = availableAgents * avgCallsPerAgent;
  
  // Adjust for connection rate (place more calls since not all will connect)
  const adjustedCallsPerMinute = targetCallsPerMinute / Math.max(connectionRate, 0.1);
  
  // Apply abandon rate protection (reduce pacing if abandon rate is too high)
  let pacingMultiplier = config.pacingMultiplier;
  if (abandonRate > config.abandonRateThreshold) {
    pacingMultiplier *= 0.8; // Reduce pacing by 20% if abandon rate is too high
  }
  
  return Math.min(adjustedCallsPerMinute * pacingMultiplier, config.maxConcurrentCalls);
}

function calculateEstimatedWaitTime(config: PredictiveDialerConfig, metrics: DialerMetrics): number {
  if (!config.isActive || metrics.availableAgents === 0) {
    return -1; // Unknown wait time
  }

  const { averageCallTime, connectionRate } = metrics;
  const avgConnectedCallTime = averageCallTime / connectionRate;
  
  // Estimate based on current call load
  const estimatedWaitSeconds = avgConnectedCallTime / metrics.availableAgents;
  
  return Math.max(0, estimatedWaitSeconds);
}

// Background process simulation (in production this would be a proper job scheduler)
setInterval(async () => {
  // Process active dialers and trigger calls based on configuration
  for (const [campaignId, config] of activeDialers) {
    if (config.isActive && config.dialMethod === 'AUTODIAL') {
      await processAutoDial(campaignId, config);
    }
  }
}, 10000); // Check every 10 seconds

async function processAutoDial(campaignId: string, config: PredictiveDialerConfig) {
  const metrics = dialerMetrics.get(campaignId);
  if (!metrics || metrics.availableAgents === 0) {
    return; // No agents available
  }

  const optimalPacing = calculateOptimalPacing(config, metrics);
  const callsToPlace = Math.floor(optimalPacing);

  if (callsToPlace > 0) {
    // Get dialable contacts
    const contacts = getDialableContacts(campaignId, callsToPlace);
    
    console.log(`[Predictive Dialer] Campaign ${campaignId}: Placing ${callsToPlace} calls for ${metrics.availableAgents} agents`);
    
    // In a real implementation, this would trigger actual calls
    // For now, we use the queue service to generate queue entries
    // TODO: Replace with actual telephony integration
    try {
      await queueService.generateQueueForCampaign(campaignId, callsToPlace);
      console.log(`[Predictive Dialer] Successfully queued ${callsToPlace} contacts for campaign ${campaignId}`);
    } catch (error) {
      console.error(`[Predictive Dialer] Error queuing contacts for campaign ${campaignId}:`, error);
    }
  }
}

export default router;