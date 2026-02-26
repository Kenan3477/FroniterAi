/**
 * Check Agents and Foreign Key Constraints
 * Debug the foreign key constraint issues
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkForeignKeyConstraints() {
    console.log('🔍 CHECKING FOREIGN KEY CONSTRAINTS');
    
    try {
        // 1. Check agents table
        console.log('\n1. Checking agents table...');
        const agents = await prisma.agent.findMany({
            take: 10,
            orderBy: { agentId: 'asc' }
        });
        
        console.log(`Found ${agents.length} agents:`);
        agents.forEach(agent => {
            console.log(`   - Agent ID: ${agent.agentId} | Name: ${agent.name || 'N/A'}`);
        });
        
        // 2. Check if agentId "509" exists
        const agent509 = await prisma.agent.findFirst({
            where: { agentId: '509' }
        });
        
        if (agent509) {
            console.log('\n✅ Agent 509 found:', agent509);
        } else {
            console.log('\n❌ Agent 509 not found');
            
            // Create agent 509 for testing
            console.log('Creating agent 509...');
            try {
                const newAgent = await prisma.agent.create({
                    data: {
                        agentId: '509',
                        name: 'Kenan Test Agent',
                        email: 'kenan@test.com',
                        status: 'Available',
                        currentCampaignId: null
                    }
                });
                console.log('✅ Agent 509 created:', newAgent);
            } catch (createError) {
                console.log('❌ Failed to create agent 509:', createError.message);
            }
        }
        
        // 3. Check campaigns
        console.log('\n3. Checking campaign "manual-dial"...');
        const campaign = await prisma.campaign.findFirst({
            where: { campaignId: 'manual-dial' }
        });
        
        if (campaign) {
            console.log('✅ Campaign found:', campaign.name);
        } else {
            console.log('❌ Campaign "manual-dial" not found');
        }
        
        // 4. Check contacts table for foreign key issues
        console.log('\n4. Checking if we can create a basic call record...');
        const testContact = await prisma.contact.findFirst({
            take: 1
        });
        
        if (testContact) {
            console.log('✅ Test contact available:', testContact.contactId);
        } else {
            console.log('❌ No test contact available');
        }
        
    } catch (error) {
        console.error('❌ CONSTRAINT CHECK FAILED:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkForeignKeyConstraints();