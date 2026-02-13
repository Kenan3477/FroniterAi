#!/usr/bin/env node

// Test script to verify the deployed fix
const fetch = require('node-fetch');

async function testDeployedFix() {
  try {
    console.log('🔍 Testing deployed dial method persistence fix...');
    
    // Step 1: Get current DAC campaign state
    console.log('\n📋 Step 1: Getting current DAC campaign state...');
    const BACKEND_URL = 'https://froniterai-production.up.railway.app';
    const campaignsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`);
    const campaignsData = await campaignsResponse.json();
    
    const dacCampaign = campaignsData.data.find(c => c.name.includes('DAC'));
    console.log('DAC Campaign before:', {
      id: dacCampaign?.id,
      campaignId: dacCampaign?.campaignId, 
      name: dacCampaign?.name,
      dialMethod: dacCampaign?.dialMethod
    });
    
    if (!dacCampaign) {
      console.log('❌ DAC campaign not found');
      return;
    }
    
    // Step 2: Update via frontend API proxy using UUID (deployed fix)
    console.log('\n📞 Step 2: Testing frontend API proxy with UUID (deployed)...');
    const newDialMethod = dacCampaign.dialMethod === 'MANUAL_PREVIEW' ? 'MANUAL_DIAL' : 'MANUAL_PREVIEW';
    
    const response = await fetch('https://omnivox-ai.vercel.app/api/admin/campaign-management/campaigns/cmjlwtm260006a49neir3ui93/dial-method', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dialMethod: newDialMethod }),
    });
    
    console.log('Frontend API Status:', response.status);
    const responseData = await response.json();
    console.log('Frontend API Response:', JSON.stringify(responseData, null, 2));
    
    // Step 3: Verify the change was persisted
    console.log('\n🔍 Step 3: Verifying persistence...');
    const verifyResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`);
    const verifyData = await verifyResponse.json();
    
    const updatedDacCampaign = verifyData.data.find(c => c.name.includes('DAC'));
    console.log('DAC Campaign after:', {
      id: updatedDacCampaign?.id,
      campaignId: updatedDacCampaign?.campaignId,
      name: updatedDacCampaign?.name,
      dialMethod: updatedDacCampaign?.dialMethod
    });
    
    if (response.ok && updatedDacCampaign?.dialMethod === newDialMethod) {
      console.log('🎉 SUCCESS: Dial method persistence is now working!');
      console.log(`✅ Campaign successfully changed from ${dacCampaign.dialMethod} to ${newDialMethod}`);
    } else {
      console.log('❌ FAILED: Persistence still not working');
      console.log('Expected:', newDialMethod);
      console.log('Actual:', updatedDacCampaign?.dialMethod);
    }
    
  } catch (error) {
    console.error('❌ Error testing deployed fix:', error);
  }
}

// Wait a bit for deployment to complete
console.log('⏳ Waiting 30 seconds for deployment to complete...');
setTimeout(testDeployedFix, 30000);