/**
 * Call Event Tracking Service
 * Enhanced call lifecycle tracking for voice campaign analytics
 */

import { prisma } from '../database/index';

export interface CallEventData {
  callId: string;
  eventType: 'call_started' | 'call_connected' | 'call_completed' | 'call_dropped' | 'call_failed' | 'call_converted';
  campaignId?: string;
  agentId?: string;
  contactId?: string;
  leadListId?: string;
  timestamp?: Date;
  metadata?: any;
  revenue?: number;
  cost?: number;
}

/**
 * Track call lifecycle events for analytics
 */
export async function trackCallEvent(eventData: CallEventData) {
  try {
    const { callId, eventType, campaignId, agentId, contactId, leadListId, timestamp, metadata, revenue, cost } = eventData;

    // Update the call record based on event type
    const updateData: any = {
      updatedAt: timestamp || new Date()
    };

    switch (eventType) {
      case 'call_started':
        updateData.startTime = timestamp || new Date();
        updateData.outcome = 'initiated';
        break;
      
      case 'call_connected':
        updateData.outcome = 'answered';
        // Calculate time to connect if we have start time
        const existingRecord = await prisma.callRecord.findUnique({
          where: { callId },
          select: { startTime: true }
        });
        if (existingRecord?.startTime) {
          updateData.timeToConnect = Math.round(
            ((timestamp || new Date()).getTime() - existingRecord.startTime.getTime()) / 1000
          );
        }
        break;
      
      case 'call_completed':
        updateData.endTime = timestamp || new Date();
        updateData.outcome = 'completed';
        // Calculate duration if we have start time
        const callRecord = await prisma.callRecord.findUnique({
          where: { callId },
          select: { startTime: true }
        });
        if (callRecord?.startTime) {
          updateData.duration = Math.round(
            ((timestamp || new Date()).getTime() - callRecord.startTime.getTime()) / 1000
          );
        }
        break;
      
      case 'call_dropped':
        updateData.endTime = timestamp || new Date();
        updateData.outcome = 'dropped';
        break;
      
      case 'call_failed':
        updateData.endTime = timestamp || new Date();
        updateData.outcome = 'failed';
        break;
      
      case 'call_converted':
        updateData.outcome = 'converted';
        if (revenue) {
          // Create a sale record
          await prisma.sale.create({
            data: {
              contactId: contactId || 'unknown',
              agentId: agentId || 'system',
              amount: revenue,
              status: 'success',
              interactionId: callId // Use callId as interaction reference
            }
          });
        }
        break;
    }

    // Add metadata if provided
    if (metadata) {
      updateData.notes = JSON.stringify(metadata);
    }

    // Update the call record
    const updatedRecord = await prisma.callRecord.upsert({
      where: { callId },
      update: updateData,
      create: {
        callId,
        campaignId: campaignId || 'UNKNOWN',
        contactId: contactId || 'UNKNOWN',
        agentId,
        phoneNumber: metadata?.phoneNumber || 'unknown',
        callType: 'outbound',
        startTime: timestamp || new Date(),
        outcome: eventType.replace('call_', ''),
        notes: metadata ? JSON.stringify(metadata) : null
      }
    });

    // Create analytics record for efficient reporting
    await createCallAnalytics(callId, eventType, updatedRecord);

    console.log(`📞 Call event tracked: ${eventType} for call ${callId}`);
    
    return {
      success: true,
      data: updatedRecord
    };

  } catch (error) {
    console.error('Error tracking call event:', error);
    return {
      success: false,
      error: 'Failed to track call event'
    };
  }
}

/**
 * Create optimized analytics records for fast reporting
 */
async function createCallAnalytics(callId: string, eventType: string, callRecord: any) {
  try {
    // Check if analytics record already exists
    const existingAnalytics = await prisma.callKPI.findUnique({
      where: { callId }
    });

    const analyticsData = {
      campaignId: callRecord.campaignId,
      agentId: callRecord.agentId || 'system',
      contactId: callRecord.contactId,
      callId: callRecord.callId,
      disposition: callRecord.outcome || 'unknown',
      dispositionCategory: categorizeOutcome(callRecord.outcome),
      callDuration: callRecord.duration || 0,
      callDate: callRecord.startTime || new Date(),
      hourOfDay: new Date(callRecord.startTime || new Date()).getHours(),
      dayOfWeek: new Date(callRecord.startTime || new Date()).getDay(),
      outcome: callRecord.outcome || 'unknown',
      notes: callRecord.notes
    };

    if (existingAnalytics) {
      // Update existing analytics
      await prisma.callKPI.update({
        where: { callId },
        data: analyticsData
      });
    } else {
      // Create new analytics record
      await prisma.callKPI.create({
        data: {
          id: `kpi_${callId}`,
          ...analyticsData
        }
      });
    }

  } catch (error) {
    console.error('Error creating call analytics:', error);
    // Non-blocking error - don't fail the main operation
  }
}

/**
 * Categorize call outcomes for reporting
 */
function categorizeOutcome(outcome: string): string {
  if (!outcome) return 'unknown';
  
  const outcomeMap: { [key: string]: string } = {
    'answered': 'connected',
    'connected': 'connected',
    'completed': 'connected',
    'converted': 'conversion',
    'sale': 'conversion',
    'success': 'conversion',
    'qualified': 'conversion',
    'interested': 'positive',
    'callback': 'positive',
    'not_answered': 'no_answer',
    'no_answer': 'no_answer',
    'busy': 'no_answer',
    'voicemail': 'no_answer',
    'dropped': 'failed',
    'failed': 'failed',
    'error': 'failed',
    'rejected': 'failed'
  };

  return outcomeMap[outcome.toLowerCase()] || 'other';
}

/**
 * Bulk import call events (for migrating existing data)
 */
export async function bulkImportCallEvents(events: CallEventData[]) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  for (const event of events) {
    try {
      const result = await trackCallEvent(event);
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(`Failed to import ${event.callId}: ${result.error}`);
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`Error importing ${event.callId}: ${error}`);
    }
  }

  return results;
}

/**
 * Get call events summary for a time period
 */
export async function getCallEventsSummary(dateFrom?: Date, dateTo?: Date, campaignId?: string) {
  try {
    const whereClause: any = {};
    
    if (dateFrom || dateTo) {
      whereClause.startTime = {};
      if (dateFrom) whereClause.startTime.gte = dateFrom;
      if (dateTo) whereClause.startTime.lte = dateTo;
    }
    
    if (campaignId) {
      whereClause.campaignId = campaignId;
    }

    const summary = await prisma.callRecord.groupBy({
      by: ['outcome'],
      where: whereClause,
      _count: {
        id: true
      },
      _avg: {
        duration: true
      }
    });

    const totalCalls = summary.reduce((sum, group) => sum + group._count.id, 0);
    
    return {
      success: true,
      data: {
        totalCalls,
        outcomes: summary.map(group => ({
          outcome: group.outcome,
          count: group._count.id,
          averageDuration: Math.round(group._avg.duration || 0),
          percentage: totalCalls > 0 ? ((group._count.id / totalCalls) * 100).toFixed(1) : '0'
        }))
      }
    };

  } catch (error) {
    console.error('Error getting call events summary:', error);
    return {
      success: false,
      error: 'Failed to get call events summary'
    };
  }
}