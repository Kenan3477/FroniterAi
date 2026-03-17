/**
 * Use Existing Agent for Testing
 * Instead of creating new agent, use existing one
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function useExistingAgent() {
    console.log('🔧 USING EXISTING AGENT FOR TESTING');
    
    try {
        // Get any existing agent
        const existingAgent = await prisma.agent.findFirst({
            orderBy: { agentId: 'asc' }
        });
        
        if (existingAgent) {
            console.log('✅ Using existing agent:', existingAgent.agentId);
            return existingAgent.agentId;
        } else {
            // Create minimal agent
            console.log('Creating minimal agent...');
            const newAgent = await prisma.agent.create({
                data: {
                    agentId: '509',
                    firstName: 'Kenan',
                    lastName: 'Davies',
                    email: 'kenan@omnivox.com',
                    status: 'Available',
                    isLoggedIn: false,
                    maxConcurrentCalls: 1
                }
            });
            console.log('✅ Created agent:', newAgent.agentId);
            return newAgent.agentId;
        }
        
    } catch (error) {
        console.log('❌ Agent setup failed:', error.message);
        
        // Fall back to existing agent
        console.log('Trying to find any existing agent...');
        const fallbackAgent = await prisma.agent.findFirst();
        if (fallbackAgent) {
            console.log('✅ Using fallback agent:', fallbackAgent.agentId);
            return fallbackAgent.agentId;
        }
        
        return null;
    } finally {
        await prisma.$disconnect();
    }
}

useExistingAgent().then(agentId => {
    console.log(`\n🎯 Use agentId: ${agentId} for testing`);
});