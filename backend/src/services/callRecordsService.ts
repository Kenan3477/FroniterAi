/**
 * Omnivox AI Call Records Service
 * Production-ready call management with proper data models and real-time updates
 */

import { prisma } from '../database/index';
import { processCallRecordings } from './recordingService';
import { deduplicateRecentCall } from './callDeduplicationService';
import { generatePhoneVariations, normalizePhoneNumber } from '../utils/phoneUtils';

export interface CreateCallRecordRequest {
  callId: string;
  agentId?: string; // Fixed: Changed from number to string to match schema
  contactId: string;
  campaignId: string;
  phoneNumber: string;
  dialedNumber?: string;
  callType?: string; // Fixed: Schema uses string, not enum
}

export interface UpdateCallRecordRequest {
  outcome?: string;
  dispositionId?: string; // Fixed: Use dispositionId instead of disposition
  notes?: string;
  duration?: number;
  recording?: string; // Fixed: Use recording instead of recordingUrl
  transferTo?: string;
}

export interface CallSearchFilters {
  agentId?: string; // Fixed: Changed from number to string
  campaignId?: string;
  outcome?: string;
  dateFrom?: Date;
  dateTo?: Date;
  phoneNumber?: string;
  /** Free text: notes, agent name, contact name (not used when phoneNumber is set from mobile search) */
  generalSearch?: string;
  duration?: { min?: number; max?: number };
  dispositionId?: string;
}

/**
 * Start a new call record
 */
export async function startCall(data: CreateCallRecordRequest) {
  console.log(`\n🔵 START CALL REQUEST:`, {
    callId: data.callId,
    phoneNumber: data.phoneNumber,
    campaignId: data.campaignId,
    agentId: data.agentId,
    timestamp: new Date().toISOString()
  });

  // 🆕 DUPLICATE PREVENTION: Check if a call record already exists for this phone number + campaign + recent time
  // Twilio creates DIFFERENT callIds for each leg, so we can't check by callId alone!
  // Must check by: phone number + campaign + time window (within last 10 seconds)
  const tenSecondsAgo = new Date(Date.now() - 10000);
  
  const existingCall = await prisma.callRecord.findFirst({
    where: {
      phoneNumber: data.phoneNumber,
      campaignId: data.campaignId,
      agentId: data.agentId,
      startTime: {
        gte: tenSecondsAgo
      }
    },
    orderBy: {
      startTime: 'desc'
    }
  });

  if (existingCall) {
    console.log(`⚠️ DUPLICATE DETECTED - Call record already exists for ${data.phoneNumber}`);
    console.log(`   Existing callId: ${existingCall.callId}`);
    console.log(`   Existing startTime: ${existingCall.startTime.toISOString()}`);
    console.log(`   New callId: ${data.callId}`);
    console.log(`   PREVENTED DUPLICATE - returning existing record\n`);
    return {
      callId: existingCall.callId,
      startTime: existingCall.startTime,
      existingRecord: true
    };
  }

  console.log(`✅ NO DUPLICATE - Creating new call record for ${data.phoneNumber}\n`);

  // Ensure required campaigns exist
  if (data.campaignId === 'MANUAL-DIAL') {
    await prisma.campaign.upsert({
      where: { campaignId: 'MANUAL-DIAL' },
      update: {},
      create: {
        campaignId: 'MANUAL-DIAL',
        name: 'Manual Dial',
        description: 'Manual dialing by agents',
        status: 'Active',
        isActive: true
      }
    });
  }

  // Ensure default data list exists for manual contacts
  await prisma.dataList.upsert({
    where: { listId: 'MANUAL-DIAL-CONTACTS' },
    update: {},
    create: {
      listId: 'MANUAL-DIAL-CONTACTS',
      name: 'Manual Dial Contacts',
      campaignId: data.campaignId,
      active: true,
      totalContacts: 0
    }
  });

  // If no contactId provided, create a temporary contact
  if (!data.contactId || data.contactId.startsWith('auto-')) {
    const contactId = `manual-${Date.now()}`;
    await prisma.contact.upsert({
      where: { contactId },
      update: {},
      create: {
        contactId,
        listId: 'MANUAL-DIAL-CONTACTS',
        firstName: 'Manual',
        lastName: 'Contact',
        phone: data.phoneNumber,
        status: 'new'
      }
    });
    data.contactId = contactId;
  }

  const callRecord = await prisma.callRecord.create({
    data: {
      callId: data.callId,
      agentId: data.agentId,
      contactId: data.contactId,
      campaignId: data.campaignId,
      phoneNumber: data.phoneNumber,
      dialedNumber: data.dialedNumber,
      callType: data.callType || 'outbound',
      startTime: new Date()
    }
  });

  console.log(`📞 Call started: ${callRecord.id} (${data.phoneNumber})`);

  return {
    callId: callRecord.callId,
    startTime: callRecord.startTime
  };
}/**
 * Update call record with outcome and process recordings
 */
export async function endCall(callId: string, data: UpdateCallRecordRequest, twilioCallSid?: string) {
  const endTime = new Date();
  
  // Calculate duration if not provided
  const callRecord = await prisma.callRecord.findUnique({
    where: { callId: callId },
    select: { id: true, startTime: true }
  });

  if (!callRecord) {
    throw new Error('Call record not found');
  }

  const duration = data.duration || Math.floor((endTime.getTime() - callRecord.startTime.getTime()) / 1000);

  const updatedRecord = await prisma.callRecord.update({
    where: { callId: callId },
    data: {
      endTime,
      duration,
      outcome: data.outcome,
      dispositionId: data.dispositionId,
      notes: data.notes,
      recording: data.recording,
      transferTo: data.transferTo
    }
  });

  console.log(`✅ Call ended: ${callId} - Duration: ${duration}s - Outcome: ${data.outcome}`);

  // Process recordings asynchronously if we have the Twilio call SID
  if (twilioCallSid) {
    console.log(`📼 Processing recordings for Twilio call: ${twilioCallSid}`);
    processCallRecordings(twilioCallSid, callRecord.id).catch(error => {
      console.error(`❌ Error processing recordings for ${twilioCallSid}:`, error);
    });
  }

  // Also try to sync recording using the call ID as potential Twilio SID
  if (callId !== twilioCallSid) {
    console.log(`📼 Also checking for recordings with callId as SID: ${callId}`);
    processCallRecordings(callId, callRecord.id).catch(error => {
      console.log(`ℹ️ No recordings found using callId as SID: ${callId}`);
    });
  }

  // 🆕 DEDUPLICATION: Automatically check for and consolidate duplicate call records
  // This runs SYNCHRONOUSLY after call ends to detect inbound/outbound leg duplicates
  // Changed from async to sync to ensure duplicates are consolidated before returning
  console.log(`🔍 Running deduplication check for callId: ${callId}`);
  try {
    await deduplicateRecentCall(callId);
    console.log(`✅ Deduplication check completed for callId: ${callId}`);
  } catch (error) {
    console.error(`❌ Error deduplicating call ${callId}:`, error);
  }

  return {
    callId: updatedRecord.callId,
    endTime: updatedRecord.endTime,
    duration: updatedRecord.duration,
    outcome: updatedRecord.outcome
  };
}

/**
 * Search call records with filters
 */
