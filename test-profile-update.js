require('dotenv').config();

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testProfileUpdate() {
  console.log('🔍 Testing profile update endpoint...\n');

  try {
    // Login as admin
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newadmin@omnivox.com',
        password: 'NewAdmin123!'  // Back to original password
      })
    });

    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.log('❌ Login failed');
      return;
    }

    const token = loginData.data.token;
    console.log('✅ Login successful');
    
    // Test profile update
    const profileResponse = await fetch(`${BACKEND_URL}/api/users/profile`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        firstName: 'Updated',
        lastName: 'Admin',
        name: 'Updated Admin'
      })
    });

    const profileData = await profileResponse.json();
    console.log('👤 Profile update response status:', profileResponse.status);
    console.log('👤 Profile update response:', JSON.stringify(profileData, null, 2));

    if (profileData.success) {
      console.log('🎉 Profile update successful!');
    } else {
      console.log('❌ Profile update failed:', profileData.message);
    }

  } catch (error) {
    console.error('❌ Error testing profile update:', error.message);
  }
}

testProfileUpdate();