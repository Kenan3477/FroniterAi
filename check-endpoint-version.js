require('dotenv').config();

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function checkEndpointVersion() {
  console.log('🔍 Checking if the new user management endpoints are deployed...\n');

  try {
    // Step 1: Login as admin
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newadmin@omnivox.com',
        password: 'NewAdmin123!'
      })
    });

    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.log('❌ Login failed');
      return;
    }

    const token = loginData.data.token;
    
    // Step 2: Test change password with more detailed error to see if we get the new validation
    const passwordResponse = await fetch(`${BACKEND_URL}/api/users/change-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: 'wrong',
        newPassword: '1234'  // Too short to trigger validation
      })
    });

    const passwordData = await passwordResponse.json();
    console.log('🔑 Password change response status:', passwordResponse.status);
    console.log('🔑 Password change response:', JSON.stringify(passwordData, null, 2));

    // Check if we get the new validation message for short passwords
    if (passwordData.message && passwordData.message.includes('must be at least 8 characters')) {
      console.log('✅ New validation code is deployed!');
    } else if (passwordData.error && passwordData.error.includes('Invalid value provided. Expected Int, provided String')) {
      console.log('❌ Still getting the old Prisma type error - ID conversion not working');
    } else {
      console.log('🤔 Getting different response, checking...');
    }

  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
  }
}

checkEndpointVersion();