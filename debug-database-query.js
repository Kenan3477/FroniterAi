#!/usr/bin/env node

// Debug the exact database queries and password comparisons
async function debugDatabaseQuery() {
  console.log('🔍 Debugging Database Queries and Password Storage');
  console.log('=================================================');
  
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
    
    // Get users and examine their stored password hashes
    const usersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const users = await usersResponse.json();
    console.log('Current users in database:');
    
    const kenanUsers = users.filter(u => u.email.toLowerCase().includes('kenan'));
    console.log('\nKenan users found:');
    kenanUsers.forEach(user => {
      console.log(`  ID: ${user.id}, Email: ${user.email}, Username: ${user.username}, Active: ${user.isActive}`);
    });
    
    // Check if there are any validation or constraint issues with .co.uk
    console.log('\n🧪 Testing various domain patterns...');
    
    const testDomains = [
      'test@example.com',
      'test@test.co.uk',
      'test@test.com.au',
      'test@domain.org',
      'test@company.net'
    ];
    
    for (let i = 0; i < testDomains.length; i++) {
      const email = testDomains[i];
      const password = `TestDomain${i}123!`;
      
      console.log(`\nTesting domain: ${email}`);
      
      // Create user
      const createResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: `testuser${i}`,
          email: email,
          password: password,
          name: `Test User ${i}`,
          firstName: 'Test',
          lastName: `User${i}`,
          role: 'AGENT'
        })
      });
      
      if (createResponse.ok) {
        const userData = await createResponse.json();
        console.log(`  ✅ Created: ${userData.data.email}`);
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
          console.log(`  🎉 Login SUCCESS for ${email}`);
        } else {
          const error = await loginResponse.json();
          console.log(`  ❌ Login FAILED for ${email}: ${error.message}`);
        }
      } else {
        const error = await createResponse.json();
        console.log(`  ❌ Creation FAILED for ${email}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugDatabaseQuery();