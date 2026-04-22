const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeMissingRecordings() {
  console.log('\n🔍 CRITICAL ANALYSIS: WHY NO RECORDINGS?\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Browser test calls (not real customer calls)
  const browserCalls = await prisma.callRecord.count({
    where: {
      recording: null,
      phoneNumber: { startsWith: 'client:agent-browser' }
    }
  });

  // 2. Very short calls (< 5 seconds) - likely didn't connect
  const shortCalls = await prisma.callRecord.count({
    where: {
      recording: null,
      duration: { gt: 0, lt: 5 }
    }
  });

  // 3. Zero duration calls
  const zeroDuration = await prisma.callRecord.count({
    where: {
      recording: null,
      duration: 0
    }
  });

  // 4. Today's calls without recordings (THESE ARE THE PROBLEM)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todayMissing = await prisma.callRecord.findMany({
    where: {
      recording: null,
      duration: { gt: 5 },
      phoneNumber: { not: { startsWith: 'client:' } },
      startTime: { gte: todayStart }
    },
    take: 20,
    orderBy: { startTime: 'desc' }
  });

  // 5. Total counts
  const callsWithRecordings = await prisma.callRecord.count({
    where: { recording: { not: null } }
  });
  
  const totalCalls = await prisma.callRecord.count();

  console.log('📊 BREAKDOWN OF MISSING RECORDINGS:\n');
  console.log(`🖥️  Browser test calls (client:agent-browser): ${browserCalls}`);
  console.log(`⚡ Very short calls (< 5s, likely failed):    ${shortCalls}`);
  console.log(`❌ Zero duration calls (never connected):     ${zeroDuration}`);
  console.log('\n═══════════════════════════════════════════════════════════════\n');
  console.log(`✅ Calls WITH recordings:                     ${callsWithRecordings}`);
  console.log(`📊 Total calls in database:                   ${totalCalls}`);
  console.log(`📉 Coverage rate:                              ${((callsWithRecordings/totalCalls)*100).toFixed(1)}%`);

  console.log('\n🚨 TODAY\'S REAL CALLS WITHOUT RECORDINGS (duration > 5s):\n');
  console.log(`Found: ${todayMissing.length} calls\n`);

  if (todayMissing.length > 0) {
    for (const call of todayMissing) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📞 ${call.phoneNumber}`);
      console.log(`🆔 Call SID: ${call.callId}`);
      console.log(`⏱️  Duration: ${call.duration}s`);
      console.log(`📅 ${call.startTime}`);
      console.log(`🎯 Outcome: ${call.outcome || 'None'}`);
    }
    console.log('\n⚠️  THESE CALLS SHOULD HAVE RECORDINGS BUT DON\'T!');
  } else {
    console.log('✅ All real calls from today have recordings!');
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

analyzeMissingRecordings().catch(console.error);
