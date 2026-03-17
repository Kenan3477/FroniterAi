#!/usr/bin/env node

// Test script to test our frontend API proxy fix
const fetch = require('node-fetch');

async function testProxyFix() {
  try {
    console.log('🔍 Testing frontend API proxy fix...');
    
    const campaignUUID = 'cmjlwtm260006a49neir3ui93';
    
    console.log('\n📞 Testing Frontend API Proxy with UUID');
    const response = await fetch('http://localhost:3001/api/admin/campaign-management/campaigns/cmjlwtm260006a49neir3ui93/dial-method', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dialMethod: 'MANUAL_PREVIEW' }),
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('🎉 SUCCESS: Frontend API proxy is working!');
      
      // Verify the change was persisted
      console.log('\n🔍 Verifying persistence by checking backend directly...');
      const BACKEND_URL = 'https://froniterai-production.up.railway.app';
      const verifyResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`);
      const verifyData = await verifyResponse.json();
      
      const dacCampaign = verifyData.data.find(c => c.name.includes('DAC'));
      console.log('DAC Campaign dial method:', dacCampaign?.dialMethod);
      
      if (dacCampaign?.dialMethod === 'MANUAL_PREVIEW') {
        console.log('✅ PERSISTENCE CONFIRMED: Change was saved to backend!');
      } else {
        console.log('❌ PERSISTENCE FAILED: Change was not saved');
      }
    } else {
      console.log('❌ FAILED: Frontend API proxy still not working');
    }
    
  } catch (error) {
    console.error('❌ Error testing proxy fix:', error);
  }
}

testProxyFix();