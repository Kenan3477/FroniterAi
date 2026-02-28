/**
 * Manual Recording Sync Script
 * Fetches recordings from Twilio and syncs them with call records in database
 */

const twilio = require('twilio');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function syncRecordingsFromTwilio() {
    try {
        // Initialize Twilio client
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        
        if (!accountSid || !authToken) {
            throw new Error('Twilio credentials not found in environment variables');
        }

        const client = twilio(accountSid, authToken);
        
        console.log('🔄 Starting manual recording sync from Twilio...\n');

        // Get all call records that don't have recordings
        const callRecordsWithoutRecordings = await prisma.callRecord.findMany({
            where: {
                recordingFile: null
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log(`📞 Found ${callRecordsWithoutRecordings.length} call records without recordings\n`);

        if (callRecordsWithoutRecordings.length === 0) {
            console.log('✅ All call records already have recordings!');
            return;
        }

        // Fetch recent recordings from Twilio
        console.log('🔍 Fetching recordings from Twilio...');
        const recordings = await client.recordings.list({
            limit: 100,  // Get last 100 recordings
            dateCreatedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        });

        console.log(`🎵 Found ${recordings.length} recordings in Twilio\n`);

        let syncedCount = 0;
        let notFoundCount = 0;

        // Try to match recordings with call records
        for (const callRecord of callRecordsWithoutRecordings) {
            console.log(`Checking call ${callRecord.callId}...`);
            
            // Look for recordings that match this call
            const matchingRecording = recordings.find(recording => 
                recording.callSid === callRecord.callId ||
                recording.callSid.includes(callRecord.callId.substring(-10)) ||
                callRecord.callId.includes(recording.callSid.substring(-10))
            );

            if (matchingRecording) {
                try {
                    // Create recording record in database
                    await prisma.recording.create({
                        data: {
                            callRecordId: callRecord.id,
                            fileName: `recording_${matchingRecording.sid}.wav`,
                            filePath: matchingRecording.uri.replace('.json', ''),
                            duration: parseInt(matchingRecording.duration) || 0,
                            format: 'wav',
                            quality: matchingRecording.channels === 2 ? 'stereo' : 'mono',
                            storageType: 'twilio',
                            uploadStatus: 'completed'
                        }
                    });

                    console.log(`✅ Synced recording for call ${callRecord.callId}`);
                    syncedCount++;
                } catch (error) {
                    console.log(`❌ Failed to sync recording for call ${callRecord.callId}:`, error.message);
                }
            } else {
                console.log(`❌ No recording found for call ${callRecord.callId}`);
                notFoundCount++;
            }
        }

        console.log(`\n📊 Sync Summary:`);
        console.log(`✅ Successfully synced: ${syncedCount} recordings`);
        console.log(`❌ No recordings found: ${notFoundCount} calls`);
        console.log(`🎵 Total Twilio recordings checked: ${recordings.length}`);

        if (syncedCount > 0) {
            console.log('\n🎉 Recording sync completed! Refresh your frontend to see the recordings.');
        }

    } catch (error) {
        console.error('❌ Error syncing recordings:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the sync
syncRecordingsFromTwilio();