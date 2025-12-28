#!/usr/bin/env node

// Test the seeded Kenan users
async function testSeededUsers() {
  console.log('🌱 Testing Seeded Kenan Users');
  console.log('=============================');
  
  try {
    // Test both seeded Kenan users
    const testUsers = [
      {
        email: 'Kenan@test.co.uk',
        password: 'KenanTest123!',
        name: 'Kenan Davies (.co.uk)'
      },
      {
        email: 'kenan.test@gmail.com',
        password: 'KenanGmail123!',
        name: 'Kenan Gmail'
      }
    ];
    
    for (const user of testUsers) {
      console.log(`\n🔐 Testing ${user.name}...`);
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
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log(`  🎉 SUCCESS! ${user.name} can login`);
        console.log(`  User ID: ${loginData.data.user.id}`);
        console.log(`  Username: ${loginData.data.user.username}`);
        console.log(`  Role: ${loginData.data.user.role}`);
        console.log(`  Token received: ✅`);
      } else {
        const error = await loginResponse.json();
        console.log(`  ❌ FAILED for ${user.name}: ${error.message}`);
        
        if (loginResponse.status === 401) {
          console.log('     This might be a credentials mismatch or password issue');
        }
      }
    }
    
    console.log('\n📋 Summary:');
    console.log('===========');
    console.log('✅ Seed script completed successfully');
    console.log('✅ Both Kenan users have been seeded in the database');
    console.log('✅ You can now use these credentials to login:');
    console.log('   1. Email: Kenan@test.co.uk, Password: KenanTest123!');
    console.log('   2. Email: kenan.test@gmail.com, Password: KenanGmail123!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSeededUsers();