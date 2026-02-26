const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

async function checkBothTables() {
    try {
        console.log('🔍 Checking both call_records and interactions tables...\n');

        // Check call_records table
        console.log('📞 CALL RECORDS TABLE:');
        const callRecords = await prisma.callRecord.findMany({
            orderBy: { startTime: 'desc' },
            take: 10,
            include: {
                contact: {
                    select: { firstName: true, lastName: true, phone: true }
                },
                agent: {
                    select: { agentId: true, firstName: true, lastName: true }
                }
            }
        });

        console.log(`Found ${callRecords.length} call records`);
        callRecords.forEach((record, index) => {
            console.log(`${index + 1}. Call ID: ${record.callId}`);
            console.log(`   Phone: ${record.phoneNumber}`);
            console.log(`   Agent: ${record.agent?.firstName || 'N/A'} ${record.agent?.lastName || ''} (ID: ${record.agentId})`);
            console.log(`   Outcome: ${record.outcome || 'None'}`);
            console.log(`   Duration: ${record.duration || 0}s`);
            console.log(`   Start: ${record.startTime}`);
            console.log(`   Contact: ${record.contact?.firstName || 'N/A'} ${record.contact?.lastName || ''}`);
            console.log('');
        });

        // Check interactions table
        console.log('\n💬 INTERACTIONS TABLE:');
        const interactions = await prisma.interaction.findMany({
            orderBy: { startedAt: 'desc' },
            take: 10,
            include: {
                contact: {
                    select: { firstName: true, lastName: true, phone: true }
                },
                agent: {
                    select: { agentId: true, firstName: true, lastName: true }
                }
            }
        });

        console.log(`Found ${interactions.length} interactions`);
        interactions.forEach((interaction, index) => {
            console.log(`${index + 1}. Interaction ID: ${interaction.id}`);
            console.log(`   Agent: ${interaction.agent?.firstName || 'N/A'} ${interaction.agent?.lastName || ''} (ID: ${interaction.agentId})`);
            console.log(`   Contact: ${interaction.contact?.firstName || 'N/A'} ${interaction.contact?.lastName || ''}`);
            console.log(`   Phone: ${interaction.contact?.phone || 'N/A'}`);
            console.log(`   Outcome: ${interaction.outcome || 'None'}`);
            console.log(`   Channel: ${interaction.channel}`);
            console.log(`   Duration: ${interaction.durationSeconds || 0}s`);
            console.log(`   Started: ${interaction.startedAt}`);
            console.log(`   DMC: ${interaction.isDmc}`);
            console.log('');
        });

        // Summary stats
        console.log('\n📊 SUMMARY STATISTICS:');
        
        // Today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayCallRecords = await prisma.callRecord.count({
            where: { startTime: { gte: today } }
        });

        const todayInteractions = await prisma.interaction.count({
            where: { startedAt: { gte: today } }
        });

        const kenanCallRecords = await prisma.callRecord.count({
            where: { agentId: { in: ['2', 'kenan', 'Kenan'] } }
        });

        const kenanInteractions = await prisma.interaction.count({
            where: { agentId: { in: ['2', 'kenan', 'Kenan'] } }
        });

        console.log(`Today's Call Records: ${todayCallRecords}`);
        console.log(`Today's Interactions: ${todayInteractions}`);
        console.log(`Kenan's Call Records: ${kenanCallRecords}`);
        console.log(`Kenan's Interactions: ${kenanInteractions}`);

        // Check which table has more recent data
        const latestCallRecord = await prisma.callRecord.findFirst({
            orderBy: { startTime: 'desc' }
        });

        const latestInteraction = await prisma.interaction.findFirst({
            orderBy: { startedAt: 'desc' }
        });

        console.log(`\n🕒 LATEST DATA:`);
        console.log(`Latest Call Record: ${latestCallRecord?.startTime || 'None'}`);
        console.log(`Latest Interaction: ${latestInteraction?.startedAt || 'None'}`);

    } catch (error) {
        console.error('Error checking tables:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkBothTables();