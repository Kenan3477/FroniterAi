// Event Validation Schemas using Zod
import { z } from 'zod';

// Base event schema
const baseEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  timestamp: z.date(),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
});

// Call event schema
export const callEventSchema = baseEventSchema.extend({
  type: z.enum(['call.initiated', 'call.connected', 'call.ended', 'call.failed', 'call.transferred', 'call.hold', 'call.unhold', 'call.muted', 'call.unmuted']),
  callId: z.string(),
  agentId: z.string().optional(),
  contactId: z.string().optional(),
  campaignId: z.string().optional(),
  sipCallId: z.string().optional(),
  direction: z.enum(['inbound', 'outbound']),
  phoneNumber: z.string().optional(),
  duration: z.number().optional(),
  status: z.string().optional(),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Agent event schema
export const agentEventSchema = baseEventSchema.extend({
  type: z.enum(['agent.login', 'agent.logout', 'agent.available', 'agent.unavailable', 'agent.busy', 'agent.break', 'agent.campaign.joined', 'agent.campaign.left', 'agent.status.changed']),
  agentId: z.string(),
  agentName: z.string().optional(),
  status: z.string().optional(),
  campaignId: z.string().optional(),
  campaignName: z.string().optional(),
  previousStatus: z.string().optional(),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Campaign event schema
export const campaignEventSchema = baseEventSchema.extend({
  type: z.enum(['campaign.created', 'campaign.started', 'campaign.paused', 'campaign.stopped', 'campaign.completed', 'campaign.updated', 'campaign.dial.speed.changed', 'campaign.dial.method.changed']),
  campaignId: z.string(),
  campaignName: z.string().optional(),
  status: z.string().optional(),
  dialMethod: z.string().optional(),
  dialSpeed: z.number().optional(),
  agentCount: z.number().optional(),
  priority: z.number().optional(),
  previousState: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

// Dial queue event schema
export const dialQueueEventSchema = baseEventSchema.extend({
  type: z.enum(['queue.contact.added', 'queue.contact.removed', 'queue.contact.dialing', 'queue.contact.completed', 'queue.stats.updated', 'queue.overflow', 'queue.underflow']),
  campaignId: z.string(),
  contactId: z.string().optional(),
  queueSize: z.number().optional(),
  position: z.number().optional(),
  estimatedWaitTime: z.number().optional(),
  stats: z.object({
    totalContacts: z.number(),
    dialedContacts: z.number(),
    pendingContacts: z.number(),
    completedContacts: z.number(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

// System event schema
export const systemEventSchema = baseEventSchema.extend({
  type: z.enum(['system.alert', 'system.error', 'system.warning', 'system.maintenance', 'system.performance', 'system.integration.status']),
  level: z.enum(['info', 'warning', 'error', 'critical']),
  component: z.string().optional(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

// KPI event schema
export const kpiEventSchema = baseEventSchema.extend({
  type: z.enum(['kpi.updated', 'kpi.threshold.exceeded', 'kpi.goal.reached']),
  metric: z.string(),
  value: z.number(),
  previousValue: z.number().optional(),
  threshold: z.number().optional(),
  goal: z.number().optional(),
  campaignId: z.string().optional(),
  agentId: z.string().optional(),
  timeframe: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Event union schema
export const eventSchema = z.union([
  callEventSchema,
  agentEventSchema,
  campaignEventSchema,
  dialQueueEventSchema,
  systemEventSchema,
  kpiEventSchema,
]);

// Event subscription schema
export const eventSubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().optional(),
  agentId: z.string().optional(),
  organizationId: z.string().optional(),
  eventTypes: z.array(z.string()),
  filters: z.record(z.any()).optional(),
  rooms: z.array(z.string()).optional(),
  createdAt: z.date(),
});

// Event room schema
export const eventRoomSchema = z.union([
  z.string().regex(/^organization:\w+$/),
  z.string().regex(/^campaign:\w+$/),
  z.string().regex(/^agent:\w+$/),
  z.string().regex(/^user:\w+$/),
  z.literal('admin'),
  z.literal('global'),
]);

// Event log schema
export const eventLogSchema = z.object({
  id: z.string().uuid(),
  event: eventSchema,
  room: eventRoomSchema.optional(),
  subscribers: z.array(z.string()).optional(),
  processedAt: z.date().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'retrying']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  retryCount: z.number().optional(),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Validation functions
export const validateEvent = (event: unknown) => {
  return eventSchema.parse(event);
};

export const validateEventSubscription = (subscription: unknown) => {
  return eventSubscriptionSchema.parse(subscription);
};

export const validateEventRoom = (room: unknown) => {
  return eventRoomSchema.parse(room);
};

export const validateEventLog = (log: unknown) => {
  return eventLogSchema.parse(log);
};

// Type exports
export type CallEventType = z.infer<typeof callEventSchema>;
export type AgentEventType = z.infer<typeof agentEventSchema>;
export type CampaignEventType = z.infer<typeof campaignEventSchema>;
export type DialQueueEventType = z.infer<typeof dialQueueEventSchema>;
export type SystemEventType = z.infer<typeof systemEventSchema>;
export type KPIEventType = z.infer<typeof kpiEventSchema>;
export type EventType = z.infer<typeof eventSchema>;
export type EventSubscriptionType = z.infer<typeof eventSubscriptionSchema>;
export type EventRoomType = z.infer<typeof eventRoomSchema>;
export type EventLogType = z.infer<typeof eventLogSchema>;