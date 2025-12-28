#!/usr/bin/env node

// Let's debug the exact Kenan@test.co.uk user record
async function debugKenanRecord() {
  console.log('🔬 Debugging Specific Kenan@test.co.uk Record');
  console.log('==============================================');
  
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
    
    // Get all users and examine the problematic Kenan user
    const usersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const users = await usersResponse.json();
    const problemKenan = users.find(u => u.email === 'Kenan@test.co.uk');
    
    if (problemKenan) {
      console.log('🔍 Problematic Kenan user details:');
      console.log(JSON.stringify(problemKenan, null, 2));
      
      // Delete this corrupted user
      console.log(`\n🗑️ Deleting corrupted Kenan user (ID: ${problemKenan.id})...`);
      
      const deleteResponse = await fetch(`https://froniterai-production.up.railway.app/api/admin/users/${problemKenan.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      if (deleteResponse.ok) {
        console.log('✅ Corrupted Kenan user deleted');
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Now recreate Kenan with the original credentials
        console.log('\n🆕 Recreating Kenan with original credentials...');
        
        const recreateResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: 'kenan-fixed',
            email: 'Kenan@test.co.uk',
            password: '3477',  // Original weak password (should now be rejected)
            name: 'Kenan Davies',
            firstName: 'Kenan',
            lastName: 'Davies',
            role: 'AGENT'
          })
        });
        
        if (recreateResponse.ok) {
          const newUserData = await recreateResponse.json();
          console.log('✅ Kenan recreated with weak password:', newUserData.data);
          
          // This should fail since weak password
          const weakLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'Kenan@test.co.uk',
              password: '3477'
            })
          });
          
          if (weakLoginResponse.ok) {
            console.log('⚠️ SECURITY ISSUE: Weak password was accepted!');
          } else {
            const error = await weakLoginResponse.json();
            console.log(`✅ Correctly rejected weak password: ${error.message}`);
          }
          
        } else {
          // If weak password was correctly rejected, try with strong password
          console.log('💪 Weak password rejected, trying with strong password...');
          
          const strongPasswordResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: 'kenan-strong',
              email: 'Kenan@test.co.uk',
              password: 'KenanStrong123!',
              name: 'Kenan Davies',
              firstName: 'Kenan',
              lastName: 'Davies',
              role: 'AGENT'
            })
          });
          
          if (strongPasswordResponse.ok) {
            const strongUserData = await strongPasswordResponse.json();
            console.log('✅ Kenan recreated with strong password:', strongUserData.data);
            
            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Test login
            const strongLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: 'Kenan@test.co.uk',
                password: 'KenanStrong123!'
              })
            });
            
            if (strongLoginResponse.ok) {
              console.log('🎉 SUCCESS! Fixed Kenan can now login with strong password');
              const loginData = await strongLoginResponse.json();
              console.log('Login data:', loginData.data);
            } else {
              const error = await strongLoginResponse.json();
              console.log('❌ Strong password Kenan STILL fails:', error.message);
            }
          } else {
            const strongError = await strongPasswordResponse.json();
            console.log('❌ Failed to create Kenan with strong password:', strongError.message);
          }
        }
        
      } else {
        console.log('❌ Failed to delete corrupted Kenan user');
      }
    } else {
      console.log('❓ No Kenan@test.co.uk user found in current database');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugKenanRecord();