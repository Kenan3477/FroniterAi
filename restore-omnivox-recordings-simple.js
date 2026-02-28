/**
 * Restore Omnivox Call Recordings from Twilio - SIMPLE VERSION
 * Uses existing campaigns and contacts to avoid schema issues
 */

const twilio = require('twilio');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function restoreOmnivoxRecordingsSimple() {
    try {
        // Initialize Twilio client
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        
        if (!accountSid || !authToken) {
            throw new Error('❌ Twilio credentials not found. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
        }

        const client = twilio(accountSid, authToken);
        
        console.log('🔄 Restoring Omnivox recordings from Twilio (SIMPLE VERSION)...\n');

        // Use existing campaign and contact
        const existingCampaign = await prisma.campaign.findFirst();
        const existingContact = await prisma.contact.findFirst();
        
        if (!existingCampaign || !existingContact) {
            throw new Error('❌ No existing campaign or contact found. Please ensure you have data in your database.');
        }

        console.log(`✅ Using campaign: ${existingCampaign.name} (${existingCampaign.campaignId})`);
        console.log(`✅ Using contact: ${existingContact.firstName} ${existingContact.lastName}\n`);

        // Get ALL recordings from Twilio
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
        let skipped = 0;

        // Process each recording
        for (const recording of recordings) {
            try {
                console.log(`Processing recording ${recording.sid}...`);
                
                // Find the associated call
                const associatedCall = calls.find(call => call.sid === recording.callSid);
                
                if (!associatedCall) {
                    console.log(`⚠️  Call not found for recording ${recording.sid}`);
                    skipped++;
                    continue;
                }

                // Check if we already have this call record
                let callRecord = await prisma.callRecord.findFirst({
                    where: { callId: recording.callSid }
                });

                // If no call record exists, create one
                if (!callRecord) {
                    console.log(`📝 Creating call record for ${recording.callSid}...`);
                    
                    callRecord = await prisma.callRecord.create({
                        data: {
                            callId: recording.callSid,
                            campaignId: existingCampaign.campaignId,
                            contactId: existingContact.contactId,
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
                    skipped++;
                }

            } catch (error) {
                console.error(`❌ Error processing recording ${recording.sid}:`, error.message);
                errors++;
            }
        }

        console.log(`\n🎉 Restoration Complete!`);
        console.log(`📞 Call records created: ${createdCallRecords}`);
        console.log(`🎵 Recordings restored: ${restoredRecordings}`);
        console.log(`⏭️  Skipped (already exist): ${skipped}`);
        console.log(`❌ Errors: ${errors}`);
        console.log(`📊 Total recordings processed: ${recordings.length}`);

        if (restoredRecordings > 0) {
            console.log('\n🎉 SUCCESS! Your Omnivox recordings have been restored!');
            console.log('✅ Go to the frontend Reports page to see your restored recordings!');
        } else {
            console.log('\n⚠️ No new recordings were restored. They may already exist or there were errors.');
        }

    } catch (error) {
        console.error('❌ Fatal error restoring recordings:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the restoration
restoreOmnivoxRecordingsSimple();