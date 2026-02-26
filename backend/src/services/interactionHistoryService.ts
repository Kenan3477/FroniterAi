/**
 * Omnivox AI Interaction History Service
 * Comprehensive call history tracking for both manual and auto-dial interactions
 * Implements proper categorization into subtabs: Queued, Allocated, Outcomed, Unallocated
 */

import { prisma } from '../database/index';

export interface InteractionHistoryFilters {
  agentId?: string;
  campaignId?: string;
  contactId?: string;
  channel?: string;
  status?: 'queued' | 'allocated' | 'outcomed' | 'unallocated' | 'active';
  outcome?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface CategorizedInteractions {
  queued: InteractionRecord[];
  allocated: InteractionRecord[];
  outcomed: InteractionRecord[];
  unallocated: InteractionRecord[];
  totals: {
    queued: number;
    allocated: number;
    outcomed: number;
    unallocated: number;
  };
}

export interface InteractionRecord {
  id: string;
  agentId: string;
  agentName: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  campaignId: string;
  campaignName: string;
  channel: string;
  outcome: string;
  status: string;
  isDmc: boolean;
  isCallback: boolean;
  callbackScheduledFor?: Date | null;
  startedAt: Date;
  endedAt?: Date | null;
  durationSeconds?: number | null;
  result?: string | null;
  notes?: string | null;
  dialType: 'manual' | 'auto-dial' | 'predictive' | 'inbound';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create interaction record for both manual and auto-dial calls
 */
export async function createInteractionRecord(data: {
  agentId: string;
  contactId: string;
  campaignId: string;
  channel?: string;
  outcome?: string;
  dialType: 'manual' | 'auto-dial' | 'predictive' | 'inbound';
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
  result?: string;
  notes?: string;
}) {
  try {
    // Check if contact exists
    const contact = await prisma.contact.findUnique({
      where: { contactId: data.contactId }
    });

    if (!contact) {
      console.warn(`Contact ${data.contactId} not found for interaction`);
      return {
        success: false,
        error: 'Contact not found'
      };
    }

    // Create interaction with proper outcome handling
    const interaction = await prisma.interaction.create({
      data: {
        agentId: data.agentId,
        contactId: data.contactId,
        campaignId: data.campaignId,
        channel: data.channel || 'voice',
        outcome: data.outcome || 'pending',
        isDmc: false,
        startedAt: data.startedAt,
        endedAt: data.endedAt || null,
        durationSeconds: data.durationSeconds || null,
        result: data.notes ? `${data.dialType}: ${data.notes}` : `${data.dialType} call`
      },
      include: {
        agent: {
          select: {
            agentId: true,
            firstName: true,
            lastName: true
          }
        },
        contact: {
          select: {
            contactId: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        campaign: {
          select: {
            campaignId: true,
            name: true
          }
        }
      }
    });

    // If this is a callback, create a task for follow-up
    const isCallback = data.outcome?.toLowerCase().includes('callback') || 
                      data.result?.toLowerCase().includes('callback') ||
                      false;

    if (isCallback) {
      await handleCallbackScheduling(interaction.id, data.contactId, data.campaignId, data.agentId);
    }

    console.log(`📞 Interaction record created: ${interaction.id} (${data.dialType}) - Outcome: ${data.outcome || 'pending'}`);

    return {
      success: true,
      data: interaction,
      message: 'Interaction record created successfully'
    };
  } catch (error) {
    console.error('Error creating interaction record:', error);
    return {
      success: false,
      error: 'Failed to create interaction record',
      details: error
    };
  }
}

/**
 * Update interaction record with outcome
 */
export async function updateInteractionOutcome(
  interactionId: string, 
  outcome: string,
  endedAt?: Date,
  durationSeconds?: number,
  result?: string,
  notes?: string,
  callbackScheduledFor?: Date
) {
  try {
    const isCallback = outcome?.toLowerCase().includes('callback') || 
                      result?.toLowerCase().includes('callback') ||
                      false;

    const interaction = await prisma.interaction.update({
      where: { id: interactionId },
      data: {
        outcome,
        endedAt: endedAt || new Date(),
        durationSeconds,
        result: result || null
      },
      include: {
        agent: {
          select: {
            agentId: true,
            firstName: true,
            lastName: true
          }
        },
        contact: {
          select: {
            contactId: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        campaign: {
          select: {
            campaignId: true,
            name: true
          }
        }
      }
    });

    // If callback scheduled, create task
    if (isCallback && callbackScheduledFor) {
      await handleCallbackScheduling(
        interaction.id, 
        interaction.contactId, 
        interaction.campaignId, 
        interaction.agentId,
        callbackScheduledFor
      );
    }

    console.log(`📞 Interaction outcome updated: ${interaction.id} - ${outcome} (Callback: ${isCallback})`);

    return {
      success: true,
      data: interaction,
      message: 'Interaction outcome updated successfully'
    };
  } catch (error) {
    console.error('Error updating interaction outcome:', error);
    return {
      success: false,
      error: 'Failed to update interaction outcome',
      details: error
    };
  }
}

/**
 * Get categorized interactions for call history subtabs
 */
export async function getCategorizedInteractions(
  filters: InteractionHistoryFilters = {}
): Promise<CategorizedInteractions> {
  try {
    const baseWhere: any = {};
    
    if (filters.agentId) baseWhere.agentId = filters.agentId;
    if (filters.campaignId) baseWhere.campaignId = filters.campaignId;
    if (filters.contactId) baseWhere.contactId = filters.contactId;
    if (filters.channel) baseWhere.channel = filters.channel;
    if (filters.outcome) baseWhere.outcome = filters.outcome;
    
    if (filters.dateFrom || filters.dateTo) {
      baseWhere.startedAt = {};
      if (filters.dateFrom) baseWhere.startedAt.gte = filters.dateFrom;
      if (filters.dateTo) baseWhere.startedAt.lte = filters.dateTo;
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    // Get callback tasks first to identify queued interactions
    const callbackTasks = await prisma.task.findMany({
      where: {
        type: 'callback',
        status: 'open',
        ...(filters.campaignId ? { campaignId: filters.campaignId } : {})
      },
      include: {
        contact: true,
        campaign: true,
        assignedUser: true
      }
    });

    // Query each category based on interaction status and outcomes
    const [allocatedInteractions, outcomedInteractions, unallocatedInteractions] = await Promise.all([
      // Allocated: Active calls or calls assigned to agents (not completed yet)
      prisma.interaction.findMany({
        where: {
          ...baseWhere,
          endedAt: null,
          outcome: {
            in: ['pending', 'allocated', 'in-progress', 'connected']
          }
        },
        include: {
          agent: { select: { agentId: true, firstName: true, lastName: true } },
          contact: { select: { contactId: true, firstName: true, lastName: true, phone: true } },
          campaign: { select: { campaignId: true, name: true } }
        },
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset
      }),

      // Outcomed: Completed calls with outcomes (exclude callbacks)
      prisma.interaction.findMany({
        where: {
          ...baseWhere,
          endedAt: { not: null },
          AND: [
            {
              OR: [
                { outcome: { not: null } },
                { result: { not: null } }
              ]
            },
            {
              outcome: { 
                not: { 
                  in: ['pending', 'allocated', 'in-progress', 'connected'] 
                } 
              }
            },
            {
              NOT: {
                OR: [
                  { outcome: { contains: 'callback', mode: 'insensitive' } },
                  { result: { contains: 'callback', mode: 'insensitive' } }
                ]
              }
            }
          ]
        },
        include: {
          agent: { select: { agentId: true, firstName: true, lastName: true } },
          contact: { select: { contactId: true, firstName: true, lastName: true, phone: true } },
          campaign: { select: { campaignId: true, name: true } }
        },
        orderBy: { endedAt: 'desc' },
        take: limit,
        skip: offset
      }),

      // Unallocated: Interactions without clear outcomes or assignments
      prisma.interaction.findMany({
        where: {
          ...baseWhere,
          OR: [
            { outcome: 'pending' },
            { outcome: '' },
            { outcome: null as any }
          ]
        },
        include: {
          agent: { select: { agentId: true, firstName: true, lastName: true } },
          contact: { select: { contactId: true, firstName: true, lastName: true, phone: true } },
          campaign: { select: { campaignId: true, name: true } }
        },
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset
      })
    ]);

    // Get callback interactions from interactions that resulted in callbacks
    const callbackInteractions = await prisma.interaction.findMany({
      where: {
        ...baseWhere,
        OR: [
          { outcome: { contains: 'callback', mode: 'insensitive' } },
          { result: { contains: 'callback', mode: 'insensitive' } }
        ]
      },
      include: {
        agent: { select: { agentId: true, firstName: true, lastName: true } },
        contact: { select: { contactId: true, firstName: true, lastName: true, phone: true } },
        campaign: { select: { campaignId: true, name: true } }
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset
    });

    // Get totals for each category
    const [allocatedTotal, outcomedTotal, unallocatedTotal, callbackTotal] = await Promise.all([
      prisma.interaction.count({
        where: {
          ...baseWhere,
          endedAt: null,
          outcome: {
            in: ['pending', 'allocated', 'in-progress', 'connected']
          }
        }
      }),
      prisma.interaction.count({
        where: {
          ...baseWhere,
          endedAt: { not: null },
          outcome: { 
            not: { 
              in: ['pending', 'allocated', 'in-progress', 'connected'] 
            } 
          },
          NOT: {
            OR: [
              { outcome: { contains: 'callback', mode: 'insensitive' } },
              { result: { contains: 'callback', mode: 'insensitive' } }
            ]
          }
        }
      }),
      prisma.interaction.count({
        where: {
          ...baseWhere,
          OR: [
            { outcome: 'pending' },
            { outcome: '' },
            { outcome: null as any }
          ]
        }
      }),
      prisma.interaction.count({
        where: {
          ...baseWhere,
          OR: [
            { outcome: { contains: 'callback', mode: 'insensitive' } },
            { result: { contains: 'callback', mode: 'insensitive' } }
          ]
        }
      })
    ]);

    // Transform data to consistent format
    const transformInteraction = (interaction: any): InteractionRecord => {
      const isCallback = interaction.outcome?.toLowerCase().includes('callback') || 
                        interaction.result?.toLowerCase().includes('callback') ||
                        false;
      
      const status = getInteractionStatus(interaction);
      
      return {
        id: interaction.id,
        agentId: interaction.agentId,
        agentName: `${interaction.agent?.firstName || ''} ${interaction.agent?.lastName || ''}`.trim(),
        contactId: interaction.contactId,
        contactName: `${interaction.contact?.firstName || ''} ${interaction.contact?.lastName || ''}`.trim(),
        contactPhone: interaction.contact?.phone || '',
        campaignId: interaction.campaignId,
        campaignName: interaction.campaign?.name || '',
        channel: interaction.channel || 'voice',
        outcome: interaction.outcome,
        status,
        isDmc: interaction.isDmc || false,
        isCallback,
        callbackScheduledFor: null, // Would need to get from related task
        startedAt: interaction.startedAt,
        endedAt: interaction.endedAt,
        durationSeconds: interaction.durationSeconds,
        result: interaction.result,
        notes: null,
        dialType: extractDialType(interaction.result) || 'manual',
        createdAt: interaction.createdAt || interaction.startedAt,
        updatedAt: interaction.updatedAt || interaction.startedAt
      };
    };

    const result: CategorizedInteractions = {
      queued: callbackInteractions.map(transformInteraction),
      allocated: allocatedInteractions.map(transformInteraction),
      outcomed: outcomedInteractions.map(transformInteraction),
      unallocated: unallocatedInteractions.map(transformInteraction),
      totals: {
        queued: callbackTotal,
        allocated: allocatedTotal,
        outcomed: outcomedTotal,
        unallocated: unallocatedTotal
      }
    };

    console.log(`📊 Categorized interactions retrieved - Q:${callbackTotal} A:${allocatedTotal} O:${outcomedTotal} U:${unallocatedTotal}`);

    return result;
  } catch (error) {
    console.error('Error getting categorized interactions:', error);
    throw new Error('Failed to get categorized interactions');
  }
}

/**
 * Helper function to determine interaction status
 */
function getInteractionStatus(interaction: any): string {
  if (interaction.endedAt && interaction.outcome && interaction.outcome !== 'pending') {
    return 'outcomed';
  }
  if (interaction.endedAt === null && interaction.outcome === 'pending') {
    return 'allocated';
  }
  if (!interaction.outcome || interaction.outcome === '' || interaction.outcome === 'pending') {
    return 'unallocated';
  }
  return 'allocated';
}

/**
 * Helper function to extract dial type from result string
 */
function extractDialType(result: string | null): 'manual' | 'auto-dial' | 'predictive' | 'inbound' | null {
  if (!result) return null;
  
  if (result.includes('auto-dial')) return 'auto-dial';
  if (result.includes('predictive')) return 'predictive';
  if (result.includes('manual')) return 'manual';
  if (result.includes('inbound')) return 'inbound';
  
  return null;
}

/**
 * Handle callback scheduling - creates task for follow-up
 */
async function handleCallbackScheduling(
  interactionId: string,
  contactId: string,
  campaignId: string,
  agentId: string,
  scheduledFor?: Date
) {
  try {
    // Create task for callback
    const task = await prisma.task.create({
      data: {
        assignedUserId: agentId,
        contactId,
        campaignId,
        type: 'callback',
        notes: `Callback scheduled from interaction ${interactionId}`,
        dueAt: scheduledFor || new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24 hours
        status: 'open'
      }
    });

    console.log(`📅 Callback task created: ${task.id} for interaction ${interactionId}`);
    
    return task;
  } catch (error) {
    console.error('Error scheduling callback:', error);
    throw error;
  }
}

/**
 * Track auto-dial interaction
 */
export async function trackAutoDialInteraction(data: {
  agentId: string;
  contactId: string;
  campaignId: string;
  dialType: 'auto-dial' | 'predictive';
  callSid?: string;
  startedAt: Date;
  predictiveScore?: number;
}) {
  try {
    const notes = [
      data.callSid ? `Call SID: ${data.callSid}` : '',
      data.predictiveScore ? `Predictive Score: ${data.predictiveScore}` : ''
    ].filter(Boolean).join(', ');

    const interaction = await createInteractionRecord({
      agentId: data.agentId,
      contactId: data.contactId,
      campaignId: data.campaignId,
      channel: 'voice',
      dialType: data.dialType,
      startedAt: data.startedAt,
      notes
    });

    return interaction;
  } catch (error) {
    console.error('Error tracking auto-dial interaction:', error);
    return {
      success: false,
      error: 'Failed to track auto-dial interaction'
    };
  }
}

export default {
  createInteractionRecord,
  updateInteractionOutcome,
  getCategorizedInteractions,
  trackAutoDialInteraction
};