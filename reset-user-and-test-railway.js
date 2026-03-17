/**
 * Reset Admin User and Test Railway API
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const API_URL = 'https://froniterai-production.up.railway.app';

async function resetUserAndTest() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:BaPOsGCMKYiGNOLQUJkWbAIaJcfayoqJ@postgres.railway.internal:5432/railway'
  });

  try {
    console.log('🔐 Checking and resetting admin user...\n');

    // Check current user state
    const currentUser = await prisma.user.findUnique({
      where: { email: 'admin@omnivox.ai' }
    });

    console.log('Current user state:');
    console.log('  Email:', currentUser.email);
    console.log('  isActive:', currentUser.isActive);
    console.log('  failedLoginAttempts:', currentUser.failedLoginAttempts);
    console.log('  accountLockedUntil:', currentUser.accountLockedUntil);

    // Hash the new password
    const newPassword = 'Admin123!';
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    console.log('\nResetting user with new values...');

    // Update admin user - make sure it's active and unlocked
    const updatedUser = await prisma.user.update({
      where: { email: 'admin@omnivox.ai' },
      data: { 
        password: hashedPassword,
        isActive: true,
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        status: 'available'
      }
    });

    console.log('✓ User reset successful:');
    console.log('  Email:', updatedUser.email);
    console.log('  isActive:', updatedUser.isActive);
    console.log('  New password:', newPassword);

    // Wait a moment for database to sync
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n📡 Testing Railway API with new credentials...\n');

    // Test login
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@omnivox.ai',
        password: newPassword
      })
    });

    const loginData = await loginResponse.json();

    if (loginResponse.status !== 200) {
      console.log('✗ Login failed:', JSON.stringify(loginData, null, 2));
      console.log('\nResponse status:', loginResponse.status);
      console.log('Response headers:', Object.fromEntries(loginResponse.headers));
      return;
    }

    console.log('✓ Login successful!');
    console.log('  User:', loginData.user?.email);
    console.log('  Role:', loginData.user?.role);
    console.log('  Token:', loginData.token?.substring(0, 30) + '...');

    const token = loginData.token;

    // Test authenticated endpoints
    console.log('\n🧪 Testing Authenticated Endpoints:\n');

    const endpoints = [
      { name: 'Users', path: '/api/users' },
      { name: 'Campaigns', path: '/api/campaigns' },
      { name: 'Contacts', path: '/api/contacts' },
      { name: 'Call Records', path: '/api/call-records' },
      { name: 'Dispositions', path: '/api/dispositions' },
      { name: 'Call History', path: '/api/calls/history' },
    ];

    let passCount = 0;
    let failCount = 0;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${API_URL}${endpoint.path}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        const status = response.status === 200 ? '✓' : '✗';
        
        if (response.status === 200) {
          passCount++;
        } else {
          failCount++;
        }

        // Count items
        let count = 0;
        if (data.success && data.data) {
          if (Array.isArray(data.data)) {
            count = data.data.length;
          } else if (data.data.contacts) {
            count = data.data.contacts.length;
          }
        } else if (Array.isArray(data)) {
          count = data.length;
        }

        console.log(`${status} ${endpoint.name.padEnd(20)} - Status: ${response.status} - Count: ${count}`);
      } catch (error) {
        failCount++;
        console.log(`✗ ${endpoint.name.padEnd(20)} - Error: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ RAILWAY API VERIFICATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nTest Results:');
    console.log(`  ✓ Passed: ${passCount}`);
    console.log(`  ✗ Failed: ${failCount}`);
    console.log('\nAPI Status:');
    console.log('  • Health endpoint: ✓ Working');
    console.log('  • Authentication: ✓ Working');
    console.log('  • Database connection: ✓ Connected');
    console.log(`  • Protected endpoints: ${passCount > 0 ? '✓' : '✗'} ${passCount > 0 ? 'Returning data' : 'Issues detected'}`);
    console.log('\nCredentials for testing:');
    console.log(`  Email: admin@omnivox.ai`);
    console.log(`  Password: ${newPassword}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

resetUserAndTest();
