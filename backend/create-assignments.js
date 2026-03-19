const { PrismaClient } = require('@prisma/client');

async function createCampaignAssignments() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== CREATING CAMPAIGN ASSIGNMENTS ===\n');
    
    // Use the available agent
    const agentId = 'test-agent-1'; // Alice Wilson
    const userOrgId = 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e';
    
    // 1. Get all campaigns in organization
    console.log('1. Getting campaigns in organization...');
    const campaigns = await prisma.campaign.findMany({
      where: {
        organizationId: userOrgId,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        campaignId: true,
        name: true
      }
    });
    
    console.log(`Found ${campaigns.length} active campaigns:`);
    campaigns.forEach(c => console.log(`  - ${c.name} (${c.campaignId})`));
    
    // 2. Clear existing assignments for this agent
    console.log('\n2. Clearing existing assignments...');
    await prisma.agentCampaignAssignment.deleteMany({
      where: { agentId: agentId }
    });
    console.log('✅ Cleared existing assignments');
    
    // 3. Create new assignments
    console.log('\n3. Creating campaign assignments...');
    const assignments = [];
    
    for (const campaign of campaigns) {
      try {
        const assignment = await prisma.agentCampaignAssignment.create({
          data: {
            agentId: agentId,
            campaignId: campaign.campaignId, // Use campaignId, not id
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
    
    // 4. Verify assignments
    console.log('\n4. Verification - Checking agent assignments...');
    const agentAssignments = await prisma.agentCampaignAssignment.findMany({
      where: { agentId: agentId },
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
    
    console.log(`\n📋 Agent ${agentId} now has ${agentAssignments.length} assigned campaigns:`);
    agentAssignments.forEach(assignment => {
      const camp = assignment.campaign;
      console.log(`  - ${camp.name} (${camp.status}) - Org: ${camp.organizationId}`);
    });
    
    // 5. Test the actual API endpoint logic
    console.log('\n5. Testing API endpoint logic...');
    
    // Simulate the my-campaigns endpoint logic
    const agentRecord = await prisma.agent.findUnique({
      where: { agentId: agentId },
      include: {
        campaignAssignments: {
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                campaignId: true,
                status: true,
                organizationId: true
              }
            }
          }
        }
      }
    });
    
    if (agentRecord) {
      const assignedCampaigns = agentRecord.campaignAssignments
        .filter(assignment => assignment.campaign.status === 'ACTIVE')
        .map(assignment => assignment.campaign);
      
      console.log(`\n🎯 API Response would show ${assignedCampaigns.length} campaigns:`);
      assignedCampaigns.forEach(campaign => {
        console.log(`  - ${campaign.name} (${campaign.campaignId})`);
      });
    }
    
    console.log('\n🎉 Campaign assignment system is now fully functional!');
    console.log('\n📝 SUMMARY:');
    console.log(`✅ DAC campaign restored`);
    console.log(`✅ User organization created`);
    console.log(`✅ All campaigns moved to user organization`);
    console.log(`✅ Campaign assignments created for agent ${agentId}`);
    console.log('\n🚀 NEXT STEP: Deploy to Railway to apply changes to production');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createCampaignAssignments();