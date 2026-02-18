/**
 * Import ALL Twilio recordings into Omnivox - FINAL SOLUTION
 * 
 * This solves the core issue: Backend only has 1 call record while Twilio has 12+ recordings
 * 
 * Approach: Use the sync-recordings endpoint with authentication to trigger import
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app/api';

async function finalTwilioImportSolution() {
  try {
    console.log('🚀 FINAL TWILIO IMPORT SOLUTION');
    console.log('===============================');
    console.log('Goal: Import all missing Twilio recordings into Omnivox');
    console.log('Current: 1 call record | Target: 12+ call records');
    
    // Step 1: Authenticate
    console.log('\n🔐 Step 1: Authentication');
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
    console.log('✅ Admin authenticated successfully');
    
    // Step 2: Check current state
    console.log('\n📊 Step 2: Current System State');
    const beforeResponse = await fetch(`${API_BASE}/call-records?page=1&limit=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const beforeData = await beforeResponse.json();
    const beforeCount = beforeData.pagination?.total || 0;
    console.log(`📞 Call records before import: ${beforeCount}`);
    
    // Step 3: Trigger recording sync
    console.log('\n🔄 Step 3: Trigger Twilio Recording Sync');
    const syncResponse = await fetch(`${API_BASE}/call-records/sync-recordings`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (syncResponse.ok) {
      const syncData = await syncResponse.json();
      console.log('✅ Sync completed successfully');
      console.log(`📊 Sync result: ${syncData.message}`);
    } else {
      console.log('⚠️ Sync response:', await syncResponse.text());
    }
    
    // Step 4: Check if new import endpoint is available
    console.log('\n🔌 Step 4: Test New Import Endpoint');
    const importResponse = await fetch(`${API_BASE}/call-records/import-twilio-recordings`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        daysBack: 30,
        limit: 50
      })
    });
    
    if (importResponse.ok) {
      const importData = await importResponse.json();
      console.log('🎉 SUCCESS: New import endpoint working!');
      console.log(`📊 Import result: ${JSON.stringify(importData, null, 2)}`);
    } else {
      console.log('📝 Import endpoint not ready yet:', importResponse.status);
      const errorText = await importResponse.text();
      console.log(`   Response: ${errorText}`);
    }
    
    // Step 5: Verify final state
    console.log('\n📊 Step 5: Final Verification');
    const afterResponse = await fetch(`${API_BASE}/call-records?page=1&limit=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const afterData = await afterResponse.json();
    const afterCount = afterData.pagination?.total || 0;
    console.log(`📞 Call records after import: ${afterCount}`);
    console.log(`📈 Increase: +${afterCount - beforeCount} new records`);
    
    if (afterData.records?.length > 0) {
      console.log('\n📋 Sample Call Records:');
      afterData.records.slice(0, 5).forEach((record, i) => {
        console.log(`   ${i + 1}. ${record.phoneNumber} - ${record.duration}s - ${new Date(record.startTime).toLocaleDateString()}`);
        console.log(`      Recording: ${record.recordingFile ? 'YES' : 'NO'} | Campaign: ${record.campaign?.name || 'Unknown'}`);
      });
    }
    
    // Generate final status report
    console.log('\n🎯 FINAL STATUS REPORT');
    console.log('=====================');
    
    if (afterCount > beforeCount) {
      console.log('✅ SUCCESS: New Twilio recordings imported!');
      console.log(`📊 Before: ${beforeCount} | After: ${afterCount} | New: +${afterCount - beforeCount}`);
      console.log('🎵 Twilio recordings are now accessible in Omnivox');
    } else if (afterCount === beforeCount && beforeCount > 1) {
      console.log('✅ COMPLETE: All Twilio recordings already in system');
      console.log(`📊 Total call records: ${afterCount}`);
      console.log('🎵 No new imports needed');
    } else {
      console.log('⚠️ INCOMPLETE: Twilio recordings still need importing');
      console.log('🔧 Next steps:');
      console.log('   1. Check Twilio credentials configuration');
      console.log('   2. Ensure Twilio account has recordings');
      console.log('   3. Try new import endpoint when deployed');
    }
    
    console.log('\n❗ REMEMBER: Frontend authentication fix still needed');
    console.log('   Issue: Frontend not sending Bearer tokens with API requests');
    console.log('   Result: Call records page appears empty even when data exists');
    console.log('   Fix required: Frontend authentication context token handling');
    
  } catch (error) {
    console.error('❌ Error in final import solution:', error.message);
  }
}

finalTwilioImportSolution();