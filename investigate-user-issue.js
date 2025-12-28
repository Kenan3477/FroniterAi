#!/usr/bin/env node

// Comprehensive test to investigate the user creation and login issue
async function investigateUserIssue() {
  console.log('🔍 Investigating User Creation and Login Issue');
  console.log('==============================================');
  
  try {
    // 1. Login as admin to get token
    console.log('1. Logging in as admin...');
    const adminLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'OmnivoxAdmin2025!'
      })
    });
    
    const adminLoginData = await adminLoginResponse.json();
    const adminToken = adminLoginData.data.accessToken || adminLoginData.data.token;
    console.log('✅ Admin login successful');
    
    // 2. Delete any existing test user
    console.log('\n2. Cleaning up any existing test users...');
    const usersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const users = await usersResponse.json();
    const testUser = users.find(u => u.email === 'test-debug@example.com');
    
    if (testUser) {
      await fetch(`https://froniterai-production.up.railway.app/api/admin/users/${testUser.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      console.log('✅ Cleaned up existing test user');
    } else {
      console.log('✅ No existing test user to clean up');
    }
    
    // 3. Create a new user with a known strong password
    const testPassword = 'TestPassword123!';
    const testEmail = 'test-debug@example.com';
    
    console.log('\n3. Creating test user...');
    console.log('   Email:', testEmail);
    console.log('   Password:', testPassword);
    
    const createResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testdebug',
        email: testEmail,
        password: testPassword,
        name: 'Test Debug User',
        firstName: 'Test',
        lastName: 'Debug',
        role: 'AGENT'
      })
    });
    
    console.log('Create user response status:', createResponse.status);
    
    if (createResponse.ok) {
      const userData = await createResponse.json();
      console.log('✅ User created successfully');
      console.log('   User ID:', userData.data?.id || userData.id);
      
      // 4. Verify user exists in database
      console.log('\n4. Verifying user in database...');
      const verifyResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      const allUsers = await verifyResponse.json();
      const createdUser = allUsers.find(u => u.email === testEmail);
      
      if (createdUser) {
        console.log('✅ User found in database:');
        console.log('   ID:', createdUser.id);
        console.log('   Email:', createdUser.email);
        console.log('   Username:', createdUser.username);
        console.log('   Name:', createdUser.name);
        console.log('   Role:', createdUser.role);
        console.log('   isActive:', createdUser.isActive);
        console.log('   Status:', createdUser.status);
        console.log('   Created:', createdUser.createdAt);
        
        // 5. Test login with exact credentials
        console.log('\n5. Testing login with exact credentials...');
        
        const loginVariations = [
          { email: testEmail, password: testPassword },
          { email: testEmail.toLowerCase(), password: testPassword },
          { email: testEmail.toUpperCase(), password: testPassword },
          { email: createdUser.username, password: testPassword }  // Try username
        ];
        
        for (const [index, creds] of loginVariations.entries()) {
          console.log(`\n   Test ${index + 1}: Email: "${creds.email}", Password: "${creds.password}"`);
          
          const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds)
          });
          
          const loginData = await loginResponse.json();
          
          if (loginResponse.ok) {
            console.log('   ✅ LOGIN SUCCESS!');
            console.log('   User:', loginData.data?.user?.name);
            console.log('   Role:', loginData.data?.user?.role);
            break;
          } else {
            console.log('   ❌ Login failed:', loginData.message);
            
            // Check if account is locked
            if (loginData.attemptsRemaining !== undefined) {
              console.log('   Attempts remaining:', loginData.attemptsRemaining);
            }
          }
        }
        
      } else {
        console.log('❌ User NOT found in database after creation!');
      }
      
    } else {
      const error = await createResponse.text();
      console.log('❌ User creation failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  }
}

// Run the investigation
investigateUserIssue();