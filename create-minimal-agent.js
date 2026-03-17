/**
 * Check Agent Schema and Create Minimal Agent
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createMinimalAgent() {
    console.log('🔧 CREATING MINIMAL AGENT 509');
    
    try {
        // Create agent with only required fields
        const newAgent = await prisma.agent.create({
            data: {
                agentId: '509',
                firstName: 'Kenan',
                lastName: 'Davies',
                email: 'kenan@omnivox.com',
                password: '$2b$10$temp.hash.placeholder',
                status: 'Available',
                isLoggedIn: false,
                maxConcurrentCalls: 1
            }
        });
        
        console.log('✅ Agent 509 created successfully:', newAgent.agentId);
        return true;
        
    } catch (error) {
        if (error.message.includes('Unique constraint failed')) {
            console.log('✅ Agent 509 already exists');
            return true;
        } else {
            console.log('❌ Failed to create agent 509:', error.message);
            return false;
        }
    } finally {
        await prisma.$disconnect();
    }
}

createMinimalAgent();