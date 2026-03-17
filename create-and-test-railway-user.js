/**
 * Create or update a test user with a password that should work on Railway
 * Using the same bcrypt version as backend
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  console.log('🔧 Creating/Updating Railway Test User...\n');

  try {
    const testEmail = 'railway-test@omnivox.ai';
    const testPassword = 'Test123456';

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: testEmail }
    });

    // Generate hash with explicit salt rounds (same as backend)
    console.log('🔒 Generating password hash...');
    const hash = await bcrypt.hash(testPassword, 10);
    console.log(`   Hash preview: ${hash.substring(0, 30)}...`);
    console.log(`   Hash length: ${hash.length}`);

    // Verify hash locally
    const localVerify = await bcrypt.compare(testPassword, hash);
    console.log(`   Local verification: ${localVerify ? '✅ PASS' : '❌ FAIL'}\n`);

    if (!localVerify) {
      console.log('❌ CRITICAL: Hash verification failed locally!');
      console.log('Cannot proceed - bcrypt is broken.');
      return;
    }

    if (user) {
      console.log(`📝 Updating existing user: ${testEmail}`);
      user = await prisma.user.update({
        where: { email: testEmail },
        data: {
          password: hash,
          isActive: true,
          failedLoginAttempts: 0,
          accountLockedUntil: null,
          role: 'ADMIN'
        }
      });
    } else {
      console.log(`➕ Creating new user: ${testEmail}`);
      user = await prisma.user.create({
        data: {
          email: testEmail,
          username: 'railwaytest',
          password: hash,
          firstName: 'Railway',
          lastName: 'Test',
          name: 'Railway Test',
          role: 'ADMIN',
          isActive: true
        }
      });
    }

    console.log(`✅ User ready:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}\n`);

    // Return credentials for testing
    return {
      email: testEmail,
      password: testPassword,
      hash: hash
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run and then test login
async function main() {
  const credentials = await createTestUser();
  
  if (!credentials) {
    return;
  }

  console.log('🧪 Testing Railway API login...\n');
  
  const fetch = require('node-fetch');
  const API_BASE = 'https://froniterai-production.up.railway.app';

  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password
    })
  });

  console.log(`📡 Login Response: ${response.status} ${response.statusText}`);
  
  const data = await response.json();
  console.log(`📄 Response:`, JSON.stringify(data, null, 2));

  if (response.ok && data.success) {
    console.log('\n✅ SUCCESS! Railway login working!');
    const token = data.data?.token || data.token;
    console.log(`🎫 Token: ${token?.substring(0, 50)}...`);
    
    // Now test call records endpoint
    console.log('\n📡 Testing call records endpoint...');
    const callsResponse = await fetch(`${API_BASE}/api/call-records?limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${callsResponse.status}`);
    if (callsResponse.ok) {
      const callsData = await callsResponse.json();
      console.log(`   ✅ Got ${callsData.records?.length || 0} call records`);
      console.log(`   Total in DB: ${callsData.pagination?.total || 0}`);
    }
  } else {
    console.log('\n❌ Login still failing on Railway');
    console.log('This confirms bcrypt hash mismatch between local and Railway environment.');
  }
}

main().catch(console.error);
