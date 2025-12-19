import express from 'express';
import { Request, Response } from 'express';

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

// Mock data stores (in production these would be database calls)
let mockContacts: Contact[] = [
  {
    contactId: 'contact_001',
    listId: 'list_001', 
    firstName: 'John',
    lastName: 'Smith',
    phone: '+447700123456',
    email: 'john.smith@example.com',
    status: 'NotAttempted',
    attemptCount: 0,
    maxAttempts: 3,
    locked: false,
    customFields: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    contactId: 'contact_002',
    listId: 'list_001',
    firstName: 'Jane',
    lastName: 'Doe',  
    phone: '+447700654321',
    email: 'jane.doe@example.com',
    status: 'NoAnswer',
    attemptCount: 1,
    maxAttempts: 5,
    locked: false,
    lastAttemptAt: new Date(Date.now() - 60000),
    nextRetryAt: new Date(Date.now() + 300000),
    customFields: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    contactId: 'contact_003',
    listId: 'list_002',
    firstName: 'Bob',
    lastName: 'Johnson',
    phone: '+447700987654',
    email: 'bob.johnson@example.com', 
    status: 'NotAttempted',
    attemptCount: 0,
    maxAttempts: 3,
    locked: false,
    customFields: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

let mockQueueEntries: DialQueueEntry[] = [];

// Helper function to get dialable contacts for a campaign
function getDialableContacts(campaignId: string, maxRecords: number = 20): Contact[] {
  // Filter contacts that are available to dial
  const dialableContacts = mockContacts.filter(contact => 
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
router.post('/generate', (req: Request, res: Response) => {
  try {
    const { campaignId, maxRecords = 20 } = req.body;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Campaign ID is required' }
      });
    }

    // Get dialable contacts
    const dialableContacts = getDialableContacts(campaignId, maxRecords);

    // Create queue entries
    const newQueueEntries: DialQueueEntry[] = dialableContacts.map((contact, index) => ({
      queueId: `queue_${Date.now()}_${index}`,
      campaignId,
      listId: contact.listId,
      contactId: contact.contactId,
      status: 'queued',
      priority: contact.status === 'NotAttempted' ? 1 : 2,
      queuedAt: new Date()
    }));

    // Remove existing queue entries for this campaign
    mockQueueEntries = mockQueueEntries.filter(entry => entry.campaignId !== campaignId);

    // Add new queue entries
    mockQueueEntries.push(...newQueueEntries);

    res.json({
      success: true,
      data: {
        generated: newQueueEntries.length,
        campaignId,
        entries: newQueueEntries
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
router.get('/', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.query;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Campaign ID is required' }
      });
    }

    // Get queue entries for this campaign
    const campaignEntries = mockQueueEntries.filter(entry => 
      entry.campaignId === campaignId
    );

    // Enrich with contact data
    const enrichedEntries = campaignEntries.map(entry => {
      const contact = mockContacts.find(c => c.contactId === entry.contactId);
      return {
        ...entry,
        contact: contact || null
      };
    });

    res.json({
      success: true,
      data: {
        campaignId,
        entries: enrichedEntries,
        stats: {
          totalQueued: campaignEntries.filter(e => e.status === 'queued').length,
          totalDialing: campaignEntries.filter(e => e.status === 'dialing').length,
          totalConnected: campaignEntries.filter(e => e.status === 'connected').length,
          totalCompleted: campaignEntries.filter(e => e.status === 'completed').length
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
router.post('/next', (req: Request, res: Response) => {
  try {
    const { campaignId, agentId } = req.body;

    if (!campaignId || !agentId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Campaign ID and Agent ID are required' }
      });
    }

    // Find next queued entry for this campaign
    const nextEntry = mockQueueEntries.find(entry => 
      entry.campaignId === campaignId && 
      entry.status === 'queued' &&
      !entry.assignedAgentId
    );

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

    // Lock the contact and mark as dialing
    const contact = mockContacts.find(c => c.contactId === nextEntry.contactId);
    if (contact) {
      contact.locked = true;
      contact.lockedBy = agentId;
      contact.lockedAt = new Date();
    }

    // Update queue entry
    nextEntry.status = 'dialing';
    nextEntry.assignedAgentId = agentId;
    nextEntry.dialedAt = new Date();

    res.json({
      success: true,
      data: {
        queueEntry: nextEntry,
        contact: contact,
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
router.put('/:queueId/status', (req: Request, res: Response) => {
  try {
    const { queueId } = req.params;
    const { status, outcome, notes } = req.body;

    const queueEntry = mockQueueEntries.find(entry => entry.queueId === queueId);
    
    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        error: { message: 'Queue entry not found' }
      });
    }

    // Update queue entry
    queueEntry.status = status;
    queueEntry.outcome = outcome;
    queueEntry.notes = notes;
    
    if (status === 'completed' || status === 'failed' || status === 'abandoned') {
      queueEntry.completedAt = new Date();
    }

    // Update contact status and unlock
    const contact = mockContacts.find(c => c.contactId === queueEntry.contactId);
    if (contact) {
      contact.locked = false;
      contact.lockedBy = undefined;
      contact.lockedAt = undefined;
      contact.lastAttemptAt = new Date();
      contact.attemptCount += 1;

      // Update contact status based on outcome
      if (outcome === 'answered') {
        contact.status = 'Answered';
      } else if (outcome === 'no_answer') {
        contact.status = contact.attemptCount >= contact.maxAttempts ? 'MaxAttempts' : 'RetryEligible';
        contact.nextRetryAt = new Date(Date.now() + 300000); // 5 minutes retry
      } else if (outcome === 'busy') {
        contact.status = 'Busy';
        contact.nextRetryAt = new Date(Date.now() + 180000); // 3 minutes retry
      } else if (outcome === 'voicemail') {
        contact.status = 'Voicemail';
      }
    }

    res.json({
      success: true,
      data: {
        queueEntry,
        contact
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
router.get('/stats/:campaignId', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    const campaignEntries = mockQueueEntries.filter(entry => entry.campaignId === campaignId);
    const campaignContacts = mockContacts.filter(contact => 
      campaignEntries.some(entry => entry.contactId === contact.contactId)
    );

    const stats = {
      campaignId,
      totalQueued: campaignEntries.filter(e => e.status === 'queued').length,
      totalDialing: campaignEntries.filter(e => e.status === 'dialing').length,
      totalConnected: campaignEntries.filter(e => e.status === 'connected').length,
      totalCompleted: campaignEntries.filter(e => e.status === 'completed').length,
      totalContacts: campaignContacts.length,
      availableContacts: campaignContacts.filter(c => 
        !c.locked && 
        c.status !== 'MaxAttempts' && 
        c.attemptCount < c.maxAttempts
      ).length,
      averageDialTime: 45, // Mock average
      activeListCount: 2 // Mock active lists
    };

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
setInterval(() => {
  // Process active dialers and trigger calls based on configuration
  for (const [campaignId, config] of activeDialers) {
    if (config.isActive && config.dialMethod === 'AUTODIAL') {
      processAutoDial(campaignId, config);
    }
  }
}, 10000); // Check every 10 seconds

function processAutoDial(campaignId: string, config: PredictiveDialerConfig) {
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
    // For now, we'll just queue the contacts
    contacts.slice(0, callsToPlace).forEach(contact => {
      const queueEntry: DialQueueEntry = {
        queueId: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        campaignId,
        listId: contact.listId,
        contactId: contact.contactId,
        status: 'queued',
        priority: 1,
        queuedAt: new Date()
      };
      
      mockQueueEntries.push(queueEntry);
      
      // Lock the contact to prevent duplicate attempts
      contact.locked = true;
      contact.lockedBy = `predictive_dialer_${campaignId}`;
      contact.lockedAt = new Date();
    });
  }
}

export default router;