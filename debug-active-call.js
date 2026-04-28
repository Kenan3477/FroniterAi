#!/usr/bin/env node
/**
 * Debug Active Call Detection
 * Check what the backend sees when checking for active calls
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugActiveCallCheck(userId = 509) {
  console.log(`🔍 Debugging active call check for user ${userId}\n`);

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  
  console.log(`⏰ Time window: ${twoHoursAgo.toISOString()} to now`);
  console.log(`📋 Looking for notes containing: [USER:${userId}|`);
  console.log(`🎯 Looking for outcome: in-progress\n`);

  // Exact query that backend uses
  const activeCall = await prisma.callRecord.findFirst({
    where: {
      notes: {
        contains: `[USER:${userId}|`
      },
      outcome: 'in-progress',
      createdAt: { gte: twoHoursAgo }
    },
    select: {
      callId: true,
      phoneNumber: true,
      startTime: true,
      outcome: true,
      notes: true,
      createdAt: true
    },
    orderBy: {
      startTime: 'desc'
    }
  });

  if (activeCall) {
    console.log('❌ ACTIVE CALL FOUND (this is blocking new calls):');
    console.log(`   Call ID: ${activeCall.callId}`);
    console.log(`   Phone: ${activeCall.phoneNumber}`);
    console.log(`   Outcome: ${activeCall.outcome}`);
    console.log(`   Started: ${activeCall.startTime}`);
    console.log(`   Created: ${activeCall.createdAt}`);
    console.log(`   Notes: ${activeCall.notes}`);
    
    const ageMinutes = Math.floor((Date.now() - new Date(activeCall.startTime).getTime()) / 1000 / 60);
    console.log(`   Age: ${ageMinutes} minutes\n`);
  } else {
    console.log('✅ No active calls found - new calls should work\n');
  }

  // Now check ALL recent calls for this user
  console.log(`📊 Checking last 10 calls for user ${userId}:\n`);
  
  const recentCalls = await prisma.callRecord.findMany({
    where: {
      notes: {
        contains: `[USER:${userId}|`
      },
      createdAt: { gte: twoHoursAgo }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10,
    select: {
      callId: true,
      phoneNumber: true,
      outcome: true,
      startTime: true,
      endTime: true,
      createdAt: true,
      notes: true
    }
  });

  if (recentCalls.length === 0) {
    console.log('   No calls found in last 2 hours');
  } else {
    recentCalls.forEach((call, i) => {
      const age = Math.floor((Date.now() - new Date(call.createdAt).getTime()) / 1000 / 60);
      const status = call.outcome === 'in-progress' ? '🔴 IN-PROGRESS' : `✅ ${call.outcome}`;
      console.log(`${i + 1}. ${status}`);
      console.log(`   ID: ${call.callId}`);
      console.log(`   Phone: ${call.phoneNumber}`);
      console.log(`   Created: ${age}m ago`);
      console.log(`   Start: ${call.startTime || 'null'}`);
      console.log(`   End: ${call.endTime || 'null'}`);
      console.log(`   Notes: ${call.notes?.substring(0, 80) || 'none'}`);
      console.log('');
    });
  }

  await prisma.$disconnect();
}

const userId = parseInt(process.argv[2]) || 509;
debugActiveCallCheck(userId).catch(console.error);