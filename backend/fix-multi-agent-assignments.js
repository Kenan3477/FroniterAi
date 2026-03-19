const { PrismaClient } = require('@prisma/client');

async function fixMultiAgentAssignments() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== FIXING MULTI-AGENT CAMPAIGN ASSIGNMENTS ===\n');
    
    const userOrgId = 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e';
    
    // 1. Get all Omnivox campaigns
    console.log('1. Getting Omnivox campaigns...');
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
    
    console.log(`Found ${campaigns.length} Omnivox campaigns:`);
    campaigns.forEach(c => console.log(`  - ${c.name} (${c.campaignId})`));
    
    // 2. Get all active agents that should have access to Omnivox campaigns
    console.log('\n2. Getting available agents...');
    const activeAgents = await prisma.agent.findMany({
      where: {
        OR: [
          { status: 'available' },
          { status: 'Available' },
          { agentId: { in: ['test-agent-1', 'test-agent-2'] } } // Ensure our main agents
        ]
      },
      select: {
        id: true,
        agentId: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true
      }
    });
    
    console.log(`Found ${activeAgents.length} active agents:`);
    activeAgents.forEach(agent => {
      console.log(`  - ${agent.agentId}: ${agent.firstName} ${agent.lastName} (${agent.status})`);
    });
    
    // 3. Clear all existing Omnivox campaign assignments
    console.log('\n3. Clearing existing Omnivox assignments...');
    const deletedAssignments = await prisma.agentCampaignAssignment.deleteMany({
      where: {
        campaignId: {
          in: campaigns.map(c => c.campaignId)
        }
      }
    });
    console.log(`✅ Cleared ${deletedAssignments.count} existing assignments`);
    
    // 4. Create assignments for all active agents to all Omnivox campaigns
    console.log('\n4. Creating comprehensive assignments...');
    let totalAssignments = 0;
    
    for (const agent of activeAgents) {
      console.log(`\n   Assigning campaigns to ${agent.agentId} (${agent.firstName} ${agent.lastName}):`);
      
      for (const campaign of campaigns) {
        try {
          await prisma.agentCampaignAssignment.create({
            data: {
              agentId: agent.agentId,
              campaignId: campaign.campaignId,
              assignedAt: new Date()
            }
          });
          console.log(`     ✅ ${campaign.name}`);
          totalAssignments++;
        } catch (error) {
          console.log(`     ❌ Failed: ${campaign.name} - ${error.message}`);
        }
      }
    }
    
    console.log(`\n✅ Created ${totalAssignments} total campaign assignments`);
    console.log(`📊 ${activeAgents.length} agents × ${campaigns.length} campaigns = ${activeAgents.length * campaigns.length} expected assignments`);
    
    // 5. Verification - Check final state
    console.log('\n5. Verification - Final assignment status:');
    
    const finalCheck = await prisma.agent.findMany({
      where: {
        agentId: { in: activeAgents.map(a => a.agentId) }
      },
      include: {
        campaignAssignments: {
          include: {
            campaign: {
              select: {
                name: true,
                organizationId: true
              }
            }
          }
        }
      }
    });
    
    finalCheck.forEach(agent => {
      const omnivoxAssignments = agent.campaignAssignments.filter(
        a => a.campaign.organizationId === userOrgId
      );
      console.log(`\n   📋 ${agent.agentId} (${agent.firstName} ${agent.lastName}):`);
      console.log(`      Omnivox campaigns: ${omnivoxAssignments.length}/${campaigns.length}`);
      omnivoxAssignments.forEach(assignment => {
        console.log(`      • ${assignment.campaign.name}`);
      });
    });
    
    console.log('\n🎉 Multi-agent campaign assignment system completed!');
    console.log('\n📝 NEXT: Deploy to Railway to apply changes to production');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMultiAgentAssignments();