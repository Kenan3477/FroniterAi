require('dotenv').config();

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function debugLogin() {
  console.log('🔐 Debug login with different credentials...\n');

  const testCredentials = [
    { email: 'freshadmin@omnivox.com', password: 'FreshAdmin123!' },
    { email: 'newadmin@omnivox.com', password: 'NewAdmin123!' },
    { email: 'newadmin@omnivox.com', password: 'NewAdmin456!' },
    { email: 'admin@omnivox.com', password: 'admin' },
    { email: 'admin@omnivox.com', password: 'securepass123' }
  ];

  for (const [index, creds] of testCredentials.entries()) {
    console.log(`${index + 1}️⃣ Trying ${creds.email} with password: ${creds.password}`);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds)
      });

      const data = await response.json();
      console.log(`   Status: ${response.status}`);
      console.log(`   Result: ${data.success ? 'SUCCESS ✅' : data.message}`);
      
      if (data.success) {
        console.log(`   User: ${data.data.user.name} (ID: ${data.data.user.id})`);
        console.log(`   Role: ${data.data.user.role}`);
        return creds; // Return working credentials
      }
      
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('❌ No working credentials found');
  return null;
}

debugLogin();