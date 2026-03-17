const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllTables() {
  try {
    console.log('🔍 Checking all relevant tables for data...\n');

    // Check Users
    const users = await prisma.user.count();
    console.log(`👥 Users: ${users}`);

    // Check Agents
    const agents = await prisma.agent.count();
    console.log(`👤 Agents: ${agents}`);

    // Check Campaigns
    const campaigns = await prisma.campaign.count();
    console.log(`📋 Campaigns: ${campaigns}`);

    // Check Contacts
    const contacts = await prisma.contact.count();
    console.log(`📞 Contacts: ${contacts}`);

    // Check Call Records
    const callRecords = await prisma.callRecord.count();
    console.log(`📞 Call Records: ${callRecords}`);

    // Check if there are any other call-related tables
    try {
      const interactions = await prisma.interaction.count();
      console.log(`🤝 Interactions: ${interactions}`);
    } catch (e) {
      console.log(`🤝 Interactions: Table not accessible`);
    }

    // Check if the current user exists
    const currentUser = await prisma.user.findFirst({
      where: { 
        OR: [
          { username: 'Kenan User' },
          { firstName: 'Kenan' }
        ]
      }
    });
    console.log(`👤 Current user found:`, currentUser ? `${currentUser.firstName} ${currentUser.lastName} (ID: ${currentUser.id})` : 'Not found');

    // Check if there are any agents for current user
    if (currentUser) {
      const userAgent = await prisma.agent.findFirst({
        where: { 
          OR: [
            { userId: currentUser.id.toString() },
            { firstName: currentUser.firstName }
          ]
        }
      });
      console.log(`👤 Current user's agent:`, userAgent ? `${userAgent.firstName} ${userAgent.lastName} (${userAgent.agentId})` : 'Not found');
    }

    // Check recent database activity
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        createdAt: true
      }
    });

    console.log('\n📅 Recent users:');
    recentUsers.forEach(user => {
      console.log(`   ${user.firstName} ${user.lastName} (@${user.username}) - ${user.createdAt}`);
    });

    const recentContacts = await prisma.contact.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true
      }
    });

    console.log('\n📞 Recent contacts:');
    recentContacts.forEach(contact => {
      console.log(`   ${contact.firstName} ${contact.lastName} (${contact.phone}) - ${contact.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Error checking tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllTables();