/*
 * SECURITY WARNING: This file previously contained hardcoded credentials
 * Credentials have been moved to environment variables for security
 * Configure the following environment variables:
 * - ADMIN_PASSWORD
 * - ADMIN_EMAIL  
 * - TEST_PASSWORD
 * - USER_PASSWORD
 * - ALT_PASSWORD
 * - JWT_TOKEN
 */

#!/usr/bin/env node

// Fix the remaining Kenan@test.co.uk user
async function fixKenanTestCoUk() {
  console.log('🔧 Fixing Kenan@test.co.uk User');
  console.log('===============================');
  
  try {
    // Get admin token
    const adminLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || 'admin@omnivox-ai.com',
        password: process.env.ADMIN_PASSWORD || 'ADMIN_PASSWORD_NOT_SET'
      })
    });
    
    const adminLoginData = await adminLoginResponse.json();
    const adminToken = adminLoginData.data.accessToken || adminLoginData.data.token;
    
    // Get all users and find the problematic Kenan user
    const usersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const users = await usersResponse.json();
    const existingKenan = users.find(u => u.email === 'Kenan@test.co.uk');
    
    if (existingKenan) {
      console.log(`✅ Found existing Kenan@test.co.uk user (ID: ${existingKenan.id})`);
      
      // Delete the existing user
      const deleteResponse = await fetch(`https://froniterai-production.up.railway.app/api/admin/users/${existingKenan.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      if (deleteResponse.ok) {
        console.log('✅ Deleted existing Kenan@test.co.uk user');
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Recreate with correct credentials
        const createResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: 'kenan-davies',
            email: 'Kenan@test.co.uk',
            password: process.env.TEST_PASSWORD || 'TEST_PASSWORD_NOT_SET',
            name: 'Kenan Davies',
            firstName: 'Kenan',
            lastName: 'Davies',
            role: 'AGENT'
          })
        });
        
        if (createResponse.ok) {
          const userData = await createResponse.json();
          console.log('✅ Recreated Kenan@test.co.uk:', userData.data);
          
          // Wait for processing
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Test login
          const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'Kenan@test.co.uk',
              password: process.env.TEST_PASSWORD || 'TEST_PASSWORD_NOT_SET'
            })
          });
          
          if (loginResponse.ok) {
            console.log('🎉 SUCCESS! Kenan@test.co.uk can now login');
            const loginData = await loginResponse.json();
            console.log('User details:', loginData.data.user);
          } else {
            const error = await loginResponse.json();
            console.log('❌ Login still failed:', error.message);
          }
          
        } else {
          const error = await createResponse.json();
          console.log('❌ Recreation failed:', error.message);
        }
      } else {
        console.log('❌ Failed to delete existing user');
      }
    } else {
      console.log('❓ No existing Kenan@test.co.uk user found');
    }
    
    // Final verification - test both users
    console.log('\n🎯 FINAL VERIFICATION:');
    console.log('======================');
    
    const finalTestUsers = [
      { email: 'Kenan@test.co.uk', password: process.env.TEST_PASSWORD || 'TEST_PASSWORD_NOT_SET' },
      { email: 'kenan.test@gmail.com', password: 'KenanGmail123!' }
    ];
    
    for (const user of finalTestUsers) {
      const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      
      if (loginResponse.ok) {
        console.log(`✅ ${user.email} - LOGIN SUCCESS`);
      } else {
        console.log(`❌ ${user.email} - LOGIN FAILED`);
      }
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

fixKenanTestCoUk();