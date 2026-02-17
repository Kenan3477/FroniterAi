const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function queryRailwayDatabase() {
  try {
    console.log('🔍 CHECKING RAILWAY DATABASE CONTENTS...\n');
    
    // Check what campaigns exist
    const campaigns = await prisma.campaign.findMany({
      select: { campaignId: true, name: true }
    });
    console.log(`📋 Campaigns (${campaigns.length}):`);
    campaigns.forEach(c => console.log(`   • ${c.campaignId}: ${c.name}`));
    
    // Check call records with campaign details
    const callRecords = await prisma.callRecord.findMany({
      include: {
        campaign: { select: { campaignId: true, name: true } },
        contact: { select: { firstName: true, lastName: true, phone: true } }
      },
      orderBy: { startTime: 'desc' }
    });
    
    console.log(`\n📞 Call Records (${callRecords.length}):`);
    callRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. Phone: ${record.phoneNumber}`);
      console.log(`      Campaign: ${record.campaign?.name} (ID: ${record.campaign?.campaignId})`);
      console.log(`      Contact: ${record.contact?.firstName} ${record.contact?.lastName}`);
      console.log(`      Call ID: ${record.callId}`);
      console.log(`      Time: ${record.startTime}`);
      console.log(`      Outcome: ${record.outcome}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

queryRailwayDatabase();