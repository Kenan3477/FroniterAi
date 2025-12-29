// Event Helper Functions for Easy Integration
import { eventManager } from '../services/eventManager';
import { EventPriority } from '../types/events';
import type { 
  CallEvent, 
  AgentEvent, 
  CampaignEvent, 
  DialQueueEvent, 
  SystemEvent, 
  KPIEvent 
} from '../types/events';

/**
 * Call Event Helpers
 */
export const callEvents = {
  initiated: (data: Omit<CallEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'call.initiated' }, `campaign:${data.campaignId}`),

  connected: (data: Omit<CallEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'call.connected' }, `campaign:${data.campaignId}`, EventPriority.HIGH),

  ended: (data: Omit<CallEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'call.ended' }, `campaign:${data.campaignId}`),

  failed: (data: Omit<CallEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'call.failed' }, `campaign:${data.campaignId}`, EventPriority.HIGH),

  transferred: (data: Omit<CallEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'call.transferred' }, `campaign:${data.campaignId}`),

  hold: (data: Omit<CallEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'call.hold' }, `agent:${data.agentId}`),

  unhold: (data: Omit<CallEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'call.unhold' }, `agent:${data.agentId}`),

  muted: (data: Omit<CallEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'call.muted' }, `agent:${data.agentId}`),

  unmuted: (data: Omit<CallEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'call.unmuted' }, `agent:${data.agentId}`),

  // Inbound call event helpers
  inboundRinging: (data: any) =>
    eventManager.emitEvent({ ...data, type: 'call.inbound.ringing' } as any, 'global', EventPriority.HIGH),

  inboundAnswered: (data: any) =>
    eventManager.emitEvent({ ...data, type: 'call.inbound.answered' } as any, `agent:${data.agentId}`, EventPriority.HIGH),

  inboundTransferred: (data: any) =>
    eventManager.emitEvent({ ...data, type: 'call.inbound.transferred' } as any, 'global', EventPriority.MEDIUM),

  inboundEnded: (data: any) =>
    eventManager.emitEvent({ ...data, type: 'call.inbound.ended' } as any, 'global'),
};

/**
 * Agent Event Helpers
 */
export const agentEvents = {
  login: (data: Omit<AgentEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'agent.login' }, `organization:${data.organizationId}`, EventPriority.MEDIUM),

  logout: (data: Omit<AgentEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'agent.logout' }, `organization:${data.organizationId}`, EventPriority.MEDIUM),

  available: (data: Omit<AgentEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'agent.available' }, `agent:${data.agentId}`),

  unavailable: (data: Omit<AgentEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'agent.unavailable' }, `agent:${data.agentId}`),

  busy: (data: Omit<AgentEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'agent.busy' }, `agent:${data.agentId}`),

  break: (data: Omit<AgentEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'agent.break' }, `agent:${data.agentId}`),

  joinedCampaign: (data: Omit<AgentEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'agent.campaign.joined' }, `campaign:${data.campaignId}`, EventPriority.MEDIUM),

  leftCampaign: (data: Omit<AgentEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'agent.campaign.left' }, `campaign:${data.campaignId}`, EventPriority.MEDIUM),

  statusChanged: (data: Omit<AgentEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'agent.status.changed' }, `agent:${data.agentId}`),
};

/**
 * Campaign Event Helpers
 */
export const campaignEvents = {
  created: (data: Omit<CampaignEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'campaign.created' }, `organization:${data.organizationId}`, EventPriority.MEDIUM),

  started: (data: Omit<CampaignEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'campaign.started' }, `campaign:${data.campaignId}`, EventPriority.HIGH),

  paused: (data: Omit<CampaignEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'campaign.paused' }, `campaign:${data.campaignId}`, EventPriority.HIGH),

  stopped: (data: Omit<CampaignEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'campaign.stopped' }, `campaign:${data.campaignId}`, EventPriority.HIGH),

  completed: (data: Omit<CampaignEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'campaign.completed' }, `campaign:${data.campaignId}`, EventPriority.MEDIUM),

  updated: (data: Omit<CampaignEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'campaign.updated' }, `campaign:${data.campaignId}`),

  dialSpeedChanged: (data: Omit<CampaignEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'campaign.dial.speed.changed' }, `campaign:${data.campaignId}`),

  dialMethodChanged: (data: Omit<CampaignEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'campaign.dial.method.changed' }, `campaign:${data.campaignId}`),
};

/**
 * Dial Queue Event Helpers
 */
export const queueEvents = {
  contactAdded: (data: Omit<DialQueueEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'queue.contact.added' }, `campaign:${data.campaignId}`),

  contactRemoved: (data: Omit<DialQueueEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'queue.contact.removed' }, `campaign:${data.campaignId}`),

  contactDialing: (data: Omit<DialQueueEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'queue.contact.dialing' }, `campaign:${data.campaignId}`),

  contactCompleted: (data: Omit<DialQueueEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'queue.contact.completed' }, `campaign:${data.campaignId}`),

  statsUpdated: (data: Omit<DialQueueEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'queue.stats.updated' }, `campaign:${data.campaignId}`),

  overflow: (data: Omit<DialQueueEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'queue.overflow' }, `campaign:${data.campaignId}`, EventPriority.HIGH),

  underflow: (data: Omit<DialQueueEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'queue.underflow' }, `campaign:${data.campaignId}`, EventPriority.MEDIUM),
};

/**
 * System Event Helpers
 */
export const systemEvents = {
  alert: (data: Omit<SystemEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'system.alert' }, 'admin', EventPriority.HIGH),

  error: (data: Omit<SystemEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'system.error' }, 'admin', EventPriority.CRITICAL),

  warning: (data: Omit<SystemEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'system.warning' }, 'admin', EventPriority.HIGH),

  maintenance: (data: Omit<SystemEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'system.maintenance' }, 'global', EventPriority.CRITICAL),

  performance: (data: Omit<SystemEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'system.performance' }, 'admin', EventPriority.LOW),

  integrationStatus: (data: Omit<SystemEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'system.integration.status' }, 'admin', EventPriority.MEDIUM),
};

/**
 * KPI Event Helpers
 */
export const kpiEvents = {
  updated: (data: Omit<KPIEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'kpi.updated' }, data.campaignId ? `campaign:${data.campaignId}` : 'admin'),

  thresholdExceeded: (data: Omit<KPIEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'kpi.threshold.exceeded' }, 'admin', EventPriority.HIGH),

  goalReached: (data: Omit<KPIEvent, 'id' | 'timestamp' | 'type'>) =>
    eventManager.emitEvent({ ...data, type: 'kpi.goal.reached' }, data.campaignId ? `campaign:${data.campaignId}` : 'admin', EventPriority.MEDIUM),
};

/**
 * Convenience function to emit multiple events atomically
 */
export const emitEvents = async (events: Array<{
  event: any;
  room?: string;
  priority?: EventPriority;
}>) => {
  const promises = events.map(({ event, room, priority }) =>
    eventManager.emitEvent(event, room as any, priority)
  );
  
  return Promise.all(promises);
};

/**
 * Quick system notification
 */
export const notify = {
  info: (message: string, component?: string) =>
    systemEvents.alert({ level: 'info', message, component }),

  warning: (message: string, component?: string) =>
    systemEvents.warning({ level: 'warning', message, component }),

  error: (message: string, component?: string) =>
    systemEvents.error({ level: 'error', message, component }),

  critical: (message: string, component?: string) =>
    systemEvents.error({ level: 'critical', message, component }),
};