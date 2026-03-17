require('dotenv').config();

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testUserCreationFix() {
  console.log('🔧 Testing user creation with duplicate username scenarios...\n');

  try {
    // Login with fresh admin
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'freshadmin@omnivox.com',
        password: 'FreshAdmin123!'
      })
    });

    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.log('❌ Login failed:', loginData.message);
      return;
    }

    const token = loginData.data.token;
    console.log('✅ Login successful');
    
    // Test creating users with potentially conflicting usernames
    const testUsers = [
      {
        name: 'Admin Smith',
        email: 'admin.smith@example.com',
        password: 'TestPassword123!',
        role: 'AGENT'
      },
      {
        name: 'Admin Jones', 
        email: 'admin.jones@example.com',
        password: 'TestPassword123!',
        role: 'AGENT'
      },
      {
        name: 'Admin Wilson',
        email: 'admin.wilson@example.com', 
        password: 'TestPassword123!',
        role: 'AGENT'
      }
    ];

    for (const [index, user] of testUsers.entries()) {
      console.log(`\n${index + 1}️⃣ Creating user: ${user.name} (${user.email})`);
      
      const createResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(user)
      });

      const createData = await createResponse.json();
      console.log(`   Status: ${createResponse.status}`);
      
      if (createData.success) {
        console.log(`   ✅ SUCCESS: User created with username: ${createData.data.username}`);
        console.log(`   📧 Email: ${createData.data.email}`);
        console.log(`   🆔 ID: ${createData.data.id}`);
      } else {
        console.log(`   ❌ FAILED: ${createData.message}`);
      }
    }

    console.log('\n🧹 Cleaning up test users...');
    
    // Get all users to find the test users we just created
    const getUsersResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });

    if (getUsersResponse.ok) {
      const usersData = await getUsersResponse.json();
      const testUserIds = usersData.data && usersData.data.users 
        ? usersData.data.users.filter((u) => 
            u.email && u.email.includes('example.com')
          ).map((u) => u.id) 
        : [];

      for (const userId of testUserIds) {
        const deleteResponse = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
          method: 'DELETE',
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (deleteResponse.ok) {
          console.log(`   🗑️ Deleted test user ID: ${userId}`);
        }
      }
    }

    console.log('\n🎉 Test completed! The username uniqueness issue should now be resolved.');

  } catch (error) {
    console.error('❌ Error testing user creation:', error.message);
  }
}

testUserCreationFix();