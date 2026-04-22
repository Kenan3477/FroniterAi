// Quick test to check Railway backend user profile
const BACKEND_URL = 'https://interchange.kennexai.com';

async function testAdminAccess() {
  console.log('🔍 Testing admin access...\n');
  
  // Get auth token from environment (you'll need to provide this)
  const authToken = process.env.AUTH_TOKEN;
  
  if (!authToken) {
    console.log('❌ No AUTH_TOKEN environment variable set');
    console.log('ℹ️  Run this with: AUTH_TOKEN=your-token node test-admin-access.js');
    return;
  }
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      }
    });
    
    console.log(`📡 Status: ${response.status} ${response.statusText}\n`);
    
    const data = await response.json();
    console.log('📦 Response:', JSON.stringify(data, null, 2));
    
    if (data.data?.user) {
      const user = data.data.user;
      console.log('\n👤 User Details:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name || user.username}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      
      console.log('\n🔐 Admin Access:');
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        console.log('   ✅ YES - User has admin access');
      } else {
        console.log(`   ❌ NO - User role is ${user.role}, not ADMIN or SUPER_ADMIN`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAdminAccess();
