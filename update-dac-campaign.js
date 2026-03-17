/**
 * Update DAC campaign to MANUAL_PREVIEW dial method
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:AqDDOtBRNZvHqtAakmSkbgMlDOtQSGcS@roundhouse.proxy.rlwy.net:38238/railway'
});

async function updateDACCampaign() {
  try {
    console.log('🔍 Finding DAC campaign...');
    
    // Find DAC campaign
    const dacCampaign = await prisma.campaign.findFirst({
      where: {
        name: {
          contains: 'DAC',
          mode: 'insensitive'
        }
      }
    });
    
    if (!dacCampaign) {
      console.log('❌ DAC campaign not found');
      console.log('📋 Available campaigns:');
      const allCampaigns = await prisma.campaign.findMany({
        select: {
          campaignId: true,
          name: true,
          dialMethod: true,
          status: true
        }
      });
      allCampaigns.forEach(campaign => {
        console.log(`  - ${campaign.name} (${campaign.campaignId}): ${campaign.dialMethod} - ${campaign.status}`);
      });
      return;
    }
    
    console.log('🎯 Found DAC campaign:', {
      id: dacCampaign.campaignId,
      name: dacCampaign.name,
      currentDialMethod: dacCampaign.dialMethod,
      status: dacCampaign.status
    });
    
    // Update to MANUAL_PREVIEW
    console.log('🔄 Updating dial method to MANUAL_PREVIEW...');
    const updated = await prisma.campaign.update({
      where: {
        id: dacCampaign.id
      },
      data: {
        dialMethod: 'MANUAL_PREVIEW'
      }
    });
    
    console.log('✅ Successfully updated DAC campaign:', {
      id: updated.campaignId,
      name: updated.name,
      dialMethod: updated.dialMethod,
      status: updated.status
    });
    
  } catch (error) {
    console.error('❌ Error updating DAC campaign:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateDACCampaign();