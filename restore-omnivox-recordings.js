/**
 * Restore Omnivox Call Recordings from Twilio
 * This script fetches ALL recordings from Twilio and recreates call records and recordings in Omnivox
 */

const twilio = require('twilio');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function restoreOmnivoxRecordings() {
    try {
        // Initialize Twilio client
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        
        if (!accountSid || !authToken) {
            throw new Error('❌ Twilio credentials not found. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
        }

        const client = twilio(accountSid, authToken);
        
        console.log('🔄 Restoring Omnivox recordings from Twilio...\n');

        // Get ALL recordings from Twilio (not just recent ones)
        console.log('🔍 Fetching ALL recordings from Twilio...');
        const recordings = await client.recordings.list({ 
            limit: 1000  // Get up to 1000 recordings
        });

        console.log(`🎵 Found ${recordings.length} total recordings in Twilio\n`);

        if (recordings.length === 0) {
            console.log('❌ No recordings found in Twilio!');
            return;
        }

        // Also fetch call logs to get call details
        console.log('📞 Fetching call logs from Twilio...');
        const calls = await client.calls.list({ 
            limit: 1000 
        });
        console.log(`📞 Found ${calls.length} call logs in Twilio\n`);

        let restoredRecordings = 0;
        let createdCallRecords = 0;
        let errors = 0;

        // Process each recording
        for (const recording of recordings) {
            try {
                console.log(`Processing recording ${recording.sid}...`);
                
                // Find the associated call
                const associatedCall = calls.find(call => call.sid === recording.callSid);
                
                if (!associatedCall) {
                    console.log(`⚠️  Call not found for recording ${recording.sid}`);
                    continue;
                }

                // Check if we already have this call record
                let callRecord = await prisma.callRecord.findFirst({
                    where: { callId: recording.callSid }
                });

                // If no call record exists, create one
                if (!callRecord) {
                    console.log(`📝 Creating call record for ${recording.callSid}...`);
                    
                    // Ensure we have required dependencies
                    await ensureDependencies();

                    callRecord = await prisma.callRecord.create({
                        data: {
                            callId: recording.callSid,
                            campaignId: 'RESTORED-CALLS',
                            contactId: 'RESTORED-CONTACT',
                            phoneNumber: associatedCall.to || 'Unknown',
                            dialedNumber: associatedCall.to || 'Unknown',
                            callType: associatedCall.direction || 'outbound',
                            startTime: associatedCall.dateCreated || recording.dateCreated,
                            endTime: associatedCall.endTime || new Date(recording.dateCreated.getTime() + (parseInt(recording.duration) * 1000)),
                            duration: parseInt(recording.duration) || 0,
                            outcome: associatedCall.status || 'completed',
                            notes: `Restored from Twilio on ${new Date().toISOString()}`
                        }
                    });

                    createdCallRecords++;
                    console.log(`✅ Created call record for ${recording.callSid}`);
                }

                // Check if recording already exists
                const existingRecording = await prisma.recording.findFirst({
                    where: { callRecordId: callRecord.id }
                });

                if (!existingRecording) {
                    // Create the recording record
                    await prisma.recording.create({
                        data: {
                            callRecordId: callRecord.id,
                            fileName: `recording_${recording.sid}.wav`,
                            filePath: recording.uri.replace('.json', ''),  // Remove .json to get actual audio file
                            fileSize: null, // Twilio doesn't provide this
                            duration: parseInt(recording.duration) || 0,
                            format: 'wav',
                            quality: recording.channels === 2 ? 'stereo' : 'mono',
                            storageType: 'twilio',
                            uploadStatus: 'completed'
                        }
                    });

                    restoredRecordings++;
                    console.log(`🎵 Restored recording for call ${recording.callSid} (${recording.duration}s)`);
                } else {
                    console.log(`ℹ️  Recording already exists for call ${recording.callSid}`);
                }

            } catch (error) {
                console.error(`❌ Error processing recording ${recording.sid}:`, error.message);
                errors++;
            }
        }

        console.log(`\n🎉 Restoration Complete!`);
        console.log(`📞 Call records created: ${createdCallRecords}`);
        console.log(`🎵 Recordings restored: ${restoredRecordings}`);
        console.log(`❌ Errors: ${errors}`);
        console.log(`📊 Total recordings processed: ${recordings.length}`);

        console.log('\n✅ Your Omnivox recordings have been restored! Check the frontend now.');

    } catch (error) {
        console.error('❌ Fatal error restoring recordings:', error);
    } finally {
        await prisma.$disconnect();
    }
}

async function ensureDependencies() {
    // Ensure campaign exists
    await prisma.campaign.upsert({
        where: { campaignId: 'RESTORED-CALLS' },
        update: {},
        create: {
            campaignId: 'RESTORED-CALLS',
            name: 'Restored Calls',
            description: 'Calls restored from Twilio recordings',
            status: 'ACTIVE',
            dialMode: 'MANUAL',
            createdBy: 'SYSTEM'
        }
    });

    // Ensure contact exists
    await prisma.contact.upsert({
        where: { contactId: 'RESTORED-CONTACT' },
        update: {},
        create: {
            contactId: 'RESTORED-CONTACT',
            listId: 'RESTORED-LIST',
            firstName: 'Restored',
            lastName: 'Contact',
            phone: 'Unknown',
            status: 'NEW'
        }
    });

    // Ensure list exists
    await prisma.dataList.upsert({
        where: { listId: 'RESTORED-LIST' },
        update: {},
        create: {
            listId: 'RESTORED-LIST',
            name: 'Restored Contacts'
        }
    });
}

// Run the restoration
restoreOmnivoxRecordings();