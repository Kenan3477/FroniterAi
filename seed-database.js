#!/usr/bin/env node

/**
 * Seed Database for Local Development
 * Creates the minimum required entities for disposition saving
 */

const { PrismaClient } = require('@prisma/client');

async function seedDatabase() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || 'file:./frontend/prisma/dev.db'
  });

  try {
    console.log('🌱 Seeding database with required entities...\n');

    // Create Contact List first (required for contacts)
    let contactList = null;
    try {
      contactList = await prisma.dataList.create({
        data: {
          listId: 'manual-dial-list',
          name: 'Manual Dial List',
          active: true,
          totalContacts: 0
        }
      });
      console.log('✅ Created contact list:', contactList.listId);
    } catch (listError) {
      console.log('📝 Contact list already exists or error:', listError.message);
      // Try to find existing
      contactList = await prisma.dataList.findFirst({
        where: { listId: 'manual-dial-list' }
      });
    }

    // Create Campaign (required for interactions)
    let campaign = null;
    try {
      campaign = await prisma.campaign.create({
        data: {
          campaignId: 'manual-dial',
          name: 'Manual Dial Campaign',
          description: 'Default campaign for manual dialing',
          status: 'Active',
          dialMethod: 'Manual'
        }
      });
      console.log('✅ Created campaign:', campaign.campaignId);
    } catch (campaignError) {
      console.log('📝 Campaign already exists or error:', campaignError.message);
      // Try to find existing
      campaign = await prisma.campaign.findFirst({
        where: { campaignId: 'manual-dial' }
      });
    }

    // Create Agent (required for interactions)
    let agent = null;
    try {
      agent = await prisma.agent.create({
        data: {
          agentId: 'agent-browser',
          firstName: 'Browser',
          lastName: 'Agent',
          email: 'browser@omnivox.ai',
          status: 'Online'
        }
      });
      console.log('✅ Created agent:', agent.agentId);
    } catch (agentError) {
      console.log('📝 Agent already exists or error:', agentError.message);
      // Try to find existing
      agent = await prisma.agent.findFirst({
        where: { agentId: 'agent-browser' }
      });
    }

    // Create system agent as fallback
    let systemAgent = null;
    try {
      systemAgent = await prisma.agent.create({
        data: {
          agentId: 'system-agent',
          firstName: 'System',
          lastName: 'Agent',
          email: 'system@omnivox.ai',
          status: 'Online'
        }
      });
      console.log('✅ Created system agent:', systemAgent.agentId);
    } catch (systemAgentError) {
      console.log('📝 System agent already exists or error:', systemAgentError.message);
    }

    console.log('\n🎉 Database seeded successfully!');
    console.log('\nAvailable entities:');
    console.log('- Contact List:', contactList?.listId || 'manual-dial-list');
    console.log('- Campaign:', campaign?.campaignId || 'manual-dial');
    console.log('- Agent:', agent?.agentId || 'agent-browser');
    console.log('- System Agent:', systemAgent?.agentId || 'system-agent');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedDatabase().catch(console.error);