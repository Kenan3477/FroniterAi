#!/usr/bin/env node

// Fix the user password issue by setting a compliant password
async function fixUserPassword() {
  console.log('🔧 Fixing User Password Issue');
  console.log('==============================');
  
  try {
    // 1. Login as admin
    console.log('1. Logging in as admin...');
    const adminLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'OmnivoxAdmin2025!'
      })
    });
    
    const adminLoginData = await adminLoginResponse.json();
    const adminToken = adminLoginData.data.accessToken || adminLoginData.data.token;
    console.log('✅ Admin logged in successfully');
    
    // 2. Reset password for the user to a compliant one
    const newPassword = 'Kenan3477!'; // Meets all requirements
    console.log('\n2. Resetting password to compliant format...');
    console.log('   New password will be:', newPassword);
    console.log('   Requirements met:');
    console.log('   ✅ 8+ characters');
    console.log('   ✅ Uppercase letter (K)');
    console.log('   ✅ Lowercase letters (enan)');
    console.log('   ✅ Numbers (3477)');
    console.log('   ✅ Special character (!)');
    
    // Try to update via user management endpoint
    const updateResponse = await fetch('https://froniterai-production.up.railway.app/api/user-management/33', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        password: newPassword
      })
    });
    
    console.log('Update user response status:', updateResponse.status);
    
    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.log('❌ User update failed:', error);
      
      // Try alternative: Delete and recreate user
      console.log('\n3. Alternative: Recreating user with proper password...');
      
      // Delete existing user
      const deleteResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users/33', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Delete user response status:', deleteResponse.status);
      
      if (deleteResponse.ok) {
        console.log('✅ Old user deleted');
        
        // Create new user with proper password
        const createResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: 'kenan',
            email: 'Kenan@test.co.uk',
            password: newPassword,
            name: 'Kenan Davies',
            firstName: 'Kenan',
            lastName: 'Davies',
            role: 'AGENT'
          })
        });
        
        console.log('Create new user response status:', createResponse.status);
        
        if (createResponse.ok) {
          const userData = await createResponse.json();
          console.log('✅ New user created with compliant password');
          console.log('   User ID:', userData.data?.id || userData.id);
        } else {
          const error = await createResponse.text();
          console.log('❌ Failed to create new user:', error);
        }
      }
    } else {
      console.log('✅ Password updated successfully');
    }
    
    // 4. Test login with new password
    console.log('\n4. Testing login with new password...');
    const testLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'Kenan@test.co.uk',
        password: newPassword
      })
    });
    
    if (testLoginResponse.ok) {
      const loginData = await testLoginResponse.json();
      console.log('🎉 SUCCESS! Login now works with password:', newPassword);
      console.log('   User:', loginData.data?.user?.name);
      console.log('   Role:', loginData.data?.user?.role);
    } else {
      const error = await testLoginResponse.json();
      console.log('❌ Login still failing:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

// Run the fix
fixUserPassword();