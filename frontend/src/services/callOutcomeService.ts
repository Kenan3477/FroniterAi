/**
 * Call Outcome Tracking Service
 * Handles updating contacts with call results, agent info, and attempt tracking
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CallOutcome {
  contactId: string;
  agentId: string;
  campaignId: string;
  outcome: string; // 'answered', 'no-answer', 'busy', 'disconnected', 'voicemail', 'callback-requested', 'not-interested', 'do-not-call'
  dispositionId?: string;
  notes?: string;
  duration?: number; // seconds
  transferTo?: string;
  scheduledCallback?: Date;
}

export interface CallStartInfo {
  contactId: string;
  agentId: string;
  campaignId: string;
  phoneNumber: string;
}

/**
 * Record when a call starts (agent dials contact)
 */
export async function recordCallStart(callInfo: CallStartInfo): Promise<string> {
  try {
    console.log(`📞 Starting call: Agent ${callInfo.agentId} → Contact ${callInfo.contactId}`);

    // Generate unique call ID
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create call record
    const callRecord = await prisma.callRecord.create({
      data: {
        callId,
        campaignId: callInfo.campaignId,
        contactId: callInfo.contactId,
        agentId: callInfo.agentId,
        phoneNumber: callInfo.phoneNumber,
        dialedNumber: callInfo.phoneNumber,
        callType: 'outbound',
        startTime: new Date()
      }
    });

    // Update contact status to show call in progress
    await prisma.contact.update({
      where: { contactId: callInfo.contactId },
      data: {
        locked: true,
        lockedBy: callInfo.agentId,
        lockedAt: new Date(),
        status: 'calling'
      }
    });

    console.log(`✅ Call started: ${callId}`);
    return callId;

  } catch (error) {
    console.error('❌ Error recording call start:', error);
    throw error;
  }
}

/**
 * Record call completion with outcome
 */
export async function recordCallOutcome(callId: string, outcome: CallOutcome): Promise<void> {
  try {
    console.log(`📋 Recording call outcome: ${callId} → ${outcome.outcome}`);

    const endTime = new Date();

    // Get the call record to calculate duration
    const callRecord = await prisma.callRecord.findUnique({
      where: { callId }
    });

    if (!callRecord) {
      throw new Error(`Call record ${callId} not found`);
    }

    const duration = Math.floor((endTime.getTime() - callRecord.startTime.getTime()) / 1000);

    // Update call record with outcome
    await prisma.callRecord.update({
      where: { callId },
      data: {
        endTime,
        duration: outcome.duration || duration,
        outcome: outcome.outcome,
        dispositionId: outcome.dispositionId,
        notes: outcome.notes,
        transferTo: outcome.transferTo
      }
    });

    // Determine contact status based on outcome
    const contactStatus = determineContactStatus(outcome.outcome);
    
    // Prepare next attempt date
    let nextAttemptDate: Date | null = null;
    if (outcome.scheduledCallback) {
      nextAttemptDate = outcome.scheduledCallback;
    } else if (shouldRetry(outcome.outcome)) {
      nextAttemptDate = calculateNextAttemptDate(outcome.outcome);
    }

    // Update contact with outcome and tracking info
    await prisma.contact.update({
      where: { contactId: outcome.contactId },
      data: {
        lastAgentId: outcome.agentId,
        lastOutcome: outcome.outcome,
        lastAttempt: endTime,
        nextAttempt: nextAttemptDate,
        attemptCount: {
          increment: 1
        },
        status: contactStatus,
        notes: outcome.notes ? `${endTime.toISOString()}: ${outcome.notes}` : undefined,
        locked: false,
        lockedBy: null,
        lockedAt: null,
        updatedAt: endTime
      }
    });

    // Create interaction record for reporting
    await prisma.interaction.create({
      data: {
        agentId: outcome.agentId,
        contactId: outcome.contactId,
        campaignId: outcome.campaignId,
        channel: 'voice',
        outcome: outcome.outcome,
        startedAt: callRecord.startTime,
        endedAt: endTime,
        durationSeconds: duration,
        result: outcome.notes || outcome.outcome
      }
    });

    console.log(`✅ Call outcome recorded: ${outcome.contactId} → ${outcome.outcome}`);

  } catch (error) {
    console.error(`❌ Error recording call outcome for ${callId}:`, error);
    throw error;
  }
}

