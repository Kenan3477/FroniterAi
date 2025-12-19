// Event Types and Schemas for Real-time System

export interface BaseEvent {
  id: string;
  type: string;
  timestamp: Date;
  organizationId?: string;
  userId?: string;
}

// Call Events
export interface CallEvent extends BaseEvent {
  type: 'call.initiated' | 'call.connected' | 'call.ended' | 'call.failed' | 'call.transferred' | 'call.hold' | 'call.unhold' | 'call.muted' | 'call.unmuted';
  callId: string;
  agentId?: string;
  contactId?: string;
  campaignId?: string;
  sipCallId?: string;
  direction: 'inbound' | 'outbound';
  phoneNumber?: string;
  duration?: number;
  status?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

// Agent Events
export interface AgentEvent extends BaseEvent {
  type: 'agent.login' | 'agent.logout' | 'agent.available' | 'agent.unavailable' | 'agent.busy' | 'agent.break' | 'agent.campaign.joined' | 'agent.campaign.left' | 'agent.status.changed';
  agentId: string;
  agentName?: string;
  status?: string;
  campaignId?: string;
  campaignName?: string;
  previousStatus?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

// Campaign Events
export interface CampaignEvent extends BaseEvent {
  type: 'campaign.created' | 'campaign.started' | 'campaign.paused' | 'campaign.stopped' | 'campaign.completed' | 'campaign.updated' | 'campaign.dial.speed.changed' | 'campaign.dial.method.changed';
  campaignId: string;
  campaignName?: string;
  status?: string;
  dialMethod?: string;
  dialSpeed?: number;
  agentCount?: number;
  priority?: number;
  previousState?: Record<string, any>;
  metadata?: Record<string, any>;
}

// Dial Queue Events
export interface DialQueueEvent extends BaseEvent {
  type: 'queue.contact.added' | 'queue.contact.removed' | 'queue.contact.dialing' | 'queue.contact.completed' | 'queue.stats.updated' | 'queue.overflow' | 'queue.underflow';
  campaignId: string;
  contactId?: string;
  queueSize?: number;
  position?: number;
  estimatedWaitTime?: number;
  stats?: {
    totalContacts: number;
    dialedContacts: number;
    pendingContacts: number;
    completedContacts: number;
  };
  metadata?: Record<string, any>;
}

// System Events
export interface SystemEvent extends BaseEvent {
  type: 'system.alert' | 'system.error' | 'system.warning' | 'system.maintenance' | 'system.performance' | 'system.integration.status';
  level: 'info' | 'warning' | 'error' | 'critical';
  component?: string;
  message: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

// KPI Events
export interface KPIEvent extends BaseEvent {
  type: 'kpi.updated' | 'kpi.threshold.exceeded' | 'kpi.goal.reached';
  metric: string;
  value: number;
  previousValue?: number;
  threshold?: number;
  goal?: number;
  campaignId?: string;
  agentId?: string;
  timeframe?: string;
  metadata?: Record<string, any>;
}

// Flow Events
export interface FlowEvent extends BaseEvent {
  type: 'flow.assigned' | 'flow.started' | 'flow.step.completed' | 'flow.completed' | 'flow.failed' | 'flow.cancelled' | 'flow.step.failed';
  flowId: string;
  flowName?: string;
  executionId?: string;
  campaignId?: string;
  campaignName?: string;
  callId?: string;
  agentId?: string;
  agentName?: string;
  stepId?: string;
  stepName?: string;
  stepData?: Record<string, any>;
  resultData?: Record<string, any>;
  errorMessage?: string;
  triggerType?: 'outbound_start' | 'inbound_start' | 'agent_available' | 'custom';
  progress?: {
    currentStep: string;
    totalSteps: number;
    completedSteps: number;
  };
  metadata?: Record<string, any>;
}

// Disposition Events
export interface DispositionEvent extends BaseEvent {
  type: 'disposition.suggested' | 'disposition.completed' | 'disposition.validated' | 'disposition.suggestions.ready' | 'disposition.required';
  callId: string;
  dispositionId?: string;
  agentId?: string;
  campaignId?: string;
  contactId?: string;
  suggestedDisposition?: string;
  confidence?: number;
  autoApplied?: boolean;
  validationErrors?: string[];
  missingFields?: string[];
  metadata?: Record<string, any>;
}

// Union type for all events
export type Event = CallEvent | AgentEvent | CampaignEvent | DialQueueEvent | SystemEvent | KPIEvent | FlowEvent | DispositionEvent;

// Event subscription interface
export interface EventSubscription {
  id: string;
  userId?: string;
  agentId?: string;
  organizationId?: string;
  eventTypes: string[];
  filters?: Record<string, any>;
  rooms?: string[];
  createdAt: Date;
}

// Event broadcasting room types
export type EventRoom = 
  | `organization:${string}`
  | `campaign:${string}`
  | `agent:${string}`
  | `user:${string}`
  | `admin`
  | `global`;

// Event priorities for processing
export enum EventPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Event processing status
export enum EventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

// Event persistence interface
export interface EventLog {
  id: string;
  event: Event;
  room?: EventRoom;
  subscribers?: string[];
  processedAt?: Date;
  status: EventStatus;
  priority: EventPriority;
  retryCount?: number;
  error?: string;
  metadata?: Record<string, any>;
}

// Lead Lifecycle Events (New)
export interface LifecycleEvent extends BaseEvent {
  type: 'lifecycle.created' | 'lifecycle.stage_transition' | 'lifecycle.score_updated' | 'lifecycle.engagement_updated' | 'lifecycle.converted' | 'lifecycle.closed';
  lifecycleId: string;
  contactId: string;
  campaignId: string;
  agentId?: string;
  currentStage: string;
  previousStage?: string;
  leadScore: number;
  conversionProbability: number;
  engagementScore?: number;
  stageTransitionReason?: string;
  daysInStage?: number;
  totalDaysInLifecycle?: number;
  estimatedValue?: number;
  actualValue?: number;
  recommendedActions?: string[];
  metadata?: Record<string, any>;
}