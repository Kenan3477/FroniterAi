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
            },
            take: 10
        });

        console.log(`📞 Found ${callRecordsWithRecordings.length} recent call records:\n`);

        for (const record of callRecordsWithRecordings) {
            console.log(`Call ID: ${record.callId}`);
            console.log(`  Phone: ${record.phoneNumber}`);
            console.log(`  Status: ${record.status}`);
            console.log(`  Call SID: ${record.twilioCallSid || 'N/A'}`);
            console.log(`  Recording: ${record.recordingFile ? '✅ YES' : '❌ NO'}`);
            if (record.recordingFile) {
                console.log(`    - File: ${record.recordingFile.fileName}`);
                console.log(`    - Path: ${record.recordingFile.filePath}`);
                console.log(`    - Duration: ${record.recordingFile.duration || 'N/A'}s`);
            }
            console.log(`  Created: ${record.createdAt}`);
            console.log('---');
        }

        // Check standalone recordings
        const allRecordings = await prisma.recording.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log(`\n🎵 Total recordings in database: ${allRecordings.length}\n`);

        if (allRecordings.length > 0) {
            console.log('Recent recordings:');
            allRecordings.slice(0, 5).forEach(recording => {
                console.log(`- ${recording.fileName} (${recording.format})`);
                console.log(`  Twilio SID: ${recording.twilioRecordingSid || 'N/A'}`);
                console.log(`  Call Record ID: ${recording.callRecordId || 'N/A'}`);
                console.log(`  Duration: ${recording.duration || 'N/A'}s`);
                console.log(`  Created: ${recording.createdAt}`);
                console.log('');
            });
        }

        // Check for orphaned recordings (recordings without call records)
        const orphanedRecordings = await prisma.recording.findMany({
            where: {
                callRecordId: null
            }
        });

        if (orphanedRecordings.length > 0) {
            console.log(`\n⚠️ Found ${orphanedRecordings.length} orphaned recordings (not linked to call records):`);
            orphanedRecordings.forEach(recording => {
                console.log(`- ${recording.fileName} (Twilio: ${recording.twilioRecordingSid})`);
            });
        }

        // Check for call records without recordings that should have them
        const callsWithoutRecordings = await prisma.callRecord.findMany({
            where: {
                recordingFile: null,
                status: {
                    in: ['completed', 'answered']
                }
            }
        });

        if (callsWithoutRecordings.length > 0) {
            console.log(`\n❌ Found ${callsWithoutRecordings.length} completed calls without recordings:`);
            callsWithoutRecordings.slice(0, 10).forEach(record => {
                console.log(`- Call ${record.callId} to ${record.phoneNumber} (${record.status})`);
                console.log(`  Twilio Call SID: ${record.twilioCallSid || 'N/A'}`);
                console.log(`  Created: ${record.createdAt}`);
            });
        }

    } catch (error) {
        console.error('❌ Error checking recording data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkRecordingData();