const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAgents() {
  try {
    // Find user ID 509
    const user = await prisma.user.findUnique({
      where: { id: 509 },
      select: { id: true, username: true, email: true, role: true }
    });
    
    console.log('User 509:', user);
    
    // Check for agent records
    const agents = await prisma.agent.findMany({
      take: 10,
      select: { agentId: true, email: true, firstName: true, lastName: true }
    });
    
    console.log('\nSample agents:', JSON.stringify(agents, null, 2));
    
    // Check if agent-509 exists
    const agent509 = await prisma.agent.findFirst({
      where: { agentId: 'agent-509' }
    });
    
    console.log('\nAgent with agentId="agent-509":', agent509);
    
    // Check call records to see what agentIds are being used
    const recentCalls = await prisma.callRecord.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, agentId: true, phoneNumber: true, outcome: true }
    });
    
    console.log('\nRecent call records:', JSON.stringify(recentCalls, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAgents();
