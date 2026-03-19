const { PrismaClient } = require('@prisma/client');

async function fixCampaignAssignments() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== FIXING CAMPAIGN ASSIGNMENTS WITH CORRECT USER ===\n');
    
    // Use the admin user (ID: 1) instead of the UUID from JWT
    const correctUserId = 1; // System Administrator
    const userOrgId = 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e';
    
    // 1. Update the admin user to belong to the correct organization
    console.log('1. Updating admin user organization...');
    const updatedUser = await prisma.user.update({
      where: { id: correctUserId },
      data: {
        organizationId: userOrgId,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        organizationId: true
      }
    });
    console.log('✅ Updated user:', updatedUser);
    
    // 2. Get all campaigns in user's organization
    console.log('\n2. Getting campaigns in organization...');
    const campaigns = await prisma.campaign.findMany({
      where: {
        organizationId: userOrgId,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        campaignId: true
      }
    });
    
    console.log(`Found ${campaigns.length} active campaigns:`);
    campaigns.forEach(c => console.log(`  - ${c.name} (${c.campaignId})`));
    
    // 3. Delete any existing assignments for this user
    console.log('\n3. Clearing existing assignments...');
    await prisma.agentCampaignAssignment.deleteMany({
      where: { agentId: correctUserId.toString() }
    });
    console.log('✅ Cleared existing assignments');
    
    // 4. Create new campaign assignments
    console.log('\n4. Creating campaign assignments...');
    const assignments = [];
    
    for (const campaign of campaigns) {
      try {
        const assignment = await prisma.agentCampaignAssignment.create({
          data: {
            agentId: correctUserId.toString(),
            campaignId: campaign.id,
            assignedAt: new Date()
          }
        });
        assignments.push(assignment);
        console.log(`✅ Assigned: ${campaign.name}`);
      } catch (error) {
        console.log(`❌ Failed to assign ${campaign.name}:`, error.message);
      }
    }
    
    console.log(`\n✅ Successfully created ${assignments.length} campaign assignments`);
    
    // 5. Verify assignments
    console.log('\n5. Verification - Checking user assignments...');
    const userAssignments = await prisma.agentCampaignAssignment.findMany({
      where: { agentId: correctUserId.toString() },
      include: {
        campaign: {
          select: {
            name: true,
            status: true,
            organizationId: true
          }
        }
      }
    });
    
    console.log(`\n📋 User ${correctUserId} now has ${userAssignments.length} assigned campaigns:`);
    userAssignments.forEach(assignment => {
      const camp = assignment.campaign;
      console.log(`  - ${camp.name} (${camp.status}) - Org: ${camp.organizationId}`);
    });
    
    console.log('\n🎉 Campaign assignment system fully restored!');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Frontend needs to use correct user ID: 1 (not UUID)');
    console.log('2. JWT token needs to be regenerated with correct user ID');
    console.log('3. Railway backend needs to be redeployed to apply these changes');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCampaignAssignments();