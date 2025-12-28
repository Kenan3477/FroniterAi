#!/usr/bin/env node

// Test email case sensitivity and backend response
async function testEmailIssues() {
  console.log('🔍 Testing Email Case Sensitivity Issues');
  console.log('=======================================');
  
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
    
    // Test different case variations of Kenan's email
    const emailVariations = [
      'Kenan@test.co.uk',
      'kenan@test.co.uk',
      'KENAN@TEST.CO.UK',
      'Kenan@Test.Co.Uk'
    ];
    
    console.log('Testing email case variations...');
    
    for (const email of emailVariations) {
      console.log(`\nTrying email: "${email}"`);
      
      const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: 'FreshKenan123!'
        })
      });
      
      if (loginResponse.ok) {
        console.log(`✅ SUCCESS with email: "${email}"`);
        return;
      } else {
        const error = await loginResponse.json();
        console.log(`❌ Failed with "${email}": ${error.message}`);
      }
    }
    
    // Create a test user with a different email pattern
    console.log('\n🧪 Creating test user with different email pattern...');
    
    const testEmail = 'kenan.davies@example.com';
    const testPassword = 'KenanDavies123!';
    
    const createResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'kenan-alt',
        email: testEmail,
        password: testPassword,
        name: 'Kenan Alternative',
        firstName: 'Kenan',
        lastName: 'Alternative',
        role: 'AGENT'
      })
    });
    
    if (createResponse.ok) {
      const userData = await createResponse.json();
      console.log('✅ Alternative Kenan user created:', userData.data);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test login
      const testLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });
      
      if (testLoginResponse.ok) {
        console.log('🎉 SUCCESS! Alternative Kenan email works fine');
        const loginData = await testLoginResponse.json();
        console.log('Login data:', loginData.data);
      } else {
        const error = await testLoginResponse.json();
        console.log('❌ Alternative Kenan email ALSO fails:', error.message);
      }
    }
    
    // Let's also try with a completely different domain
    console.log('\n🧪 Testing with gmail.com domain...');
    
    const gmailEmail = 'kenan.test@gmail.com';
    const gmailPassword = 'KenanGmail123!';
    
    const createGmailResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'kenan-gmail',
        email: gmailEmail,
        password: gmailPassword,
        name: 'Kenan Gmail',
        firstName: 'Kenan',
        lastName: 'Gmail',
        role: 'AGENT'
      })
    });
    
    if (createGmailResponse.ok) {
      const gmailUserData = await createGmailResponse.json();
      console.log('✅ Gmail Kenan user created:', gmailUserData.data);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test login
      const gmailLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: gmailEmail,
          password: gmailPassword
        })
      });
      
      if (gmailLoginResponse.ok) {
        console.log('🎉 SUCCESS! Gmail Kenan works perfectly');
      } else {
        const error = await gmailLoginResponse.json();
        console.log('❌ Gmail Kenan also fails:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEmailIssues();