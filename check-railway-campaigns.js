const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRailwayCampaigns() {
  try {
    console.log('🔍 CHECKING RAILWAY CAMPAIGNS AND RELATED DATA...\n');
    
    // Check campaigns
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' }
    });
    console.log(`📋 Campaigns (${campaigns.length}):`);
    campaigns.forEach(c => {
      console.log(`   • ${c.campaignId}: "${c.name}" - Status: ${c.status}`);
    });

    // Check for demo campaign specifically
    const demoCampaign = await prisma.campaign.findFirst({
      where: {
        OR: [
          { name: { contains: 'demo', mode: 'insensitive' } },
          { name: { contains: 'Demo Sales Campaign' } },
          { campaignId: 'DEMO-SALES-2025' }
        ]
      }
    });
    
    if (demoCampaign) {
      console.log(`\n🎯 Found demo campaign: ${demoCampaign.campaignId} - "${demoCampaign.name}"`);
      
      // Check if there are call records linked to this campaign
      const callRecords = await prisma.callRecord.findMany({
        where: { campaignId: demoCampaign.campaignId },
        include: {
          contact: { select: { firstName: true, lastName: true, phone: true } }
        }
      });
      
      console.log(`📞 Call records for demo campaign: ${callRecords.length}`);
      callRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.phoneNumber} - ${record.callId}`);
        console.log(`      Start: ${record.startTime}`);
        console.log(`      Contact: ${record.contact?.firstName} ${record.contact?.lastName}`);
      });
    }

    // Check contacts table for fake data
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { phone: '+1234567890' },
          { firstName: { contains: 'demo', mode: 'insensitive' } },
          { firstName: { contains: 'test', mode: 'insensitive' } }
        ]
      }
    });
    console.log(`\n👥 Demo/test contacts: ${contacts.length}`);
    contacts.forEach(c => {
      console.log(`   • ${c.contactId}: ${c.firstName} ${c.lastName} - ${c.phone}`);
    });

    // Check all call records to see what's actually there
    const allRecords = await prisma.callRecord.findMany({
      include: {
        contact: { select: { firstName: true, lastName: true, phone: true } },
        campaign: { select: { name: true, campaignId: true } }
      },
      orderBy: { startTime: 'desc' },
      take: 10
    });
    
    console.log(`\n📞 ALL Call Records (${allRecords.length}):`);
    allRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. Phone: ${record.phoneNumber}`);
      console.log(`      Campaign: ${record.campaign?.name || 'Unknown'}`);
      console.log(`      Call ID: ${record.callId}`);
      console.log(`      Start: ${record.startTime}`);
    });

  } catch (error) {
    console.error('❌ Error checking Railway data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRailwayCampaigns();