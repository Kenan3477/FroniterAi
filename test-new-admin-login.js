const fetch = require('node-fetch');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testNewAdminLogin() {
  console.log('🧪 Testing new admin login credentials...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'newadmin@omnivox.com',
        password: 'NewAdmin123!'
      })
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ LOGIN SUCCESSFUL!');
      console.log('👤 User:', data.data?.user?.name);
      console.log('🔑 Role:', data.data?.user?.role);
      console.log('📧 Email:', data.data?.user?.email);
      console.log('🔐 Token length:', (data.data?.token || '').length);
      console.log('');
      console.log('🎉 You can now log in to the frontend with:');
      console.log('   Email: newadmin@omnivox.com');
      console.log('   Password: NewAdmin123!');
    } else {
      console.log('❌ Login failed:', data);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testNewAdminLogin();