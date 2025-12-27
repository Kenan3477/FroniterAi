#!/usr/bin/env node

// Test user creation and login for the failing user
async function testUserCreationAndLogin() {
  console.log('🧪 Testing User Creation and Login Issue');
  console.log('=======================================');
  
  try {
    // 1. Login as admin to get token
    console.log('1. Logging in as admin...');
    const adminLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'OmnivoxAdmin2025!'
      })
    });
    
    if (!adminLoginResponse.ok) {
      console.log('❌ Admin login failed:', adminLoginResponse.status);
      return;
    }
    
    const adminLoginData = await adminLoginResponse.json();
    const adminToken = adminLoginData.data.accessToken || adminLoginData.data.token;
    console.log('✅ Admin logged in successfully');
    
    // 2. Try to find if the user already exists
    console.log('\n2. Checking if user already exists...');
    const usersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      console.log('📊 Total users in system:', Array.isArray(users) ? users.length : 'Unknown format');
      
      // Look for the specific user
      if (Array.isArray(users)) {
        const targetUser = users.find(u => u.email && u.email.toLowerCase() === 'kenan@test.co.uk');
        if (targetUser) {
          console.log('✅ User found in system:', {
            id: targetUser.id,
            email: targetUser.email,
            name: targetUser.name,
            role: targetUser.role,
            isActive: targetUser.isActive,
            status: targetUser.status
          });
        } else {
          console.log('❌ User NOT found in system');
          console.log('🔍 Available user emails:');
          users.slice(0, 5).forEach(u => console.log('   -', u.email || 'No email'));
        }
      }
    } else {
      console.log('❌ Failed to fetch users:', usersResponse.status);
      const error = await usersResponse.text();
      console.log('Error:', error);
    }
    
    // 3. Try to create the user if it doesn't exist
    console.log('\n3. Attempting to create user...');
    const createUserResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'kenan',
        email: 'Kenan@test.co.uk',
        password: '3477',
        name: 'Kenan Test',
        firstName: 'Kenan',
        lastName: 'Test',
        role: 'AGENT'
      })
    });
    
    console.log('Create user response status:', createUserResponse.status);
    
    if (createUserResponse.ok) {
      const userData = await createUserResponse.json();
      console.log('✅ User created successfully:', userData);
    } else {
      const error = await createUserResponse.text();
      console.log('❌ User creation failed:', error);
    }
    
    // 4. Test login with various password formats
    console.log('\n4. Testing login attempts...');
    const passwordVariations = ['3477', '3477 ', ' 3477', 'password', 'Kenan@test.co.uk'];
    const emailVariations = ['Kenan@test.co.uk', 'kenan@test.co.uk', 'KENAN@TEST.CO.UK'];
    
    for (const email of emailVariations) {
      for (const password of passwordVariations) {
        const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        
        const loginData = await loginResponse.json();
        
        if (loginResponse.ok) {
          console.log(`✅ Login successful with email: "${email}", password: "${password}"`);
          console.log('   User:', loginData.data?.user?.name);
          break;
        } else {
          console.log(`❌ Login failed with email: "${email}", password: "${password}" - ${loginData.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testUserCreationAndLogin();