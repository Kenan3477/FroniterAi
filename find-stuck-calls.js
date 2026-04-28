#!/usr/bin/env node
/**
 * Find and Clean Stuck "In-Progress" Call Records
 * This script identifies calls that are marked as 'in-progress' but are actually completed
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findStuckCalls() {
  console.log('🔍 Searching for stuck in-progress calls...\n');

  // Find all calls marked as in-progress
  const inProgressCalls = await prisma.callRecord.findMany({
    where: {
      outcome: 'in-progress'
    },
    orderBy: {
      startTime: 'desc'
    },
    take: 50 // Limit to most recent 50
  });

  console.log(`📊 Found ${inProgressCalls.length} calls marked as 'in-progress'\n`);

  if (inProgressCalls.length === 0) {
    console.log('✅ No stuck calls found!');
    return;
  }

  const now = new Date();
  const stuckCalls = [];

  for (const call of inProgressCalls) {
    const startTime = new Date(call.startTime);
    const ageMinutes = Math.floor((now - startTime) / 1000 / 60);
    const ageHours = Math.floor(ageMinutes / 60);
    
    // Calls older than 10 minutes are likely stuck
    const isStuck = ageMinutes > 10;
    
    console.log(`${isStuck ? '❌' : '✅'} Call ID: ${call.callId}`);
    console.log(`   Phone: ${call.phoneNumber}`);
    console.log(`   Agent: ${call.agentId || 'null'}`);
    console.log(`   Started: ${startTime.toISOString()}`);
    console.log(`   Age: ${ageHours}h ${ageMinutes % 60}m`);
    console.log(`   Notes: ${call.notes?.substring(0, 100) || 'none'}`);
    console.log('');

    if (isStuck) {
      stuckCalls.push({
        ...call,
        ageMinutes
      });
    }
  }

  if (stuckCalls.length > 0) {
    console.log(`\n🚨 Found ${stuckCalls.length} STUCK calls that need cleanup!\n`);
    console.log('To clean these up, run: node clean-stuck-calls.js\n');
  } else {
    console.log('✅ All in-progress calls are recent (< 10 minutes old)');
  }

  return stuckCalls;
}

async function cleanStuckCalls(dryRun = true) {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  console.log(`\n${'='.repeat(60)}`);
  console.log(dryRun ? '🔍 DRY RUN - No changes will be made' : '🚨 CLEANING STUCK CALLS');
  console.log(`${'='.repeat(60)}\n`);

  // Find all stuck calls (in-progress for more than 10 minutes)
  const stuckCalls = await prisma.callRecord.findMany({
    where: {
      outcome: 'in-progress',
      startTime: {
        lt: tenMinutesAgo
      }
    }
  });

  console.log(`Found ${stuckCalls.length} stuck calls to clean up\n`);

  if (stuckCalls.length === 0) {
    console.log('✅ No stuck calls to clean!');
    return;
  }

  let cleanedCount = 0;

  for (const call of stuckCalls) {
    const startTime = new Date(call.startTime);
    const ageMinutes = Math.floor((Date.now() - startTime.getTime()) / 1000 / 60);

    console.log(`${dryRun ? '📋' : '🧹'} ${call.callId} - ${call.phoneNumber} (${ageMinutes}m old)`);

    if (!dryRun) {
      try {
        await prisma.callRecord.update({
          where: { callId: call.callId },
          data: {
            outcome: 'no-answer', // Mark as no-answer since we don't know what happened
            endTime: new Date(),
            duration: Math.floor((Date.now() - startTime.getTime()) / 1000),
            notes: (call.notes || '') + ' [SYSTEM-CLEANUP: Stuck call auto-ended after timeout]'
          }
        });
        cleanedCount++;
        console.log(`   ✅ Cleaned`);
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }

  if (!dryRun) {
    console.log(`\n✅ Cleaned ${cleanedCount} of ${stuckCalls.length} stuck calls`);
  } else {
    console.log(`\n💡 Run with --force flag to actually clean these calls`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isForce = args.includes('--force');

  console.log('🔧 Stuck Call Cleanup Utility\n');

  // First, show what we found
  await findStuckCalls();

  // Then clean if --force flag is provided
  if (isForce) {
    console.log('\n⚠️  FORCE flag detected - will clean stuck calls in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    await cleanStuckCalls(false);
  } else {
    console.log('\n💡 To clean stuck calls, run: node find-stuck-calls.js --force');
  }

  await prisma.$disconnect();
}

main().catch(console.error);