const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

async function checkAgents() {
  try {
    console.log('👨‍💼 Checking agents in database...');
    
    // Check agents table
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        agentId: true,
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        role: true
      }
    });
    
    console.log(`📊 Total agents found: ${agents.length}`);
    agents.forEach(agent => {
      console.log(`  👤 ${agent.agentId} (${agent.firstName} ${agent.lastName}) - Email: ${agent.email}, Status: ${agent.status}`);
    });

    // Also check users again but with more details
    const users = await prisma.user.findMany({
      select: {
        id: true,
        userId: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });

    console.log(`\n👥 Detailed users found: ${users.length}`);
    users.forEach(user => {
      console.log(`  👤 ${user.userId || user.username} (${user.firstName || 'No first name'} ${user.lastName || 'No last name'}) - Email: ${user.email}, Role: ${user.role}`);
    });

  } catch (error) {
    console.error('Error checking agents/users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAgents();