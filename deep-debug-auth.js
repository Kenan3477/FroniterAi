#!/usr/bin/env node

// Deep debug of the authentication issue
async function deepDebugAuth() {
  console.log('🔬 Deep Authentication Debug');
  console.log('===========================');
  
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
    
    const adminLoginData = await adminLoginResponse.json();
    const adminToken = adminLoginData.data.accessToken || adminLoginData.data.token;
    console.log('✅ Admin login successful');
    
    // Test if the auth endpoint is working with known good credentials
    console.log('\n1. Testing auth endpoint with known good credentials (admin)...');
    const adminTestResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'OmnivoxAdmin2025!'
      })
    });
    
    console.log('Admin auth test status:', adminTestResponse.status);
    if (adminTestResponse.ok) {
      console.log('✅ Auth endpoint working correctly');
    } else {
      console.log('❌ Auth endpoint has issues');
    }
    
    // Test the other seeded users
    console.log('\n2. Testing other seeded users...');
    const seededUsers = [
      { email: 'agent@omnivox-ai.com', password: 'OmnivoxAgent2025!' },
      { email: 'supervisor@omnivox-ai.com', password: 'OmnivoxSupervisor2025!' }
    ];
    
    for (const user of seededUsers) {
      const testResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      
      console.log(`${user.email}:`, testResponse.status === 200 ? '✅ SUCCESS' : `❌ FAILED (${testResponse.status})`);
      
      if (!testResponse.ok) {
        const error = await testResponse.json();
        console.log('   Error:', error.message);
      }
    }
    
    // Check users in database
    console.log('\n3. Checking users in database...');
    const usersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const users = await usersResponse.json();
    console.log('Users in database:');
    users.forEach(user => {
      console.log(`   ${user.email} - Role: ${user.role} - Active: ${user.isActive} - ID: ${user.id}`);
    });
    
    // Try to create and immediately test a user
    console.log('\n4. Creating a test user with immediate verification...');
    
    const testEmail = 'immediate-test@example.com';
    const testPassword = 'ImmediateTest123!';
    
    const createResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'immediatetest',
        email: testEmail,
        password: testPassword,
        name: 'Immediate Test',
        firstName: 'Immediate',
        lastName: 'Test',
        role: 'AGENT'
      })
    });
    
    console.log('Create response status:', createResponse.status);
    const createData = await createResponse.json();
    console.log('Create response data:', createData);
    
    if (createResponse.ok) {
      // Wait 2 seconds for any async processing
      console.log('⏳ Waiting 2 seconds for processing...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test login immediately
      const immediateLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });
      
      console.log('Immediate login test status:', immediateLoginResponse.status);
      
      if (immediateLoginResponse.ok) {
        console.log('🎉 SUCCESS! User can login immediately after creation');
      } else {
        const error = await immediateLoginResponse.json();
        console.log('❌ Immediate login failed:', error.message);
        
        // Check if user actually exists in database
        const recheckUsers = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        const allUsers = await recheckUsers.json();
        const newUser = allUsers.find(u => u.email === testEmail);
        
        if (newUser) {
          console.log('✅ User exists in database:', {
            id: newUser.id,
            email: newUser.email,
            isActive: newUser.isActive,
            role: newUser.role
          });
        } else {
          console.log('❌ User NOT found in database!');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

deepDebugAuth();