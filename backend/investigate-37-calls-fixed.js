require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigate37Calls() {
  try {
    console.log('🔍 INVESTIGATING THE 37 "ACTIVE" INTERACTIONS\n');
    console.log('=' .repeat(80));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`📅 Date range: ${today.toISOString()} to ${tomorrow.toISOString()}\n`);

    // 1. Check call_records with no outcome (what backend counts)
    console.log('\n📊 CALL RECORDS WITHOUT OUTCOME (What backend returns):');
    const pendingCount = await prisma.callRecord.count({
      where: {
        agentId: '509',
        createdAt: { gte: today, lt: tomorrow },
        OR: [
          { outcome: null },
          { outcome: '' },
          { outcome: 'pending' }
        ]
      }
    });

    console.log(`Total count from backend logic: ${pendingCount}`);

    if (pendingCount > 0) {
      const pendingCalls = await prisma.callRecord.findMany({
        where: {
          agentId: '509',
          createdAt: { gte: today, lt: tomorrow },
          OR: [
            { outcome: null },
            { outcome: '' },
            { outcome: 'pending' }
          ]
        },
        select: {
          id: true,
          callId: true,
          phoneNumber: true,
          outcome: true,
          disposition: true,
          startTime: true,
          endTime: true,
          duration: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      console.log('\n🔍 Analysis of these calls:\n');
      
      let actuallyLive = 0;
      let endedButNotDispositioned = 0;
      let neverStarted = 0;
      
      pendingCalls.forEach((call, i) => {
        const hasStartTime = !!call.startTime;
        const hasEndTime = !!call.endTime;
        const hasDuration = call.duration && call.duration > 0;
        
        let status = '';
        if (!hasStartTime) {
          status = '❌ NEVER STARTED (orphaned record)';
          neverStarted++;
        } else if (hasEndTime || hasDuration) {
          status = '⚠️  ENDED BUT NOT DISPOSITIONED';
          endedButNotDispositioned++;
        } else if (hasStartTime && !hasEndTime && !hasDuration) {
          const age = Math.round((Date.now() - new Date(call.startTime).getTime()) / 1000 / 60);
          if (age > 10) {
            status = `⚠️  STUCK (started ${age} min ago, never ended)`;
            endedButNotDispositioned++;
          } else {
            status = '🔴 POSSIBLY LIVE';
            actuallyLive++;
          }
        }
        
        if (i < 15) {
          console.log(`${i+1}. ${status}`);
          console.log(`   CallID: ${call.callId}`);
          console.log(`   Phone: ${call.phoneNumber || 'N/A'}`);
          console.log(`   Started: ${call.startTime ? new Date(call.startTime).toLocaleString() : 'NO'}`);
          console.log(`   Ended: ${call.endTime ? new Date(call.endTime).toLocaleString() : 'NO'}`);
          console.log(`   Duration: ${call.duration || 0}s`);
          console.log(`   Outcome: ${call.outcome || 'null'}`);
          console.log(`   Disposition: ${call.disposition?.id || 'N/A'}`);
          console.log(`   Created: ${new Date(call.createdAt).toLocaleString()}`);
          console.log('');
        }
      });
      
      console.log('\n📈 BREAKDOWN:');
      console.log(`   🔴 Possibly Live: ${actuallyLive}`);
      console.log(`   ⚠️  Ended but not dispositioned: ${endedButNotDispositioned}`);
      console.log(`   ❌ Never started (orphaned): ${neverStarted}`);
      console.log(`   📊 TOTAL: ${pendingCount}`);
    }

    // 2. Check today's total calls
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 TODAY\'S STATISTICS:');
    
    const totalToday = await prisma.callRecord.count({
      where: {
        agentId: '509',
        createdAt: { gte: today, lt: tomorrow }
      }
    });
    
    const withOutcome = await prisma.callRecord.count({
      where: {
        agentId: '509',
        createdAt: { gte: today, lt: tomorrow },
        AND: [
          { outcome: { not: null } },
          { outcome: { not: '' } },
          { outcome: { not: 'pending' } }
        ]
      }
    });
    
    console.log(`   Total calls today: ${totalToday}`);
    console.log(`   With outcome (dispositioned): ${withOutcome}`);
    console.log(`   Without outcome (shown as "active"): ${totalToday - withOutcome}`);

    // 3. Check if any calls have NULL start time (bad state)
    const callsWithNullStart = await prisma.callRecord.count({
      where: {
        agentId: '509',
        createdAt: { gte: today, lt: tomorrow },
        startTime: null
      }
    });
    
    console.log(`   Calls with NULL startTime: ${callsWithNullStart}`);

  } catch (error) {
    console.error('❌ Error:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

investigate37Calls();
