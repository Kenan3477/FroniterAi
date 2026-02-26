const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

async function checkLatestCallRecords() {
  try {
    console.log('🔍 Checking latest call records with agent 509...');
    
    // Check for recent calls - last 10 minutes
    const recentCalls = await prisma.callRecord.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
        }
      },
      include: {
        contact: true,
        agent: true,
        campaign: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${recentCalls.length} recent call records:`);
    
    recentCalls.forEach((call, index) => {
      console.log(`\n${index + 1}. Call ID: ${call.callId}`);
      console.log(`   Agent: ${call.agent?.firstName} ${call.agent?.lastName} (${call.agentId})`);
      console.log(`   Phone: ${call.phoneNumber} -> ${call.dialedNumber}`);
      console.log(`   Contact: ${call.contact?.firstName} ${call.contact?.lastName}`);
      console.log(`   Campaign: ${call.campaign?.name || 'Unknown'} (${call.campaignId})`);
      console.log(`   Duration: ${call.duration || 'N/A'} seconds`);
      console.log(`   Outcome: ${call.outcome || 'N/A'}`);
      console.log(`   Created: ${call.createdAt}`);
    });

    // Check specifically for agent 509 calls
    const agent509Calls = await prisma.callRecord.findMany({
      where: {
        agentId: '509'
      },
      include: {
        contact: true,
        agent: true,
        campaign: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\n🎯 Agent 509 (Kenan) call records: ${agent509Calls.length}`);
    
    agent509Calls.forEach((call, index) => {
      console.log(`\n${index + 1}. Call ID: ${call.callId}`);
      console.log(`   Phone: ${call.phoneNumber} -> ${call.dialedNumber}`);
      console.log(`   Contact: ${call.contact?.firstName} ${call.contact?.lastName}`);
      console.log(`   Campaign: ${call.campaign?.name || 'Unknown'} (${call.campaignId})`);
      console.log(`   Duration: ${call.duration || 'N/A'} seconds`);
      console.log(`   Created: ${call.createdAt}`);
    });

  } catch (error) {
    console.error('Error checking call records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestCallRecords();