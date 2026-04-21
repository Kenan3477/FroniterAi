const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPendingInteractions() {
  try {
    console.log('🔍 Checking pending interactions for agent 509...\n');

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`📅 Date range: ${today.toISOString()} to ${tomorrow.toISOString()}\n`);

    // Get pending call records
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
        callType: true,
        campaignId: true,
        createdAt: true,
        startTime: true,
        endTime: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Total pending interactions: ${pendingCalls.length}\n`);

    if (pendingCalls.length > 0) {
      console.log('📋 Sample of pending interactions:\n');
      pendingCalls.slice(0, 10).forEach((call, index) => {
        console.log(`${index + 1}. ID: ${call.id}`);
        console.log(`   Phone: ${call.phoneNumber || 'N/A'}`);
        console.log(`   Campaign: ${call.campaignId || 'N/A'}`);
        console.log(`   Call Type: ${call.callType || 'N/A'}`);
        console.log(`   Outcome: ${call.outcome || 'null'}`);
        console.log(`   Disposition: ${call.disposition || 'N/A'}`);
        console.log(`   Created: ${call.createdAt}`);
        console.log(`   Start: ${call.startTime || 'N/A'}`);
        console.log(`   End: ${call.endTime || 'N/A'}`);
        console.log('');
      });

      // Get breakdown by call type
      const byType = {};
      pendingCalls.forEach(call => {
        const type = call.callType || 'unknown';
        byType[type] = (byType[type] || 0) + 1;
      });

      console.log('📊 Breakdown by call type:');
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPendingInteractions();
