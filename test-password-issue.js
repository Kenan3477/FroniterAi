#!/usr/bin/env node

// Test with different passwords to isolate the issue
async function testPasswordIssue() {
  console.log('🔍 Testing Password Issue with Kennen User');
  console.log('==========================================');
  
  try {
    // Login as admin
    const adminLogin = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'OmnivoxAdmin2025!'
      })
    });
    
    const adminData = await adminLogin.json();
    const adminToken = adminData.data.accessToken || adminData.data.token;
    
    // Test different password patterns
    const testPasswords = [
      'SimplePass123!',    // Simple strong password
      'KennenTest123!',    // Similar to your pattern but different
      'TestPassword1!',    // Basic test password
      'Kennex123!'         // Related to your name but different
    ];
    
    for (let i = 0; i < testPasswords.length; i++) {
      const password = testPasswords[i];
      const email = `kennen-test-${i}@example.com`;
      
      console.log(`\n🧪 Test ${i + 1}: Creating user with password "${password}"`);
      
      // Create user with this password
      const createResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: `kennen-test-${i}`,
          email: email,
          password: password,
          name: `Kennen Test ${i}`,
          firstName: 'Kennen',
          lastName: `Test${i}`,
          role: 'AGENT'
        })
      });
      
      if (createResponse.ok) {
        const userData = await createResponse.json();
        console.log(`   ✅ Created: ${userData.data.email}`);
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test login
        const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            password: password
          })
        });
        
        if (loginResponse.ok) {
          console.log(`   🎉 LOGIN SUCCESS with password: "${password}"`);
        } else {
          const error = await loginResponse.json();
          console.log(`   ❌ LOGIN FAILED with password: "${password}" - ${error.message}`);
        }
      } else {
        const error = await createResponse.json();
        console.log(`   ❌ CREATION FAILED: ${error.message}`);
      }
    }
    
    // Now test specifically with your password "Kenan3477!"
    console.log('\n🎯 Testing specifically with YOUR password "Kenan3477!"');
    
    const yourEmail = 'kennen-your-password@example.com';
    const yourPassword = 'Kenan3477!';
    
    const createYourResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'kennen-your-password',
        email: yourEmail,
        password: yourPassword,
        name: 'Kennen Your Password',
        firstName: 'Kennen',
        lastName: 'YourPassword',
        role: 'AGENT'
      })
    });
    
    if (createYourResponse.ok) {
      const yourUserData = await createYourResponse.json();
      console.log(`✅ Created user with YOUR password: ${yourUserData.data.email}`);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test login with your exact password
      const yourLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: yourEmail,
          password: yourPassword
        })
      });
      
      if (yourLoginResponse.ok) {
        console.log('🎉 SUCCESS! Your password works when created via backend API');
        const loginData = await yourLoginResponse.json();
        console.log('User data:', loginData.data.user);
        
        console.log('\n📝 CONCLUSION:');
        console.log('==============');
        console.log('✅ Your password "Kenan3477!" works correctly when created via backend');
        console.log('❌ The issue is with FRONTEND user creation process');
        console.log('⚠️ Frontend is not properly hashing/storing passwords');
        
        console.log('\n🔧 IMMEDIATE SOLUTION:');
        console.log('======================');
        console.log('Use this working account created via backend:');
        console.log(`   Email: ${yourEmail}`);
        console.log(`   Password: ${yourPassword}`);
        
        console.log('\n🛠️ LONG-TERM FIX NEEDED:');
        console.log('========================');
        console.log('The frontend user creation needs to be debugged');
        console.log('It\'s not properly creating users with correct password hashes');
        
      } else {
        const yourError = await yourLoginResponse.json();
        console.log(`❌ Even backend-created user failed: ${yourError.message}`);
        console.log('This indicates a deeper authentication issue');
      }
      
    } else {
      const yourCreateError = await createYourResponse.json();
      console.log(`❌ Failed to create user with your password: ${yourCreateError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPasswordIssue();