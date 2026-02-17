import { prisma } from '../database';

export async function ensureBasicAgents() {
  try {
    console.log('🔧 Ensuring basic agents exist...');
    
    const agentIds = [
      'test-agent',
      'test-agent-001', 
      'test-agent-123',
      'system-agent'
    ];
    
    for (const agentId of agentIds) {
      try {
        const existingAgent = await prisma.agent.findUnique({
          where: { agentId }
        });
        
        if (!existingAgent) {
          await prisma.agent.create({
            data: {
              agentId: agentId,
              name: `Agent ${agentId}`,
              email: `${agentId}@system.local`,
              status: 'available',
              phoneExtension: `${Math.floor(Math.random() * 9000) + 1000}`,
              sipUser: agentId
            }
          });
          console.log(`✅ Created system agent: ${agentId}`);
        }
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Agent already exists, ignore
        } else {
          console.error(`❌ Error creating agent ${agentId}:`, error.message);
        }
      }
    }
    
    console.log('✅ Basic agents ensured');
  } catch (error) {
    console.error('❌ Error ensuring basic agents:', error);
  }
}