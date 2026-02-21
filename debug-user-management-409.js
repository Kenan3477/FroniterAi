const fetch = require('node-fetch');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function debugUserManagement() {
  console.log('🔍 Debugging user management 409 error...');
  
  try {
    // First test login with the new admin credentials
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'newadmin@omnivox.com',
        password: 'NewAdmin123!'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.data?.token || loginData.token;
    console.log('✅ Login successful, token length:', token.length);

    // Test the direct backend user endpoint
    console.log('\n🧪 Testing direct backend /api/admin/users...');
    const backendResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Backend status: ${backendResponse.status}`);
    
    if (backendResponse.ok) {
      const backendData = await backendResponse.json();
      console.log('✅ Backend users endpoint works');
      console.log(`Found ${backendData.data?.length || backendData.length} users`);
    } else {
      const errorText = await backendResponse.text();
      console.log('❌ Backend users endpoint failed:');
      console.log(`Error: ${errorText}`);
    }

    // Test the frontend proxy endpoint
    console.log('\n🧪 Testing frontend proxy /api/admin/users...');
    const frontendResponse = await fetch('https://omnivox-ai-frontend.vercel.app/api/admin/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Frontend proxy status: ${frontendResponse.status}`);
    
    if (frontendResponse.ok) {
      const frontendData = await frontendResponse.json();
      console.log('✅ Frontend proxy works');
      console.log(`Response data:`, frontendData);
    } else {
      const errorText = await frontendResponse.text();
      console.log('❌ Frontend proxy failed:');
      console.log(`Error: ${errorText}`);
    }

    // Check if there's a conflict with multiple users having same email
    console.log('\n🔍 Checking for user conflicts...');
    
    try {
      const allUsers = await backendResponse.json();
      if (allUsers.data) {
        const users = allUsers.data;
        
        // Group by email to find duplicates
        const emailGroups = {};
        users.forEach(user => {
          const email = user.email?.toLowerCase();
          if (!emailGroups[email]) {
            emailGroups[email] = [];
          }
          emailGroups[email].push(user);
        });

        // Find duplicates
        const duplicates = Object.entries(emailGroups).filter(([email, users]) => users.length > 1);
        
        if (duplicates.length > 0) {
          console.log('⚠️ Found duplicate users:');
          duplicates.forEach(([email, users]) => {
            console.log(`Email: ${email}`);
            users.forEach(user => {
              console.log(`  - ID: ${user.id}, Name: ${user.name}, Role: ${user.role}`);
            });
          });
        } else {
          console.log('✅ No duplicate users found');
        }
      }
    } catch (e) {
      console.log('Could not check for conflicts:', e.message);
    }

  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

debugUserManagement();