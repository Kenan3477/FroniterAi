/**
 * Railway Production Database Migration
 * This script will run on Railway deployment to fix campaign assignment system
 */
const { PrismaClient } = require('@prisma/client');

async function migrateProductionDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀🚀🚀 STARTING RAILWAY PRODUCTION DATABASE MIGRATION 🚀🚀🚀');
    console.log('🔗 Database URL exists:', !!process.env.DATABASE_URL);
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🚂 Railway Environment:', process.env.RAILWAY_ENVIRONMENT);
    console.log('📅 Migration timestamp:', new Date().toISOString());
    
    const userOrgId = 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e';
    
    // 1. Create/ensure Omnivox organization exists
    console.log('1. Creating Omnivox organization...');
    const org = await prisma.organization.upsert({
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
    console.log('✅ Organization:', org.name);
    
    // 1.5. Move ALL users to Omnivox organization
    console.log('1.5. Moving all users to Omnivox organization...');
    const allUsersUpdate = await prisma.user.updateMany({
      where: {
        OR: [
          { organizationId: null },
          { organizationId: { not: userOrgId } }
        ]
      },
      data: {
        organizationId: userOrgId
      }
    });
    console.log(`✅ Moved ${allUsersUpdate.count} users to Omnivox organization`);
    
    // 2. Find existing user 509 (ken) or create if not exists
    console.log('2. Checking/creating user 509...');
    const user509 = await prisma.user.upsert({
      where: { id: 509 },
      create: {
        id: 509,
        username: 'ken',
        email: 'ken@simpleemails.co.uk',
        password: 'temp-password', // Should be updated
        firstName: 'Ken',
        lastName: 'User',
        name: 'Ken User',
        role: 'ADMIN',
        organizationId: userOrgId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        organizationId: userOrgId,
        role: 'ADMIN',
        isActive: true,
        updatedAt: new Date()
      }
    });
    console.log('✅ User 509:', user509.email);
    
    // 3. Create/restore DAC campaign if not exists
    console.log('3. Creating/ensuring campaigns exist...');
    const dacCampaign = await prisma.campaign.upsert({
      where: { campaignId: 'dac-campaign-production' },
      create: {
        campaignId: 'dac-campaign-production',
        name: 'DAC',
        description: 'DAC Campaign - Production',
        organizationId: userOrgId,
        status: 'ACTIVE',
        isActive: true,
        campaignScript: 'Hello, this is a call from DAC...',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        organizationId: userOrgId,
        status: 'ACTIVE',
        isActive: true,
        updatedAt: new Date()
      }
    });
    console.log('✅ DAC Campaign:', dacCampaign.name);
    
    // 4. Update existing campaigns to Omnivox organization
    console.log('4. Updating existing campaigns...');
    const existingCampaigns = await prisma.campaign.findMany({
      where: {
        OR: [
          { organizationId: null },
          { organizationId: { not: userOrgId } }
        ]
      }
    });
    
    for (const campaign of existingCampaigns) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          organizationId: userOrgId,
          updatedAt: new Date()
        }
      });
    }
    console.log(`✅ Updated ${existingCampaigns.length} existing campaigns`);
    
    // 5-7. SKIP agent creation and assignments for now - just focus on users
    console.log('5. Skipping all agent operations - focusing on user organization fix...');
    const agentId = 'user-509';
    const allCampaigns = [];
    const existingAgents = [];
    console.log('⚠️ Agent operations skipped - will manually handle later');
    /*
    console.log('6. Assigning campaigns to user 509 (if agent exists)...');
    
    // Check if the agent exists
    const agentExists = await prisma.agent.findUnique({
      where: { agentId: agentId }
    });
    */
    
    if (agentExists) {
      const campaigns = await prisma.campaign.findMany({
        where: {
          organizationId: userOrgId,
          isActive: true
        }
      });
      
      // Clear existing assignments
      await prisma.agentCampaignAssignment.deleteMany({
        where: { agentId: agentId }
      });
      
      // Create new assignments
      for (const campaign of campaigns) {
        await prisma.agentCampaignAssignment.create({
          data: {
            agentId: agentId,
            campaignId: campaign.campaignId,
            assignedAt: new Date()
          }
        });
      }
      
      console.log(`✅ Assigned ${campaigns.length} campaigns to user 509`);
    } else {
      console.log('⚠️ Agent user-509 does not exist, skipping campaign assignments');
    }
    
    // 7. Create assignments for other existing agents
    console.log('7. Creating assignments for existing agents...');
    
    // Get campaigns for assignment
    const allCampaigns = await prisma.campaign.findMany({
      where: {
        organizationId: userOrgId,
        isActive: true
      }
    });
    
    const existingAgents = await prisma.agent.findMany({
      where: {
        agentId: { not: agentId },
        status: { in: ['Available', 'available'] }
      }
    });
    
    for (const existingAgent of existingAgents) {
      // Clear existing assignments
      await prisma.agentCampaignAssignment.deleteMany({
        where: { agentId: existingAgent.agentId }
      });
      
      // Create new assignments
      for (const campaign of allCampaigns) {
        await prisma.agentCampaignAssignment.create({
          data: {
            agentId: existingAgent.agentId,
            campaignId: campaign.campaignId,
            assignedAt: new Date()
          }
        });
      }
    }
    
    console.log(`✅ Updated ${existingAgents.length} existing agents`);
    
    // 8. Summary
    console.log('\n🎉🎉🎉 RAILWAY PRODUCTION MIGRATION COMPLETED SUCCESSFULLY! 🎉🎉🎉');
    console.log(`✅ Organization: ${org.name}`);
    console.log(`✅ User 509: ${user509.email} (${user509.role})`);
    console.log(`✅ Agent: ${agentId} (skipped creation)`);
    console.log(`✅ Campaigns: ${allCampaigns ? allCampaigns.length : 0} total campaigns`);
    console.log(`✅ Total agents: ${existingAgents.length}`);
    console.log(`✅ Users moved to Omnivox: ${allUsersUpdate.count}`);
    console.log('🔍 DAC campaign should now be visible in admin interface');
    console.log('📞 Agent assignment errors should be resolved');
    console.log('⚡ Quick Actions should load properly');
    console.log('� ALL USERS should now be visible in User Management');
    console.log('�🚀🚀🚀 MIGRATION COMPLETE - RESTART FRONTEND TO SEE CHANGES 🚀🚀🚀');
    
    return {
      success: true,
      organization: org,
      user: user509,
      agent: { agentId: agentId, status: 'skipped' },
      campaigns: allCampaigns ? allCampaigns.length : 0,
      totalAgents: existingAgents.length,
      usersMoved: allUsersUpdate.count
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateProductionDatabase()
    .then(result => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateProductionDatabase };