const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCampaigns() {
  const campaigns = await prisma.campaign.findMany({
    select: { campaignId: true, name: true }
  });
  
  console.log('📋 Existing Campaigns:');
  campaigns.forEach(c => {
    console.log(`  - ${c.campaignId}: ${c.name}`);
  });
  
  await prisma.$disconnect();
}

checkCampaigns();
