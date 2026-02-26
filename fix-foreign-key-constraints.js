/**
 * Fix Foreign Key Constraints
 * Create missing agent and campaign records
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixForeignKeyConstraints() {
    console.log('🔧 FIXING FOREIGN KEY CONSTRAINTS');
    
    try {
        // 1. Create agent 509 with all required fields
        console.log('\n1. Creating agent 509...');
        try {
            const newAgent = await prisma.agent.create({
                data: {
                    agentId: '509',
                    firstName: 'Kenan',
                    lastName: 'Test Agent',
                    name: 'Kenan Test Agent',
                    email: 'kenan@test.com',
                    status: 'Available',
                    currentCampaignId: null,
                    password: 'temp-password-hash' // If required
                }
            });
            console.log('✅ Agent 509 created:', newAgent.agentId);
        } catch (agentError) {
            if (agentError.message.includes('Unique constraint failed')) {
                console.log('✅ Agent 509 already exists');
            } else {
                console.log('❌ Failed to create agent 509:', agentError.message);
            }
        }
        
        // 2. Create manual-dial campaign
        console.log('\n2. Creating manual-dial campaign...');
        try {
            const newCampaign = await prisma.campaign.create({
                data: {
                    campaignId: 'manual-dial',
                    name: 'Manual Dialing',
                    dialMethod: 'Manual',
                    status: 'Active',
                    isActive: true,
                    description: 'Manual call records',
                    recordCalls: true
                }
            });
            console.log('✅ Campaign created:', newCampaign.name);
        } catch (campaignError) {
            if (campaignError.message.includes('Unique constraint failed')) {
                console.log('✅ Campaign manual-dial already exists');
            } else {
                console.log('❌ Failed to create campaign:', campaignError.message);
            }
        }
        
        // 3. Verify everything is ready
        console.log('\n3. Verifying setup...');
        const agent = await prisma.agent.findFirst({
            where: { agentId: '509' }
        });
        const campaign = await prisma.campaign.findFirst({
            where: { campaignId: 'manual-dial' }
        });
        
        if (agent && campaign) {
            console.log('🎉 ALL CONSTRAINTS FIXED!');
            console.log('   - Agent 509:', agent.name);
            console.log('   - Campaign:', campaign.name);
            return true;
        } else {
            console.log('❌ Setup incomplete');
            return false;
        }
        
    } catch (error) {
        console.error('❌ FIX FAILED:', error.message);
        return false;
    } finally {
        await prisma.$disconnect();
    }
}

fixForeignKeyConstraints().then(success => {
    if (success) {
        console.log('\n🚀 Ready to test save-call-data again!');
    }
});