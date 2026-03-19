const { PrismaClient } = require('@prisma/client');

async function checkOrganizationData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== ORGANIZATION ANALYSIS ===');
    
    // Check all campaigns with their organization info
    const campaigns = await prisma.campaign.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        organizationId: true
      }
    });
    
    console.log('\nAll campaigns with organization info:');
    campaigns.forEach(campaign => {
      console.log(`- ${campaign.name}: orgId=${campaign.organizationId || 'NULL'}`);
    });
    
    // Check organizations table
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true
      }
    });
    
    console.log('\nAll organizations:');
    orgs.forEach(org => {
      console.log(`- ${org.name}: ${org.id}`);
    });
    
    // Check the specific organization from the JWT token
    const userOrgId = 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e';
    console.log(`\nChecking user organization: ${userOrgId}`);
    
    const userOrg = await prisma.organization.findUnique({
      where: { id: userOrgId },
      include: {
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });
    
    console.log('\nUser organization details (from JWT):');
    if (userOrg) {
      console.log(`Organization: ${userOrg.name} (${userOrg.id})`);
      console.log(`Campaigns: ${userOrg.campaigns.length}`);
      userOrg.campaigns.forEach(campaign => {
        console.log(`  - ${campaign.name} (${campaign.status})`);
      });
    } else {
      console.log('User organization not found in database!');
    }
    
    // Check user assignments
    const userAgents = await prisma.agentCampaignAssignment.findMany({
      where: {
        agentId: '29da8aee-5424-41a3-96f9-3722f44fb838' // User ID from JWT
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
            organizationId: true
          }
        }
      }
    });
    
    console.log('\nUser campaign assignments:');
    if (userAgents.length > 0) {
      userAgents.forEach(assignment => {
        console.log(`  - ${assignment.campaign.name} (${assignment.campaign.status})`);
        console.log(`    Campaign OrgId: ${assignment.campaign.organizationId || 'NULL'}`);
      });
    } else {
      console.log('No campaign assignments found for user!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrganizationData();