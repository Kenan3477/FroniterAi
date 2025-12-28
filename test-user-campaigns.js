// Test script to verify the new user campaigns endpoint
const fs = require('fs');

async function testUserCampaigns() {
  console.log('🔧 Testing user campaigns endpoint...');
  
  try {
    // First, test the admin login
    console.log('1️⃣ Logging in as admin...');
    const adminLoginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      }),
    });
    
    const adminLoginData = await adminLoginResponse.json();
    console.log('Admin login result:', adminLoginData.success ? '✅ SUCCESS' : '❌ FAILED');
    
    if (!adminLoginData.success) {
      console.error('Admin login failed:', adminLoginData.message);
      return;
    }

    // Get admin auth cookie
    const adminCookie = adminLoginResponse.headers.get('set-cookie');
    console.log('Admin cookie:', adminCookie ? 'EXISTS' : 'MISSING');

    // Test the admin endpoint for their own campaigns
    console.log('2️⃣ Testing admin campaigns via admin endpoint...');
    const adminCampaignsResponse = await fetch(`http://localhost:3000/api/admin/users/${adminLoginData.user.id}/campaigns`, {
      headers: {
        'Cookie': adminCookie || '',
        'Authorization': `Bearer ${adminLoginData.token || ''}`
      }
    });

    if (adminCampaignsResponse.ok) {
      const adminCampaignsData = await adminCampaignsResponse.json();
      console.log('Admin campaigns via admin endpoint:', adminCampaignsData.success ? '✅ SUCCESS' : '❌ FAILED');
      if (adminCampaignsData.success) {
        console.log(`   - Found ${adminCampaignsData.data?.assignments?.length || 0} campaign assignments`);
      }
    } else {
      console.log('❌ Admin campaigns via admin endpoint failed:', adminCampaignsResponse.status);
    }

    // Test the new user endpoint for admin
    console.log('3️⃣ Testing admin campaigns via user endpoint...');
    const adminUserCampaignsResponse = await fetch('http://localhost:3000/api/users/my-campaigns', {
      headers: {
        'Cookie': adminCookie || '',
        'Authorization': `Bearer ${adminLoginData.token || ''}`
      }
    });

    if (adminUserCampaignsResponse.ok) {
      const adminUserCampaignsData = await adminUserCampaignsResponse.json();
      console.log('Admin campaigns via user endpoint:', adminUserCampaignsData.success ? '✅ SUCCESS' : '❌ FAILED');
      if (adminUserCampaignsData.success) {
        console.log(`   - Found ${adminUserCampaignsData.data?.length || 0} campaigns`);
        console.log('   - Campaigns:', adminUserCampaignsData.data?.map(c => c.name));
      }
    } else {
      console.log('❌ Admin campaigns via user endpoint failed:', adminUserCampaignsResponse.status);
      const errorText = await adminUserCampaignsResponse.text();
      console.log('   - Error:', errorText);
    }

    // Now test with a regular user (user ID 119)
    console.log('4️⃣ Logging in as regular user...');
    const userLoginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        username: 'johndoe',
        password: 'password123'
      }),
    });
    
    const userLoginData = await userLoginResponse.json();
    console.log('User login result:', userLoginData.success ? '✅ SUCCESS' : '❌ FAILED');
    
    if (!userLoginData.success) {
      console.error('User login failed:', userLoginData.message);
      return;
    }

    const userCookie = userLoginResponse.headers.get('set-cookie');
    
    // Test the admin endpoint (should fail)
    console.log('5️⃣ Testing user campaigns via admin endpoint (should fail)...');
    const userAdminCampaignsResponse = await fetch(`http://localhost:3000/api/admin/users/${userLoginData.user.id}/campaigns`, {
      headers: {
        'Cookie': userCookie || '',
        'Authorization': `Bearer ${userLoginData.token || ''}`
      }
    });

    console.log('User via admin endpoint:', userAdminCampaignsResponse.status === 403 ? '✅ CORRECTLY BLOCKED' : '❌ UNEXPECTED');

    // Test the new user endpoint (should work)
    console.log('6️⃣ Testing user campaigns via user endpoint (should work)...');
    const userCampaignsResponse = await fetch('http://localhost:3000/api/users/my-campaigns', {
      headers: {
        'Cookie': userCookie || '',
        'Authorization': `Bearer ${userLoginData.token || ''}`
      }
    });

    if (userCampaignsResponse.ok) {
      const userCampaignsData = await userCampaignsResponse.json();
      console.log('User campaigns via user endpoint:', userCampaignsData.success ? '✅ SUCCESS' : '❌ FAILED');
      if (userCampaignsData.success) {
        console.log(`   - Found ${userCampaignsData.data?.length || 0} campaigns`);
        console.log('   - Campaigns:', userCampaignsData.data?.map(c => c.name));
      } else {
        console.log('   - Message:', userCampaignsData.message);
      }
    } else {
      console.log('❌ User campaigns via user endpoint failed:', userCampaignsResponse.status);
      const errorText = await userCampaignsResponse.text();
      console.log('   - Error:', errorText);
    }

    // Test the frontend route
    console.log('7️⃣ Testing frontend my-campaigns route...');
    const frontendResponse = await fetch('http://localhost:3000/api/campaigns/my-campaigns', {
      headers: {
        'Cookie': userCookie || '',
        'Authorization': `Bearer ${userLoginData.token || ''}`
      }
    });

    if (frontendResponse.ok) {
      const frontendData = await frontendResponse.json();
      console.log('Frontend my-campaigns route:', frontendData.success ? '✅ SUCCESS' : '❌ FAILED');
      if (frontendData.success) {
        console.log(`   - Found ${frontendData.data?.length || 0} campaigns`);
        console.log('   - Campaigns:', frontendData.data?.map(c => c.name));
      }
    } else {
      console.log('❌ Frontend my-campaigns route failed:', frontendResponse.status);
      const errorText = await frontendResponse.text();
      console.log('   - Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUserCampaigns();