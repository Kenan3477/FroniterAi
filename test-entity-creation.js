/**
 * Test Entity Creation for Twilio Import
 * Debug exactly what's failing in the campaign/list creation
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app/api';

async function testEntityCreation() {
  try {
    console.log('🧪 TESTING ENTITY CREATION');
    console.log('==========================');
    
    // Authenticate
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
    
    // Test single import with minimal data to see specific error
    console.log('\n🔍 Testing import with limit=1 to see specific error');
    const importResponse = await fetch(`${API_BASE}/call-records/import-twilio-recordings`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        daysBack: 30,
        limit: 1
      })
    });
    
    const importData = await importResponse.json();
    console.log('Import response:', JSON.stringify(importData, null, 2));
    
    // Check if entities were created after the attempt
    console.log('\n📋 Checking if entities exist after import attempt...');
    
    const campaignsResponse = await fetch(`${API_BASE}/campaigns`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const campaignsData = await campaignsResponse.json();
    
    const importedCampaign = campaignsData.data?.find(c => c.campaignId === 'IMPORTED-TWILIO');
    if (importedCampaign) {
      console.log('✅ IMPORTED-TWILIO campaign exists:', importedCampaign.name);
    } else {
      console.log('❌ IMPORTED-TWILIO campaign NOT found');
      console.log('Available campaigns:', campaignsData.data?.map(c => c.campaignId));
    }
    
    // Since we can't check data lists directly via API, let's see if we can create a simpler test
    
    // Test manual campaign creation via existing API
    console.log('\n🔧 Testing manual campaign creation...');
    
    // The import might be failing due to Twilio credentials or data format issues
    // rather than entity creation issues
    
    console.log('\n🎯 ANALYSIS:');
    console.log('If campaign still doesn\'t exist after import attempt:');
    console.log('1. The import loop never starts (Twilio API issue)');
    console.log('2. Entity creation happens but fails silently');  
    console.log('3. Database constraints preventing creation');
    console.log('4. Transaction rollback due to later errors');
    
    console.log('\nNext steps:');
    console.log('- Check if Twilio credentials are configured correctly');
    console.log('- Verify Twilio API is returning valid recording data');
    console.log('- Test entity creation independently of Twilio data');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testEntityCreation();