/**
 * Determine contact status based on call outcome
 */
function determineContactStatus(outcome: string): string {
  switch (outcome.toLowerCase()) {
    case 'answered':
    case 'interested':
    case 'qualified':
      return 'contacted';
    
    case 'callback-requested':
    case 'appointment-scheduled':
      return 'callback';
    
    case 'not-interested':
    case 'wrong-number':
    case 'do-not-call':
      return 'final';
    
    case 'no-answer':
    case 'busy':
    case 'voicemail':
    case 'disconnected':
      return 'attempted';
    
    default:
      return 'attempted';
  }
}

/**
 * Determine if contact should be retried based on outcome
 */
function shouldRetry(outcome: string): boolean {
  const retryOutcomes = [
    'no-answer',
    'busy', 
    'disconnected',
    'voicemail'
  ];
  
  return retryOutcomes.includes(outcome.toLowerCase());
}

/**
 * Calculate next attempt date based on outcome
 */
function calculateNextAttemptDate(outcome: string): Date {
  const now = new Date();
  
  switch (outcome.toLowerCase()) {
    case 'busy':
      // Retry in 1-2 hours for busy signals
      return new Date(now.getTime() + (1 + Math.random()) * 60 * 60 * 1000);
    
    case 'no-answer':
    case 'disconnected':
      // Retry same day or next day
      return new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
    
    case 'voicemail':
      // Wait longer for voicemail follow-up
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    
    default:
      return new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours default
  }
}

/**
 * Get contact call history
 */
export async function getContactCallHistory(contactId: string) {
  try {
    const callHistory = await prisma.callRecord.findMany({
      where: { contactId },
      include: {
        agent: {
          select: {
            agentId: true,
            firstName: true,
            lastName: true
          }
        },
        disposition: true
      },
      orderBy: { startTime: 'desc' }
    });

    return callHistory;

  } catch (error) {
    console.error(`❌ Error getting call history for ${contactId}:`, error);
    return [];
  }
}

/**
 * Release contact from agent lock (call abandoned/cancelled)
 */
export async function releaseContactLock(contactId: string): Promise<void> {
  try {
    await prisma.contact.update({
      where: { contactId },
      data: {
        locked: false,
        lockedBy: null,
        lockedAt: null,
        status: 'queued'
      }
    });

    console.log(`🔓 Released lock on contact: ${contactId}`);

  } catch (error) {
    console.error(`❌ Error releasing contact lock for ${contactId}:`, error);
    throw error;
  }
}

/**
 * Get contact summary with call statistics
 */
export async function getContactSummary(contactId: string) {
  try {
    const contact = await prisma.contact.findUnique({
      where: { contactId },
      include: {
        list: {
          select: {
            name: true
          }
        },
        callRecords: {
          select: {
            outcome: true,
            startTime: true,
            duration: true
          },
          orderBy: { startTime: 'desc' }
        }
      }
    });

    if (!contact) {
      throw new Error(`Contact ${contactId} not found`);
    }

    const totalCalls = contact.callRecords.length;
    const successfulContacts = contact.callRecords.filter((call: any) => 
      ['answered', 'interested', 'qualified'].includes(call.outcome || '')
    ).length;

    return {
      contact: {
        contactId: contact.contactId,
        name: `${contact.firstName} ${contact.lastName}`,
        phone: contact.phone,
        status: contact.status,
        lastOutcome: contact.lastOutcome,
        lastAttempt: contact.lastAttempt,
        nextAttempt: contact.nextAttempt,
        attemptCount: contact.attemptCount,
        maxAttempts: contact.maxAttempts,
        listName: contact.list.name
      },
      statistics: {
        totalCalls,
        successfulContacts,
        lastCallDuration: contact.callRecords[0]?.duration || 0,
        averageCallDuration: totalCalls > 0 
          ? Math.round(contact.callRecords.reduce((sum: number, call) => sum + (call.duration || 0), 0) / totalCalls)
          : 0
      }
    };

  } catch (error) {
    console.error(`❌ Error getting contact summary for ${contactId}:`, error);
    throw error;
  }
}