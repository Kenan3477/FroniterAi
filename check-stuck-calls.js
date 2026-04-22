const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStuckCalls() {
  console.log('\n🔍 CHECKING FOR STUCK ACTIVE CALLS...\n');
  
  try {
    // Check for calls that have startTime but no endTime (active calls)
    const activeCalls = await prisma.callRecord.findMany({
      where: {
        endTime: null
      },
      orderBy: { startTime: 'desc' },
      take: 10
    });

    if (activeCalls.length === 0) {
      console.log('✅ No active calls found - system is clear\n');
      await prisma.$disconnect();
      return;
    }

    console.log(`⚠️  Found ${activeCalls.length} active calls (no endTime):\n`);

    let stuckCount = 0;
    for (const call of activeCalls) {
      if (!call.startTime) {
        console.log(`⚠️  Call ${call.callId} has no startTime (not initiated yet) - SKIP`);
        continue;
      }

      const duration = Math.floor((Date.now() - new Date(call.startTime).getTime()) / 1000);
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const seconds = duration % 60;
      
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📞 ${call.phoneNumber}`);
      console.log(`🆔 Call ID: ${call.callId}`);
      console.log(`👤 Agent: ${call.agentId || 'N/A'}`);
      console.log(`⏰ Started: ${call.startTime.toLocaleString()}`);
      console.log(`⏱️  Duration: ${hours}h ${minutes}m ${seconds}s`);
      console.log(`📊 Outcome: ${call.outcome || 'None'}`);
      
      if (hours > 2) {
        console.log(`🚨 STUCK CALL - ${hours} hours old! This WILL BLOCK new calls for this agent.`);
        stuckCount++;
      } else if (hours > 0) {
        console.log(`⚠️  Long call - ${hours} hours old`);
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (stuckCount > 0) {
      console.log(`🚨 PROBLEM: ${stuckCount} stuck call(s) will BLOCK new calls!\n`);
      console.log('💡 To fix:');
      console.log('   1. End the call in the UI (disposition modal)');
      console.log('   2. Or run: node fix-stuck-calls.js');
      console.log('   3. Or manually update database to set endTime\n');
    } else {
      console.log('✅ No stuck calls found (all < 2 hours old)\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkStuckCalls().catch(console.error);
