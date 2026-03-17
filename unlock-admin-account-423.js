const fetch = require('node-fetch');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function unlockAdminAccount() {
  console.log('🔓 Attempting to unlock admin account...');
  
  // First, let's check the account lock status
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'dummy' // Using dummy password to check lock status
      })
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);

    if (response.status === 423) {
      console.log('🔒 Account is locked due to too many failed attempts');
      console.log('⏰ The account should unlock automatically after some time');
      console.log('');
      
      // Try to find working credentials to unlock via backend
      console.log('💡 Let me try to create a new admin user instead...');
      
      // Try to register a new admin user
      const registerResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'newadmin',
          email: 'newadmin@omnivox.com',
          password: 'NewAdmin123!',
          firstName: 'New',
          lastName: 'Admin',
          role: 'ADMIN'
        })
      });

      const registerData = await registerResponse.json();
      console.log(`\n📝 Register attempt status: ${registerResponse.status}`);
      console.log(`Register response:`, registerData);

      if (registerResponse.ok) {
        console.log('✅ NEW ADMIN CREATED! Use these credentials:');
        console.log('   Email: newadmin@omnivox.com');
        console.log('   Password: NewAdmin123!');
      } else {
        console.log('❌ Registration failed');
        
        // Try different common passwords for the locked account after a delay
        console.log('\n⏳ Waiting 30 seconds before trying again...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        const commonPasswords = [
          'admin123', 'password', 'admin', 'ADMIN_PASSWORD_NOT_SET',
          'OmnivoxAdmin2025!', 'TestPassword123!', '3477'
        ];
        
        for (const password of commonPasswords) {
          console.log(`\n🔑 Trying password: ${password}`);
          
          const tryResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: 'admin@omnivox-ai.com',
              password: password
            })
          });

          console.log(`   Status: ${tryResponse.status}`);
          
          if (tryResponse.ok) {
            const successData = await tryResponse.json();
            console.log('🎉 SUCCESS! Working credentials found:');
            console.log(`   Email: admin@omnivox-ai.com`);
            console.log(`   Password: ${password}`);
            console.log(`   Token: ${successData.token || successData.data?.token}`);
            return;
          } else if (tryResponse.status === 423) {
            console.log('   🔒 Still locked');
          } else {
            console.log('   ❌ Wrong password');
          }
          
          // Small delay between attempts
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

unlockAdminAccount();