export async function searchCallRecords(filters: CallSearchFilters = {}) {
  const where: any = {};

  if (filters.agentId) where.agentId = filters.agentId;
  if (filters.campaignId) where.campaignId = filters.campaignId;

  const phoneRaw = filters.phoneNumber?.trim();
  if (phoneRaw) {
    const variantSet = new Set<string>();
    variantSet.add(phoneRaw);
    for (const v of generatePhoneVariations(phoneRaw)) {
      if (v) variantSet.add(v);
    }
    const normalized = normalizePhoneNumber(phoneRaw);
    if (normalized) {
      variantSet.add(normalized);
      for (const v of generatePhoneVariations(normalized)) {
        if (v) variantSet.add(v);
      }
    }
    const variants = Array.from(variantSet).filter((s) => s.length > 0);

    const phoneOr: any[] = [];
    if (variants.length) {
      phoneOr.push({ phoneNumber: { in: variants } });
      phoneOr.push({ dialedNumber: { in: variants } });
      phoneOr.push({ contact: { phone: { in: variants } } });
    }

    const digitsOnly = phoneRaw.replace(/\D/g, '');
    if (digitsOnly.length >= 6) {
      phoneOr.push({ phoneNumber: { contains: digitsOnly } });
      phoneOr.push({ dialedNumber: { contains: digitsOnly } });
      phoneOr.push({ contact: { phone: { contains: digitsOnly } } });
    }

    if (phoneOr.length) {
      if (!where.AND) where.AND = [];
      (where.AND as any[]).push({ OR: phoneOr });
    }
  }

  if (filters.dateFrom || filters.dateTo) {
    where.startTime = {};
    if (filters.dateFrom) where.startTime.gte = filters.dateFrom;
    if (filters.dateTo) {
      // Extend dateTo to end of day (23:59:59.999) to include all calls on that date
      const endOfDay = new Date(filters.dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      where.startTime.lte = endOfDay;
    }
  }

  if (filters.duration) {
    where.duration = {};
    if (filters.duration.min) where.duration.gte = filters.duration.min;
    if (filters.duration.max) where.duration.lte = filters.duration.max;
  }

  if (filters.dispositionId) {
    where.dispositionId = filters.dispositionId;
  }

  // Exclude consolidated duplicate records (invalid Prisma: do not nest AND under outcome)
  const notConsolidatedDuplicate = { not: 'consolidated-duplicate' as const };
  if (filters.outcome && String(filters.outcome).trim()) {
    const raw = String(filters.outcome).trim();
    const andClause: any[] = Array.isArray(where.AND) ? [...where.AND] : [];
    andClause.push({
      OR: [
        { outcome: { equals: raw, mode: 'insensitive' } },
        { disposition: { name: { equals: raw, mode: 'insensitive' } } },
      ],
    });
    andClause.push({ outcome: notConsolidatedDuplicate });
    where.AND = andClause;
  } else {
    where.outcome = notConsolidatedDuplicate;
  }

  const gs = filters.generalSearch?.trim();
  if (gs) {
    if (!where.AND) where.AND = [];
    (where.AND as any[]).push({
      OR: [
        { notes: { contains: gs, mode: 'insensitive' } },
        {
          agent: {
            OR: [
              { firstName: { contains: gs, mode: 'insensitive' } },
              { lastName: { contains: gs, mode: 'insensitive' } },
            ],
          },
        },
        {
          contact: {
            OR: [
              { firstName: { contains: gs, mode: 'insensitive' } },
              { lastName: { contains: gs, mode: 'insensitive' } },
              { fullName: { contains: gs, mode: 'insensitive' } },
            ],
          },
        },
      ],
    });
  }

  const callRecords = await prisma.callRecord.findMany({
    where,
    include: {
      agent: {
        select: {
          agentId: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      contact: {
        select: {
          contactId: true,
          firstName: true,
          lastName: true,
          fullName: true,
          phone: true,
          email: true
        }
      },
      campaign: {
        select: {
          name: true
        }
      },
      disposition: {
        select: {
          id: true,
          name: true,
          category: true
        }
      },
      recordingFile: {
        select: {
          id: true,
          fileName: true,
          filePath: true,  // FIXED: must be included for playback
          duration: true,
          uploadStatus: true,
          createdAt: true
        }
      }
    },
    orderBy: { startTime: 'desc' }
  });

  return callRecords;
}

/**
 * Get call statistics for a time period
 */
export async function getCallStats(dateFrom?: Date, dateTo?: Date) {
  const where: any = {};
  
  if (dateFrom || dateTo) {
    where.startTime = {};
    if (dateFrom) where.startTime.gte = dateFrom;
    if (dateTo) where.startTime.lte = dateTo;
  }

  const [
    totalCalls,
    completedCalls,
    totalDuration,
    avgDuration,
    outcomeCounts
  ] = await Promise.all([
    prisma.callRecord.count({ where }),
    prisma.callRecord.count({ where: { ...where, endTime: { not: null } } }), // Fixed: Use endTime instead of status
    prisma.callRecord.aggregate({
      where: { ...where, endTime: { not: null } }, // Fixed: Use endTime instead of status
      _sum: { duration: true }
    }),
    prisma.callRecord.aggregate({
      where: { ...where, endTime: { not: null } }, // Fixed: Use endTime instead of status
      _avg: { duration: true }
    }),
    prisma.callRecord.groupBy({
      by: ['outcome'],
      where: { ...where, outcome: { not: null } },
      _count: true
    })
  ]);

  const inProgressCalls = totalCalls - completedCalls; // Calculate instead of querying

  return {
    totalCalls,
    completedCalls,
    inProgressCalls,
    totalDuration: totalDuration._sum.duration || 0,
    avgDuration: Math.round(avgDuration._avg.duration || 0),
    outcomes: outcomeCounts.reduce((acc, item) => {
      acc[item.outcome || 'UNKNOWN'] = item._count;
      return acc;
    }, {} as Record<string, number>)
  };
}

/**
 * Get daily call volume for reporting
 */
export async function getDailyCallVolume(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const dailyStats = await prisma.$queryRaw`
    SELECT 
      DATE(startTime) as date,
      COUNT(*) as totalCalls,
      COUNT(CASE WHEN endTime IS NOT NULL THEN 1 END) as completedCalls,
      AVG(CASE WHEN duration > 0 THEN duration END) as avgDuration,
      SUM(CASE WHEN duration > 0 THEN duration END) as totalDuration
    FROM call_records 
    WHERE startTime >= ${startDate}
    GROUP BY DATE(startTime)
    ORDER BY date DESC
  `;

  return dailyStats;
}

export default {
  startCall,
  endCall,
  searchCallRecords,
  getCallStats,
  getDailyCallVolume
};