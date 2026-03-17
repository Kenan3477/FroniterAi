const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

async function findKenan() {
  try {
    console.log('🔍 Searching for Kenan in the database...');
    
    // Check users first
    console.log('\n👥 All users:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        isActive: true
      }
    });
    
    users.forEach(user => {
      console.log(`  🆔 ID: ${user.id}, Username: ${user.username}, Name: ${user.firstName} ${user.lastName} (${user.name}), Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}`);
    });

    // Check agents
    console.log('\n👨‍💼 All agents:');
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        agentId: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        isLoggedIn: true
      }
    });
    
    agents.forEach(agent => {
      console.log(`  🆔 ID: ${agent.id}, AgentID: ${agent.agentId}, Name: ${agent.firstName} ${agent.lastName}, Email: ${agent.email}, Status: ${agent.status}, LoggedIn: ${agent.isLoggedIn}`);
    });

    // Search specifically for "Kenan"
    console.log('\n🔍 Searching for "Kenan" in users...');
    const kenanUsers = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: 'Kenan', mode: 'insensitive' } },
          { lastName: { contains: 'Kenan', mode: 'insensitive' } },
          { username: { contains: 'kenan', mode: 'insensitive' } },
          { name: { contains: 'Kenan', mode: 'insensitive' } },
          { email: { contains: 'kenan', mode: 'insensitive' } }
        ]
      }
    });

    if (kenanUsers.length > 0) {
      console.log(`✅ Found ${kenanUsers.length} users with "Kenan":`);
      kenanUsers.forEach(user => {
        console.log(`  👤 ${user.username} - ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`);
      });
    } else {
      console.log('❌ No users found with "Kenan"');
    }

    console.log('\n🔍 Searching for "Kenan" in agents...');
    const kenanAgents = await prisma.agent.findMany({
      where: {
        OR: [
          { firstName: { contains: 'Kenan', mode: 'insensitive' } },
          { lastName: { contains: 'Kenan', mode: 'insensitive' } },
          { agentId: { contains: 'kenan', mode: 'insensitive' } },
          { email: { contains: 'kenan', mode: 'insensitive' } }
        ]
      }
    });

    if (kenanAgents.length > 0) {
      console.log(`✅ Found ${kenanAgents.length} agents with "Kenan":`);
      kenanAgents.forEach(agent => {
        console.log(`  👤 ${agent.agentId} - ${agent.firstName} ${agent.lastName} (${agent.email})`);
      });
    } else {
      console.log('❌ No agents found with "Kenan"');
    }

    // Check if "admin" user exists and could be Kenan
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@omnivox.ai' }
    });
    
    if (adminUser) {
      console.log('\n📋 Admin user details:');
      console.log(`  Username: ${adminUser.username}`);
      console.log(`  Name: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.name})`);
      console.log(`  Email: ${adminUser.email}`);
      console.log(`  Role: ${adminUser.role}`);
      console.log(`  Active: ${adminUser.isActive}`);
    }

  } catch (error) {
    console.error('Error searching for Kenan:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findKenan();