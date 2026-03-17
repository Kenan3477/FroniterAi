/**
 * Enhanced Contact Analysis Service
 * Provides comprehensive contact information including source tracking, 
 * call history, and analytics for uploaded data with campaign isolation
 */

import db from '../lib/db';

export interface ContactAnalysisData {
  contact: {
    contactId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string;
    email?: string;
    company?: string;
    status: string;
    attemptCount: number;
    lastAttempt?: Date;
    nextAttempt?: Date;
    lastOutcome?: string;
    createdAt: Date;
  };
  sourceInfo: {
    listId: string;
    listName: string;
    uploadDate: Date;
    campaignId?: string;
    campaignName?: string;
  };
  callHistory: {
    totalCalls: number;
    totalDuration: number; // in seconds
    firstCallDate?: Date;
    lastCallDate?: Date;
    outcomes: Array<{
      date: Date;
      outcome: string;
      duration?: number;
      agentId?: string;
      notes?: string;
      agentName?: string;
    }>;
  };
  analytics: {
    timesSeen: number;
    averageCallDuration: number;
    conversionEvents: number;
    lastAgentContact?: string;
    callbacksScheduled: number;
  };
}

/**
 * Get comprehensive contact analysis data for info modal with campaign isolation
 */
export async function getContactAnalysisData(
  contactId: string, 
  campaignId?: string
): Promise<ContactAnalysisData | null> {
  try {
    // Get contact data with relationships - using any to avoid Prisma type issues for now
    const contact: any = await (db as any).contact.findUnique({
      where: { contactId },
      include: {
        list: {
          include: {
            listCampaignLinks: {
              include: {
                campaign: true
              }
            }
          }
        },
        callRecords: {
          orderBy: { startTime: 'desc' },
          include: {
            agent: {
              select: { firstName: true, lastName: true }
            }
          }
        },
        interactions: true,
        sales: true
      }
    });

    if (!contact) {
      return null;
    }

    // Enforce campaign isolation - only show contact if it belongs to the specified campaign
    if (campaignId) {
      const belongsToCampaign = contact.list?.listCampaignLinks?.some(
        (link: any) => link.campaign?.campaignId === campaignId
      );
      
      if (!belongsToCampaign) {
        return null; // Contact doesn't belong to the user's current campaign
      }
    }

    // Get campaign info from the linked campaigns
    let campaignInfo = null;
    if (campaignId) {
      // Use the specific campaign the user is working in
      const campaignLink = contact.list?.listCampaignLinks?.find(
        (link: any) => link.campaign?.campaignId === campaignId
      );
      campaignInfo = campaignLink?.campaign || null;
    } else if (contact.list?.listCampaignLinks?.length > 0) {
      // Fallback to first linked campaign if no specific campaign provided
      campaignInfo = contact.list.listCampaignLinks[0]?.campaign || null;
    }

    // Analyze call history
    const callHistory = contact.callRecords || [];
    const totalCalls = callHistory.length;
    const totalDuration = callHistory.reduce((sum: number, call: any) => sum + (call.duration || 0), 0);
    const firstCallDate = callHistory.length > 0 ? callHistory[callHistory.length - 1].startTime : undefined;
    const lastCallDate = callHistory.length > 0 ? callHistory[0].startTime : undefined;

    // Format outcomes with agent names
    const outcomes = callHistory.map((call: any) => ({
      date: call.startTime,
      outcome: call.outcome || 'Unknown',
      duration: call.duration,
      agentId: call.agentId,
      notes: call.notes,
      agentName: call.agent ? `${call.agent.firstName} ${call.agent.lastName}` : undefined
    }));

    // Calculate analytics
    const conversionEvents = (contact.sales || []).length;
    const callbacksScheduled = callHistory.filter((call: any) => 
      call.outcome?.toLowerCase().includes('callback') || 
      call.outcome?.toLowerCase().includes('schedule')
    ).length;

    const averageCallDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

    return {
      contact: {
        contactId: contact.contactId,
        firstName: contact.firstName,
        lastName: contact.lastName,
        fullName: contact.fullName || `${contact.firstName} ${contact.lastName}`,
        phone: contact.phone,
        email: contact.email,
        company: contact.company,
        status: contact.status,
        attemptCount: contact.attemptCount,
        lastAttempt: contact.lastAttempt,
        nextAttempt: contact.nextAttempt,
        lastOutcome: contact.lastOutcome,
        createdAt: contact.createdAt
      },
      sourceInfo: {
        listId: contact.listId,
        listName: contact.list?.name || 'Unknown List',
        uploadDate: contact.list?.createdAt || contact.createdAt,
        campaignId: campaignInfo?.campaignId || campaignId,
        campaignName: campaignInfo?.name || 'Unknown Campaign'
      },
      callHistory: {
        totalCalls,
        totalDuration,
        firstCallDate,
        lastCallDate,
        outcomes
      },
      analytics: {
        timesSeen: (contact.interactions || []).length,
        averageCallDuration,
        conversionEvents,
        lastAgentContact: contact.lastAgentId,
        callbacksScheduled
      }
    };

  } catch (error) {
    console.error('Error fetching contact analysis data:', error);
    return null;
  }
}

/**
 * Get enhanced contacts list with campaign isolation
 */
export async function getEnhancedContacts(campaignId?: string, limit = 50, offset = 0) {
  try {
    const whereClause = campaignId ? {
      list: {
        listCampaignLinks: {
          some: {
            campaign: {
              campaignId: campaignId
            }
          }
        }
      }
    } : {};

    const contacts = await (db as any).contact.findMany({
      where: whereClause,
      include: {
        list: {
          include: {
            listCampaignLinks: {
              include: {
                campaign: {
                  select: { campaignId: true, name: true }
                }
              }
            }
          }
        },
        callRecords: {
          orderBy: { startTime: 'desc' },
          take: 1 // Only latest call
        },
        _count: {
          select: {
            callRecords: true,
            interactions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return contacts.map((contact: any) => {
      const latestCall = contact.callRecords[0];
      const campaignInfo = campaignId 
        ? contact.list?.listCampaignLinks?.find((link: any) => link.campaign?.campaignId === campaignId)?.campaign
        : contact.list?.listCampaignLinks?.[0]?.campaign;

      return {
        contactId: contact.contactId,
        firstName: contact.firstName,
        lastName: contact.lastName,
        fullName: contact.fullName || `${contact.firstName} ${contact.lastName}`,
        phone: contact.phone,
        email: contact.email,
        company: contact.company,
        status: contact.status,
        listName: contact.list?.name || 'Unknown List',
        uploadDate: contact.list?.createdAt || contact.createdAt,
        campaignId: campaignInfo?.campaignId,
        campaignName: campaignInfo?.name,
        totalCalls: contact._count.callRecords,
        totalInteractions: contact._count.interactions,
        lastCallDate: latestCall?.startTime,
        lastOutcome: latestCall?.outcome,
        attemptCount: contact.attemptCount
      };
    });

  } catch (error) {
    console.error('Error fetching enhanced contacts:', error);
    return [];
  }
}