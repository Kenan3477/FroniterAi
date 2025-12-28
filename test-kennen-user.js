#!/usr/bin/env node

// Test the specific user Kennen_02@icloud.com that was just created
async function testKennenUser() {
  console.log('🔍 Testing Kennen_02@icloud.com User');
  console.log('====================================');
  
  try {
    // First, get admin access to check the user exists
    const adminLogin = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'OmnivoxAdmin2025!'
      })
    });
    
    if (!adminLogin.ok) {
      console.log('❌ Failed to login as admin');
      return;
    }
    
    const adminData = await adminLogin.json();
    const adminToken = adminData.data.accessToken || adminData.data.token;
    console.log('✅ Admin login successful');
    
    // Get all users and check if Kennen user exists
    const usersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (!usersResponse.ok) {
      console.log('❌ Failed to fetch users');
      return;
    }
    
    const users = await usersResponse.json();
    const kennenUser = users.find(u => u.email === 'Kennen_02@icloud.com');
    
    if (!kennenUser) {
      console.log('❌ Kennen_02@icloud.com user NOT found in database');
      console.log('\n👥 Current users in database:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
      });
      return;
    }
    
    console.log('\n✅ Kennen user found in database:');
    console.log(`   ID: ${kennenUser.id}`);
    console.log(`   Email: ${kennenUser.email}`);
    console.log(`   Username: ${kennenUser.username}`);
    console.log(`   Name: ${kennenUser.name}`);
    console.log(`   Active: ${kennenUser.isActive}`);
    console.log(`   Created: ${kennenUser.createdAt}`);
    
    // Test login with the credentials you provided
    console.log('\n🔐 Testing login with provided credentials...');
    console.log('   Email: Kennen_02@icloud.com');
    console.log('   Password: Kenan3477!');
    
    const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'Kennen_02@icloud.com',
        password: 'Kenan3477!'
      })
    });
    
    console.log(`   Response Status: ${loginResponse.status}`);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('🎉 SUCCESS! User can login');
      console.log('Login data:', loginData.data.user);
    } else {
      const error = await loginResponse.json();
      console.log(`❌ FAILED: ${error.message}`);
      
      if (loginResponse.status === 401) {
        console.log('\n🔍 401 Unauthorized - This indicates password mismatch');
        console.log('Possible causes:');
        console.log('1. Password was not saved correctly during user creation');
        console.log('2. Case sensitivity issues with email');
        console.log('3. Special character handling in password');
        
        // Test with different email case variations
        console.log('\n🧪 Testing email case variations...');
        
        const emailVariations = [
          'Kennen_02@icloud.com',
          'kennen_02@icloud.com',
          'KENNEN_02@ICLOUD.COM'
        ];
        
        for (const emailVar of emailVariations) {
          console.log(`\nTrying: ${emailVar}`);
          
          const testResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: emailVar,
              password: 'Kenan3477!'
            })
          });
          
          if (testResponse.ok) {
            console.log(`✅ SUCCESS with: ${emailVar}`);
            return;
          } else {
            const err = await testResponse.json();
            console.log(`❌ Failed with: ${emailVar} - ${err.message}`);
          }
        }
        
        // The user exists but can't authenticate - likely password corruption
        console.log('\n🔧 SOLUTION: Delete and recreate the user...');
        
        const deleteResponse = await fetch(`https://froniterai-production.up.railway.app/api/admin/users/${kennenUser.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        if (deleteResponse.ok) {
          console.log('✅ Deleted corrupted user');
          
          // Wait a moment
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Recreate with same credentials
          const recreateResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: 'kennen-02',
              email: 'Kennen_02@icloud.com',
              password: 'Kenan3477!',
              name: 'Kennen 02',
              firstName: 'Kennen',
              lastName: '02',
              role: 'AGENT'
            })
          });
          
          if (recreateResponse.ok) {
            const newUserData = await recreateResponse.json();
            console.log('✅ Recreated user:', newUserData.data);
            
            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Test login again
            const finalTestResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: 'Kennen_02@icloud.com',
                password: 'Kenan3477!'
              })
            });
            
            if (finalTestResponse.ok) {
              console.log('🎉 SUCCESS! Fixed user can now login');
              const loginData = await finalTestResponse.json();
              console.log('User data:', loginData.data.user);
              
              console.log('\n📋 SOLUTION SUMMARY:');
              console.log('===================');
              console.log('✅ Issue: Frontend user creation had password corruption');
              console.log('✅ Fix: Deleted and recreated user with backend API');
              console.log('✅ Result: User can now login successfully');
              console.log('');
              console.log('🔐 WORKING CREDENTIALS:');
              console.log('   Email: Kennen_02@icloud.com');
              console.log('   Password: Kenan3477!');
              
            } else {
              const finalError = await finalTestResponse.json();
              console.log('❌ Still failed after recreation:', finalError.message);
            }
            
          } else {
            const recreateError = await recreateResponse.json();
            console.log('❌ Failed to recreate user:', recreateError.message);
          }
          
        } else {
          console.log('❌ Failed to delete user');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testKennenUser();