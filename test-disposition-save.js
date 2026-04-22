/**
 * Test Disposition Save - Diagnose disposition saving issues
 * 
 * This script simulates exactly what the frontend sends to the backend
 * when saving a disposition after a call.
 */

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

// Test data matching what frontend sends
const testDispositionSave = {
  callSid: 'CA1234567890abcdef1234567890abcdef', // Test Twilio SID
  duration: 125, // 2 minutes 5 seconds
  disposition: {
    id: 1, // Replace with actual disposition ID from your database
    name: 'Interested',
    outcome: 'interested'
  },
  dispositionId: 1, // Explicit disposition ID
  notes: 'Customer wants callback next week',
  followUpRequired: true,
  followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  phoneNumber: '+447714333569',
  agentId: '509' // Your agent ID
};

console.log('🧪 Testing Disposition Save');
console.log('=' .repeat(80));
console.log('\n📤 Request data:');
console.log(JSON.stringify(testDispositionSave, null, 2));
console.log('\n🌐 Calling:', `${BACKEND_URL}/api/calls/save-call-data`);
console.log('=' .repeat(80));

async function runDispositionSaveTest() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/calls/save-call-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testDispositionSave)
    });

    console.log('\n📊 Response Status:', response.status, response.statusText);
    
    const result = await response.json();
    
    console.log('\n📨 Response Body:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ SUCCESS: Disposition saved successfully!');
      
      if (result.debug) {
        console.log('\n🔍 Debug Information:');
        console.log('  - Campaign ID:', result.debug.campaignId);
        console.log('  - Received Disposition ID:', result.debug.receivedDispositionId);
        console.log('  - Validated Disposition ID:', result.debug.validatedDispositionId);
        console.log('  - Disposition Found:', result.debug.validationDebug?.dispositionFound);
        console.log('  - Campaign Link Found:', result.debug.validationDebug?.campaignLinkFound);
        console.log('  - Auto-Fix Attempted:', result.debug.validationDebug?.autoFixAttempted);
        console.log('  - Auto-Fix Success:', result.debug.validationDebug?.autoFixSuccess);
        
        if (result.debug.validationDebug?.errors?.length > 0) {
          console.log('\n⚠️  Validation Errors:');
          result.debug.validationDebug.errors.forEach(err => console.log('    -', err));
        }
      }
      
      if (result.warning) {
        console.log('\n⚠️  Warning:', result.warning);
      }
      
    } else {
      console.log('\n❌ FAILED: Disposition save failed');
      console.log('  Error:', result.error);
      console.log('  Message:', result.message);
      console.log('  Details:', result.details);
    }
    
  } catch (error) {
    console.error('\n❌ REQUEST FAILED:', error.message);
    console.error('Full error:', error);
  }
}

// Also test with a conf-xxx call ID (what makeRestApiCall creates)
async function testWithConfCallId() {
  const confTestData = {
    ...testDispositionSave,
    callSid: 'conf-1713800000000-abc123' // Conference call format
  };
  
  console.log('\n\n' + '='.repeat(80));
  console.log('🧪 Testing with Conference Call ID (conf-xxx format)');
  console.log('='.repeat(80));
  console.log('\n📤 Request data:');
  console.log(JSON.stringify(confTestData, null, 2));
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/calls/save-call-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(confTestData)
    });

    console.log('\n📊 Response Status:', response.status, response.statusText);
    
    const result = await response.json();
    
    console.log('\n📨 Response Body:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ SUCCESS with conf-xxx call ID!');
    } else {
      console.log('\n❌ FAILED with conf-xxx call ID');
      console.log('  Error:', result.error);
    }
    
  } catch (error) {
    console.error('\n❌ REQUEST FAILED:', error.message);
  }
}

// Run tests
(async () => {
  console.log('\n🚀 Starting Disposition Save Tests\n');
  
  await runDispositionSaveTest();
  await testWithConfCallId();
  
  console.log('\n\n' + '='.repeat(80));
  console.log('✅ Tests Complete');
  console.log('='.repeat(80));
  console.log('\nNext Steps:');
  console.log('1. Check if disposition ID exists in your database');
  console.log('2. Verify the disposition is linked to the "Manual Dialing" campaign');
  console.log('3. If auto-fix failed, check campaign_dispositions table');
  console.log('4. Check Railway logs for detailed error messages');
  console.log('\nTo check your dispositions, run:');
  console.log('  node check-available-dispositions.js');
})();
