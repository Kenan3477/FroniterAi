#!/usr/bin/env node

// Check what users actually exist in the database
async function checkDatabaseUsers() {
  console.log('🔍 Checking Database Users After Seeding');
  console.log('========================================');
  
  try {
    // Get admin token
    const adminLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'OmnivoxAdmin2025!'
      })
    });
    
    if (!adminLoginResponse.ok) {
      console.log('❌ Cannot login as admin to check users');
      return;
    }
    
    const adminLoginData = await adminLoginResponse.json();
    const adminToken = adminLoginData.data.accessToken || adminLoginData.data.token;
    console.log('✅ Admin login successful');
    
    // Get all users
    const usersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const users = await usersResponse.json();
    console.log(`\n👥 Found ${users.length} users in database:`);
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Created: ${user.createdAt}`);
    });
    
    // Check if we have the expected Kenan users
    const kenanCoUk = users.find(u => u.email === 'Kenan@test.co.uk');
    const kenanGmail = users.find(u => u.email === 'kenan.test@gmail.com');
    
    console.log('\n🔍 Checking for expected seeded users:');
    
    if (kenanCoUk) {
      console.log('✅ Found Kenan@test.co.uk user');
      console.log(`   ID: ${kenanCoUk.id}, Username: ${kenanCoUk.username}`);
    } else {
      console.log('❌ Kenan@test.co.uk user NOT found');
    }
    
    if (kenanGmail) {
      console.log('✅ Found kenan.test@gmail.com user');
      console.log(`   ID: ${kenanGmail.id}, Username: ${kenanGmail.username}`);
    } else {
      console.log('❌ kenan.test@gmail.com user NOT found');
    }
    
    // Try creating a fresh test user to see if user creation works
    console.log('\n🧪 Testing fresh user creation...');
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'FreshTest123!';
    
    const createResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: `test-${Date.now()}`,
        email: testEmail,
        password: testPassword,
        name: 'Fresh Test User',
        firstName: 'Fresh',
        lastName: 'Test',
        role: 'AGENT'
      })
    });
    
    if (createResponse.ok) {
      const userData = await createResponse.json();
      console.log('✅ Fresh user created:', userData.data);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test login
      const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });
      
      if (loginResponse.ok) {
        console.log('🎉 Fresh user login SUCCESS');
        console.log('✅ User creation and authentication is working correctly');
      } else {
        const error = await loginResponse.json();
        console.log('❌ Fresh user login FAILED:', error.message);
        console.log('⚠️ There might be a systematic authentication issue');
      }
    } else {
      const error = await createResponse.json();
      console.log('❌ Fresh user creation FAILED:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkDatabaseUsers();