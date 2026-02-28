require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteAllCallRecordsViaAPI() {
    try {
        console.log('🗑️  DELETING ALL CALL RECORDS VIA API ENDPOINT...\n');

        // First check what's in the database
        console.log('📊 Checking current database state...');
        const callRecordsCount = await prisma.callRecord.count();
        const recordingsCount = await prisma.recording.count();
        const interactionsCount = await prisma.interaction.count();
        
        console.log(`Current counts before API delete:`);
        console.log(`  - Call Records: ${callRecordsCount}`);
        console.log(`  - Recordings: ${recordingsCount}`);
        console.log(`  - Interactions: ${interactionsCount}`);

        if (callRecordsCount === 0) {
            console.log('\n✅ No call records found in database - system is already clean');
            console.log('🔍 Frontend may be showing cached data - check network/browser cache');
            return;
        }

        // If there are call records, they might be coming from a different source
        // Let's list them to understand what's happening
        if (callRecordsCount > 0) {
            console.log('\n📋 Found call records in database:');
            const records = await prisma.callRecord.findMany({
                select: {
                    id: true,
                    callId: true,
                    phoneNumber: true,
                    startTime: true,
                    outcome: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            });

            records.forEach((record, index) => {
                console.log(`  ${index + 1}. ID: ${record.id} | CallId: ${record.callId} | Phone: ${record.phoneNumber} | Start: ${record.startTime?.toISOString()} | Outcome: ${record.outcome || 'None'}`);
            });

            if (callRecordsCount > 10) {
                console.log(`  ... and ${callRecordsCount - 10} more records`);
            }

            console.log('\n🗑️  Deleting all call records...');
            const deleteResult = await prisma.callRecord.deleteMany({});
            console.log(`✅ Deleted ${deleteResult.count} call records directly from database`);

            // Also delete any recordings
            const recordingDeleteResult = await prisma.recording.deleteMany({});
            console.log(`✅ Deleted ${recordingDeleteResult.count} recordings`);

            // And interactions
            const interactionDeleteResult = await prisma.interaction.deleteMany({});
            console.log(`✅ Deleted ${interactionDeleteResult.count} interactions`);
        }

        // Verify cleanup
        console.log('\n🔍 Verifying cleanup...');
        const finalCallRecordsCount = await prisma.callRecord.count();
        const finalRecordingsCount = await prisma.recording.count();
        const finalInteractionsCount = await prisma.interaction.count();
        
        console.log(`Final counts after cleanup:`);
        console.log(`  - Call Records: ${finalCallRecordsCount}`);
        console.log(`  - Recordings: ${finalRecordingsCount}`);
        console.log(`  - Interactions: ${finalInteractionsCount}`);

        if (finalCallRecordsCount === 0) {
            console.log('\n✅ SUCCESS: All call records deleted from database');
            console.log('\n🔄 FRONTEND TROUBLESHOOTING:');
            console.log('If the frontend still shows call records:');
            console.log('1. 🔄 Hard refresh the browser (Ctrl+Shift+R / Cmd+Shift+R)');
            console.log('2. 🧹 Clear browser cache and cookies');
            console.log('3. 👀 Check browser Network tab to see what API calls are being made');
            console.log('4. 🔍 Check if frontend is calling a different endpoint');
            console.log('5. ⏰ Wait a few minutes for any CDN/cache to clear');
        } else {
            console.log('\n❌ WARNING: Some call records still exist in database');
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

deleteAllCallRecordsViaAPI();