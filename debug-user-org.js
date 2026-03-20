const { PrismaClient } = require('@prisma/client');

async function debugUserOrganization() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:RDSPassword123!@omnivox-db.chheowg26zqb.us-east-1.rds.amazonaws.com:5432/omnivox_production'
      }
    }
  });

  try {
    console.log('🔍 Checking user organization and campaign filtering...');
    
    // Get user 509 (Kenan) with organization details
    const user = await prisma.user.findUnique({
      where: { id: 509 }
    });
    
    if (user) {
      console.log(`👤 User 509 details:`, user);
      console.log(`🏢 Organization ID: ${user.organizationId}`);
    } else {
      console.log('❌ User 509 not found');
      return;
    }

    // Test the organization filter
    const orgFilter = { organizationId: user.organizationId };
    console.log(`🔍 Testing organization filter:`, orgFilter);
    
    // Try to find campaigns with this filter
    const campaignsWithOrgFilter = await prisma.campaign.findMany({
      where: orgFilter,
      select: {
        campaignId: true,
        name: true,
        status: true
      }
    });
    
    console.log(`📊 Campaigns found with organization filter: ${campaignsWithOrgFilter.length}`);
    campaignsWithOrgFilter.forEach(campaign => {
      console.log(`  - ${campaign.campaignId}: "${campaign.name}" (${campaign.status})`);
    });
    
    // Compare with campaigns without the filter (active campaigns)
    const allActiveCampaigns = await prisma.campaign.findMany({
      where: {
        status: { in: ['Active', 'ACTIVE'] }
      },
      select: {
        campaignId: true,
        name: true,
        status: true
      }
    });
    
    console.log(`\n📊 All active campaigns without filter: ${allActiveCampaigns.length}`);
    allActiveCampaigns.forEach(campaign => {
      console.log(`  - ${campaign.campaignId}: "${campaign.name}" (${campaign.status})`);
    });

  } catch (error) {
    console.error('❌ Query failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserOrganization();