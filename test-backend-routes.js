#!/usr/bin/env node

// Test script to debug backend dial-method route specifically
const fetch = require('node-fetch');

const BACKEND_URL = process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

async function testBackendRoutes() {
  try {
    console.log('🔍 Testing backend dial-method route behavior...');
    
    const campaignUUID = 'cmjlwtm260006a49neir3ui93';
    const campaignId = 'campaign_1766695393511';
    
    console.log('\n📞 Test 1: Update dial method using UUID (what frontend does)');
    const response1 = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${campaignUUID}/dial-method`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dialMethod: 'MANUAL_PREVIEW' }),
    });
    
    console.log('Status:', response1.status);
    const data1 = await response1.json();
    console.log('Response:', JSON.stringify(data1, null, 2));
    
    console.log('\n📞 Test 2: Update dial method using campaignId (string)');
    const response2 = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${campaignId}/dial-method`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dialMethod: 'MANUAL_PREVIEW' }),
    });
    
    console.log('Status:', response2.status);
    const data2 = await response2.json();
    console.log('Response:', JSON.stringify(data2, null, 2));
    
    console.log('\n🔍 Test 3: Get single campaign using UUID');
    const response3 = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${campaignUUID}`);
    console.log('Status:', response3.status);
    const data3 = await response3.json();
    console.log('Response:', JSON.stringify(data3, null, 2));
    
    console.log('\n🔍 Test 4: Get single campaign using campaignId');
    const response4 = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${campaignId}`);
    console.log('Status:', response4.status);
    const data4 = await response4.json();
    console.log('Response:', JSON.stringify(data4, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing backend routes:', error);
  }
}

testBackendRoutes();