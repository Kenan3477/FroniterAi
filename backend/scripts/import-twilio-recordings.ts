/**
 * Twilio Recordings Import Script
 * Imports all Twilio recordings as call records directly into the database
 * Run this in the backend environment to populate missing call records
 */

import { getAllRecordings } from '../src/services/twilioService';
import { prisma } from '../src/database/index';

async function importAllTwilioRecordings() {
  try {
    console.log('🔄 Starting Twilio recordings import...');
    
    // Step 1: Get all recordings from Twilio
    console.log('📡 Fetching recordings from Twilio...');
    const twilioRecordings = await getAllRecordings(100, 30); // Last 30 days, max 100
    
    console.log(`📊 Found ${twilioRecordings.length} recordings in Twilio`);
    
    if (twilioRecordings.length === 0) {
      console.log('⚠️  No recordings found in Twilio. Check:');
      console.log('   • Twilio credentials are configured');
      console.log('   • Date range (last 30 days)');
      console.log('   • Twilio account has recordings');
      return;
    }
    
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Step 2: Ensure campaign exists
    await prisma.campaign.upsert({
      where: { campaignId: 'IMPORTED-TWILIO' },
      update: {},
      create: {
        campaignId: 'IMPORTED-TWILIO',
        name: 'Imported Twilio Recordings',
        description: 'Call recordings imported from Twilio account',
        status: 'Active',
        dialMethod: 'Manual',
        speed: 1,
        dropPercentage: 0,
        recordCalls: true,
        allowTransfers: false,
        abandonRateThreshold: 0.05,
        pacingMultiplier: 1,
        maxCallsPerAgent: 1,
        isActive: true,
        isDeleted: false
      }
    });
    
    // Step 3: Process each recording
    for (const recording of twilioRecordings) {
      try {
        console.log(`🔄 Processing recording: ${recording.sid} (${recording.duration}s)`);
        
        // Check if call record already exists
        const existingCall = await prisma.callRecord.findFirst({
          where: {
            OR: [
              { callId: recording.callSid },
              { callId: recording.sid }
            ]
          }
        });
        
        if (existingCall) {
          console.log(`⏭️  Call record already exists for ${recording.callSid}`);
          skippedCount++;
          continue;
        }
        
        const contactId = `imported-${recording.callSid.replace(/[^a-zA-Z0-9]/g, '')}`;
        
        // Create contact record
        await prisma.contact.upsert({
          where: { contactId },
          update: {},
          create: {
            contactId,
            firstName: 'Imported',
            lastName: 'Contact',
            phone: 'Unknown',
            email: null
          }
        });
        
        // Create call record
        const callRecord = await prisma.callRecord.create({
          data: {
            callId: recording.callSid,
            agentId: null,
            contactId,
            campaignId: 'IMPORTED-TWILIO',
            phoneNumber: 'Unknown',
            dialedNumber: 'Unknown',
            callType: 'outbound',
            startTime: recording.dateCreated,
            endTime: new Date(recording.dateCreated.getTime() + (parseInt(recording.duration) * 1000)),
            duration: parseInt(recording.duration) || 0,
            outcome: 'completed',
            dispositionId: null,
            notes: `Imported from Twilio. Original recording SID: ${recording.sid}`,
            recording: recording.url,
            transferTo: null
          }
        });
        
        // Create recording file entry
        await prisma.recording.create({
          data: {
            callRecordId: callRecord.id,
            fileName: `twilio-${recording.sid}.mp3`,
            duration: parseInt(recording.duration) || 0,
            uploadStatus: 'completed',
            fileUrl: recording.url
          }
        });
        
        console.log(`✅ Imported: ${recording.sid} → Call ID: ${recording.callSid}`);
        importedCount++;
        
      } catch (recordingError) {
        console.error(`❌ Error importing ${recording.sid}:`, recordingError);
        errorCount++;
      }
    }
    
    // Step 4: Summary
    console.log('\n📊 IMPORT SUMMARY');
    console.log('================');
    console.log(`✅ Successfully imported: ${importedCount}`);
    console.log(`⏭️  Already existed (skipped): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total Twilio recordings: ${twilioRecordings.length}`);
    
    // Verify final count
    const totalCallRecords = await prisma.callRecord.count();
    console.log(`📞 Total call records in database: ${totalCallRecords}`);
    
    if (importedCount > 0) {
      console.log('\n🎉 SUCCESS: Twilio recordings imported!');
      console.log('📱 Next step: Fix frontend authentication to see all records');
    }
    
  } catch (error) {
    console.error('❌ Error during Twilio import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
if (require.main === module) {
  importAllTwilioRecordings()
    .then(() => {
      console.log('✅ Twilio import script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Twilio import script failed:', error);
      process.exit(1);
    });
}

export default importAllTwilioRecordings;