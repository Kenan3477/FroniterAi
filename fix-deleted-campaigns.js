/**
 * Fix [DELETED] Campaigns
 * Removes the [DELETED] prefix from campaign names to restore them
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDeletedCampaigns() {
  try {
    console.log('🔍 Searching for [DELETED] campaigns...\n');
    
    const deletedCampaigns = await prisma.campaign.findMany({
      where: {
        name: {
          startsWith: '[DELETED]'
        }
      }
    });
    
    console.log(`Found ${deletedCampaigns.length} deleted campaigns:`);
    deletedCampaigns.forEach(campaign => {
      console.log(`  - ${campaign.campaignId}: ${campaign.name}`);
    });
    
    if (deletedCampaigns.length === 0) {
      console.log('\n✅ No deleted campaigns found!');
      return;
    }
    
    console.log('\n🔧 Restoring campaigns by removing [DELETED] prefix...\n');
    
    for (const campaign of deletedCampaigns) {
      const newName = campaign.name.replace('[DELETED] ', '');
      
      await prisma.campaign.update({
        where: { campaignId: campaign.campaignId },
        data: {
          name: newName,
          isActive: true,
          status: 'Active'
        }
      });
      
      console.log(`✅ Restored: ${campaign.campaignId}`);
      console.log(`   Old name: ${campaign.name}`);
      console.log(`   New name: ${newName}`);
      console.log(`   Set to Active\n`);
    }
    
    console.log('🎉 All campaigns restored successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDeletedCampaigns();
