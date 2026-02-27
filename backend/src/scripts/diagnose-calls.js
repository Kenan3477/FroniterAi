/**
 * Diagnostic script to check call recording and campaign issues
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseCalls() {
  console.log('🔍 Diagnosing recent call records...\n');

  try {
    // Get recent call records with campaign and recording info
    const recentCalls = await prisma.callRecord.findMany({
      where: {
        startTime: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      include: {
        recordings: true,
        contact: true
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 20
    });

    console.log(`📊 Found ${recentCalls.length} recent calls\n`);

    for (const call of recentCalls) {
      console.log(`📞 Call: ${call.callId}`);
      console.log(`   📅 Time: ${call.startTime}`);
      console.log(`   📱 Phone: ${call.phoneNumber}`);
      console.log(`   🎯 Campaign: ${call.campaignId}`);
      console.log(`   👤 Agent: ${call.agentId}`);
      console.log(`   📝 Disposition: ${call.disposition || 'No disposition'}`);
      console.log(`   ⏱️ Duration: ${call.duration ? `${call.duration}s` : 'No duration'}`);
      console.log(`   🎵 Recording URL: ${call.recording || 'No recording URL'}`);
      console.log(`   📼 Recording Records: ${call.recordings.length}`);
      
      if (call.recordings.length > 0) {
        call.recordings.forEach((rec, index) => {
          console.log(`      Recording ${index + 1}: ${rec.fileName} (${rec.uploadStatus})`);
        });
      }
      
      console.log(`   📇 Contact: ${call.contact ? `${call.contact.firstName} ${call.contact.lastName}` : 'No contact'}`);
      console.log('   ───────────────────────────────────────');
    }

    // Check campaigns
    console.log('\n🏷️ Available Campaigns:');
    const campaigns = await prisma.campaign.findMany({
      select: {
        campaignId: true,
        name: true,
        status: true,
        isActive: true,
        _count: {
          select: {
            callRecords: true
          }
        }
      }
    });

    campaigns.forEach(campaign => {
      console.log(`   ${campaign.campaignId}: ${campaign.name} (${campaign.status}) - ${campaign._count.callRecords} calls`);
    });

    // Check for calls with missing recordings
    console.log('\n⚠️ Calls missing recordings:');
    const callsWithoutRecordings = recentCalls.filter(call => 
      !call.recording && call.duration && call.duration > 5
    );

    console.log(`Found ${callsWithoutRecordings.length} calls without recordings that should have them:`);
    callsWithoutRecordings.forEach(call => {
      console.log(`   ${call.callId} - ${call.phoneNumber} - ${call.duration}s - Campaign: ${call.campaignId}`);
    });

    // Check for calls with wrong campaign
    console.log('\n🔄 Campaign distribution:');
    const campaignStats = {};
    recentCalls.forEach(call => {
      campaignStats[call.campaignId] = (campaignStats[call.campaignId] || 0) + 1;
    });

    Object.entries(campaignStats).forEach(([campaignId, count]) => {
      console.log(`   ${campaignId}: ${count} calls`);
    });

  } catch (error) {
    console.error('❌ Error diagnosing calls:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  diagnoseCalls();
}

module.exports = { diagnoseCalls };