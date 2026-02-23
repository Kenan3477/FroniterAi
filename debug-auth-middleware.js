require('dotenv').config();

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function debugAuthenticatedEndpoint() {
  console.log('🔍 Debugging authenticated endpoint data...\n');

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
    
    // Test an endpoint that I know works (change-password) to see what gets logged
    console.log('\n1️⃣ Testing change-password endpoint with wrong current password...');
    const passwordResponse = await fetch(`${BACKEND_URL}/api/users/change-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword',
        newPassword: 'SomeValidPassword123!'
      })
    });

    const passwordData = await passwordResponse.json();
    console.log('Password change status:', passwordResponse.status);
    console.log('Password change response:', JSON.stringify(passwordData, null, 2));
    
    // Now test the profile endpoint
    console.log('\n2️⃣ Testing profile endpoint...');
    const profileResponse = await fetch(`${BACKEND_URL}/api/users/profile`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({})  // Empty body to start with
    });

    const profileData = await profileResponse.json();
    console.log('Profile update status:', profileResponse.status);
    console.log('Profile update response:', JSON.stringify(profileData, null, 2));

  } catch (error) {
    console.error('❌ Error debugging authentication:', error.message);
  }
}

debugAuthenticatedEndpoint();