#!/usr/bin/env node

// Test timing and comparison with a working user
async function testTiming() {
  console.log('⏱️ Testing Timing and Comparison');
  console.log('================================');
  
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
    
    // Create a completely new test user with .co.uk domain
    const timestamp = Date.now();
    const testEmail = `timing-test-${timestamp}@test.co.uk`;
    const testPassword = 'TimingTest123!';
    
    console.log(`🧪 Creating test user: ${testEmail}`);
    
    const createResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: `timing-test-${timestamp}`,
        email: testEmail,
        password: testPassword,
        name: 'Timing Test',
        firstName: 'Timing',
        lastName: 'Test',
        role: 'AGENT'
      })
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.json();
      console.log('❌ Creation failed:', error.message);
      return;
    }
    
    const userData = await createResponse.json();
    console.log('✅ User created:', userData.data);
    
    // Test login at different intervals
    const delays = [0, 1000, 3000, 5000];
    
    for (const delay of delays) {
      if (delay > 0) {
        console.log(`\n⏳ Waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      console.log(`🔐 Testing login after ${delay}ms delay...`);
      
      const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });
      
      if (loginResponse.ok) {
        console.log(`  ✅ SUCCESS at ${delay}ms delay`);
        break;
      } else {
        const error = await loginResponse.json();
        console.log(`  ❌ Failed at ${delay}ms delay: ${error.message}`);
      }
    }
    
    // Now let's check the current Kenan user again
    console.log('\n🔍 Checking current Kenan user...');
    
    const usersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const users = await usersResponse.json();
    const currentKenan = users.find(u => u.email === 'Kenan@test.co.uk');
    
    if (currentKenan) {
      console.log('Kenan user found:', currentKenan);
      
      // Try a few possible passwords with longer delays
      const possiblePasswords = ['KenanDavies123!', 'KenanStrong123!', 'FreshKenan123!'];
      
      for (const password of possiblePasswords) {
        console.log(`\n🔐 Trying password: ${password} (with 5s delay)...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'Kenan@test.co.uk',
            password: password
          })
        });
        
        if (loginResponse.ok) {
          console.log(`  🎉 SUCCESS with password: ${password}`);
          const loginData = await loginResponse.json();
          console.log('  Login data:', loginData.data.user);
          return;
        } else {
          const error = await loginResponse.json();
          console.log(`  ❌ Failed with ${password}: ${error.message}`);
        }
      }
    } else {
      console.log('❓ No Kenan user found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTiming();