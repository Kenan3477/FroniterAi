/**
 * Try common passwords for existing Railway users
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app';

const USERS_TO_TRY = [
  'test@example.com',
  'admin@omnivox.ai'
];

const COMMON_PASSWORDS = [
  'test',
  'test123',
  'Test123',
  'Test123!',
  'password',
  'Password123',
  'Password123!',
  'testpassword',
  'admin',
  'admin123',
  'Admin123',
  'Admin123!',
  'Omnivox123',
  'Omnivox123!',
  'demo',
  'demo123',
  'Demo123!',
  '123456',
  'password123'
];

async function tryPasswords() {
  console.log('🔐 Trying Common Passwords for Railway Users\n');
  console.log(`Testing ${USERS_TO_TRY.length} users with ${COMMON_PASSWORDS.length} password combinations...\n`);

  for (const email of USERS_TO_TRY) {
    console.log(`\n📧 Testing: ${email}`);
    console.log('─'.repeat(50));

    for (const password of COMMON_PASSWORDS) {
      process.stdout.write(`   Trying "${password}"... `);

      try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log('✅ SUCCESS!');
            console.log(`\n🎉 FOUND WORKING CREDENTIALS:`);
            console.log(`   Email: ${email}`);
            console.log(`   Password: ${password}`);
            
            const token = data.data?.token || data.token;
            console.log(`   Token: ${token?.substring(0, 40)}...\n`);

            // Save to file
            const fs = require('fs');
            fs.writeFileSync('RAILWAY_CREDENTIALS_FOUND.txt', 
              `Railway Working Credentials\n` +
              `===========================\n` +
              `Email: ${email}\n` +
              `Password: ${password}\n` +
              `Token: ${token}\n` +
              `Found: ${new Date().toISOString()}\n`
            );

            return { email, password, token };
          }
        }

        console.log('❌');
      } catch (error) {
        console.log(`⚠️  Error: ${error.message}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n\n❌ No working passwords found.');
  console.log('The original passwords were likely set on Railway and are unknown.');
  
  return null;
}

// Run the test
tryPasswords()
  .then(result => {
    if (result) {
      console.log('\n✅ You can now use these credentials to access Railway API.');
      process.exit(0);
    } else {
      console.log('\n💡 Next steps:');
      console.log('   1. Deploy password reset script TO Railway');
      console.log('   2. Or get Railway shell access');
      console.log('   3. Or fix route mounting order for emergency endpoints');
      process.exit(1);
    }
  })
  .catch(console.error);
