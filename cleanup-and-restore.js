/**
 * Clean up and restore recordings in production database
 * This will remove old call records and restore recordings from Twilio
 */

const twilio = require('twilio');
const { PrismaClient } = require('@prisma/client');

// Use Railway environment DATABASE_URL
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🚀 Starting database cleanup and recording restoration...');
    
    // First, check current state
    const beforeCount = await prisma.callRecord.count();
    const beforeRecordings = await prisma.recording.count();
    console.log(`📊 Current state: ${beforeCount} call records, ${beforeRecordings} recordings`);

    // Clean up old call records with invalid recordings
    console.log('🧹 Cleaning up old call records...');
    
    // Delete all recordings first
    await prisma.recording.deleteMany({});
    console.log('✅ Deleted all recordings');
    
    // Delete all call records 
    await prisma.callRecord.deleteMany({});
    console.log('✅ Deleted all call records');

    // Now restore from Twilio using existing campaigns and contacts
    console.log('🎵 Starting Twilio restoration...');

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('❌ Twilio credentials not found');
    }

    const client = twilio(accountSid, authToken);
    const recordings = await client.recordings.list();
    console.log(`📞 Found ${recordings.length} recordings in Twilio`);

    // Get existing campaign and contact
    const existingCampaign = await prisma.campaign.findFirst();
    const existingContact = await prisma.contact.findFirst();

    if (!existingCampaign || !existingContact) {
      console.log('⚠️  No existing campaign or contact found. Creating defaults...');
      
      // Create default campaign
      await prisma.campaign.upsert({
        where: { campaignId: 'DAC' },
        update: {},
        create: {
          campaignId: 'DAC',
          name: 'DAC',
          description: 'Default campaign',
          status: 'Active',
          isActive: true
        }
      });

      // Create default contact
      await prisma.contact.upsert({
        where: { contactId: 'restored-contact' },
        update: {},
        create: {
          contactId: 'restored-contact',
          listId: 'DAC-LIST',
          firstName: 'Kenan',
          lastName: 'Davies',
          phone: '+447487723751',
          status: 'completed'
        }
      });
    }

    let restored = 0;
    let callRecordsCreated = 0;

    for (const recording of recordings) {
      try {
        console.log(`🎵 Processing ${recording.sid}...`);

        // Create call record
        const callRecord = await prisma.callRecord.create({
          data: {
            callId: recording.callSid,
            agentId: '509',
            contactId: existingContact?.contactId || 'restored-contact',
            campaignId: existingCampaign?.campaignId || 'DAC',
            phoneNumber: '+447487723751',
            dialedNumber: '+447487723751',
            callType: 'outbound',
            startTime: recording.dateCreated,
            endTime: new Date(recording.dateCreated.getTime() + (recording.duration * 1000)),
            duration: recording.duration,
            outcome: 'completed'
          }
        });
        callRecordsCreated++;

        // Create recording
        await prisma.recording.create({
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
        restored++;

        console.log(`   ✅ Restored ${recording.sid}`);

      } catch (error) {
        console.error(`   ❌ Error processing ${recording.sid}:`, error.message);
      }
    }

    console.log('\\n🏁 Restoration Complete!');
    console.log(`✅ Call records created: ${callRecordsCreated}`);
    console.log(`✅ Recordings restored: ${restored}`);

  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();