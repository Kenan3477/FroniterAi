// Test script to debug campaign visibility issues
const FRONTEND_URL = 'http://localhost:3000';

async function testCampaignFlow() {
  console.log('🧪 Testing complete campaign flow...');
  
  try {
    // 1. Login as admin
    console.log('\n1️⃣ Logging in as admin...');
    const loginResponse = await fetch(`${FRONTEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: 'admin@omnivox-ai.com',
        password: 'OmnivoxAdmin2025!'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.message);
      return;
    }
    console.log('✅ Admin login successful');
    
    // Get cookie for subsequent requests
    const cookies = loginResponse.headers.get('set-cookie');
    
    // 2. Test campaign management listing
    console.log('\n2️⃣ Testing campaign management listing...');
    const campaignsResponse = await fetch(`${FRONTEND_URL}/api/admin/campaign-management/campaigns`, {
      headers: { 'Cookie': cookies || '' }
    });
    
    if (campaignsResponse.ok) {
      const campaignsData = await campaignsResponse.json();
      console.log('✅ Campaigns API call successful');
      console.log(`   - Status: ${campaignsResponse.status}`);
      console.log(`   - Success: ${campaignsData.success}`);
      console.log(`   - Count: ${campaignsData.count || campaignsData.data?.length || 0}`);
      console.log(`   - Has data array: ${Array.isArray(campaignsData.data)}`);
      
      if (campaignsData.data && campaignsData.data.length > 0) {
        console.log('   - Sample campaign names:');
        campaignsData.data.slice(0, 3).forEach(campaign => {
          console.log(`     • ${campaign.name} (${campaign.campaignId})`);
        });
      }
    } else {
      console.error(`❌ Campaigns API failed: ${campaignsResponse.status}`);
      const errorText = await campaignsResponse.text();
      console.log('   - Error:', errorText.substring(0, 200));
    }
    
    // 3. Test user campaign assignment endpoint
    console.log('\n3️⃣ Testing user campaign assignment...');
    const userCampaignsResponse = await fetch(`${FRONTEND_URL}/api/admin/users/119/campaigns`, {
      headers: { 'Cookie': cookies || '' }
    });
    
    if (userCampaignsResponse.ok) {
      const userCampaignsData = await userCampaignsResponse.json();
      console.log('✅ User campaigns API call successful');
      console.log(`   - Status: ${userCampaignsResponse.status}`);
      console.log(`   - Success: ${userCampaignsData.success}`);
      console.log(`   - Assignments: ${userCampaignsData.data?.assignments?.length || 0}`);
      
      if (userCampaignsData.data?.assignments?.length > 0) {
        console.log('   - Assigned campaigns:');
        userCampaignsData.data.assignments.forEach(assignment => {
          console.log(`     • ${assignment.campaignName} (${assignment.campaignId})`);
        });
      }
    } else {
      console.error(`❌ User campaigns API failed: ${userCampaignsResponse.status}`);
    }
    
    // 4. Test available campaigns endpoint
    console.log('\n4️⃣ Testing available campaigns...');
    const availableResponse = await fetch(`${FRONTEND_URL}/api/admin/campaigns/available`, {
      headers: { 'Cookie': cookies || '' }
    });
    
    if (availableResponse.ok) {
      const availableData = await availableResponse.json();
      console.log('✅ Available campaigns API call successful');
      console.log(`   - Status: ${availableResponse.status}`);
      console.log(`   - Success: ${availableData.success}`);
      console.log(`   - Available: ${availableData.data?.length || 0}`);
    } else {
      console.error(`❌ Available campaigns API failed: ${availableResponse.status}`);
    }
    
    // 5. Wait for Railway deployment and test user endpoint
    console.log('\n5️⃣ Testing user endpoint (may need Railway deployment)...');
    
    // Login as regular user first
    const userLoginResponse = await fetch(`${FRONTEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: 'Kennen_02@icloud.com',
        password: 'Kennen123!'
      })
    });
    
    const userLoginData = await userLoginResponse.json();
    if (userLoginData.success) {
      console.log('✅ User login successful');
      
      const userCookies = userLoginResponse.headers.get('set-cookie');
      
      // Test my-campaigns endpoint
      const myCampaignsResponse = await fetch(`${FRONTEND_URL}/api/users/my-campaigns`, {
        headers: { 'Cookie': userCookies || '' }
      });
      
      console.log(`   - My campaigns status: ${myCampaignsResponse.status}`);
      
      if (myCampaignsResponse.ok) {
        const myCampaignsData = await myCampaignsResponse.json();
        console.log('✅ My campaigns endpoint working');
        console.log(`   - Success: ${myCampaignsData.success}`);
        console.log(`   - Campaigns: ${myCampaignsData.data?.length || 0}`);
      } else if (myCampaignsResponse.status === 404) {
        console.log('⏳ My campaigns endpoint not deployed yet (404)');
      } else {
        console.error('❌ My campaigns endpoint error');
      }
    } else {
      console.log('⚠️ User login failed, using alternative credentials');
    }
    
    console.log('\n✅ Campaign flow test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCampaignFlow();