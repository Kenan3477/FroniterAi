require('dotenv').config();

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function quickLoginTest() {
  console.log('🔐 Testing different login credentials...\n');

  // Try original password
  console.log('1️⃣ Trying original password...');
  try {
    const loginResponse1 = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newadmin@omnivox.com',
        password: 'NewAdmin123!'
      })
    });

    const loginData1 = await loginResponse1.json();
    console.log('Original password login status:', loginResponse1.status);
    console.log('Original password result:', loginData1.success ? 'SUCCESS' : loginData1.message);

  } catch (error) {
    console.log('Original password error:', error.message);
  }

  // Try updated password
  console.log('\n2️⃣ Trying updated password...');
  try {
    const loginResponse2 = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newadmin@omnivox.com',
        password: 'NewAdmin456!'
      })
    });

    const loginData2 = await loginResponse2.json();
    console.log('Updated password login status:', loginResponse2.status);
    console.log('Updated password result:', loginData2.success ? 'SUCCESS' : loginData2.message);

  } catch (error) {
    console.log('Updated password error:', error.message);
  }
}

quickLoginTest();