const { PrismaClient } = require('@prisma/client');

async function debugCampaigns() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:RDSPassword123!@omnivox-db.chheowg26zqb.us-east-1.rds.amazonaws.com:5432/omnivox_production'
      }
    }
  });

  try {
    console.log('🔍 Checking what campaigns exist in the database...');
    
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: { in: ['Active', 'ACTIVE'] }
      },
      select: {
        id: true,
        campaignId: true,
        name: true,
        status: true,
        dialMethod: true,
        speed: true
      }
    });
    
    console.log(`📊 Found ${campaigns.length} campaigns:`);
    campaigns.forEach(campaign => {
      console.log(`  - ID: ${campaign.id} | campaignId: "${campaign.campaignId}" | name: "${campaign.name}" | status: ${campaign.status} | dialMethod: "${campaign.dialMethod}" | speed: ${campaign.speed}`);
    });
    
    // Check if specific campaignId "2" exists
    const campaign2 = await prisma.campaign.findUnique({
      where: { campaignId: "2" }
    });
    
    console.log(`\n🔍 Looking for campaignId "2":`, campaign2 ? 'FOUND' : 'NOT FOUND');
    
    if (campaign2) {
      console.log('Campaign "2" details:', campaign2);
    }

    // Check what UserCampaignAssignments exist
    const assignments = await prisma.userCampaignAssignment.findMany({
      include: {
        user: {
          select: { id: true, email: true }
        }
      }
    });
    
    console.log(`\n📋 Found ${assignments.length} user campaign assignments:`);
    assignments.forEach(assignment => {
      console.log(`  - User ${assignment.userId} (${assignment.user.email}) assigned to campaign "${assignment.campaignId}" | active: ${assignment.isActive}`);
    });

  } catch (error) {
    console.error('❌ Database query failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCampaigns();