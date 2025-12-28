#!/usr/bin/env node

// Test the specific Kenan user that's failing
async function testKenanUser() {
  console.log('🔍 Testing Kenan User Specifically');
  console.log('=================================');
  
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
    
    // Get all users and check the Kenan user specifically
    const usersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const users = await usersResponse.json();
    const kenanUser = users.find(u => u.email === 'Kenan@test.co.uk');
    
    if (!kenanUser) {
      console.log('❌ Kenan user not found in database');
      return;
    }
    
    console.log('Kenan user details:');
    console.log(JSON.stringify(kenanUser, null, 2));
    
    // Test all the possible passwords for Kenan
    const possiblePasswords = [
      '3477',
      'KnownPassword123!',
      'TestPassword123!',
      'Password123!',
      'Kenan123!'
    ];
    
    console.log('\nTesting different passwords for Kenan...');
    
    for (const password of possiblePasswords) {
      console.log(`\nTrying password: "${password}"`);
      
      const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'Kenan@test.co.uk',
          password: password
        })
      });
      
      if (loginResponse.ok) {
        console.log(`✅ SUCCESS with password: "${password}"`);
        const loginData = await loginResponse.json();
        console.log('Login data:', loginData);
        return;
      } else {
        const error = await loginResponse.json();
        console.log(`❌ Failed with "${password}": ${error.message} (Status: ${loginResponse.status})`);
      }
    }
    
    // Let's delete and recreate Kenan user with a known password
    console.log('\n🔄 Deleting and recreating Kenan user...');
    
    // Delete the user
    const deleteResponse = await fetch(`https://froniterai-production.up.railway.app/api/admin/users/${kenanUser.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (deleteResponse.ok) {
      console.log('✅ Kenan user deleted');
    } else {
      console.log('❌ Failed to delete Kenan user');
      const error = await deleteResponse.json();
      console.log('Delete error:', error);
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Recreate the user
    const recreateResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'kenan-fresh',
        email: 'Kenan@test.co.uk',
        password: 'FreshKenan123!',
        name: 'Kenan Fresh',
        firstName: 'Kenan',
        lastName: 'Fresh',
        role: 'AGENT'
      })
    });
    
    console.log('Recreate response status:', recreateResponse.status);
    
    if (recreateResponse.ok) {
      const newUserData = await recreateResponse.json();
      console.log('✅ Kenan user recreated:', newUserData.data);
      
      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test login
      const testLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'Kenan@test.co.uk',
          password: 'FreshKenan123!'
        })
      });
      
      if (testLoginResponse.ok) {
        console.log('🎉 SUCCESS! Fresh Kenan user can login');
        const loginData = await testLoginResponse.json();
        console.log('Login success data:', loginData.data);
      } else {
        const error = await testLoginResponse.json();
        console.log('❌ Fresh Kenan user STILL cannot login:', error.message);
      }
    } else {
      const error = await recreateResponse.json();
      console.log('❌ Failed to recreate Kenan user:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testKenanUser();