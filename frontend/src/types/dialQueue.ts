// Database schema types for dial queue system

export interface DataList {
  listId: string;
  name: string;
  campaignId?: string;  // null if not assigned to campaign
  active: boolean;      // true if active in dial strategy
  blendWeight?: number; // null if not active, 1-100 if active
  totalContacts: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  contactId: string;
  listId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  status: ContactStatus;
  attemptCount: number;
  maxAttempts: number;
  locked: boolean;
  lockedBy?: string;      // agent ID who locked it
  lockedAt?: Date;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  customFields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type ContactStatus = 
  | 'NotAttempted' 
  | 'Answered'
  | 'NoAnswer'
  | 'Busy' 
  | 'Voicemail'
  | 'RetryEligible'
  | 'MaxAttempts'
  | 'DoNotCall'
  | 'Invalid';

export interface DialQueueEntry {
  queueId: string;
  campaignId: string;
  listId: string;
  contactId: string;
  status: QueueStatus;
  assignedAgentId?: string;
  priority: number;
  queuedAt: Date;
  dialedAt?: Date;
  completedAt?: Date;
  outcome?: string;
  notes?: string;
}

export type QueueStatus = 
  | 'queued'     // waiting to be dialed
  | 'dialing'    // currently being dialed
  | 'connected'  // call connected to agent
  | 'completed'  // call finished
  | 'failed'     // dial failed
  | 'abandoned'; // removed from queue

// Function interfaces
export interface ListCampaignLinkResult {
  success: boolean;
  message: string;
  listId?: string;
  campaignId?: string;
  previousCampaignId?: string;
}

export interface DialableRecord {
  contact: Contact;
  list: DataList;
  priority: number;
  estimatedDialTime: Date;
}

export interface QueueEngineConfig {
  loopInterval: number;        // ms between queue checks (500-1000)
  maxQueueSize: number;        // max entries per campaign
  lockTimeout: number;         // ms before unlocking stale records
  retryDelay: number;          // ms before retry eligible
  blendAlgorithm: 'weighted' | 'round_robin' | 'priority';
}

export interface CampaignDialStats {
  campaignId: string;
  totalQueued: number;
  totalDialing: number;
  totalConnected: number;
  totalCompleted: number;
  availableAgents: number;
  activeListCount: number;
  averageDialTime: number;
  successRate: number;
}

// Error types
export class ListLinkError extends Error {
  constructor(
    message: string,
    public code: 'ALREADY_LINKED' | 'CAMPAIGN_NOT_FOUND' | 'LIST_NOT_FOUND' | 'VALIDATION_ERROR',
    public listId?: string,
    public campaignId?: string
  ) {
    super(message);
    this.name = 'ListLinkError';
  }
}

export class DialQueueError extends Error {
  constructor(
    message: string,
    public code: 'NO_RECORDS' | 'QUEUE_FULL' | 'CAMPAIGN_INACTIVE' | 'ENGINE_ERROR',
    public campaignId?: string
  ) {
    super(message);
    this.name = 'DialQueueError';
  }
}