// Direct Railway Database Fix Script using Prisma
// This script connects directly to Railway and runs the migration

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixRailwayDatabase() {
  try {
    console.log('🔧 Starting Railway database fix...');

    // 1. Check current state
    console.log('📊 Checking current state...');
    
    const currentOrg = await prisma.organization.findFirst({
      where: { name: 'Omnivox' }
    });
    console.log('Current Omnivox org:', currentOrg);

    const currentUser = await prisma.user.findUnique({
      where: { email: 'ken@simpleemails.co.uk' }
    });
    console.log('Current user 509:', currentUser);

    const currentCampaigns = await prisma.campaign.findMany({
      where: { organizationId: 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e' }
    });
    console.log('Current campaigns:', currentCampaigns.length);

    // 2. Create/Update Omnivox organization
    console.log('🏢 Creating/updating Omnivox organization...');
    const org = await prisma.organization.upsert({
      where: { id: 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e' },
      update: {
        name: 'Omnivox',
        updatedAt: new Date()
      },
      create: {
        id: 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e',
        name: 'Omnivox',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ Organization created/updated:', org);

    // 3. Update user 509 to be in Omnivox organization
    console.log('👤 Updating user 509...');
    const user = await prisma.user.updateMany({
      where: { 
        id: 509,
        email: 'ken@simpleemails.co.uk'
      },
      data: {
        organizationId: 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e'
      }
    });
    console.log('✅ User 509 updated:', user);

    // 4. Create campaigns
    console.log('📋 Creating campaigns...');
    
    const dacCampaign = await prisma.campaign.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655440004' },
      update: {
        name: 'DAC',
        description: 'Database Access Campaign for testing and demonstrations',
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'DAC',
        description: 'Database Access Campaign for testing and demonstrations',
        organizationId: 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ DAC campaign created:', dacCampaign);

    const supportCampaign = await prisma.campaign.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655440001' },
      update: {
        name: 'Customer Support Campaign',
        description: 'Inbound customer support and retention calls',
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Customer Support Campaign',
        description: 'Inbound customer support and retention calls',
        organizationId: 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ Support campaign created:', supportCampaign);

    const salesCampaign = await prisma.campaign.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655440002' },
      update: {
        name: 'Sales Outreach Campaign',
        description: 'Outbound sales and lead qualification calls',
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Sales Outreach Campaign',
        description: 'Outbound sales and lead qualification calls',
        organizationId: 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ Sales campaign created:', salesCampaign);

    // 5. Create agent entry
    console.log('🎧 Creating agent entry...');
    const agent = await prisma.agent.upsert({
      where: { id: 'user-509' },
      update: {
        extensionNumber: '1001',
        status: 'Available',
        organizationId: 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e',
        updatedAt: new Date()
      },
      create: {
        id: 'user-509',
        userId: 509,
        extensionNumber: '1001',
        status: 'Available',
        organizationId: 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ Agent created:', agent);

    // 6. Create campaign assignments
    console.log('📝 Creating campaign assignments...');
    
    // Delete existing assignments first to avoid conflicts
    await prisma.agentCampaignAssignment.deleteMany({
      where: { agentId: 'user-509' }
    });

    const assignments = await prisma.agentCampaignAssignment.createMany({
      data: [
        {
          agentId: 'user-509',
          campaignId: '550e8400-e29b-41d4-a716-446655440001',
          assignedAt: new Date()
        },
        {
          agentId: 'user-509',
          campaignId: '550e8400-e29b-41d4-a716-446655440002',
          assignedAt: new Date()
        },
        {
          agentId: 'user-509',
          campaignId: '550e8400-e29b-41d4-a716-446655440004',
          assignedAt: new Date()
        }
      ],
      skipDuplicates: true
    });
    console.log('✅ Campaign assignments created:', assignments);

    // 7. Verification
    console.log('🔍 Verifying fix...');
    
    const verifyUser = await prisma.user.findFirst({
      where: { id: 509 },
      include: { organization: true }
    });
    console.log('User verification:', {
      id: verifyUser?.id,
      email: verifyUser?.email,
      organizationId: verifyUser?.organizationId,
      organizationName: verifyUser?.organization?.name
    });

    const verifyCampaigns = await prisma.campaign.findMany({
      where: { organizationId: 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e' }
    });
    console.log('Campaigns verification:', verifyCampaigns.map(c => ({ id: c.id, name: c.name })));

    const verifyAssignments = await prisma.agentCampaignAssignment.findMany({
      where: { agentId: 'user-509' },
      include: { campaign: true }
    });
    console.log('Assignments verification:', verifyAssignments.map(a => ({ 
      campaignId: a.campaignId, 
      campaignName: a.campaign.name 
    })));

    console.log('🎉 Railway database fix completed successfully!');
    
    return {
      success: true,
      organization: org,
      campaigns: verifyCampaigns,
      assignments: verifyAssignments.length,
      user: verifyUser
    };

  } catch (error) {
    console.error('❌ Error fixing Railway database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixRailwayDatabase()
    .then(result => {
      console.log('✅ Fix completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixRailwayDatabase };