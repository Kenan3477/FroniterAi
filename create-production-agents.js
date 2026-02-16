#!/usr/bin/env node

/**
 * Create Required Agents in Production Database
 * This script creates the agents needed for disposition saving
 */

const { PrismaClient } = require('@prisma/client');

async function createAgents() {
  const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
  });

  try {
    console.log('🔧 Creating required agents in production database...\n');

    // Create agent-browser 
    try {
      const agentBrowser = await prisma.agent.create({
        data: {
          agentId: 'agent-browser',
          firstName: 'Browser',
          lastName: 'Agent',
          email: 'browser@omnivox.ai',
          status: 'Online'
        }
      });
      console.log('✅ Created agent-browser:', agentBrowser.agentId);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('📝 agent-browser already exists');
      } else {
        console.error('❌ Error creating agent-browser:', error.message);
      }
    }

    // Create system-agent as fallback
    try {
      const systemAgent = await prisma.agent.create({
        data: {
          agentId: 'system-agent',
          firstName: 'System',
          lastName: 'Agent',
          email: 'system@omnivox.ai',
          status: 'Online'
        }
      });
      console.log('✅ Created system-agent:', systemAgent.agentId);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('📝 system-agent already exists');
      } else {
        console.error('❌ Error creating system-agent:', error.message);
      }
    }

    // Create manual-dial-list data list if needed
    try {
      const dataList = await prisma.dataList.create({
        data: {
          listId: 'manual-dial-list',
          name: 'Manual Dial List',
          active: true,
          totalContacts: 0
        }
      });
      console.log('✅ Created manual-dial-list:', dataList.listId);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('📝 manual-dial-list already exists');
      } else {
        console.error('❌ Error creating manual-dial-list:', error.message);
      }
    }

    console.log('\n🎉 Production database seeded successfully!');

    // Verify agents exist
    const agents = await prisma.agent.findMany({
      where: {
        agentId: { in: ['agent-browser', 'system-agent'] }
      }
    });
    
    console.log('\n📋 Agents available for disposition saving:');
    agents.forEach(agent => {
      console.log(`  - ${agent.agentId}: ${agent.firstName} ${agent.lastName} (${agent.status})`);
    });

  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
createAgents().catch(console.error);