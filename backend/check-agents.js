require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function checkAgents() {
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    // Check agents table
    const agents = await prisma.agent.findMany();
    console.log(`📊 Total agents in database: ${agents.length}`);
    
    if (agents.length > 0) {
      console.log('\n👥 Existing agents:');
      agents.forEach((agent, index) => {
        console.log(`   ${index + 1}. ${agent.firstName} ${agent.lastName} (ID: ${agent.agentId})`);
        console.log(`      Email: ${agent.email}`);
        console.log(`      Status: ${agent.status}`);
        console.log(`      Created: ${agent.createdAt}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️  NO AGENTS FOUND - Need to create agents');
      
      // Check if we can find user records that should be agents
      const users = await prisma.user.findMany({
        where: {
          role: {
            in: ['AGENT', 'ADMIN']
          }
        }
      });
      
      console.log(`\n👤 Users that could be agents: ${users.length}`);
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.role})`);
        console.log(`      ID: ${user.id}`);
        console.log(`      Email: ${user.email}`);
      });
    }

    // Check call records without agents
    const unassignedCalls = await prisma.callRecord.count({
      where: {
        agentId: null
      }
    });
    
    console.log(`\n📞 Call records without agents: ${unassignedCalls}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAgents();