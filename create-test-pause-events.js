const { PrismaClient } = require('@prisma/client');

async function createTestPauseEvents() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Checking for existing agents...');
    
    const agents = await prisma.agent.findMany({
      take: 5
    });
    
    console.log(`📊 Found ${agents.length} agents`);
    
    if (agents.length === 0) {
      console.log('⚠️ No agents found. Creating test agent...');
      
      const testAgent = await prisma.agent.create({
        data: {
          agentId: 'agent_test_001',
          email: 'test.agent@omnivox.ai',
          status: 'available',
          isLoggedIn: true,
          extension: '1001',
          maxConcurrentCalls: 1
        }
      });
      
      agents.push(testAgent);
      console.log('✅ Created test agent:', testAgent.agentId);
    }
    
    console.log('📅 Creating pause events for today...');
    
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    const pauseEvents = [];
    
    for (let i = 0; i < 5; i++) {
      const startTime = new Date(today.getTime() - (i + 1) * 2 * 60 * 60 * 1000); // 2 hours ago, 4 hours ago, etc.
      const endTime = new Date(startTime.getTime() + 15 * 60 * 1000); // 15 minute break
      
      const pauseEvent = await prisma.agentPauseEvent.create({
        data: {
          agentId: agents[i % agents.length].agentId,
          eventType: 'pause',
          pauseReason: i % 2 === 0 ? 'bathroom' : 'lunch',
          pauseCategory: i % 2 === 0 ? 'personal' : 'scheduled',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: 15,
          agentComment: `Test pause event ${i + 1}`
        }
      });
      
      pauseEvents.push(pauseEvent);
      console.log(`✅ Created pause event ${i + 1}: ${pauseEvent.pauseReason} at ${pauseEvent.startTime}`);
    }
    
    console.log(`🎉 Successfully created ${pauseEvents.length} test pause events!`);
    console.log('📅 Date range:', yesterday.toISOString().split('T')[0], 'to', today.toISOString().split('T')[0]);
    
  } catch (error) {
    console.error('❌ Error creating test pause events:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPauseEvents();