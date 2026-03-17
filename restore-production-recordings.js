/**
 * Restore Omnivox Recordings to Production Database
 * This script restores all call recordings from Twilio to the Railway production database
 */

require('dotenv').config();
const twilio = require('twilio');
const { PrismaClient } = require('@prisma/client');

// Use Railway production database from environment variable
const DATABASE_URL = process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasourceUrl: DATABASE_URL
});

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID, 
  process.env.TWILIO_AUTH_TOKEN
);

async function main() {
  try {
    console.log('🚀 Starting Omnivox Recording Restoration to Production Database...');
    console.log('📞 Fetching all recordings from Twilio...');

    // Fetch all recordings from Twilio
    const recordings = await client.recordings.list();
    console.log(`📊 Found ${recordings.length} recordings in Twilio`);

    let restored = 0;
    let skipped = 0;
    let errors = 0;
    let newCallRecords = 0;

    for (const recording of recordings) {
      try {
        console.log(`\n🎵 Processing recording: ${recording.sid}`);
        console.log(`   Call SID: ${recording.callSid}`);
        console.log(`   Duration: ${recording.duration} seconds`);
        console.log(`   Date: ${recording.dateCreated}`);

        // Check if we already have this recording
        const existingRecording = await prisma.recording.findFirst({
          where: {
            OR: [
              { fileName: { contains: recording.sid } },
              { filePath: { contains: recording.sid } }
            ]
          }
        });

        if (existingRecording) {
          console.log(`   ⚠️  Recording already exists: ${existingRecording.id}`);
          skipped++;
          continue;
        }

        // Find or create call record for this recording
        let callRecord = await prisma.callRecord.findFirst({
          where: {
            callId: recording.callSid
          }
        });

        if (!callRecord) {
          console.log(`   📞 Creating call record for CallSID: ${recording.callSid}`);

          // Find an existing campaign and contact for this recording
          const existingCampaign = await prisma.campaign.findFirst();
          const existingContact = await prisma.contact.findFirst();

          if (!existingCampaign) {
            // Create default campaign if none exists
            await prisma.campaign.create({
              data: {
                campaignId: 'RESTORED',
                name: 'Restored Calls',
                description: 'Restored from Twilio recordings',
                status: 'Active',
                isActive: true
              }
            });
          }

          if (!existingContact) {
            // Create default data list and contact
            await prisma.dataList.create({
              data: {
                listId: 'RESTORED-CONTACTS',
                name: 'Restored Contacts',
                campaignId: existingCampaign?.campaignId || 'RESTORED',
                active: true,
                totalContacts: 0
              }
            });

            await prisma.contact.create({
              data: {
                contactId: 'restored-contact',
                listId: 'RESTORED-CONTACTS',
                firstName: 'Restored',
                lastName: 'Contact',
                phone: '+447487723751',
                status: 'completed'
              }
            });
          }

          // Create the call record
          callRecord = await prisma.callRecord.create({
            data: {
              callId: recording.callSid,
              agentId: '509', // Default to agent 509
              contactId: existingContact?.contactId || 'restored-contact',
              campaignId: existingCampaign?.campaignId || 'RESTORED',
              phoneNumber: '+447487723751', // Default number
              dialedNumber: '+447487723751',
              callType: 'outbound',
              startTime: recording.dateCreated,
              endTime: new Date(recording.dateCreated.getTime() + (recording.duration * 1000)),
              duration: recording.duration,
              outcome: 'completed'
            }
          });
          newCallRecords++;
          console.log(`   ✅ Created call record: ${callRecord.id}`);
        } else {
          console.log(`   📞 Found existing call record: ${callRecord.id}`);
        }

        // Create the recording entry
        const newRecording = await prisma.recording.create({
          data: {
            callRecordId: callRecord.id,
            fileName: `recording_${recording.sid}.wav`,
            filePath: recording.uri,
            duration: recording.duration,
            format: 'wav',
            quality: 'mono',
            storageType: 'twilio',
            isEncrypted: false,
            uploadStatus: 'completed'
          }
        });

        console.log(`   ✅ Created recording: ${newRecording.id}`);
        restored++;

      } catch (recordingError) {
        console.error(`   ❌ Error processing recording ${recording.sid}:`, recordingError.message);
        errors++;
      }
    }

    console.log('\n🏁 Restoration Complete!');
    console.log(`✅ Recordings restored: ${restored}`);
    console.log(`📞 New call records created: ${newCallRecords}`);
    console.log(`⚠️  Recordings skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);

  } catch (error) {
    console.error('💥 Fatal error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  }
}

main();