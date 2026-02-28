const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRecordingData() {
    try {
        console.log('🔍 Checking recording data in database...\n');

        // Check call records and their recording associations
        const callRecordsWithRecordings = await prisma.callRecord.findMany({
            include: {
                recordingFile: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log(`📞 Found ${callRecordsWithRecordings.length} call records:\n`);

        let recordsWithRecordings = 0;
        let recordsWithoutRecordings = 0;

        for (const record of callRecordsWithRecordings) {
            if (record.recordingFile) {
                recordsWithRecordings++;
            } else {
                recordsWithoutRecordings++;
                console.log(`❌ NO RECORDING: Call ${record.callId} to ${record.phoneNumber}`);
                console.log(`   Status: ${record.status}`);
                console.log(`   Twilio Call SID: ${record.twilioCallSid || 'N/A'}`);
                console.log(`   Created: ${record.createdAt}`);
                console.log('');
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`✅ Calls WITH recordings: ${recordsWithRecordings}`);
        console.log(`❌ Calls WITHOUT recordings: ${recordsWithoutRecordings}`);

        // Check all recordings
        const allRecordings = await prisma.recording.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log(`\n🎵 Total recordings in database: ${allRecordings.length}`);

        if (allRecordings.length > 0) {
            console.log('\nRecent recordings:');
            allRecordings.slice(0, 10).forEach(recording => {
                console.log(`- ${recording.fileName}`);
                console.log(`  Call Record: ${recording.callRecordId}`);
                console.log(`  Duration: ${recording.duration || 'N/A'}s`);
                console.log(`  Status: ${recording.uploadStatus}`);
                console.log('');
            });
        }

        // If we have call records but no recordings, there's a synchronization issue
        if (callRecordsWithRecordings.length > 0 && allRecordings.length === 0) {
            console.log('\n⚠️ ISSUE DETECTED: We have call records but NO recordings in database!');
            console.log('This suggests recordings from Twilio are not being properly saved to our database.');
        }

    } catch (error) {
        console.error('❌ Error checking recording data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkRecordingData();