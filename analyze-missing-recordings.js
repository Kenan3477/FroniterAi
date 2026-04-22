const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeMissingRecordings() {
  console.log('\n🔍 ANALYZING MISSING RECORDINGS...\n');

  // Get all calls without recordings
  const callsWithoutRecordings = await prisma.callRecord.findMany({
    where: {
      recording: null,
      duration: { gt: 0 }
    },
    orderBy: { startTime: 'desc' },
    take: 50 // Get recent 50 for analysis
  });

  console.log(`📊 Total calls without recordings (duration > 0): ${callsWithoutRecordings.length}`);
  console.log('\n📋 SAMPLE OF RECENT CALLS WITHOUT RECORDINGS:\n');

  for (const call of callsWithoutRecordings.slice(0, 10)) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📞 Phone: ${call.phoneNumber || 'N/A'}`);
    console.log(`🆔 Call SID: ${call.callId || 'MISSING'}`);
    console.log(`⏱️  Duration: ${call.duration}s`);
    console.log(`📅 Time: ${call.startTime}`);
    console.log(`📊 Status: ${call.status || 'N/A'}`);
    console.log(`🎯 Outcome: ${call.outcome || 'N/A'}`);
    console.log(`👤 Agent: ${call.agentId || 'N/A'}`);
  }

  // Analyze patterns
  console.log('\n\n📊 PATTERN ANALYSIS:\n');

  // 1. Check calls with "client:agent-browser"
  const browserCalls = await prisma.callRecord.count({
    where: {
      recording: null,
      phoneNumber: { startsWith: 'client:agent-browser' }
    }
  });
  console.log(`🖥️  Browser test calls (client:agent-browser): ${browserCalls}`);

  // 2. Check calls without valid Call SIDs
  const callsWithoutSID = await prisma.callRecord.count({
    where: {
      recording: null,
      callId: null
    }
  });
  console.log(`❌ Calls without Call SID: ${callsWithoutSID}`);

  // 3. Check very short calls (< 5 seconds)
  const shortCalls = await prisma.callRecord.count({
    where: {
      recording: null,
      duration: { gt: 0, lt: 5 }
    }
  });
  console.log(`⚡ Very short calls (< 5s): ${shortCalls}`);

  // 4. Check calls before recording parameters were added
  const oldCalls = await prisma.callRecord.count({
    where: {
      recording: null,
      startTime: { lt: new Date('2025-01-14T17:00:00Z') } // Before recording fix
    }
  });
  console.log(`📅 Calls before recording fix deployment: ${oldCalls}`);

  // 5. Check calls with recordings
  const callsWithRecordings = await prisma.callRecord.count({
    where: {
      recording: { not: null }
    }
  });
  console.log(`✅ Calls WITH recordings: ${callsWithRecordings}`);

  // 6. Total calls
  const totalCalls = await prisma.callRecord.count();
  console.log(`📊 Total calls in database: ${totalCalls}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await prisma.$disconnect();
}

analyzeMissingRecordings().catch(console.error);
