/**
 * Check Campaigns in Database
 * Queries all campaigns to see what exists
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCampaigns() {
  console.log('\n🔍 CHECKING CAMPAIGNS IN DATABASE');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Get all campaigns
    const campaigns = await prisma.campaign.findMany({
      select: {
        campaignId: true,
        name: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            callRecords: true,
            workItems: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Found ${campaigns.length} campaigns:\n`);

    if (campaigns.length === 0) {
      console.log('❌ NO CAMPAIGNS FOUND');
      console.log('   This is strange if you created campaigns.\n');
      
      // Check if table exists but is empty
      const tableCount = await prisma.campaign.count();
      console.log(`Table exists and has ${tableCount} records\n`);
    } else {
      campaigns.forEach((campaign, idx) => {
        console.log(`Campaign #${idx + 1}:`);
        console.log(`  ID:           ${campaign.campaignId}`);
        console.log(`  Name:         ${campaign.name}`);
        console.log(`  Status:       ${campaign.status}`);
        console.log(`  Created:      ${campaign.createdAt}`);
        console.log(`  Work Items:   ${campaign._count.workItems}`);
        console.log(`  Call Records: ${campaign._count.callRecords}`);
        console.log('');
      });

      console.log('✅ Campaigns exist! We can use these for importing calls.\n');
      console.log('Default campaign to use for imported calls:');
      console.log(`  ID: ${campaigns[0].campaignId}`);
      console.log(`  Name: ${campaigns[0].name}\n`);
    }

    // Also check contacts
    const contactCount = await prisma.contact.count();
    console.log(`📇 Total contacts in database: ${contactCount}\n`);

    // Check agents
    const agentCount = await prisma.agent.count();
    console.log(`👥 Total agents in database: ${agentCount}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkCampaigns();
