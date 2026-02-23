require('dotenv').config();

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testPasswordChangeDeep() {
  console.log('🔍 Testing password change with valid password length...\n');

  try {
    // Login as admin
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
    console.log('✅ Login successful');
    
    // Test change password with valid length to trigger the ID issue
    const passwordResponse = await fetch(`${BACKEND_URL}/api/users/change-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: 'NewAdmin123!',
        newPassword: 'NewAdmin456!'  // Valid length
      })
    });

    const passwordData = await passwordResponse.json();
    console.log('🔑 Password change response status:', passwordResponse.status);
    console.log('🔑 Password change response:', JSON.stringify(passwordData, null, 2));

    if (passwordData.success) {
      console.log('🎉 Password change successful - ID conversion is working!');
    } else if (passwordData.error && passwordData.error.includes('Expected Int, provided String')) {
      console.log('❌ Still getting Prisma type error - ID conversion still not working');
      console.log('🔧 The issue is the userId is still being passed as string to Prisma');
    } else {
      console.log('🤔 Different error occurred:', passwordData.message);
    }

  } catch (error) {
    console.error('❌ Error testing password change:', error.message);
  }
}

testPasswordChangeDeep();