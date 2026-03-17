const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

async function checkAgentsUsers() {
  try {
    console.log('👨‍💼 Checking agents in database...');
    
    // Check agents table - simplified fields
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        agentId: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        role: true,
        isLoggedIn: true
      }
    });
    
    console.log(`📊 Total agents found: ${agents.length}`);
    agents.forEach(agent => {
      console.log(`  👤 Agent: ${agent.agentId} (${agent.firstName} ${agent.lastName}) - Email: ${agent.email}, Status: ${agent.status}, LoggedIn: ${agent.isLoggedIn}`);
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
      console.log(`  👤 User: ${user.userId || user.username} (${user.firstName || 'No first name'} ${user.lastName || 'No last name'}) - Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}`);
    });

    // Let's search for anything with "Kenan" in it
    console.log('\n🔍 Searching for "Kenan" in users...');
    const kenanUsers = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: 'Kenan', mode: 'insensitive' } },
          { lastName: { contains: 'Kenan', mode: 'insensitive' } },
          { username: { contains: 'Kenan', mode: 'insensitive' } },
          { email: { contains: 'kenan', mode: 'insensitive' } }
        ]
      }
    });

    console.log(`Found ${kenanUsers.length} users with "Kenan":`);
    kenanUsers.forEach(user => {
      console.log(`  👤 ${user.userId || user.username} - ${user.firstName} ${user.lastName} (${user.email})`);
    });

    console.log('\n🔍 Searching for "Kenan" in agents...');
    const kenanAgents = await prisma.agent.findMany({
      where: {
        OR: [
          { firstName: { contains: 'Kenan', mode: 'insensitive' } },
          { lastName: { contains: 'Kenan', mode: 'insensitive' } },
          { agentId: { contains: 'Kenan', mode: 'insensitive' } },
          { email: { contains: 'kenan', mode: 'insensitive' } }
        ]
      }
    });

    console.log(`Found ${kenanAgents.length} agents with "Kenan":`);
    kenanAgents.forEach(agent => {
      console.log(`  👤 ${agent.agentId} - ${agent.firstName} ${agent.lastName} (${agent.email})`);
    });

  } catch (error) {
    console.error('Error checking agents/users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAgentsUsers();