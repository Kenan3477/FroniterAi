/**
 * Twilio Recording Sync Service
 * Automatically fetches and stores call recordings from Twilio
 */

import { prisma } from '../database/index';
import { getCallRecordingsForCallTree } from './twilioService';
import { downloadAndStoreRecording } from './recordingService';

function extractCaSidsFromText(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches = text.match(/CA[a-f0-9]{32}/gi) || [];
  return [...new Set(matches.map((s) => s))];
}

/** Twilio lists recordings by parent Call SID (CA…). Rows often store conf-… as callId. */
function resolveLookupSids(row: {
  callId: string;
  recording: string | null;
  notes: string | null;
}): string[] {
  const out: string[] = [];
  const add = (s?: string | null) => {
    const t = (s || '').trim();
    if (/^CA[a-f0-9]{32}$/i.test(t) && !out.includes(t)) out.push(t);
  };
  add(row.callId);
  for (const s of extractCaSidsFromText(row.recording)) add(s);
  for (const s of extractCaSidsFromText(row.notes)) add(s);
  return out;
}

function normalizePhoneDigits(phone: string | null | undefined): string {
  return (phone || '').replace(/\D/g, '');
}

/**
 * Orphan rows (e.g. duplicate save-call-data) may lack CA… while a sibling row
 * for the same dial in the same time window has the Twilio SID.
 */
async function findTwilioCallSidFromSiblingRow(row: {
  id: string;
  phoneNumber: string;
  startTime: Date;
  agentId: string | null;
}): Promise<string | null> {
  const windowMs = 6 * 60 * 1000;
  const from = new Date(row.startTime.getTime() - windowMs);
  const to = new Date(row.startTime.getTime() + windowMs);
  const targetDigits = normalizePhoneDigits(row.phoneNumber);
  if (!targetDigits) return null;

  const baseWhere = {
    id: { not: row.id } as const,
    startTime: { gte: from, lte: to },
  };

  const tryScope = async (agentFilter: 'same' | 'any') => {
    const records = await prisma.callRecord.findMany({
      where: {
        ...baseWhere,
        ...(agentFilter === 'same' ? { agentId: row.agentId } : {}),
      },
      select: {
        callId: true,
        recording: true,
        notes: true,
        phoneNumber: true,
      },
      take: 40,
      orderBy: { startTime: 'desc' },
    });

    for (const c of records) {
      if (normalizePhoneDigits(c.phoneNumber) !== targetDigits) continue;
      const sids = resolveLookupSids({
        callId: c.callId,
        recording: c.recording,
        notes: c.notes,
      });
      if (sids.length) return sids[0];
    }
    return null;
  };

  const sameAgent = await tryScope('same');
  if (sameAgent) return sameAgent;
  return tryScope('any');
}

/**
 * Sync recordings for all call records that don't have recordings yet
 */
export async function syncAllRecordings(): Promise<{ synced: number; errors: number }> {
  console.log('🔄 Starting recording sync for all call records...');
  
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const callRecordsNeedingSync = await prisma.callRecord.findMany({
      where: {
        startTime: { gte: since },
        OR: [
          { recordingFile: null },
          { recordingFile: { uploadStatus: { not: 'completed' } } },
          { recordingFile: { filePath: '' } },
        ],
      },
      select: {
        id: true,
        callId: true,
        recording: true,
        notes: true,
        startTime: true,
        phoneNumber: true,
        agentId: true,
      },
    });

    console.log(`📊 Found ${callRecordsNeedingSync.length} call records needing recording sync`);

    let syncedCount = 0;
    let errorCount = 0;

    const batchSize = 5;
    for (let i = 0; i < callRecordsNeedingSync.length; i += batchSize) {
      const batch = callRecordsNeedingSync.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (callRecord) => {
        try {
          const ok = await syncRecordingForCallRow(callRecord);
          if (ok) syncedCount++;
          else errorCount++;
        } catch (error) {
          console.error(`❌ Error syncing recording for row ${callRecord.id}:`, error);
          errorCount++;
        }
      }));

      if (i + batchSize < callRecordsNeedingSync.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Recording sync completed: ${syncedCount} synced, ${errorCount} errors`);
    return { synced: syncedCount, errors: errorCount };

  } catch (error) {
    console.error('❌ Error during recording sync:', error);
    throw error;
  }
}

/**
 * Sync recording for a specific call record (resolves CA… from conf rows / notes / recording field).
 */
export async function syncRecordingForCall(callSid: string, callRecordId: string): Promise<boolean> {
  const row = await prisma.callRecord.findUnique({
    where: { id: callRecordId },
    select: {
      id: true,
      callId: true,
      recording: true,
      notes: true,
      phoneNumber: true,
      agentId: true,
      startTime: true,
    },
  });
  if (!row) return false;
  return syncRecordingForCallRow(row);
}

async function syncRecordingForCallRow(row: {
  id: string;
  callId: string;
  recording: string | null;
  notes: string | null;
  phoneNumber: string;
  agentId: string | null;
  startTime: Date;
}): Promise<boolean> {
  try {
    const existing = await prisma.recording.findFirst({
      where: { callRecordId: row.id },
    });
    if (existing?.uploadStatus === 'completed' && (existing.filePath || '').trim().length > 0) {
      return true;
    }

    let lookupSids = resolveLookupSids(row);
    if (!lookupSids.length) {
      const siblingSid = await findTwilioCallSidFromSiblingRow(row);
      if (siblingSid) {
        lookupSids = [siblingSid];
        console.log(`🔗 Resolved Twilio SID from sibling call for row ${row.id}: ${siblingSid}`);
      }
    }

    if (!lookupSids.length) {
      console.log(
        `📭 No Twilio CallSid (CA…) on call record ${row.id} and no sibling match — cannot sync recording`,
      );
      return false;
    }

    for (const sid of lookupSids) {
      try {
        const list = await getCallRecordingsForCallTree(sid);
        if (!list?.length) continue;
        console.log(
          `🔗 Trying Twilio call tree ${sid} (${list.length} recording(s) across leg(s)) for row ${row.id}`,
        );
        const id = await downloadAndStoreRecording(sid, row.id);
        if (id) return true;
      } catch (e) {
        console.warn(`⚠️ Recording sync attempt failed for ${sid}:`, e);
      }
    }

    console.log(
      `📭 No Twilio recordings linked for call record ${row.id} (tried: ${lookupSids.join(', ')})`,
    );
    return false;
  } catch (error: any) {
    if (error.message?.includes('not initialized')) {
      console.log(`⚠️ Twilio not configured - skipping recording sync`);
      return false;
    }
    console.error(`❌ Error syncing recording for call record ${row.id}:`, error);
    throw error;
  }
}

/**
 * Get recording sync status
 */
export async function getRecordingSyncStatus() {
  try {
    const totalCalls = await prisma.callRecord.count({
      where: {
        startTime: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    const callsWithRecordings = await prisma.callRecord.count({
      where: {
        recordingFile: {
          isNot: null
        },
        startTime: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    const syncPercentage = totalCalls > 0 ? Math.round((callsWithRecordings / totalCalls) * 100) : 0;

    return {
      totalCalls,
      callsWithRecordings,
      callsWithoutRecordings: totalCalls - callsWithRecordings,
      syncPercentage
    };

  } catch (error) {
    console.error('❌ Error getting recording sync status:', error);
    throw error;
  }
}

export default {
  syncAllRecordings,
  syncRecordingForCall,
  getRecordingSyncStatus
};