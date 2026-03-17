require('dotenv').config();

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testProfileWithFreshAdmin() {
  console.log('🔍 Testing profile update with fresh admin...\n');

  try {
    // Login with fresh admin
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'freshadmin@omnivox.com',
        password: 'FreshAdmin123!'
      })
    });

    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.log('❌ Login failed:', loginData.message);
      return;
    }

    const token = loginData.data.token;
    console.log('✅ Login successful as:', loginData.data.user.name);
    console.log('👤 User ID:', loginData.data.user.id);
    
    // Test profile update
    console.log('\n🔧 Testing profile update...');
    const profileResponse = await fetch(`${BACKEND_URL}/api/users/profile`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        firstName: 'Updated Fresh',
        lastName: 'Test Admin'
      })
    });

    const profileData = await profileResponse.json();
    console.log('👤 Profile update status:', profileResponse.status);
    console.log('👤 Profile update response:', JSON.stringify(profileData, null, 2));

    if (profileData.success) {
      console.log('\n🎉 PROFILE UPDATE SUCCESSFUL!');
      console.log('✅ Route ordering fix worked!');
    } else if (profileData.debug) {
      console.log('\n🔍 Debug data received:');
      console.log('🆔 User ID type:', profileData.data.userIdType);
      console.log('🆔 User ID value:', profileData.data.receivedUserId);
      console.log('👤 Has req.user:', profileData.data.hasReqUser);
      console.log('📋 Full user data:', profileData.data.fullUser);
    } else {
      console.log('\n❌ Profile update failed:', profileData.message);
    }

  } catch (error) {
    console.error('❌ Error testing profile update:', error.message);
  }
}

testProfileWithFreshAdmin();