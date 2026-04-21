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

    // 1. Check call_records with no outcome (what the UI counts as "active")
    console.log('\n📊 CALL RECORDS WITHOUT OUTCOME (What UI shows as "active"):');
    const pendingCallRecords = await prisma.callRecord.findMany({
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
        status: true,
        startTime: true,
        endTime: true,
        duration: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Total: ${pendingCallRecords.length}`);
    
    if (pendingCallRecords.length > 0) {
      console.log('\n🔍 Checking if these are ACTUALLY live calls...\n');
      
      let actuallyLive = 0;
      let endedButNotDispositioned = 0;
      let neverStarted = 0;
      
      pendingCallRecords.forEach((call, i) => {
        const hasStartTime = !!call.startTime;
        const hasEndTime = !!call.endTime;
        const hasDuration = call.duration && call.duration > 0;
        
        let status = '';
        if (!hasStartTime && !hasEndTime) {
          status = '❌ NEVER STARTED';
          neverStarted++;
        } else if (hasEndTime || hasDuration) {
          status = '⚠️  ENDED BUT NOT DISPOSITIONED';
          endedButNotDispositioned++;
        } else if (hasStartTime && !hasEndTime) {
          status = '🔴 POSSIBLY LIVE';
          actuallyLive++;
        }
        
        if (i < 10) {  // Show first 10
          console.log(`${i+1}. ${status}`);
          console.log(`   CallID: ${call.callId || 'N/A'}`);
          console.log(`   Phone: ${call.phoneNumber || 'N/A'}`);
          console.log(`   Started: ${call.startTime ? new Date(call.startTime).toLocaleString() : 'NO'}`);
          console.log(`   Ended: ${call.endTime ? new Date(call.endTime).toLocaleString() : 'NO'}`);
          console.log(`   Duration: ${call.duration || 0}s`);
          console.log(`   Status: ${call.status || 'N/A'}`);
          console.log(`   Created: ${new Date(call.createdAt).toLocaleString()}`);
          console.log('');
        }
      });
      
      console.log('\n📈 BREAKDOWN:');
      console.log(`   🔴 Possibly Live: ${actuallyLive}`);
      console.log(`   ⚠️  Ended but not dispositioned: ${endedButNotDispositioned}`);
      console.log(`   ❌ Never started (orphaned): ${neverStarted}`);
    }

    // 2. Check for calls with status 'in-progress' or 'ringing'
    console.log('\n\n' + '='.repeat(80));
    console.log('📞 CHECKING FOR CALLS WITH ACTIVE STATUS:');
    
    const activeStatusCalls = await prisma.callRecord.count({
      where: {
        agentId: '509',
        status: {
          in: ['in-progress', 'ringing', 'queued', 'initiated']
        }
      }
    });
    
    console.log(`Calls with active status: ${activeStatusCalls}`);
    
    if (activeStatusCalls > 0) {
      const activeCalls = await prisma.callRecord.findMany({
        where: {
          agentId: '509',
          status: {
            in: ['in-progress', 'ringing', 'queued', 'initiated']
          }
        },
        select: {
          id: true,
          callId: true,
          phoneNumber: true,
          status: true,
          startTime: true,
          endTime: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      
      console.log('\n🔴 ACTIVE STATUS CALLS:');
      activeCalls.forEach((call, i) => {
        console.log(`\n${i+1}. Status: ${call.status}`);
        console.log(`   CallID: ${call.callId}`);
        console.log(`   Phone: ${call.phoneNumber}`);
        console.log(`   Created: ${new Date(call.createdAt).toLocaleString()}`);
        console.log(`   Age: ${Math.round((Date.now() - new Date(call.createdAt).getTime()) / 1000 / 60)} minutes`);
      });
    }

    // 3. Check today's total calls
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 TODAY\'S TOTAL CALLS:');
    
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
          { outcome: { not: '' } }
        ]
      }
    });
    
    console.log(`Total calls today: ${totalToday}`);
    console.log(`With outcome: ${withOutcome}`);
    console.log(`Without outcome: ${totalToday - withOutcome}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigate37Calls();
