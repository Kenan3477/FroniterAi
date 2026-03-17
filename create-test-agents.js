const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestAgent() {
  try {
    console.log('=== CREATING TEST AGENT TO PREVENT FOREIGN KEY ERRORS ===\n');
    
    // Create test agent
    const testAgent = await prisma.agent.create({
      data: {
        agentId: 'test-agent',
        name: 'Test Agent',
        email: 'test@example.com',
        status: 'available',
        phoneExtension: '1000',
        sipUser: 'test-agent'
      }
    });
    
    console.log('✅ Created test agent:', {
      agentId: testAgent.agentId,
      name: testAgent.name,
      status: testAgent.status
    });
    
    // Also create other common agent IDs from the logs
    const agentIds = ['test-agent-001', 'test-agent-123', 'system-agent'];
    
    for (const agentId of agentIds) {
      try {
        const agent = await prisma.agent.create({
          data: {
            agentId: agentId,
            name: `Agent ${agentId}`,
            email: `${agentId}@example.com`,
            status: 'available',
            phoneExtension: `${Math.floor(Math.random() * 9000) + 1000}`,
            sipUser: agentId
          }
        });
        console.log(`✅ Created agent: ${agent.agentId}`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Agent ${agentId} already exists, skipping`);
        } else {
          console.error(`❌ Error creating agent ${agentId}:`, error.message);
        }
      }
    }
    
    // Check final agent count
    const agentCount = await prisma.agent.count();
    console.log(`\n📊 Total agents in database: ${agentCount}`);
    
  } catch (error) {
    console.error('❌ Error creating test agent:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAgent();