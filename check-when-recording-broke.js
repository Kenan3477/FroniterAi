const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeRecordingHistory() {
  console.log('\n🔍 ANALYZING RECORDING HISTORY - When Did It Break?\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get calls with recordings, grouped by date
  const callsWithRecordings = await prisma.callRecord.findMany({
    where: {
      recording: { not: null },
      phoneNumber: { not: { startsWith: 'client:' } }
    },
    orderBy: { startTime: 'desc' },
    select: {
      startTime: true,
      phoneNumber: true,
      recording: true,
      duration: true
    }
  });

  // Get calls without recordings (real calls only)
  const callsWithoutRecordings = await prisma.callRecord.findMany({
    where: {
      recording: null,
      duration: { gt: 5 },
      phoneNumber: { not: { startsWith: 'client:' } }
    },
    orderBy: { startTime: 'desc' },
    take: 50,
    select: {
      startTime: true,
      phoneNumber: true,
      duration: true
    }
  });

  console.log('📊 TIMELINE ANALYSIS:\n');
  
  if (callsWithRecordings.length > 0) {
    const mostRecent = callsWithRecordings[0];
    const oldest = callsWithRecordings[callsWithRecordings.length - 1];
    
    console.log('✅ LAST SUCCESSFUL RECORDING:');
    console.log(`   📅 ${mostRecent.startTime.toLocaleString()}`);
    console.log(`   📞 ${mostRecent.phoneNumber}`);
    console.log(`   🎙️  ${mostRecent.recording}`);
    console.log(`   ⏱️  ${mostRecent.duration}s\n`);
    
    console.log('📅 RECORDING DATE RANGE:');
    console.log(`   First: ${oldest.startTime.toLocaleDateString()}`);
    console.log(`   Last:  ${mostRecent.startTime.toLocaleDateString()}\n`);
  }

  if (callsWithoutRecordings.length > 0) {
    const firstMissing = callsWithoutRecordings[callsWithoutRecordings.length - 1];
    const latestMissing = callsWithoutRecordings[0];
    
    console.log('❌ FIRST CALL WITHOUT RECORDING:');
    console.log(`   📅 ${firstMissing.startTime.toLocaleString()}`);
    console.log(`   📞 ${firstMissing.phoneNumber}`);
    console.log(`   ⏱️  ${firstMissing.duration}s\n`);
    
    console.log('❌ LATEST CALL WITHOUT RECORDING:');
    console.log(`   📅 ${latestMissing.startTime.toLocaleString()}`);
    console.log(`   📞 ${latestMissing.phoneNumber}`);
    console.log(`   ⏱️  ${latestMissing.duration}s\n`);
  }

  // Group by date to see pattern
  const recordingsByDate = {};
  const missingByDate = {};

  callsWithRecordings.forEach(call => {
    const date = call.startTime.toLocaleDateString();
    recordingsByDate[date] = (recordingsByDate[date] || 0) + 1;
  });

  callsWithoutRecordings.forEach(call => {
    const date = call.startTime.toLocaleDateString();
    missingByDate[date] = (missingByDate[date] || 0) + 1;
  });

  console.log('📊 RECORDINGS BY DATE:\n');
  const allDates = [...new Set([...Object.keys(recordingsByDate), ...Object.keys(missingByDate)])].sort();
  
  for (const date of allDates) {
    const withRec = recordingsByDate[date] || 0;
    const withoutRec = missingByDate[date] || 0;
    const total = withRec + withoutRec;
    const percentage = total > 0 ? ((withRec / total) * 100).toFixed(1) : 0;
    
    console.log(`${date}:`);
    console.log(`  ✅ With recording:    ${withRec}`);
    console.log(`  ❌ Without recording: ${withoutRec}`);
    console.log(`  📈 Coverage:          ${percentage}%\n`);
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

analyzeRecordingHistory().catch(console.error);
