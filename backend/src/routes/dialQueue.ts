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

export default router;