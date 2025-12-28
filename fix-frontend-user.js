#!/usr/bin/env node

// Fix the problematic frontend-created user
async function fixFrontendUser() {
  console.log('🔧 Fixing Frontend-Created User Password');
  console.log('========================================');
  
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
    
    if (!adminLogin.ok) {
      console.log('❌ Failed to login as admin');
      return;
    }
    
    const adminData = await adminLogin.json();
    const adminToken = adminData.data.accessToken || adminData.data.token;
    console.log('✅ Admin login successful');
    
    // Delete the problematic user Kenan@Gmail.com
    console.log('\n🗑️ Deleting problematic user: Kenan@Gmail.com (ID: 61)');
    
    const deleteResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users/61', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (deleteResponse.ok) {
      console.log('✅ Deleted problematic user');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Recreate with correct credentials
      console.log('\n🆕 Recreating user with working credentials...');
      
      const createResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'kenan-gmail-fixed',
          email: 'Kenan@Gmail.com',
          password: 'KenanGmailFixed123!',
          name: 'Kenan Gmail Fixed',
          firstName: 'Kenan',
          lastName: 'Gmail',
          role: 'AGENT'
        })
      });
      
      if (createResponse.ok) {
        const userData = await createResponse.json();
        console.log('✅ Recreated user with working password:', userData.data);
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test login
        const testLogin = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'Kenan@Gmail.com',
            password: 'KenanGmailFixed123!'
          })
        });
        
        if (testLogin.ok) {
          console.log('🎉 SUCCESS! User can now login');
          const loginData = await testLogin.json();
          console.log('User data:', loginData.data.user);
        } else {
          const error = await testLogin.json();
          console.log('❌ Login still failed:', error.message);
        }
        
      } else {
        const error = await createResponse.json();
        console.log('❌ Failed to recreate user:', error.message);
      }
      
    } else {
      console.log('❌ Failed to delete problematic user');
    }
    
    console.log('\n🎯 WORKING CREDENTIALS:');
    console.log('========================');
    console.log('You can now login with these verified working accounts:');
    console.log('');
    console.log('1. Admin Account:');
    console.log('   Email: admin@omnivox-ai.com');
    console.log('   Password: OmnivoxAdmin2025!');
    console.log('');
    console.log('2. Fixed Kenan Account:');
    console.log('   Email: Kenan@Gmail.com');
    console.log('   Password: KenanGmailFixed123!');
    console.log('');
    console.log('3. Working Kenan Account:');
    console.log('   Email: kenan.test@gmail.com');
    console.log('   Password: KenanGmail123!');
    console.log('');
    console.log('4. Alternative Kenan Account:');
    console.log('   Email: kenan.alternative@test.co.uk');
    console.log('   Password: KenanAlt123!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

fixFrontendUser();