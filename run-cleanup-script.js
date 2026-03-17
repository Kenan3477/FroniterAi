/**
 * Simple admin API endpoint caller - calls our Railway admin endpoints
 */

const fetch = require('node-fetch');

async function callAdminEndpoint(endpoint, description) {
  console.log(`\n📞 Calling ${description}...`);
  
  try {
    const response = await fetch(`https://froniterai-production.up.railway.app${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    console.log(`Status: ${response.status}`);
    
    if (response.status === 404) {
      console.log(`❌ Endpoint not found - Railway still deploying or endpoint doesn't exist`);
      return false;
    } else if (response.status === 401) {
      console.log(`❌ Unauthorized - Admin endpoint requires authentication`);
      return false;
    } else {
      const result = await response.text();
      console.log(`Response:`, result.substring(0, 500) + (result.length > 500 ? '...' : ''));
      
      if (response.ok) {
        try {
          const jsonResult = JSON.parse(result);
          if (jsonResult.results) {
            console.log('✅ Success! Results:', JSON.stringify(jsonResult.results, null, 2));
          }
        } catch (e) {
          // Response wasn't JSON
        }
        return true;
      }
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error calling ${description}:`, error.message);
    return false;
  }
}

async function runCleanupScript() {
  console.log('🧹 RUNNING CALL RECORDS CLEANUP');
  console.log('================================\n');

  console.log('⏰ Waiting for Railway deployment to complete...');
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds for deployment
  
  // Try the admin setup endpoint first
  const setupSuccess = await callAdminEndpoint('/api/admin-setup/fix-call-records', 'Admin Setup Fix Endpoint');
  
  if (setupSuccess) {
    console.log('\n🎉 CLEANUP COMPLETED VIA ADMIN ENDPOINT!');
    return;
  }

  // If the admin setup endpoint doesn't work, let's try other approaches
  console.log('\n💡 Admin endpoint not available. Alternatives:');
  console.log('1. Wait longer for Railway deployment (can take up to 5 minutes)');
  console.log('2. The admin endpoint might need authentication tokens');
  console.log('3. Run the fix directly through Railway\'s database console');
  
  console.log('\n📋 MANUAL VERIFICATION STEPS:');
  console.log('1. Make a new call through Omnivox frontend');
  console.log('2. Check if the call shows proper agent, contact, and phone number');
  console.log('3. If new calls work but old data is still wrong, the cleanup script is needed');
  
  console.log('\n⚡ IMMEDIATE ACTION:');
  console.log('Try making a test call now to see if the authentication fix resolved the issue!');
}

runCleanupScript();