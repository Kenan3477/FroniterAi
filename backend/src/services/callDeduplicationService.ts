/**
 * Call Record Deduplication Service
 * 
 * Problem: Each real-world call generates TWO call records:
 * 1. Outbound agent leg (has recording)
 * 2. Inbound customer leg (no recording) - DUPLICATE
 * 
 * Solution: Post-processing deduplication that:
 * - Detects duplicate call legs using shared identifiers
 * - Keeps canonical record (with recording)
 * - Merges metadata from duplicate
 * - Marks duplicates as consolidated (not deleted)
 * - Maintains backward compatibility
 * 
 * Architecture Compliance:
 * ✅ No changes to telephony flow (post-processing only)
 * ✅ Idempotent (safe to run multiple times)
 * ✅ Preserves all recordings
 * ✅ Maintains referential integrity
 */

import { prisma } from '../database/index';

export interface CallDuplicationMatch {
  canonicalRecord: any;
  duplicateRecords: any[];
  matchReason: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface DeduplicationResult {
  totalProcessed: number;
  duplicatesFound: number;
  recordsConsolidated: number;
  recordingsPreserved: number;
  errors: string[];
}

/**
 * Main deduplication function - can be run on-demand or scheduled
 */
export async function deduplicateCallRecords(
  options: {
    timeWindowMinutes?: number;  // Look for duplicates within this window
    batchSize?: number;           // Process this many records at a time
    dryRun?: boolean;             // Don't actually modify, just report
  } = {}
): Promise<DeduplicationResult> {
  const {
    timeWindowMinutes = 15,
    batchSize = 100,
    dryRun = false
  } = options;

  console.log(`🔄 Starting call record deduplication...`);
  console.log(`   Time window: ${timeWindowMinutes} minutes`);
  console.log(`   Batch size: ${batchSize}`);
  console.log(`   Dry run: ${dryRun}`);

  const result: DeduplicationResult = {
    totalProcessed: 0,
    duplicatesFound: 0,
    recordsConsolidated: 0,
    recordingsPreserved: 0,
    errors: []
  };

  try {
    // Get all calls from the last N hours that haven't been processed for deduplication
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    
    const callRecords = await prisma.callRecord.findMany({
      where: {
        startTime: {
          gte: cutoffTime
        },
        // Only process records that have ended
        endTime: {
          not: null
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: batchSize,
      include: {
        recordingFile: true,
        agent: true,
        contact: true
      }
    });

    console.log(`📊 Found ${callRecords.length} call records to analyze`);
    result.totalProcessed = callRecords.length;

    // Group calls by potential duplicates
    const duplicateGroups = await findDuplicateGroups(callRecords, timeWindowMinutes);
    
    console.log(`🔍 Identified ${duplicateGroups.length} potential duplicate groups`);
    result.duplicatesFound = duplicateGroups.length;

    // Process each duplicate group
    for (const group of duplicateGroups) {
      try {
        if (!dryRun) {
          await consolidateDuplicateGroup(group);
        }
        result.recordsConsolidated++;
        if (group.canonicalRecord.recording || group.canonicalRecord.recordingFile) {
          result.recordingsPreserved++;
        }
        
        console.log(`✅ Consolidated: ${group.canonicalRecord.callId} (${group.matchReason})`);
      } catch (error: any) {
        console.error(`❌ Error consolidating group:`, error);
        result.errors.push(`Failed to consolidate ${group.canonicalRecord.callId}: ${error.message}`);
      }
    }

    console.log(`✅ Deduplication complete!`);
    console.log(`   Total processed: ${result.totalProcessed}`);
    console.log(`   Duplicates found: ${result.duplicatesFound}`);
    console.log(`   Records consolidated: ${result.recordsConsolidated}`);
    console.log(`   Recordings preserved: ${result.recordingsPreserved}`);
    
    return result;

  } catch (error: any) {
    console.error(`❌ Fatal error in deduplication:`, error);
    result.errors.push(`Fatal error: ${error.message}`);
    return result;
  }
}

/**
 * Find groups of call records that represent the same real-world call
 */
async function findDuplicateGroups(
  callRecords: any[],
  timeWindowMinutes: number
): Promise<CallDuplicationMatch[]> {
  const duplicateGroups: CallDuplicationMatch[] = [];
  const processedIds = new Set<string>();

  for (const record of callRecords) {
    // Skip if already processed as part of a group
    if (processedIds.has(record.id)) continue;

    // Find potential duplicates for this record
    const duplicates = findDuplicatesForRecord(record, callRecords, timeWindowMinutes);
    
    if (duplicates.length > 0) {
      // Determine which is the canonical record
      const allRecords = [record, ...duplicates];
      const canonical = selectCanonicalRecord(allRecords);
      const dupes = allRecords.filter(r => r.id !== canonical.id);

      duplicateGroups.push({
        canonicalRecord: canonical,
        duplicateRecords: dupes,
        matchReason: determineMatchReason(canonical, dupes[0]),
        confidence: determineMatchConfidence(canonical, dupes)
      });

      // Mark all as processed
      allRecords.forEach(r => processedIds.add(r.id));
    }
  }

  return duplicateGroups;
}

/**
 * Find duplicate call records for a single record
 */
function findDuplicatesForRecord(
  record: any,
  allRecords: any[],
  timeWindowMinutes: number
): any[] {
  const duplicates: any[] = [];
  const timeWindow = timeWindowMinutes * 60 * 1000; // Convert to milliseconds

  for (const other of allRecords) {
    // Don't compare with self
    if (other.id === record.id) continue;

    // Check if these are duplicates using multiple strategies
    const isDuplicate = checkIfDuplicate(record, other, timeWindow);
    
    if (isDuplicate) {
      duplicates.push(other);
    }
  }

  return duplicates;
}

/**
 * Comprehensive duplicate detection using multiple strategies
 */
function checkIfDuplicate(record1: any, record2: any, timeWindow: number): boolean {
  // Strategy 1: Same Twilio CallSid (highest confidence)
  // The recording field often contains the Twilio SID
  if (record1.recording && record2.recording && record1.recording === record2.recording) {
    return true;
  }

  // Strategy 2: CallIds share a common Twilio SID pattern
  // CallIds might be like "CA123abc_agent" and "CA123abc_customer"
  const extractTwilioSid = (callId: string) => {
    const match = callId.match(/CA[0-9a-f]{32}/i);
    return match ? match[0] : null;
  };
  
  const sid1 = extractTwilioSid(record1.callId);
  const sid2 = extractTwilioSid(record2.callId);
  
  if (sid1 && sid2 && sid1 === sid2) {
    return true;
  }

  // Strategy 3: Same agent + same phone number + close timestamps
  const sameAgent = record1.agentId && record2.agentId && record1.agentId === record2.agentId;
  const sameNumber = record1.phoneNumber === record2.phoneNumber;
  const timeDiff = Math.abs(record1.startTime.getTime() - record2.startTime.getTime());
  const closeTime = timeDiff <= timeWindow;

  if (sameAgent && sameNumber && closeTime) {
    return true;
  }

  // Strategy 4: Same campaign + same contact + close timestamps
  const sameCampaign = record1.campaignId === record2.campaignId;
  const sameContact = record1.contactId === record2.contactId;
  
  if (sameCampaign && sameContact && closeTime) {
    return true;
  }

  return false;
}

/**
 * Select the canonical (kept) record from a group of duplicates
 * Priority:
 * 1. Has recording
 * 2. Has recordingFile relation
 * 3. Direction = outbound
 * 4. Longer duration
 * 5. Earlier timestamp (first created)
 */
function selectCanonicalRecord(records: any[]): any {
  return records.reduce((best, current) => {
    // Prefer record with recording
    const bestHasRecording = !!(best.recording || best.recordingFile);
    const currentHasRecording = !!(current.recording || current.recordingFile);
    
    if (currentHasRecording && !bestHasRecording) return current;
    if (!currentHasRecording && bestHasRecording) return best;

    // Prefer outbound direction
    if (current.callType === 'outbound' && best.callType !== 'outbound') return current;
    if (best.callType === 'outbound' && current.callType !== 'outbound') return best;

    // Prefer longer duration (more complete call)
    if (current.duration && best.duration) {
      if (current.duration > best.duration) return current;
      if (best.duration > current.duration) return best;
    }

    // Prefer earlier timestamp (first record created)
    if (current.startTime < best.startTime) return current;
    
    return best;
  });
}

/**
 * Consolidate a group of duplicates into one canonical record
 */
async function consolidateDuplicateGroup(group: CallDuplicationMatch): Promise<void> {
  const { canonicalRecord, duplicateRecords } = group;

  console.log(`📝 Consolidating ${duplicateRecords.length} duplicates into ${canonicalRecord.callId}`);

  // Merge metadata from duplicates into canonical record
  const mergedNotes = [
    canonicalRecord.notes,
    ...duplicateRecords.map((d, idx) => 
      `[MERGED from ${d.callId}] ${d.notes || 'No notes'}`
    )
  ].filter(Boolean).join('\n\n');

  // Get the best duration (longest)
  const durations = [
    canonicalRecord.duration,
    ...duplicateRecords.map(d => d.duration)
  ].filter(d => d > 0);
  const bestDuration = durations.length > 0 ? Math.max(...durations) : canonicalRecord.duration;

  // Get the best outcome (prefer completed over others)
  const outcomes = [canonicalRecord.outcome, ...duplicateRecords.map(d => d.outcome)];
  const bestOutcome = outcomes.includes('completed') 
    ? 'completed' 
    : outcomes.includes('answered')
    ? 'answered'
    : canonicalRecord.outcome;

  // Update canonical record with merged data
  await prisma.callRecord.update({
    where: { id: canonicalRecord.id },
    data: {
      notes: mergedNotes,
      duration: bestDuration,
      outcome: bestOutcome
    }
  });

  // Mark duplicates as consolidated (soft delete approach)
  for (const duplicate of duplicateRecords) {
    await prisma.callRecord.update({
      where: { id: duplicate.id },
      data: {
        notes: `[DUPLICATE - CONSOLIDATED INTO ${canonicalRecord.callId}] ${duplicate.notes || ''}`,
        outcome: 'consolidated-duplicate'
      }
    });
  }

  console.log(`   ✅ Updated canonical record: ${canonicalRecord.callId}`);
  console.log(`   ✅ Marked ${duplicateRecords.length} duplicates as consolidated`);
}

/**
 * Determine the reason for the match (for debugging/reporting)
 */
function determineMatchReason(record1: any, record2: any): string {
  if (record1.recording && record2.recording && record1.recording === record2.recording) {
    return 'Same Twilio SID in recording field';
  }
  
  const extractTwilioSid = (callId: string) => {
    const match = callId.match(/CA[0-9a-f]{32}/i);
    return match ? match[0] : null;
  };
  
  if (extractTwilioSid(record1.callId) === extractTwilioSid(record2.callId)) {
    return 'Same Twilio SID in callId';
  }

  if (record1.agentId === record2.agentId && record1.phoneNumber === record2.phoneNumber) {
    return 'Same agent + phone number + close timestamp';
  }

  if (record1.campaignId === record2.campaignId && record1.contactId === record2.contactId) {
    return 'Same campaign + contact + close timestamp';
  }

  return 'Unknown match strategy';
}

/**
 * Determine confidence level of the match
 */
function determineMatchConfidence(canonical: any, duplicates: any[]): 'high' | 'medium' | 'low' {
  const firstDupe = duplicates[0];
  
  // High confidence: Same Twilio SID
  if (canonical.recording && firstDupe.recording && canonical.recording === firstDupe.recording) {
    return 'high';
  }

  // Medium confidence: Agent + phone + time
  const sameAgent = canonical.agentId === firstDupe.agentId;
  const samePhone = canonical.phoneNumber === firstDupe.phoneNumber;
  const timeDiff = Math.abs(canonical.startTime.getTime() - firstDupe.startTime.getTime());
  
  if (sameAgent && samePhone && timeDiff < 10000) {
    return 'medium';
  }

  return 'low';
}

/**
 * Run deduplication automatically after each call ends
 * This is called from the endCall service
 */
export async function deduplicateRecentCall(callId: string): Promise<void> {
  try {
    console.log(`🔍 Checking for duplicates of call: ${callId}`);
    
    const callRecord = await prisma.callRecord.findUnique({
      where: { callId },
      include: {
        recordingFile: true,
        agent: true,
        contact: true
      }
    });

    if (!callRecord) {
      console.log(`   ⚠️ Call record not found: ${callId}`);
      return;
    }

    // Find potential duplicates within 10 minutes
    const duplicates = await prisma.callRecord.findMany({
      where: {
        id: { not: callRecord.id },
        startTime: {
          gte: new Date(callRecord.startTime.getTime() - 10 * 60 * 1000),
          lte: new Date(callRecord.startTime.getTime() + 10 * 60 * 1000)
        },
        endTime: { not: null },
        outcome: { not: 'consolidated-duplicate' } // Don't match already-consolidated records
      },
      include: {
        recordingFile: true
      }
    });

    if (duplicates.length === 0) {
      console.log(`   ✅ No duplicates found for ${callId}`);
      return;
    }

    // Find actual duplicates
    const actualDuplicates = duplicates.filter(dup => 
      checkIfDuplicate(callRecord, dup, 10 * 60 * 1000)
    );

    if (actualDuplicates.length === 0) {
      console.log(`   ✅ No matching duplicates found for ${callId}`);
      return;
    }

    console.log(`   🔍 Found ${actualDuplicates.length} duplicate(s) for ${callId}`);

    // Create duplicate group and consolidate
    const allRecords = [callRecord, ...actualDuplicates];
    const canonical = selectCanonicalRecord(allRecords);
    const dupes = allRecords.filter(r => r.id !== canonical.id);

    const group: CallDuplicationMatch = {
      canonicalRecord: canonical,
      duplicateRecords: dupes,
      matchReason: determineMatchReason(canonical, dupes[0]),
      confidence: determineMatchConfidence(canonical, dupes)
    };

    await consolidateDuplicateGroup(group);
    
    console.log(`   ✅ Successfully deduplicated ${callId}`);

  } catch (error) {
    console.error(`❌ Error in deduplicateRecentCall:`, error);
    // Don't throw - this is a background task
  }
}

/**
 * Get statistics about duplicates in the system
 */
export async function getDeduplicationStats(): Promise<{
  totalCalls: number;
  duplicateCalls: number;
  consolidatedCalls: number;
  callsWithRecordings: number;
}> {
  const [totalCalls, duplicateCalls, callsWithRecordings] = await Promise.all([
    prisma.callRecord.count(),
    prisma.callRecord.count({
      where: { outcome: 'consolidated-duplicate' }
    }),
    prisma.callRecord.count({
      where: {
        OR: [
          { recording: { not: null } },
          { recordingFile: { isNot: null } }
        ]
      }
    })
  ]);

  return {
    totalCalls,
    duplicateCalls,
    consolidatedCalls: duplicateCalls,
    callsWithRecordings
  };
}
