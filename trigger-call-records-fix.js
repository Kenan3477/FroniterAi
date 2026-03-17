/**
 * Script to trigger the call records data fix via admin API endpoint
 */

const fetch = require('node-fetch');

async function triggerCallRecordsFix() {
  console.log('🔧 Triggering call records data fix via Railway API...\n');
  
  try {
    // First, let's try without authentication to see if the endpoint is accessible
    const response = await fetch('https://froniterai-production.up.railway.app/api/admin-setup/fix-call-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const result = await response.text();
    console.log('Response body:', result);
    
    if (response.ok) {
      console.log('✅ Call records fix triggered successfully!');
      try {
        const jsonResult = JSON.parse(result);
        console.log('\n📊 Fix Results:', JSON.stringify(jsonResult, null, 2));
      } catch (e) {
        console.log('Response was not JSON:', result);
      }
    } else {
      console.log('❌ Failed to trigger fix:', response.status, result);
      
      // If it's a 401, suggest the endpoint might need to be added to public routes
      if (response.status === 401) {
        console.log('\n💡 This might be an authentication issue. The endpoint might need to be made public or we need to add auth tokens.');
      }
    }
    
  } catch (error) {
    console.error('❌ Error triggering call records fix:', error);
  }
}

// Alternative: Direct database fix (if API doesn't work)
async function directDatabaseFix() {
  console.log('\\n🔧 Attempting direct database fix...');
  
  try {
    const { fixProductionCallRecords } = require('./backend/scripts/fix-call-records.js');
    const result = await fixProductionCallRecords();
    console.log('✅ Direct database fix completed:', result);
  } catch (error) {
    console.error('❌ Direct database fix failed:', error);
  }
}

// Run both approaches
async function runFix() {
  console.log('🚀 CALL RECORDS DATA FIX');
  console.log('========================\n');
  
  // Try API first
  await triggerCallRecordsFix();
  
  // If that doesn't work, we can uncomment this for direct database access
  // await directDatabaseFix();
  
  console.log('\\n✅ Fix process completed. Check the Railway logs for detailed results.');
}

runFix();