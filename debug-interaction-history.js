// Debug script to check interaction history API issue
const { PrismaClient } = require('@prisma/client');

// Use Railway database URL
process.env.DATABASE_URL = 'postgresql://postgres:qONMQgtjQVZQfHHPdUdNSGHaYnZVepNN@junction.proxy.rlwy.net:39627/railway';

async function debugInteractionHistory() {
    console.log('🔍 Debugging Interaction History API Issues...\n');

    const prisma = new PrismaClient();

    try {
        // 1. Check if Interaction table exists and has data
        console.log('1️⃣ Checking Interaction table...');
        const interactionCount = await prisma.interaction.count();
        console.log(`   Total interactions: ${interactionCount}`);

        // 2. Check recent interactions
        const recentInteractions = await prisma.interaction.findMany({
            take: 3,
            orderBy: { startedAt: 'desc' }
        });
        console.log(`   Recent interactions: ${recentInteractions.length}`);
        recentInteractions.forEach((int, i) => {
            console.log(`     ${i+1}. Agent: ${int.agentId}, Outcome: ${int.outcome}, EndedAt: ${int.endedAt ? 'Yes' : 'No'}`);
        });

        // 3. Check Task table (for callback functionality)
        console.log('\n2️⃣ Checking Task table...');
        const taskCount = await prisma.task.count();
        console.log(`   Total tasks: ${taskCount}`);

        // 4. Check for agent 509 specifically (Kenan)
        console.log('\n3️⃣ Checking Agent 509 interactions...');
        const kenanInteractions = await prisma.interaction.findMany({
            where: { agentId: '509' },
            orderBy: { startedAt: 'desc' },
            take: 5
        });
        console.log(`   Kenan's interactions: ${kenanInteractions.length}`);
        kenanInteractions.forEach((int, i) => {
            console.log(`     ${i+1}. Outcome: ${int.outcome}, Started: ${int.startedAt?.toISOString()}, Ended: ${int.endedAt ? 'Yes' : 'No'}`);
        });

        // 5. Test the categorization logic
        console.log('\n4️⃣ Testing categorization logic...');
        
        // Outcomed interactions (completed with outcomes)
        const outcomedCount = await prisma.interaction.count({
            where: {
                agentId: '509',
                endedAt: { not: null },
                AND: [
                    {
                        OR: [
                            { outcome: { not: null } },
                            { result: { not: null } }
                        ]
                    }
                ]
            }
        });
        console.log(`   Outcomed interactions for agent 509: ${outcomedCount}`);

        // Allocated interactions (active/in-progress)
        const allocatedCount = await prisma.interaction.count({
            where: {
                agentId: '509',
                endedAt: null,
                outcome: {
                    in: ['pending', 'allocated', 'in-progress', 'connected']
                }
            }
        });
        console.log(`   Allocated interactions for agent 509: ${allocatedCount}`);

        // 6. Check latest call that should have been dispositioned
        console.log('\n5️⃣ Checking latest dispositioned call...');
        const latestCall = await prisma.interaction.findFirst({
            where: {
                agentId: '509',
                endedAt: { not: null }
            },
            orderBy: { endedAt: 'desc' }
        });
        
        if (latestCall) {
            console.log(`   Latest call: ${latestCall.id}`);
            console.log(`     Started: ${latestCall.startedAt?.toISOString()}`);
            console.log(`     Ended: ${latestCall.endedAt?.toISOString()}`);
            console.log(`     Outcome: ${latestCall.outcome}`);
            console.log(`     Result: ${latestCall.result}`);
        } else {
            console.log('   No completed calls found for agent 509');
        }

    } catch (error) {
        console.error('❌ Error during debugging:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugInteractionHistory();