/**
 * Twilio Bulk Import Service
 * Import ALL recordings from Twilio and create call records for them
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app/api';

async function importAllTwilioRecordings() {
  try {
    console.log('🔍 TWILIO BULK IMPORT PROCESS');
    console.log('===============================');
    
    // Step 1: Login as admin
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
    
    // Step 2: Check current state
    console.log('\n📊 Step 2: Current System Status');
    const currentRecordsResponse = await fetch(`${API_BASE}/call-records?page=1&limit=100`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const currentRecords = await currentRecordsResponse.json();
    console.log(`📞 Current call records in Omnivox: ${currentRecords.pagination?.total || 0}`);
    
    // Step 3: Fetch ALL recordings from Twilio via backend API
    console.log('\n🎵 Step 3: Fetch All Recordings from Twilio');
    console.log('Creating Twilio import endpoint call...');
    
    // We need to call a new endpoint that gets ALL recordings from Twilio
    const twilioImportResponse = await fetch(`${API_BASE}/call-records/import-twilio-recordings`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        daysBack: 30, // Import recordings from last 30 days
        limit: 100    // Maximum recordings to import
      })
    });
    
    if (!twilioImportResponse.ok) {
      const errorText = await twilioImportResponse.text();
      console.log('⚠️ Import endpoint not available yet. Need to create it.');
      console.log(`Response: ${twilioImportResponse.status} - ${errorText}`);
      
      // Create manual import process
      console.log('\n🔧 Step 4: Manual Import Process Required');
      console.log('The backend needs a new endpoint: /api/call-records/import-twilio-recordings');
      console.log('This endpoint should:');
      console.log('1. Call twilioService.getAllRecordings()');
      console.log('2. For each Twilio recording:');
      console.log('   - Create a call record if none exists');
      console.log('   - Download and store the recording file');
      console.log('   - Link the recording to the call record');
      console.log('3. Return count of imported recordings');
      
      return;
    }
    
    const importResult = await twilioImportResponse.json();
    console.log('✅ Twilio import completed');
    console.log(`📊 Import result: ${JSON.stringify(importResult, null, 2)}`);
    
    // Step 5: Verify results
    console.log('\n📊 Step 5: Verify Import Results');
    const finalRecordsResponse = await fetch(`${API_BASE}/call-records?page=1&limit=100`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const finalRecords = await finalRecordsResponse.json();
    console.log(`📞 Call records after import: ${finalRecords.pagination?.total || 0}`);
    
    if (finalRecords.records?.length > 0) {
      console.log('\n📋 Sample imported records:');
      finalRecords.records.slice(0, 5).forEach((record, i) => {
        console.log(`  ${i + 1}. ${record.phoneNumber} - ${new Date(record.startTime).toLocaleDateString()}`);
        console.log(`     Duration: ${record.duration}s - Recording: ${record.recordingFile ? 'Yes' : 'No'}`);
      });
    }
    
    console.log('\n✅ Twilio bulk import process complete');
    
  } catch (error) {
    console.error('❌ Error during Twilio bulk import:', error.message);
  }
}

importAllTwilioRecordings();