/**
 * Stuck Call Prevention Service
 * 
 * CRITICAL: Ensures no calls remain in "active" state indefinitely
 * Prevents customers from being dropped or experiencing phantom "active call" blocks
 * 
 * Monitors and automatically cleans:
 * 1. Calls with startTime but no endTime older than threshold
 * 2. Calls stuck in "connected" state in Twilio but not ended in DB
 * 3. Orphaned calls where Twilio has completed but DB still shows active
 * 4. Agent sessions with phantom active calls blocking new calls
 */

import { prisma } from '../lib/prisma';
import { twilioClient } from '../services/twilioService';

// Configuration
const STUCK_CALL_THRESHOLD_MINUTES = 30; // Calls older than 30 min with no endTime = stuck
const CLEANUP_INTERVAL_SECONDS = 60; // Run cleanup every 60 seconds
const TWILIO_SYNC_INTERVAL_SECONDS = 300; // Sync with Twilio every 5 minutes

let cleanupInterval: NodeJS.Timeout | null = null;
let twilioSyncInterval: NodeJS.Timeout | null = null;

/**
 * Find all stuck calls in database
 */
export async function findStuckCalls(): Promise<any[]> {
  const thresholdTime = new Date(Date.now() - STUCK_CALL_THRESHOLD_MINUTES * 60 * 1000);
  
  try {
    const stuckCalls = await prisma.callRecord.findMany({
      where: {
        startTime: { lt: thresholdTime },
        endTime: { gt: new Date() }, // endTime is in the future (default expiration)
        outcome: 'in-progress' // Only clean calls still marked as in-progress
      },
      orderBy: { startTime: 'asc' },
      take: 100 // Limit to prevent overwhelming the system
    });

    if (stuckCalls.length > 0) {
      console.log(`⚠️  Found ${stuckCalls.length} stuck calls (older than ${STUCK_CALL_THRESHOLD_MINUTES} minutes, still in-progress)`);
      
      // Log details of stuck calls
      for (const call of stuckCalls) {
        const ageMinutes = Math.floor((Date.now() - new Date(call.startTime).getTime()) / 60000);
        console.log(`   - Call ${call.callId} (Agent: ${call.agentId}, Customer: ${call.phoneNumber}) - ${ageMinutes} min old`);
      }
    }

    return stuckCalls;
  } catch (error) {
    console.error('❌ Error finding stuck calls:', error);
    return [];
  }
}

/**
 * Auto-clean stuck calls by setting endTime
 */
export async function cleanStuckCalls(): Promise<{ cleaned: number; errors: number }> {
  const thresholdTime = new Date(Date.now() - STUCK_CALL_THRESHOLD_MINUTES * 60 * 1000);
  let cleaned = 0;
  let errors = 0;

  try {
    // Calculate duration from startTime to now
    const stuckCalls = await prisma.callRecord.findMany({
      where: {
        startTime: { lt: thresholdTime },
        endTime: { gt: new Date() }, // endTime is in the future (default expiration)
        outcome: 'in-progress' // Only clean calls still marked as in-progress
      },
      select: {
        id: true,
        callId: true,
        agentId: true,
        phoneNumber: true,
        startTime: true,
        recording: true,
        notes: true // Include notes for appending
      }
    });

    if (stuckCalls.length === 0) {
      return { cleaned: 0, errors: 0 };
    }

    console.log(`🧹 Auto-cleaning ${stuckCalls.length} stuck calls...`);

    // Process each call individually for better error handling
    for (const call of stuckCalls) {
      try {
        const duration = Math.floor((Date.now() - new Date(call.startTime).getTime()) / 1000);
        
        // End the call in Twilio if possible (best effort)
        if (call.recording) {
          try {
            const twilioCall = await twilioClient.calls(call.recording).fetch();
            if (twilioCall.status === 'in-progress') {
              await twilioClient.calls(call.recording).update({ status: 'completed' });
              console.log(`   ✅ Ended Twilio call: ${call.recording}`);
            }
          } catch (twilioError) {
            // Twilio call might not exist or already ended, that's fine
            console.log(`   ℹ️  Could not end Twilio call ${call.recording} (may already be ended)`);
          }
        }

        // Update database record
        await prisma.callRecord.update({
          where: { id: call.id },
          data: {
            endTime: new Date(),
            duration: duration,
            outcome: 'system-cleanup-stuck',
            notes: call.notes 
              ? `${call.notes}\n[SYSTEM] Auto-cleaned stuck call after ${Math.floor(duration / 60)} minutes`
              : `[SYSTEM] Auto-cleaned stuck call after ${Math.floor(duration / 60)} minutes`
          }
        });

        console.log(`   ✅ Cleaned call ${call.callId} - Agent: ${call.agentId}, Duration: ${Math.floor(duration / 60)} min`);
        cleaned++;

      } catch (callError) {
        console.error(`   ❌ Error cleaning call ${call.callId}:`, callError);
        errors++;
      }
    }

    if (cleaned > 0) {
      console.log(`✅ Stuck call cleanup complete: ${cleaned} cleaned, ${errors} errors`);
    }

    return { cleaned, errors };

  } catch (error) {
    console.error('❌ Error in stuck call cleanup:', error);
    return { cleaned, errors };
  }
}

/**
 * Sync call states with Twilio to catch orphaned calls
 * (DB shows active but Twilio shows completed)
 */
export async function syncWithTwilio(): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;

  try {
    // Get all "active" calls (have startTime, endTime in future, less than 24 hours old)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const activeCalls = await prisma.callRecord.findMany({
      where: {
        startTime: { gte: oneDayAgo },
        endTime: { gt: new Date() }, // endTime in future (still "active")
        outcome: 'in-progress',
        recording: { not: null } // Must have Twilio SID to sync
      },
      select: {
        id: true,
        callId: true,
        recording: true,
        startTime: true,
        notes: true // Include notes for appending
      },
      take: 50 // Limit to prevent rate limiting
    });

    if (activeCalls.length === 0) {
      return { synced: 0, errors: 0 };
    }

    console.log(`🔄 Syncing ${activeCalls.length} active calls with Twilio...`);

    for (const call of activeCalls) {
      try {
        const twilioCall = await twilioClient.calls(call.recording!).fetch();
        
        // If Twilio shows completed but DB shows active, update DB
        if (['completed', 'busy', 'failed', 'no-answer', 'canceled'].includes(twilioCall.status)) {
          const duration = twilioCall.duration ? parseInt(twilioCall.duration) : 
                          Math.floor((Date.now() - new Date(call.startTime).getTime()) / 1000);

          await prisma.callRecord.update({
            where: { id: call.id },
            data: {
              endTime: new Date(twilioCall.endTime || Date.now()),
              duration: duration,
              outcome: twilioCall.status,
              notes: call.notes 
                ? `${call.notes}\n[SYSTEM] Synced from Twilio status: ${twilioCall.status}`
                : `[SYSTEM] Synced from Twilio status: ${twilioCall.status}`
            }
          });

          console.log(`   ✅ Synced call ${call.callId} - Twilio status: ${twilioCall.status}`);
          synced++;
        }

      } catch (twilioError: any) {
        // Call not found in Twilio = it's completed/expired
        if (twilioError.status === 404) {
          const duration = Math.floor((Date.now() - new Date(call.startTime).getTime()) / 1000);
          
          await prisma.callRecord.update({
            where: { id: call.id },
            data: {
              endTime: new Date(),
              duration: duration,
              outcome: 'completed',
              notes: call.notes 
                ? `${call.notes}\n[SYSTEM] Call not found in Twilio, marked as completed`
                : '[SYSTEM] Call not found in Twilio, marked as completed'
            }
          });

          console.log(`   ✅ Synced call ${call.callId} - Not found in Twilio (completed)`);
          synced++;
        } else {
          console.error(`   ❌ Error syncing call ${call.callId}:`, twilioError.message);
          errors++;
        }
      }
    }

    if (synced > 0) {
      console.log(`✅ Twilio sync complete: ${synced} synced, ${errors} errors`);
    }

    return { synced, errors };

  } catch (error) {
    console.error('❌ Error in Twilio sync:', error);
    return { synced, errors };
  }
}

/**
 * Start automatic stuck call monitoring and cleanup
 */
export function startStuckCallMonitoring(): void {
  if (cleanupInterval) {
    console.log('⚠️  Stuck call monitoring already running');
    return;
  }

  console.log(`🚀 Starting stuck call monitoring:`);
  console.log(`   - Cleanup interval: ${CLEANUP_INTERVAL_SECONDS}s`);
  console.log(`   - Stuck threshold: ${STUCK_CALL_THRESHOLD_MINUTES} minutes`);
  console.log(`   - Twilio sync interval: ${TWILIO_SYNC_INTERVAL_SECONDS}s`);

  // Run cleanup every 60 seconds
  cleanupInterval = setInterval(async () => {
    const result = await cleanStuckCalls();
    if (result.cleaned > 0 || result.errors > 0) {
      console.log(`📊 Cleanup cycle: ${result.cleaned} cleaned, ${result.errors} errors`);
    }
  }, CLEANUP_INTERVAL_SECONDS * 1000);

  // Run Twilio sync every 5 minutes
  twilioSyncInterval = setInterval(async () => {
    const result = await syncWithTwilio();
    if (result.synced > 0 || result.errors > 0) {
      console.log(`📊 Twilio sync cycle: ${result.synced} synced, ${result.errors} errors`);
    }
  }, TWILIO_SYNC_INTERVAL_SECONDS * 1000);

  // Run initial cleanup immediately
  setTimeout(async () => {
    console.log('🔍 Running initial stuck call cleanup...');
    await cleanStuckCalls();
    await syncWithTwilio();
  }, 5000); // Wait 5 seconds after startup

  console.log('✅ Stuck call monitoring started');
}

/**
 * Stop stuck call monitoring
 */
export function stopStuckCallMonitoring(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  
  if (twilioSyncInterval) {
    clearInterval(twilioSyncInterval);
    twilioSyncInterval = null;
  }

  console.log('🛑 Stuck call monitoring stopped');
}

/**
 * Manual cleanup for specific agent (used in agent logout/session cleanup)
 */
export async function cleanAgentStuckCalls(agentId: string): Promise<number> {
  const thresholdTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes for agent-specific cleanup
  
  try {
    const result = await prisma.callRecord.updateMany({
      where: {
        agentId: agentId,
        startTime: { lt: thresholdTime },
        endTime: null
      },
      data: {
        endTime: new Date(),
        outcome: 'agent-logout-cleanup',
        notes: '[SYSTEM] Auto-cleaned on agent logout'
      }
    });

    if (result.count > 0) {
      console.log(`🧹 Cleaned ${result.count} stuck calls for agent ${agentId}`);
    }

    return result.count;

  } catch (error) {
    console.error(`❌ Error cleaning stuck calls for agent ${agentId}:`, error);
    return 0;
  }
}

/**
 * Get monitoring status
 */
export function getMonitoringStatus(): {
  running: boolean;
  cleanupInterval: number;
  stuckThreshold: number;
  twilioSyncInterval: number;
} {
  return {
    running: cleanupInterval !== null,
    cleanupInterval: CLEANUP_INTERVAL_SECONDS,
    stuckThreshold: STUCK_CALL_THRESHOLD_MINUTES,
    twilioSyncInterval: TWILIO_SYNC_INTERVAL_SECONDS
  };
}
