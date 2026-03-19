const { PrismaClient } = require('@prisma/client');

async function fixCampaignSystem() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== FIXING CAMPAIGN ASSIGNMENT SYSTEM ===\n');
    
    const userId = '29da8aee-5424-41a3-96f9-3722f44fb838';
    const userOrgId = 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e';
    
    // 1. Create the missing user organization
    console.log('1. Creating missing user organization...');
    const userOrg = await prisma.organization.upsert({
      where: { id: userOrgId },
      create: {
        id: userOrgId,
        name: 'Omnivox Organization',
        displayName: 'Omnivox AI Dialer',
        description: 'Primary organization for Omnivox AI dialer system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        name: 'Omnivox Organization',
        displayName: 'Omnivox AI Dialer',
        updatedAt: new Date()
      }
    });
    console.log(`✅ Organization: ${userOrg.name} (${userOrg.id})`);
    
    // 2. Create/Restore the DAC campaign
    console.log('\n2. Creating/Restoring DAC campaign...');
    const dacCampaign = await prisma.campaign.create({
      data: {
        campaignId: 'dac-campaign-' + Date.now(),
        name: 'DAC',
        description: 'DAC Campaign - Restored',
        organizationId: userOrgId,
        status: 'ACTIVE',
        isActive: true,
        campaignScript: 'Hello, this is a call from DAC...',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log(`✅ DAC Campaign created: ${dacCampaign.id}`);
    
    // 3. Update existing campaigns to belong to user organization
    console.log('\n3. Updating existing campaigns organization...');
    
    const updatedCampaigns = await prisma.campaign.updateMany({
      where: {
        organizationId: null
      },
      data: {
        organizationId: userOrgId,
        updatedAt: new Date()
      }
    });
    console.log(`✅ Updated ${updatedCampaigns.count} existing campaigns`);
    
    // 4. Create campaign assignments for the user
    console.log('\n4. Creating campaign assignments...');
    
    // Get all campaigns now belonging to user's organization
    const allCampaigns = await prisma.campaign.findMany({
      where: {
        organizationId: userOrgId,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true
      }
    });
    
    console.log(`Found ${allCampaigns.length} campaigns to assign:`);
    allCampaigns.forEach(c => console.log(`  - ${c.name}`));
    
    // Delete existing assignments for this user
    await prisma.agentCampaignAssignment.deleteMany({
      where: { agentId: userId }
    });
    
    // Create new assignments
    const assignments = [];
    for (const campaign of allCampaigns) {
      const assignment = await prisma.agentCampaignAssignment.create({
        data: {
          agentId: userId,
          campaignId: campaign.id,
          assignedAt: new Date()
        }
      });
      assignments.push(assignment);
    }
    
    console.log(`✅ Created ${assignments.length} campaign assignments`);
    
    // 5. Verify the fix
    console.log('\n5. Verification:');
    
    const userCampaigns = await prisma.agentCampaignAssignment.findMany({
      where: { agentId: userId },
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
    
    console.log(`\n✅ User now has ${userCampaigns.length} assigned campaigns:`);
    userCampaigns.forEach(assignment => {
      const camp = assignment.campaign;
      console.log(`  - ${camp.name} (${camp.status}) - Org: ${camp.organizationId}`);
    });
    
    console.log('\n🎉 Campaign assignment system fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCampaignSystem();