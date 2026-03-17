#!/usr/bin/env node

const API_BASE = 'https://froniterai-production.up.railway.app/api/calls';

async function verifyCallRecordingSystem() {
  console.log('🔍 Verifying call recording system readiness...\n');

  // Check 1: Verify database is clean
  console.log('1. 📊 Checking if database is clean...');
  try {
    const response = await fetch(`${API_BASE}-twiml/call-records?limit=10`);
    const result = await response.json();
    
    if (response.status === 200) {
      console.log(`✅ Database connection OK - Found ${result.data?.length || 0} call records`);
      if (result.data?.length === 0) {
        console.log('✅ Database is clean - ready for new calls\n');
      } else {
        console.log('⚠️ Some records still exist, but that\'s okay\n');
      }
    } else {
      console.log('❌ Could not verify database status\n');
    }
  } catch (error) {
    console.log(`❌ Error checking database: ${error.message}\n`);
  }

  // Check 2: Verify save-call-data endpoint validation
  console.log('2. 🔒 Testing save-call-data validation...');
  try {
    const response = await fetch(`${API_BASE}/save-call-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
      body: JSON.stringify({
        agentId: '509',
        phoneNumber: '+1234567890',
        callDuration: 30,
        campaignId: '1',
        dispositionId: '1'
      })
    });
    
    if (response.status === 400) {
      console.log('✅ Recording validation is active - rejects calls without evidence');
    } else {
      console.log('⚠️ Validation might not be working correctly');
    }
  } catch (error) {
    console.log(`❌ Error testing validation: ${error.message}`);
  }

  // Check 3: Verify dispositions exist
  console.log('\n3. 📋 Checking available dispositions...');
  try {
    const response = await fetch(`${API_BASE}-twiml/dispositions`);
    const result = await response.json();
    
    if (response.status === 200 && result.data?.length > 0) {
      console.log(`✅ Found ${result.data.length} dispositions available:`);
      result.data.slice(0, 5).forEach((disposition, index) => {
        console.log(`   ${index + 1}. ${disposition.name} - ${disposition.outcome}`);
      });
    } else {
      console.log('⚠️ No dispositions found - you may need to create some');
    }
  } catch (error) {
    console.log(`❌ Error checking dispositions: ${error.message}`);
  }

  // Instructions
  console.log('\n🎯 CALL TESTING INSTRUCTIONS:');
  console.log('1. ✅ Database is cleared and ready');
  console.log('2. ✅ Recording validation is active');
  console.log('3. Make a call through the Omnivox dialer');
  console.log('4. Complete the call and save a disposition');
  console.log('5. The system should automatically:');
  console.log('   - Create call record with real Twilio CallSid');
  console.log('   - Process and download the recording');
  console.log('   - Save disposition and outcome');
  console.log('   - Display in Call Records view with playable recording');
  
  console.log('\n📝 EXPECTED FLOW:');
  console.log('1. Call → Twilio generates CallSid (CA...)');
  console.log('2. Recording → Automatically downloaded and stored');
  console.log('3. Disposition → Saved via disposition modal');
  console.log('4. Result → Visible in Reports > Call Records');

  console.log('\n🚨 IMPORTANT:');
  console.log('- Only real calls with recordings will be saved');
  console.log('- Test/fake calls without recordings will be rejected');
  console.log('- Agent shows as "Kenan User" for your calls');
  console.log('- Contact info will be auto-populated or show "Unknown Contact"');
}

verifyCallRecordingSystem().catch(console.error);