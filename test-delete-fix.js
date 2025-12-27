#!/usr/bin/env node

// Test the corrected delete user functionality
async function testDeleteFix() {
  console.log('🧪 Testing Delete User Fix');
  console.log('==========================');
  
  try {
    // 1. Login via frontend to get proper cookie
    console.log('1. Logging in via frontend...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
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
      console.log('❌ Frontend login failed:', loginResponse.status);
      const error = await loginResponse.text();
      console.log('Error:', error);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Frontend login successful');
    
    // Get auth cookie from response headers
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('🍪 Set-Cookie header:', cookies);
    
    // Extract the auth-token cookie
    const authTokenMatch = cookies?.match(/auth-token=([^;]+)/);
    const authToken = authTokenMatch?.[1];
    
    if (!authToken) {
      console.log('❌ No auth-token cookie found');
      return;
    }
    
    console.log('🔑 Got auth token from cookie');
    
    // 2. Create a test user to delete
    console.log('\n2. Creating test user via backend...');
    const createResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
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
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.log('❌ Failed to create test user:', error);
      return;
    }
    
    const userData = await createResponse.json();
    const testUserId = userData.data?.id || userData.id;
    console.log('✅ Test user created with ID:', testUserId);
    
    // 3. Test the corrected frontend delete endpoint
    console.log('\n3. Testing corrected delete endpoint...');
    const deleteResponse = await fetch(`http://localhost:3000/api/admin/users?id=${testUserId}`, {
      method: 'DELETE',
      headers: {
        'Cookie': `auth-token=${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('DELETE /api/admin/users?id=' + testUserId + ':', deleteResponse.status);
    
    if (deleteResponse.ok) {
      const result = await deleteResponse.json();
      console.log('✅ Delete user endpoint now working!');
      console.log('Response:', result);
    } else {
      const error = await deleteResponse.text();
      console.log('❌ Delete endpoint still failing:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Wait a moment for frontend to be ready, then run test
setTimeout(testDeleteFix, 2000);