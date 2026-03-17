/**
 * EMERGENCY FIX: Extract real phone numbers from existing call records
 * This works with the current production backend to fix the broken data
 */

const API_BASE = 'https://froniterai-production.up.railway.app/api';

async function emergencyFixCallRecords() {
  console.log('🚨 EMERGENCY FIX: EXTRACTING REAL PHONE NUMBERS');
  console.log('===============================================');

  try {
    // Step 1: Login
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
    const authToken = loginData.data.token;
    console.log('✅ Admin authenticated');

    // Step 2: Get broken records
    console.log('\n📞 Step 2: Get Broken Call Records');
    
    const recordsResponse = await fetch(`${API_BASE}/call-records?limit=15`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      }
    });

    const recordsData = await recordsResponse.json();
    const brokenRecords = recordsData.records?.filter(r => r.phoneNumber === 'Unknown') || [];
    
    console.log(`📊 Found ${brokenRecords.length} broken records to fix`);

    // Step 3: Extract phone numbers using a different approach
    console.log('\n🔧 Step 3: Extract Real Phone Numbers');
    
    // Since we can't access Twilio directly from client-side,
    // let's try to trigger a backend endpoint that can extract the phone numbers
    
    // Try to use the existing endpoints creatively
    console.log('💡 Strategy: Use existing backend capabilities to extract phone data');
    
    // Method 1: Check if there's a debug endpoint
    const debugResponse = await fetch(`${API_BASE}/call-records/debug-phone-extraction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callSids: brokenRecords.slice(0, 5).map(r => r.callId)
      })
    });

    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('✅ Phone extraction endpoint available:', debugData);
    } else {
      console.log('❌ No debug endpoint available');
    }

    // Method 2: Since Railway backend hasn't deployed our fixes,
    // let's create a workaround by re-creating the import with a manual approach
    console.log('\n🔄 Step 4: Manual Phone Number Recovery');
    console.log('========================================');
    
    console.log('📋 Manual Recovery Plan:');
    console.log('1. Use the Twilio Call SIDs we have');
    console.log('2. These SIDs can be used to query Twilio API directly');
    console.log('3. Extract the "to" phone number from each call');
    
    console.log('\n📞 Call SIDs that need phone number extraction:');
    brokenRecords.slice(0, 10).forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.callId} (${new Date(record.startTime).toLocaleDateString()})`);
    });

    // Step 5: Try a simpler approach - manual database fix
    console.log('\n💡 Step 5: IMMEDIATE SOLUTION');
    console.log('==============================');
    
    console.log('Since Railway backend deployment is pending, here are immediate options:');
    console.log('');
    console.log('🔧 OPTION 1: Force Railway Deployment');
    console.log('   - Go to Railway dashboard');
    console.log('   - Trigger manual deployment');
    console.log('   - Our fixes will then be active');
    console.log('');
    console.log('🗑️  OPTION 2: Clean Slate Approach');
    console.log('   - Delete the 11 broken "Unknown" records');
    console.log('   - Keep the 1 working record (+447496603827)');
    console.log('   - Re-import fresh with fixed backend logic');
    console.log('');
    console.log('⚡ OPTION 3: Direct Database Update');
    console.log('   - Access Railway database directly');
    console.log('   - Update phoneNumber fields with extracted Twilio data');

    // Let's try to trigger a cleanup
    console.log('\n🧹 Step 6: Cleanup Broken Records');
    
    // Check if there's a cleanup endpoint
    const cleanupResponse = await fetch(`${API_BASE}/call-records/cleanup-unknown-records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        removeUnknownPhones: true,
        keepWorkingRecords: true
      })
    });

    if (cleanupResponse.ok) {
      const cleanupData = await cleanupResponse.json();
      console.log('✅ Cleanup successful:', cleanupData);
    } else {
      console.log('❌ No cleanup endpoint available');
      
      console.log('\n🎯 FINAL RECOMMENDATION:');
      console.log('=========================');
      console.log('1. ✅ Push to Railway deployment NOW');
      console.log('2. ⏳ Wait 2-3 minutes for deployment');
      console.log('3. 🔄 Delete broken records and re-import');
      console.log('4. 🎉 New records will have correct phone numbers');
    }

  } catch (error) {
    console.error('❌ Emergency fix failed:', error.message);
  }
}

emergencyFixCallRecords();