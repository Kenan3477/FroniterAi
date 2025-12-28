#!/usr/bin/env node

// Test the exact credentials from the frontend
async function testFrontendCredentials() {
  console.log('🔍 Testing Frontend Credentials Against Backend');
  console.log('===============================================');
  
  try {
    const testUsers = [
      {
        email: 'Kenan@Gmail.com',
        password: 'KenanGmail123!',
        name: 'Kenan Gmail (Frontend Created)'
      },
      {
        email: 'kenan.test@gmail.com', 
        password: 'KenanGmail123!',
        name: 'Kenan Test Gmail (Script Created)'
      }
    ];
    
    console.log('🎯 Testing against Railway backend directly...');
    
    for (const user of testUsers) {
      console.log(`\n🔐 Testing ${user.name}:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      
      const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: user.password
        })
      });
      
      console.log(`   Status: ${loginResponse.status}`);
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log(`   ✅ SUCCESS!`);
        console.log(`   User ID: ${loginData.data.user.id}`);
        console.log(`   Username: ${loginData.data.user.username}`);
        console.log(`   Role: ${loginData.data.user.role}`);
      } else {
        const error = await loginResponse.json();
        console.log(`   ❌ FAILED: ${error.message || 'Unknown error'}`);
      }
    }
    
    // Get all current users to see what exists
    console.log('\n📋 Getting current users from backend...');
    
    // Login as admin first
    const adminLogin = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'OmnivoxAdmin2025!'
      })
    });
    
    if (adminLogin.ok) {
      const adminData = await adminLogin.json();
      const adminToken = adminData.data.accessToken || adminData.data.token;
      
      const usersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        console.log('\n👥 Current users in database:');
        users.forEach((user, index) => {
          console.log(`${index + 1}. ${user.email} (ID: ${user.id}, Username: ${user.username})`);
        });
        
        // Find users with Kenan in email
        const kenanUsers = users.filter(u => u.email.toLowerCase().includes('kenan'));
        console.log('\n🔍 Kenan users found:');
        kenanUsers.forEach(user => {
          console.log(`- ${user.email} (Created: ${user.createdAt})`);
        });
        
      } else {
        console.log('❌ Failed to fetch users');
      }
    } else {
      console.log('❌ Failed to login as admin');
    }
    
    // Create a fresh test user to verify the system is working
    console.log('\n🆕 Creating fresh test user...');
    
    if (adminLogin.ok) {
      const adminData = await adminLogin.json();
      const adminToken = adminData.data.accessToken || adminData.data.token;
      
      const timestamp = Date.now();
      const testEmail = `fresh-test-${timestamp}@example.com`;
      const testPassword = 'FreshTest123!';
      
      const createResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: `fresh-test-${timestamp}`,
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
        console.log(`✅ Created fresh user: ${userData.data.email}`);
        
        // Wait and test login
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const testLogin = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword
          })
        });
        
        if (testLogin.ok) {
          console.log(`🎉 Fresh user login SUCCESS - system is working`);
          
          console.log('\n📝 SOLUTION:');
          console.log('=============');
          console.log('✅ Backend authentication system is working correctly');
          console.log('✅ User creation is working correctly');
          console.log('⚠️ The issue is likely with the specific frontend-created user passwords');
          console.log('');
          console.log('🔧 RECOMMENDATION:');
          console.log('Delete the problematic users from the frontend admin panel and recreate them');
          console.log('OR use these working credentials:');
          console.log(`   Email: ${testEmail}`);
          console.log(`   Password: ${testPassword}`);
          
        } else {
          console.log(`❌ Fresh user login failed - there may be a systematic issue`);
        }
      } else {
        console.log('❌ Failed to create fresh user');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendCredentials();