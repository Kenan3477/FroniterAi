#!/usr/bin/env node

// Test script to debug campaign dial method persistence
const fetch = require('node-fetch');

const BACKEND_URL = process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

async function testDialMethodPersistence() {
  try {
    console.log('🔍 Testing campaign dial method persistence...');
    
    // Step 1: Get all campaigns
    console.log('\n📋 Step 1: Fetching all campaigns...');
    const campaignsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`);
    const campaignsData = await campaignsResponse.json();
    
    console.log('Campaigns response status:', campaignsResponse.status);
    console.log('Campaigns data:', JSON.stringify(campaignsData, null, 2));
    
    if (!campaignsData.success || !campaignsData.data || campaignsData.data.length === 0) {
      console.log('❌ No campaigns found or API error');
      return;
    }
    
    // Find the DAC campaign
    const dacCampaign = campaignsData.data.find(c => c.name === 'DAC' || c.name.includes('DAC'));
    
    if (!dacCampaign) {
      console.log('❌ DAC campaign not found');
      console.log('Available campaigns:', campaignsData.data.map(c => ({ id: c.id, campaignId: c.campaignId, name: c.name })));
      return;
    }
    
    console.log('✅ Found DAC campaign:', {
      id: dacCampaign.id,
      campaignId: dacCampaign.campaignId,
      name: dacCampaign.name,
      currentDialMethod: dacCampaign.dialMethod
    });
    
    // Step 2: Update dial method using UUID (like frontend does)
    console.log('\n📞 Step 2: Updating dial method using UUID...');
    const updateResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${dacCampaign.id}/dial-method`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dialMethod: 'MANUAL_PREVIEW' }),
    });
    
    console.log('Update response status:', updateResponse.status);
    const updateData = await updateResponse.json();
    console.log('Update response data:', JSON.stringify(updateData, null, 2));
    
    // Step 3: Try with campaignId if UUID failed
    if (updateResponse.status === 404) {
      console.log('\n🔄 Step 3: UUID failed, trying with campaignId...');
      const updateResponse2 = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${dacCampaign.campaignId}/dial-method`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dialMethod: 'MANUAL_PREVIEW' }),
      });
      
      console.log('Update response status (campaignId):', updateResponse2.status);
      const updateData2 = await updateResponse2.json();
      console.log('Update response data (campaignId):', JSON.stringify(updateData2, null, 2));
    }
    
    // Step 4: Verify the change
    console.log('\n🔍 Step 4: Verifying the change...');
    const verifyResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`);
    const verifyData = await verifyResponse.json();
    
    const updatedDacCampaign = verifyData.data.find(c => c.name === 'DAC' || c.name.includes('DAC'));
    
    if (updatedDacCampaign) {
      console.log('✅ Updated DAC campaign:', {
        id: updatedDacCampaign.id,
        campaignId: updatedDacCampaign.campaignId,
        name: updatedDacCampaign.name,
        dialMethod: updatedDacCampaign.dialMethod
      });
      
      if (updatedDacCampaign.dialMethod === 'MANUAL_PREVIEW') {
        console.log('🎉 SUCCESS: Dial method was updated and persisted!');
      } else {
        console.log('❌ FAILED: Dial method was not updated or reverted');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing dial method persistence:', error);
  }
}

testDialMethodPersistence();