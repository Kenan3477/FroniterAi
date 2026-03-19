const { PrismaClient } = require('@prisma/client');

async function checkCampaigns() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking campaigns in database...');
    
    const campaigns = await prisma.campaign.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        isActive: true,
        organizationId: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log(`\nFound ${campaigns.length} campaigns:`);
    campaigns.forEach((campaign, index) => {
      console.log(`${index + 1}. ${campaign.name} (ID: ${campaign.id})`);
      console.log(`   Status: ${campaign.status}, Active: ${campaign.isActive}`);
      console.log(`   Organization: ${campaign.organizationId}`);
      console.log('');
    });
    
    // Also check for any campaigns that might have name like 'DAC'
    const dacCampaigns = await prisma.campaign.findMany({
      where: {
        name: {
          contains: 'DAC',
          mode: 'insensitive'
        }
      }
    });
    
    if (dacCampaigns.length > 0) {
      console.log('\nDAC Campaigns found:');
      dacCampaigns.forEach(campaign => {
        console.log(`- ${campaign.name} (${campaign.status}, Active: ${campaign.isActive})`);
      });
    } else {
      console.log('\nNo DAC campaigns found in database');
    }
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCampaigns();