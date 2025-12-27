#!/usr/bin/env node

const https = require('https');

// Test authentication flow and user campaign endpoints
async function testEndpointFix() {
  console.log('🧪 Testing Endpoint URL Fixes');
  console.log('===============================');
  
  try {
    // 1. Login to backend to get auth token
    console.log('1. Logging in to backend...');
    const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'OmnivoxAdmin2025!'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    if (!loginData.data?.token) {
      console.log('❌ No auth token in response');
      return;
    }
    
    const authToken = loginData.data.token;
    console.log('🔑 Got auth token');
    
    // 2. Test the corrected GET endpoint
    console.log('\n2. Testing corrected GET endpoint...');
    const getUserCampaignsResponse = await fetch('https://froniterai-production.up.railway.app/api/user-management/1/campaigns', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('GET /api/user-management/1/campaigns:', getUserCampaignsResponse.status);
    
    if (getUserCampaignsResponse.ok) {
      const data = await getUserCampaignsResponse.json();
      console.log('✅ GET request successful:', data);
    } else {
      const error = await getUserCampaignsResponse.text();
      console.log('❌ GET request failed:', error);
    }
    
    // 3. Test that the old incorrect URL still fails (to confirm our fix is necessary)
    console.log('\n3. Testing old incorrect URL (should fail)...');
    const oldUrlResponse = await fetch('https://froniterai-production.up.railway.app/api/users/1/campaigns', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('GET /api/users/1/campaigns (old URL):', oldUrlResponse.status);
    
    if (!oldUrlResponse.ok) {
      console.log('✅ Old URL correctly returns 404 (confirms fix was needed)');
    } else {
      console.log('⚠️ Old URL unexpectedly worked');
    }
    
    console.log('\n4. Testing available campaigns endpoint...');
    const availableCampaignsResponse = await fetch('https://froniterai-production.up.railway.app/api/user-management/campaigns/available', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('GET /api/user-management/campaigns/available:', availableCampaignsResponse.status);
    
    if (availableCampaignsResponse.ok) {
      const campaigns = await availableCampaignsResponse.json();
      console.log('✅ Available campaigns:', campaigns);
    } else {
      const error = await availableCampaignsResponse.text();
      console.log('❌ Available campaigns request failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEndpointFix();