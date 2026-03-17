require('dotenv').config();

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function debugProfileEndpoint() {
  console.log('🔍 Debugging profile endpoint authentication...\n');

  try {
    // Login as admin
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newadmin@omnivox.com',
        password: 'NewAdmin456!'
      })
    });

    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.log('❌ Login failed');
      return;
    }

    const token = loginData.data.token;
    console.log('✅ Login successful, token length:', token.length);
    
    // First test getting the current profile (GET)
    console.log('\n1️⃣ Testing profile GET...');
    const getProfileResponse = await fetch(`${BACKEND_URL}/api/users/profile`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });

    const getProfileData = await getProfileResponse.json();
    console.log('📊 GET profile status:', getProfileResponse.status);
    console.log('📊 GET profile response:', JSON.stringify(getProfileData, null, 2));

    // Then test profile update with minimal data
    console.log('\n2️⃣ Testing profile PUT with minimal data...');
    const profileResponse = await fetch(`${BACKEND_URL}/api/users/profile`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        firstName: 'Test'
      })
    });

    const profileData = await profileResponse.json();
    console.log('📊 PUT profile status:', profileResponse.status);
    console.log('📊 PUT profile response:', JSON.stringify(profileData, null, 2));

  } catch (error) {
    console.error('❌ Error debugging profile:', error.message);
  }
}

debugProfileEndpoint();