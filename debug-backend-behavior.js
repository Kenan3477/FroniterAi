#!/usr/bin/env node

// Test what the backend is actually doing
const fetch = require('node-fetch');

async function debugBackendBehavior() {
  try {
    console.log('🔍 Debugging what backend is actually doing...');
    
    const BACKEND_URL = 'https://froniterai-production.up.railway.app';
    const campaignId = 'campaign_1766695393511';
    
    // Step 1: Get current state
    console.log('\n📋 Step 1: Getting current state...');
    let campaignsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`);
    let campaignsData = await campaignsResponse.json();
    let dacCampaign = campaignsData.data.find(c => c.name.includes('DAC'));
    console.log('Current dialMethod:', dacCampaign?.dialMethod);
    
    // Step 2: Update directly via backend
    console.log('\n📞 Step 2: Update directly via backend...');
    const updateResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${campaignId}/dial-method`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dialMethod: 'MANUAL_DIAL' }),
    });
    
    console.log('Update Status:', updateResponse.status);
    const updateData = await updateResponse.json();
    console.log('Update Response:', JSON.stringify(updateData, null, 2));
    
    // Step 3: Check immediately after
    console.log('\n🔍 Step 3: Checking state immediately after update...');
    campaignsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`);
    campaignsData = await campaignsResponse.json();
    dacCampaign = campaignsData.data.find(c => c.name.includes('DAC'));
    console.log('Dial method after update:', dacCampaign?.dialMethod);
    
    // Step 4: Wait and check again
    console.log('\n⏳ Step 4: Waiting 5 seconds and checking again...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    campaignsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`);
    campaignsData = await campaignsResponse.json();
    dacCampaign = campaignsData.data.find(c => c.name.includes('DAC'));
    console.log('Dial method after 5 seconds:', dacCampaign?.dialMethod);
    
    if (dacCampaign?.dialMethod === 'MANUAL_DIAL') {
      console.log('✅ Backend update is working and persistent!');
    } else {
      console.log('❌ Backend update is not working or not persistent');
    }
    
  } catch (error) {
    console.error('❌ Error debugging backend behavior:', error);
  }
}

debugBackendBehavior();