const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCampaigns() {
  try {
    // Check DAC campaign
    const dac = await prisma.campaign.findUnique({
      where: { campaignId: 'DAC' }
    });
    
    console.log('\n=== DAC Campaign ===');
    console.log(dac ? JSON.stringify(dac, null, 2) : 'NOT FOUND');
    
    // Check Manual Dialing campaign
    const manual = await prisma.campaign.findUnique({
      where: { campaignId: 'Manual Dialing' }
    });
    
    console.log('\n=== Manual Dialing Campaign ===');
    console.log(manual ? JSON.stringify(manual, null, 2) : 'NOT FOUND');
    
    // Check recent call records
    const recentCalls = await prisma.callRecord.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: true,
        contact: true
      }
    });
    
    console.log('\n=== Recent Call Records ===');
    recentCalls.forEach(call => {
      console.log(`\nCall ID: ${call.callId}`);
      console.log(`  Phone: ${call.phoneNumber}`);
      console.log(`  Campaign ID: ${call.campaignId}`);
      console.log(`  Campaign Name: ${call.campaign?.name || 'NULL'}`);
      console.log(`  Contact ID: ${call.contactId}`);
      console.log(`  Contact Name: ${call.contact ? `${call.contact.firstName} ${call.contact.lastName}` : 'NULL'}`);
      console.log(`  Recording: ${call.recording || 'NULL'}`);
      console.log(`  Outcome: ${call.outcome}`);
      console.log(`  Duration: ${call.duration || 0}s`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCampaigns();
