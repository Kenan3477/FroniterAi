const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

async function checkUserAgentMapping() {
    try {
        console.log('🔍 Checking user and agent ID mapping...\n');

        // Find Kenan's user record
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                role: true
            }
        });

        console.log('👤 ALL USERS:');
        users.forEach(user => {
            console.log(`User: ${user.name} (${user.username})`);
            console.log(`  - User ID: ${user.id}`);
            console.log(`  - Email: ${user.email}`);
            console.log(`  - Role: ${user.role}`);
            console.log('');
        });

        // Find Kenan specifically
        const kenanUser = users.find(u => 
            u.username?.toLowerCase().includes('kenan') || 
            u.name?.toLowerCase().includes('kenan')
        );

        if (kenanUser) {
            console.log('🎯 KENAN\'S USER RECORD:');
            console.log(`Name: ${kenanUser.name}`);
            console.log(`Username: ${kenanUser.username}`);
            console.log(`User ID: ${kenanUser.id}`);
            console.log(`Email: ${kenanUser.email}`);
            console.log(`Role: ${kenanUser.role}`);

            // Check call records with different possible agent IDs
            const callsByUserId = await prisma.callRecord.count({
                where: { agentId: kenanUser.id?.toString() }
            });

            const callsBy509 = await prisma.callRecord.count({
                where: { agentId: "509" }
            });

            console.log('\n📞 CALL RECORD COUNTS:');
            console.log(`By user.id (${kenanUser.id}): ${callsByUserId}`);
            console.log(`By hardcoded "509": ${callsBy509}`);

        } else {
            console.log('❌ Could not find Kenan\'s user record');
        }

        // Check agent table
        console.log('\n👥 AGENT RECORDS:');
        const agents = await prisma.agent.findMany({
            select: {
                id: true,
                agentId: true,
                firstName: true,
                lastName: true,
                isActive: true
            }
        });

        agents.forEach(agent => {
            console.log(`Agent: ${agent.firstName} ${agent.lastName}`);
            console.log(`  - Agent ID: ${agent.agentId}`);
            console.log(`  - Internal ID: ${agent.id}`);
            console.log(`  - Active: ${agent.isActive}`);
            console.log('');
        });

    } catch (error) {
        console.error('Error checking user/agent mapping:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUserAgentMapping();