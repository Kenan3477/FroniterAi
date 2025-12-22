import { 
  DataList, 
  Contact, 
  DialQueueEntry, 
  DialableRecord, 
  QueueEngineConfig, 
  CampaignDialStats,
  DialQueueError,
  ContactStatus,
  QueueStatus
} from '../types/dialQueue';
import { getActiveListsByCampaign } from './listCampaignService';

/**
 * 3️⃣ Generate the Dial Queue - Core Engine
 * Replicates Omnivox AI's auto-feed dial queue system
 */

// Mock data stores - in production these would be your actual database
// Contacts will be fetched from the backend API
let mockContacts: Contact[] = [];

let mockDialQueue: DialQueueEntry[] = [];

// Engine configuration (Omnivox AI-style defaults)
const defaultConfig: QueueEngineConfig = {
  loopInterval: 750,          // 750ms between checks
  maxQueueSize: 50,           // max 50 queued calls per campaign
  lockTimeout: 300000,        // 5 minutes before unlocking stale records
  retryDelay: 300000,         // 5 minutes before retry eligible
  blendAlgorithm: 'weighted'
};

// Engine state
let engineRunning = false;
let engineTimer: NodeJS.Timeout | null = null;
let config = { ...defaultConfig };

/**
 * Function A: getNextDialableRecord(campaignId)
 * Return the next contact that is eligible for dialing
 */
export async function getNextDialableRecord(campaignId: string): Promise<DialableRecord | null> {
  
  try {
    console.log(`🔍 Finding next dialable record for campaign ${campaignId}`);
    
    // 1. Fetch active lists for the campaign
    const activeLists = getActiveListsByCampaign(campaignId);
    
    if (activeLists.length === 0) {
      console.log(`⚠️ No active lists for campaign ${campaignId}`);
      return null;
    }

    console.log(`📋 Found ${activeLists.length} active lists:`, 
      activeLists.map(l => `${l.name} (weight: ${l.blendWeight}%)`));

    // 2. Select a list using weighted randomness based on blend weight
    const selectedList = selectListByWeight(activeLists);
    
    if (!selectedList) {
      console.log(`⚠️ No list selected for campaign ${campaignId}`);
      return null;
    }

    console.log(`🎯 Selected list: ${selectedList.name} (${selectedList.blendWeight}% weight)`);

    // 3. Query the earliest or lowest-attempt eligible contact from that list
    const eligibleContact = findEligibleContact(selectedList.listId);
    
    if (!eligibleContact) {
      console.log(`⚠️ No eligible contacts in list ${selectedList.name}`);
      return null;
    }

    // 4. Lock the record immediately
    const lockResult = lockContact(eligibleContact.contactId, `campaign_${campaignId}`);
    
    if (!lockResult) {
      console.log(`⚠️ Failed to lock contact ${eligibleContact.contactId}`);
      return null;
    }

    console.log(`🔒 Locked contact: ${eligibleContact.firstName} ${eligibleContact.lastName} (${eligibleContact.phone})`);

    // 5. Return it to the dial queue generator
    return {
      contact: eligibleContact,
      list: selectedList,
      priority: calculatePriority(eligibleContact),
      estimatedDialTime: new Date(Date.now() + 1000) // 1 second from now
    };

  } catch (error) {
    console.error(`❌ Error in getNextDialableRecord:`, error);
    return null;
  }
}

/**
 * Function B: createDialQueueEntry(campaignId)
 * Uses getNextDialableRecord() to build the queue
 */
export async function createDialQueueEntry(campaignId: string): Promise<DialQueueEntry | null> {
  
  try {
    // Check if queue is full
    const currentQueueSize = mockDialQueue.filter(
      entry => entry.campaignId === campaignId && 
               ['queued', 'dialing'].includes(entry.status)
    ).length;

    if (currentQueueSize >= config.maxQueueSize) {
      console.log(`⚠️ Queue full for campaign ${campaignId} (${currentQueueSize}/${config.maxQueueSize})`);
      return null;
    }

    // 1. Call getNextDialableRecord(campaignId)
    const dialableRecord = await getNextDialableRecord(campaignId);
    
    if (!dialableRecord) {
      return null;
    }

    // 2. Insert into dial_queue table
    const queueEntry: DialQueueEntry = {
      queueId: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      campaignId: campaignId,
      listId: dialableRecord.list.listId,
      contactId: dialableRecord.contact.contactId,
      status: 'queued',
      priority: dialableRecord.priority,
      queuedAt: new Date(),
    };

    mockDialQueue.push(queueEntry);

    console.log(`✅ Created dial queue entry:`, {
      queueId: queueEntry.queueId,
      campaign: campaignId,
      contact: `${dialableRecord.contact.firstName} ${dialableRecord.contact.lastName}`,
      phone: dialableRecord.contact.phone,
      priority: queueEntry.priority
    });

    return queueEntry;

  } catch (error) {
    console.error(`❌ Error in createDialQueueEntry:`, error);
    return null;
  }
}

/**
 * Function C: runDialQueueLoop()
 * A looping engine that mirrors Omnivox AI's auto-feed into dialer
 */
export function startDialQueueEngine(customConfig?: Partial<QueueEngineConfig>): void {
  
  if (engineRunning) {
    console.log(`⚠️ Dial queue engine is already running`);
    return;
  }

  // Update configuration
  config = { ...defaultConfig, ...customConfig };
  engineRunning = true;

  console.log(`🚀 Starting dial queue engine`, {
    interval: config.loopInterval + 'ms',
    maxQueueSize: config.maxQueueSize,
    blendAlgorithm: config.blendAlgorithm
  });

  // Start the loop
  engineTimer = setInterval(async () => {
    await runDialQueueLoop();
  }, config.loopInterval);
}

export function stopDialQueueEngine(): void {
  
  if (!engineRunning) {
    console.log(`⚠️ Dial queue engine is not running`);
    return;
  }

  if (engineTimer) {
    clearInterval(engineTimer);
    engineTimer = null;
  }

  engineRunning = false;
  console.log(`⏹️ Dial queue engine stopped`);
}

export async function runDialQueueLoop(): Promise<void> {
  
  try {
    // Clean up stale locks first
    cleanupStaleLocks();
    
    // Get campaigns that have available agents - empty until user creates campaigns
    const activeCampaigns: string[] = []; // No mock campaign IDs
    
    for (const campaignId of activeCampaigns) {
      
      // Check if campaign needs more queue entries
      const currentQueueSize = mockDialQueue.filter(
        entry => entry.campaignId === campaignId && 
                 ['queued', 'dialing'].includes(entry.status)
      ).length;

      const availableAgents = getAvailableAgentCount(campaignId); // Mock: returns random number
      
      // Omnivox AI-style logic: queue should be 2-3x available agents
      const targetQueueSize = Math.min(availableAgents * 2, config.maxQueueSize);
      
      if (currentQueueSize < targetQueueSize) {
        console.log(`📈 Campaign ${campaignId} needs more queue entries (${currentQueueSize}/${targetQueueSize})`);
        
        // Create new queue entry
        const newEntry = await createDialQueueEntry(campaignId);
        
        if (newEntry) {
          // Push to agent or dialer (mock)
          pushToDialer(newEntry);
        }
      }
    }

  } catch (error) {
    console.error(`❌ Error in dial queue loop:`, error);
  }
}

/**
 * Helper functions
 */

function selectListByWeight(lists: DataList[]): DataList | null {
  if (lists.length === 0) return null;
  if (lists.length === 1) return lists[0];

  // Calculate total weight
  const totalWeight = lists.reduce((sum, list) => sum + (list.blendWeight || 0), 0);
  
  if (totalWeight === 0) return lists[0]; // Fallback to first list

  // Generate random number
  const random = Math.random() * totalWeight;
  let currentWeight = 0;

  // Select list based on weight
  for (const list of lists) {
    currentWeight += (list.blendWeight || 0);
    if (random <= currentWeight) {
      return list;
    }
  }

  return lists[0]; // Fallback
}

function findEligibleContact(listId: string): Contact | null {
  // Find contacts that are eligible for dialing
  const eligibleContacts = mockContacts.filter(contact => 
    contact.listId === listId &&
    !contact.locked &&
    isContactDialable(contact)
  );

  if (eligibleContacts.length === 0) return null;

  // Sort by priority: NotAttempted first, then by attempt count, then by last attempt time
  eligibleContacts.sort((a, b) => {
    if (a.status === 'NotAttempted' && b.status !== 'NotAttempted') return -1;
    if (a.status !== 'NotAttempted' && b.status === 'NotAttempted') return 1;
    if (a.attemptCount !== b.attemptCount) return a.attemptCount - b.attemptCount;
    if (a.lastAttemptAt && b.lastAttemptAt) {
      return a.lastAttemptAt.getTime() - b.lastAttemptAt.getTime();
    }
    return 0;
  });

  return eligibleContacts[0];
}

function isContactDialable(contact: Contact): boolean {
  // NotAttempted contacts are always dialable
  if (contact.status === 'NotAttempted') {
    return true;
  }

  // MaxAttempts and DoNotCall are never dialable
  if (contact.status === 'MaxAttempts' || contact.status === 'DoNotCall') {
    return false;
  }

  // Check if contact has reached max attempts
  if (contact.attemptCount >= contact.maxAttempts) {
    return false;
  }

  // Check retry eligibility for specific statuses
  const retryEligibleStatuses: ContactStatus[] = ['NoAnswer', 'Busy', 'Voicemail'];
  if (retryEligibleStatuses.includes(contact.status)) {
    // Check if enough time has passed for retry
    if (contact.nextRetryAt && contact.nextRetryAt > new Date()) {
      return false; // Still in retry delay
    }
    return true;
  }

  return false;
}

function lockContact(contactId: string, lockedBy: string): boolean {
  const contactIndex = mockContacts.findIndex(c => c.contactId === contactId);
  
  if (contactIndex === -1 || mockContacts[contactIndex].locked) {
    return false;
  }

  mockContacts[contactIndex] = {
    ...mockContacts[contactIndex],
    locked: true,
    lockedBy: lockedBy,
    lockedAt: new Date(),
    updatedAt: new Date()
  };

  return true;
}

function calculatePriority(contact: Contact): number {
  // Higher number = higher priority
  let priority = 100;

  // NotAttempted gets highest priority
  if (contact.status === 'NotAttempted') {
    priority += 50;
  }

  // Lower attempt count gets higher priority
  priority -= contact.attemptCount * 10;

  // Older contacts get higher priority
  const ageInDays = Math.floor((Date.now() - contact.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  priority += Math.min(ageInDays, 30);

  return Math.max(priority, 1); // Minimum priority of 1
}

function cleanupStaleLocks(): void {
  const cutoffTime = new Date(Date.now() - config.lockTimeout);
  
  let unlockedCount = 0;
  mockContacts.forEach((contact, index) => {
    if (contact.locked && contact.lockedAt && contact.lockedAt < cutoffTime) {
      mockContacts[index] = {
        ...contact,
        locked: false,
        lockedBy: undefined,
        lockedAt: undefined,
        updatedAt: new Date()
      };
      unlockedCount++;
    }
  });

  if (unlockedCount > 0) {
    console.log(`🔓 Unlocked ${unlockedCount} stale contact locks`);
  }
}

function getAvailableAgentCount(campaignId: string): number {
  // Mock implementation - in production this would check actual agent availability
  return Math.floor(Math.random() * 5) + 1; // 1-5 available agents
}

function pushToDialer(queueEntry: DialQueueEntry): void {
  // Mock implementation - in production this would integrate with actual dialer
  console.log(`📞 Pushing to dialer:`, {
    queueId: queueEntry.queueId,
    campaign: queueEntry.campaignId,
    contact: queueEntry.contactId
  });
  
  // Simulate dialer picking up the entry
  setTimeout(() => {
    const entryIndex = mockDialQueue.findIndex(e => e.queueId === queueEntry.queueId);
    if (entryIndex !== -1) {
      mockDialQueue[entryIndex].status = 'dialing';
      mockDialQueue[entryIndex].dialedAt = new Date();
    }
  }, Math.random() * 2000 + 1000); // Random delay 1-3 seconds
}

/**
 * Queue monitoring and stats functions
 */
export function getQueueStats(campaignId?: string): CampaignDialStats[] {
  const campaigns = campaignId ? [campaignId] : []; // No default mock campaigns
  
  return campaigns.map(id => {
    const queueEntries = mockDialQueue.filter(e => e.campaignId === id);
    
    return {
      campaignId: id,
      totalQueued: queueEntries.filter(e => e.status === 'queued').length,
      totalDialing: queueEntries.filter(e => e.status === 'dialing').length,
      totalConnected: queueEntries.filter(e => e.status === 'connected').length,
      totalCompleted: queueEntries.filter(e => e.status === 'completed').length,
      availableAgents: getAvailableAgentCount(id),
      activeListCount: getActiveListsByCampaign(id).length,
      averageDialTime: 25000, // Mock: 25 seconds average
      successRate: 0.35 // Mock: 35% success rate
    };
  });
}

export function getDialQueue(campaignId?: string): DialQueueEntry[] {
  if (campaignId) {
    return mockDialQueue.filter(entry => entry.campaignId === campaignId);
  }
  return [...mockDialQueue];
}

export function getEngineStatus() {
  return {
    running: engineRunning,
    config,
    totalQueueSize: mockDialQueue.length,
    activeQueues: getQueueStats()
  };
}

// For testing purposes
export function addMockContact(contact: Contact): void {
  mockContacts.push(contact);
}

export function clearDialQueue(): void {
  mockDialQueue = [];
}