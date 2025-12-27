#!/usr/bin/env node

// Test delete user functionality 
async function testDeleteUser() {
  console.log('🧪 Testing Delete User Functionality');
  console.log('====================================');
  
  try {
    // 1. Login to get auth token
    console.log('1. Logging in to backend...');
    const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'OmnivoxAdmin2025!'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    const authToken = loginData.data.accessToken || loginData.data.token;
    console.log('🔑 Got auth token');
    
    // 2. Create a test user to delete
    console.log('\n2. Creating test user for deletion...');
    const createUserResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'test-delete-user',
        email: 'test-delete@example.com',
        password: 'TempPassword123!',
        name: 'Test Delete User',
        firstName: 'Test',
        lastName: 'Delete',
        role: 'AGENT'
      })
    });
    
    if (!createUserResponse.ok) {
      const error = await createUserResponse.text();
      console.log('❌ Failed to create test user:', error);
      return;
    }
    
    const createData = await createUserResponse.json();
    const testUserId = createData.data?.id || createData.id;
    console.log('✅ Test user created with ID:', testUserId);
    
    // 3. Test frontend API delete endpoint with query parameter format
    console.log('\n3. Testing frontend API delete (correct format)...');
    const frontendDeleteResponse = await fetch('http://localhost:3000/api/admin/users?id=' + testUserId, {
      method: 'DELETE',
      headers: {
        'Cookie': `auth-token=${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Frontend DELETE /api/admin/users?id=' + testUserId + ':', frontendDeleteResponse.status);
    
    if (frontendDeleteResponse.ok) {
      console.log('✅ Frontend delete API working correctly!');
      const data = await frontendDeleteResponse.json();
      console.log('Response:', data);
    } else {
      const error = await frontendDeleteResponse.text();
      console.log('❌ Frontend delete failed:', error);
      
      // 4. If frontend failed, test backend directly for comparison
      console.log('\n4. Testing backend delete directly...');
      const backendDeleteResponse = await fetch(`https://froniterai-production.up.railway.app/api/admin/users/${testUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Backend DELETE:', backendDeleteResponse.status);
      if (backendDeleteResponse.ok) {
        console.log('✅ Backend delete works directly');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDeleteUser();