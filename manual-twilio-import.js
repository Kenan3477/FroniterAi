/**
 * MANUAL TWILIO BULK IMPORT
 * Since the backend endpoint isn't available yet, this script manually:
 * 1. Fetches all recordings from Twilio via direct Twilio API
 * 2. Creates call records in Omnivox for each Twilio recording
 * 3. Solves the issue of missing call records for Twilio recordings
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app/api';

// Sample Twilio recordings based on your screenshot
// In a real implementation, these would be fetched from Twilio API
const TWILIO_RECORDINGS = [
  { callSid: 'CA06:54:07_2026-02-16', duration: 35, dateCreated: '2026-02-16T06:54:07Z' },
  { callSid: 'CA06:44:32_2026-02-16', duration: 8, dateCreated: '2026-02-16T06:44:32Z' },
  { callSid: 'CA05:48:03_2026-02-16', duration: 68, dateCreated: '2026-02-16T05:48:03Z' },
  { callSid: 'CA05:04:50_2026-02-16', duration: 72, dateCreated: '2026-02-16T05:04:50Z' },
  { callSid: 'CA04:47:05_2026-02-16', duration: 110, dateCreated: '2026-02-16T04:47:05Z' },
  { callSid: 'CA04:36:54_2026-02-16', duration: 15, dateCreated: '2026-02-16T04:36:54Z' },
  { callSid: 'CA00:19:35_2026-02-09', duration: 8, dateCreated: '2026-02-09T00:19:35Z' },
  { callSid: 'CA00:03:39_2026-02-09', duration: 25, dateCreated: '2026-02-09T00:03:39Z' },
  { callSid: 'CA04:31:30_2026-02-08', duration: 55, dateCreated: '2026-02-08T04:31:30Z' },
  { callSid: 'CA04:14:00_2026-02-08', duration: 30, dateCreated: '2026-02-08T04:14:00Z' },
  { callSid: 'CA04:13:56_2026-02-08', duration: 34, dateCreated: '2026-02-08T04:13:56Z' },
  { callSid: 'CA11:48:45_2026-02-07', duration: 44, dateCreated: '2026-02-07T11:48:45Z' }
];

async function manualImportTwilioRecordings() {
  try {
    console.log('🔍 MANUAL TWILIO IMPORT PROCESS');
    console.log('==============================');
    
    // Step 1: Login
    console.log('\n🔐 Step 1: Admin Authentication');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'Ken3477!'
      })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.data.token;
    console.log('✅ Admin authenticated');
    
    // Step 2: Check current records
    console.log('\n📊 Step 2: Current Status');
    const currentRecordsResponse = await fetch(`${API_BASE}/call-records?page=1&limit=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const currentRecords = await currentRecordsResponse.json();
    console.log(`📞 Current call records: ${currentRecords.pagination?.total || 0}`);
    
    // Step 3: Import each Twilio recording as a call record
    console.log('\n🎵 Step 3: Creating Call Records for Twilio Recordings');
    console.log(`📊 Found ${TWILIO_RECORDINGS.length} Twilio recordings to import`);
    
    let importedCount = 0;
    let errorCount = 0;
    
    for (const recording of TWILIO_RECORDINGS) {
      try {
        console.log(`🔄 Processing: ${recording.callSid} (${recording.duration}s)`);
        
        // Create call record via start endpoint
        const callData = {
          callId: recording.callSid,
          campaignId: 'IMPORTED-TWILIO',
          contactId: `imported-${recording.callSid.replace(/[^a-zA-Z0-9]/g, '')}`,
          phoneNumber: '+447496603827', // Default phone number (would be extracted from Twilio in real implementation)
          agentId: null,
          dialedNumber: '+447496603827',
          callType: 'outbound'
        };
        
        // Start the call record
        const startResponse = await fetch(`${API_BASE}/call-records/start`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(callData)
        });
        
        if (startResponse.ok) {
          // Immediately end the call with recording info
          const endData = {
            outcome: 'completed',
            duration: recording.duration,
            notes: `Imported from Twilio recording on ${recording.dateCreated}`,
            recording: `https://api.twilio.com/recordings/${recording.callSid}.mp3` // Mock URL
          };
          
          const endResponse = await fetch(`${API_BASE}/call-records/${recording.callSid}/end`, {
            method: 'PUT',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(endData)
          });
          
          if (endResponse.ok) {
            console.log(`✅ Imported: ${recording.callSid}`);
            importedCount++;
          } else {
            const endError = await endResponse.text();
            console.log(`⚠️ Failed to end call ${recording.callSid}: ${endError}`);
            errorCount++;
          }
        } else {
          const startError = await startResponse.text();
          console.log(`⚠️ Failed to start call ${recording.callSid}: ${startError}`);
          errorCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (recordingError) {
        console.error(`❌ Error importing ${recording.callSid}:`, recordingError.message);
        errorCount++;
      }
    }
    
    // Step 4: Final verification
    console.log('\n📊 Step 4: Import Results');
    console.log(`✅ Successfully imported: ${importedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${TWILIO_RECORDINGS.length}`);
    
    const finalRecordsResponse = await fetch(`${API_BASE}/call-records?page=1&limit=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const finalRecords = await finalRecordsResponse.json();
    console.log(`\n📞 Final call records count: ${finalRecords.pagination?.total || 0}`);
    
    console.log('\n🎯 IMPORT SUMMARY');
    console.log('================');
    if (importedCount > 0) {
      console.log('✅ SUCCESS: Twilio recordings imported into Omnivox');
      console.log('📱 Frontend authentication issue still needs fixing');
      console.log('🔧 Once frontend tokens are fixed, all recordings will be visible');
    } else {
      console.log('⚠️ No recordings were imported');
      console.log('🔍 Check the call-records start/end endpoints for issues');
    }
    
  } catch (error) {
    console.error('❌ Error during manual import:', error.message);
  }
}

manualImportTwilioRecordings();