#!/usr/bin/env node

// Test .co.uk specifically with unique usernames
async function testCoUkDomain() {
  console.log('🇬🇧 Testing .co.uk Domain Specifically');
  console.log('=====================================');
  
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
    
    // Test multiple .co.uk users with unique names
    const timestamp = Date.now();
    const coUkTests = [
      {
        email: `alice${timestamp}@example.co.uk`,
        username: `alice${timestamp}`,
        name: 'Alice UK',
        password: 'AliceUK123!'
      },
      {
        email: `bob${timestamp}@company.co.uk`, 
        username: `bob${timestamp}`,
        name: 'Bob UK',
        password: 'BobUK123!'
      },
      {
        email: `charlie${timestamp}@test.co.uk`,
        username: `charlie${timestamp}`,
        name: 'Charlie UK', 
        password: 'CharlieUK123!'
      }
    ];
    
    for (const testUser of coUkTests) {
      console.log(`\n🧪 Testing ${testUser.email}...`);
      
      // Create user
      const createResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: testUser.username,
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
          firstName: testUser.name.split(' ')[0],
          lastName: testUser.name.split(' ')[1],
          role: 'AGENT'
        })
      });
      
      if (createResponse.ok) {
        const userData = await createResponse.json();
        console.log(`  ✅ Created: ${userData.data.email}`);
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test login
        const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password
          })
        });
        
        if (loginResponse.ok) {
          console.log(`  🎉 Login SUCCESS for ${testUser.email}`);
        } else {
          const error = await loginResponse.json();
          console.log(`  ❌ Login FAILED for ${testUser.email}: ${error.message}`);
        }
      } else {
        const error = await createResponse.json();
        console.log(`  ❌ Creation FAILED for ${testUser.email}: ${error.message}`);
      }
    }
    
    // Also test non-.co.uk for comparison
    console.log('\n🌍 Testing non-.co.uk domains for comparison...');
    
    const nonCoUkTests = [
      {
        email: `david${timestamp}@example.com`,
        username: `david${timestamp}`,
        name: 'David COM',
        password: 'DavidCOM123!'
      },
      {
        email: `eve${timestamp}@test.org`,
        username: `eve${timestamp}`,
        name: 'Eve ORG',
        password: 'EveORG123!'
      }
    ];
    
    for (const testUser of nonCoUkTests) {
      console.log(`\n🧪 Testing ${testUser.email}...`);
      
      // Create user
      const createResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: testUser.username,
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
          firstName: testUser.name.split(' ')[0],
          lastName: testUser.name.split(' ')[1],
          role: 'AGENT'
        })
      });
      
      if (createResponse.ok) {
        const userData = await createResponse.json();
        console.log(`  ✅ Created: ${userData.data.email}`);
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Test login
        const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password
          })
        });
        
        if (loginResponse.ok) {
          console.log(`  🎉 Login SUCCESS for ${testUser.email}`);
        } else {
          const error = await loginResponse.json();
          console.log(`  ❌ Login FAILED for ${testUser.email}: ${error.message}`);
        }
      } else {
        const error = await createResponse.json();
        console.log(`  ❌ Creation FAILED for ${testUser.email}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCoUkDomain();