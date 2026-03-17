/**
 * Execute the public cleanup script for call records data
 */

const fetch = require('node-fetch');

async function executeCleanup() {
  console.log('🧹 EXECUTING CALL RECORDS CLEANUP');
  console.log('===================================\n');

  console.log('⏰ Waiting 2 minutes for Railway deployment...');
  await new Promise(resolve => setTimeout(resolve, 120000)); // Wait 2 minutes

  try {
    console.log('🔧 Calling public cleanup endpoint...');
    
    const response = await fetch('https://froniterai-production.up.railway.app/api/admin-setup/fix-call-records-public', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    console.log('📊 Response status:', response.status);
    
    if (response.status === 404) {
      console.log('❌ Endpoint not found - Railway still deploying');
      console.log('⏰ Try again in a few minutes or check Railway logs');
      return;
    }
    
    const result = await response.text();
    console.log('📋 Response:', result);
    
    if (response.ok) {
      try {
        const jsonResult = JSON.parse(result);
        console.log('\n🎉 CLEANUP SUCCESSFUL!');
        console.log('📊 Results:', JSON.stringify(jsonResult.results, null, 2));
        
        if (jsonResult.results?.finalStats) {
          const stats = jsonResult.results.finalStats;
          console.log('\n📈 FINAL STATISTICS:');
          console.log(`- Total calls: ${stats.totalCalls}`);
          console.log(`- Calls with agents: ${stats.callsWithAgents}/${stats.totalCalls}`);
          console.log(`- Calls with phone numbers: ${stats.callsWithPhones}/${stats.totalCalls}`);
          console.log(`- John Turner contacts remaining: ${stats.johnTurnerRemaining}`);
        }
        
        console.log('\n✅ CLEANUP COMPLETE! Historical call records have been fixed.');
        console.log('🔄 Refresh the Omnivox Reports page to see corrected data.');
        
      } catch (e) {
        console.log('✅ Cleanup completed but response was not JSON');
      }
    } else {
      console.error('❌ Cleanup failed with status:', response.status);
      console.error('Response:', result);
    }

  } catch (error) {
    console.error('❌ Error executing cleanup:', error);
  }
}

executeCleanup();