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
    
    // 5. Create agent record for user 509
    console.log('5. Creating agent record for user 509...');
    const agentId = 'user-509';
    
    try {
      // First, delete ALL agents with this email to avoid conflicts
      const deleteResult = await prisma.agent.deleteMany({
        where: {
          email: 'ken@simpleemails.co.uk'
        }
      });
      console.log(`🧹 Deleted ${deleteResult.count} existing agents with conflicting email`);
      
      // Now create the agent
      const agent = await prisma.agent.create({
        agentId: agentId,
        firstName: 'Ken',
        lastName: 'User',
        email: 'ken@simpleemails.co.uk',
        status: 'Available',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Agent created:', agent.agentId);
      
    } catch (agentError) {
      console.log('⚠️ Agent creation failed, trying alternative approach...');
      console.log('Agent error:', agentError.message);
      
      // Try to create without email to avoid constraint
      const agent = await prisma.agent.upsert({
        where: { agentId: agentId },
        create: {
          agentId: agentId,
          firstName: 'Ken',
          lastName: 'User',
          status: 'Available',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        update: {
          firstName: 'Ken',
          lastName: 'User',
          status: 'Available',
          updatedAt: new Date()
        }
      });
      console.log('✅ Agent created without email:', agent.agentId);
    }
    
    // 6. Get all active Omnivox campaigns and assign to user 509
    console.log('6. Assigning campaigns to user 509...');
    const campaigns = await prisma.campaign.findMany({
      where: {
        organizationId: userOrgId,
        status: 'ACTIVE'
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
    
    // 7. Create assignments for other existing agents
    console.log('7. Creating assignments for existing agents...');
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
      for (const campaign of campaigns) {
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
    console.log(`✅ Agent: ${agent.agentId}`);
    console.log(`✅ Campaigns: ${campaigns.length} assigned`);
    console.log(`✅ Total agents: ${existingAgents.length + 1}`);
    console.log('🔍 DAC campaign should now be visible in admin interface');
    console.log('📞 Agent assignment errors should be resolved');
    console.log('⚡ Quick Actions should load properly');
    console.log('🚀🚀🚀 MIGRATION COMPLETE - RESTART FRONTEND TO SEE CHANGES 🚀🚀🚀');
    
    return {
      success: true,
      organization: org,
      user: user509,
      agent: agent,
      campaigns: campaigns.length,
      totalAgents: existingAgents.length + 1
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